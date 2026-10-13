package com.provibsol.myce.debug;

import android.annotation.SuppressLint;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.location.Location;
import android.os.SystemClock;
import android.util.Log;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationServices;

/**
 * Debug builds only: feeds a pretend position into Google's fused location, which is how Google suggests
 * testing geofences on an emulator (the emulator's own GPS fix doesn't reach the geofencer).
 * First: adb shell appops set com.provibsol.myce android:mock_location allow
 * Then:  adb shell am broadcast -n com.provibsol.myce/.debug.MockLocationReceiver --ef lat 12.97 --ef lng 77.64
 */
public class MockLocationReceiver extends BroadcastReceiver {

    @SuppressLint("MissingPermission")
    @Override
    public void onReceive(Context context, Intent intent) {
        Location location = new Location("fused");
        location.setLatitude(intent.getFloatExtra("lat", 0f));
        location.setLongitude(intent.getFloatExtra("lng", 0f));
        location.setAccuracy(intent.getFloatExtra("acc", 8f));
        location.setTime(System.currentTimeMillis());
        location.setElapsedRealtimeNanos(SystemClock.elapsedRealtimeNanos());
        FusedLocationProviderClient fused = LocationServices.getFusedLocationProviderClient(context.getApplicationContext());
        PendingResult result = goAsync();
        fused.setMockMode(true)
            .continueWithTask(t -> {
                if (!t.isSuccessful()) Log.i("MockLocation", "mock mode refused: " + t.getException());
                return fused.setMockLocation(location);
            })
            .addOnCompleteListener(t -> {
                Log.i("MockLocation", (t.isSuccessful() ? "set " : "failed " + t.getException() + " ") + location.getLatitude() + "," + location.getLongitude());
                result.finish();
            });
    }
}
