package com.provibsol.myce;

import com.provibsol.myce.reminders.ReminderLogic;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.json.JSONArray;

/**
 * "Your October Wrap is ready" for the widget, for a week after a Wrap comes out and until it's opened. The widget
 * is the one way to reach people with notifications off, and it refreshes itself every 30 minutes, so this works
 * even if the app hasn't been opened since the Wrap came out.
 * Same rules as src/lib/insights/wraps.ts (readyWrap), which is the reference: keep the two in step.
 * Pure Java, so it is unit-tested on a laptop.
 */
public final class WidgetWrap {

    /** Saved by the app (src/lib/insights/seen.ts): a JSON list of the Wrap ids opened so far. */
    public static final String SEEN_KEY = "insights.wrapsSeen.v1";

    static final int MIN_MONTH_TRIPS = 8;
    static final int MIN_YEAR_TRIPS = 40;
    static final int MIN_YEAR_MONTHS = 3;
    static final int FIRST_MONTH_DAYS = 30;
    static final int NEW_DAYS = 7;
    private static final long DAY_MS = 24L * 60 * 60 * 1000;

    private static final String[] MONTHS = {
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    };

    private WidgetWrap() {}

    /** The line to show, or null when no new Wrap is waiting. */
    public static String readyLine(List<ReminderLogic.Trip> trips, String seenJson, long now) {
        if (trips.isEmpty()) return null;
        Set<String> seen = parseSeen(seenJson);
        long firstTrip = Long.MAX_VALUE;
        for (ReminderLogic.Trip t : trips) firstTrip = Math.min(firstTrip, t.startedAt);

        // Newest first; on 1 December the yearly Wrap goes ahead of November's.
        List<Object[]> candidates = new ArrayList<>(); // { availableAt, id, line }
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(now);
        int year = c.get(Calendar.YEAR);

        long dec1 = at(year, Calendar.DECEMBER, 1);
        if (now >= dec1 && countIn(trips, at(year, 0, 1), at(year + 1, 0, 1)) >= MIN_YEAR_TRIPS && monthsIn(trips, year) >= MIN_YEAR_MONTHS) {
            candidates.add(new Object[] { dec1, "year-" + year, "Your " + year + " Wrap is here" });
        }

        long thisMonth = at(year, c.get(Calendar.MONTH), 1);
        Calendar prev = Calendar.getInstance();
        prev.setTimeInMillis(thisMonth);
        prev.add(Calendar.MONTH, -1);
        if (countIn(trips, prev.getTimeInMillis(), thisMonth) >= MIN_MONTH_TRIPS) {
            String id = String.format(Locale.US, "month-%d-%02d", prev.get(Calendar.YEAR), prev.get(Calendar.MONTH) + 1);
            candidates.add(new Object[] { thisMonth, id, "Your " + MONTHS[prev.get(Calendar.MONTH)] + " Wrap is ready" });
        }

        Calendar first = Calendar.getInstance();
        first.setTimeInMillis(startOfDay(firstTrip));
        long firstFrom = first.getTimeInMillis();
        first.add(Calendar.DAY_OF_MONTH, FIRST_MONTH_DAYS);
        long firstTo = first.getTimeInMillis();
        if (now >= firstTo && countIn(trips, firstFrom, firstTo) >= MIN_MONTH_TRIPS) {
            candidates.add(new Object[] { firstTo, "first", "Your first month with MYCE" });
        }

        candidates.sort((a, b) -> {
            int byTime = Long.compare((long) b[0], (long) a[0]);
            if (byTime != 0) return byTime;
            return Boolean.compare(((String) b[1]).startsWith("year-"), ((String) a[1]).startsWith("year-"));
        });
        for (Object[] w : candidates) {
            if (now - (long) w[0] < NEW_DAYS * DAY_MS && !seen.contains((String) w[1])) return (String) w[2];
        }
        return null;
    }

    static Set<String> parseSeen(String json) {
        Set<String> seen = new HashSet<>();
        if (json == null) return seen;
        try {
            JSONArray list = new JSONArray(json);
            for (int i = 0; i < list.length(); i++) {
                Object id = list.get(i);
                if (id instanceof String) seen.add((String) id);
            }
        } catch (Exception ignored) {
            // A broken list counts as nothing opened.
        }
        return seen;
    }

    private static int countIn(List<ReminderLogic.Trip> trips, long from, long to) {
        int n = 0;
        for (ReminderLogic.Trip t : trips) if (t.startedAt >= from && t.startedAt < to) n++;
        return n;
    }

    private static int monthsIn(List<ReminderLogic.Trip> trips, int year) {
        Set<Integer> months = new HashSet<>();
        Calendar c = Calendar.getInstance();
        for (ReminderLogic.Trip t : trips) {
            c.setTimeInMillis(t.startedAt);
            if (c.get(Calendar.YEAR) == year) months.add(c.get(Calendar.MONTH));
        }
        return months.size();
    }

    private static long at(int year, int month, int day) {
        Calendar c = Calendar.getInstance();
        c.clear();
        c.set(year, month, day);
        return c.getTimeInMillis();
    }

    private static long startOfDay(long time) {
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(time);
        return at(c.get(Calendar.YEAR), c.get(Calendar.MONTH), c.get(Calendar.DAY_OF_MONTH));
    }
}
