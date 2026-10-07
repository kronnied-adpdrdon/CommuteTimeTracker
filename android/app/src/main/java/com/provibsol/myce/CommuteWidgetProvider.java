package com.provibsol.myce;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;
import com.provibsol.myce.tracking.TrackingService;
import com.provibsol.myce.tracking.TrackingStore;
import java.util.Locale;

/**
 * Home-screen widget: live timer and distance with a Start / Stop button. Buttons control the native
 * recorder directly, so the app doesn't open. Tapping the rest of the widget does nothing.
 */
public class CommuteWidgetProvider extends AppWidgetProvider {

    /** Opens the app to ask for location permission: the one case a widget can't handle itself. */
    static final String START_URL = "commutetracker://start";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] widgetIds) {
        RemoteViews views = buildViews(context);
        for (int id : widgetIds) manager.updateAppWidget(id, views);
    }

    public static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, CommuteWidgetProvider.class));
        if (ids.length == 0) return;
        RemoteViews views = buildViews(context);
        for (int id : ids) manager.updateAppWidget(id, views);
    }

    private static RemoteViews buildViews(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_commute);
        TrackingStore.Session session = new TrackingStore(context).loadSession();
        boolean running = TrackingService.isRunning();

        if (session != null && running) {
            long base = SystemClock.elapsedRealtime() - (System.currentTimeMillis() - session.startedAt);
            views.setChronometer(R.id.widget_timer, base, null, true);
            views.setViewVisibility(R.id.widget_timer, View.VISIBLE);
            views.setViewVisibility(R.id.widget_time, View.GONE);
            views.setTextViewText(R.id.widget_distance, km(session.engine.totalMeters()));
            views.setTextViewText(R.id.widget_status, "TRACKING");
            views.setInt(R.id.widget_status, "setBackgroundResource", R.drawable.widget_pill_live);
            views.setTextColor(R.id.widget_status, context.getColor(R.color.widget_on_accent));
            views.setImageViewResource(R.id.widget_button_icon, R.drawable.ic_widget_stop);
            views.setInt(R.id.widget_button, "setBackgroundResource", R.drawable.widget_button_stop);
            views.setContentDescription(R.id.widget_button, "Stop tracking");
            views.setTextViewText(R.id.widget_button_label, "Stop");
            views.setTextViewText(R.id.widget_caption, "Started at " + timeOfDay(session.startedAt));
            views.setOnClickPendingIntent(R.id.widget_button, service(context, TrackingService.ACTION_STOP, 2));
        } else if (session != null) {
            // Recorder stopped unexpectedly (phone restarted, app force-closed): show where it got to, offer Resume.
            long elapsed = Math.max(0, (session.lastReadingAt > 0 ? session.lastReadingAt : session.startedAt) - session.startedAt);
            showStaticTime(views, clock(elapsed));
            views.setTextViewText(R.id.widget_distance, km(session.engine.totalMeters()));
            views.setTextViewText(R.id.widget_status, "PAUSED");
            views.setInt(R.id.widget_status, "setBackgroundResource", R.drawable.widget_pill);
            views.setTextColor(R.id.widget_status, context.getColor(R.color.widget_text_secondary));
            views.setImageViewResource(R.id.widget_button_icon, R.drawable.ic_widget_play);
            views.setInt(R.id.widget_button, "setBackgroundResource", R.drawable.widget_button_start);
            views.setContentDescription(R.id.widget_button, "Resume tracking");
            views.setTextViewText(R.id.widget_button_label, "Resume");
            views.setTextViewText(R.id.widget_caption, "Paused · tap ▶ to resume");
            views.setOnClickPendingIntent(R.id.widget_button, startAction(context, TrackingService.ACTION_RESUME, 3));
        } else {
            showStaticTime(views, clock(0));
            views.setTextViewText(R.id.widget_distance, km(0));
            views.setTextViewText(R.id.widget_status, "READY");
            views.setInt(R.id.widget_status, "setBackgroundResource", R.drawable.widget_pill);
            views.setTextColor(R.id.widget_status, context.getColor(R.color.widget_text_secondary));
            views.setImageViewResource(R.id.widget_button_icon, R.drawable.ic_widget_play);
            views.setInt(R.id.widget_button, "setBackgroundResource", R.drawable.widget_button_start);
            views.setContentDescription(R.id.widget_button, "Start tracking");
            views.setTextViewText(R.id.widget_button_label, "Start");
            views.setTextViewText(R.id.widget_caption, "Tap ▶ to start your trip");
            views.setOnClickPendingIntent(R.id.widget_button, startAction(context, TrackingService.ACTION_START, 1));
        }
        return views;
    }

    /**
     * Starts the recorder directly (Android allows a location service to start from a widget tap).
     * If precise location isn't granted or location is off, the widget can't fix that, so it opens the app.
     */
    private static PendingIntent startAction(Context context, String action, int requestCode) {
        if (TrackingService.hasPreciseLocation(context) && TrackingService.isLocationEnabled(context)) {
            return service(context, action, requestCode);
        }
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(START_URL), context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(context, requestCode + 10, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent service(Context context, String action, int requestCode) {
        return PendingIntent.getForegroundService(
            context,
            requestCode,
            TrackingService.intent(context, action),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private static void showStaticTime(RemoteViews views, String text) {
        views.setChronometer(R.id.widget_timer, SystemClock.elapsedRealtime(), null, false);
        views.setViewVisibility(R.id.widget_timer, View.GONE);
        views.setTextViewText(R.id.widget_time, text);
        views.setViewVisibility(R.id.widget_time, View.VISIBLE);
    }

    /** "MM:SS", or "H:MM:SS" from an hour, matching the live Chronometer. */
    private static String clock(long millis) {
        long s = Math.max(0, millis) / 1000;
        return s >= 3600
            ? String.format(Locale.US, "%d:%02d:%02d", s / 3600, (s % 3600) / 60, s % 60)
            : String.format(Locale.US, "%02d:%02d", s / 60, s % 60);
    }

    private static String timeOfDay(long timestamp) {
        java.util.Calendar c = java.util.Calendar.getInstance();
        c.setTimeInMillis(timestamp);
        return String.format(Locale.US, "%02d:%02d", c.get(java.util.Calendar.HOUR_OF_DAY), c.get(java.util.Calendar.MINUTE));
    }

    private static String km(double meters) {
        return String.format(Locale.US, "%.1f km", Math.max(0, meters) / 1000);
    }
}
