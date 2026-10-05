package com.commute.tracker.auto;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.util.Calendar;
import org.junit.Test;

public class AutoLogicTest {

    private static final double METERS_PER_DEGREE_LAT = 111195;
    private static final long MIN = AutoLogic.MINUTE_MS;

    private static long time(int year, int month, int day, int hour, int minute) {
        Calendar c = Calendar.getInstance();
        c.clear();
        c.set(year, month - 1, day, hour, minute, 0);
        return c.getTimeInMillis();
    }

    // 2026-10-05 is a Monday, 2026-10-10 a Saturday.
    private static final long MONDAY_8 = time(2026, 10, 5, 8, 0);
    private static final long MONDAY_17 = time(2026, 10, 5, 17, 0);

    /** Home and Office 10 km apart, automatic tracking on, default windows (Mon-Fri 7-10 and 16-20). */
    private static AutoLogic.Config config() {
        AutoLogic.Config c = new AutoLogic.Config();
        c.enabled = true;
        c.home = new AutoLogic.Place(12.97, 77.59);
        c.office = new AutoLogic.Place(12.97 + 10_000 / METERS_PER_DEGREE_LAT, 77.59);
        return c;
    }

    private static AutoLogic.Candidate leftHomeAt(long at) {
        AutoLogic.Result r = AutoLogic.onExit(null, AutoLogic.HOME, at, config());
        assertEquals(AutoLogic.Action.START, r.action);
        return r.candidate;
    }

    // ---- The normal commute -----------------------------------------------------------------------------

    @Test
    public void homeToOfficeInTheMorningIsAWorkTrip() {
        AutoLogic.Candidate c = leftHomeAt(MONDAY_8);
        AutoLogic.Result r = AutoLogic.onEnter(c, AutoLogic.OFFICE, MONDAY_8 + 40 * MIN);
        assertEquals(AutoLogic.Action.KEEP, r.action);
        assertEquals(MONDAY_8, r.startedAt);
        assertEquals(MONDAY_8 + 40 * MIN, r.endedAt);
        assertEquals("work", r.direction);
        assertNull(r.candidate);
    }

    @Test
    public void officeToHomeInTheEveningIsAHomeTrip() {
        AutoLogic.Result start = AutoLogic.onExit(null, AutoLogic.OFFICE, MONDAY_17, config());
        AutoLogic.Result r = AutoLogic.onEnter(start.candidate, AutoLogic.HOME, MONDAY_17 + 50 * MIN);
        assertEquals(AutoLogic.Action.KEEP, r.action);
        assertEquals("home", r.direction);
    }

    // ---- Errands and mistakes ---------------------------------------------------------------------------

    @Test
    public void goingBackHomeDropsTheTrip() {
        AutoLogic.Result r = AutoLogic.onEnter(leftHomeAt(MONDAY_8), AutoLogic.HOME, MONDAY_8 + 20 * MIN);
        assertEquals(AutoLogic.Action.DROP, r.action);
        assertEquals("returned", r.reason);
    }

    @Test
    public void neverArrivingExpires() {
        AutoLogic.Candidate c = leftHomeAt(MONDAY_8);
        assertEquals(AutoLogic.Action.NONE, AutoLogic.onCheck(c, c.expiresAt).action);
        assertEquals(c, AutoLogic.onCheck(c, c.expiresAt).candidate);
        assertEquals(AutoLogic.Action.DROP, AutoLogic.onCheck(c, c.expiresAt + 1).action);
        assertEquals("expired", AutoLogic.onEnter(c, AutoLogic.OFFICE, c.expiresAt + 1).reason);
    }

    @Test
    public void underFiveMinutesIsNotACommute() {
        AutoLogic.Candidate c = leftHomeAt(MONDAY_8);
        assertEquals("too-short", AutoLogic.onEnter(c, AutoLogic.OFFICE, MONDAY_8 + 4 * MIN).reason);
        assertEquals(AutoLogic.Action.KEEP, AutoLogic.onEnter(c, AutoLogic.OFFICE, MONDAY_8 + 5 * MIN).action);
    }

    @Test
    public void arrivingWithNoCandidateDoesNothing() {
        assertEquals(AutoLogic.Action.NONE, AutoLogic.onEnter(null, AutoLogic.OFFICE, MONDAY_8).action);
        assertEquals(AutoLogic.Action.NONE, AutoLogic.onCheck(null, MONDAY_8).action);
    }

    @Test
    public void leavingAgainReplacesAnUnfinishedCandidate() {
        // Arrival at the office was missed; leaving it again starts afresh from the office.
        AutoLogic.Candidate first = leftHomeAt(MONDAY_8);
        AutoLogic.Result r = AutoLogic.onExit(first, AutoLogic.OFFICE, MONDAY_8 + 60 * MIN, config());
        assertEquals(AutoLogic.Action.START, r.action);
        assertEquals(AutoLogic.OFFICE, r.candidate.from);
    }

    // ---- Commute windows and days -----------------------------------------------------------------------

    @Test
    public void outsideTheWindowsNothingIsWatched() {
        long monday2pm = time(2026, 10, 5, 14, 0);
        long saturday8am = time(2026, 10, 10, 8, 0);
        assertEquals("outside-window", AutoLogic.onExit(null, AutoLogic.HOME, monday2pm, config()).reason);
        assertEquals(AutoLogic.Action.NONE, AutoLogic.onExit(null, AutoLogic.HOME, saturday8am, config()).action);
        // An unfinished candidate is dropped rather than left hanging.
        AutoLogic.Result r = AutoLogic.onExit(leftHomeAt(MONDAY_8), AutoLogic.HOME, monday2pm, config());
        assertEquals(AutoLogic.Action.DROP, r.action);
    }

    @Test
    public void windowStartIsInsideAndEndIsOutside() {
        AutoLogic.Config c = config();
        assertTrue(AutoLogic.inWindow(c, time(2026, 10, 5, 7, 0)));
        assertTrue(AutoLogic.inWindow(c, time(2026, 10, 5, 9, 59)));
        assertFalse(AutoLogic.inWindow(c, time(2026, 10, 5, 10, 0)));
        assertTrue(AutoLogic.inWindow(c, time(2026, 10, 5, 16, 0)));
        assertFalse(AutoLogic.inWindow(c, time(2026, 10, 5, 20, 0)));
    }

    @Test
    public void aWindowCanCrossMidnightForNightShifts() {
        AutoLogic.Config c = config();
        c.eveningStart = 22 * 60;
        c.eveningEnd = 2 * 60;
        assertTrue(AutoLogic.inWindow(c, time(2026, 10, 5, 23, 30)));
        assertTrue(AutoLogic.inWindow(c, time(2026, 10, 6, 1, 0)));
        assertFalse(AutoLogic.inWindow(c, time(2026, 10, 6, 3, 0)));
    }

    // ---- Not ready --------------------------------------------------------------------------------------

    @Test
    public void offOrMissingPlacesWatchesNothing() {
        AutoLogic.Config off = config();
        off.enabled = false;
        assertEquals("not-ready", AutoLogic.onExit(null, AutoLogic.HOME, MONDAY_8, off).reason);
        AutoLogic.Config noOffice = config();
        noOffice.office = null;
        assertFalse(noOffice.ready());
    }

    @Test
    public void placesWhoseCirclesTouchAreNotReady() {
        AutoLogic.Config c = config();
        c.office = new AutoLogic.Place(12.97 + 250 / METERS_PER_DEGREE_LAT, 77.59);
        assertTrue(c.placesTooClose());
        assertFalse(c.ready());
    }

    // ---- How long to wait -------------------------------------------------------------------------------

    @Test
    public void theWaitIsTwoAndAHalfTimesTheCommuteTheUserGave() {
        AutoLogic.Config c = config();
        c.commuteMinutes = 40;
        assertEquals(100 * MIN, AutoLogic.waitMs(c));
        AutoLogic.Result r = AutoLogic.onExit(null, AutoLogic.HOME, MONDAY_8, c);
        assertEquals(MONDAY_8 + 100 * MIN, r.candidate.expiresAt);
    }

    @Test
    public void theWaitStaysBetween45MinutesAnd3Hours() {
        AutoLogic.Config c = config();
        c.commuteMinutes = 10;
        assertEquals(45 * MIN, AutoLogic.waitMs(c));
        c.commuteMinutes = 90;
        assertEquals(180 * MIN, AutoLogic.waitMs(c));
    }

    @Test
    public void theCommuteTimeIsReadFromSettingsWithinItsLimits() {
        assertEquals(45, AutoLogic.Config.fromJson("{}").commuteMinutes);
        assertEquals(30, AutoLogic.Config.fromJson("{\"commuteMinutes\":30}").commuteMinutes);
        assertEquals(180, AutoLogic.Config.fromJson("{\"commuteMinutes\":999}").commuteMinutes);
        assertEquals(5, AutoLogic.Config.fromJson("{\"commuteMinutes\":0}").commuteMinutes);
    }

    // ---- Saved data -------------------------------------------------------------------------------------

    @Test
    public void readsTheAppsSettings() {
        String json = "{\"enabled\":true,\"morningStart\":360,\"morningEnd\":600,\"days\":[0,6],\"homeRadius\":40,\"officeRadius\":400,"
            + "\"home\":{\"lat\":12.9,\"lng\":77.6},\"office\":{\"lat\":13.0,\"lng\":77.7}}";
        AutoLogic.Config c = AutoLogic.Config.fromJson(json);
        assertTrue(c.enabled);
        assertEquals(360, c.morningStart);
        assertEquals(16 * 60, c.eveningStart);
        assertTrue(c.days[Calendar.SUNDAY]);
        assertTrue(c.days[Calendar.SATURDAY]);
        assertFalse(c.days[Calendar.MONDAY]);
        assertEquals(100, c.homeRadius);
        assertEquals(400, c.officeRadius);
        assertNotNull(c.home);
        assertTrue(c.ready());
    }

    @Test
    public void damagedSettingsMeanOff() {
        assertFalse(AutoLogic.Config.fromJson("garbage").enabled);
        assertFalse(AutoLogic.Config.fromJson(null).enabled);
        assertNull(AutoLogic.Config.fromJson("{\"home\":{\"lat\":1}}").home);
    }

    @Test
    public void aCandidateSurvivesBeingSaved() {
        AutoLogic.Candidate c = leftHomeAt(MONDAY_8);
        AutoLogic.Candidate back = AutoLogic.Candidate.fromJson(c.toJson());
        assertEquals(c.from, back.from);
        assertEquals(c.leftAt, back.leftAt);
        assertEquals(c.expiresAt, back.expiresAt);
        assertNull(AutoLogic.Candidate.fromJson("{\"from\":\"shop\",\"leftAt\":1,\"expiresAt\":2}"));
        assertNull(AutoLogic.Candidate.fromJson("garbage"));
    }
}
