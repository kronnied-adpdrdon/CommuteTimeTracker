package com.commute.tracker.tracking;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.provider.Settings;
import androidx.core.content.ContextCompat;
import com.commute.tracker.CommuteWidgetProvider;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import com.google.android.gms.tasks.CancellationTokenSource;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONException;

/** The app's bridge to the native trip recorder. */
@CapacitorPlugin(
    name = "CommuteTracker",
    permissions = {
        @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }),
        @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
    }
)
public class CommuteTrackerPlugin extends Plugin {

    private static final double PLACE_ACCURACY_METERS = 50;
    private static final double APPROXIMATE_ACCURACY_METERS = 500;

    private TrackingStore store;
    /** Stop calls waiting for the service to finish the trip. */
    private final List<PluginCall> pendingStops = new ArrayList<>();

    @Override
    public void load() {
        store = new TrackingStore(getContext());
        TrackingService.setListener(
            new TrackingService.Listener() {
                @Override
                public void onUpdate(TrackingStore.Session session) {
                    notifyListeners("update", snapshot());
                }

                @Override
                public void onEnded() {
                    for (PluginCall call : pendingStops) call.resolve();
                    pendingStops.clear();
                    notifyListeners("ended", new JSObject());
                }
            }
        );
    }

    @Override
    protected void handleOnDestroy() {
        TrackingService.setListener(null);
    }

    /** Phase plus the trip in progress, if any. Same shape the app's controller expects. */
    private JSObject snapshot() {
        JSObject result = new JSObject();
        TrackingStore.Session s = store.loadSession();
        if (s == null) {
            result.put("phase", "idle");
            return result;
        }
        result.put("phase", TrackingService.isRunning() ? "tracking" : "interrupted");
        JSObject session = new JSObject();
        session.put("id", s.id);
        session.put("startedAt", s.startedAt);
        if (s.lastReadingAt > 0) session.put("lastReadingAt", s.lastReadingAt);
        session.put("distanceMeters", Math.round(s.engine.totalMeters()));
        session.put("hasFix", s.engine.anchor != null);
        Fix last = s.engine.last != null ? s.engine.last : s.engine.candidate;
        if (last != null) {
            JSObject fix = new JSObject();
            fix.put("lat", last.lat);
            fix.put("lng", last.lng);
            if (last.accuracy != null) fix.put("accuracy", last.accuracy.doubleValue());
            fix.put("timestamp", last.time);
            session.put("lastFix", fix);
        }
        result.put("session", session);
        return result;
    }

    private boolean granted(String permission) {
        return ContextCompat.checkSelfPermission(getContext(), permission) == PackageManager.PERMISSION_GRANTED;
    }

    /** Rejects with the same codes the app already understands. Returns false if tracking can't start. */
    private boolean checkCanTrack(PluginCall call) {
        if (!granted(Manifest.permission.ACCESS_FINE_LOCATION)) {
            String message = granted(Manifest.permission.ACCESS_COARSE_LOCATION) ? "Location is set to Approximate." : "User denied location permission";
            call.reject(message, granted(Manifest.permission.ACCESS_COARSE_LOCATION) ? "APPROXIMATE" : "NOT_AUTHORIZED");
            return false;
        }
        if (!TrackingService.isLocationEnabled(getContext())) {
            call.reject("Location services disabled.", "LOCATION_OFF");
            return false;
        }
        return true;
    }

    @PluginMethod
    public void getState(PluginCall call) {
        call.resolve(snapshot());
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (!checkCanTrack(call)) return;
        if (store.loadSession() == null) store.saveSession(TrackingStore.Session.begin(System.currentTimeMillis()));
        ContextCompat.startForegroundService(getContext(), TrackingService.intent(getContext(), TrackingService.ACTION_START));
        call.resolve(snapshot());
    }

    @PluginMethod
    public void resume(PluginCall call) {
        if (!checkCanTrack(call)) return;
        ContextCompat.startForegroundService(getContext(), TrackingService.intent(getContext(), TrackingService.ACTION_RESUME));
        call.resolve(snapshot());
    }

    /** Stops a running trip; resolves once it has been finished and queued. */
    @PluginMethod
    public void stop(PluginCall call) {
        if (!TrackingService.isRunning()) {
            call.resolve();
            return;
        }
        call.setKeepAlive(true);
        pendingStops.add(call);
        ContextCompat.startForegroundService(getContext(), TrackingService.intent(getContext(), TrackingService.ACTION_STOP));
    }

    /** Interrupted trip: finish it at its last reading, not now. */
    @PluginMethod
    public void finishInterrupted(PluginCall call) {
        TrackingStore.Session s = store.loadSession();
        if (s != null && !TrackingService.isRunning()) {
            store.finish(s, s.lastReadingAt > 0 ? s.lastReadingAt : s.startedAt);
            CommuteWidgetProvider.refreshAll(getContext());
        }
        call.resolve();
    }

    @PluginMethod
    public void discard(PluginCall call) {
        if (!TrackingService.isRunning()) {
            store.clearSession();
            CommuteWidgetProvider.refreshAll(getContext());
        }
        call.resolve();
    }

    /** Finished trips the app hasn't filed yet (stopped from the app, the widget or the notification). */
    @PluginMethod
    public void drainFinished(PluginCall call) {
        JSONArray queue = store.drainFinished();
        JSObject result = new JSObject();
        try {
            result.put("trips", new JSArray(queue.toString()));
        } catch (JSONException e) {
            result.put("trips", new JSArray());
        }
        call.resolve(result);
    }

    /** One accurate reading, e.g. to save Home or Office. */
    @SuppressLint("MissingPermission")
    @PluginMethod
    public void currentFix(PluginCall call) {
        if (!checkCanTrack(call)) return;
        CancellationTokenSource cancel = new CancellationTokenSource();
        LocationServices.getFusedLocationProviderClient(getContext())
            .getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cancel.getToken())
            .addOnSuccessListener(location -> {
                if (location == null) {
                    call.reject("No accurate location in time.", "TIMEOUT");
                } else if (location.hasAccuracy() && location.getAccuracy() > APPROXIMATE_ACCURACY_METERS) {
                    call.reject("Location is set to Approximate.", "APPROXIMATE");
                } else if (location.hasAccuracy() && location.getAccuracy() > PLACE_ACCURACY_METERS) {
                    call.reject("No accurate location in time.", "TIMEOUT");
                } else {
                    JSObject fix = new JSObject();
                    fix.put("lat", location.getLatitude());
                    fix.put("lng", location.getLongitude());
                    if (location.hasAccuracy()) fix.put("accuracy", location.getAccuracy());
                    fix.put("timestamp", location.getTime());
                    call.resolve(fix);
                }
            })
            .addOnFailureListener(e -> call.reject(e.getMessage(), "UNKNOWN"));
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", context.getPackageName(), null));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);
        call.resolve();
    }

    /** Redraws the widget, e.g. after the user changed location permission. */
    @PluginMethod
    public void refreshWidget(PluginCall call) {
        CommuteWidgetProvider.refreshAll(getContext());
        call.resolve();
    }
}
