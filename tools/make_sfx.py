"""Render the Duck Clicker sound effects (see docs/Audio.md).

Writes public/assets/audio/sfx/*.wav (44.1 kHz mono, 16-bit), except the quack_*.wav sources. Each effect is
matched to the quacks' loudness (RMS of the loudest 100 ms), with peaks capped at -1 dBFS.
Synth effects are built sfxr-style from oscillators, noise and envelopes; the hatch peep and the Frenzy honk
are derived from the quack clips. Shares its DSP helpers and instruments with make_music.py.

    python3 tools/make_sfx.py
"""

import wave

import numpy as np

from make_music import (SFX, SR, ar_env, brass, chime, crash, decay, edges, fm_bell, glock, kick, marimba, mtof,
                        pluck, quack, snare, sub, tt)

PEAK = 10 ** (-1 / 20)
RNG = np.random.default_rng(42)

# ---------------------------------------------------------------------------
# Building blocks


def glide(f0, f1, dur):
    """Per-sample frequency that slides exponentially from f0 to f1."""
    n = int(dur * SR)
    return f0 * (f1 / f0) ** (np.arange(n) / n)


def buzz(freq, odd=False, kmax=30, rolloff=1.0):
    """Band-limited saw (odd=True: square; rolloff=2: softer, triangle-like) following a per-sample frequency.
    Harmonics fade out as they approach 16 kHz, so pitch sweeps never alias."""
    ph = 2 * np.pi * np.cumsum(freq) / SR
    ks = range(1, kmax + 1, 2 if odd else 1)
    y = sum(np.sin(k * ph) / k ** rolloff * np.clip((16000 - k * freq) / 2000, 0, 1) for k in ks)
    return y / np.max(np.abs(y))


def square(m, dur, t60=10.0, kmax=9):
    n = int((dur + 0.05) * SR)
    return buzz(np.full(n, mtof(m)), odd=True, kmax=kmax) * ar_env(n, 0.003, dur, 0.05) * decay(n, t60)


def noise(dur):
    return RNG.standard_normal(int(dur * SR))


def svf(x, cutoff, q=0.7, mode="lp"):
    """TPT state-variable filter (mode lp, bp or hp); cutoff is in Hz, a number or a per-sample array."""
    g = np.tan(np.pi * np.minimum(np.broadcast_to(cutoff, x.shape), 0.45 * SR) / SR)
    k = 1 / q
    a1 = 1 / (1 + g * (g + k))
    a2 = g * a1
    lp, bp = np.empty_like(x), np.empty_like(x)
    ic1 = ic2 = 0.0
    for i, (xi, g1, b1, b2) in enumerate(zip(x.tolist(), g.tolist(), a1.tolist(), a2.tolist())):
        v1 = b1 * ic1 + b2 * (xi - ic2)
        v2 = ic2 + g1 * v1
        ic1, ic2 = 2 * v1 - ic1, 2 * v2 - ic2
        bp[i], lp[i] = v1, v2
    return {"lp": lp, "bp": bp, "hp": x - k * bp - lp}[mode]


def swell(dur, peak_at):
    """Envelope that rises to 1 at peak_at (fraction of dur) and falls back to 0 at the end."""
    u = np.arange(int(dur * SR)) / (dur * SR)
    return np.sin(np.pi * u ** (np.log(0.5) / np.log(peak_at)))


def quack_clip(i, pitch):
    """Quack clip with its leading silence removed, resampled by `pitch`."""
    x = quack(i, pitch)
    return x[np.argmax(np.abs(x) > 0.05 * np.max(np.abs(x))):]


def layer(*parts):
    """Mix (signal, start seconds, gain) parts into one mono signal."""
    end = max(int(start * SR) + len(x) for x, start, _ in parts)
    out = np.zeros(end)
    for x, start, gain in parts:
        i = int(start * SR)
        out[i:i + len(x)] += gain * x
    return out


def melody(inst, seq, start=0.0, gain=1.0):
    """Parts for [(midi, seconds)] played one after another; inst(m, dur) returns one note."""
    parts = []
    for m, dur in seq:
        parts.append((inst(m, dur), start, gain))
        start += dur
    return parts


# ---------------------------------------------------------------------------
# Effects


def purchase():
    """Coin-bell blip at the pitch of purchase 1. The game raises playbackRate one semitone per purchase."""
    n = int(0.28 * SR)
    blip = buzz(mtof(np.where(tt(n) < 0.045, 83, 88)), odd=True, kmax=9) * decay(n, 0.28)  # B5, then E6
    return layer((blip, 0, 0.45), (fm_bell(100, t60=0.3, ratio=3.0, index=1.0), 0.045, 0.4))


def max_upgrade():
    seq = [(88, 0.08), (92, 0.08), (95, 0.4)]  # E6 G#6 B6
    return layer(*melody(lambda m, d: square(m, d, t60=d + 0.2), seq, gain=0.4),
                 *melody(lambda m, d: chime(m + 12, 0.5), seq, gain=0.35))


def deny():
    n = int(0.22 * SR)
    bonk = buzz(glide(160, 70, 0.22), odd=True, kmax=7, rolloff=2) * ar_env(n, 0.002, 0.08, 0.14)
    return layer((bonk, 0, 0.8), (kick(t60=0.12, punch=0.5), 0, 0.5))


def complete_pond():
    """C major: marimba and square lead run up to a ringing C, over a strummed chord and bass."""
    seq = [(79, 0.1), (84, 0.1), (88, 0.1), (91, 0.5)]  # G5 C6 E6 G6
    hit = 0.3
    return layer(*melody(lambda m, d: marimba(m, d + 0.6), seq, gain=0.5),
                 *melody(lambda m, d: square(m, d, t60=0.6), seq, gain=0.18),
                 *((pluck(m, 0.8), hit + 0.015 * i, 0.2) for i, m in enumerate((60, 64, 67, 72))),
                 (pluck(48, 0.8, smooth=6), hit, 0.35))


def complete_sky():
    """G major: a fast glittering arpeggio up to a bell chord, with a light snare on the hit."""
    arp = [(79 + s, 0.045) for s in (0, 4, 7, 12, 16, 19)]  # G5 B5 D6 G6 B6 D7
    hit = 0.27
    return layer(*melody(lambda m, d: chime(m, 0.35), arp, gain=0.35),
                 *((glock(m, 1.4), hit, 0.3) for m in (79, 83, 86, 91)),
                 *melody(lambda m, d: square(m, d, t60=0.8), [(86, 0.12), (91, 0.6)], start=hit - 0.12, gain=0.15),
                 (snare(t60=0.15), hit, 0.3))


def complete_space():
    """D major, bigger: a brass call (triplet, bVI, bVII, I) over sub bass, kicks, a crash and sparkles."""
    call = [(62, 0.12), (66, 0.12), (69, 0.12), (74, 0.36), (70, 0.24), (72, 0.24), (74, 1.3)]
    hold = sum(d for _, d in call[:-1])
    chords = [((58, 62, 65), hold - 0.48), ((60, 64, 67), hold - 0.24), ((62, 66, 69), hold)]  # Bb C D
    sparkle = [(86 + s, 0.06) for s in (0, 4, 7, 12, 16, 19, 24, 19, 16, 12)]
    return layer(*melody(brass, call, gain=0.35),
                 *((brass(m, 0.22 if t < hold else 1.3), t, 0.18) for notes, t in chords for m in notes),
                 (sub(38, 1.6), hold - 0.48, 0.5),
                 (kick(), hold - 0.48, 0.5), (kick(), hold, 0.6), (crash(t60=1.6), hold, 0.25),
                 *melody(lambda m, d: chime(m, 0.3), sparkle, start=hold + 0.1, gain=0.2))


def hatch():
    """Three small shell cracks, then a peep: quack 1 pitched up and shortened."""

    def crack():
        n = int(0.02 * SR)
        return np.diff(RNG.standard_normal(n + 1)) * decay(n, 0.012)

    peep = edges(quack_clip(1, 2.2)[:int(0.07 * SR)], 0.002, 0.02)
    return layer((crack(), 0, 0.5), (crack(), 0.03, 0.4), (crack(), 0.05, 0.35), (peep, 0.07, 1.0))


def frenzy_start():
    """Goose honk (quack 2 pitched down and overdriven) and a rising sweep."""
    honk = quack_clip(2, 0.62)
    honk = svf(np.tanh(2.5 * honk / np.max(np.abs(honk))), 3000)
    n = int(0.6 * SR)
    rise = buzz(glide(220, 1760, 0.6), kmax=24) * ar_env(n, 0.05, 0.45, 0.15)
    return layer((honk, 0, 0.9), (rise, 0.2, 0.3))


def frenzy_end():
    n = int(0.45 * SR)
    return buzz(glide(1400, 200, 0.45), odd=True, kmax=15) * ar_env(n, 0.01, 0.3, 0.15)


def golden_appear():
    twinkle = [(m, 0.06) for m in (93, 100, 97, 105, 100, 109)]  # A6 E7 C#7 A7 E7 C#8
    return layer(*((chime(m, 0.3), i * d, 0.5 * 0.85 ** i) for i, (m, d) in enumerate(twinkle)))


def golden_collect():
    """Rising sparkle and a shimmer of noise, then a bright bell ding."""
    sparkle = [(m, 0.022) for m in (88, 91, 93, 96, 98, 100, 103)]
    n = int(0.4 * SR)
    shimmer = svf(noise(0.4), 6000, mode="hp") * decay(n, 0.25)
    ding = 0.12
    return layer(*melody(lambda m, d: chime(m, 0.15), sparkle, gain=0.3), (shimmer, 0, 0.15),
                 (fm_bell(96, t60=1.0, ratio=2.0, index=1.5), ding, 0.7), (glock(108, 1.0), ding, 0.2))


def whoosh_wind():
    """Pond to Sky: band-passed noise that sweeps up and swells late."""
    dur = 1.3
    low = svf(noise(dur), glide(250, 2800, dur), q=1.8, mode="bp")
    air = svf(noise(dur), glide(1500, 7000, dur), q=1.2, mode="bp")
    return (low + 0.3 * air) * swell(dur, 0.75)


def whoosh_rocket():
    """Sky to Space: distorted roar, a rising engine tone, hiss and crackle."""
    dur = 1.8
    n = int(dur * SR)
    roar = np.tanh(4 * svf(noise(dur), glide(180, 2200, dur), q=0.8))
    hiss = svf(noise(dur), glide(800, 5000, dur), q=2.0, mode="bp")
    engine = buzz(glide(55, 330, dur), kmax=20)
    crackle = svf((RNG.random(n) < 0.003) * RNG.uniform(-1, 1, n), 3000, q=2.0, mode="bp")
    return (roar + 0.4 * hiss + 0.25 * engine + 3 * crackle) * swell(dur, 0.7)


def beacon():
    """Outro ignition: a deep rumble swells for 1.4 s, then an electric zap with sparks as the rumble dies."""
    dur, fire = 3.0, 1.4
    n = int(dur * SR)
    t = tt(n)
    env = np.where(t < fire, (t / fire) ** 2, np.exp(-6.9078 * (t - fire) / 1.6))
    rumble = np.tanh(3 * svf(noise(dur), 90))
    sub_freq = np.concatenate([glide(35, 55, fire), np.full(n - int(fire * SR), 55.0)])
    sub_tone = np.sin(2 * np.pi * np.cumsum(sub_freq) / SR)

    zn = int(0.4 * SR)
    wobble = svf(RNG.standard_normal(zn), 200)
    jitter = 1 + 0.15 * wobble / np.max(np.abs(wobble))
    zap = buzz(glide(2600, 110, 0.4) * jitter, odd=True, kmax=15) * decay(zn, 0.4)
    sn = int(0.5 * SR)
    gate = np.repeat(RNG.random(sn // 300 + 1) < 0.6, 300)[:sn]
    sparks = svf(noise(0.5), 5000, mode="hp") * gate * decay(sn, 0.35)
    return layer(((rumble + 0.8 * sub_tone) * env, 0, 0.6), (zap, fire, 0.6), (sparks, fire, 0.4))


def ui_click():
    n = int(0.035 * SR)
    tick = np.sin(2 * np.pi * 1900 * tt(n)) * decay(n, 0.02)
    click = np.diff(RNG.standard_normal(n + 1)) * decay(n, 0.003)
    return tick + 0.3 * click


SOUNDS = {
    "purchase": purchase, "max": max_upgrade, "deny": deny,
    "complete_pond": complete_pond, "complete_sky": complete_sky, "complete_space": complete_space,
    "hatch": hatch, "frenzy_start": frenzy_start, "frenzy_end": frenzy_end,
    "golden_appear": golden_appear, "golden_collect": golden_collect,
    "whoosh_wind": whoosh_wind, "whoosh_rocket": whoosh_rocket, "beacon": beacon, "ui_click": ui_click,
}

# ---------------------------------------------------------------------------
# Output


def loudness(x, window=0.1):
    """RMS of the loudest 100 ms, so short blips and long effects with tails compare fairly."""
    w = min(int(window * SR), len(x))
    return np.sqrt(np.max(np.convolve(x ** 2, np.ones(w) / w, mode="valid")))


def target_loudness():
    return np.mean([loudness(quack(i)) for i in (1, 2, 3)])


def write_wav(name, x, target):
    """Match the quacks' loudness, but never peak above PEAK."""
    x = edges(x, 0.0005, 0.005)
    x = x * min(target / loudness(x), PEAK / np.max(np.abs(x)))
    pcm = (x * 32767).round().astype(np.int16)
    with wave.open(str(SFX / f"{name}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def main():
    SFX.mkdir(parents=True, exist_ok=True)
    target = target_loudness()
    for name, fn in SOUNDS.items():
        x = fn()
        write_wav(name, x, target)
        print(f"{name}: {len(x) / SR:.2f} s")


if __name__ == "__main__":
    main()
