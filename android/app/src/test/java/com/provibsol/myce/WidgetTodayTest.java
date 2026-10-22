package com.provibsol.myce;

import static org.junit.Assert.assertEquals;

import com.provibsol.myce.reminders.ReminderLogic;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;

public class WidgetTodayTest {

    private static long time(int day, int hour, int minute) {
        Calendar c = Calendar.getInstance();
        c.clear();
        c.set(2026, Calendar.OCTOBER, day, hour, minute);
        return c.getTimeInMillis();
    }

    private static final long NOW = time(22, 19, 0);

    @Test
    public void addsSavedAndUnfiledTripsFromTodayOnly() throws Exception {
        List<ReminderLogic.Trip> saved = new ArrayList<>();
        saved.add(new ReminderLogic.Trip(time(21, 18, 0), 50 * 60, 12000, "home")); // yesterday
        saved.add(new ReminderLogic.Trip(time(22, 8, 30), 42 * 60, 11000, "work"));
        JSONArray queued = new JSONArray().put(new JSONObject()
            .put("startedAt", time(22, 17, 30))
            .put("endedAt", time(22, 18, 15))
            .put("distanceMeters", 11500));

        WidgetToday today = WidgetToday.of(saved, queued, NOW);
        assertEquals(87 * 60, today.seconds);
        assertEquals(22500, today.meters);
        assertEquals(2, today.trips);
        assertEquals("Today · 2 trips", today.caption());
    }

    @Test
    public void emptyDay() {
        WidgetToday today = WidgetToday.of(new ArrayList<>(), new JSONArray(), NOW);
        assertEquals(0, today.seconds);
        assertEquals("Today · no trips yet", today.caption());
    }

    @Test
    public void formatsDurations() {
        assertEquals("0 min", WidgetToday.duration(59));
        assertEquals("42 min", WidgetToday.duration(42 * 60 + 50));
        assertEquals("1h 05m", WidgetToday.duration(65 * 60));
    }
}
