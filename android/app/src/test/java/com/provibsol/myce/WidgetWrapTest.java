package com.provibsol.myce;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import com.provibsol.myce.reminders.ReminderLogic;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import org.junit.Test;

public class WidgetWrapTest {

    private static long time(int year, int month, int day, int hour) {
        Calendar c = Calendar.getInstance();
        c.clear();
        c.set(year, month, day, hour, 0);
        return c.getTimeInMillis();
    }

    /** Two trips on every weekday of a month. */
    private static List<ReminderLogic.Trip> workMonth(List<ReminderLogic.Trip> trips, int year, int month) {
        Calendar c = Calendar.getInstance();
        c.clear();
        c.set(year, month, 1);
        while (c.get(Calendar.MONTH) == month) {
            int day = c.get(Calendar.DAY_OF_WEEK);
            if (day != Calendar.SATURDAY && day != Calendar.SUNDAY) {
                trips.add(new ReminderLogic.Trip(time(year, month, c.get(Calendar.DAY_OF_MONTH), 9), 40 * 60, 12000, "work"));
                trips.add(new ReminderLogic.Trip(time(year, month, c.get(Calendar.DAY_OF_MONTH), 18), 45 * 60, 12000, "home"));
            }
            c.add(Calendar.DAY_OF_MONTH, 1);
        }
        return trips;
    }

    @Test
    public void saysLastMonthsWrapIsReadyForAWeekUntilOpened() {
        List<ReminderLogic.Trip> trips = workMonth(new ArrayList<>(), 2027, Calendar.SEPTEMBER);
        workMonth(trips, 2027, Calendar.AUGUST);
        trips.add(new ReminderLogic.Trip(time(2027, Calendar.JULY, 1, 9), 40 * 60, 12000, "work"));
        long oct2 = time(2027, Calendar.OCTOBER, 2, 9);
        assertEquals("Your September Wrap is ready", WidgetWrap.readyLine(trips, null, oct2));
        assertNull(WidgetWrap.readyLine(trips, "[\"month-2027-09\"]", oct2));
        assertNull(WidgetWrap.readyLine(trips, null, time(2027, Calendar.OCTOBER, 9, 9)));
    }

    @Test
    public void putsTheYearlyWrapFirstOnTheFirstOfDecember() {
        List<ReminderLogic.Trip> trips = new ArrayList<>();
        for (int m = Calendar.JUNE; m <= Calendar.NOVEMBER; m++) workMonth(trips, 2027, m);
        long dec1 = time(2027, Calendar.DECEMBER, 1, 9);
        assertEquals("Your 2027 Wrap is here", WidgetWrap.readyLine(trips, "[]", dec1));
        assertEquals("Your November Wrap is ready", WidgetWrap.readyLine(trips, "[\"year-2027\"]", dec1));
    }

    @Test
    public void offersTheFirstMonthThirtyDaysAfterTheFirstTrip() {
        List<ReminderLogic.Trip> trips = workMonth(new ArrayList<>(), 2027, Calendar.MARCH);
        // First trip Mon 1 March 2027, so the first month ends on 31 March, before April's Wrap on 1 April.
        assertEquals("Your first month with MYCE", WidgetWrap.readyLine(trips, "broken", time(2027, Calendar.MARCH, 31, 9)));
        assertNull(WidgetWrap.readyLine(trips, null, time(2027, Calendar.MARCH, 30, 9)));
    }

    @Test
    public void staysQuietWithTooFewTrips() {
        List<ReminderLogic.Trip> trips = new ArrayList<>();
        trips.add(new ReminderLogic.Trip(time(2027, Calendar.SEPTEMBER, 3, 9), 40 * 60, 12000, "work"));
        assertNull(WidgetWrap.readyLine(trips, null, time(2027, Calendar.OCTOBER, 2, 9)));
        assertNull(WidgetWrap.readyLine(new ArrayList<>(), null, time(2027, Calendar.OCTOBER, 2, 9)));
    }
}
