package com.commute.tracker.reminders;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import org.junit.Test;

public class ReminderLogicTest {

    private static long time(int year, int month, int day, int hour, int minute) {
        Calendar c = Calendar.getInstance();
        c.clear();
        c.set(year, month - 1, day, hour, minute, 0);
        return c.getTimeInMillis();
    }

    private static ReminderLogic.Trip trip(long startedAt, int minutes, String direction) {
        return new ReminderLogic.Trip(startedAt, minutes * 60, 10_000, direction);
    }

    // 2026-10-05 is a Monday.
    private static final long MONDAY_MORNING = time(2026, 10, 5, 7, 0);

    private static List<ReminderLogic.Trip> habitTrips() {
        List<ReminderLogic.Trip> trips = new ArrayList<>();
        // Weekday trips to work around 08:30, 40 min, over the previous weeks.
        for (int day = 28; day <= 30; day++) trips.add(trip(time(2026, 9, day, 8, 30), 40, "work"));
        trips.add(trip(time(2026, 10, 1, 8, 30), 40, "work"));
        trips.add(trip(time(2026, 10, 2, 8, 30), 40, "work"));
        return trips;
    }

    @Test
    public void parsesSavedTrips() {
        String json = "{\"version\":1,\"trips\":[{\"id\":\"a\",\"startedAt\":1000,\"endedAt\":2000,\"durationSeconds\":60,\"distanceMeters\":500,\"direction\":\"work\"}]}";
        List<ReminderLogic.Trip> trips = ReminderLogic.parseTrips(json);
        assertEquals(1, trips.size());
        assertEquals("work", trips.get(0).direction);
        assertEquals(0, ReminderLogic.parseTrips("garbage").size());
        assertEquals(0, ReminderLogic.parseTrips(null).size());
    }

    @Test
    public void leaveNowNeedsAHabitAndNoTripYet() {
        assertNull(ReminderLogic.leaveNow(new ArrayList<>(), MONDAY_MORNING));
        ReminderLogic.Message message = ReminderLogic.leaveNow(habitTrips(), MONDAY_MORNING);
        assertNotNull(message);
        assertTrue(message.body.contains("40 min"));

        List<ReminderLogic.Trip> withToday = habitTrips();
        withToday.add(trip(time(2026, 10, 5, 6, 50), 30, "work"));
        assertNull(ReminderLogic.leaveNow(withToday, MONDAY_MORNING));
    }

    @Test
    public void leaveNowSkipsWeekends() {
        assertNull(ReminderLogic.leaveNow(habitTrips(), time(2026, 10, 3, 7, 0)));
    }

    @Test
    public void leaveNowFiresTenMinutesBeforeTheUsualDeparture() {
        long next = ReminderLogic.nextFire(ReminderLogic.LEAVE_NOW, new ReminderLogic.Config(), habitTrips(), MONDAY_MORNING, 0, 0);
        assertEquals(time(2026, 10, 5, 8, 20), next);
    }

    @Test
    public void leaveNowWithoutHistoryChecksAtDefaultMorningTimeAndSkipsTheWeekend() {
        long friday = time(2026, 10, 2, 12, 0);
        long next = ReminderLogic.nextFire(ReminderLogic.LEAVE_NOW, new ReminderLogic.Config(), new ArrayList<>(), friday, 0, 0);
        assertEquals(time(2026, 10, 5, 7, 30), next);
    }

    @Test
    public void eveningNudgeOnlyForPeopleWithAHabit() {
        long mondayEvening = time(2026, 10, 5, 19, 0);
        assertNull(ReminderLogic.eveningNudge(new ArrayList<>(), mondayEvening));
        assertNotNull(ReminderLogic.eveningNudge(habitTrips(), mondayEvening));

        List<ReminderLogic.Trip> withToday = habitTrips();
        withToday.add(trip(time(2026, 10, 5, 8, 30), 40, "work"));
        assertNull(ReminderLogic.eveningNudge(withToday, mondayEvening));
    }

    @Test
    public void weeklySummaryComparesWithLastWeek() {
        List<ReminderLogic.Trip> trips = new ArrayList<>();
        trips.add(trip(time(2026, 9, 29, 8, 30), 100, "work")); // last week
        trips.add(trip(time(2026, 10, 5, 8, 30), 50, "work")); // this week
        ReminderLogic.Message message = ReminderLogic.weekly(trips, time(2026, 10, 5, 18, 0));
        assertNotNull(message);
        assertTrue(message.body, message.body.contains("50 min"));
        assertTrue(message.body, message.body.contains("50% less"));
        assertNull(ReminderLogic.weekly(new ArrayList<>(), time(2026, 10, 5, 18, 0)));
    }

    @Test
    public void weeklyFiresOnSundayEvening() {
        long next = ReminderLogic.nextFire(ReminderLogic.WEEKLY, new ReminderLogic.Config(), new ArrayList<>(), MONDAY_MORNING, 0, 0);
        assertEquals(time(2026, 10, 11, 18, 0), next);
    }

    @Test
    public void monthlyRecapCoversThePreviousMonthAndFiresOnTheFirst() {
        List<ReminderLogic.Trip> trips = new ArrayList<>();
        trips.add(trip(time(2026, 9, 10, 8, 0), 60, "work"));
        trips.add(trip(time(2026, 9, 11, 8, 0), 60, "work"));
        ReminderLogic.Message message = ReminderLogic.monthly(trips, time(2026, 10, 1, 9, 0));
        assertNotNull(message);
        assertTrue(message.title, message.title.contains("September"));
        assertTrue(message.body, message.body.contains("2h"));
        assertEquals(time(2026, 11, 1, 9, 0), ReminderLogic.nextFire(ReminderLogic.MONTHLY, new ReminderLogic.Config(), trips, time(2026, 10, 1, 9, 5), 0, 0));
    }

    @Test
    public void slowDayWarnsWhenTodayIsClearlySlower() {
        List<ReminderLogic.Trip> trips = new ArrayList<>();
        // Four Mondays at 60 min, and 8 trips at 40 min on Tuesdays to Fridays.
        for (int day : new int[] { 7, 14, 21, 28 }) trips.add(trip(time(2026, 9, day, 8, 0), 60, "work"));
        for (int day : new int[] { 8, 9, 10, 11, 15, 16, 17, 18 }) trips.add(trip(time(2026, 9, day, 8, 0), 40, "work"));
        ReminderLogic.Message message = ReminderLogic.slowDay(trips, MONDAY_MORNING);
        assertNotNull(message);
        assertTrue(message.title, message.title.startsWith("Monday"));
    }

    @Test
    public void slowDayStaysQuietWithTooLittleData() {
        assertNull(ReminderLogic.slowDay(habitTrips(), MONDAY_MORNING));
    }

    @Test
    public void setupReminderUsesTwoThenFiveDaysAfterTheAnchor() {
        long anchor = time(2026, 10, 5, 10, 0);
        long now = time(2026, 10, 5, 10, 1);
        assertEquals(time(2026, 10, 7, 18, 0), ReminderLogic.nextFire(ReminderLogic.SETUP, new ReminderLogic.Config(), new ArrayList<>(), now, anchor, 0));
        assertEquals(time(2026, 10, 10, 18, 0), ReminderLogic.nextFire(ReminderLogic.SETUP, new ReminderLogic.Config(), new ArrayList<>(), now, anchor, 1));
    }

    @Test
    public void proRemindersAreOffForFreeUsers() {
        ReminderLogic.Config config = new ReminderLogic.Config();
        assertEquals(false, config.enabled(ReminderLogic.MONTHLY));
        assertEquals(false, config.enabled(ReminderLogic.SLOW_DAY));
        config.isPro = true;
        assertEquals(true, config.enabled(ReminderLogic.MONTHLY));
    }
}
