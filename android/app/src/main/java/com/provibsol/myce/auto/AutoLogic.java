package com.provibsol.myce.auto;

import com.provibsol.myce.tracking.Fix;
import java.util.Calendar;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Automatic start and stop, decided from Home and Office geofence crossings. Pure Java (no Android
 * classes) so it is unit-tested on a laptop.
 *
 * Leaving one place inside a commute window starts a candidate trip. It becomes a real trip only if it
 * ends inside the other place before it expires; returning to where it started, or never arriving,
 * drops it. Outside the commute windows nothing happens at all, so weekend errands are never watched.
 */
public final class AutoLogic {

    private AutoLogic() {}

    public static final String HOME = "home";
    public static final String OFFICE = "office";

    static final long MINUTE_MS = 60_000L;
    /** Shorter than this between leaving and arriving is a mistake, not a commute. */
    static final long MIN_TRIP_MS = 5 * MINUTE_MS;
    /** How long to wait for the arrival: this many times the expected commute, within the limits below. */
    static final double WAIT_FACTOR = 2.5;
    static final long MIN_WAIT_MS = 45 * MINUTE_MS;
    static final long MAX_WAIT_MS = 3 * 60 * MINUTE_MS;
    /** "Your commute usually takes about": the default, and the limits the app's setting allows. */
    static final int DEFAULT_COMMUTE_MINUTES = 45;
    static final int MIN_COMMUTE_MINUTES = 5;
    static final int MAX_COMMUTE_MINUTES = 180;
    static final int DEFAULT_RADIUS_METERS = 150;
    static final int MIN_RADIUS_METERS = 100;
    static final int MAX_RADIUS_METERS = 1000;

    public static final class Place {
        public final double lat;
        public final double lng;

        public Place(double lat, double lng) {
            this.lat = lat;
            this.lng = lng;
        }
    }

    /** The user's choices, pushed from the app's settings, plus the saved Home and Office. */
    public static final class Config {
        public boolean enabled = false;
        /** Minutes after midnight; a window covers [start, end). */
        public int morningStart = 7 * 60;
        public int morningEnd = 10 * 60;
        public int eveningStart = 16 * 60;
        public int eveningEnd = 20 * 60;
        /** Indexed by Calendar.DAY_OF_WEEK (1 = Sunday ... 7 = Saturday); index 0 unused. Default Mon-Fri. */
        public boolean[] days = { false, false, true, true, true, true, true, false };
        public int homeRadius = DEFAULT_RADIUS_METERS;
        public int officeRadius = DEFAULT_RADIUS_METERS;
        /** How long the user says the commute usually takes. */
        public int commuteMinutes = DEFAULT_COMMUTE_MINUTES;
        public Place home;
        public Place office;

        /** On, both places set, and far enough apart that their circles don't touch. */
        public boolean ready() {
            return enabled && home != null && office != null && !placesTooClose();
        }

        public boolean placesTooClose() {
            return home != null && office != null && placeDistance() <= homeRadius + officeRadius;
        }

        double placeDistance() {
            return Fix.distanceMeters(home.lat, home.lng, office.lat, office.lng);
        }

        public static Config fromJson(String json) {
            Config c = new Config();
            if (json == null) return c;
            try {
                JSONObject o = new JSONObject(json);
                c.enabled = o.optBoolean("enabled", false);
                c.morningStart = minutes(o, "morningStart", c.morningStart);
                c.morningEnd = minutes(o, "morningEnd", c.morningEnd);
                c.eveningStart = minutes(o, "eveningStart", c.eveningStart);
                c.eveningEnd = minutes(o, "eveningEnd", c.eveningEnd);
                JSONArray days = o.optJSONArray("days");
                if (days != null) {
                    // The app sends JavaScript weekdays: 0 = Sunday ... 6 = Saturday.
                    c.days = new boolean[8];
                    for (int i = 0; i < days.length(); i++) {
                        int d = days.optInt(i, -1);
                        if (d >= 0 && d <= 6) c.days[d + 1] = true;
                    }
                }
                c.homeRadius = radius(o, "homeRadius");
                c.officeRadius = radius(o, "officeRadius");
                c.commuteMinutes = Math.max(MIN_COMMUTE_MINUTES, Math.min(MAX_COMMUTE_MINUTES, o.optInt("commuteMinutes", DEFAULT_COMMUTE_MINUTES)));
                c.home = place(o.optJSONObject("home"));
                c.office = place(o.optJSONObject("office"));
            } catch (JSONException ignored) {
                return new Config();
            }
            return c;
        }

        private static int minutes(JSONObject o, String key, int fallback) {
            int value = o.optInt(key, fallback);
            return value >= 0 && value < 24 * 60 ? value : fallback;
        }

        private static int radius(JSONObject o, String key) {
            int value = o.optInt(key, DEFAULT_RADIUS_METERS);
            return Math.max(MIN_RADIUS_METERS, Math.min(MAX_RADIUS_METERS, value));
        }

        private static Place place(JSONObject o) {
            if (o == null || !o.has("lat") || !o.has("lng")) return null;
            double lat = o.optDouble("lat");
            double lng = o.optDouble("lng");
            return Double.isNaN(lat) || Double.isNaN(lng) ? null : new Place(lat, lng);
        }
    }

    /** A possible commute: left `from` at `leftAt`, waiting to arrive at the other place until `expiresAt`. */
    public static final class Candidate {
        public final String from;
        public final long leftAt;
        public final long expiresAt;

        public Candidate(String from, long leftAt, long expiresAt) {
            this.from = from;
            this.leftAt = leftAt;
            this.expiresAt = expiresAt;
        }

        public String toJson() {
            try {
                return new JSONObject().put("from", from).put("leftAt", leftAt).put("expiresAt", expiresAt).toString();
            } catch (JSONException e) {
                return null;
            }
        }

        /** Null for missing or damaged data: a lost candidate only means one trip isn't logged automatically. */
        public static Candidate fromJson(String json) {
            if (json == null) return null;
            try {
                JSONObject o = new JSONObject(json);
                String from = o.getString("from");
                if (!HOME.equals(from) && !OFFICE.equals(from)) return null;
                return new Candidate(from, o.getLong("leftAt"), o.getLong("expiresAt"));
            } catch (JSONException e) {
                return null;
            }
        }
    }

    /** What the phone should do with its recording. */
    public enum Action {
        /** Nothing changes. */
        NONE,
        /** Begin recording a new candidate (discarding any earlier one). */
        START,
        /** The candidate was a commute: save it from `startedAt` to `endedAt`. */
        KEEP,
        /** The candidate wasn't a commute: throw it away. */
        DROP,
    }

    public static final class Result {
        public final Action action;
        /** The candidate to remember afterwards (null = none). */
        public final Candidate candidate;
        /** Why, in a word, for the diagnostics log. */
        public final String reason;
        public final long startedAt;
        public final long endedAt;
        /** KEEP only: "work" or "home". */
        public final String direction;

        private Result(Action action, Candidate candidate, String reason, long startedAt, long endedAt, String direction) {
            this.action = action;
            this.candidate = candidate;
            this.reason = reason;
            this.startedAt = startedAt;
            this.endedAt = endedAt;
            this.direction = direction;
        }

        static Result none(Candidate keep, String reason) {
            return new Result(Action.NONE, keep, reason, 0, 0, null);
        }

        static Result start(Candidate candidate) {
            return new Result(Action.START, candidate, "left-" + candidate.from, 0, 0, null);
        }

        static Result drop(String reason) {
            return new Result(Action.DROP, null, reason, 0, 0, null);
        }

        static Result keep(Candidate c, long arrivedAt) {
            return new Result(Action.KEEP, null, "arrived", c.leftAt, arrivedAt, HOME.equals(c.from) ? "work" : "home");
        }
    }

    // ---- Events -----------------------------------------------------------------------------------------

    /** An exit whose location is closer than this share of the radius to the centre was not a real exit. */
    static final double STILL_INSIDE_SHARE = 0.5;
    /** An enter whose location is farther than this many radii from the centre was not a real arrival. */
    static final double FAR_OUTSIDE_RADII = 3;

    /**
     * Why an exit report is not a real departure, or null if it is. Setting up the circles can make Android
     * report leaving both places at once while the phone hasn't moved, which would start a pretend trip. So an
     * exit only counts if the phone was last seen inside that place (`lastInside`, from enter events), and the
     * location that triggered it (if known) is not well inside the circle.
     */
    public static String fakeExit(Config config, String place, String lastInside, Double lat, Double lng) {
        if (!place.equals(lastInside)) return "not-inside";
        Place p = HOME.equals(place) ? config.home : config.office;
        int radius = HOME.equals(place) ? config.homeRadius : config.officeRadius;
        if (p != null && lat != null && lng != null && Fix.distanceMeters(lat, lng, p.lat, p.lng) < radius * STILL_INSIDE_SHARE) return "still-inside";
        return null;
    }

    /** Why an enter report is not a real arrival (its location is far outside the circle), or null if it is. */
    public static String fakeEnter(Config config, String place, Double lat, Double lng) {
        Place p = HOME.equals(place) ? config.home : config.office;
        int radius = HOME.equals(place) ? config.homeRadius : config.officeRadius;
        if (p != null && lat != null && lng != null && Fix.distanceMeters(lat, lng, p.lat, p.lng) > radius * FAR_OUTSIDE_RADII) return "far-outside";
        return null;
    }

    /** The phone left Home or Office at `at` (the geofence's own timestamp, not when the event was delivered). */
    public static Result onExit(Candidate current, String place, long at, Config config) {
        String skip = !config.ready() ? "not-ready" : !inWindow(config, at) ? "outside-window" : null;
        if (skip != null) {
            // An unfinished candidate can't still be right: the phone has since been back inside a place.
            return current != null ? Result.drop(skip) : Result.none(null, skip);
        }
        // Any earlier candidate is replaced: its arrival was missed, or it already expired.
        return Result.start(new Candidate(place, at, at + waitMs(config)));
    }

    /** The phone arrived at Home or Office at `at`. */
    public static Result onEnter(Candidate current, String place, long at) {
        if (current == null) return Result.none(null, "no-candidate");
        if (at > current.expiresAt) return Result.drop("expired");
        if (current.from.equals(place)) return Result.drop("returned");
        if (at - current.leftAt < MIN_TRIP_MS) return Result.drop("too-short");
        return Result.keep(current, at);
    }

    /** An alarm at the candidate's expiry, or the app opening: drops a candidate that has run out of time. */
    public static Result onCheck(Candidate current, long now) {
        if (current == null) return Result.none(null, "no-candidate");
        return now > current.expiresAt ? Result.drop("expired") : Result.none(current, "waiting");
    }

    // ---- Rules ------------------------------------------------------------------------------------------

    /** Whether `at` falls on a chosen day, inside the morning or evening window. */
    static boolean inWindow(Config config, long at) {
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(at);
        if (!config.days[c.get(Calendar.DAY_OF_WEEK)]) return false;
        int minute = c.get(Calendar.HOUR_OF_DAY) * 60 + c.get(Calendar.MINUTE);
        return within(minute, config.morningStart, config.morningEnd) || within(minute, config.eveningStart, config.eveningEnd);
    }

    private static boolean within(int minute, int start, int end) {
        return start <= end ? minute >= start && minute < end : minute >= start || minute < end;
    }

    /** How long to wait for the arrival: 2.5 x the commute time the user gave, between 45 minutes and 3 hours. */
    static long waitMs(Config config) {
        long expected = config.commuteMinutes * MINUTE_MS;
        return Math.max(MIN_WAIT_MS, Math.min(MAX_WAIT_MS, Math.round(expected * WAIT_FACTOR)));
    }
}
