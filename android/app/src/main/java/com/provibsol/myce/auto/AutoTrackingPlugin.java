package com.provibsol.myce.auto;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.IntentSender;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import com.provibsol.myce.MainActivity;
import android.os.PowerManager;
import android.provider.Settings;
import com.provibsol.myce.support.DiagLog;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.android.gms.common.api.ResolvableApiException;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.LocationSettingsRequest;
import com.google.android.gms.location.Priority;

/** The app's bridge to automatic start and stop. Settings are saved on the phone; nothing is sent anywhere. */
@CapacitorPlugin(
    name = "AutoTracking",
    permissions = {
        @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }),
        @Permission(alias = "background", strings = { Manifest.permission.ACCESS_BACKGROUND_LOCATION }),
    }
)
public class AutoTrackingPlugin extends Plugin {

    private static final int REQUEST_ACCURACY = 3101;

    /** Whether location and Location Accuracy were on when last checked, to notice them being turned back on. */
    private boolean accuracyWasOn;

    @Override
    public void load() {
        DiagLog.init(getContext());
        accuracyWasOn = AutoGeofences.accuracyOn(getContext());
        // Covers a permission granted or revoked in phone settings since the last launch.
        AutoGeofences.sync(getContext());
        AutoActions.apply(getContext(), AutoStore.check(getContext(), System.currentTimeMillis()));
    }

    /**
     * Back in the app, e.g. from phone settings or Google's dialog: if location came back on, set the circles up
     * again, and tell the screen (Google's dialog doesn't hide the app, so the page can't notice by itself).
     * Also ends any `returnWhenChanged` watch: the user is back.
     */
    @Override
    protected void handleOnResume() {
        // A resume right after starting is the screen settling (e.g. the location pop-up closing), not the user back.
        if (SystemClock.uptimeMillis() - watchStartedAt > 1500) stopWatching();
        boolean on = AutoGeofences.accuracyOn(getContext());
        if (on && !accuracyWasOn) {
            DiagLog.log("auto", "Location Accuracy is back on: setting the circles up again");
            AutoGeofences.sync(getContext());
        }
        if (on != accuracyWasOn) notifyListeners("statusChanged", permissions());
        accuracyWasOn = on;
    }

    /**
     * Asks to turn on location and Google Location Accuracy, with Google's one-tap dialog where available, or opens
     * the phone's location settings. Resolves at once; the app re-checks when the user comes back.
     */
    @PluginMethod
    public void fixAccuracy(PluginCall call) {
        LocationRequest request = new LocationRequest.Builder(Priority.PRIORITY_BALANCED_POWER_ACCURACY, 60_000).build();
        LocationSettingsRequest settings = new LocationSettingsRequest.Builder().addLocationRequest(request).setAlwaysShow(true).build();
        LocationServices.getSettingsClient(getActivity())
            .checkLocationSettings(settings)
            .addOnSuccessListener(r -> {
                // Google's check is satisfied, but the setting may still be off on some phones: show the page.
                if (!AutoGeofences.accuracyOn(getContext())) openLocationSettings();
                call.resolve(permissions());
            })
            .addOnFailureListener(e -> {
                boolean shown = false;
                if (e instanceof ResolvableApiException) {
                    try {
                        ((ResolvableApiException) e).startResolutionForResult(getActivity(), REQUEST_ACCURACY);
                        shown = true;
                    } catch (IntentSender.SendIntentException | RuntimeException ignored) {
                        // Fall back to the settings page.
                    }
                }
                if (!shown) openLocationSettings();
                call.resolve(permissions());
            });
    }

    private void openLocationSettings() {
        try {
            getActivity().startActivity(new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS));
        } catch (RuntimeException e) {
            DiagLog.log("auto", "Couldn't open location settings: " + e);
        }
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
            // Android 11+ sends the user to a settings page for "Allow all the time": bring them back once it's set.
            startWatching(false);
            requestPermissionForAlias("background", call, "afterBackground");
        }
    }

    @PermissionCallback
    private void afterBackground(PluginCall call) {
        AutoGeofences.sync(getContext());
        call.resolve(permissions());
    }

    /** Whether automatic start and stop can work: "Allow all the time", Google Play services, and Location Accuracy on. */
    @PluginMethod
    public void checkBackground(PluginCall call) {
        call.resolve(permissions());
    }

    private JSObject permissions() {
        JSObject result = new JSObject();
        result.put("background", AutoGeofences.hasBackgroundLocation(getContext()));
        result.put("supported", AutoGeofences.supported(getContext()));
        result.put("accuracy", AutoGeofences.accuracyOn(getContext()));
        return result;
    }

    private static final long WATCH_MS = 3 * 60_000;
    private final Handler watcher = new Handler(Looper.getMainLooper());
    private Runnable watching;
    private long watchStartedAt;

    /**
     * Call just before sending the user to a phone settings page ({ kind: "background" | "battery" }). While they
     * are there, checks once a second and brings MYCE back as soon as the change is made, so they don't have to find
     * their way back. Gives up after 3 minutes or when they come back by themselves. If Android doesn't allow an app
     * to come forward like this, nothing happens and Back works as usual.
     */
    @PluginMethod
    public void returnWhenChanged(PluginCall call) {
        startWatching("battery".equals(call.getString("kind")));
        call.resolve();
    }

    private void startWatching(boolean battery) {
        stopWatching();
        watchStartedAt = SystemClock.uptimeMillis();
        long until = watchStartedAt + WATCH_MS;
        watching = new Runnable() {
            @Override
            public void run() {
                if (battery ? ignoringBatteryOptimizations() : AutoGeofences.hasBackgroundLocation(getContext())) {
                    watching = null;
                    bringToFront();
                } else if (SystemClock.uptimeMillis() < until) {
                    watcher.postDelayed(this, 1000);
                } else {
                    watching = null;
                }
            }
        };
        watcher.postDelayed(watching, 1000);
    }

    private void stopWatching() {
        if (watching != null) watcher.removeCallbacks(watching);
        watching = null;
    }

    /** The main screen is singleTask, so this also closes the settings page above it in MYCE's task. */
    private void bringToFront() {
        try {
            Intent intent = new Intent(getContext(), MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            getContext().startActivity(intent);
            DiagLog.log("auto", "setting changed: brought MYCE back");
        } catch (RuntimeException e) {
            DiagLog.log("auto", "setting changed, but Android kept MYCE in the background");
        }
    }

    private boolean ignoringBatteryOptimizations() {
        PowerManager power = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        return power != null && power.isIgnoringBatteryOptimizations(getContext().getPackageName());
    }

    /**
     * For the first-time setup's battery step: who made the phone (some makers stop background apps), and
     * whether Android's battery setting for this app is "Unrestricted".
     */
    @PluginMethod
    public void checkBattery(PluginCall call) {
        JSObject result = new JSObject();
        result.put("manufacturer", Build.MANUFACTURER);
        result.put("unrestricted", ignoringBatteryOptimizations());
        call.resolve(result);
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
