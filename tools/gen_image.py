"""Generate one image from docs/Assets.md with the OpenRouter image API (see docs/Graphics.md §2).

Saves the raw result as tools/raw/<id>.png and appends the cost to tools/raw/log.jsonl.
The API key is read from openrouter_key.txt and is never printed.

    .venv/bin/python tools/gen_image.py G01 --dry-run   # show the prompt, send nothing
    .venv/bin/python tools/gen_image.py G01
"""

import argparse
import base64
import io
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image

from asset_grids import GRIDS_BY_ID, Grid

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "tools" / "raw"
KEY_FILE = ROOT / "openrouter_key.txt"
REFERENCE = ROOT / "docs" / "reference.png"
API_URL = "https://openrouter.ai/api/v1/images"
MODEL = "openai/gpt-image-2.5-sunburst"
TIMEOUT_SECONDS = 600

STYLE = ("Use the attached image only as a style reference: copy its soft, rounded, glossy 3D-rendered look, "
         "saturated colors, and lighting. Do not copy its content or layout.")
GRID_RULES = ("Draw a sprite sheet: an evenly spaced grid of {rows} rows by {cols} columns on a fully transparent "
              "background. Leave a wide empty gutter between cells. Put exactly one object in each cell, centered "
              "and fully inside the cell. Use the same scale and the same soft light from the top left in every "
              "cell. No labels, no cell borders or grid lines, no ground shadows, and no text unless a cell asks "
              "for it.")
SINGLE_RULES = "One object, centered, on a fully transparent background. No text and no ground shadow."
BACKGROUND_RULES = ("A game level background, landscape, opaque. No ducks, characters, or text. Keep important "
                    "content in the center third, and keep the bottom quarter calm and simple because UI sits "
                    "over it.")


def build_prompt(grid: Grid) -> str:
    if grid.opaque:
        return f"{STYLE}\n\n{BACKGROUND_RULES}\n\n{grid.subject}"
    if len(grid.cells) == 1:
        return f"{STYLE}\n\n{SINGLE_RULES}\n\n{grid.subject}"
    cell_lines = "\n".join(f"{number}. {cell.prompt if cell else 'Leave this cell completely empty.'}"
                           for number, cell in enumerate(grid.cells, start=1))
    return (f"{STYLE}\n\n{GRID_RULES.format(rows=grid.rows, cols=grid.cols)}\n\n{grid.subject}\n\n"
            f"Cells in reading order (left to right, top to bottom):\n{cell_lines}")


def build_request(grid: Grid) -> dict:
    return {
        "model": MODEL,
        "prompt": build_prompt(grid),
        "aspect_ratio": grid.aspect,
        "background": grid.background,
        "quality": "high",
    }


def reference_data_url() -> str:
    return "data:image/png;base64," + base64.b64encode(REFERENCE.read_bytes()).decode()


def read_key() -> str:
    if not KEY_FILE.exists():
        sys.exit(f"Missing {KEY_FILE.name} in the repository root.")
    return KEY_FILE.read_text().strip()


def post(request: dict, key: str) -> dict:
    http_request = urllib.request.Request(
        API_URL, data=json.dumps(request).encode(), method="POST",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(http_request, timeout=TIMEOUT_SECONDS) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        sys.exit(f"HTTP {error.code}: {error.read().decode(errors='replace')}")


def save_raw(grid: Grid, response: dict) -> Path:
    image = Image.open(io.BytesIO(base64.b64decode(response["data"][0]["b64_json"])))
    RAW.mkdir(parents=True, exist_ok=True)
    path = RAW / f"{grid.id}.png"
    image.save(path)
    return path


def log_generation(grid: Grid, path: Path, response: dict) -> None:
    with Image.open(path) as image:
        entry = {"id": grid.id, "time": time.strftime("%Y-%m-%dT%H:%M:%S"), "size": image.size,
                 "mode": image.mode, "cost": response.get("usage", {}).get("cost")}
    with (RAW / "log.jsonl").open("a") as log:
        log.write(json.dumps(entry) + "\n")
    print(json.dumps(entry))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("id", choices=sorted(GRIDS_BY_ID))
    parser.add_argument("--dry-run", action="store_true", help="print the request without sending it")
    parser.add_argument("--force", action="store_true", help="overwrite an existing raw image")
    args = parser.parse_args()

    grid = GRIDS_BY_ID[args.id]
    request = build_request(grid)
    if args.dry_run:
        print(json.dumps(request, indent=2))
        return
    if (RAW / f"{grid.id}.png").exists() and not args.force:
        sys.exit(f"tools/raw/{grid.id}.png already exists; pass --force to generate it again.")

    request["input_references"] = [{"type": "image_url", "image_url": {"url": reference_data_url()}}]
    response = post(request, read_key())
    path = save_raw(grid, response)
    log_generation(grid, path, response)


if __name__ == "__main__":
    main()
