package com.provibsol.myce.sharing;

import com.google.firebase.appcheck.FirebaseAppCheck;
import com.google.firebase.appcheck.playintegrity.PlayIntegrityAppCheckProviderFactory;

/** Release builds: App Check via Google Play Integrity, which only vouches for the app installed from Google Play. */
final class AppCheckSetup {
    private AppCheckSetup() {}

    static void install() {
        FirebaseAppCheck.getInstance().installAppCheckProviderFactory(PlayIntegrityAppCheckProviderFactory.getInstance());
    }
}
