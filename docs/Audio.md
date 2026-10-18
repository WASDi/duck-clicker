# Duck Clicker — Audio Design

## 1. Style

The audio matches the retro Flash-game look in `Graphics.md`: cheerful, simple, and a little cartoonish, like the
looping synth and sampled-instrument music of 2005–2010 web games. Melodies are short and catchy, arrangements are
sparse, and sound effects are short and punchy. Nothing is realistic or cinematic.

All three level themes share one short melody (a quack-rhythm motif of four notes). Each level plays it in a different
sound and mood, and the outro combines all three.

## 2. Music

Each level has one looping background track. The outro has one non-looping track. Tracks are 44.1 kHz stereo,
about 60–90 seconds long for loops, and mastered to a similar loudness. Each loop is a whole number of bars.

| Track | Plays during | Mood and instruments                                                                                              | Tempo / key                |
|-------|--------------|-------------------------------------------------------------------------------------------------------------------|----------------------------|
| Pond  | Pond         | Warm, lazy, pastoral. Plucked ukulele-style chords, soft marimba melody, walking bass, light shaker, water plinks | 100 BPM, C major           |
| Sky   | Sky          | Bright, airy, floating. Glockenspiel and flute-style lead, shimmering pad, fast rising arpeggios, light snare     | 120 BPM, G major           |
| Space | Space        | Wonder and mystery. Slow analog-style pad, sparkling arpeggios, deep sub bass, theremin-style lead, soft kick     | 90 BPM, D minor to D major |
| Outro | Outro scene  | Triumphant, then tender. Builds from a rumble to a march, shrinks to a music box, then combines all three themes  | 90 BPM, C major            |

### Looping and layers

- Loops must be seamless. The end of the file leads directly back to the start, with reverb and delay tails wrapped
  around so there is no click or gap.
- Ogg encoding can add silent padding to a file, so the game never relies on the file length for looping. The music
  script writes the exact loop length in samples to `assets/audio/music/loops.json`. The game decodes the file and
  plays it with an `AudioBufferSourceNode` with `loopStart`/`loopEnd` set from that length.
- Each loop is rendered as two stems of identical length: a **base** stem and a **frenzy** stem (extra drums and a
  busier arpeggio). The frenzy stem is silent normally and ramps in linearly over 0.5 s while Honk Frenzy is active,
  then ramps out when it ends.
- Level transitions cross-fade linearly over 2 seconds into the next level's track, starting from the beginning of
  the new loop.

### Outro track

The outro plays once. Its scenes and times are defined in `Gameplay.md` §6; the music below follows them exactly.

| Time      | Scene            | Music                                                                                                              |
|-----------|------------------|--------------------------------------------------------------------------------------------------------------------|
| 0:00–0:06 | 1. Ignition      | Low rumble swell and rising pitch sweep under a swelling chorus of layered quacks, ending with a big beam-fire hit |
| 0:06–0:20 | 2. The flight    | Triumphant march with the shared motif on bold synth brass                                                         |
| 0:20–0:32 | 3. Landfall      | Music drops to a quiet music box and soft pad as the flock lands                                                   |
| 0:32–0:46 | 4. The colony    | Joyful reprise: Pond ukulele, Sky arpeggios, and Space pad playing together                                        |
| 0:46–0:58 | 5. Pull-back     | Only the Pond theme remains, slow and gentle                                                                       |
| 0:58–1:08 | 6. Final message | Final chord holds and fades out, then one last soft quack at the end of the message                                |

## 3. Sound effects

All effects are short, mono or stereo, and normalized to a consistent level.

| Sound                 | When it plays                                        | Source                                                                           |
|-----------------------|------------------------------------------------------|----------------------------------------------------------------------------------|
| **Quack**             | Every duck click                                     | One of `quack_1.wav`, `quack_2.wav`, `quack_3.wav` in `assets/audio/sfx/`        |
| Purchase              | Buying purchases 1–9 of a growth upgrade             | Synth coin-bell blip. Pitch rises one semitone per purchase count (1 to 9)       |
| Max upgrade           | Buying the 10th purchase of an upgrade               | Short 3-note synth jingle (plays instead of the blip)                            |
| Can't afford          | Clicking an upgrade the player can't afford          | Low synth "bonk"                                                                 |
| Completion upgrade    | Buying Flight, Stratosphere Gate, or Galactic Beacon | Short fanfare, different for each level (the Beacon one is bigger)               |
| Hatch                 | A new duck hatches                                   | Egg crack plus a high peep (quack clip pitched up and shortened)                 |
| Honk Frenzy start     | Honk Frenzy activates                                | Goose honk (quack clip pitched down with a bit of distortion) and a rising sweep |
| Honk Frenzy end       | Honk Frenzy ends                                     | Short falling sweep                                                              |
| Golden Item appears   | A golden item enters the screen                      | Twinkle                                                                          |
| Golden Item collected | The player clicks a golden item                      | Sparkle and a bright ding                                                        |
| Level transition      | Flight and Stratosphere Gate                         | Rising whoosh (wind for Pond to Sky, rocket for Sky to Space)                    |
| Beacon                | Outro ignition                                       | Deep rumble and an electric zap                                                  |
| UI click              | Opening an upgrade row's details on mobile           | Small synth tick                                                                 |

Passive income makes no sound.

### Playback rules

- **Quack:** pick randomly from the 3 clips and never play the same clip twice in a row. Vary playback speed randomly
  by ±4%. Clicks may overlap, up to 8 sounds at once.
- **Hatch:** all eggs from the hatchery hatch together, with the visual staggered over about 0.5 s (see
  `Graphics.md`). Play the hatch sound once per egg, but no more than once every 0.1 s and at most 4 times per batch.
  Play it quieter than the quack.
- The game starts without sound. Music and sounds start on the player's first click (browsers block audio before
  this), and that first click also plays its quack.
- Use the Web Audio API with sounds decoded into memory, so that effects play with no delay.

## 4. How audio is produced

**Sound effects.** Make them in code, with no outside services:

- Derive quack variants from `quack_1.wav`–`quack_3.wav`: pitch shifting and speed changes, filtering, and short
  distortion for the Honk Frenzy honk and the hatch peep.
- Generate the synth effects (blips, jingles, sweeps, whooshes, rumble, zaps) with a script, using simple oscillators,
  noise, and envelopes, in the style of sfxr/jsfxr. This gives the classic 8-bit/Flash feel and tiny files.

**Music.** The recommended approach is to **synthesize the tracks in code** (a Python script,
`tools/make_music.py`, that writes the loops as WAV and then encodes them):

- The script writes each track as a list of notes and chords, and renders them with simple synthesized instruments:
  plucked strings (Karplus-Strong), marimba and glockenspiel (sine partials with a fast decay), pads (detuned
  filtered waveforms), FM bells, and noise-based drums.
- This suits the retro sound, loops perfectly, needs no API budget, has no licensing questions, and is easy to adjust
  (tempo, key, instruments) by editing the notes.
- The same script renders the base and frenzy stems.

## 5. Formats and file list

- **Sound effects are WAV** (16-bit PCM). They are short and small, every browser decodes WAV, and there is no encoder
  padding to delay a sound that should feel instant.
- **Music is Ogg Vorbis** (`.ogg`), encoded from the WAV renders.

```
assets/audio/music/pond.ogg, pond_frenzy.ogg
assets/audio/music/sky.ogg, sky_frenzy.ogg
assets/audio/music/space.ogg, space_frenzy.ogg
assets/audio/music/outro.ogg
assets/audio/music/loops.json
assets/audio/sfx/quack_1.wav, quack_2.wav, quack_3.wav
assets/audio/sfx/purchase.wav, max.wav, deny.wav, complete_pond.wav, complete_sky.wav, complete_space.wav,
  hatch.wav, frenzy_start.wav, frenzy_end.wav, golden_appear.wav, golden_collect.wav,
  whoosh_wind.wav, whoosh_rocket.wav, beacon.wav, ui_click.wav
```
