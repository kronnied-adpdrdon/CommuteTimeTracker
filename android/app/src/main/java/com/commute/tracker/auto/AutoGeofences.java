package com.commute.tracker.auto;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.content.ContextCompat;
import com.commute.tracker.support.DiagLog;
import com.commute.tracker.tracking.PlatformLocation;
import com.google.android.gms.location.Geofence;
import com.google.android.gms.location.GeofencingClient;
import com.google.android.gms.location.GeofencingRequest;
import com.google.android.gms.location.LocationServices;
import java.util.Arrays;

/**
 * Registers the Home and Office circles with Google's geofencing, which wakes `AutoReceiver` when the phone
 * crosses one, with the app closed and almost no battery. Android forgets geofences after a restart, an app
 * update, or when location is switched off, so `sync` is called again on each of those.
 */
public final class AutoGeofences {

    private AutoGeofences() {}

    static final String ACTION_GEOFENCE = "com.commute.tracker.action.GEOFENCE";

    public static boolean hasBackgroundLocation(Context context) {
        if (!granted(context, Manifest.permission.ACCESS_FINE_LOCATION)) return false;
        // Before Android 10 there is no separate background permission.
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.Q || granted(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION);
    }

    private static boolean granted(Context context, String permission) {
        return ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED;
    }

    /** Whether the circles can be watched on this phone at all (needs Google Play services). */
    public static boolean supported(Context context) {
        return PlatformLocation.fusedAvailable(context);
    }

    private static PendingIntent pendingIntent(Context context) {
        Intent intent = new Intent(context, AutoReceiver.class).setAction(ACTION_GEOFENCE);
        // Geofencing fills in the event, so this one must be mutable.
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? PendingIntent.FLAG_MUTABLE : 0);
        return PendingIntent.getBroadcast(context, 3001, intent, flags);
    }

    /** Registers the circles if automatic start and stop is on and allowed, otherwise removes them. */
    @SuppressLint("MissingPermission")
    public static void sync(Context context) {
        if (!supported(context)) {
            DiagLog.log("auto", "Geofencing unavailable (no Google Play services)");
            return;
        }
        GeofencingClient client = LocationServices.getGeofencingClient(context);
        AutoLogic.Config config = AutoStore.config(context);
        if (!config.ready() || !hasBackgroundLocation(context)) {
            client.removeGeofences(pendingIntent(context));
            if (!config.ready()) AutoStore.clearCandidate(context);
            DiagLog.log("auto", "Geofences off (" + (!config.ready() ? "not ready" : "no background location") + ")");
            return;
        }
        GeofencingRequest request = new GeofencingRequest.Builder()
            // No event for where the phone already is when the circles are set up.
            .setInitialTrigger(0)
            .addGeofences(Arrays.asList(circle(AutoLogic.HOME, config.home, config.homeRadius), circle(AutoLogic.OFFICE, config.office, config.officeRadius)))
            .build();
        try {
            client
                .addGeofences(request, pendingIntent(context))
                .addOnSuccessListener(v -> DiagLog.log("auto", "Geofences set: home " + config.homeRadius + " m, office " + config.officeRadius + " m"))
                .addOnFailureListener(e -> DiagLog.log("auto", "Geofences failed: " + e));
        } catch (SecurityException e) {
            DiagLog.log("auto", "Geofences refused: " + e);
        }
    }

    private static Geofence circle(String id, AutoLogic.Place place, int radius) {
        return new Geofence.Builder()
            .setRequestId(id)
            .setCircularRegion(place.lat, place.lng, radius)
            .setExpirationDuration(Geofence.NEVER_EXPIRE)
            .setTransitionTypes(Geofence.GEOFENCE_TRANSITION_ENTER | Geofence.GEOFENCE_TRANSITION_EXIT)
            .build();
    }
}
