"""Prepare optional wedding tiles, without changing assets/manifest.json.

python tools/prepare_wedding_tiles.py
Inputs: raw/tiles/wedding/*.png (or existing final PNGs on fresh checkouts).
Outputs: assets/tiles/wedding/*.png, manifest.json, preview.png.
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "raw" / "tiles" / "wedding"
OUT = ROOT / "assets" / "tiles" / "wedding"
TILES = [
    ("A", "aisle-ivory", "아이보리 버진로드", ["y"]),
    ("B", "aisle-petals", "꽃잎 버진로드", ["y"]),
    ("C", "aisle-entrance", "버진로드 입구", []),
    ("E", "rose-petal-grass", "장미 꽃잎 잔디", ["x", "y"]),
    ("M", "ivory-marble", "아이보리 대리석", ["x", "y"]),
    ("L", "blush-carpet", "블러시 핑크 카펫", ["x", "y"]),
]


def validate(image, path):
    if image.mode != "RGBA" or image.size != (32, 32):
        raise ValueError(f"Expected 32x32 RGBA: {path}")
    if image.getchannel("A").getextrema() != (255, 255):
        raise ValueError(f"Floor tile must be fully opaque: {path}")


def preview():
    sheet = Image.new("RGB", (672, 488), "#fff4df")
    draw = ImageDraw.Draw(sheet)
    for index, (tile_id, name, _, axes) in enumerate(TILES):
        x, y = (index % 3) * 224, (index // 3) * 244
        with Image.open(OUT / f"{name}.png") as source:
            tile = source.convert("RGB").resize((64, 64), Image.Resampling.NEAREST)
        if axes == ["x", "y"]:
            for ty in range(3):
                for tx in range(3):
                    sheet.paste(tile, (x + 16 + tx * 64, y + 8 + ty * 64))
        else:
            for ty in range(3):
                if name == "aisle-entrance" and ty < 2:
                    with Image.open(OUT / "aisle-ivory.png") as source:
                        segment = source.convert("RGB").resize((64, 64), Image.Resampling.NEAREST)
                else:
                    segment = tile
                sheet.paste(segment, (x + 80, y + 8 + ty * 64))
        draw.text((x + 12, y + 209), f"{tile_id}  {name}", fill="#352b34")
        draw.text((x + 12, y + 225), "repeat: " + ("+".join(axes) if axes else "entrance cap"), fill="#6a5956")
    sheet.save(OUT / "preview.png")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    entries = []
    for tile_id, name, label, axes in TILES:
        raw, final = RAW / f"{name}.png", OUT / f"{name}.png"
        if raw.exists():
            with Image.open(raw) as source:
                image = source.convert("RGBA").resize((32, 32), Image.Resampling.LANCZOS)
            validate(image, raw)
            image.save(final)
        elif final.exists():
            with Image.open(final) as image:
                validate(image, final)
        else:
            raise SystemExit(f"Missing tile: {raw.relative_to(ROOT)} (and no prepared PNG)")
        entries.append({"suggested_id": tile_id, "name": name, "label": label,
                        "file": f"{name}.png", "repeat_axes": axes})
        print(f"wedding tile {tile_id}: {name} 32x32 RGBA")
    manifest = {
        "schema_version": 1, "tile_size": 32, "registered_in_game": False,
        "note": "Prepared asset library only. Current JS does not register these IDs.",
        "prompts": "prompts.json", "tiles": entries,
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    preview()
    print("Created wedding manifest and preview; assets/manifest.json was not changed.")


if __name__ == "__main__":
    main()
