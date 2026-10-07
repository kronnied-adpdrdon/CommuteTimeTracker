package com.provibsol.myce.tracking;

/** One GPS reading. Accuracy (metres) and speed (m/s) are null when the device doesn't report them. */
public final class Fix {

    public final double lat;
    public final double lng;
    public final Double accuracy;
    public final Double speed;
    /** Epoch milliseconds. */
    public final long time;

    public Fix(double lat, double lng, Double accuracy, Double speed, long time) {
        this.lat = lat;
        this.lng = lng;
        this.accuracy = accuracy;
        this.speed = speed;
        this.time = time;
    }

    private static final double EARTH_RADIUS_METERS = 6371008.8;

    /** Great-circle distance in metres (Haversine). */
    public static double distanceMeters(Fix a, Fix b) {
        return distanceMeters(a.lat, a.lng, b.lat, b.lng);
    }

    public static double distanceMeters(double lat1, double lng1, double lat2, double lng2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double h =
            Math.pow(Math.sin(dLat / 2), 2) +
            Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.pow(Math.sin(dLng / 2), 2);
        return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
    }
}
