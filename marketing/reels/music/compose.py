"""Original background track for the MYCE reels, synthesised from scratch (no samples, no licence needed).

120 BPM, 13 bars (26 s). Bars 1-2 intro, bar 3 build-up, bars 4-11 full groove, bars 12-13 outro.
Chords: Am - F - C - G. Usage: python compose.py out.wav
"""
import sys
import wave

import numpy as np

SR = 44100
BPM = 120
BEAT = 60 / BPM
BAR = 4 * BEAT
BARS = 13
N = int(SR * BAR * BARS)
rng = np.random.default_rng(7)

left = np.zeros(N)
right = np.zeros(N)
duck = np.ones(N)  # sidechain envelope, dips on each kick


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def place(buf, start_s, sig, gain=1.0):
    i = int(start_s * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    buf[i : i + len(sig)] += sig * gain


def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for k in range(len(x)):
        acc = (1 - a) * x[k] + a * acc
        y[k] = acc
    return y


def saw(freq, dur, detune=0.0):
    t = np.arange(int(dur * SR)) / SR
    f = freq * (1 + detune)
    return 2 * ((t * f) % 1.0) - 1


def env(dur, attack, release, sustain_level=1.0):
    n = int(dur * SR)
    e = np.full(n, sustain_level)
    a = max(1, int(attack * SR))
    r = max(1, int(release * SR))
    e[:a] = np.linspace(0, sustain_level, a)
    e[-r:] *= np.linspace(1, 0, r)
    return e


# --- chords (Am F C G), one per bar ---
CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
ROOTS = [45, 41, 48, 43]


def chord_for(bar):
    return CHORDS[bar % 4], ROOTS[bar % 4]


# --- pad: detuned saws, soft low-pass, whole bar ---
for bar in range(BARS):
    notes, _ = chord_for(bar)
    dur = BAR
    l = np.zeros(int(dur * SR))
    r = np.zeros(int(dur * SR))
    for n in notes + [notes[0] + 12]:
        l += saw(midi(n), dur, -0.004) + saw(midi(n), dur, 0.003)
        r += saw(midi(n), dur, 0.004) + saw(midi(n), dur, -0.002)
    cutoff = 900 if bar < 3 or bar >= 11 else 1600
    e = env(dur, 0.25, 0.3)
    gain = 0.05 if bar < 11 else 0.055
    place(left, bar * BAR, lowpass(l, cutoff) * e, gain)
    place(right, bar * BAR, lowpass(r, cutoff) * e, gain)

# --- pluck arpeggio: 16ths over the chord, bars 1-12 ---
for bar in range(12):
    notes, _ = chord_for(bar)
    pattern = [notes[0] + 12, notes[1] + 12, notes[2] + 12, notes[1] + 12, notes[0] + 24, notes[2] + 12, notes[1] + 12, notes[2] + 12]
    for step in range(16):
        if bar < 2 and step % 2:  # sparser intro
            continue
        n = pattern[step % 8]
        dur = 0.22
        t = np.arange(int(dur * SR)) / SR
        sig = (np.sign(np.sin(2 * np.pi * midi(n) * t)) * 0.5 + np.sin(2 * np.pi * midi(n) * t)) * np.exp(-t * 18)
        sig = lowpass(sig, 2600 if bar >= 3 else 1800)
        pan = 0.35 if step % 2 else -0.35
        start = bar * BAR + step * BEAT / 4
        place(left, start, sig, 0.09 * (1 - pan))
        place(right, start, sig, 0.09 * (1 + pan))

# --- drums, bars 4-11 (index 3..10), plus a final hit on bar 12 ---
def kick():
    dur = 0.35
    t = np.arange(int(dur * SR)) / SR
    f = 45 + 110 * np.exp(-t * 30)
    phase = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(phase) * np.exp(-t * 9)


def clap():
    dur = 0.18
    t = np.arange(int(dur * SR)) / SR
    noise = rng.uniform(-1, 1, len(t))
    burst = np.exp(-t * 30) + 0.6 * np.exp(-np.maximum(t - 0.012, 0) * 40) * (t > 0.012)
    hp = noise - lowpass(noise, 900)
    return hp * burst


def hat(open_=False):
    dur = 0.12 if open_ else 0.05
    t = np.arange(int(dur * SR)) / SR
    noise = rng.uniform(-1, 1, len(t))
    return (noise - lowpass(noise, 6000)) * np.exp(-t * (25 if open_ else 70))


K, C = kick(), clap()
for bar in range(3, 11):
    for beat in range(4):
        s = bar * BAR + beat * BEAT
        place(left, s, K, 0.45)
        place(right, s, K, 0.45)
        i = int(s * SR)
        d = int(0.25 * SR)
        duck[i : i + d] = np.minimum(duck[i : i + d], 1 - 0.6 * np.exp(-np.arange(min(d, N - i)) / (0.06 * SR)))
        if beat in (1, 3):
            place(left, s, C, 0.16)
            place(right, s, C, 0.16)
        place(left, s + BEAT / 2, hat(open_=beat == 3), 0.07)
        place(right, s + BEAT / 2, hat(open_=beat == 3), 0.09)
    for q in range(16):  # quiet 16th ticks
        place(right, bar * BAR + q * BEAT / 4, hat(), 0.025)

# final hit on the first beat of bar 12
place(left, 11 * BAR, K, 0.55)
place(right, 11 * BAR, K, 0.55)
place(left, 11 * BAR, C, 0.12)
place(right, 11 * BAR, C, 0.12)

# --- build-up in bar 3: snare roll + noise riser ---
for q in range(16):
    s = 2 * BAR + q * BEAT / 4
    g = 0.03 + 0.1 * q / 15
    place(left, s, C[: int(0.08 * SR)], g)
    place(right, s, C[: int(0.08 * SR)], g)
riser_n = int(BAR * SR)
noise = rng.uniform(-1, 1, riser_n)
riser = (noise - lowpass(noise, 1500)) * np.linspace(0, 1, riser_n) ** 2
place(left, 2 * BAR, riser, 0.2)
place(right, 2 * BAR, riser, 0.2)

# --- bass: eighth notes on the root, bars 4-11 ---
bass = np.zeros(N)
for bar in range(3, 11):
    _, root = chord_for(bar)
    for e8 in range(8):
        n = root - 12 if e8 % 2 == 0 else root
        dur = BEAT / 2 * 0.9
        t = np.arange(int(dur * SR)) / SR
        sig = np.sin(2 * np.pi * midi(n) * t) + 0.3 * lowpass(saw(midi(n), dur), 500)
        sig *= np.minimum(1, t / 0.005) * np.exp(-t * 3)
        place(bass, bar * BAR + e8 * BEAT / 2, sig, 0.28)

# sidechain: the bass dips on each kick so the two don't blur together
left += bass * duck
right += bass * duck

# fade out over the last bar
fade = int(BAR * SR * 0.9)
left[-fade:] *= np.linspace(1, 0, fade) ** 1.5
right[-fade:] *= np.linspace(1, 0, fade) ** 1.5

# master: gentle saturation, normalise to -1 dBFS
mix = np.stack([left, right], axis=1)
mix = np.tanh(mix * 1.4)
mix *= 10 ** (-1 / 20) / np.max(np.abs(mix))

out = sys.argv[1] if len(sys.argv) > 1 else "music.wav"
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print("wrote", out, round(N / SR, 2), "s")
