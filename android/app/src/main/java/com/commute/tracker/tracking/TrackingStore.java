package com.commute.tracker.tracking;

import android.content.Context;
import android.content.SharedPreferences;
import java.util.UUID;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Persists the trip in progress (after every reading, so a killed app loses nothing) and a queue of
 * finished trips waiting for the app to file them into History. Shared by the service, the plugin and the widget.
 */
public final class TrackingStore {

    private static final String PREFS = "CommuteTracker";
    private static final String SESSION = "session";
    private static final String FINISHED = "finished";

    /** A trip in progress: when it started, its last reading, and the distance engine's full state. */
    public static final class Session {
        public final String id;
        public final long startedAt;
        public long lastReadingAt;
        public final TrackerEngine engine;

        Session(String id, long startedAt, long lastReadingAt, TrackerEngine engine) {
            this.id = id;
            this.startedAt = startedAt;
            this.lastReadingAt = lastReadingAt;
            this.engine = engine;
        }

        public static Session begin(long now) {
            return new Session(UUID.randomUUID().toString(), now, 0, new TrackerEngine());
        }
    }

    private final SharedPreferences prefs;

    public TrackingStore(Context context) {
        prefs = context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public Session loadSession() {
        String raw = prefs.getString(SESSION, null);
        if (raw == null) return null;
        try {
            JSONObject json = new JSONObject(raw);
            return new Session(json.getString("id"), json.getLong("startedAt"), json.optLong("lastReadingAt", 0), readEngine(json.getJSONObject("engine")));
        } catch (JSONException e) {
            // Unreadable: set it aside rather than silently losing it.
            prefs.edit().putString(SESSION + ".corrupt." + System.currentTimeMillis(), raw).remove(SESSION).apply();
            return null;
        }
    }

    public void saveSession(Session s) {
        try {
            JSONObject json = new JSONObject()
                .put("id", s.id)
                .put("startedAt", s.startedAt)
                .put("lastReadingAt", s.lastReadingAt)
                .put("engine", writeEngine(s.engine));
            prefs.edit().putString(SESSION, json.toString()).apply();
        } catch (JSONException ignored) {
            // put() only throws for NaN/infinite numbers, which the engine never produces.
        }
    }

    public void clearSession() {
        prefs.edit().remove(SESSION).apply();
    }

    /** Ends the session as a finished trip, queues it for the app, and clears the session. Synchronous. */
    public JSONObject finish(Session s, long endedAt) {
        JSONObject trip = new JSONObject();
        try {
            trip.put("id", s.id)
                .put("startedAt", s.startedAt)
                .put("endedAt", Math.max(endedAt, s.startedAt))
                .put("distanceMeters", Math.round(s.engine.totalMeters()));
            if (s.engine.start != null) trip.put("start", latLng(s.engine.start));
            if (s.engine.anchor != null) trip.put("end", latLng(s.engine.anchor));
            JSONArray queue = readFinished();
            queue.put(trip);
            prefs.edit().putString(FINISHED, queue.toString()).remove(SESSION).commit();
        } catch (JSONException ignored) {
            // See saveSession.
        }
        return trip;
    }

    /** Finished trips not yet filed by the app. Clears the queue. */
    public synchronized JSONArray drainFinished() {
        JSONArray queue = readFinished();
        prefs.edit().remove(FINISHED).commit();
        return queue;
    }

    private JSONArray readFinished() {
        try {
            return new JSONArray(prefs.getString(FINISHED, "[]"));
        } catch (JSONException e) {
            return new JSONArray();
        }
    }

    public static JSONObject latLng(Fix f) throws JSONException {
        return new JSONObject().put("lat", f.lat).put("lng", f.lng);
    }

    private static JSONObject writeFix(Fix f) throws JSONException {
        if (f == null) return null;
        JSONObject json = new JSONObject().put("lat", f.lat).put("lng", f.lng).put("time", f.time);
        if (f.accuracy != null) json.put("accuracy", f.accuracy.doubleValue());
        if (f.speed != null) json.put("speed", f.speed.doubleValue());
        return json;
    }

    private static Fix readFix(JSONObject json) {
        if (json == null) return null;
        return new Fix(
            json.optDouble("lat"),
            json.optDouble("lng"),
            json.has("accuracy") ? json.optDouble("accuracy") : null,
            json.has("speed") ? json.optDouble("speed") : null,
            json.optLong("time")
        );
    }

    private static JSONObject writeEngine(TrackerEngine e) throws JSONException {
        JSONObject json = new JSONObject()
            .put("committedMeters", e.committedMeters)
            .put("pendingMeters", e.pendingMeters)
            .put("acceptedFixes", e.acceptedFixes)
            .put("rejectedFixes", e.rejectedFixes);
        json.putOpt("anchor", writeFix(e.anchor));
        json.putOpt("pendingFrom", writeFix(e.pendingFrom));
        json.putOpt("last", writeFix(e.last));
        json.putOpt("candidate", writeFix(e.candidate));
        json.putOpt("suspect", writeFix(e.suspect));
        json.putOpt("start", writeFix(e.start));
        return json;
    }

    private static TrackerEngine readEngine(JSONObject json) {
        TrackerEngine e = new TrackerEngine();
        e.committedMeters = json.optDouble("committedMeters", 0);
        e.pendingMeters = json.optDouble("pendingMeters", 0);
        e.acceptedFixes = json.optInt("acceptedFixes", 0);
        e.rejectedFixes = json.optInt("rejectedFixes", 0);
        e.anchor = readFix(json.optJSONObject("anchor"));
        e.pendingFrom = readFix(json.optJSONObject("pendingFrom"));
        e.last = readFix(json.optJSONObject("last"));
        e.candidate = readFix(json.optJSONObject("candidate"));
        e.suspect = readFix(json.optJSONObject("suspect"));
        e.start = readFix(json.optJSONObject("start"));
        return e;
    }
}
