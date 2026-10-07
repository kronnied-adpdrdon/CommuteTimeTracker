package com.provibsol.myce.auto;

import android.content.Context;
import android.content.SharedPreferences;
import com.provibsol.myce.support.DiagLog;

/**
 * Automatic start and stop on the phone: the settings pushed from the app, and the candidate trip waiting
 * for its arrival (saved to disk so it survives the app being closed). Each event runs `AutoLogic` and
 * stores what it decided.
 */
public final class AutoStore {

    private static final String PREFS = "CommuteAuto";
    private static final String CONFIG = "config";
    private static final String CANDIDATE = "candidate";
    /** The place the phone was last seen entering ("home" or "office"), until it is seen leaving. */
    private static final String INSIDE = "inside";
    /** The circles `INSIDE` refers to, so it can be forgotten when Home, Office or a circle size changes. */
    private static final String INSIDE_FOR = "insideFor";

    private AutoStore() {}

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static void saveConfig(Context context, String json) {
        prefs(context).edit().putString(CONFIG, json).apply();
    }

    public static AutoLogic.Config config(Context context) {
        return AutoLogic.Config.fromJson(prefs(context).getString(CONFIG, null));
    }

    public static AutoLogic.Candidate candidate(Context context) {
        return AutoLogic.Candidate.fromJson(prefs(context).getString(CANDIDATE, null));
    }

    /** Stop waiting for an arrival, e.g. the user stopped or cancelled the automatic trip themselves. */
    public static synchronized void clearCandidate(Context context) {
        saveCandidate(context, null);
    }

    private static void saveCandidate(Context context, AutoLogic.Candidate candidate) {
        SharedPreferences.Editor editor = prefs(context).edit();
        if (candidate == null) editor.remove(CANDIDATE);
        else editor.putString(CANDIDATE, candidate.toJson());
        editor.commit();
    }

    /** Runs one event through the rules, saves the candidate that results and logs the decision. */
    private static AutoLogic.Result apply(Context context, String event, AutoLogic.Result result) {
        saveCandidate(context, result.candidate);
        DiagLog.log("auto", event + " -> " + result.action + " (" + result.reason + ")");
        return result;
    }

    /**
     * Forgets where the phone is if Home, Office or a circle size changed since it was seen there (Android then
     * reports the circle the phone is in). Not on every set-up: re-adding unchanged circles doesn't always repeat it.
     */
    /** The circles are off: nothing will report where the phone goes, so stop remembering where it was. */
    public static void forgetInside(Context context) {
        prefs(context).edit().remove(INSIDE).remove(INSIDE_FOR).commit();
    }

    public static void forgetInsideIfCirclesChanged(Context context, AutoLogic.Config config) {
        String circles = config.home.lat + "," + config.home.lng + "," + config.homeRadius + "|" + config.office.lat + "," + config.office.lng + "," + config.officeRadius;
        if (circles.equals(prefs(context).getString(INSIDE_FOR, null))) return;
        prefs(context).edit().remove(INSIDE).putString(INSIDE_FOR, circles).commit();
    }

    /**
     * A real exit report from Android, with the location that triggered it if known. Reports that can't be a real
     * departure (see `AutoLogic.fakeExit`) are logged and ignored, leaving any candidate as it was.
     */
    public static synchronized AutoLogic.Result exitReported(Context context, String place, long at, Double lat, Double lng) {
        String fake = AutoLogic.fakeExit(config(context), place, prefs(context).getString(INSIDE, null), lat, lng);
        if (fake != null) {
            DiagLog.log("auto", "exit " + place + " ignored (" + fake + ")");
            return AutoLogic.Result.none(candidate(context), fake);
        }
        prefs(context).edit().remove(INSIDE).commit();
        return exited(context, place, at);
    }

    /** A real enter report from Android: remembers where the phone is, then runs the rules. */
    public static synchronized AutoLogic.Result enterReported(Context context, String place, long at, Double lat, Double lng) {
        String fake = AutoLogic.fakeEnter(config(context), place, lat, lng);
        if (fake != null) {
            DiagLog.log("auto", "enter " + place + " ignored (" + fake + ")");
            return AutoLogic.Result.none(candidate(context), fake);
        }
        prefs(context).edit().putString(INSIDE, place).commit();
        return entered(context, place, at);
    }

    /** Runs an exit through the rules. Developer tools call this directly, without the checks or the remembered place. */
    public static synchronized AutoLogic.Result exited(Context context, String place, long at) {
        return apply(context, "exit " + place, AutoLogic.onExit(candidate(context), place, at, config(context)));
    }

    public static synchronized AutoLogic.Result entered(Context context, String place, long at) {
        return apply(context, "enter " + place, AutoLogic.onEnter(candidate(context), place, at));
    }

    public static synchronized AutoLogic.Result check(Context context, long now) {
        return apply(context, "check", AutoLogic.onCheck(candidate(context), now));
    }
}
