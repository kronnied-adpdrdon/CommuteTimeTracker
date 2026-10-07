package com.provibsol.myce.auto;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import androidx.core.content.ContextCompat;
import com.provibsol.myce.CommuteWidgetProvider;
import com.provibsol.myce.support.DiagLog;
import com.provibsol.myce.tracking.TrackingService;
import com.provibsol.myce.tracking.TrackingStore;

/**
 * Carries out what `AutoLogic` decided, using the same recorder as a manual trip: START records GPS from
 * the moment the phone left (so the distance is measured), KEEP saves it ending at the arrival, DROP
 * throws it away. A trip started by hand is never touched.
 */
public final class AutoActions {

    private AutoActions() {}

    static final String ACTION_CHECK = "com.provibsol.myce.action.AUTO_CHECK";
    /** Check a little after the candidate expires; Android may deliver inexact alarms late anyway. */
    private static final long CHECK_DELAY_MS = 60_000;

    public static void apply(Context context, AutoLogic.Result result) {
        switch (result.action) {
            case START:
                start(context, result.candidate);
                break;
            case KEEP:
                keep(context, result.endedAt, result.direction);
                break;
            case DROP:
                drop(context);
                break;
            default:
                break;
        }
    }

    private static void start(Context context, AutoLogic.Candidate candidate) {
        TrackingStore store = new TrackingStore(context);
        TrackingStore.Session existing = store.loadSession();
        if (existing != null && !existing.auto) {
            DiagLog.log("auto", "Manual trip in progress; not starting an automatic one");
            AutoStore.clearCandidate(context);
            return;
        }
        if (existing != null && !TrackingService.isRunning()) store.clearSession();
        try {
            ContextCompat.startForegroundService(
                context,
                TrackingService.intent(context, TrackingService.ACTION_AUTO_START).putExtra(TrackingService.EXTRA_TIME, candidate.leftAt)
            );
        } catch (RuntimeException e) {
            // Android refused to start recording from the background (no "Allow all the time", or a phone that blocks it).
            DiagLog.log("auto", "Could not start recording: " + e);
            AutoStore.clearCandidate(context);
            return;
        }
        scheduleCheck(context, candidate.expiresAt + CHECK_DELAY_MS);
    }

    private static void keep(Context context, long endedAt, String direction) {
        TrackingStore store = new TrackingStore(context);
        TrackingStore.Session s = store.loadSession();
        if (s == null || !s.auto) return;
        if (TrackingService.isRunning()) {
            send(context, TrackingService.intent(context, TrackingService.ACTION_AUTO_KEEP)
                .putExtra(TrackingService.EXTRA_TIME, endedAt)
                .putExtra(TrackingService.EXTRA_DIRECTION, direction));
        } else {
            // Recording was cut short (the phone stopped the service): keep what was measured.
            store.finish(s, endedAt, direction);
            CommuteWidgetProvider.refreshAll(context);
        }
    }

    private static void drop(Context context) {
        TrackingStore store = new TrackingStore(context);
        TrackingStore.Session s = store.loadSession();
        if (s == null || !s.auto) return;
        if (TrackingService.isRunning()) {
            send(context, TrackingService.intent(context, TrackingService.ACTION_AUTO_DROP));
        } else {
            store.clearSession();
            CommuteWidgetProvider.refreshAll(context);
        }
    }

    /** The recording service is in the foreground, so a plain start reaches it even with the app closed. */
    private static void send(Context context, Intent intent) {
        try {
            context.startService(intent);
        } catch (RuntimeException e) {
            DiagLog.log("auto", "Could not reach the recorder: " + e);
        }
    }

    private static void scheduleCheck(Context context, long at) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;
        Intent intent = new Intent(context, AutoReceiver.class).setAction(ACTION_CHECK);
        PendingIntent pending = PendingIntent.getBroadcast(context, 3000, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        alarms.set(AlarmManager.RTC_WAKEUP, at, pending);
    }
}
