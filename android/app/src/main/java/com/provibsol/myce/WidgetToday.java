package com.provibsol.myce;

import com.provibsol.myce.reminders.ReminderLogic;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Today's commute for the widget: trips the app has saved, plus trips finished from the widget or notification
 * that the app hasn't filed yet (they move across when it next opens, so neither is counted twice).
 * Pure Java, so it is unit-tested on a laptop.
 */
public final class WidgetToday {

    public final long seconds;
    public final long meters;
    public final int trips;

    private WidgetToday(long seconds, long meters, int trips) {
        this.seconds = seconds;
        this.meters = meters;
        this.trips = trips;
    }

    public static WidgetToday of(List<ReminderLogic.Trip> saved, JSONArray queued, long now) {
        long midnight = startOfDay(now);
        long seconds = 0;
        long meters = 0;
        int count = 0;
        for (ReminderLogic.Trip t : saved) {
            if (t.startedAt < midnight || t.startedAt > now) continue;
            seconds += t.durationSeconds;
            meters += t.distanceMeters;
            count++;
        }
        for (int i = 0; queued != null && i < queued.length(); i++) {
            JSONObject o = queued.optJSONObject(i);
            if (o == null) continue;
            long startedAt = o.optLong("startedAt", 0);
            if (startedAt < midnight || startedAt > now) continue;
            seconds += Math.max(0, o.optLong("endedAt", startedAt) - startedAt) / 1000;
            meters += o.optLong("distanceMeters", 0);
            count++;
        }
        return new WidgetToday(seconds, meters, count);
    }

    /** "0 min", "42 min", "1h 05m": minutes are dropped, not rounded, like the app's totals. */
    public static String duration(long seconds) {
        long minutes = Math.max(0, seconds) / 60;
        return minutes < 60 ? minutes + " min" : String.format(Locale.US, "%dh %02dm", minutes / 60, minutes % 60);
    }

    /** The line under the numbers, e.g. "Today · 2 trips". */
    public String caption() {
        return trips == 0 ? "Today · no trips yet" : "Today · " + trips + (trips == 1 ? " trip" : " trips");
    }

    private static long startOfDay(long time) {
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(time);
        c.set(Calendar.HOUR_OF_DAY, 0);
        c.set(Calendar.MINUTE, 0);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        return c.getTimeInMillis();
    }
}
