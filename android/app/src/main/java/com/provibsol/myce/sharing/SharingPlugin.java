package com.provibsol.myce.sharing;

import android.os.Bundle;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.appcheck.FirebaseAppCheck;
import java.util.Iterator;

/**
 * The app's bridge to the two optional "Help improve MYCE" choices: app-usage statistics (Firebase Analytics)
 * and an App Check token, which proves shared commute stats come from the real app on a real phone.
 */
@CapacitorPlugin(name = "Sharing")
public class SharingPlugin extends Plugin {

    @Override
    public void load() {
        if (Usage.available(getContext())) AppCheckSetup.install();
    }

    @PluginMethod
    public void setUsageEnabled(PluginCall call) {
        Usage.setEnabled(getContext(), Boolean.TRUE.equals(call.getBoolean("enabled", false)));
        call.resolve();
    }

    /** Params are short labels and numbers only; booleans become 0 / 1. */
    @PluginMethod
    public void logEvent(PluginCall call) {
        String name = call.getString("name");
        if (name == null || name.isEmpty()) {
            call.reject("Missing event name");
            return;
        }
        Bundle bundle = new Bundle();
        JSObject params = call.getObject("params", new JSObject());
        for (Iterator<String> keys = params.keys(); keys.hasNext(); ) {
            String key = keys.next();
            Object value = params.opt(key);
            if (value instanceof Boolean) bundle.putLong(key, (Boolean) value ? 1 : 0);
            else if (value instanceof Integer || value instanceof Long) bundle.putLong(key, ((Number) value).longValue());
            else if (value instanceof Number) bundle.putDouble(key, ((Number) value).doubleValue());
            else if (value instanceof String) bundle.putString(key, (String) value);
        }
        Usage.log(getContext(), name, bundle);
        call.resolve();
    }

    @PluginMethod
    public void appCheckToken(PluginCall call) {
        if (!Usage.available(getContext())) {
            call.reject("Firebase isn't set up in this build");
            return;
        }
        FirebaseAppCheck.getInstance()
            .getAppCheckToken(false)
            .addOnSuccessListener((result) -> {
                JSObject out = new JSObject();
                out.put("token", result.getToken());
                call.resolve(out);
            })
            .addOnFailureListener((error) -> call.reject(error.getMessage() == null ? "App Check failed" : error.getMessage()));
    }
}
