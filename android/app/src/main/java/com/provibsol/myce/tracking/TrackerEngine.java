package com.provibsol.myce.tracking;

/**
 * Turns a stream of GPS readings into a trip distance, rejecting GPS noise:
 * inaccurate readings, a parked phone's wobble, impossible jumps, a glitchy first reading,
 * and out-and-back spikes. An impossible jump never adds distance.
 *
 * Ported from the app's original TypeScript tracker; the unit tests carry over its scenarios.
 * Not thread-safe: feed it from one thread.
 */
public final class TrackerEngine {

    // Fixes less accurate than this are ignored entirely.
    static final double MAX_ACCURACY_METERS = 50;
    // Movement smaller than this, or than ACCURACY_MULTIPLIER x the fix's accuracy, is treated as jitter.
    static final double MIN_MOVE_METERS = 10;
    static final double ACCURACY_MULTIPLIER = 2;
    // A move implying more than this speed (about 250 km/h) means one of the two readings is wrong.
    static final double MAX_SPEED_MPS = 70;
    // Below this chip-measured speed the phone counts as still, unless positions moved more than the drift limit
    // (the emulator, and some phones, report 0 while moving).
    static final double STATIONARY_SPEED_MPS = 0.5;
    static final double STATIONARY_MAX_DRIFT_METERS = 50;
    // During warm-up, two readings further apart in time than this don't confirm each other.
    static final double WARMUP_MAX_GAP_SECONDS = 30;
    // Out-and-back legs shorter than this are never a spike (protects real U-turns).
    static final double SPIKE_MIN_LEG_METERS = 100;
    // A return landing within this fraction of the shorter leg of where it started marks a spike.
    static final double SPIKE_RETURN_RATIO = 0.3;

    /** Distance that can no longer be undone. */
    public double committedMeters = 0;
    /** Latest trusted position; movement is measured from here so slow movement still adds up. */
    public Fix anchor;
    /** The leg ending at the anchor, kept separate so a spike can be undone. */
    public Fix pendingFrom;
    public double pendingMeters = 0;
    /** Most recent believable reading; speed checks are measured from here. */
    public Fix last;
    /** Warm-up: the first reading, waiting for a second one to agree. */
    public Fix candidate;
    /** A reading that was an impossible jump from `last`. */
    public Fix suspect;
    /** First trusted position of the trip. */
    public Fix start;
    public int acceptedFixes = 0;
    public int rejectedFixes = 0;

    public double totalMeters() {
        return committedMeters + (pendingFrom != null ? pendingMeters : 0);
    }

    private static double secondsBetween(Fix a, Fix b) {
        return (b.time - a.time) / 1000.0;
    }

    private static boolean isPlausible(Fix a, Fix b) {
        double seconds = secondsBetween(a, b);
        return seconds > 0 && Fix.distanceMeters(a, b) / seconds <= MAX_SPEED_MPS;
    }

    /** Feeds one reading. Returns true if it moved the trusted position. */
    public boolean addFix(Fix fix) {
        if (fix.accuracy != null && fix.accuracy > MAX_ACCURACY_METERS) {
            rejectedFixes++;
            return false;
        }

        // Warm-up: trust the first reading only once a second, believable one agrees with it.
        if (anchor == null) {
            if (candidate == null) {
                candidate = fix;
                return false;
            }
            if (fix.time <= candidate.time) {
                rejectedFixes++;
                return false;
            }
            if (secondsBetween(candidate, fix) > WARMUP_MAX_GAP_SECONDS || !isPlausible(candidate, fix)) {
                candidate = fix;
                rejectedFixes++;
                return false;
            }
            anchor = candidate;
            last = candidate;
            start = candidate;
            candidate = null;
            acceptedFixes++;
        }

        if (fix.time <= last.time) {
            rejectedFixes++;
            return false;
        }

        if (!isPlausible(last, fix)) {
            if (suspect != null && fix.time > suspect.time && isPlausible(suspect, fix)) {
                // Two readings agree with each other but not with `last`: `last` was wrong. Re-anchor for free.
                anchor = fix;
                pendingFrom = null;
                pendingMeters = 0;
                last = fix;
                suspect = null;
                acceptedFixes++;
                return true;
            }
            suspect = fix;
            rejectedFixes++;
            return false;
        }

        last = fix;
        suspect = null;

        double meters = Fix.distanceMeters(anchor, fix);
        if (fix.speed != null && fix.speed < STATIONARY_SPEED_MPS && meters < STATIONARY_MAX_DRIFT_METERS) {
            rejectedFixes++;
            return false;
        }

        double jitter = Math.max(MIN_MOVE_METERS, ACCURACY_MULTIPLIER * (fix.accuracy != null ? fix.accuracy : 0));
        if (meters < jitter) {
            rejectedFixes++;
            return false;
        }

        // Out-and-back spike: the anchor was far from both its predecessor and this reading,
        // and this reading is back near the predecessor. Drop the anchor; measure from before it.
        if (pendingFrom != null && pendingMeters >= SPIKE_MIN_LEG_METERS && meters >= SPIKE_MIN_LEG_METERS) {
            double direct = Fix.distanceMeters(pendingFrom, fix);
            if (direct < SPIKE_RETURN_RATIO * Math.min(pendingMeters, meters)) {
                anchor = pendingFrom;
                Fix from = pendingFrom;
                pendingFrom = null;
                pendingMeters = 0;
                if (direct < jitter) {
                    rejectedFixes++;
                    return false;
                }
                anchor = fix;
                pendingFrom = from;
                pendingMeters = direct;
                acceptedFixes++;
                return true;
            }
        }

        if (pendingFrom != null) committedMeters += pendingMeters;
        pendingFrom = anchor;
        pendingMeters = meters;
        anchor = fix;
        acceptedFixes++;
        return true;
    }
}
