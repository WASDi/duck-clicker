# Duck Clicker — Graphics Design

## 1. Style

The overall style follows `reference.png`: soft, rounded, glossy 3D-rendered look with a saturated blue sky, fluffy
white volumes, warm orange duck bills and feet, and a dark teal HUD panel with a gold border. `reference.png` is a
style guide, not a finished screenshot. Do not copy its layout or content.

The game should also feel retro, like Flash games from roughly 2005–2010:

- Use modern CSS syntax where useful, but avoid features that make it feel modern or generic: no glassmorphism, no
  `backdrop-filter` blur, no soft layered drop shadows, no gradient text, no glowing neon, no spring or cubic-bezier
  "bouncy" easing.
- Animation is mostly **linear**. Use opacity fades sparingly (for example only at the end of a floating number).
- Prefer basic Flash-style tricks: squash and stretch (scale X and Y independently), simple bounces, wobbles, frame
  swaps, and sprite sheets stepped with `steps()`.
- All fonts use https://fonts.google.com/specimen/Sniglet, bundled with the game (no external font requests).
- Hard-edged, flat-colored UI elements (bars, buttons) with a single highlight line. No smooth glass sheen.

## 2. Image generation

Generate images with https://openrouter.ai/openai/gpt-image-2.5-sunburst.
`OPENROUTER_API_KEY` is in `openrouter_key.txt`. Never commit the key or print it in logs.

- The key is limited. Plan for **10 to 30 generations in total**, including retries.
- Always pass `reference.png` as a style reference (style only, not content).
- Generate similar small/medium assets (duck variants, icons, props) as **one grid per generation** and slice them
  with a script. This saves cost and keeps style identical. Use a plain, evenly spaced grid with a clear gutter
  between cells. Small assets don't need high resolution (about 256 px per duck cell, 128 px per icon cell).
- Most assets need transparent backgrounds. Only the per-level backgrounds are opaque.
  `gpt-image-2.5-sunburst` supports transparency.
- Backgrounds are landscape (16:9, about 1920×1080) for desktop. Keep important content in the center so mobile
  portrait can crop to the middle, and keep the lower area calm enough for UI to sit over it.
- Name outputs consistently, e.g. `assets/pond/bg.png`, `assets/ducks/white_sit.png`, `assets/icons/pond_1.png`.

## 3. Asset list and generation plan

| Asset group             | Contents                                                                                                                                                  | Gens  |
|-------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------|-------|
| Ducks (Pond, Sky)       | Grid: the 5 ducks from `reference.png` re-rendered in sitting pose (see §4)                                                                               | 1     |
| Flying ducks            | Grid: 5 duck colors × 2 wing-flap frames                                                                                                                  | 1     |
| Astronaut ducks (Space) | Grid: 5 duck colors in space suits with glass helmets, floating pose + 2 limb frames                                                                      | 1–2   |
| Eggs and hatching       | Reed nest egg, cloud egg, space pod egg, each with intact, cracked, and shell-half frames                                                                 | 1     |
| Cloud                   | One fluffy cloud, reused at different sizes, flipped, and tinted                                                                                          | 1     |
| Level backgrounds       | Pond, Sky, Space                                                                                                                                          | 3     |
| Level props             | One grid per level: the four growth upgrade props, the completion prop, the level's golden item base (bread slice, small cloud, star), and scenery pieces | 3     |
| Icons                   | 12 growth upgrade icons, 3 completion icons, Quack                                                                                                        | 2     |
| HUD kit                 | Panel frame, button states, progress bar parts, frenzy marker, "HONK!" burst                                                                              | 1–2   |
| Outro                   | Blue moon with a glowing pond, flag, and a few extra frames                                                                                               | 1–2   |
| **Total**               |                                                                                                                                                           | 15–18 |

The Golden Items, and the bread floating on the pond at the end of the outro, reuse the golden item bases from the
props grids. The outro's eggs and ducklings reuse the egg and duck sprites.

## 4. Ducks

- There are 5 duck variants: **White**, **Teal**, and three gold/brown ducks (tan, chestnut, dark brown). The gray duck
  in the reference is not used.
- The first duck in every level is always White. Every other duck is random from the five.
- Pond and Sky use the ducks from `reference.png`. Don't cut them out of the reference: they are only about 120 px tall
  there, and the white duck can't be cleanly separated from its white cloud. Instead, generate one grid with the
  reference as input that re-renders the five ducks in the same sitting pose on a transparent background, at the
  same 256 px cell size as the flying and astronaut grids, so all ducks have the same sharpness.
- Sprites face right and are mirrored in code for left. All five share the same size, pose, and anchor point so they
  can be swapped freely.
- Space uses the astronaut variants of the same five ducks, with a glass helmet, a white suit with a small colored
  patch matching the duck, and the duck's bill still clearly visible.
- Ducks respond to clicks with a squash-and-stretch hop (about 0.2 s, linear).
- The flock has no maximum size. The scene draws up to about 60 individual ducks. Beyond that, extra ducks are drawn
  smaller in rows farther back, and the HUD always shows the exact duck count.

## 5. HUD

The HUD follows only the **style** of `reference.png`: dark teal rounded panels with a gold border, round icon
buttons with a gold ring, and a teal progress bar. Layout and content are our own. It is built
as HTML/CSS using sliced pieces from the HUD kit (9-slice borders, button states, bar caps), with real text for all
numbers.

### Always visible

- **Quacks:** current spendable Quacks, with a Quack icon.
- **Quacks per second:** current passive production. Shows a doubled value and a frenzy marker while Honk Frenzy is
  active.
- **Duck count.**
- **Level name** (Pond, Sky, Space).
- **Finale progress bar:** current spendable Quacks toward the cost of the level's completion upgrade, with the
  numbers. It drops when Quacks are spent and is full exactly when the completion upgrade is affordable.
- **Honk Frenzy meter:** shows the recent-click streak (8 clicks in 6 seconds), then a
  10-second active countdown, then the 20-second cooldown.

### Upgrade shop

All five upgrades of the level are always listed, in order, as rows or cards. Each shows:

- Icon, name, and effect per purchase
- Current cost
- Purchase count out of 10, shown as a row of 10 small pips
- A clear state: affordable, too expensive (dimmed), or maxed (gold check, "MAX")

The completion upgrade has a distinct larger gold-framed card and is shown as one purchase. It stays dimmed until the
player can afford it, then pulses with a linear wiggle.

### Layout

- **Desktop (priority):** the playfield fills the left and center. A fixed panel on the right holds the upgrade shop.
  Stats sit in a bar along the top, and the Honk Frenzy meter sits at the bottom.
- **Mobile (portrait):** the playfield is on top, stats are in a compact strip above it, and the shop is a scrollable
  list below. Tap targets are at least 44 px. The upgrade rows shrink to icon, cost, and pips, and the full effect text
  opens when a row is tapped.

## 6. Animation and effects

- **Click:** the duck hops with squash and stretch. A "+N" number rises in a straight line for about 0.6 s and fades
  only in the last moment.
- **Purchase:** the upgrade card squashes once and its prop in the scene pops in. The pop is a scale from 0 to 1.15 to
  1 built from linear keyframes, not a spring or bezier curve. The pip fills with a hard color change, no fade.
- **Hatching:** the nest holds one egg per hatchery purchase, which shows the player how many ducks are coming. Over the
  last 2 seconds before the timer fires the eggs wobble (rotating left and right). When it fires, each egg swaps to
  the cracked frame and a duck pops out with a squash-and-stretch bounce, then the shell halves tumble away on straight
  paths. The eggs hatch one after another about 0.1 s apart, then the nest refills with fresh eggs. A small ring around
  the nest fills to show the hatch timer.
- **Honk Frenzy:** a "HONK!" burst pops in at the top of the screen, all ducks bounce at double speed, and a thin
  gold border blinks on the playfield with hard on/off frames while the effect is active.
- **Golden Items:** the base sprite (bread slice, small cloud, star) comes from the level's props grid and gets its gold
  look from CSS (a gold tint/filter) rather than separate generated art. It drifts
  across the screen on a straight line with a gentle rotation wobble for 6 seconds. Clicking it pops it into a sparkle
  effect and shows the Quacks gained.
- **Ambient motion:** clouds drift slowly in straight lines, pond ripples and stars cycle through a few frames, and idle
  ducks do an occasional head-tilt or small hop.

## 7. Levels

### Pond

- Opaque background of a calm pond with a shore, reeds, and lily pads, in the reference's soft render style.
- Ducks swim on the water. Their feet are hidden below the waterline: draw each duck sunk partway into the water and
  put an animated water strip with ripples in front of it.
- Scene props appear on the shore and water the first time each upgrade is bought: Bread Conveyor, Reed Nursery,
  Duckweed Farm, and Worm Shower. Buying again triggers the pop animation and updates the pips.
- Eggs are laid in the Reed Nursery and hatch with the standard hatch animation.
- Level end: Flight. The flock lifts off straight up, and the screen slides down into the Sky level.

### Sky

- Uses the same ducks as Pond, and also needs flying ducks, used for hatched ducks arriving and for the transition.
- Generate one fluffy cloud exactly like the reference. It is reused at many sizes, flipped, and tinted slightly for
  variety.
- The first duck sits on a cloud. Additional ducks sit on other clouds or fly in loops between them, and sitting
  ducks occasionally hop to a neighbouring cloud on a simple arc.
- The background has more detail than the reference: cirrus streaks, distant cumulus, storm clouds, and a sun glow,
  so the scene feels like a real sky. The foreground clouds stay in the reference style.
- Props: Cloud Crumb Cannon, Cloud Incubator, V-Formation Training (a formation marker in the sky), Insect Swarm Net.
- Level end: Stratosphere Gate. A gate prop appears and the flock flies through as the screen slides down into the Space
  level.

### Space

- Replace all duck assets with the astronaut ducks. They float with a slow, slightly rotating bob.
- Background is a deep starfield with a planet and a nebula, still soft and rounded, not photorealistic.
- Props: Starseed Feeder, Zero-G Egg Pod, Orbital Duckweed Garden, Quasar Core, plus asteroids and small satellites
  as scenery.
- Level end: Galactic Beacon, which starts the outro.

## 8. Other screens

- **Level transition:** straight slide between backgrounds with the flock moving along in the same direction. No
  cross-fade.
- **Outro** (after the Galactic Beacon is bought): follows the scenes and times in `Gameplay.md` §6 exactly, built
  from sprites and scripted linear motion and driven by the outro music's playback position so that picture and
  sound stay in sync. Drawing notes per scene:
    1. Ignition: the Beacon prop swaps to a lit frame, a golden beam (a flat CSS strip) extends into space, and the
       screen shakes with hard offsets.
    2. The flight: the astronaut flock flies along the beam in V-formation while the Space props scroll past.
    3. Landfall: the blue moon slides in. The White duck walks to the pond edge and the flag pops up.
    4. The colony: glowing eggs (the space pod egg, tinted) hatch with the standard hatch animation, lily-pad domes
       switch to a lit frame, and ducks hop into the pond.
    5. Pull-back: straight slides back through the Space, Sky, and Pond backgrounds, ending on the empty pond with a
       single piece of bread floating on it.
    6. Final message: a linear fade to black, then the message in Sniglet. The game ends there.
