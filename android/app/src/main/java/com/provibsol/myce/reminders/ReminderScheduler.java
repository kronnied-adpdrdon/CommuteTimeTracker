package com.provibsol.myce.reminders;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import com.provibsol.myce.MainActivity;
import com.provibsol.myce.R;
import com.provibsol.myce.support.DiagLog;
import java.util.List;

/** Sets the alarms behind the reminders and shows the notification when one fires. */
public final class ReminderScheduler {

    private static final String PREFS = "CommuteReminders";
    private static final String CONFIG = "config";
    private static final String SETUP_ANCHOR = "setupAnchor";
    private static final String SETUP_SENT = "setupSent";
    /** Capacitor Preferences' own storage, where the app keeps its trips. */
    private static final String APP_STORAGE = "CapacitorStorage";
    private static final String TRIPS_KEY = "trips.v1";
    static final String CHANNEL_ID = "commute_reminders";
    static final String ACTION_FIRE = "com.provibsol.myce.action.REMINDER";
    static final String EXTRA_TYPE = "type";

    private ReminderScheduler() {}

    private static SharedPreferences prefs(Context context) {
        return context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static void saveConfig(Context context, String json) {
        SharedPreferences p = prefs(context);
        ReminderLogic.Config config = ReminderLogic.Config.fromJson(json);
        SharedPreferences.Editor editor = p.edit().putString(CONFIG, json);
        if (config.setup && !p.contains(SETUP_ANCHOR)) editor.putLong(SETUP_ANCHOR, System.currentTimeMillis());
        if (!config.setup) editor.remove(SETUP_ANCHOR).remove(SETUP_SENT);
        editor.apply();
    }

    private static ReminderLogic.Config config(Context context) {
        return ReminderLogic.Config.fromJson(prefs(context).getString(CONFIG, null));
    }

    /** The trips the app has saved, read straight from its storage. */
    public static List<ReminderLogic.Trip> trips(Context context) {
        String json = context.getApplicationContext().getSharedPreferences(APP_STORAGE, Context.MODE_PRIVATE).getString(TRIPS_KEY, null);
        return ReminderLogic.parseTrips(json);
    }

    private static PendingIntent alarmIntent(Context context, int type) {
        Intent intent = new Intent(context, ReminderReceiver.class).setAction(ACTION_FIRE).putExtra(EXTRA_TYPE, type);
        return PendingIntent.getBroadcast(context, 2000 + type, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /** Sets (or cancels) the alarm for every reminder type from the saved settings. */
    public static void rescheduleAll(Context context) {
        for (int type : ReminderLogic.ALL_TYPES) schedule(context, type);
    }

    static void schedule(Context context, int type) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;
        PendingIntent pending = alarmIntent(context, type);
        ReminderLogic.Config config = config(context);
        if (!config.enabled(type)) {
            alarms.cancel(pending);
            return;
        }
        SharedPreferences p = prefs(context);
        int sent = p.getInt(SETUP_SENT, 0);
        if (type == ReminderLogic.SETUP && sent >= 2) {
            alarms.cancel(pending);
            return;
        }
        long when = ReminderLogic.nextFire(type, config, trips(context), System.currentTimeMillis(), p.getLong(SETUP_ANCHOR, System.currentTimeMillis()), sent);
        // Inexact on purpose: no "exact alarm" permission needed, and a reminder a few minutes late is fine.
        alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pending);
        DiagLog.log("Reminders", "Type " + type + " scheduled for " + new java.util.Date(when));
    }

    /** Called when an alarm fires: show the notification if there is something to say, then schedule the next one. */
    static void fire(Context context, int type) {
        ReminderLogic.Config config = config(context);
        if (config.enabled(type)) {
            ReminderLogic.Message message = ReminderLogic.messageFor(type, trips(context), System.currentTimeMillis());
            if (message != null) {
                show(context, type, message.title, message.body);
                if (type == ReminderLogic.SETUP) {
                    SharedPreferences p = prefs(context);
                    p.edit().putInt(SETUP_SENT, p.getInt(SETUP_SENT, 0) + 1).apply();
                }
            }
        }
        schedule(context, type);
    }

    /** Why a reminder said nothing, for the developer preview. */
    private static String quietReason(int type) {
        switch (type) {
            case ReminderLogic.LEAVE_NOW:
                return "Time to leave only fires on weekdays, before any trip is logged today, once you have 3 or more trips to work.";
            case ReminderLogic.EVENING:
                return "Forgot to track only fires on weekdays when nothing is logged today and you commuted on 2 of the last 5 weekdays.";
            case ReminderLogic.WEEKLY:
                return "Weekly summary needs at least one trip this week.";
            case ReminderLogic.MONTHLY:
                return "Monthly recap needs at least one trip last month.";
            case ReminderLogic.SLOW_DAY:
                return "Slow-day heads-up needs 10 or more trips, 3 or more on the slow weekday, and that day at least 15% slower.";
            default:
                return "Nothing to say right now.";
        }
    }

    /**
     * Developer preview: shows what this reminder would say right now from the saved trips, ignoring its schedule.
     * If conditions aren't met, shows why instead. Returns true if the real message was shown.
     */
    public static boolean preview(Context context, int type) {
        List<ReminderLogic.Trip> trips = trips(context);
        long now = System.currentTimeMillis();
        ReminderLogic.Message message = type == ReminderLogic.SLOW_DAY ? ReminderLogic.slowDayPreview(trips, now) : ReminderLogic.messageFor(type, trips, now);
        if (message == null) {
            show(context, type, "Preview: nothing to send right now", quietReason(type));
            return false;
        }
        show(context, type, message.title, message.body);
        return true;
    }

    public static boolean canNotify(Context context) {
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return false;
        return NotificationManagerCompat.from(context).areNotificationsEnabled();
    }

    public static void show(Context context, int type, String title, String body) {
        if (!canNotify(context)) {
            DiagLog.log("Reminders", "Skipped type " + type + ": notifications not allowed");
            return;
        }
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        if (nm != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            nm.createNotificationChannel(new NotificationChannel(CHANNEL_ID, "Reminders", NotificationManager.IMPORTANCE_DEFAULT));
        }
        PendingIntent open = PendingIntent.getActivity(context, 0, new Intent(context, MainActivity.class), PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_tracking)
            .setColor(ContextCompat.getColor(context, R.color.widget_accent))
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(open)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_REMINDER);
        try {
            NotificationManagerCompat.from(context).notify(3000 + type, builder.build());
            DiagLog.log("Reminders", "Showed type " + type);
        } catch (SecurityException e) {
            DiagLog.log("Reminders", "Could not show type " + type + ": " + e);
        }
    }
}
