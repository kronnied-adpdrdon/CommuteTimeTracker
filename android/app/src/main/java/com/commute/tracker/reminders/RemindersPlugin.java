package com.commute.tracker.reminders;

import android.Manifest;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

/** The app's bridge to the reminder alarms. Settings are saved on the phone; nothing is sent anywhere. */
@CapacitorPlugin(
    name = "Reminders",
    permissions = { @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS }) }
)
public class RemindersPlugin extends Plugin {

    /** Saves the user's choices (a JSON object) and re-sets every alarm. */
    @PluginMethod
    public void configure(PluginCall call) {
        ReminderScheduler.saveConfig(getContext(), call.getData().toString());
        ReminderScheduler.rescheduleAll(getContext());
        call.resolve();
    }

    /** Whether notifications can actually be shown right now (permission and the phone's notification switch). */
    @PluginMethod
    public void canNotify(PluginCall call) {
        JSObject result = new JSObject();
        result.put("allowed", ReminderScheduler.canNotify(getContext()));
        call.resolve(result);
    }

    /** Shows a sample notification so the user can see that they work. */
    @PluginMethod
    public void sendTest(PluginCall call) {
        ReminderScheduler.show(getContext(), 0, "Notifications are on", "You'll get helpful commute reminders like this one.");
        call.resolve();
    }
}
