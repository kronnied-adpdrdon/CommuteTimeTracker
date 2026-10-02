package com.commute.tracker.support;

import android.content.Context;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * A small rolling log on the phone, so "Report a bug" can attach what happened. Never records coordinates,
 * addresses or trip details: only events, providers, accuracy and error messages.
 */
public final class DiagLog {

    private static final String FILE = "diag.log";
    private static final long MAX_BYTES = 200 * 1024;

    private static File file;

    private DiagLog() {}

    public static synchronized void init(Context context) {
        if (file == null) file = new File(context.getApplicationContext().getFilesDir(), FILE);
    }

    public static synchronized void log(String tag, String message) {
        if (file == null) return;
        String line = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS", Locale.US).format(new Date()) + " " + tag + ": " + message + "\n";
        try {
            if (file.length() > MAX_BYTES) trim();
            try (FileOutputStream out = new FileOutputStream(file, true)) {
                out.write(line.getBytes(StandardCharsets.UTF_8));
            }
        } catch (IOException ignored) {
            // Logging must never break the app.
        }
    }

    /** The last `maxChars` characters of the log. */
    public static synchronized String tail(int maxChars) {
        if (file == null || !file.exists()) return "(log is empty)";
        try {
            String all = new String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8);
            return all.length() <= maxChars ? all : all.substring(all.length() - maxChars);
        } catch (IOException | RuntimeException e) {
            return "(log unreadable: " + e.getMessage() + ")";
        }
    }

    private static void trim() throws IOException {
        String all = new String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8);
        String kept = all.substring(all.length() / 2);
        int newline = kept.indexOf('\n');
        Files.write(file.toPath(), (newline >= 0 ? kept.substring(newline + 1) : kept).getBytes(StandardCharsets.UTF_8));
    }
}
