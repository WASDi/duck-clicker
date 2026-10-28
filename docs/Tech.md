# Duck Clicker — Tech

## 1. Stack

- **Vite** with hot reload, building a fully static site into `dist/` (relative `base` so it can be hosted from any
  path, including a subfolder or a file host).
- **TypeScript**, no UI framework. Runtime dependencies: none. Dev dependencies: Vite, TypeScript, and Vitest.
- **Rendering:** DOM and CSS, as `Graphics.md` describes. Ducks, props, and effects are absolutely positioned elements
  inside a fixed-size playfield that is scaled to fit the screen with a single CSS transform. Sprite sheets are
  stepped with CSS `steps()`. Canvas is not used.
- **Audio:** Web Audio API (see `Audio.md`).
- The Sniglet font is bundled as `woff2` and loaded with `@font-face`. The game makes no external requests at runtime.

## 2. Game loop

- The simulation runs at a fixed 20 ticks per second, independent of frame rate, using an accumulator in
  `requestAnimationFrame`. Rendering reads the current state each frame.
- Game rules live in plain modules with no DOM access (state, upgrades, costs, hatchery timer, Frenzy, Golden Item
  timer), so they can be unit-tested with Vitest. The numbers from `Gameplay.md` live in one data file.
- Quacks are stored as floating-point numbers and shown rounded down. Production rates are shown with one decimal.
  Numbers use thousands separators ("12,000"). The game never reaches numbers large enough to need "K"/"M"
  suffixes.
- When the tab is hidden, the simulation pauses (there is no offline progress). On return it resumes without
  catching up the missed time.

## 3. No saving

Nothing is saved: no `localStorage`, cookies, or other storage. All state lives in memory and is lost when the page
reloads, which starts the game over. A full run is about 6 minutes, so this keeps the game simple.

## 4. Debug

With `?debug` in the URL, a small panel lets the developer change the game speed (1×, 5×, 20×), add Quacks, jump to
a level or the outro, and trigger Frenzy or a Golden Item.

## 5. Asset tools

Asset scripts live in `tools/` and are run by hand. Their outputs are committed, so building the game needs only
Node.

- Python 3 with `numpy` and `Pillow` (`tools/requirements.txt`), plus `ffmpeg` on the `PATH` for encoding the music
  to OGG.
- `tools/make_sfx.py`, `tools/make_music.py`: see `Audio.md`.
- `tools/gen_image.py`: calls the image API described in `Graphics.md`, reading the key from `openrouter_key.txt`
  (git-ignored).
- `tools/slice_grid.py`: slices generated grids into individual sprites.
- Game assets live in `public/assets/`. The `assets/...` paths in the other docs are relative to `public/`.
