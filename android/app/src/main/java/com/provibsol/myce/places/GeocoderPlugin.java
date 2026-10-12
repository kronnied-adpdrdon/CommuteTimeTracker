package com.provibsol.myce.places;

import android.location.Address;
import android.location.Geocoder;
import com.provibsol.myce.support.DiagLog;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Turns a typed address into map points, and a point saved from GPS into its address. Tries Android's built-in
 * Geocoder first (Google's service on most phones); if that is missing or finds nothing, asks OpenStreetMap's free
 * Nominatim service. Only the typed text (on Search) or the saved Home or Office point (on "use my current location")
 * leaves the phone.
 */
@CapacitorPlugin(name = "Geocoder")
public class GeocoderPlugin extends Plugin {

    private static final int MAX_RESULTS = 5;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void search(PluginCall call) {
        String query = call.getString("query", "").trim();
        if (query.length() < 3) {
            call.reject("Type at least 3 characters.", "TOO_SHORT");
            return;
        }
        executor.execute(() -> {
            List<JSONObject> results = new ArrayList<>();
            String source = "android";
            boolean failedNetwork = false;

            try {
                results = androidGeocoder(query);
            } catch (IOException e) {
                DiagLog.log("Geocoder", "Android geocoder failed: " + e);
                failedNetwork = true;
            } catch (RuntimeException e) {
                DiagLog.log("Geocoder", "Android geocoder error: " + e);
            }

            if (results.isEmpty()) {
                try {
                    results = nominatim(query);
                    source = "openstreetmap";
                    failedNetwork = false;
                } catch (IOException | JSONException e) {
                    DiagLog.log("Geocoder", "Nominatim failed: " + e);
                    failedNetwork = true;
                }
            }

            if (results.isEmpty() && failedNetwork) {
                call.reject("Couldn't reach the address service. Check your connection.", "NO_NETWORK");
                return;
            }
            JSArray array = new JSArray();
            for (JSONObject r : results) array.put(r);
            JSObject out = new JSObject();
            out.put("results", array);
            out.put("source", source);
            DiagLog.log("Geocoder", "Search returned " + results.size() + " result(s) via " + source);
            call.resolve(out);
        });
    }

    /** The address at a point, for Home or Office saved from the current location. Resolves `label: null` if none is found. */
    @PluginMethod
    public void reverse(PluginCall call) {
        Double lat = call.getDouble("lat");
        Double lng = call.getDouble("lng");
        if (lat == null || lng == null) {
            call.reject("lat and lng are required.", "BAD_POINT");
            return;
        }
        executor.execute(() -> {
            String label = null;
            String source = "android";
            try {
                label = androidReverse(lat, lng);
            } catch (IOException | RuntimeException e) {
                DiagLog.log("Geocoder", "Android reverse lookup failed: " + e);
            }
            if (label == null) {
                source = "openstreetmap";
                try {
                    label = nominatimReverse(lat, lng);
                } catch (IOException | JSONException e) {
                    DiagLog.log("Geocoder", "Nominatim reverse lookup failed: " + e);
                }
            }
            DiagLog.log("Geocoder", label == null ? "Reverse lookup found nothing" : "Reverse lookup found an address via " + source);
            JSObject out = new JSObject();
            out.put("label", label);
            call.resolve(out);
        });
    }

    private String androidReverse(double lat, double lng) throws IOException {
        if (!Geocoder.isPresent()) return null;
        @SuppressWarnings("deprecation")
        List<Address> addresses = new Geocoder(getContext(), Locale.getDefault()).getFromLocation(lat, lng, 1);
        if (addresses == null || addresses.isEmpty()) return null;
        String label = addressLines(addresses.get(0));
        return label.isEmpty() ? null : label;
    }

    private String nominatimReverse(double lat, double lng) throws IOException, JSONException {
        JSONObject o = new JSONObject(nominatimGet("https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=" + lat + "&lon=" + lng));
        String label = o.optString("display_name", "");
        return label.isEmpty() ? null : label;
    }

    private static String addressLines(Address a) {
        StringBuilder label = new StringBuilder();
        for (int i = 0; i <= a.getMaxAddressLineIndex(); i++) {
            if (label.length() > 0) label.append(", ");
            label.append(a.getAddressLine(i));
        }
        return label.toString();
    }

    private List<JSONObject> androidGeocoder(String query) throws IOException {
        List<JSONObject> out = new ArrayList<>();
        if (!Geocoder.isPresent()) {
            DiagLog.log("Geocoder", "No built-in geocoder on this phone");
            return out;
        }
        @SuppressWarnings("deprecation")
        List<Address> addresses = new Geocoder(getContext(), Locale.getDefault()).getFromLocationName(query, MAX_RESULTS);
        if (addresses == null) return out;
        for (Address a : addresses) {
            if (!a.hasLatitude() || !a.hasLongitude()) continue;
            String label = addressLines(a);
            out.add(point(label.isEmpty() ? query : label, a.getLatitude(), a.getLongitude()));
        }
        return out;
    }

    private List<JSONObject> nominatim(String query) throws IOException, JSONException {
        JSONArray array = new JSONArray(nominatimGet("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=" + MAX_RESULTS + "&q=" + URLEncoder.encode(query, "UTF-8")));
        List<JSONObject> out = new ArrayList<>();
        for (int i = 0; i < array.length(); i++) {
            JSONObject o = array.getJSONObject(i);
            out.add(point(o.optString("display_name", query), o.getDouble("lat"), o.getDouble("lon")));
        }
        return out;
    }

    private static String nominatimGet(String address) throws IOException {
        HttpURLConnection connection = (HttpURLConnection) new URL(address).openConnection();
        connection.setConnectTimeout(10_000);
        connection.setReadTimeout(10_000);
        // Nominatim's usage policy asks for an identifying User-Agent.
        connection.setRequestProperty("User-Agent", "MYCE/1.0 (Android app)");
        connection.setRequestProperty("Accept-Language", Locale.getDefault().toLanguageTag());
        try {
            if (connection.getResponseCode() != 200) throw new IOException("HTTP " + connection.getResponseCode());
            StringBuilder body = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) body.append(line);
            }
            return body.toString();
        } finally {
            connection.disconnect();
        }
    }

    private static JSONObject point(String label, double lat, double lng) {
        try {
            return new JSONObject().put("label", label).put("lat", lat).put("lng", lng);
        } catch (JSONException e) {
            throw new IllegalStateException(e);
        }
    }

    @Override
    protected void handleOnDestroy() {
        executor.shutdownNow();
    }
}
