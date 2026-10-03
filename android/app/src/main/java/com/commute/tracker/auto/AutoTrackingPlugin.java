package com.commute.tracker.auto;

import android.Manifest;
import android.os.Build;
import com.commute.tracker.support.DiagLog;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/** The app's bridge to automatic start and stop. Settings are saved on the phone; nothing is sent anywhere. */
@CapacitorPlugin(
    name = "AutoTracking",
    permissions = {
        @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }),
        @Permission(alias = "background", strings = { Manifest.permission.ACCESS_BACKGROUND_LOCATION }),
    }
)
public class AutoTrackingPlugin extends Plugin {

    @Override
    public void load() {
        DiagLog.init(getContext());
        // Covers a permission granted or revoked in phone settings since the last launch.
        AutoGeofences.sync(getContext());
        AutoActions.apply(getContext(), AutoStore.check(getContext(), System.currentTimeMillis()));
    }

    /** Saves the user's choices and the Home and Office points (a JSON object), and updates the circles. */
    @PluginMethod
    public void configure(PluginCall call) {
        AutoStore.saveConfig(getContext(), call.getData().toString());
        AutoGeofences.sync(getContext());
        call.resolve();
    }

    /**
     * Asks for precise location, then "Allow all the time" (Android 10+ shows its settings page for that).
     * The app shows its own explanation first, as Google Play requires. Resolves with `permissions()`.
     */
    @PluginMethod
    public void requestBackground(PluginCall call) {
        if (getPermissionState("location") != PermissionState.GRANTED) {
            requestPermissionForAlias("location", call, "afterLocation");
        } else {
            afterLocation(call);
        }
    }

    @PermissionCallback
    private void afterLocation(PluginCall call) {
        if (getPermissionState("location") != PermissionState.GRANTED || Build.VERSION.SDK_INT < Build.VERSION_CODES.Q || AutoGeofences.hasBackgroundLocation(getContext())) {
            afterBackground(call);
        } else {
            requestPermissionForAlias("background", call, "afterBackground");
        }
    }

    @PermissionCallback
    private void afterBackground(PluginCall call) {
        AutoGeofences.sync(getContext());
        call.resolve(permissions());
    }

    /** Whether automatic start and stop can work: "Allow all the time", and Google Play services for geofencing. */
    @PluginMethod
    public void checkBackground(PluginCall call) {
        call.resolve(permissions());
    }

    private JSObject permissions() {
        JSObject result = new JSObject();
        result.put("background", AutoGeofences.hasBackgroundLocation(getContext()));
        result.put("supported", AutoGeofences.supported(getContext()));
        return result;
    }

    /** Whether the rules can run, and the candidate trip waiting for its arrival, if any. */
    @PluginMethod
    public void status(PluginCall call) {
        AutoLogic.Config config = AutoStore.config(getContext());
        JSObject result = new JSObject();
        result.put("ready", config.ready());
        result.put("placesTooClose", config.placesTooClose());
        AutoLogic.Candidate candidate = AutoStore.candidate(getContext());
        if (candidate != null) {
            JSObject c = new JSObject();
            c.put("from", candidate.from);
            c.put("leftAt", candidate.leftAt);
            c.put("expiresAt", candidate.expiresAt);
            result.put("candidate", c);
        }
        call.resolve(result);
    }

    /**
     * Developer tools: feeds a pretend crossing through the same rules a real geofence will use.
     * `event` is "exit", "enter" or "check"; `place` is "home" or "office"; `at` defaults to now.
     */
    @PluginMethod
    public void simulate(PluginCall call) {
        String event = call.getString("event", "");
        String place = call.getString("place", "");
        long at = call.getLong("at", System.currentTimeMillis());
        if (!"check".equals(event) && !AutoLogic.HOME.equals(place) && !AutoLogic.OFFICE.equals(place)) {
            call.reject("place must be home or office");
            return;
        }
        AutoLogic.Result r;
        if ("exit".equals(event)) r = AutoStore.exited(getContext(), place, at);
        else if ("enter".equals(event)) r = AutoStore.entered(getContext(), place, at);
        else if ("check".equals(event)) r = AutoStore.check(getContext(), at);
        else {
            call.reject("event must be exit, enter or check");
            return;
        }
        JSObject result = new JSObject();
        result.put("action", r.action.name());
        result.put("reason", r.reason);
        if (r.action == AutoLogic.Action.KEEP) {
            result.put("startedAt", r.startedAt);
            result.put("endedAt", r.endedAt);
            result.put("direction", r.direction);
        }
        if (r.candidate != null) result.put("expiresAt", r.candidate.expiresAt);
        call.resolve(result);
    }
}
