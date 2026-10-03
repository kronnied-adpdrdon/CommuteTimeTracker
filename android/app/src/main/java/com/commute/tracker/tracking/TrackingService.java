package com.commute.tracker.tracking;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationManager;
import android.os.Build;
import android.os.IBinder;
import android.os.Looper;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import androidx.core.location.LocationManagerCompat;
import com.commute.tracker.CommuteWidgetProvider;
import com.commute.tracker.MainActivity;
import com.commute.tracker.R;
import com.commute.tracker.auto.AutoStore;
import com.commute.tracker.support.DiagLog;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import java.util.List;
import java.util.Locale;

/**
 * Records a commute as a location foreground service using Google's Fused Location. Started from the app,
 * the widget or the notification; keeps running with the app closed. Saves progress after every reading.
 */
public class TrackingService extends Service {

    public static final String ACTION_START = "com.commute.tracker.action.START";
    public static final String ACTION_RESUME = "com.commute.tracker.action.RESUME";
    public static final String ACTION_STOP = "com.commute.tracker.action.STOP";
    /** Automatic start: begin a trip backdated to EXTRA_TIME (when the phone left Home or Office). */
    public static final String ACTION_AUTO_START = "com.commute.tracker.action.AUTO_START";
    /** Automatic stop: save the automatic trip, ending at EXTRA_TIME, labelled EXTRA_DIRECTION. */
    public static final String ACTION_AUTO_KEEP = "com.commute.tracker.action.AUTO_KEEP";
    /** The automatic trip wasn't a commute (errand, expired): throw it away. */
    public static final String ACTION_AUTO_DROP = "com.commute.tracker.action.AUTO_DROP";
    /** "Not a commute" on the notification: throw the automatic trip away and stop waiting for an arrival. */
    public static final String ACTION_AUTO_CANCEL = "com.commute.tracker.action.AUTO_CANCEL";
    public static final String EXTRA_TIME = "time";
    public static final String EXTRA_DIRECTION = "direction";

    private static final String CHANNEL_ID = "commute_tracking";
    private static final int NOTIFICATION_ID = 1001;
    private static final long INTERVAL_MS = 5000;
    private static final long MIN_INTERVAL_MS = 2000;
    /** Widget and notification are redrawn at most this often (the timer itself ticks on its own). */
    private static final long REDRAW_MS = 5000;

    /** Receives live updates while the app is open. Called on the main thread. */
    public interface Listener {
        void onUpdate(TrackingStore.Session session);

        void onEnded();
    }

    private static volatile boolean running = false;
    private static Listener listener;

    public static boolean isRunning() {
        return running;
    }

    public static void setListener(Listener l) {
        listener = l;
    }

    /** True if this app may record precise location right now. */
    public static boolean hasPreciseLocation(Context context) {
        return ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    public static boolean isLocationEnabled(Context context) {
        LocationManager lm = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
        return lm != null && LocationManagerCompat.isLocationEnabled(lm);
    }

    public static Intent intent(Context context, String action) {
        return new Intent(context, TrackingService.class).setAction(action);
    }

    private TrackingStore store;
    private TrackingStore.Session session;
    private FusedLocationProviderClient fused;
    private long lastRedraw = 0;
    private long lastRedrawMeters = -1;

    /** Non-null while recording through Android's own location service instead of Google's. */
    private PlatformLocation.Updates platformUpdates;

    private final LocationCallback callback = new LocationCallback() {
        @Override
        public void onLocationResult(LocationResult result) {
            handleLocations(result.getLocations());
        }
    };

    private void handleLocations(List<Location> locations) {
        if (session == null) return;
        for (Location l : locations) {
            Fix fix = new Fix(
                l.getLatitude(),
                l.getLongitude(),
                l.hasAccuracy() ? (double) l.getAccuracy() : null,
                l.hasSpeed() ? (double) l.getSpeed() : null,
                l.getTime()
            );
            session.engine.addFix(fix);
            session.lastReadingAt = Math.max(session.lastReadingAt, fix.time);
            if (++readings == 1) {
                DiagLog.log("Tracking", "First reading: provider=" + l.getProvider() + " accuracy=" + (l.hasAccuracy() ? Math.round(l.getAccuracy()) + "m" : "n/a"));
            }
        }
        store.saveSession(session);
        Listener l = listener;
        if (l != null) l.onUpdate(session);
        maybeRedraw(false);
    }

    private int readings = 0;

    /** Starts Google's fused location, falling back to Android's own GPS if that is missing or fails. */
    @SuppressLint("MissingPermission")
    private void startLocationUpdates() {
        readings = 0;
        if (PlatformLocation.fusedAvailable(this)) {
            LocationRequest request = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, INTERVAL_MS)
                .setMinUpdateIntervalMillis(MIN_INTERVAL_MS)
                .build();
            try {
                fused.requestLocationUpdates(request, callback, Looper.getMainLooper()).addOnFailureListener(e -> {
                    DiagLog.log("Tracking", "Fused updates failed, switching to platform GPS: " + e);
                    if (running && platformUpdates == null) startPlatformUpdates();
                });
                DiagLog.log("Tracking", "Started with Google fused location");
                return;
            } catch (SecurityException | IllegalStateException e) {
                DiagLog.log("Tracking", "Fused request threw, switching to platform GPS: " + e);
            }
        } else {
            DiagLog.log("Tracking", "Google Play services unavailable, using platform GPS");
        }
        startPlatformUpdates();
    }

    private void startPlatformUpdates() {
        platformUpdates = PlatformLocation.startUpdates(this, INTERVAL_MS, location -> handleLocations(java.util.Collections.singletonList(location)));
        if (platformUpdates == null) {
            DiagLog.log("Tracking", "No location provider could start; stopping service");
            fail();
        }
    }

    /** Tells the app recording could not start, so it stops showing "tracking". */
    private void fail() {
        running = false;
        // Android kills the app if a service started with startForegroundService never calls startForeground.
        try {
            promote(session);
        } catch (RuntimeException e) {
            DiagLog.log("Tracking", "Could not enter foreground while failing: " + e);
        }
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
        CommuteWidgetProvider.refreshAll(this);
        Listener l = listener;
        if (l != null) l.onEnded();
    }

    private void stopLocationUpdates() {
        fused.removeLocationUpdates(callback);
        if (platformUpdates != null) {
            platformUpdates.stop();
            platformUpdates = null;
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        DiagLog.init(this);
        store = new TrackingStore(this);
        fused = LocationServices.getFusedLocationProviderClient(this);
        createChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;

        if (ACTION_STOP.equals(action)) {
            // Started with startForegroundService, so promote briefly before stopping, as Android requires.
            TrackingStore.Session s = session != null ? session : store.loadSession();
            promote(s);
            // Stopped by hand: an automatic trip is finished now, and no arrival is awaited any more.
            if (s != null && s.auto) AutoStore.clearCandidate(this);
            finishAndStop(System.currentTimeMillis(), null);
            return START_NOT_STICKY;
        }

        if (ACTION_AUTO_KEEP.equals(action) || ACTION_AUTO_DROP.equals(action) || ACTION_AUTO_CANCEL.equals(action)) {
            TrackingStore.Session s = session != null ? session : store.loadSession();
            tryPromote(s);
            if (s == null || !s.auto) {
                // A trip started by hand always wins over automatic stop.
                if (!running) stopSelf();
                return START_NOT_STICKY;
            }
            if (ACTION_AUTO_CANCEL.equals(action)) AutoStore.clearCandidate(this);
            if (ACTION_AUTO_KEEP.equals(action)) {
                finishAndStop(intent.getLongExtra(EXTRA_TIME, System.currentTimeMillis()), intent.getStringExtra(EXTRA_DIRECTION));
            } else {
                discardAndStop(action);
            }
            return START_NOT_STICKY;
        }

        if (!hasPreciseLocation(this)) {
            // Without precise location the service can't run; the app explains why when opened.
            DiagLog.log("Tracking", "Service started without precise location permission");
            fail();
            return START_NOT_STICKY;
        }

        if (session == null) session = store.loadSession();
        if (ACTION_AUTO_START.equals(action) && (session == null || session.auto)) {
            // A new automatic trip replaces any earlier automatic one (its arrival was missed).
            if (session != null) DiagLog.log("Tracking", "Replacing an unfinished automatic trip");
            session = TrackingStore.Session.beginAuto(intent.getLongExtra(EXTRA_TIME, System.currentTimeMillis()));
            store.saveSession(session);
            readings = 0;
        }
        if (session == null && ACTION_START.equals(action)) {
            session = TrackingStore.Session.begin(System.currentTimeMillis());
            store.saveSession(session);
        }
        if (session == null) {
            DiagLog.log("Tracking", "Service started with no trip to record");
            fail();
            return START_NOT_STICKY;
        }

        promote(session);
        if (!running) {
            running = true;
            startLocationUpdates();
            if (!running) return START_NOT_STICKY;
        }
        Listener l = listener;
        if (l != null) l.onUpdate(session);
        maybeRedraw(true);
        // Not sticky: Android may not restart a location service from the background. The app offers to resume.
        return START_NOT_STICKY;
    }

    private void finishAndStop(long endedAt, String direction) {
        DiagLog.log("Tracking", "Trip stopped after " + readings + " readings");
        stopLocationUpdates();
        TrackingStore.Session s = session != null ? session : store.loadSession();
        if (s != null) store.finish(s, endedAt, direction);
        endService();
    }

    /** Throws the trip in progress away (automatic trips only: an errand, or "Not a commute"). */
    private void discardAndStop(String why) {
        DiagLog.log("Tracking", "Automatic trip discarded (" + why + ") after " + readings + " readings");
        stopLocationUpdates();
        store.clearSession();
        endService();
    }

    private void endService() {
        session = null;
        running = false;
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
        CommuteWidgetProvider.refreshAll(this);
        Listener l = listener;
        if (l != null) l.onEnded();
    }

    /** Promote, tolerating Android refusing because the service was reached in the background and isn't running. */
    private void tryPromote(TrackingStore.Session s) {
        try {
            promote(s);
        } catch (RuntimeException e) {
            DiagLog.log("Tracking", "Could not enter foreground: " + e);
        }
    }

    @Override
    public void onDestroy() {
        stopLocationUpdates();
        running = false;
        CommuteWidgetProvider.refreshAll(this);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void maybeRedraw(boolean force) {
        if (session == null) return;
        long now = System.currentTimeMillis();
        long meters = Math.round(session.engine.totalMeters() / 100) * 100;
        if (!force && (now - lastRedraw < REDRAW_MS || meters == lastRedrawMeters)) return;
        lastRedraw = now;
        lastRedrawMeters = meters;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm != null) nm.notify(NOTIFICATION_ID, buildNotification(session));
        CommuteWidgetProvider.refreshAll(this);
    }

    private void promote(TrackingStore.Session s) {
        Notification notification = buildNotification(s);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private Notification buildNotification(TrackingStore.Session s) {
        PendingIntent open = PendingIntent.getActivity(
            this, 0, new Intent(this, MainActivity.class), PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );
        PendingIntent stop = PendingIntent.getService(
            this, 1, intent(this, ACTION_STOP), PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );
        String km = s != null ? String.format(Locale.US, "%.1f km", s.engine.totalMeters() / 1000) : "";
        boolean auto = s != null && s.auto;
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_tracking)
            .setColor(ContextCompat.getColor(this, R.color.widget_accent))
            .setContentTitle(auto ? "Trip started automatically" : "Tracking your commute")
            .setContentText(auto ? km + (km.isEmpty() ? "" : " · ") + "Saved when you arrive" : km)
            .setContentIntent(open)
            .addAction(0, "Stop", stop)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE);
        if (auto) {
            PendingIntent cancel = PendingIntent.getService(
                this, 2, intent(this, ACTION_AUTO_CANCEL), PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
            );
            builder.addAction(0, "Not a commute", cancel);
        }
        if (s != null) builder.setWhen(s.startedAt).setUsesChronometer(true).setShowWhen(true);
        return builder.build();
    }

    private void createChannel() {
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, getString(R.string.tracking_channel_name), NotificationManager.IMPORTANCE_LOW);
        channel.setShowBadge(false);
        nm.createNotificationChannel(channel);
    }
}
