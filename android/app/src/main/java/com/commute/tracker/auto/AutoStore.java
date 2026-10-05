package com.commute.tracker.auto;

import android.content.Context;
import android.content.SharedPreferences;
import com.commute.tracker.support.DiagLog;

/**
 * Automatic start and stop on the phone: the settings pushed from the app, and the candidate trip waiting
 * for its arrival (saved to disk so it survives the app being closed). Each event runs `AutoLogic` and
 * stores what it decided.
 */
public final class AutoStore {

    private static final String PREFS = "CommuteAuto";
    private static final String CONFIG = "config";
    private static final String CANDIDATE = "candidate";

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
