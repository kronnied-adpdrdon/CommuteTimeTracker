package com.commute.tracker.reminders;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import com.commute.tracker.support.DiagLog;

/** Receives the reminder alarms, and re-creates them after the phone restarts or the app is updated. */
public class ReminderReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        DiagLog.init(context);
        String action = intent.getAction();
        if (ReminderScheduler.ACTION_FIRE.equals(action)) {
            ReminderScheduler.fire(context, intent.getIntExtra(ReminderScheduler.EXTRA_TYPE, 0));
        } else if (Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            ReminderScheduler.rescheduleAll(context);
        }
    }
}
