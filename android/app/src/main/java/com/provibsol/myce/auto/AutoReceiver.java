package com.provibsol.myce.auto;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.location.Location;
import com.provibsol.myce.support.DiagLog;
import com.google.android.gms.location.Geofence;
import com.google.android.gms.location.GeofenceStatusCodes;
import com.google.android.gms.location.GeofencingEvent;

/** Home / Office crossings, the expiry check, and setting the circles up again after a restart or an update. */
public class AutoReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        DiagLog.init(context);
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            AutoGeofences.sync(context);
            AutoActions.apply(context, AutoStore.check(context, System.currentTimeMillis()));
        } else if (AutoActions.ACTION_CHECK.equals(action)) {
            AutoActions.apply(context, AutoStore.check(context, System.currentTimeMillis()));
        } else if (AutoGeofences.ACTION_GEOFENCE.equals(action)) {
            onGeofence(context, intent);
        }
    }

    private static void onGeofence(Context context, Intent intent) {
        GeofencingEvent event = GeofencingEvent.fromIntent(intent);
        if (event == null) return;
        if (event.hasError()) {
            DiagLog.log("auto", "Geofence error: " + GeofenceStatusCodes.getStatusCodeString(event.getErrorCode()));
            // GEOFENCE_NOT_AVAILABLE: location was switched off and Android dropped the circles. Set them up again.
            if (event.getErrorCode() == GeofenceStatusCodes.GEOFENCE_NOT_AVAILABLE) AutoGeofences.sync(context);
            return;
        }
        int transition = event.getGeofenceTransition();
        if (transition != Geofence.GEOFENCE_TRANSITION_ENTER && transition != Geofence.GEOFENCE_TRANSITION_EXIT) return;
        // When the phone actually crossed, which can be a few minutes before the event arrives.
        Location where = event.getTriggeringLocation();
        long at = where != null && where.getTime() > 0 ? Math.min(where.getTime(), System.currentTimeMillis()) : System.currentTimeMillis();
        if (event.getTriggeringGeofences() == null) return;
        for (Geofence fence : event.getTriggeringGeofences()) {
            String place = fence.getRequestId();
            if (!AutoLogic.HOME.equals(place) && !AutoLogic.OFFICE.equals(place)) continue;
            Double lat = where != null ? where.getLatitude() : null;
            Double lng = where != null ? where.getLongitude() : null;
            AutoLogic.Result result = transition == Geofence.GEOFENCE_TRANSITION_EXIT
                ? AutoStore.exitReported(context, place, at, lat, lng)
                : AutoStore.enterReported(context, place, at, lat, lng);
            AutoActions.apply(context, result);
        }
    }
}
