package com.provibsol.myce.reminders;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * What each reminder says and when it next fires, worked out from the saved trips. Pure Java (no Android
 * classes) so it is unit-tested on a laptop. Reminders are decided when they fire, not when scheduled,
 * so the numbers are always current.
 */
public final class ReminderLogic {

    private ReminderLogic() {}

    public static final int LEAVE_NOW = 1;
    public static final int EVENING = 2;
    public static final int WEEKLY = 3;
    public static final int MONTHLY = 4;
    public static final int SLOW_DAY = 5;
    public static final int SETUP = 6;
    public static final int HEAD_HOME = 7;

    public static final int[] ALL_TYPES = { LEAVE_NOW, EVENING, WEEKLY, MONTHLY, SLOW_DAY, SETUP, HEAD_HOME };

    static final int DEFAULT_MORNING_MINUTES = 7 * 60 + 30;
    static final int EVENING_DEFAULT_MINUTES = 19 * 60;
    static final int LEAVE_HOME_DEFAULT_MINUTES = 8 * 60;
    static final int LEAVE_WORK_DEFAULT_MINUTES = 17 * 60;
    /** "Time to head out" and "Time to head home" arrive this long before the time the user gave. */
    static final int HEADS_UP_MINUTES = 10;
    private static final long DAY_MS = 24L * 60 * 60 * 1000;
    private static final String[] WEEKDAYS = { "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" };
    private static final String[] MONTHS = {
        "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December",
    };

    public static final class Trip {
        public final long startedAt;
        public final int durationSeconds;
        public final int distanceMeters;
        public final String direction;

        public Trip(long startedAt, int durationSeconds, int distanceMeters, String direction) {
            this.startedAt = startedAt;
            this.durationSeconds = durationSeconds;
            this.distanceMeters = distanceMeters;
            this.direction = direction;
        }
    }

    public static final class Message {
        public final String title;
        public final String body;

        public Message(String title, String body) {
            this.title = title;
            this.body = body;
        }
    }

    /** User choices pushed from the app's Notifications settings, plus how trips are recorded and when. */
    public static final class Config {
        public boolean leaveNow = true;
        public boolean headHome = true;
        public boolean evening = true;
        public int eveningMinutes = EVENING_DEFAULT_MINUTES;
        public boolean weekly = true;
        public boolean monthly = true;
        public boolean slowDay = true;
        public boolean setup = false;
        public boolean isPro = false;
        /** End of the free month (epoch ms): Pro reminders run until then even without a purchase. */
        public long trialEndsAt = 0;
        /** Automatic start and stop is on: trips start by themselves, so nothing says "tap to start". */
        public boolean auto = false;
        /** Start and Stop users' answers to "when do you usually leave?" (minutes after midnight) and which days. */
        public int leaveHomeMinutes = LEAVE_HOME_DEFAULT_MINUTES;
        public int leaveWorkMinutes = LEAVE_WORK_DEFAULT_MINUTES;
        /** Indexed by Calendar.DAY_OF_WEEK (1 = Sunday ... 7 = Saturday); index 0 unused. Default Mon-Fri. */
        public boolean[] days = { false, false, true, true, true, true, true, false };

        private boolean proUnlocked() {
            return isPro || System.currentTimeMillis() < trialEndsAt;
        }

        public boolean enabled(int type) {
            switch (type) {
                case LEAVE_NOW:
                    return leaveNow && !auto;
                case HEAD_HOME:
                    return headHome && !auto;
                case EVENING:
                    return evening;
                case WEEKLY:
                    return weekly;
                case MONTHLY:
                    return monthly && proUnlocked();
                case SLOW_DAY:
                    return slowDay && proUnlocked();
                case SETUP:
                    return setup;
                default:
                    return false;
            }
        }

        public static Config fromJson(String json) {
            Config c = new Config();
            if (json == null) return c;
            try {
                JSONObject o = new JSONObject(json);
                c.leaveNow = o.optBoolean("leaveNow", true);
                c.headHome = o.optBoolean("headHome", true);
                c.evening = o.optBoolean("evening", true);
                c.eveningMinutes = o.optInt("eveningMinutes", EVENING_DEFAULT_MINUTES);
                c.weekly = o.optBoolean("weekly", true);
                c.monthly = o.optBoolean("monthly", true);
                c.slowDay = o.optBoolean("slowDay", true);
                c.setup = o.optBoolean("setup", false);
                c.isPro = o.optBoolean("isPro", false);
                c.trialEndsAt = o.optLong("trialEndsAt", 0);
                c.auto = o.optBoolean("auto", false);
                c.leaveHomeMinutes = minutes(o, "leaveHomeMinutes", LEAVE_HOME_DEFAULT_MINUTES);
                c.leaveWorkMinutes = minutes(o, "leaveWorkMinutes", LEAVE_WORK_DEFAULT_MINUTES);
                JSONArray days = o.optJSONArray("days");
                if (days != null) {
                    // The app sends JavaScript weekdays: 0 = Sunday ... 6 = Saturday.
                    c.days = new boolean[8];
                    for (int i = 0; i < days.length(); i++) {
                        int d = days.optInt(i, -1);
                        if (d >= 0 && d <= 6) c.days[d + 1] = true;
                    }
                }
            } catch (JSONException ignored) {
                // Fall back to defaults.
            }
            return c;
        }

        private static int minutes(JSONObject o, String key, int fallback) {
            int value = o.optInt(key, fallback);
            return value >= 0 && value < 24 * 60 ? value : fallback;
        }

        /** A day the user commutes: the days they chose for Start and Stop, or Mon-Fri with automatic (it has no days). */
        boolean commuteDay(Calendar c) {
            return auto ? isWeekday(c) : days[c.get(Calendar.DAY_OF_WEEK)];
        }
    }

    // ---- Reading trips ----------------------------------------------------------------------------------

    /** Parses the app's saved trips: {"version":1,"trips":[...]}. Bad data gives an empty list. */
    public static List<Trip> parseTrips(String json) {
        List<Trip> trips = new ArrayList<>();
        if (json == null) return trips;
        try {
            JSONArray array = new JSONObject(json).getJSONArray("trips");
            for (int i = 0; i < array.length(); i++) {
                JSONObject o = array.getJSONObject(i);
                trips.add(new Trip(o.getLong("startedAt"), o.optInt("durationSeconds", 0), o.optInt("distanceMeters", 0), o.optString("direction", "unknown")));
            }
        } catch (JSONException ignored) {
            return new ArrayList<>();
        }
        return trips;
    }

    // ---- Calendar helpers -------------------------------------------------------------------------------

    private static Calendar at(long time) {
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(time);
        return c;
    }

    private static Calendar startOfDay(long time) {
        Calendar c = at(time);
        c.set(Calendar.HOUR_OF_DAY, 0);
        c.set(Calendar.MINUTE, 0);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        return c;
    }

    static boolean isWeekday(Calendar c) {
        int d = c.get(Calendar.DAY_OF_WEEK);
        return d != Calendar.SATURDAY && d != Calendar.SUNDAY;
    }

    private static int minuteOfDay(long time) {
        Calendar c = at(time);
        return c.get(Calendar.HOUR_OF_DAY) * 60 + c.get(Calendar.MINUTE);
    }

    private static long dayStart(long time) {
        return startOfDay(time).getTimeInMillis();
    }

    private static long onDay(long dayStartMillis, int daysAhead, int minuteOfDay) {
        Calendar c = at(dayStartMillis);
        c.add(Calendar.DAY_OF_MONTH, daysAhead);
        c.set(Calendar.HOUR_OF_DAY, minuteOfDay / 60);
        c.set(Calendar.MINUTE, minuteOfDay % 60);
        return c.getTimeInMillis();
    }

    static String duration(long seconds) {
        long minutes = Math.round(seconds / 60.0);
        if (minutes < 60) return minutes + " min";
        long h = minutes / 60;
        long m = minutes % 60;
        return m == 0 ? h + "h" : h + "h " + String.format(Locale.US, "%02d", m) + "m";
    }

    static String km(long meters) {
        return String.format(Locale.US, "%.0f km", meters / 1000.0);
    }

    private static boolean tookTripOn(List<Trip> trips, long day) {
        for (Trip t : trips) if (dayStart(t.startedAt) == day) return true;
        return false;
    }

    private static int tripsOn(List<Trip> trips, long day) {
        int count = 0;
        for (Trip t : trips) if (dayStart(t.startedAt) == day) count++;
        return count;
    }

    private static boolean tookTripOn(List<Trip> trips, long day, String direction) {
        for (Trip t : trips) if (dayStart(t.startedAt) == day && direction.equals(t.direction)) return true;
        return false;
    }

    // ---- Typical commute ---------------------------------------------------------------------------------

    /** Median start minute-of-day of weekday trips to work in the last 60 days, or -1 with fewer than 3. */
    static int typicalDepartureMinutes(List<Trip> trips, long now) {
        List<Integer> minutes = new ArrayList<>();
        for (Trip t : trips) {
            if (!"work".equals(t.direction) || now - t.startedAt > 60 * DAY_MS || t.startedAt > now) continue;
            if (isWeekday(at(t.startedAt))) minutes.add(minuteOfDay(t.startedAt));
        }
        if (minutes.size() < 3) return -1;
        Collections.sort(minutes);
        return minutes.get(minutes.size() / 2);
    }

    static long typicalDurationSeconds(List<Trip> trips, long now) {
        return typicalDurationSeconds(trips, now, "work");
    }

    /** Median length of trips in this direction ("work" or "home") in the last 60 days, or 0 with none. */
    static long typicalDurationSeconds(List<Trip> trips, long now, String direction) {
        List<Integer> seconds = new ArrayList<>();
        for (Trip t : trips) {
            if (!direction.equals(t.direction) || now - t.startedAt > 60 * DAY_MS || t.startedAt > now) continue;
            seconds.add(t.durationSeconds);
        }
        if (seconds.isEmpty()) return 0;
        Collections.sort(seconds);
        return seconds.get(seconds.size() / 2);
    }

    // ---- Messages (null = nothing worth saying right now) -----------------------------------------------

    /** Start and Stop only: before the time the user leaves home, on their days, if nothing is logged yet today. */
    public static Message leaveNow(Config config, List<Trip> trips, long now) {
        if (config.auto || !config.commuteDay(at(now)) || tookTripOn(trips, dayStart(now))) return null;
        long usual = typicalDurationSeconds(trips, now, "work");
        String body = usual > 0 ? "Your commute usually takes about " + duration(usual) + ". Tap to start tracking." : "Tap to start tracking.";
        return new Message("Time to head out", body);
    }

    /** Start and Stop only: before the time the user leaves work, on their days, unless the trip home is already logged. */
    public static Message headHome(Config config, List<Trip> trips, long now) {
        long today = dayStart(now);
        if (config.auto || !config.commuteDay(at(now))) return null;
        // Without Home and Office every trip is "unknown", so two trips today count as both ways done.
        if (tookTripOn(trips, today, "home") || tripsOn(trips, today) >= 2) return null;
        long usual = typicalDurationSeconds(trips, now, "home");
        String body = usual > 0 ? "Your trip home usually takes about " + duration(usual) + ". Tap to start tracking." : "Tap to start tracking your trip home.";
        return new Message("Time to head home", body);
    }

    public static Message eveningNudge(Config config, List<Trip> trips, long now) {
        Calendar today = at(now);
        if (!config.commuteDay(today) || tookTripOn(trips, dayStart(now))) return null;
        // Only people with a habit: commuted on at least 2 of the previous 5 commute days.
        int daysWithTrips = 0;
        int checked = 0;
        for (int back = 1; back <= 14 && checked < 5; back++) {
            long day = onDay(dayStart(now), -back, 0);
            if (!config.commuteDay(at(day))) continue;
            checked++;
            if (tookTripOn(trips, day)) daysWithTrips++;
        }
        if (daysWithTrips < 2) return null;
        return new Message("No commute logged today", "Forgot to track? The home-screen widget starts a trip in one tap.");
    }

    /** Trips shorter than this don't count towards the average trip: usually Start tapped by mistake. Matches the app. */
    static final int MIN_COUNTED_SECONDS = 5 * 60;
    /** "Your usual trip" is the average over this many full weeks before the current one... */
    static final int USUAL_WEEKS = 4;
    /** ...and needs at least this many trips. Same rule as the app's Home screen. */
    static final int MIN_USUAL_TRIPS = 3;

    /**
     * Sunday's summary: this week's totals, and the average trip against the 4 weeks before (per trip, not totals,
     * so commuting on more days doesn't read as a slower commute).
     */
    public static Message weekly(List<Trip> trips, long now) {
        Calendar monday = startOfDay(now);
        monday.add(Calendar.DAY_OF_MONTH, -((monday.get(Calendar.DAY_OF_WEEK) + 5) % 7));
        long weekStart = monday.getTimeInMillis();
        long usualStart = onDay(weekStart, -7 * USUAL_WEEKS, 0);
        long total = 0;
        long meters = 0;
        int count = 0;
        long countedTotal = 0;
        int counted = 0;
        long usualTotal = 0;
        int usualCount = 0;
        for (Trip t : trips) {
            if (t.startedAt >= weekStart && t.startedAt <= now) {
                total += t.durationSeconds;
                meters += t.distanceMeters;
                count++;
                if (t.durationSeconds >= MIN_COUNTED_SECONDS) {
                    countedTotal += t.durationSeconds;
                    counted++;
                }
            } else if (t.startedAt >= usualStart && t.startedAt < weekStart && t.durationSeconds >= MIN_COUNTED_SECONDS) {
                usualTotal += t.durationSeconds;
                usualCount++;
            }
        }
        if (count == 0) return null;
        StringBuilder body = new StringBuilder("This week: " + duration(total) + " commuting over " + count + (count == 1 ? " trip" : " trips") + " (" + km(meters) + ").");
        if (counted > 0 && usualCount >= MIN_USUAL_TRIPS) {
            long average = countedTotal / counted;
            long diffMinutes = Math.round((average - usualTotal / (double) usualCount) / 60.0);
            body.append(" Your average trip was ").append(duration(average));
            if (diffMinutes == 0) body.append(", about the same as the last ").append(USUAL_WEEKS).append(" weeks.");
            else body.append(", ").append(Math.abs(diffMinutes)).append(" min ").append(diffMinutes < 0 ? "quicker" : "slower").append(" than the last ").append(USUAL_WEEKS).append(" weeks.");
        }
        return new Message("Your week in commutes", body.toString());
    }

    /** The recap for the month before `now`. */
    public static Message monthly(List<Trip> trips, long now) {
        Calendar first = startOfDay(now);
        first.set(Calendar.DAY_OF_MONTH, 1);
        long thisMonth = first.getTimeInMillis();
        first.add(Calendar.MONTH, -1);
        long lastMonth = first.getTimeInMillis();
        long total = 0;
        long meters = 0;
        int count = 0;
        java.util.Set<Long> days = new java.util.HashSet<>();
        for (Trip t : trips) {
            if (t.startedAt >= lastMonth && t.startedAt < thisMonth) {
                total += t.durationSeconds;
                meters += t.distanceMeters;
                count++;
                days.add(dayStart(t.startedAt));
            }
        }
        if (count == 0) return null;
        String name = MONTHS[first.get(Calendar.MONTH)];
        String body = "You spent " + duration(total) + " commuting across " + count + (count == 1 ? " trip" : " trips") + " (" + km(meters) + "), about " + duration(total / days.size()) + " on a commuting day.";
        return new Message("Your " + name + " commute recap", body);
    }

    public static Message slowDay(List<Trip> trips, long now) {
        Calendar today = at(now);
        if (!isWeekday(today)) return null;
        return slowDayFor(trips, now, today.get(Calendar.DAY_OF_WEEK));
    }

    /** For testing: the slow-day message for whichever weekday is slowest, whatever day it is today. */
    public static Message slowDayPreview(List<Trip> trips, long now) {
        Message best = null;
        double bestExtra = 0;
        for (int weekday = Calendar.MONDAY; weekday <= Calendar.FRIDAY; weekday++) {
            Message message = slowDayFor(trips, now, weekday);
            double[] stats = slowDayStats(trips, now, weekday);
            if (message != null && stats[1] - stats[0] > bestExtra) {
                bestExtra = stats[1] - stats[0];
                best = message;
            }
        }
        return best;
    }

    /** {average of all trips, average for this weekday, trips counted, trips on this weekday}, over the last 90 days. */
    private static double[] slowDayStats(List<Trip> trips, long now, int weekday) {
        long sumAll = 0;
        int countAll = 0;
        long sumDay = 0;
        int countDay = 0;
        for (Trip t : trips) {
            if (now - t.startedAt > 90 * DAY_MS || t.startedAt > now) continue;
            sumAll += t.durationSeconds;
            countAll++;
            if (at(t.startedAt).get(Calendar.DAY_OF_WEEK) == weekday) {
                sumDay += t.durationSeconds;
                countDay++;
            }
        }
        return new double[] { countAll == 0 ? 0 : (double) sumAll / countAll, countDay == 0 ? 0 : (double) sumDay / countDay, countAll, countDay };
    }

    private static Message slowDayFor(List<Trip> trips, long now, int weekday) {
        double[] stats = slowDayStats(trips, now, weekday);
        double avgAll = stats[0];
        double avgDay = stats[1];
        if (stats[2] < 10 || stats[3] < 3) return null;
        if (avgDay < avgAll * 1.15 || avgDay - avgAll < 180) return null;
        String name = WEEKDAYS[weekday - 1];
        long extraMinutes = Math.round((avgDay - avgAll) / 60);
        return new Message(name + "s run slower for you", "Your " + name + " commutes average " + duration(Math.round(avgDay)) + ", about " + extraMinutes + " min longer than usual. Consider leaving a little earlier.");
    }

    public static Message setup() {
        return new Message("Set your Home and Office", "Add both addresses so every trip is labelled \"to work\" or \"to home\".");
    }

    public static Message messageFor(int type, Config config, List<Trip> trips, long now) {
        switch (type) {
            case LEAVE_NOW:
                return leaveNow(config, trips, now);
            case HEAD_HOME:
                return headHome(config, trips, now);
            case EVENING:
                return eveningNudge(config, trips, now);
            case WEEKLY:
                return weekly(trips, now);
            case MONTHLY:
                return monthly(trips, now);
            case SLOW_DAY:
                return slowDay(trips, now);
            case SETUP:
                return setup();
            default:
                return null;
        }
    }

    // ---- When to fire next -------------------------------------------------------------------------------

    /** The next time (strictly after `now`) a reminder of this type should fire. `setupAnchor` is when Home/Office was first found missing. */
    public static long nextFire(int type, Config config, List<Trip> trips, long now, long setupAnchor, int setupSent) {
        long today = dayStart(now);
        switch (type) {
            case LEAVE_NOW:
                return nextCommuteDay(config, today, now, Math.max(config.leaveHomeMinutes - HEADS_UP_MINUTES, 0));
            case HEAD_HOME:
                return nextCommuteDay(config, today, now, Math.max(config.leaveWorkMinutes - HEADS_UP_MINUTES, 0));
            case SLOW_DAY: {
                int typical = typicalDepartureMinutes(trips, now);
                int minute = typical < 0 ? DEFAULT_MORNING_MINUTES : Math.max(typical - 45, 5 * 60);
                return nextWeekday(today, now, minute);
            }
            case EVENING:
                return nextCommuteDay(config, today, now, config.eveningMinutes);
            case WEEKLY: {
                for (int d = 0; d <= 7; d++) {
                    long candidate = onDay(today, d, 18 * 60);
                    if (at(candidate).get(Calendar.DAY_OF_WEEK) == Calendar.SUNDAY && candidate > now) return candidate;
                }
                return now + 7 * DAY_MS;
            }
            case MONTHLY: {
                Calendar c = startOfDay(now);
                c.set(Calendar.DAY_OF_MONTH, 1);
                c.set(Calendar.HOUR_OF_DAY, 9);
                if (c.getTimeInMillis() <= now) c.add(Calendar.MONTH, 1);
                return c.getTimeInMillis();
            }
            case SETUP: {
                long due = setupSent == 0 ? onDay(dayStart(setupAnchor), 2, 18 * 60) : onDay(dayStart(setupAnchor), 5, 18 * 60);
                return Math.max(due, now + 60_000);
            }
            default:
                return now + DAY_MS;
        }
    }

    private static long nextCommuteDay(Config config, long today, long now, int minute) {
        for (int d = 0; d <= 8; d++) {
            long candidate = onDay(today, d, minute);
            if (config.commuteDay(at(candidate)) && candidate > now) return candidate;
        }
        return now + DAY_MS;
    }

    private static long nextWeekday(long today, long now, int minute) {
        for (int d = 0; d <= 8; d++) {
            long candidate = onDay(today, d, minute);
            if (isWeekday(at(candidate)) && candidate > now) return candidate;
        }
        return now + DAY_MS;
    }
}
