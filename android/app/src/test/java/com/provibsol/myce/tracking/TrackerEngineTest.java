package com.provibsol.myce.tracking;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;
import java.util.List;
import org.junit.Test;

/** The same scenarios the TypeScript tracker was tested and stress-tested against. */
public class TrackerEngineTest {

    private static final double METERS_PER_DEGREE_LAT = 111195;

    /** A reading `north` metres north of a fixed point, `seconds` into the trip. */
    private static Fix at(double north, double seconds, Double accuracy, Double speed) {
        return new Fix(12.97 + north / METERS_PER_DEGREE_LAT, 77.59, accuracy, speed, 1_000_000L + (long) (seconds * 1000));
    }

    private static Fix at(double north, double seconds, double accuracy) {
        return at(north, seconds, accuracy, null);
    }

    private static List<Fix> drive(double from, double to, double startSeconds) {
        List<Fix> fixes = new ArrayList<>();
        double step = 50 * Math.signum(to - from);
        double t = startSeconds;
        for (double d = from; step > 0 ? d <= to : d >= to; d += step, t += 5) fixes.add(at(d, t, 8));
        return fixes;
    }

    private static double km(List<Fix> fixes) {
        TrackerEngine engine = new TrackerEngine();
        for (Fix f : fixes) engine.addFix(f);
        return engine.totalMeters() / 1000;
    }

    @SafeVarargs
    private static List<Fix> concat(List<Fix>... parts) {
        List<Fix> all = new ArrayList<>();
        for (List<Fix> p : parts) all.addAll(p);
        return all;
    }

    private static List<Fix> of(Fix... fixes) {
        List<Fix> list = new ArrayList<>();
        for (Fix f : fixes) list.add(f);
        return list;
    }

    @Test
    public void cleanDrive() {
        assertEquals(5.0, km(drive(0, 5000, 0)), 0.01);
    }

    @Test
    public void realUTurnIsNotAGlitch() {
        assertEquals(1.0, km(concat(drive(0, 500, 0), drive(450, 0, 55))), 0.06);
    }

    @Test
    public void slowWalkingAddsUp() {
        List<Fix> fixes = new ArrayList<>();
        for (int i = 0; i < 30; i++) fixes.add(at(i * 7, i * 5, 5));
        double meters = km(fixes) * 1000;
        assertTrue(meters > 150 && meters < 215);
    }

    @Test
    public void tunnelGapKeepsStraightLineDistance() {
        assertEquals(2.0, km(concat(drive(0, 1000, 0), drive(1600, 2000, 160))), 0.06);
    }

    @Test
    public void firstReadingIsNotTrustedAlone() {
        TrackerEngine engine = new TrackerEngine();
        engine.addFix(at(0, 0, 5));
        assertNull(engine.anchor);
        assertEquals(0, engine.totalMeters(), 0);
    }

    @Test
    public void glitchyFirstReadingDoesNotPoisonTheTrip() {
        assertEquals(5.0, km(concat(of(at(3000, 0, 40)), drive(0, 5000, 5))), 0.06);
    }

    @Test
    public void startIsTheFirstConfirmedReading() {
        TrackerEngine engine = new TrackerEngine();
        for (Fix f : drive(0, 500, 0)) engine.addFix(f);
        assertEquals(12.97, engine.start.lat, 1e-9);
    }

    @Test
    public void parkedPhoneWobbleGainsNothing() {
        double[] wobble = { 0, 2, -1, 3, -2, 1, 2 };
        List<Fix> fixes = new ArrayList<>();
        for (int i = 0; i < wobble.length; i++) fixes.add(at(wobble[i], i * 5, 15));
        assertEquals(0, km(fixes), 0);
    }

    @Test
    public void signalWaitDriftGainsNothing() {
        List<Fix> fixes = new ArrayList<>();
        for (int i = 0; i < 37; i++) fixes.add(at(i % 2 == 0 ? 0 : 15, i * 5, 10));
        assertEquals(0, km(fixes), 0);
    }

    @Test
    public void chipSpeedOfZeroIgnoresSmallDrift() {
        List<Fix> fixes = new ArrayList<>();
        for (int i = 0; i < 20; i++) fixes.add(at(i % 2 == 0 ? 0 : 30, i * 5, 5.0, 0.1));
        assertEquals(0, km(fixes), 0);
    }

    @Test
    public void wrongZeroSpeedWhileClearlyMovingDoesNotEraseTheTrip() {
        List<Fix> fixes = new ArrayList<>();
        for (int i = 0; i <= 20; i++) fixes.add(at(i * 50, i * 5, 5.0, 0.0));
        assertEquals(1.0, km(fixes), 0.06);
    }

    @Test
    public void poorAccuracyIsIgnored() {
        TrackerEngine engine = new TrackerEngine();
        for (Fix f : of(at(0, 0, 5), at(111, 10, 5), at(222, 20, 200), at(333, 30, 5))) engine.addFix(f);
        assertEquals(1, engine.rejectedFixes);
        assertEquals(333, engine.totalMeters(), 10);
    }

    @Test
    public void parkedThenOneGlitchTwoKmAwayAddsNothing() {
        List<Fix> fixes = new ArrayList<>();
        for (int i = 0; i <= 120; i++) fixes.add(at((i % 2) * 5, i * 5, 8));
        fixes.add(at(2000, 605, 30));
        for (int i = 0; i < 19; i++) fixes.add(at(0, 610 + i * 5, 8));
        assertTrue(km(fixes) < 0.02);
    }

    @Test
    public void impossibleJumpMidDriveIsIgnored() {
        assertEquals(1.0, km(concat(drive(0, 500, 0), of(at(5500, 55, 5)), drive(550, 1000, 60))), 0.06);
    }

    @Test
    public void glitchAfterLongGapWithSlowReturnIsASpike() {
        assertEquals(1.0, km(concat(drive(0, 1000, 0), of(at(3000, 220, 20), at(1000, 340, 8), at(1000, 345, 8)))), 0.06);
    }

    @Test
    public void glitchAfterGapWithQuickReturnReAnchorsForFree() {
        assertEquals(1.0, km(concat(drive(0, 1000, 0), of(at(3000, 220, 20), at(1000, 225, 8), at(1000, 230, 8)))), 0.06);
    }

    @Test
    public void outOfOrderReadingsAreIgnored() {
        TrackerEngine engine = new TrackerEngine();
        for (Fix f : of(at(0, 10, 5), at(50, 15, 5), at(200, 12, 5))) engine.addFix(f);
        assertEquals(50, engine.totalMeters(), 5);
    }

    @Test
    public void haversineMatchesAKnownDistance() {
        double km = Fix.distanceMeters(12.9716, 77.5946, 13.0827, 80.2707) / 1000;
        assertTrue(km > 285 && km < 295);
    }
}
