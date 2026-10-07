package com.provibsol.myce.tracking;

import android.annotation.SuppressLint;
import android.content.Context;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import com.provibsol.myce.support.DiagLog;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailability;

/**
 * Android's own location service (GPS and network), used when Google Play services is missing, too old,
 * or fails. Older and non-Google phones often need this path.
 */
public final class PlatformLocation {

    private PlatformLocation() {}

    /** True if Google's fused location can be used on this phone. */
    public static boolean fusedAvailable(Context context) {
        try {
            return GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(context) == ConnectionResult.SUCCESS;
        } catch (RuntimeException e) {
            DiagLog.log("Location", "Play services check failed: " + e);
            return false;
        }
    }

    public interface Callback {
        void onLocation(Location location);

        void onTimeout();
    }

    /** Keeps listening on every available provider until `stop()`. */
    public static final class Updates {
        private final LocationManager manager;
        private final LocationListener listener;

        Updates(LocationManager manager, LocationListener listener) {
            this.manager = manager;
            this.listener = listener;
        }

        @SuppressLint("MissingPermission")
        public void stop() {
            try {
                manager.removeUpdates(listener);
            } catch (RuntimeException ignored) {
                // Already removed or permission revoked.
            }
        }
    }

    public interface Sink {
        void onLocations(Location location);
    }

    /** Starts continuous updates from GPS (and the network as a backup). Returns null if no provider could start. */
    @SuppressLint("MissingPermission")
    public static Updates startUpdates(Context context, long intervalMs, Sink sink) {
        LocationManager manager = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
        if (manager == null) return null;
        LocationListener listener = new SimpleListener(sink::onLocations);
        boolean started = false;
        for (String provider : new String[] { LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER }) {
            try {
                if (manager.isProviderEnabled(provider)) {
                    manager.requestLocationUpdates(provider, intervalMs, 0f, listener, Looper.getMainLooper());
                    DiagLog.log("Location", "Platform updates started on " + provider);
                    started = true;
                }
            } catch (RuntimeException e) {
                DiagLog.log("Location", "Platform provider " + provider + " failed: " + e);
            }
        }
        return started ? new Updates(manager, listener) : null;
    }

    /** One reading: waits up to `timeoutMs` for an accurate one, otherwise reports the best it saw (or a timeout). */
    @SuppressLint("MissingPermission")
    public static void currentFix(Context context, long timeoutMs, double goodEnoughMeters, Callback callback) {
        LocationManager manager = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
        if (manager == null) {
            callback.onTimeout();
            return;
        }
        Handler handler = new Handler(Looper.getMainLooper());
        final Location[] best = { null };
        final boolean[] done = { false };
        final LocationListener[] holder = { null };

        Runnable finish = () -> {
            if (done[0]) return;
            done[0] = true;
            try {
                manager.removeUpdates(holder[0]);
            } catch (RuntimeException ignored) {
                // Nothing to remove.
            }
            if (best[0] != null) callback.onLocation(best[0]);
            else callback.onTimeout();
        };

        holder[0] = new SimpleListener(location -> {
            if (best[0] == null || (location.hasAccuracy() && (!best[0].hasAccuracy() || location.getAccuracy() < best[0].getAccuracy()))) {
                best[0] = location;
            }
            if (location.hasAccuracy() && location.getAccuracy() <= goodEnoughMeters) {
                handler.removeCallbacksAndMessages(null);
                finish.run();
            }
        });

        boolean started = false;
        for (String provider : new String[] { LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER }) {
            try {
                if (manager.isProviderEnabled(provider)) {
                    manager.requestLocationUpdates(provider, 0, 0f, holder[0], Looper.getMainLooper());
                    started = true;
                }
            } catch (RuntimeException e) {
                DiagLog.log("Location", "Platform provider " + provider + " failed: " + e);
            }
        }
        if (!started) {
            callback.onTimeout();
            return;
        }
        handler.postDelayed(finish, timeoutMs);
    }

    private static final class SimpleListener implements LocationListener {
        private final Sink sink;

        SimpleListener(Sink sink) {
            this.sink = sink;
        }

        @Override
        public void onLocationChanged(Location location) {
            sink.onLocations(location);
        }

        // Required on older Android versions, where these are abstract.
        @Override
        public void onStatusChanged(String provider, int status, Bundle extras) {}

        @Override
        public void onProviderEnabled(String provider) {}

        @Override
        public void onProviderDisabled(String provider) {}
    }
}
