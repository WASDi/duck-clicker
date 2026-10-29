# Duck Clicker — Trailer

## 1. Style

The trailer is a 30-second **mock-epic** teaser: the ducks are shot like a blockbuster movie trailer, played
completely straight. Dark grading, slow camera moves, deep hits, and big captions. The joke is the gap between that
treatment and the cute ducks, and it pays off in one comedy beat where everything stops for a single small quack.

The story follows the game's climb from Pond to Sky to Space, told as a hero's journey. The trailer shows no HUD,
shop, or cursor. It is not gameplay footage.

This is the one place where the project is cinematic on purpose. The game itself still follows `Audio.md` and
`Graphics.md`.

## 2. Format

- 1280×720, 30 fps, 30 seconds (900 frames). H.264 MP4 with AAC stereo audio, for YouTube.
- The picture is letterboxed to 2.39:1 with black bars (about 92 px top and bottom). The title card at the end
  opens the bars to full frame.
- Scene cuts fall on bar lines of the music (120 BPM, so one bar = 2 s = 60 frames).

## 3. Storyboard

| Time    | Frames  | Scene          | Picture                                                                                                                                              | Sound                                          |
|---------|---------|----------------|------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------|
| 0–4 s   | 0–119   | 1. Cold open   | Black. A single ripple spreads across a dark, desaturated pond while the camera slowly pushes in. Caption: *"Every legend…"*                          | Low drone, then one deep hit                   |
| 4–10 s  | 120–299 | 2. Pond        | Close-up of a reed egg that wobbles, then cracks. Shallow focus, with lily pads and reeds drifting past in the foreground. The teal duck is revealed. Caption: *"…starts small."* | BRAAM on the reveal                            |
| 10–14 s | 300–419 | 3. Sky         | The camera climbs out of a cloud bank (the cloud wipe). A V-formation of ducks streaks past with motion blur, then a tracking shot flies alongside the teal duck as clouds stream by. | Pulsing ostinato starts, hits speed up         |
| 14–20 s | 420–599 | 4. Space       | Up through the stratosphere gate. Astronaut ducks drift between asteroids and the galactic beacon fires on a hit. In the last bar the stars stretch into streaks as the teal duck flies at the lens. | Riser climbs to its peak                       |
| 20–22 s | 600–659 | 5. The pause   | Hard cut to black. A small sitting duck in the middle of the frame quacks once.                                                                      | Silence, then `quack_1.wav`                    |
| 22–26 s | 660–779 | 6. Drop        | Fast montage, one cut per beat (every 15 frames): cloud egg hatches, five ducks on the pond, Quack coins burst, V-formation, pod egg hatches, astronauts tumble past, Pond/Sky/Space triptych, flag planted on the moon. | The motif on full brass with drums             |
| 26–30 s | 780–899 | 7. Title       | Full-colour title card in the style of `docs/banner.jpg`: "Duck Clicker", "Pond · Sky · Space", and "Play free in your browser".                      | Final hit, music rings out, last soft quack    |

### Captions

- Captions are white Sniglet 400 with wide letter spacing, centred in the lower third of the letterboxed frame.
- Each caption fades in over 10 frames, holds, and fades out over 10 frames before the next cut.
- Only the title card uses Sniglet 800, in the banner colours (yellow fill, dark brown outline).

## 4. Music

The trailer has its own soundtrack: the music and every sound effect in one mix. It is synthesized in
`tools/make_trailer_music.py`, which reuses the instruments and helpers in `tools/make_music.py` and `tools/make_sfx.py`.
It writes `trailer/src/audio/soundtrack.wav`, which the trailer imports directly. It is kept out of `public/` so it
never ships with the game. The script reads the cue beats from `trailer/src/timing.json`, the same file the picture
uses, so every hit lands on its frame.

- 120 BPM, D minor, 15 bars, exactly 30 s.
- Instruments: low drone, synthesized taiko-style hits, pulsing string-like ostinato (detuned saws), a "BRAAM" (low
  brass blast), a noise riser, and bold synth brass for the motif.
- The game's shared four-note quack motif returns on synth brass at the drop, tying the trailer to the game music.

| Bars  | Time    | Scene        | Music                                                                                 |
|-------|---------|--------------|---------------------------------------------------------------------------------------|
| 1–2   | 0–4 s   | Cold open    | Drone fades in. One deep hit on the downbeat of bar 2                                 |
| 3–5   | 4–10 s  | Pond         | Drone continues, sparse hits. BRAAM on the duck reveal (bar 5)                        |
| 6–7   | 10–14 s | Sky          | Ostinato enters, hits every beat                                                      |
| 8–10  | 14–20 s | Space        | Ostinato doubles, riser builds through bar 10, beacon hit on the downbeat of bar 9    |
| 11    | 20–22 s | The pause    | Full silence. The quack SFX plays on beat 3                                           |
| 12–13 | 22–26 s | Drop         | Full drums, ostinato, and the motif on brass                                          |
| 14–15 | 26–30 s | Title        | Final hit on the downbeat of bar 14, then the chord rings out and fades by 30 s       |

Sound effects from `public/assets/audio/sfx/` are mixed in by the same script: `hatch.wav` on the egg crack and the
montage hatches, `whoosh_wind.wav` peaking as the V-formation passes, `whoosh_rocket.wav` peaking at the gate,
`beacon.wav` zapping on the beacon hit, and `quack_*.wav` for the pause, the montage, and the final quack. The music
is cut dead for the pause, and the final chord resolves to D major for the title card.

## 5. Look

- **Grade:** darker and lower in saturation than the game, with higher contrast and a vignette. Colour returns to
  full brightness only on the title card, so the payoff feels bright.
- **Film grain:** a light animated noise overlay over everything except the title card.
- **Camera:** slow pushes and pans (no more than about 10% zoom per scene), with a small shake on big hits.
- **Depth:** the backgrounds are single flat images, so depth comes from 2.5D parallax. Foreground sprites move
  faster than the background, and the background is slightly blurred to fake shallow focus.
- **Motion blur:** fast-moving sprites (V-formation, montage cuts) use a short directional blur.

## 6. Assets

Everything comes from `public/assets/` unless listed under *To make*.

| Scene     | Existing assets                                                                                 |
|-----------|-------------------------------------------------------------------------------------------------|
| Cold open | `pond/bg.jpg`, `pond/ripple.png`                                                                |
| Pond      | `pond/bg.jpg`, `pond/lily_pad.png`, `pond/reed_clump.png`, `eggs/reed_intact.png`, `eggs/reed_cracked.png`, `eggs/reed_shell_top.png`, `eggs/reed_shell_bottom.png`, `ducks/teal_sit.png` |
| Sky       | `sky/bg.jpg`, `sky/cloud.png`, `sky/small_cloud.png`, `ducks/*_fly_*.png` (the V-formation is built from these) |
| Space     | `sky/stratosphere_gate.png`, `space/bg.jpg`, `space/asteroid.png`, `space/star.png`, `space/galactic_beacon.png`, `space/galactic_beacon_lit.png`, `ducks/*_astro_*.png` |
| The pause | `ducks/white_sit.png`                                                                           |
| Drop      | `eggs/*`, `ducks/*`, `icons/quack.png`, `outro/moon.png`, `outro/flag.png`                      |
| Title     | Same layers as `docs/banner.jpg`, `fonts/sniglet-800.woff2`, `fonts/sniglet-400.woff2`          |

**To make** (only if parallax needs them): separate foreground layers with transparency, generated in the same style
with `tools/gen_image.py`, such as a close reed and cattail layer for the Pond and a near cloud bank for the Sky.

## 7. Production

The trailer is a separate Remotion project in `trailer/`, with its own `package.json`, so the game keeps zero
runtime dependencies and `npm run build` never sees it.

```
trailer/
├── package.json          # remotion, @remotion/cli, react
├── tsconfig.json
├── remotion.config.ts    # public dir → ../public, so game assets are shared, not copied
├── scripts/render.mjs    # frames via Remotion, encoding and audio via FFmpeg in Docker
├── src/
│   ├── index.ts          # registerRoot()
│   ├── Root.tsx          # registers Trailer and each scene as its own composition
│   ├── Trailer.tsx       # full cut: scenes in <Sequence>s, soundtrack for Studio preview
│   ├── timing.json       # fps, bpm, scene lengths in bars, cue beats (read by the music script too)
│   ├── timing.ts         # typed frames from timing.json: SCENES, cue(), cues()
│   ├── audio/            # soundtrack.wav from tools/make_trailer_music.py
│   ├── scenes/           # ColdOpen, Pond, Sky, Space, Pause, Drop, TitleCard
│   ├── components/       # Camera, Film (grain + letterbox), Look (grade, caption), Sprite, Backdrop
│   └── lib/              # assets, fonts, anim helpers, time.tsx (useTime + MotionBlur)
└── out/                  # rendered MP4s (gitignored)
```

- `npm run studio` (inside `trailer/`): live preview.
- `npm run render`: final render to `out/trailer.mp4`. Remotion's bundled FFmpeg needs macOS 15+, so
  `scripts/render.mjs` has Remotion render a JPEG sequence and encodes it with FFmpeg in Docker
  (`jrottenberg/ffmpeg`), muxing in `src/audio/soundtrack.wav`. For the same reason the soundtrack is only mounted in
  Studio: Remotion probes any `<Audio>` during a render, even an image-sequence render.
- After changing cues in `timing.json`, re-run `python3 tools/make_trailer_music.py` so the sound moves with the
  picture.
- Scene code reads time through `useTime()` rather than `useCurrentFrame()`, so `<MotionBlur>` can render it at
  sub-frame offsets for real motion blur.
