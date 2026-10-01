package com.commute.tracker;

import android.os.Bundle;
import com.commute.tracker.tracking.CommuteTrackerPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // App-specific plugins must be registered before the bridge starts.
        registerPlugin(CommuteTrackerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
