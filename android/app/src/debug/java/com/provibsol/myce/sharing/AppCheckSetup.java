package com.provibsol.myce.sharing;

import com.google.firebase.appcheck.FirebaseAppCheck;
import com.google.firebase.appcheck.debug.DebugAppCheckProviderFactory;

/**
 * Debug builds (emulator, Android Studio): App Check's debug provider. It prints a debug token to logcat
 * ("Enter this debug secret into the allow list"), which is added under App Check → Manage debug tokens.
 */
final class AppCheckSetup {
    private AppCheckSetup() {}

    static void install() {
        FirebaseAppCheck.getInstance().installAppCheckProviderFactory(DebugAppCheckProviderFactory.getInstance());
    }
}
