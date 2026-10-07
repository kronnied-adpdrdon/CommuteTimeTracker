package com.provibsol.myce.sharing;

import android.content.Context;
import android.os.Bundle;
import com.google.firebase.FirebaseApp;
import com.google.firebase.analytics.FirebaseAnalytics;
import com.provibsol.myce.support.DiagLog;
import java.util.EnumMap;
import java.util.Map;

/**
 * App-usage statistics (Firebase Analytics). Off until the user turns on "Share how you use the app"; the
 * manifest keeps it off on a fresh install and the choice is remembered by Firebase across launches.
 * Advertising ID and ad personalisation are never used. Events carry no trips, places or times.
 */
public final class Usage {

    private Usage() {}

    /** False in builds without google-services.json, where Firebase never starts. */
    public static boolean available(Context context) {
        return !FirebaseApp.getApps(context.getApplicationContext()).isEmpty();
    }

    public static void setEnabled(Context context, boolean enabled) {
        if (!available(context)) return;
        FirebaseAnalytics analytics = FirebaseAnalytics.getInstance(context.getApplicationContext());
        Map<FirebaseAnalytics.ConsentType, FirebaseAnalytics.ConsentStatus> consent = new EnumMap<>(FirebaseAnalytics.ConsentType.class);
        consent.put(FirebaseAnalytics.ConsentType.ANALYTICS_STORAGE, enabled ? FirebaseAnalytics.ConsentStatus.GRANTED : FirebaseAnalytics.ConsentStatus.DENIED);
        consent.put(FirebaseAnalytics.ConsentType.AD_STORAGE, FirebaseAnalytics.ConsentStatus.DENIED);
        consent.put(FirebaseAnalytics.ConsentType.AD_USER_DATA, FirebaseAnalytics.ConsentStatus.DENIED);
        consent.put(FirebaseAnalytics.ConsentType.AD_PERSONALIZATION, FirebaseAnalytics.ConsentStatus.DENIED);
        analytics.setConsent(consent);
        analytics.setAnalyticsCollectionEnabled(enabled);
        // Turning it off also forgets this phone's analytics ID, so turning it on again starts afresh.
        if (!enabled) analytics.resetAnalyticsData();
        DiagLog.log("Sharing", "App usage statistics " + (enabled ? "on" : "off"));
    }

    /** Dropped by Firebase while statistics are off. */
    public static void log(Context context, String name, Bundle params) {
        if (!available(context)) return;
        FirebaseAnalytics.getInstance(context.getApplicationContext()).logEvent(name, params);
    }
}
