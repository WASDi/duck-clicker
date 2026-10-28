"""Slice raw generations from tools/raw/ into game sprites (see docs/Assets.md).

Cell borders are placed in the emptiest column or row near each expected border, so the grid does not need to be
pixel-exact. Each sprite is trimmed, scaled, and padded to its target size at the grid's anchor.

    .venv/bin/python tools/slice_grid.py G01 G02
    .venv/bin/python tools/slice_grid.py --all
"""

import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image

from asset_grids import GRIDS, GRIDS_BY_ID, Cell, Grid

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "tools" / "raw"
ALPHA_THRESHOLD = 16  # alpha values at or below this count as empty and are cleared (removes faint glow)
ALPHA_SOLID = 250  # alpha values at or above this are made fully opaque (the model tops out just below 255)
BORDER_SEARCH = 0.25  # how far from the expected border to search, as a fraction of the cell size

Box = tuple[int, int, int, int]  # left, top, right, bottom


def find_borders(coverage: np.ndarray, cells: int) -> list[int]:
    """Return cells + 1 border positions along one axis, given the opaque pixel count per column or row."""
    length = len(coverage)
    cell_size = length / cells
    reach = int(cell_size * BORDER_SEARCH)
    borders = [0]
    for index in range(1, cells):
        expected = round(index * cell_size)
        window = range(expected - reach, expected + reach + 1)
        borders.append(min(window, key=lambda position: (coverage[position], abs(position - expected))))
    borders.append(length)
    return borders


def cell_boxes(mask: np.ndarray, grid: Grid) -> list[Box]:
    xs = find_borders(mask.sum(axis=0), grid.cols)
    ys = find_borders(mask.sum(axis=1), grid.rows)
    return [(xs[col], ys[row], xs[col + 1], ys[row + 1]) for row in range(grid.rows) for col in range(grid.cols)]


def trim(image: Image.Image, mask: np.ndarray, box: Box, name: str) -> Image.Image | None:
    left, top, right, bottom = box
    cell_mask = mask[top:bottom, left:right]
    columns = np.flatnonzero(cell_mask.any(axis=0))
    rows = np.flatnonzero(cell_mask.any(axis=1))
    if not len(columns):
        print(f"  warning: {name} is empty", file=sys.stderr)
        return None
    if columns[0] == 0 or rows[0] == 0 or columns[-1] == cell_mask.shape[1] - 1 or rows[-1] == cell_mask.shape[0] - 1:
        print(f"  warning: {name} touches its cell edge and may be cut off", file=sys.stderr)
    return image.crop((left + columns[0], top + rows[0], left + columns[-1] + 1, top + rows[-1] + 1))


def fit_scale(sprite: Image.Image, target: tuple[int, int]) -> float:
    return min(target[0] / sprite.width, target[1] / sprite.height)


def place(sprite: Image.Image, scale: float, target: tuple[int, int], grid: Grid) -> Image.Image:
    width, height = max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))
    sprite = sprite.resize((width, height), Image.Resampling.LANCZOS)
    if not grid.padded:
        return sprite
    canvas = Image.new("RGBA", target)
    x = (target[0] - width) // 2
    y = target[1] - height if grid.anchor == "bottom" else (target[1] - height) // 2
    canvas.paste(sprite, (x, y))
    return canvas


def clean_alpha(image: Image.Image) -> Image.Image:
    pixels = np.array(image.convert("RGBA"))
    alpha = pixels[..., 3]
    alpha[alpha <= ALPHA_THRESHOLD] = 0
    alpha[alpha >= ALPHA_SOLID] = 255
    return Image.fromarray(pixels)


def slice_sprites(grid: Grid, image: Image.Image) -> dict[str, Image.Image]:
    image = clean_alpha(image)
    mask = np.asarray(image)[..., 3] > 0
    sprites: dict[Cell, Image.Image] = {}
    for cell, box in zip(grid.cells, cell_boxes(mask, grid)):
        sprite = trim(image, mask, box, cell.name) if cell else None
        if sprite:
            sprites[cell] = sprite
    if grid.size is None:
        return {cell.name: sprite for cell, sprite in sprites.items()}

    scales = {cell: fit_scale(sprite, cell.size or grid.size) for cell, sprite in sprites.items()}
    if grid.uniform_scale:
        smallest = min(scales.values())
        scales = dict.fromkeys(scales, smallest)
    return {cell.name: place(sprite, scales[cell], cell.size or grid.size, grid) for cell, sprite in sprites.items()}


def cover(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Scale to fill `size` and crop the overflow equally from both sides."""
    scale = max(size[0] / image.width, size[1] / image.height)
    scaled = image.convert("RGB").resize((round(image.width * scale), round(image.height * scale)),
                                         Image.Resampling.LANCZOS)
    left, top = (scaled.width - size[0]) // 2, (scaled.height - size[1]) // 2
    return scaled.crop((left, top, left + size[0], top + size[1]))


def process(grid: Grid, raw_dir: Path, out_root: Path) -> None:
    raw_path = raw_dir / f"{grid.id}.png"
    if not raw_path.exists():
        print(f"{grid.id}: no raw image, skipped")
        return
    print(f"{grid.id}:")
    with Image.open(raw_path) as image:
        if grid.opaque:
            sprites = {grid.cells[0].name: cover(image, grid.size)}
        else:
            sprites = slice_sprites(grid, image)
    out_dir = out_root / grid.out_dir
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, sprite in sprites.items():
        path = out_dir / f"{name}.png"
        sprite.save(path, optimize=True)
        print(f"  {path.relative_to(out_root)} {sprite.width}x{sprite.height}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("ids", nargs="*", metavar="ID", help=f"one of {', '.join(GRIDS_BY_ID)}")
    parser.add_argument("--all", action="store_true", help="slice every grid that has a raw image")
    parser.add_argument("--raw-dir", type=Path, default=RAW)
    parser.add_argument("--out-root", type=Path, default=ROOT / "public")
    args = parser.parse_args()
    if not args.ids and not args.all:
        parser.error("give grid ids or --all")
    unknown = [grid_id for grid_id in args.ids if grid_id not in GRIDS_BY_ID]
    if unknown:
        parser.error(f"unknown grid ids: {', '.join(unknown)}")

    grids = GRIDS if args.all else [GRIDS_BY_ID[grid_id] for grid_id in args.ids]
    for grid in grids:
        process(grid, args.raw_dir, args.out_root)


if __name__ == "__main__":
    main()
