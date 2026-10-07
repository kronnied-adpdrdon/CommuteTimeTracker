package com.provibsol.myce;

import android.os.Bundle;
import com.provibsol.myce.auto.AutoTrackingPlugin;
import com.provibsol.myce.billing.ProBillingPlugin;
import com.provibsol.myce.places.GeocoderPlugin;
import com.provibsol.myce.reminders.RemindersPlugin;
import com.provibsol.myce.sharing.SharingPlugin;
import com.provibsol.myce.support.SupportPlugin;
import com.provibsol.myce.tracking.CommuteTrackerPlugin;
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
        registerPlugin(AutoTrackingPlugin.class);
        registerPlugin(SharingPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
