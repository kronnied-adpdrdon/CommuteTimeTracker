package com.commute.tracker;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;
import java.util.Calendar;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Home-screen widget: this week's commute time, the last trip, and a Start/Stop button.
 * Reads the same storage the app writes (Capacitor Preferences), so it needs no data of its own.
 */
public class CommuteWidgetProvider extends AppWidgetProvider {

    /** Capacitor Preferences' default SharedPreferences file and the app's storage keys. */
    private static final String PREFS = "CapacitorStorage";
    private static final String TRIPS_KEY = "trips.v1";
    private static final String ACTIVE_TRIP_KEY = "activeTrip.v1";

    /** Handled by the web app through @capacitor/app's appUrlOpen. Sent only to our own activity. */
    static final String START_URL = "commutetracker://start";
    static final String STOP_URL = "commutetracker://stop";
    static final String OPEN_URL = "commutetracker://open";

    private static final String[] MONTHS = { "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" };

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] widgetIds) {
        for (int id : widgetIds) {
            manager.updateAppWidget(id, buildViews(context));
        }
    }

    /** Re-draws every placed widget, e.g. after a trip is saved. */
    static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, CommuteWidgetProvider.class));
        if (ids.length == 0) return;
        RemoteViews views = buildViews(context);
        for (int id : ids) {
            manager.updateAppWidget(id, views);
        }
    }

    private static RemoteViews buildViews(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_commute);
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        long activeStartedAt = readActiveTripStart(prefs.getString(ACTIVE_TRIP_KEY, null));

        views.setOnClickPendingIntent(R.id.widget_root, openApp(context, OPEN_URL, 0));

        if (activeStartedAt > 0) {
            long base = SystemClock.elapsedRealtime() - (System.currentTimeMillis() - activeStartedAt);
            views.setChronometer(R.id.widget_timer, base, null, true);
            views.setViewVisibility(R.id.widget_timer, View.VISIBLE);
            views.setViewVisibility(R.id.widget_week_total, View.GONE);
            views.setTextViewText(R.id.widget_status, "Tracking");
            views.setTextColor(R.id.widget_status, context.getColor(R.color.widget_success));
            views.setTextViewText(R.id.widget_caption, "Commute started at " + clock(activeStartedAt));
            views.setViewVisibility(R.id.widget_last_trip, View.GONE);
            views.setTextViewText(R.id.widget_button, "Stop");
            views.setInt(R.id.widget_button, "setBackgroundResource", R.drawable.widget_button_stop);
            views.setOnClickPendingIntent(R.id.widget_button, openApp(context, STOP_URL, 2));
        } else {
            WeekTotals week = readWeek(prefs.getString(TRIPS_KEY, null));
            views.setChronometer(R.id.widget_timer, SystemClock.elapsedRealtime(), null, false);
            views.setViewVisibility(R.id.widget_timer, View.GONE);
            views.setViewVisibility(R.id.widget_week_total, View.VISIBLE);
            views.setTextViewText(R.id.widget_week_total, duration(week.seconds));
            views.setTextViewText(R.id.widget_status, "Ready");
            views.setTextColor(R.id.widget_status, context.getColor(R.color.widget_text_secondary));
            views.setTextViewText(
                R.id.widget_caption,
                "This week · " + week.count + (week.count == 1 ? " trip" : " trips")
            );
            if (week.lastStartedAt > 0) {
                views.setViewVisibility(R.id.widget_last_trip, View.VISIBLE);
                views.setTextViewText(
                    R.id.widget_last_trip,
                    "Last: " + day(week.lastStartedAt) + " · " + duration(week.lastSeconds) + " · " + km(week.lastMeters)
                );
            } else {
                views.setViewVisibility(R.id.widget_last_trip, View.GONE);
            }
            views.setTextViewText(R.id.widget_button, "Start");
            views.setInt(R.id.widget_button, "setBackgroundResource", R.drawable.widget_button_start);
            views.setOnClickPendingIntent(R.id.widget_button, openApp(context, START_URL, 1));
        }
        return views;
    }

    /** An explicit intent to our own activity: no other app can send these URLs to us. */
    private static PendingIntent openApp(Context context, String url, int requestCode) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url), context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static long readActiveTripStart(String json) {
        if (json == null) return 0;
        try {
            return new JSONObject(json).optLong("startedAt", 0);
        } catch (Exception e) {
            return 0;
        }
    }

    private static final class WeekTotals {
        int count;
        long seconds;
        long lastStartedAt;
        long lastSeconds;
        double lastMeters;
    }

    /** Monday-to-Sunday week in local time, matching the app's "This Week". */
    private static WeekTotals readWeek(String json) {
        WeekTotals totals = new WeekTotals();
        if (json == null) return totals;
        Calendar monday = Calendar.getInstance();
        monday.set(Calendar.HOUR_OF_DAY, 0);
        monday.set(Calendar.MINUTE, 0);
        monday.set(Calendar.SECOND, 0);
        monday.set(Calendar.MILLISECOND, 0);
        int daysSinceMonday = (monday.get(Calendar.DAY_OF_WEEK) + 5) % 7;
        monday.add(Calendar.DAY_OF_MONTH, -daysSinceMonday);
        long weekStart = monday.getTimeInMillis();
        long weekEnd = weekStart + 7L * 24 * 60 * 60 * 1000;
        try {
            JSONArray trips = new JSONObject(json).getJSONArray("trips");
            for (int i = 0; i < trips.length(); i++) {
                JSONObject trip = trips.getJSONObject(i);
                long startedAt = trip.optLong("startedAt", 0);
                long seconds = trip.optLong("durationSeconds", 0);
                if (startedAt >= weekStart && startedAt < weekEnd) {
                    totals.count++;
                    totals.seconds += seconds;
                }
                if (startedAt > totals.lastStartedAt) {
                    totals.lastStartedAt = startedAt;
                    totals.lastSeconds = seconds;
                    totals.lastMeters = trip.optDouble("distanceMeters", 0);
                }
            }
        } catch (Exception e) {
            // Unreadable storage: show an empty week rather than crash the launcher.
        }
        return totals;
    }

    private static String duration(long totalSeconds) {
        long minutes = Math.max(0, totalSeconds) / 60;
        return String.format(Locale.US, "%dh %02dm", minutes / 60, minutes % 60);
    }

    private static String km(double meters) {
        return String.format(Locale.US, "%.1f km", Math.max(0, meters) / 1000);
    }

    private static String clock(long timestamp) {
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(timestamp);
        return String.format(Locale.US, "%02d:%02d", c.get(Calendar.HOUR_OF_DAY), c.get(Calendar.MINUTE));
    }

    private static String day(long timestamp) {
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(timestamp);
        return c.get(Calendar.DAY_OF_MONTH) + " " + MONTHS[c.get(Calendar.MONTH)];
    }
}
