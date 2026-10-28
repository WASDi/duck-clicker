# Duck Clicker — Image Asset Manifest

This is the exact list of image generations from `Graphics.md` §3: what each grid contains, how it is laid out, and
where each sliced sprite is saved. `tools/gen_image.py` and `tools/slice_grid.py` follow this file.

## 1. Common rules

- **Model:** `openai/gpt-image-2.5-sunburst` via `POST https://openrouter.ai/api/v1/images`.
- **Style reference:** every request passes `docs/reference.png` in `input_references`. The prompt says to copy its
  style only, not its content or layout.
- **Background:** `transparent` for everything except the level backgrounds (`opaque`).
- **Quality:** `high`.
- **Grid prompt rules:** an evenly spaced grid of the stated rows × columns, a wide empty gutter between cells, one
  object per cell centered and fully inside it, same scale and lighting (soft light from the top left) in every cell,
  no text, no labels, no cell borders, and no ground shadows.
- **Raw outputs** are committed as `tools/raw/<grid id>.png`, so sprites can be sliced again without new generations.
- **Slicing:** `slice_grid.py` finds cells by their transparent gutters (the output pixel size is not known in advance),
  trims each sprite, places all sprites of one group on a shared canvas with a shared anchor, and resizes them to the
  target size. Cells marked *empty* are skipped.
- **Budget:** 14 generations planned. With retries, that stays within the 10–30 limit. G01 is the first generation and
  also the test of transparency, sharpness, and grid layout. Nothing else is generated until G01 looks right.

Anchors: **bottom** = bottom center (stands or sits on something), **center** = visual center.

## 2. Generations

### G01 — Sitting ducks (Pond, Sky)

3 × 2 grid, aspect 3:2. Re-render the five reference ducks in the same sitting pose, facing right, at the same size.

| Cell | Name       | Contents                                    |
|------|------------|---------------------------------------------|
| 1    | white      | White duck (from the reference)             |
| 2    | teal       | Teal duck                                   |
| 3    | tan        | Tan duck                                    |
| 4    | chestnut   | Chestnut duck                               |
| 5    | dark_brown | Dark brown duck (top-left in the reference) |
| 6    | *empty*    |                                             |

Output: `assets/ducks/<name>_sit.png`, 256 × 256, anchor bottom.

### G02 — Flying ducks

5 × 2 grid, aspect 21:9. Columns are the five colors in G01 order. Row 1 has wings up, row 2 has wings down. Side view,
facing right, same scale as G01.

Output: `assets/ducks/<color>_fly_1.png`, `<color>_fly_2.png`, 256 × 256, anchor center.

### G03 — Astronaut ducks (Space)

5 × 2 grid, aspect 21:9. Columns are the five colors in G01 order. Each duck floats in a white space suit with a
round glass helmet, a small patch on the chest in the duck's color, and its bill clearly visible through the
helmet. Row 1 has wings and feet tucked in, row 2 has them spread out (the two frames alternate for a slow paddle).
Facing right.

Output: `assets/ducks/<color>_astro_1.png`, `<color>_astro_2.png`, 256 × 256, anchor center. The outro flight and
landfall reuse these frames.

### G04 — Eggs and hatching

4 × 3 grid, aspect 4:3. One row per egg, one column per frame.

| Row     | Egg                                   |
|---------|---------------------------------------|
| 1. reed | Speckled cream duck egg               |
| 2. cloud| Pale white-blue egg with cloud swirls |
| 3. pod  | Rounded metallic capsule egg          |

| Column          | Frame                                            |
|-----------------|--------------------------------------------------|
| 1. intact       | Whole egg, upright                               |
| 2. cracked      | Same egg with a zigzag crack around the middle   |
| 3. shell_top    | Top half of the shell alone, jagged lower edge   |
| 4. shell_bottom | Bottom half of the shell alone, jagged upper edge |

Output: `assets/eggs/<egg>_<frame>.png`, 128 × 128, anchor bottom. The outro's glowing eggs are the pod egg tinted in
CSS.

### G05 — Cloud

One fluffy cloud, exactly like the foreground clouds in the reference, with a flat-ish bottom a duck can sit on.
Aspect 3:2.

Output: `assets/sky/cloud.png`, 768 px wide, anchor center.

### G06–G08 — Level backgrounds

Aspect 16:9, opaque, no ducks or upgrade props. Important content stays in the center third, and the lower quarter is
calm (UI sits over it).

| Id  | Name  | Contents                                                                                       |
|-----|-------|------------------------------------------------------------------------------------------------|
| G06 | pond  | Calm pond seen slightly from above, grassy shore, reeds and lily pads at the edges, open water in the middle |
| G07 | sky   | Saturated blue sky like the reference, plus cirrus streaks, distant cumulus, storm clouds at one edge, and a sun glow |
| G08 | space | Deep starfield, a soft rounded planet, and a colorful nebula, not photorealistic               |

Output: `assets/<name>/bg.jpg` (JPEG), cropped to 16:9 at the generated resolution and never scaled up (at most
1920 × 1080). The browser scales it to the screen.

### G09–G11 — Level props

3 × 3 grid, aspect 1:1, one per level. Props are drawn at roughly the size of a duck, except the completion prop,
which fills its cell.

**G09 Pond**

| Cell | Name           | Contents                                                     |
|------|----------------|--------------------------------------------------------------|
| 1    | bread_conveyor | Small wooden conveyor belt carrying bread pieces             |
| 2    | reed_nursery   | Round reed nest (empty, eggs are drawn on top)               |
| 3    | duckweed_farm  | Floating raft of green duckweed with tiny sprouts            |
| 4    | worm_shower    | Watering can tipping out wriggly worms                       |
| 5    | flight         | Wooden launch ramp with a striped windsock                   |
| 6    | bread          | Single slice of bread (Golden Bread base and outro bread)    |
| 7    | lily_pad       | Lily pad with a pink flower                                  |
| 8    | reed_clump     | Clump of reeds and cattails                                  |
| 9    | ripple         | Flat oval water ripple ring, seen from slightly above        |

**G10 Sky**

| Cell | Name                | Contents                                                |
|------|---------------------|---------------------------------------------------------|
| 1    | crumb_cannon        | Small brass cannon with a bag of crumbs                 |
| 2    | cloud_incubator     | Cloud-shaped nest (empty, eggs are drawn on top)        |
| 3    | v_formation         | Floating ring buoy with a V-shaped flag                 |
| 4    | insect_swarm_net    | Butterfly net on a pole with a few insects              |
| 5    | stratosphere_gate   | Tall round archway gate with golden trim                |
| 6    | small_cloud         | Small puffy cloud (Golden Cloud base)                   |
| 7    | balloon             | Small hot-air balloon (scenery)                         |
| 8    | kite                | Diamond kite with a tail (scenery)                      |
| 9    | *empty*             |                                                         |

**G11 Space**

| Cell | Name                    | Contents                                               |
|------|-------------------------|--------------------------------------------------------|
| 1    | starseed_feeder         | Rounded space feeder dispensing glowing seeds          |
| 2    | zero_g_egg_pod          | Floating cradle pod (empty, eggs are drawn on top)     |
| 3    | orbital_duckweed_garden | Small ring-shaped orbital greenhouse with duckweed     |
| 4    | quasar_core             | Glowing spherical energy core in a metal frame         |
| 5    | galactic_beacon         | Tall beacon tower with a dish on top, unlit            |
| 6    | galactic_beacon_lit     | Same beacon, the dish lit up golden                    |
| 7    | star                    | Rounded five-point star (Golden Star base)             |
| 8    | asteroid                | Lumpy rounded asteroid (scenery)                       |
| 9    | satellite               | Small satellite with solar panels (scenery)            |

Output: `assets/<level>/<name>.png`, 256 × 256 (completion props 512 × 512), anchor bottom (Space: center).

### G12 — Icons

4 × 4 grid, aspect 1:1. Each icon is a single object on a transparent background, readable at 48 px.

| Row | Cells                                                                              |
|-----|------------------------------------------------------------------------------------|
| 1   | pond_1 Bread Conveyor, pond_2 Reed Nursery, pond_3 Duckweed Farm, pond_4 Worm Shower |
| 2   | sky_1 Cloud Crumb Cannon, sky_2 Cloud Incubator, sky_3 V-Formation Training, sky_4 Insect Swarm Net |
| 3   | space_1 Starseed Feeder, space_2 Zero-G Egg Pod, space_3 Orbital Duckweed Garden, space_4 Quasar Core |
| 4   | pond_done Flight, sky_done Stratosphere Gate, space_done Galactic Beacon, quack (a golden feather coin) |

Output: `assets/icons/<name>.png`, 128 × 128, anchor center.

### G13 — HUD kit

3 × 3 grid, aspect 1:1. Flat colors with one highlight line, no glass sheen (`Graphics.md` §1).

| Cell | Name          | Contents                                                                 |
|------|---------------|--------------------------------------------------------------------------|
| 1    | panel         | Dark teal rounded panel with a gold border (9-slice)                     |
| 2    | card_gold     | Larger gold-framed card for the completion upgrade (9-slice)             |
| 3    | button        | Round teal icon button with a gold ring, normal                          |
| 4    | button_down   | Same button, pressed (darker, highlight line moved down)                 |
| 5    | button_off    | Same button, disabled (gray-teal)                                        |
| 6    | bar_track     | Empty horizontal progress bar track with rounded caps (3-slice)          |
| 7    | bar_fill      | Teal progress bar fill with rounded caps (3-slice)                       |
| 8    | frenzy_marker | Small round goose-honk badge                                             |
| 9    | honk_burst    | Comic starburst with the word "HONK!"                                    |

Output: `assets/hud/<name>.png` at the sliced size (no resize). The 9-slice and 3-slice insets are measured after
slicing and stored in CSS.

### G14 — Outro

2 × 2 grid, aspect 1:1.

| Cell | Name      | Contents                                                 |
|------|-----------|----------------------------------------------------------|
| 1    | moon      | Small blue moon with a glowing pond on top, seen from the side |
| 2    | flag      | Tiny flag on a pole with a duck footprint                |
| 3    | dome_off  | Lily-pad dome (glass dome on a lily pad), unlit          |
| 4    | dome_on   | Same dome, lit with a warm glow                          |

Output: `assets/outro/<name>.png`, moon 768 px wide, others 256 × 256, anchor bottom.

## 3. Drawn in CSS, not generated

- Golden look of the Golden Items (gold tint/filter on the base sprite).
- Outro golden beam, glowing-egg tint, screen shake, and fade to black.
- Pond water strip in front of the ducks (flat shape with a scrolling wave edge); ripples use the `ripple` sprite.
- Upgrade pips, the MAX check, the hatch timer ring, and the Frenzy meter.
- Star twinkle in Space (scaled and blinked copies of small dots).
