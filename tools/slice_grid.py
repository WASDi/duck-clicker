"""Slice raw generations from tools/raw/ into game sprites (see docs/Assets.md).

Cell borders are placed in the emptiest column or row near each expected border, so the grid does not need to be
pixel-exact. Animation frames (frame_rows grids) are lined up by the overlap of their silhouettes. Each sprite is
trimmed (to one box shared by the whole grid for shared_frame grids), scaled, and padded to its target size at the
grid's anchor.

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
REGISTER_REACH = 0.2  # how far frames may be shifted to line up, as a fraction of the cell size
REGISTER_STEP = 4  # downsampling factor for the coarse frame alignment search

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


def cut_cells(image: Image.Image, grid: Grid) -> dict[Cell, Image.Image]:
    """Return each non-empty cell's full cell image, warning about empty cells and cut-off content."""
    mask = np.asarray(image)[..., 3] > 0
    cells: dict[Cell, Image.Image] = {}
    for cell, box in zip(grid.cells, cell_boxes(mask, grid)):
        if cell is None:
            continue
        cell_image = image.crop(box)
        content = cell_image.getbbox()
        if content is None:
            print(f"  warning: {cell.name} is empty", file=sys.stderr)
            continue
        if content[0] == 0 or content[1] == 0 or content[2] == cell_image.width or content[3] == cell_image.height:
            print(f"  warning: {cell.name} touches its cell edge and may be cut off", file=sys.stderr)
        cells[cell] = cell_image
    return cells


def silhouette(cell_image: Image.Image, shape: tuple[int, int], margin: int) -> np.ndarray:
    """Return the cell's opaque pixels on an empty array of `shape`, offset by `margin` on each side."""
    alpha = np.asarray(cell_image)[..., 3] > 0
    padded = np.zeros(shape, dtype=bool)
    padded[margin:margin + alpha.shape[0], margin:margin + alpha.shape[1]] = alpha
    return padded


def overlap(reference: np.ndarray, moving: np.ndarray, dx: int, dy: int) -> float:
    shifted = np.roll(moving, (dy, dx), axis=(0, 1))
    return (reference & shifted).sum() / max(1, (reference | shifted).sum())


def best_offset(reference: np.ndarray, moving: np.ndarray, center: tuple[int, int], reach: int) -> tuple[int, int]:
    steps = range(-reach, reach + 1)
    candidates = [(center[0] + dx, center[1] + dy) for dx in steps for dy in steps]
    return max(candidates, key=lambda offset: overlap(reference, moving, *offset))


def register(reference: Image.Image, moving: Image.Image) -> tuple[int, int]:
    """Return the (dx, dy) shift that best lines up `moving`'s silhouette with `reference`'s."""
    margin = round(max(reference.width, reference.height) * REGISTER_REACH)
    shape = (max(reference.height, moving.height) + 2 * margin, max(reference.width, moving.width) + 2 * margin)
    reference_mask, moving_mask = silhouette(reference, shape, margin), silhouette(moving, shape, margin)
    step = REGISTER_STEP
    coarse = best_offset(reference_mask[::step, ::step], moving_mask[::step, ::step], (0, 0), margin // step)
    return best_offset(reference_mask, moving_mask, (coarse[0] * step, coarse[1] * step), step)


def frame_offsets(grid: Grid, cells: dict[Cell, Image.Image]) -> dict[Cell, tuple[int, int]]:
    """Line up each row's frame with the first row's frame of the same column."""
    offsets = dict.fromkeys(cells, (0, 0))
    for col in range(grid.cols):
        column = [grid.cells[row * grid.cols + col] for row in range(grid.rows)]
        reference = column[0]
        for cell in column[1:]:
            if reference in cells and cell in cells:
                offsets[cell] = register(cells[reference], cells[cell])
    return offsets


def crop_to_shared_box(cells: dict[Cell, Image.Image], offsets: dict[Cell, tuple[int, int]]) -> dict[Cell, Image.Image]:
    """Shift every cell by its offset onto one canvas size, then crop all of them with one shared box."""
    margin = max(max(abs(dx), abs(dy)) for dx, dy in offsets.values())
    size = (max(image.width for image in cells.values()) + 2 * margin,
            max(image.height for image in cells.values()) + 2 * margin)
    placed = {}
    for cell, image in cells.items():
        canvas = Image.new("RGBA", size)
        canvas.paste(image, (margin + offsets[cell][0], margin + offsets[cell][1]))
        placed[cell] = canvas
    boxes = [image.getbbox() for image in placed.values()]
    shared = (min(box[0] for box in boxes), min(box[1] for box in boxes),
              max(box[2] for box in boxes), max(box[3] for box in boxes))
    return {cell: image.crop(shared) for cell, image in placed.items()}


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
    cells = cut_cells(clean_alpha(image), grid)
    if grid.shared_frame:
        offsets = frame_offsets(grid, cells) if grid.frame_rows else dict.fromkeys(cells, (0, 0))
        sprites = crop_to_shared_box(cells, offsets)
    else:
        sprites = {cell: cell_image.crop(cell_image.getbbox()) for cell, cell_image in cells.items()}
    if grid.size is None:
        return {cell.name: sprite for cell, sprite in sprites.items()}
    return {cell.name: place(sprite, fit_scale(sprite, cell.size or grid.size), cell.size or grid.size, grid)
            for cell, sprite in sprites.items()}


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
