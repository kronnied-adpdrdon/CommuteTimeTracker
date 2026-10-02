package com.commute.tracker;

import android.os.Bundle;
import com.commute.tracker.billing.ProBillingPlugin;
import com.commute.tracker.places.GeocoderPlugin;
import com.commute.tracker.reminders.RemindersPlugin;
import com.commute.tracker.support.SupportPlugin;
import com.commute.tracker.tracking.CommuteTrackerPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // App-specific plugins must be registered before the bridge starts.
        registerPlugin(CommuteTrackerPlugin.class);
        registerPlugin(ProBillingPlugin.class);
        registerPlugin(GeocoderPlugin.class);
        registerPlugin(SupportPlugin.class);
        registerPlugin(RemindersPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
