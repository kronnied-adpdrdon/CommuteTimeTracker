package com.commute.tracker;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Lets the web app ask the home-screen widget to redraw after trips or tracking change. */
@CapacitorPlugin(name = "CommuteWidget")
public class CommuteWidgetPlugin extends Plugin {

    @PluginMethod
    public void refresh(PluginCall call) {
        CommuteWidgetProvider.refreshAll(getContext());
        call.resolve();
    }
}
