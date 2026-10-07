package com.provibsol.myce.support;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Build;
import android.util.Base64;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.core.location.LocationManagerCompat;
import com.provibsol.myce.tracking.PlatformLocation;
import com.provibsol.myce.tracking.TrackingService;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.common.GoogleApiAvailability;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Date;
import java.util.Locale;
import org.json.JSONException;
import org.json.JSONObject;

/** "Report a bug" and "Send feedback": builds a diagnostics log and opens the user's email app with it attached. */
@CapacitorPlugin(name = "Support")
public class SupportPlugin extends Plugin {

    private static final int LOG_CHARS = 60_000;
    private static final int MAX_IMAGES = 3;
    private static final String REPORT_DIR = "reports";

    @Override
    public void load() {
        DiagLog.init(getContext());
    }

    /**
     * Whether this is a debug build. Release builds uploaded to Play are never debuggable, so the app uses this
     * to show developer tools (the Free / Pro switch) only in debug builds.
     */
    @PluginMethod
    public void buildInfo(PluginCall call) {
        JSObject result = new JSObject();
        result.put("debuggable", (getContext().getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0);
        call.resolve(result);
    }

    /** Adds a line from the web layer (e.g. an uncaught error) to the same log the native code writes. */
    @PluginMethod
    public void log(PluginCall call) {
        String message = call.getString("message", "");
        if (message.length() > 1000) message = message.substring(0, 1000);
        DiagLog.log("App", message);
        call.resolve();
    }

    /**
     * Opens the email app: { to, subject, body, attachLog, images: [{ name, data(base64) }] }.
     * The user reviews and presses Send themselves; nothing leaves the phone before that.
     */
    @PluginMethod
    public void composeEmail(PluginCall call) {
        Context context = getContext();
        try {
            File dir = new File(context.getCacheDir(), REPORT_DIR);
            deleteOldReports(dir);
            if (!dir.exists() && !dir.mkdirs()) throw new IOException("Could not create report folder");

            ArrayList<Uri> uris = new ArrayList<>();
            if (call.getBoolean("attachLog", false)) {
                File log = new File(dir, "myce-diagnostics.txt");
                write(log, buildReport().getBytes(StandardCharsets.UTF_8));
                uris.add(uriFor(log));
            }
            JSArray images = call.getArray("images", new JSArray());
            for (int i = 0; i < Math.min(images.length(), MAX_IMAGES); i++) {
                JSONObject image = images.getJSONObject(i);
                File file = new File(dir, "screenshot-" + (i + 1) + ".jpg");
                write(file, Base64.decode(image.getString("data"), Base64.DEFAULT));
                uris.add(uriFor(file));
            }

            Intent send = new Intent(Intent.ACTION_SEND_MULTIPLE);
            send.setType("message/rfc822");
            String to = call.getString("to", "");
            if (!to.isEmpty()) send.putExtra(Intent.EXTRA_EMAIL, new String[] { to });
            send.putExtra(Intent.EXTRA_SUBJECT, call.getString("subject", "MYCE"));
            send.putExtra(Intent.EXTRA_TEXT, call.getString("body", ""));
            send.putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris);
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            Intent chooser = Intent.createChooser(send, "Send with");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(chooser);
            DiagLog.log("Support", "Opened email composer with " + uris.size() + " attachment(s)");
            call.resolve();
        } catch (android.content.ActivityNotFoundException e) {
            call.reject("No email app found.", "NO_EMAIL_APP");
        } catch (IOException | JSONException | IllegalArgumentException e) {
            DiagLog.log("Support", "composeEmail failed: " + e);
            call.reject("Could not prepare the email: " + e.getMessage(), "FAILED");
        }
    }

    private Uri uriFor(File file) {
        return FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
    }

    private static void write(File file, byte[] bytes) throws IOException {
        try (FileOutputStream out = new FileOutputStream(file)) {
            out.write(bytes);
        }
    }

    private static void deleteOldReports(File dir) {
        File[] files = dir.listFiles();
        if (files != null) for (File f : files) if (!f.delete()) f.deleteOnExit();
    }

    private boolean granted(String permission) {
        return ContextCompat.checkSelfPermission(getContext(), permission) == PackageManager.PERMISSION_GRANTED;
    }

    private String buildReport() {
        Context context = getContext();
        StringBuilder r = new StringBuilder();
        r.append("MYCE diagnostics\n");
        r.append("Created: ").append(new Date()).append("\n\n");

        try {
            PackageInfo info = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
            r.append("App version: ").append(info.versionName).append(" (").append(info.versionCode).append(")\n");
        } catch (PackageManager.NameNotFoundException ignored) {
            // Own package is always present.
        }
        r.append("Device: ").append(Build.MANUFACTURER).append(' ').append(Build.MODEL).append('\n');
        r.append("Android: ").append(Build.VERSION.RELEASE).append(" (API ").append(Build.VERSION.SDK_INT).append(")\n");
        r.append("Locale: ").append(Locale.getDefault()).append('\n');

        try {
            PackageInfo gms = context.getPackageManager().getPackageInfo("com.google.android.gms", 0);
            r.append("Google Play services: ").append(gms.versionName).append('\n');
        } catch (PackageManager.NameNotFoundException e) {
            r.append("Google Play services: not installed\n");
        }
        int gmsStatus = GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(context);
        r.append("Play services status: ").append(GoogleApiAvailability.getInstance().getErrorString(gmsStatus)).append('\n');
        r.append("Fused location usable: ").append(PlatformLocation.fusedAvailable(context)).append('\n');

        if (Build.VERSION.SDK_INT >= 26) {
            android.content.pm.PackageInfo webview = android.webkit.WebView.getCurrentWebViewPackage();
            if (webview != null) r.append("WebView: ").append(webview.packageName).append(' ').append(webview.versionName).append('\n');
        }

        r.append("\nPermissions\n");
        r.append("  Precise location: ").append(granted(Manifest.permission.ACCESS_FINE_LOCATION)).append('\n');
        r.append("  Approximate location: ").append(granted(Manifest.permission.ACCESS_COARSE_LOCATION)).append('\n');
        if (Build.VERSION.SDK_INT >= 33) r.append("  Notifications: ").append(granted(Manifest.permission.POST_NOTIFICATIONS)).append('\n');

        LocationManager lm = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
        r.append("\nLocation services\n");
        if (lm != null) {
            r.append("  Location on: ").append(LocationManagerCompat.isLocationEnabled(lm)).append('\n');
            r.append("  GPS provider: ").append(safeProvider(lm, LocationManager.GPS_PROVIDER)).append('\n');
            r.append("  Network provider: ").append(safeProvider(lm, LocationManager.NETWORK_PROVIDER)).append('\n');
        }
        r.append("  Trip recording running: ").append(TrackingService.isRunning()).append('\n');

        r.append("\nRecent log (newest last)\n");
        r.append(DiagLog.tail(LOG_CHARS));
        return r.toString();
    }

    private static String safeProvider(LocationManager lm, String provider) {
        try {
            return lm.isProviderEnabled(provider) ? "enabled" : "disabled";
        } catch (RuntimeException e) {
            return "unknown";
        }
    }
}
