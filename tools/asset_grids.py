"""Image generations from docs/Assets.md, shared by gen_image.py and slice_grid.py.

Keep this file in sync with docs/Assets.md.
"""

from dataclasses import dataclass, replace


@dataclass(frozen=True)
class Cell:
    name: str  # output file stem
    prompt: str
    size: tuple[int, int] | None = None  # overrides Grid.size
    frame_of: str | None = None  # another frame of the named cell: lined up with it, same box and size


@dataclass(frozen=True)
class Grid:
    id: str
    aspect: str
    rows: int
    cols: int
    subject: str
    cells: tuple[Cell | None, ...]  # row-major, None = empty cell
    out_dir: str  # relative to public/
    size: tuple[int, int] | None  # None = keep the sliced size
    anchor: str = "bottom"  # "bottom" or "center"
    padded: bool = True  # pad to `size` at the anchor, or only scale to fit inside it
    shared_frame: bool = False  # crop every cell with one shared box, so sizes and positions match
    frame_rows: bool = False  # each column is one subject and each row one of its animation frames
    opaque: bool = False  # level background: no grid, cropped to the aspect of `size`, at most `size`, saved as JPEG

    @property
    def background(self) -> str:
        return "opaque" if self.opaque else "transparent"


DUCKS = (
    ("white", "white duck"),
    ("teal", "teal duck"),
    ("tan", "tan duck"),
    ("chestnut", "chestnut-brown duck"),
    ("dark_brown", "dark brown duck"),
)

DUCK_RULES = ("All ducks are the ducks from the reference image, with orange bills and feet, facing right, "
              "drawn at the same size.")


def _cells(*items: tuple | None) -> tuple[Cell | None, ...]:
    return tuple(Cell(*item) if item else None for item in items)


def _duck_frames(suffix: str, frames: tuple[str, str], description: str) -> tuple[Cell, ...]:
    return tuple(Cell(f"{color}_{suffix}_{frame_number}", f"{label}, {description}, {frame}")
                 for frame_number, frame in enumerate(frames, start=1)
                 for color, label in DUCKS)


def _background(grid_id: str, name: str, prompt: str) -> Grid:
    return Grid(grid_id, "16:9", 1, 1, prompt, (Cell("bg", prompt),), f"assets/{name}", (1920, 1080),
                opaque=True)


def _props(grid_id: str, level: str, anchor: str, *items: tuple | None) -> Grid:
    completion_size = (512, 512)
    cells = tuple(replace(cell, size=completion_size) if cell and index == 4 else cell
                  for index, cell in enumerate(_cells(*items)))
    return Grid(grid_id, "1:1", 3, 3,
                f"Game props for the {level} level. Props are about the size of a duck, except cell 5, "
                f"which fills its cell.",
                cells, f"assets/{level.lower()}", (256, 256), anchor)


GRIDS = (
    Grid("G01", "3:2", 2, 3,
         f"The five ducks from the reference image, re-rendered sitting in the same pose. {DUCK_RULES}",
         tuple(Cell(f"{color}_sit", f"{label}, sitting") for color, label in DUCKS) + (None,),
         "assets/ducks", (256, 256), shared_frame=True),
    Grid("G02", "21:9", 2, 5,
         f"Flying ducks seen from the side, two wing-flap frames per duck. {DUCK_RULES}",
         _duck_frames("fly", ("wings up", "wings down"), "flying"),
         "assets/ducks", (256, 256), "center", shared_frame=True, frame_rows=True),
    Grid("G03", "21:9", 2, 5,
         f"Astronaut ducks floating in space: white space suit, round glass helmet with the bill clearly visible "
         f"through it, and a small chest patch in the duck's color. Two frames per duck. {DUCK_RULES}",
         _duck_frames("astro", ("wings and feet tucked in", "wings and feet spread out"), "astronaut"),
         "assets/ducks", (256, 256), "center", shared_frame=True, frame_rows=True),
    Grid("G04", "4:3", 3, 4,
         "Eggs and hatching frames. Each row is one egg; the columns are: whole egg upright, the same egg with a "
         "zigzag crack around the middle, the top half of the shell alone with a jagged lower edge, the bottom "
         "half of the shell alone with a jagged upper edge.",
         tuple(Cell(f"{egg}_{frame}", f"{description}, {frame_prompt}")
               for egg, description in (("reed", "speckled cream duck egg"),
                                        ("cloud", "pale white-blue egg with cloud swirls"),
                                        ("pod", "rounded metallic capsule egg"))
               for frame, frame_prompt in (("intact", "whole, upright"),
                                           ("cracked", "with a zigzag crack around the middle"),
                                           ("shell_top", "top half of the shell only"),
                                           ("shell_bottom", "bottom half of the shell only"))),
         "assets/eggs", (128, 128), shared_frame=True),
    Grid("G05", "3:2", 1, 1,
         "One fluffy white cloud exactly like the foreground clouds in the reference image, with a fairly flat "
         "bottom a duck can sit on.",
         _cells(("cloud", "fluffy white cloud")),
         "assets/sky", (768, 768), "center", padded=False),
    _background("G06", "pond",
                "A calm pond seen slightly from above, a grassy shore, reeds and lily pads at the edges, and open "
                "water in the middle."),
    _background("G07", "sky",
                "A saturated blue sky like the reference, with cirrus streaks, distant cumulus clouds, storm clouds "
                "at one edge, and a soft sun glow."),
    _background("G08", "space",
                "A deep starfield with a soft rounded planet and a colorful nebula. Not photorealistic."),
    _props("G09", "Pond", "bottom",
           ("bread_conveyor", "small wooden conveyor belt carrying bread pieces"),
           ("reed_nursery", "round empty reed nest"),
           ("duckweed_farm", "floating raft of green duckweed with tiny sprouts"),
           ("worm_shower", "watering can tipping out wriggly worms"),
           ("flight", "wooden launch ramp with a striped windsock"),
           ("bread", "single slice of bread"),
           ("lily_pad", "lily pad with a pink flower"),
           ("reed_clump", "clump of reeds and cattails"),
           ("ripple", "flat oval water ripple ring, seen from slightly above")),
    _props("G10", "Sky", "bottom",
           ("crumb_cannon", "small brass cannon with a bag of crumbs"),
           ("cloud_incubator", "empty cloud-shaped nest"),
           ("v_formation", "floating ring buoy with a V-shaped flag"),
           ("insect_swarm_net", "butterfly net on a pole with a few insects"),
           ("stratosphere_gate", "tall round archway gate with golden trim"),
           ("small_cloud", "small puffy cloud"),
           ("balloon", "small hot-air balloon"),
           ("kite", "diamond kite with a tail"),
           None),
    _props("G11", "Space", "center",
           ("starseed_feeder", "rounded space feeder dispensing glowing seeds"),
           ("zero_g_egg_pod", "empty floating cradle pod"),
           ("orbital_duckweed_garden", "small ring-shaped orbital greenhouse with duckweed"),
           ("quasar_core", "glowing spherical energy core in a metal frame"),
           ("galactic_beacon", "tall beacon tower with a dish on top, unlit"),
           ("galactic_beacon_lit", "the same beacon tower, its dish lit up golden", None, "galactic_beacon"),
           ("star", "rounded five-point star"),
           ("asteroid", "lumpy rounded asteroid"),
           ("satellite", "small satellite with solar panels")),
    Grid("G12", "1:1", 4, 4,
         "Game icons, each a single bold object readable at 48 px.",
         _cells(("pond_1", "bread on a conveyor belt"), ("pond_2", "reed nest with an egg"),
                ("pond_3", "duckweed leaves"), ("pond_4", "worm"),
                ("sky_1", "cannon firing crumbs"), ("sky_2", "cloud nest with an egg"),
                ("sky_3", "three birds in V-formation"), ("sky_4", "butterfly net"),
                ("space_1", "glowing seed"), ("space_2", "egg pod capsule"),
                ("space_3", "orbital ring with green leaves"), ("space_4", "glowing energy core"),
                ("pond_done", "duck taking off with wings spread"), ("sky_done", "golden archway gate"),
                ("space_done", "beacon tower with a golden beam"), ("quack", "golden coin with a feather on it")),
         "assets/icons", (128, 128), "center"),
    Grid("G13", "1:1", 3, 3,
         "Game HUD pieces in the style of the reference HUD: flat colors with a single highlight line, no glass "
         "sheen. Dark teal with gold borders.",
         _cells(("panel", "dark teal rounded rectangle panel with a gold border"),
                ("card_gold", "larger rounded card with a thick gold frame and a dark teal inside"),
                ("button", "round teal icon button with a gold ring, empty in the middle"),
                ("button_down", "the same button pressed: darker, highlight line moved down"),
                ("button_off", "the same button disabled: gray-teal"),
                ("bar_track", "empty horizontal progress bar track with rounded ends"),
                ("bar_fill", "teal horizontal progress bar fill with rounded ends"),
                ("frenzy_marker", "small round badge with a honking goose head"),
                ("honk_burst", 'comic starburst with the word "HONK!" in it')),
         "assets/hud", None, "center"),
    Grid("G14", "1:1", 2, 2,
         "Props for the game's ending in space.",
         (Cell("moon", "small blue moon with a glowing pond on top, seen from the side", (768, 768)),
          Cell("flag", "tiny flag on a pole with a duck footprint on it"),
          Cell("dome_off", "glass dome on a lily pad, unlit"),
          Cell("dome_on", "the same glass dome on a lily pad, lit with a warm glow", frame_of="dome_off")),
         "assets/outro", (256, 256)),
)

GRIDS_BY_ID = {grid.id: grid for grid in GRIDS}
