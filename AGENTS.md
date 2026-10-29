# AGENTS.md

Duck Clicker: a short idle/clicker browser game across three levels: Pond, Sky, Space.
Click ducks → earn Quacks → buy upgrades → hatch ducks → finish each level. No saving: state is in memory only.

## Stack
- Vite + TypeScript, no UI framework, zero runtime dependencies. Vitest for tests.
- Rendering is DOM + CSS (absolutely positioned elements in a scaled playfield). No canvas.
- Audio uses the Web Audio API. No external requests at runtime.

## Commands
- `npm run dev`: dev server
- `npm run build`: type-check (`tsc --noEmit`) + build to `dist/`
- `npm test`: Vitest
- Pushing to `master` deploys to GitHub Pages (`.github/workflows/deploy.yml`).

## Layout
- `src/sim/`: game rules (pure, no DOM, unit-tested). Tuning numbers live in `src/sim/data.ts`.
- `src/view/`: scene, ducks, levels, effects, transitions, outro.
- `src/ui/`: HUD, shop, number formatting, debug panel.
- `src/audio/`: audio engine, music, SFX wiring.
- `src/core/`: loop (fixed 20 ticks/s), asset loading, URL flags.
- `src/styles/`: CSS.
- `public/assets/`: committed sprites, audio, and font.
- `tools/`: Python asset-generation scripts, run by hand. Their outputs are committed.
- `docs/`: design specs (Gameplay, Graphics, Audio, Assets, Tech). Read these before changing behavior.

## Conventions
- Keep sim logic DOM-free so it stays testable.
- Numbers are floats shown rounded down, with thousands separators.
- Add `?debug` to the URL for the debug panel (speed, Quacks, level jump, Frenzy/Golden triggers).
