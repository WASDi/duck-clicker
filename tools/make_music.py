"""Render the Duck Clicker music (see docs/Audio.md).

Writes public/assets/audio/music/{pond,sky,space}{,_frenzy}.ogg, outro.ogg and loops.json.
Everything is synthesized here with numpy; ffmpeg encodes the WAV renders to Ogg Vorbis.

    python3 tools/make_music.py
"""

import json
import subprocess
import tempfile
import wave
from pathlib import Path

import numpy as np

SR = 44100
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "assets" / "audio" / "music"
SFX = ROOT / "public" / "assets" / "audio" / "sfx"

# ---------------------------------------------------------------------------
# Music theory helpers

MAJOR = [0, 2, 4, 5, 7, 9, 11]
MINOR = [0, 2, 3, 5, 7, 8, 10]
NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
QUAL = {
    "": [0, 4, 7], "m": [0, 3, 7], "7": [0, 4, 7, 10], "m7": [0, 3, 7, 10],
    "maj7": [0, 4, 7, 11], "add9": [0, 4, 7, 14], "sus4": [0, 5, 7],
}


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def deg(tok, root, scale):
    """Scale degree token ("4", "6#", "-2") to MIDI note."""
    shift = 0
    if tok[-1] in "#b":
        shift = 1 if tok[-1] == "#" else -1
        tok = tok[:-1]
    o, i = divmod(int(tok), 7)
    return root + 12 * o + scale[i] + shift


def seq(text, root, scale, start=0.0):
    """'4/.5 2/.5 r/1 | ...' -> [(beat, beats, midi)]. Bar lines are ignored."""
    notes, t = [], start
    for tok in text.replace("|", " ").split():
        d, dur = tok.split("/")
        if d != "r":
            notes.append((t, float(dur), deg(d, root, scale)))
        t += float(dur)
    return notes


def bars(text, start=0.0, beats_per_bar=4):
    """'C Am Dm,G C' -> [(beat, beats, chord)]. A comma splits a bar evenly."""
    out, t = [], start
    for bar in text.split():
        parts = bar.split(",")
        for p in parts:
            out.append((t, beats_per_bar / len(parts), p))
            t += beats_per_bar / len(parts)
    return out


def parse_chord(sym):
    r, i = NOTE[sym[0]], 1
    if len(sym) > 1 and sym[1] in "#b":
        r += 1 if sym[1] == "#" else -1
        i = 2
    return r % 12, QUAL[sym[i:]]


def chord_notes(sym, lo, hi):
    r, ivs = parse_chord(sym)
    pcs = {(r + iv) % 12 for iv in ivs}
    return [m for m in range(lo, hi) if m % 12 in pcs]


def root_in(sym, lo):
    r, _ = parse_chord(sym)
    return lo + (r - lo) % 12


def is_minor(sym):
    return parse_chord(sym)[1][1] == 3


# ---------------------------------------------------------------------------
# DSP helpers


def tt(n):
    return np.arange(n) / SR


def decay(n, t60):
    return np.exp(-6.9078 * np.arange(n) / (t60 * SR))


def edges(x, a=0.002, r=0.01):
    x = x.copy()
    na, nr = int(a * SR), min(int(r * SR), len(x))
    if na:
        x[:na] *= np.linspace(0, 1, na)
    if nr:
        x[-nr:] *= np.linspace(1, 0, nr)
    return x


def box(x, w):
    return np.convolve(x, np.ones(w) / w, mode="same")


def ar_env(n, attack, hold, release):
    """Linear attack, hold until `hold` seconds, linear release."""
    t = tt(n)
    env = np.clip(t / max(attack, 1e-4), 0, 1)
    return env * np.clip(1 - (t - hold) / release, 0, 1)


TABLE = 4096


def table(weights):
    ph = np.arange(TABLE) / TABLE
    w = sum(a * np.sin(2 * np.pi * k * ph) for k, a in enumerate(weights, 1))
    return w / np.max(np.abs(w))


def saw_table(f, bright, kmax=24):
    k = np.arange(1, max(2, min(kmax, int(8000 / f))) + 1)
    return table((1 / k) * np.exp(-(k - 1) / bright))


def osc(tab, freq, n, phase=0.0):
    """Wavetable oscillator; freq is a number or a per-sample array."""
    if np.isscalar(freq):
        ph = phase + freq * np.arange(n) / SR
    else:
        ph = phase + np.cumsum(freq) / SR
    idx = (ph % 1.0) * TABLE
    i0 = idx.astype(np.int64) % TABLE
    fr = idx - np.floor(idx)
    return tab[i0] * (1 - fr) + tab[(i0 + 1) % TABLE] * fr


def partials(f, n, spec):
    """Sum of sine partials: [(ratio, amp, t60)]."""
    t = tt(n)
    return sum(a * np.sin(2 * np.pi * f * r * t) * decay(n, t60) for r, a, t60 in spec)


# ---------------------------------------------------------------------------
# Instruments. Each returns a mono (or 2xN stereo) array peaking near 1.

RNG = np.random.default_rng(7)
_cache = {}


def cached(key, fn):
    if key not in _cache:
        _cache[key] = fn()
    return _cache[key]


def pluck(m, dur, t60=1.4, smooth=2, var=0):
    """Karplus-Strong string, retuned exactly by resampling."""

    def make():
        f = mtof(m)
        p = max(2, int(SR / f - 0.5))
        g = SR / (p + 0.5)
        n = int(dur * SR * f / g) + 2
        damp = 0.001 ** (1 / (t60 * g))
        rng = np.random.default_rng(1000 * m + var)
        y = np.zeros(n + p + 2)
        noise = box(rng.uniform(-1, 1, p), smooth) if smooth > 1 else rng.uniform(-1, 1, p)
        y[1:p + 1] = noise - noise.mean()
        k = p + 1
        while k < len(y):
            e = min(k + p, len(y))
            y[k:e] = damp * 0.5 * (y[k - p:e - p] + y[k - p - 1:e - p - 1])
            k = e
        y = y[1:]
        out = np.interp(np.arange(int(dur * SR)) * f / g, np.arange(len(y)), y)
        return edges(out / (np.max(np.abs(out)) + 1e-9), 0.001, 0.03)

    return cached(("pluck", m, round(dur, 3), t60, smooth, var), make)


def marimba(m, length=1.2):
    def make():
        n = int(length * SR)
        f = mtof(m)
        y = partials(f, n, [(1, 1, 0.7), (3.93, 0.35, 0.12), (9.2, 0.12, 0.04)])
        click = box(np.random.default_rng(m).standard_normal(n), 3) * decay(n, 0.006) * 0.15
        return edges((y + click) / 1.2, 0.001, 0.05)

    return cached(("marimba", m, length), make)


def glock(m, length=2.0):
    def make():
        n = int(length * SR)
        y = partials(mtof(m), n, [(1, 1, 1.8), (2.76, 0.4, 0.6), (5.40, 0.2, 0.25), (8.93, 0.1, 0.12)])
        return edges(y / 1.3, 0.001, 0.1)

    return cached(("glock", m, length), make)


def music_box(m):
    def make():
        n = int(1.6 * SR)
        y = partials(mtof(m), n, [(1, 1, 1.4), (3.0, 0.3, 0.35), (6.2, 0.15, 0.12)])
        return edges(y / 1.3, 0.0005, 0.1)

    return cached(("mbox", m), make)


def chime(m, t60=0.4):
    """Light sine pluck for fast arpeggios."""

    def make():
        n = int(t60 * 1.2 * SR)
        y = partials(mtof(m), n, [(1, 1, t60), (2, 0.25, t60 / 2), (3, 0.1, t60 / 4)])
        return edges(y / 1.2, 0.001, 0.03)

    return cached(("chime", m, t60), make)


def fm_bell(m, t60=1.2, ratio=2.0, index=2.0):
    def make():
        n = int(t60 * 1.1 * SR)
        t = tt(n)
        f = mtof(m)
        mod = index * np.exp(-t / 0.15) * np.sin(2 * np.pi * f * ratio * t)
        y = np.sin(2 * np.pi * f * t + mod) * decay(n, t60)
        return edges(y, 0.001, 0.05)

    return cached(("fm", m, t60, ratio, index), make)


def flute(m, dur):
    n = int((dur + 0.12) * SR)
    t = tt(n)
    f = mtof(m)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.25) / 0.3, 0, 1)
    tab = cached("flute_tab", lambda: table([1, 0.25, 0.08, 0.03]))
    y = osc(tab, f * vib, n)
    breath = box(RNG.standard_normal(n), 8) * 0.06
    env = ar_env(n, 0.06, dur, 0.12)
    return (y + breath) * env * (1 + 0.5 * np.exp(-t / 0.05))[:n] / 1.4


def bass(m, dur, t60=1.2):
    n = int((dur + 0.05) * SR)
    y = partials(mtof(m), n, [(1, 1, t60), (2, 0.4, t60 / 2), (3, 0.15, t60 / 4)])
    return edges(y * ar_env(n, 0.004, dur, 0.05) / 1.3, 0.003, 0.02)


def sub(m, dur):
    n = int((dur + 0.3) * SR)
    y = partials(mtof(m), n, [(1, 1, 50), (2, 0.3, 50), (3, 0.08, 50)])
    return y * ar_env(n, 0.06, dur, 0.3) / 1.3


def pad(notes, dur, attack=0.5, release=0.8, bright=2.5, shimmer=0.0):
    """Detuned saw pad, stereo. Voices at -7, 0, +7 cents, spread left to right."""

    def make():
        n = int((dur + release) * SR)
        env = ar_env(n, attack, dur, release)
        out = np.zeros((2, n))
        for m in notes:
            f = mtof(m)
            tab = cached(("saw", m, bright), lambda: saw_table(f, bright))
            for cents, pan in ((-7, -0.7), (0, 0.0), (7, 0.7)):
                y = osc(tab, f * 2 ** (cents / 1200), n, phase=RNG.random())
                out += np.outer(panlaw(pan), y)
            if shimmer:
                out += np.outer(panlaw(0), shimmer * np.sin(2 * np.pi * 2 * f * tt(n)))
        if shimmer:
            out *= 1 + 0.12 * np.sin(2 * np.pi * 5 * tt(n))
        return out * env / (3 * len(notes)) * 1.6

    return cached(("pad", tuple(notes), round(dur, 3), attack, release, bright, shimmer), make)


def brass(m, dur):
    """Synth brass: two detuned saws whose brightness swells on the attack."""
    n = int((dur + 0.15) * SR)
    t = tt(n)
    f = mtof(m)
    dark = cached(("saw", m, 1.2), lambda: saw_table(f, 1.2))
    lit = cached(("saw", m, 5.0), lambda: saw_table(f, 5.0))
    b = np.clip(t / 0.05, 0, 1) * (0.55 + 0.45 * np.exp(-t / 0.25))
    vib = 1 + 0.003 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.3) / 0.3, 0, 1)
    y = np.zeros(n)
    for cents in (-6, 6):
        fr = f * 2 ** (cents / 1200) * vib
        y += osc(dark, fr, n) * (1 - b) + osc(lit, fr, n) * b
    return y * ar_env(n, 0.025, dur, 0.15) / 2


def plink(m):
    """Water drop: a short sine that slides up."""
    n = int(0.25 * SR)
    t = tt(n)
    fr = mtof(m) * (1 + 0.8 * np.clip(t / 0.05, 0, 1))
    y = np.sin(2 * np.pi * np.cumsum(fr) / SR) * decay(n, 0.12)
    return edges(y, 0.001, 0.02)


def kick(t60=0.35, punch=1.0):
    n = int(t60 * SR)
    t = tt(n)
    fr = 45 + 75 * punch * np.exp(-t / 0.03)
    y = np.sin(2 * np.pi * np.cumsum(fr) / SR) * decay(n, t60)
    return edges(y, 0.0005, 0.02)


def snare(t60=0.18, tone=0.5):
    n = int(t60 * SR)
    noise = np.diff(RNG.standard_normal(n + 1)) / 2
    y = noise * decay(n, t60) + tone * np.sin(2 * np.pi * 190 * tt(n)) * decay(n, 0.07)
    return edges(y / 1.2, 0.0005, 0.01)


def hat(t60=0.05):
    n = int(max(t60, 0.03) * SR)
    noise = np.diff(RNG.standard_normal(n + 2), 2) / 4
    return edges(noise * decay(n, t60), 0.0005, 0.005)


def shaker():
    n = int(0.12 * SR)
    noise = np.diff(RNG.standard_normal(n + 1)) / 2
    env = np.clip(tt(n) / 0.015, 0, 1) * decay(n, 0.08)
    return edges(noise * env, 0.0005, 0.01)


def crash(t60=2.0):
    n = int(t60 * SR)
    noise = np.diff(RNG.standard_normal(n + 1)) / 2
    return edges(noise * decay(n, t60) * 0.8, 0.0005, 0.05)


def load_wav(path):
    with wave.open(str(path)) as w:
        sr = w.getframerate()
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768
        if w.getnchannels() == 2:
            x = x.reshape(-1, 2).mean(axis=1)
    return x, sr


def quack(i, pitch=1.0):
    x, sr = cached(("quackwav", i), lambda: load_wav(SFX / f"quack_{i}.wav"))
    n = int(len(x) * SR / sr / pitch)
    return np.interp(np.arange(n) * sr * pitch / SR, np.arange(len(x)), x)


# ---------------------------------------------------------------------------
# Mixer


def panlaw(pan):
    a = (pan + 1) * np.pi / 4
    return np.array([np.cos(a), np.sin(a)]) * np.sqrt(2)


def make_ir(seconds=2.4, t60=1.8, seed=3):
    rng = np.random.default_rng(seed)
    n = int(seconds * SR)
    pre = int(0.015 * SR)
    ir = np.zeros((2, n))
    for ch in range(2):
        x = box(rng.standard_normal(n), 5) * decay(n, t60)
        x[:pre] = 0
        ir[ch] = x / np.sqrt(np.sum(x ** 2))
    return ir


IR = make_ir()


class Mix:
    def __init__(self, seconds, loop):
        self.len = int(round(seconds * SR))
        self.loop = loop
        self.n = self.len + 10 * SR
        self.dry = np.zeros((2, self.n))
        self.wet = np.zeros((2, self.n))

    def add(self, sig, t, pan=0.0, gain=1.0, rev=0.2):
        i = int(round(t * SR))
        if self.loop:
            i %= self.len
        if i < 0 or i >= self.n:
            return
        st = sig if sig.ndim == 2 else np.outer(panlaw(pan), sig)
        st = st[:, : self.n - i] * gain
        self.dry[:, i:i + st.shape[1]] += st
        self.wet[:, i:i + st.shape[1]] += st * rev

    def render(self):
        L = self.len
        if self.loop:
            # Wrap everything that rings past the loop end back onto the start, then
            # use circular convolution so the reverb tail wraps around too.
            dry = self.dry[:, :L] + np.pad(self.dry[:, L:], ((0, 0), (0, max(0, 2 * L - self.n))))[:, :L]
            wet = self.wet[:, :L] + np.pad(self.wet[:, L:], ((0, 0), (0, max(0, 2 * L - self.n))))[:, :L]
            rev = np.array([np.fft.irfft(np.fft.rfft(wet[c]) * np.fft.rfft(IR[c], L), L) for c in range(2)])
            return dry + rev
        size = self.n + IR.shape[1]
        rev = np.array([np.fft.irfft(np.fft.rfft(self.wet[c], size) * np.fft.rfft(IR[c], size), size)
                        for c in range(2)])
        return self.dry[:, :L] + rev[:, :L]


# ---------------------------------------------------------------------------
# Shared parts

MOTIF = "4/.5 2/.5 4/.5 7/1.5"  # sol-mi-sol-do: three short quacks and a long one


def strum(mix, b, chords, lo=60, hi=77, gain=0.13, pan=-0.3,
          pattern=((0, "D", 1.0), (1, "D", 0.7), (1.5, "U", 0.5), (2.5, "U", 0.6), (3, "D", 0.8), (3.5, "U", 0.5))):
    """Ukulele 'island strum' over a chord list; b converts beats to seconds."""
    hits = []
    for t0, d, sym in chords:
        for off, way, vel in pattern:
            if off < d:
                hits.append((t0 + off, way, vel, sym))
    for k, (t, way, vel, sym) in enumerate(hits):
        nxt = hits[(k + 1) % len(hits)][0] if k + 1 < len(hits) else t + 1
        dur = b(nxt - t) + 0.08 if nxt > t else b(1)
        notes = chord_notes(sym, lo, hi)[:4]
        if way == "U":
            notes = notes[::-1][:3]
        for j, m in enumerate(notes):
            mix.add(pluck(m, dur, var=k % 3), b(t) + j * 0.012, pan + 0.1 * j, gain * vel, 0.18)


def walking_bass(mix, b, chords, lo=40, gain=0.42):
    for k, (t0, d, sym) in enumerate(chords):
        r = root_in(sym, lo)
        nxt = root_in(chords[(k + 1) % len(chords)][2], lo)
        third = r + (3 if is_minor(sym) else 4)
        line = [r, third, r + 7, nxt - 1 if nxt - 1 not in (r + 7, r) else nxt + 1] if d >= 4 else [r, r + 7][: int(d)]
        for j, m in enumerate(line):
            mix.add(bass(m, b(0.85)), b(t0 + j), 0.0, gain * (1.0 if j == 0 else 0.8), 0.05)


def arpeggio(mix, b, chords, inst, lo, hi, step, order, gain, pan=0.0, rev=0.25, echo=0.0, every=None):
    """Repeat `order` (indices into the chord's notes) in steps of `step` beats."""
    for t0, d, sym in chords:
        notes = chord_notes(sym, lo, hi)
        span = d if every is None else every[1]
        start = t0 + (0 if every is None else every[0])
        for j in range(int(round(span / step))):
            m = notes[order[j % len(order)] % len(notes)]
            p = pan if not echo else (-0.5 if j % 2 else 0.5)
            t = b(start + j * step)
            mix.add(inst(m), t, p, gain, rev)
            if echo:
                mix.add(inst(m), t + b(0.75), -p, gain * echo, rev)
                mix.add(inst(m), t + b(1.5), p, gain * echo * echo, rev)


def drums(mix, b, beats, kicks=(), snares=(), hats=(), shakers=(), kg=0.5, sg=0.18, hg=0.06, shg=0.09):
    for bar in range(int(beats // 4)):
        o = bar * 4
        for t in kicks:
            mix.add(kick(), b(o + t), 0, kg, 0.03)
        for t in snares:
            mix.add(snare(), b(o + t), 0.1, sg, 0.15)
        for j, t in enumerate(hats):
            mix.add(hat(), b(o + t), 0.35, hg * (1.0 if j % 2 else 0.6), 0.05)
        for j, t in enumerate(shakers):
            mix.add(shaker(), b(o + t), 0.4, shg * (1.0 if j % 2 else 0.55), 0.08)


def beat_fn(bpm):
    return lambda beats: beats * 60.0 / bpm


# ---------------------------------------------------------------------------
# Tracks


def pond():
    bpm, b = 100, beat_fn(100)
    beats = 128
    C, S = 72, MAJOR
    A_ch = "C Am F G C Am Dm,G C"
    ch = bars(A_ch + " " + A_ch + " F G Em Am F G Dm,G7 G7 " + "C Am F G C Am Dm,G C,G7")
    A = ("4/.5 2/.5 4/.5 7/1.5 r/1 | 5/1.5 4/.5 2/2 | 5/.5 3/.5 5/.5 7/1.5 r/1 | 8/1 6/.5 4/.5 1/2 |"
         "4/.5 2/.5 4/.5 7/1.5 r/1 | 9/1.5 7/.5 5/2 | 5/1 3/1 4/1 6/1 |")
    mel = (A + "7/3 r/1 |"
           "4/.5 2/.5 4/.5 7/1.5 9/.5 8/.5 | 7/1 5/1 4/2 | 5/.5 3/.5 5/.5 7/1.5 8/.5 9/.5 | 10/1 8/1 6/2 |"
           "4/.5 2/.5 4/.5 7/1.5 r/1 | 9/1 10/.5 9/.5 7/2 | 8/.5 7/.5 5/1 6/1 8/1 | 7/4 |"
           "5/2 3/1 5/1 | 6/2 4/1 6/1 | 6/1.5 4/.5 2/2 | 7/1 5/1 2/2 | 3/1 5/1 7/1 5/1 | 6/1 8/1 6/1 4/1 |"
           "5/1 3/1 1/1 3/1 | 4/2 6/1 8/1 |" + A + "7/2 r/2")

    base = Mix(b(beats), loop=True)
    for t, d, m in seq(mel, C, S):
        base.add(marimba(m), b(t), 0.15, 0.36, 0.22)
        if d >= 1.5:  # marimba roll on long notes
            for r in np.arange(0.25, d - 0.2, 0.25):
                base.add(marimba(m), b(t + r), 0.15, 0.16, 0.22)
    strum(base, b, ch)
    walking_bass(base, b, ch)
    drums(base, b, beats, shakers=np.arange(0, 4, 0.5))
    rng = np.random.default_rng(11)
    pent = [84, 86, 88, 91, 93, 96]
    for bar in range(32):
        if rng.random() < 0.4:
            base.add(plink(rng.choice(pent)), b(bar * 4 + 0.5 * rng.integers(0, 8)), rng.uniform(-0.8, 0.8),
                     0.12, 0.4)

    fr = Mix(b(beats), loop=True)
    drums(fr, b, beats, kicks=(0, 1.5, 2), snares=(1, 3), hats=np.arange(0, 4, 0.25), kg=0.5, sg=0.18, hg=0.07)
    arpeggio(fr, b, ch, lambda m: marimba(m, 0.5), 76, 98, 0.25, [0, 1, 2, 3, 4, 3, 2, 1], 0.17, pan=-0.2)
    return "pond", base, fr


def sky():
    b = beat_fn(120)
    beats = 128
    G, S = 67, MAJOR
    A_ch = "G D Em C G D C,D G"
    ch = bars(A_ch + " " + A_ch + " C D Bm Em C D Am,D D7 " + A_ch)
    A = ("4/.5 2/.5 4/.5 7/1.5 8/.5 9/.5 | 8/1.5 6/.5 4/2 | 5/.5 7/.5 9/.5 12/1.5 r/1 | 10/1 9/.5 7/.5 5/2 |"
         "4/.5 2/.5 4/.5 7/1.5 r/1 | 8/.5 9/.5 8/.5 6/.5 4/2 |")
    A1 = A + "5/1 3/1 6/1 8/1 | 7/3 r/1 |"
    A2 = A + "10/.5 9/.5 7/1 8/.5 6/.5 4/1 | 7/2 11/2 |"
    B = ("3/1 5/1 7/1 10/1 | 8/2 6/1 4/1 | 6/1.5 4/.5 2/2 | 5/1 7/1 9/2 | 10/1.5 9/.5 7/1 5/1 |"
         "8/1 6/1 8/1 11/1 | 10/1 8/1 6/1 8/1 | 6/2 4/1 r/1 |")
    A3 = A + "5/1 3/1 6/1 8/1 | 7/2 r/2"

    base = Mix(b(beats), loop=True)
    for t, d, m in seq(A1, G, S):
        base.add(flute(m, b(d) * 0.95), b(t), 0.1, 0.34, 0.3)
    for t, d, m in seq(A2, G, S, 32):
        base.add(glock(m + 12), b(t), 0.25, 0.3, 0.3)
    for t, d, m in seq(B, G, S, 64):
        base.add(flute(m, b(d) * 0.95), b(t), 0.1, 0.34, 0.3)
    for t, d, m in seq(A3, G, S, 96):
        base.add(flute(m, b(d) * 0.95), b(t), -0.1, 0.28, 0.3)
        base.add(glock(m + 12), b(t), 0.3, 0.22, 0.3)
    for t, d, sym in ch:
        base.add(pad(chord_notes(sym, 55, 72)[:4], b(d), 0.4, 0.6, 2.0, 0.25), b(t), gain=0.3, rev=0.35)
        r = root_in(sym, 43)
        for off, dd, m in ((0, 1.5, r), (1.5, 0.5, r), (2, 1.5, r + 7)):
            if off < d:
                base.add(sub(m, b(min(dd, d - off)) * 0.9), b(t + off), 0, 0.4, 0.03)
    arpeggio(base, b, ch, chime, 67, 96, 0.25, list(range(8)), 0.11, pan=0.4, every=(2, 2))
    drums(base, b, beats, snares=(1, 3), hats=(0.5, 1.5, 2.5, 3.5), sg=0.1, hg=0.04)

    fr = Mix(b(beats), loop=True)
    drums(fr, b, beats, kicks=(0, 1, 2, 3), snares=(1, 3), hats=np.arange(0, 4, 0.25), kg=1.0, sg=0.25, hg=0.14)
    arpeggio(fr, b, ch, lambda m: chime(m, 0.25), 79, 100, 0.25, [0, 1, 2, 3, 4, 5, 4, 3, 2, 1], 0.3, pan=-0.4)
    return "sky", base, fr


def space():
    b = beat_fn(90)
    beats = 128
    D = 62
    ch = bars("Dm Bb Gm A Dm Bb Gm,A A Dm Bb Gm A Dm Bb Gm,A A7 "
              "D Bm G A D Bm G,A A D Bm G A D Bm G,A A7")
    lead = (seq("4/.5 2/.5 4/.5 7/2.5 | 9/2 7/1 5/1 | 3/1 5/1 7/2 | 8/2 6#/1 4/1 |"
                "4/.5 2/.5 4/.5 7/1.5 9/1 | 9/1 7/1 5/2 | 3/1 5/1 4/2 | 6#/2 8/2 |"
                "11/2 9/1 7/1 | 12/2 9/2 | 10/1 9/1 7/2 | 8/2 6#/2 |"
                "4/.5 2/.5 4/.5 7/2.5 | 9/1.5 7/.5 5/2 | 5/1 3/1 6#/1 8/1 | 11/2 10/2", D, MINOR)
            + seq("4/.5 2/.5 4/.5 7/2.5 | 9/2 7/1 5/1 | 3/1 5/1 7/2 | 8/2 6/1 4/1 |"
                  "4/.5 2/.5 4/.5 7/1.5 9/1 | 11/1 9/1 7/2 | 10/1 12/1 11/2 | 8/2 6/2 |"
                  "11/2 9/1 7/1 | 12/2 9/2 | 10/1 9/1 7/2 | 8/2 6/2 |"
                  "4/.5 2/.5 4/.5 7/2.5 | 9/1.5 7/.5 5/2 | 5/1 3/1 6/1 8/1 | 4/4", D, MAJOR, 64))

    base = Mix(b(beats), loop=True)
    base.add(theremin([(b(t), b(d), m) for t, d, m in lead], b(beats)), 0, 0.0, 0.3, 0.4)
    for t, d, sym in ch:
        base.add(pad(chord_notes(sym, 50, 67)[:4], b(d), 1.2, 1.5, 1.6), b(t), gain=0.42, rev=0.4)
        base.add(sub(root_in(sym, 31), b(d) * 0.95), b(t), 0, 0.55, 0.0)
    arpeggio(base, b, ch, lambda m: fm_bell(m, 0.9), 69, 91, 0.5, [0, 1, 2, 3, 4, 3, 2, 1], 0.1, rev=0.4, echo=0.4)
    drums(base, b, beats, kicks=(0, 2), kg=0.4)

    fr = Mix(b(beats), loop=True)
    drums(fr, b, beats, kicks=(0, 1, 2, 3), snares=(1, 3), hats=np.arange(0, 4, 0.25), kg=0.9, sg=0.4, hg=0.15)
    arpeggio(fr, b, ch, lambda m: fm_bell(m, 0.35, index=1.2), 81, 100, 0.25, [0, 2, 1, 3, 2, 4, 3, 1], 0.35,
             pan=0.3, rev=0.3)
    return "space", base, fr


def theremin(notes, total):
    """One continuous voice that glides between notes, with vibrato. Wraps for loops."""
    n = int(total * SR)
    t = tt(n)
    logf = np.full(n, np.log(mtof(notes[0][2])))
    amp = np.zeros(n)
    glide = 0.12
    for k, (t0, d, m) in enumerate(notes):
        prev = notes[k - 1][2]
        i0, i1 = int(t0 * SR), min(int((t0 + d) * SR), n)
        seg = t[i0:i1] - t0
        frac = np.clip(seg / glide, 0, 1)
        logf[i0:i1] = np.log(mtof(prev)) * (1 - frac) + np.log(mtof(m)) * frac
        amp[i0:i1] = 1.0
    w = int(0.08 * SR)
    amp = box(np.concatenate([amp[-w:], amp, amp[:w]]), w)[w:-w]
    vib = 1 + 0.006 * np.sin(2 * np.pi * round(5.5 * total) / total * t)
    ph = np.cumsum(np.exp(logf) * vib) / SR
    ph -= (ph[-1] - round(ph[-1])) * np.arange(1, n + 1) / n  # whole number of cycles per loop
    tab = cached("ther_tab", lambda: table([1, 0.12, 0.04]))
    idx = (ph % 1.0) * TABLE
    i0 = idx.astype(np.int64) % TABLE
    fr = idx - np.floor(idx)
    return (tab[i0] * (1 - fr) + tab[(i0 + 1) % TABLE] * fr) * amp


def outro():
    b = beat_fn(90)
    C, S = 60, MAJOR
    mix = Mix(68.0, loop=False)
    rng = np.random.default_rng(5)

    # 1. Ignition (0-6 s): rumble, rising sweep, swelling quack chorus, beam-fire hit at 6 s.
    n = 6 * SR
    t = tt(n)
    rumble = box(box(rng.standard_normal(n), 150), 150)
    rumble = rumble / np.max(np.abs(rumble)) + 0.5 * np.sin(2 * np.pi * 41 * t)
    swell = (t / 6) ** 1.5
    mix.add(edges(rumble * swell, 0.01, 0.05), 0, 0, 0.5, 0.2)
    sweep = osc(saw_table(200, 3.0), 50 * 12 ** (t / 6), n)
    mix.add(edges(sweep * swell ** 1.5, 0.01, 0.03), 0, 0, 0.18, 0.3)
    for u in np.sort(rng.random(48)):
        tq = 5.7 * np.sqrt(u)
        mix.add(quack(rng.integers(1, 4), rng.uniform(0.75, 1.35)), tq, rng.uniform(-0.9, 0.9),
                0.15 + 0.35 * tq / 6, 0.3)
    mix.add(kick(1.0, 1.5), 6.0, 0, 0.9, 0.2)
    mix.add(crash(2.5), 6.0, 0, 0.35, 0.3)
    mix.add(sub(36, 1.5), 6.0, 0, 0.6, 0.1)
    for m in (48, 55, 60, 64, 67, 72):
        mix.add(brass(m, b(1.5)), 6.0, (m - 60) / 20, 0.18, 0.3)

    # 2. The flight (6-20 s, beats 9-30): march with the motif on synth brass.
    march = [(9, 4, "C"), (13, 4, "F"), (17, 4, "G"), (21, 4, "C"), (25, 2, "F"), (27, 2, "G"), (29, 1, "C")]
    tune = seq(MOTIF + " r/1 | 5/.5 3/.5 5/.5 7/1.5 r/1 | 6/.5 4/.5 6/.5 8/1.5 9/.5 10/.5 |"
               " 11/2 9/1 7/1 | 10/1 9/1 8/1 6/1 | 7/1", C, S, 9)
    for tb, d, m in tune:
        mix.add(brass(m, b(d) * 0.9), b(tb), 0.1, 0.3, 0.25)
        mix.add(glock(m + 12, 1.0), b(tb), 0.4, 0.12, 0.25)
    for tb, d, sym in march:
        r = root_in(sym, 36)
        for j in range(int(d)):
            mix.add(brass(r if j % 2 == 0 else r - 5, b(0.6)), b(tb + j), 0, 0.28, 0.1)
            if j % 2 == 1:
                for m in chord_notes(sym, 55, 68)[:3]:
                    mix.add(brass(m, b(0.4)), b(tb + j), -0.3, 0.08, 0.2)
    for bar in range(5):
        o = 9 + 4 * bar
        for s in (0, 0.5, 0.75, 1, 2, 2.5, 2.75, 3, 3.5):
            mix.add(snare(0.12, 0.3), b(o + s), 0.15, 0.2 if s in (0, 2) else 0.12, 0.15)
        for k in (0, 2):
            mix.add(kick(0.4), b(o + k), 0, 0.5, 0.1)
    mix.add(crash(1.5), b(21), 0, 0.2, 0.3)
    for k in range(8):  # roll into the landing chord
        mix.add(snare(0.1, 0.2), b(29 + k / 8), 0.15, 0.06 + 0.02 * k, 0.15)
    mix.add(crash(2.5), b(30) - 0.02, 0, 0.15, 0.4)

    # 3. Landfall (20-32 s, beats 30-48): music box and soft pad, in 3/4.
    land = bars("C Am F G C C", 30, 3)
    for tb, d, m in seq(MOTIF + " | 9/1 7/1 5/1 | 5/.5 3/.5 5/.5 7/1.5 | 8/1 6/1 4/1 | 2/1 4/1 7/1 | 7/3",
                        C + 12, S, 30):
        mix.add(music_box(m), b(tb), 0.2, 0.42, 0.35)
    for tb, d, sym in land:
        mix.add(pad(chord_notes(sym, 53, 70)[:4], b(d), 0.6, 1.0, 1.4), b(tb), gain=0.3, rev=0.45)

    # 4. The colony (32-46 s, beats 48-69): Pond ukulele, Sky arpeggios, Space pad together.
    col = [(48, 4, "C"), (52, 4, "Am"), (56, 4, "F"), (60, 4, "G"), (64, 5, "C")]
    strum(mix, b, col, gain=0.17)
    arpeggio(mix, b, col, chime, 67, 96, 0.25, list(range(8)), 0.15, pan=0.4, every=(2, 2))
    for tb, d, sym in col:
        mix.add(pad(chord_notes(sym, 50, 67)[:4], b(d), 0.8, 1.0, 1.6), b(tb), gain=0.4, rev=0.4)
        mix.add(bass(root_in(sym, 40), b(1.8)), b(tb), 0, 0.55, 0.05)
        mix.add(bass(root_in(sym, 40) + 7, b(1.8)), b(tb + 2), 0, 0.45, 0.05)
    colony_tune = ("4/.5 2/.5 4/.5 7/1.5 r/1 | 5/1.5 4/.5 2/2 | 5/.5 3/.5 5/.5 7/1.5 r/1 | 8/1 6/.5 4/.5 1/2 |"
                   + MOTIF + " 7/2")
    for tb, d, m in seq(colony_tune, C + 12, S, 48):
        mix.add(marimba(m), b(tb), 0.15, 0.45, 0.25)
        mix.add(glock(m + 12, 1.0), b(tb), -0.3, 0.15, 0.3)
    for bar in range(5):
        for s in np.arange(0, 4, 0.5):
            mix.add(shaker(), b(48 + 4 * bar + s), 0.4, 0.1, 0.08)
        mix.add(kick(0.3), b(48 + 4 * bar), 0, 0.5, 0.05)
        mix.add(kick(0.3), b(48 + 4 * bar + 2), 0, 0.45, 0.05)

    # 5. Pull-back (46-58 s, beats 69-87): only the Pond theme, slow and gentle.
    back = [(69, 4, "C"), (73, 4, "Am"), (77, 4, "F"), (81, 4, "G"), (85, 2, "C")]
    for tb, d, m in seq("4/.5 2/.5 4/.5 7/1.5 r/1 | 5/1.5 4/.5 2/2 | 5/.5 3/.5 5/.5 7/1.5 r/1 |"
                        "8/1 6/.5 4/.5 1/2 | 2/1 0/1", C + 12, S, 69):
        mix.add(marimba(m), b(tb), 0.1, 0.5, 0.35)
    for tb, d, sym in back:
        notes = chord_notes(sym, 55, 72)[:4]
        for j in range(int(d * 2)):
            m = notes[[0, 1, 2, 3, 2, 1][j % 6] % len(notes)]
            mix.add(pluck(m, b(1.2), t60=1.6), b(tb + j / 2), -0.3, 0.17, 0.3)
        mix.add(bass(root_in(sym, 40), b(d) * 0.9, 2.0), b(tb), 0, 0.5, 0.1)

    # 6. Final message (58-68 s): the final chord holds and fades; one soft quack at the end.
    final = [48, 55, 60, 64, 67, 74]
    mix.add(pad(final, 8.0, 0.8, 0.5, 1.8), 58.0, gain=0.35, rev=0.5)
    for k, m in enumerate((72, 76, 79, 84)):
        mix.add(glock(m, 3.0), 58.0 + 0.12 * k, -0.4 + 0.25 * k, 0.12, 0.5)
    mix.add(sub(36, 7.0), 58.0, 0, 0.35, 0.0)
    out = mix.render()
    fade = np.ones(out.shape[1])
    i0, i1 = int(61 * SR), int(66 * SR)
    fade[i0:i1] = np.linspace(1, 0, i1 - i0)
    fade[i1:] = 0
    out *= fade

    q = Mix(68.0, loop=False)
    q.add(edges(quack(2), 0.002, 0.03), 66.0, 0, 0.3, 0.25)
    return out + q.render()


# ---------------------------------------------------------------------------
# Output

TARGET_RMS = 10 ** (-18 / 20)
PEAK = 10 ** (-1.5 / 20)


def rms(x):
    return np.sqrt(np.mean(x ** 2))


def limiter_gain(x, block=256):
    """Per-sample gain that keeps |x| under PEAK. Block peaks are held over two neighbours on
    each side and then smoothed over two blocks, so the smoothed gain is always low enough.
    Works circularly, which keeps loops seamless."""
    peak = np.abs(x).max(axis=0)
    n = len(peak)
    nb = -(-n // block)
    pk = np.pad(peak, (0, nb * block - n)).reshape(nb, block).max(axis=1)
    held = np.max([np.roll(pk, s) for s in (-2, -1, 0, 1, 2)], axis=0)
    g = np.repeat(np.minimum(1.0, PEAK / np.maximum(held, 1e-9)), block)[:n]
    w = 2 * block
    return np.convolve(np.concatenate([g[-w:], g, g[:w]]), np.ones(w) / w, mode="same")[w:-w]


def master(base, frenzy, measure=slice(None)):
    """Scale to TARGET_RMS (measured on base[measure]) and limit base + frenzy together, so the
    stems never clip when both play. Both stems get the same gain curve."""
    g = TARGET_RMS / rms(base[:, measure])
    for _ in range(3):
        lim = g * limiter_gain((base + frenzy) * g)
        g *= TARGET_RMS / rms((base * lim)[:, measure])
    return base * lim, frenzy * lim


def write_ogg(name, x, tmp):
    wav = Path(tmp) / f"{name}.wav"
    pcm = (np.clip(x, -1, 1).T * 32767).round().astype(np.int16)
    with wave.open(str(wav), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-c:a", "libvorbis", "-q:a", "5",
                    str(OUT / f"{name}.ogg")], check=True)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    loops = {}
    with tempfile.TemporaryDirectory() as tmp:
        for fn in (pond, sky, space):
            name, base_mix, fr_mix = fn()
            base, fr = base_mix.render(), fr_mix.render()
            base, fr = master(base, fr)
            write_ogg(name, base, tmp)
            write_ogg(f"{name}_frenzy", fr, tmp)
            loops[name] = base.shape[1]
            print(f"{name}: {base.shape[1] / SR:.2f} s, base {20 * np.log10(rms(base)):.1f} dBFS, "
                  f"with frenzy {20 * np.log10(rms(base + fr)):.1f} dBFS")
        out = outro()
        out, _ = master(out, np.zeros_like(out), slice(6 * SR, 58 * SR))
        write_ogg("outro", out, tmp)
        print(f"outro: {out.shape[1] / SR:.2f} s")
    (OUT / "loops.json").write_text(json.dumps({"sampleRate": SR, "loopSamples": loops}, indent=2) + "\n")


if __name__ == "__main__":
    main()
