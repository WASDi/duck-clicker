"""Render the trailer soundtrack (see docs/Trailer.md §4): the music and the sound effects in one mix.

Cue beats come from trailer/src/timing.json, the same file the picture reads, so every hit lands on its cut.
Writes trailer/src/audio/soundtrack.wav (44.1 kHz stereo, 16-bit). Reuses the instruments in make_music.py and the
building blocks and effects in make_sfx.py.

    python3 tools/make_trailer_music.py
"""

import json
import wave

import numpy as np

from make_music import (MINOR, ROOT, SFX, SR, Mix, ar_env, box, brass, cached, chord_notes, crash, decay, edges,
                        glock, is_minor, limiter_gain, load_wav, mtof, osc, pad, plink, rms, root_in, saw_table, seq, snare,
                        sub, tt)
from make_sfx import glide, noise, quack_clip, svf

TIMING = json.loads((ROOT / "trailer" / "src" / "timing.json").read_text())
OUT = ROOT / "trailer" / "src" / "audio" / "soundtrack.wav"

BEAT = 60 / TIMING["bpm"]
BEATS = 4 * sum(bars for _, bars in TIMING["scenes"])
LENGTH = BEATS * BEAT
D = 50  # D3
TARGET_RMS = 10 ** (-14 / 20)  # measured over the drop
RNG = np.random.default_rng(23)


def b(beats):
    return beats * BEAT


def at(name):
    """Cue times in seconds (always a list)."""
    beats = TIMING["cues"][name]
    return [b(x) for x in (beats if isinstance(beats, list) else [beats])]


def sfx(name):
    x, sr = load_wav(SFX / f"{name}.wav")
    assert sr == SR
    return x


# ---------------------------------------------------------------------------
# Instruments


def taiko(size=1.0):
    """Big drum: a membrane that drops in pitch, a second mode and a soft slap. Bigger is lower and longer."""

    def make():
        n = int(1.4 * size * SR)
        t = tt(n)
        fr = 92 / size * (1 + 1.3 * np.exp(-t / 0.022))
        ph = 2 * np.pi * np.cumsum(fr) / SR
        body = np.sin(ph) * decay(n, 0.6 * size) + 0.35 * np.sin(1.59 * ph) * decay(n, 0.18 * size)
        slap = box(np.random.default_rng(int(size * 100)).standard_normal(n), 7) * decay(n, 0.025)
        y = np.tanh(1.6 * (body + 0.7 * slap))
        return edges(y / np.max(np.abs(y)), 0.0005, 0.05)

    return cached(("taiko", size), make)


def impact():
    """Trailer hit: a huge taiko, a sub drop that rings for seconds and a low rumble."""

    def make():
        dur = 4.0
        n = int(dur * SR)
        t = tt(n)
        drop = np.sin(2 * np.pi * np.cumsum(36 + 30 * np.exp(-t / 0.08)) / SR) * decay(n, 2.6)
        rumble = svf(noise(dur), 140) * decay(n, 1.6)
        hit = np.zeros(n)
        big = taiko(1.7)
        hit[:len(big)] = big
        y = np.tanh(1.3 * (hit + 0.9 * drop + 2.5 * rumble / np.max(np.abs(rumble))))
        return edges(y / np.max(np.abs(y)), 0.0005, 0.2)

    return cached("impact", make)


def braam(notes, dur):
    """Low brass blast: stacked synth brass, overdriven, with a slow growl, over a sub."""
    n = int((dur + 0.15) * SR)
    t = tt(n)
    x = sum(brass(m, dur) for m in notes)
    x = np.tanh(2.5 * x / np.max(np.abs(x)))
    growl = 1 + 0.18 * np.sin(2 * np.pi * 23 * t) * np.exp(-t / 0.8)
    body = x * growl * (0.45 + 0.55 * decay(n, 1.4))
    s = sub(notes[0] - 12, dur)[:n]
    y = body[:len(s)] + 0.6 * s
    return edges(y / np.max(np.abs(y)), 0.003, 0.3)


def string(m, dur):
    """Short bowed-string stab for the ostinato: two detuned saws with a bright, fast-fading attack."""

    def make():
        n = int((dur + 0.05) * SR)
        f = mtof(m)
        dark = cached(("saw", m, 1.8), lambda: saw_table(f, 1.8))
        lit = cached(("saw", m, 6.0), lambda: saw_table(f, 6.0))
        bright = decay(n, 0.06)
        y = np.zeros(n)
        for cents, ph in ((-5, 0.0), (5, 0.37)):
            fr = f * 2 ** (cents / 1200)
            y += osc(dark, fr, n, ph) * (1 - bright) + osc(lit, fr, n, ph) * bright
        return y * ar_env(n, 0.004, dur, 0.05) * (0.55 + 0.45 * decay(n, 0.1)) / 2

    return cached(("string", m, round(dur, 3)), make)


def riser(dur):
    """Noise swept up through a band-pass, plus a rising tone with a tremolo that speeds up."""
    n = int(dur * SR)
    u = np.arange(n) / n
    hiss = svf(noise(dur), glide(250, 8000, dur), q=2.5, mode="bp")
    tone = osc(saw_table(mtof(D), 3.0), mtof(D) * 4 ** (u ** 1.6), n)
    trem = 0.5 + 0.5 * np.sin(2 * np.pi * np.cumsum(3 + 17 * u) / SR)
    y = (hiss / np.max(np.abs(hiss)) + 0.5 * tone * trem) * u ** 2.2
    return edges(y, 0.01, 0.003)


def suck(dur):
    """Reverse swell: noise that rises and opens up, then stops dead."""
    n = int(dur * SR)
    u = np.arange(n) / n
    y = svf(noise(dur), glide(400, 7000, dur), q=0.8) * u ** 3
    return edges(y / np.max(np.abs(y)), 0.01, 0.002)


def ostinato(mix, chords, step, gain):
    """Pulsing strings: root, root, octave, root, fifth, root, octave, third, in steps of `step` beats."""
    for t0, d, sym in chords:
        r = root_in(sym, D)
        third = r + (3 if is_minor(sym) else 4)
        line = [r, r, r + 12, r, r + 7, r, r + 12, third]
        for j in range(int(round(d / step))):
            accent = 1.0 if (j * step) % 1 == 0 else 0.7
            mix.add(string(line[j % 8], b(step) * 0.6), b(t0 + j * step), -0.3 if j % 2 else 0.3, gain * accent,
                    0.18)


def low_strings(mix, chords, gain):
    for t0, d, sym in chords:
        mix.add(pad(chord_notes(sym, 38, 58)[:4], b(d), 0.25, 0.4, 1.4), b(t0), gain=gain, rev=0.35)
        mix.add(sub(root_in(sym, 26), b(d) * 0.95), b(t0), 0, gain * 1.1, 0.0)


# ---------------------------------------------------------------------------
# The cue sheet


def compose():
    """Returns (music, free): music is cut to silence for the pause; free holds what plays over the silence."""
    music, free = Mix(LENGTH, loop=False), Mix(LENGTH, loop=False)
    silence, drop, title = at("silence")[0], at("drop")[0], at("titleHit")[0]

    # Bars 1-10: a low drone (D and A) that fades in, with a faint high fifth over the opening.
    n = int(silence * SR)
    t = tt(n)
    swell = np.clip(t / 5.0, 0, 1) ** 2 * (0.85 + 0.15 * np.sin(2 * np.pi * 0.25 * t))
    music.add(pad([38, 45], silence, 0.01, 0.01, 1.0)[:, :n] * swell, 0, gain=0.3, rev=0.3)
    music.add(sub(26, silence)[:n] * swell, 0, 0, 0.2, 0.0)
    music.add(pad([74, 81], b(16), 4.0, 2.0, 0.8), 0, gain=0.07, rev=0.6)

    # Cold open: one drop of water, one hit.
    for s in at("drip"):
        music.add(plink(88), s - 0.02, 0.1, 0.25, 0.6)
        music.add(impact(), s, 0, 0.85, 0.35)

    # Pond: the egg wobbles on sparse hits, cracks, then BRAAM as the duck appears.
    for s in at("wobble"):
        music.add(taiko(0.8), s, 0, 0.4, 0.3)
    for s in at("crack"):
        music.add(taiko(1.0), s, 0, 0.5, 0.3)
        music.add(sfx("hatch"), s, 0.1, 0.55, 0.25)
    for s in at("reveal"):
        music.add(suck(b(2)), s - b(2), 0, 0.22, 0.2)
        music.add(braam([38, 45, 50, 53], b(4)), s, 0, 0.75, 0.4)
        music.add(impact(), s, 0, 0.7, 0.3)

    # Sky and Space: ostinato over low strings, hits on every beat, then the riser into the silence.
    start = TIMING["cues"]["ostinato"]
    chords = [(start + 4 * k, 4, sym) for k, sym in enumerate(["Dm", "Bb", "Gm", "Bb", "A"])]
    low_strings(music, chords, 0.28)
    ostinato(music, chords[:2], 0.5, 0.16)
    ostinato(music, chords[2:], 0.25, 0.14)
    for beat in range(start, start + 8):
        music.add(taiko(1.3 if beat % 4 == 0 else 1.0), b(beat), 0, 0.55 if beat % 4 == 0 else 0.4, 0.25)
    for bar in range(start + 8, start + 16, 4):
        for off in (0, 1, 2, 2.5, 3):
            music.add(taiko(1.3 if off == 0 else 0.9), b(bar + off), 0, 0.55 if off == 0 else 0.4, 0.25)
    for k, off in enumerate(np.concatenate([np.arange(0, 2, 0.5), np.arange(2, 4, 0.25)])):
        music.add(taiko(0.9), b(start + 16 + off), 0, 0.3 + 0.025 * k, 0.25)
    for s in at("flyby"):
        music.add(sfx("whoosh_wind"), s - 0.75 * 1.3, 0, 0.55, 0.2)
    for s in at("gate"):
        music.add(sfx("whoosh_rocket"), s - 0.7 * 1.8, 0, 0.5, 0.2)
    for s in at("beacon"):
        music.add(sfx("beacon"), s - 1.4, 0, 0.6, 0.3)
        music.add(impact(), s, 0, 0.75, 0.3)
        music.add(riser(silence - s), s, 0, 0.3, 0.25)

    # The pause: nothing but one quack, then a short intake of breath into the drop.
    for s in at("quack"):
        free.add(edges(quack_clip(1, 1.0), 0.002, 0.03), s, 0, 0.75, 0.12)
    free.add(suck(0.45), drop - 0.45, 0, 0.2, 0.1)

    # Drop: drums, ostinato, and the game's quack motif on brass.
    d0 = TIMING["cues"]["drop"]
    dchords = [(d0 + 2 * k, 2, sym) for k, sym in enumerate(["Dm", "Bb", "Gm", "A"])]
    music.add(impact(), drop, 0, 0.8, 0.3)
    music.add(crash(2.5), drop, 0, 0.18, 0.4)
    low_strings(music, dchords, 0.3)
    ostinato(music, dchords, 0.25, 0.15)
    for t0, d, m in seq("4/.5 2/.5 4/.5 7/1.5 r/1 | 5/.5 3/.5 5/.5 8/1 6#/1.5", D + 12, MINOR, d0):
        music.add(brass(m, b(d) * 0.92), b(t0), 0.15, 0.3, 0.35)
        music.add(brass(m - 12, b(d) * 0.92), b(t0), -0.15, 0.2, 0.3)
    for t0, d, sym in dchords:
        for k, m in enumerate(chord_notes(sym, 50, 66)[:3]):
            music.add(brass(m, b(d) * 0.95), b(t0), -0.5 + 0.5 * k, 0.08, 0.35)
    for beat in np.arange(d0, d0 + 7, 0.5):
        on = beat % 1 == 0
        music.add(taiko(1.2 if on else 0.6), b(beat), 0, 0.5 if on else 0.2, 0.25)
        if on and beat % 2 == 1:
            music.add(snare(0.25, 0.4), b(beat), 0.1, 0.3, 0.3)
    for k in range(4):  # fill into the title
        music.add(taiko(0.7), b(d0 + 7 + k / 4), 0, 0.3 + 0.07 * k, 0.25)
        music.add(snare(0.15, 0.3), b(d0 + 7 + k / 4), 0.1, 0.12 + 0.05 * k, 0.25)
    for s in at("dropHatch"):
        music.add(sfx("hatch"), s, 0.3, 0.5, 0.2)
    for k, s in enumerate(at("dropQuack")):
        music.add(edges(quack_clip(2 + k % 2, 1.0), 0.002, 0.03), s, -0.3, 0.45, 0.15)
    for s in at("flag"):
        music.add(taiko(0.7), s, 0, 0.35, 0.25)

    # Title: the last hit lands on D major instead of minor, rings out and fades by the end.
    music.add(impact(), title, 0, 0.85, 0.35)
    music.add(crash(3.5), title, 0, 0.2, 0.45)
    ring = LENGTH - title
    music.add(braam([38, 45, 50, 54], ring), title, 0, 0.45, 0.45)
    music.add(pad([50, 57, 62, 66, 69, 74], ring, 0.05, 0.5, 1.8), title, gain=0.35, rev=0.45)
    for k, m in enumerate((74, 78, 81, 86)):
        music.add(glock(m, 3.0), title + 0.09 * k, -0.4 + 0.25 * k, 0.1, 0.5)
    for s in at("lastQuack"):
        free.add(edges(quack_clip(2, 1.0), 0.002, 0.03), s, 0, 0.35, 0.25)
    return music, free


def master(music, free):
    """Cut the music for the pause, fade it at the end, then level the drop to TARGET_RMS and limit the peaks."""
    n = music.shape[1]
    env = np.ones(n)
    i0, i1 = int(at("silence")[0] * SR), int(at("drop")[0] * SR)
    env[i0:i1] = 0
    env[i0 - int(0.005 * SR):i0] = np.linspace(1, 0, int(0.005 * SR))
    f0, f1 = int(b(BEATS - 4) * SR), int((LENGTH - 0.1) * SR)
    env[f0:f1] *= np.linspace(1, 0, f1 - f0) ** 2
    env[f1:] = 0
    x = music * env + free
    drop = slice(i1, int(at("titleHit")[0] * SR))
    g = TARGET_RMS / rms(x[:, drop])
    for _ in range(3):
        lim = g * limiter_gain(x * g)
        g *= TARGET_RMS / rms((x * lim)[:, drop])
    return x * lim


def main():
    music, free = compose()
    x = master(music.render(), free.render())
    OUT.parent.mkdir(parents=True, exist_ok=True)
    pcm = (np.clip(x, -1, 1).T * 32767).round().astype(np.int16)
    with wave.open(str(OUT), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"{OUT.relative_to(ROOT)}: {x.shape[1] / SR:.2f} s, peak {20 * np.log10(np.abs(x).max()):.1f} dBFS")
    for bar in range(BEATS // 4):
        seg = x[:, int(b(4 * bar) * SR):int(b(4 * bar + 4) * SR)]
        print(f"  bar {bar + 1:2d}: {20 * np.log10(rms(seg) + 1e-9):6.1f} dBFS")


if __name__ == "__main__":
    main()
