"""Prepare rounds 5/6 only; never transform character PNGs.

python tools/prepare_interior_assets.py
AI sources: raw/round56-source/. One-time backups: raw/round56-backup/.
Uses prepare_assets.py in an isolated output directory, then merges the manifest.
"""
import hashlib
import json
from pathlib import Path
import shutil
import tempfile

from PIL import Image, ImageDraw
import prepare_assets as prepare

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "raw" / "round56-source"
BACKUP = ROOT / "raw" / "round56-backup"
ASSETS = ROOT / "assets"
JOBS = [
    ("tiles", "D", (32, 32)), ("tiles", "K", (32, 32)), ("tiles", "M", (32, 32)), ("tiles", "H", (32, 32)),
    ("objects", "door", (32, 32)), ("objects", "flower", (32, 48)),
    ("objects", "window", (64, 64)), ("objects", "plant", (32, 64)),
    ("objects", "sign", (64, 64)), ("objects", "platform", (160, 64)),
]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def backup(path):
    destination = BACKUP / path.relative_to(ROOT)
    if path.exists() and not destination.exists():
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, destination)


def preview():
    sheet = Image.new("RGB", (896, 600), "#fff4df")
    draw = ImageDraw.Draw(sheet)
    for index, (group, name, size) in enumerate(JOBS):
        x, y = index % 4 * 224, index // 4 * 200
        with Image.open(ASSETS / group / f"{name}.png") as image:
            image = image.convert("RGBA")
            if group == "tiles":
                tile = image.convert("RGB").resize((64, 64), Image.Resampling.NEAREST)
                for row in range(2):
                    for col in range(2):
                        sheet.paste(tile, (x + 48 + col * 64, y + 8 + row * 64))
            else:
                scale = min(2, 192 / image.width, 128 / image.height)
                large = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.NEAREST)
                sheet.paste(large, (x + (224 - large.width) // 2, y + 140 - large.height), large)
        draw.text((x + 16, y + 158), name, fill="#352b34")
        draw.text((x + 16, y + 177), f"{size[0]}x{size[1]}", fill="#6a5956")
    sheet.save(ASSETS / "round56-preview.png")


def main():
    for _, name, _ in JOBS:
        if name != "H" and not (SOURCE / f"{name}.png").exists():
            raise SystemExit(f"Missing source: {SOURCE / (name + '.png')}")
    manifest_path = ASSETS / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    selected = {(group, name) for group, name, _ in JOBS}
    untouched = {ASSETS / group / f"{name}.png": digest(ASSETS / group / f"{name}.png")
                 for group, names in manifest.items() for name in names if (group, name) not in selected}
    for group, name, _ in JOBS:
        target = ROOT / "raw" / group / f"{name}.png"
        backup(target)
        backup(ASSETS / group / f"{name}.png")
        target.parent.mkdir(parents=True, exist_ok=True)
        source = ASSETS / "tiles" / "G.png" if name == "H" else SOURCE / f"{name}.png"
        with Image.open(source) as image:
            if name == "H":
                # Explicit round-6 requirement: identical grass pattern, 12.5% darker.
                image = image.convert("RGB").point(lambda value: (value * 7 + 4) // 8)
            image = image.convert("RGBA")
            if group == "objects":
                image.putalpha(image.getchannel("A").point(lambda a: 0 if a < 16 else a))
            image.save(target)
    # Keep the older optional library source consistent with canonical raw/tiles/M.png.
    old_marble = ROOT / "raw" / "tiles" / "wedding" / "ivory-marble.png"
    backup(old_marble)
    old_marble.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ROOT / "raw" / "tiles" / "M.png", old_marble)
    report = []
    with tempfile.TemporaryDirectory(prefix="round56-", dir=ROOT / "raw") as temporary:
        stage = Path(temporary).resolve()
        if not stage.is_relative_to((ROOT / "raw").resolve()):
            raise ValueError("Staging must stay within workspace raw/")
        prepare.OUT = stage
        prepare.CHARACTERS = []
        prepare.TILES = ["D", "K", "M", "H"]
        prepare.WEDDING_TILES = {}
        prepare.OBJECT_SIZES = {name: size for group, name, size in JOBS if group == "objects"}
        prepare.MAP_SIZES = {}
        prepare.SKIP_EXISTING = False
        prepare.main()
        for group, name, expected in JOBS:
            with Image.open(stage / group / f"{name}.png") as image:
                if image.mode != "RGBA" or image.size != expected:
                    raise ValueError(f"Unexpected output: {name} {image.mode} {image.size}")
                alpha = image.getchannel("A")
                bbox = alpha.getbbox()
                if not bbox:
                    raise ValueError(f"Empty asset: {name}")
                if group == "tiles" and alpha.getextrema() != (255, 255):
                    raise ValueError(f"Floor/wall tile must be opaque: {name}")
                if group == "objects" and (alpha.getextrema()[0] != 0 or bbox[3] != image.height):
                    raise ValueError(f"Object must be transparent and bottom-aligned: {name}")
                if name == "platform" and bbox[2] - bbox[0] < 136:
                    raise ValueError("Platform must have a broad top for two characters")
                report.append({"group": group, "name": name, "size": list(image.size),
                               "alpha_bbox": list(bbox), "alpha_extrema": list(alpha.getextrema())})
        for group, name, _ in JOBS:
            shutil.copyfile(stage / group / f"{name}.png", ASSETS / group / f"{name}.png")
            if name not in manifest[group]:
                manifest[group].append(name)
    for path, old in untouched.items():
        if digest(path) != old:
            raise ValueError(f"Unrelated asset changed: {path}")
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    result = {"assets": report, "characters_processed": 0, "untouched_asset_count": len(untouched),
              "marble_raw_path": "raw/tiles/M.png", "wall_repeat_axes": ["x"],
              "H": {"base": "assets/tiles/G.png", "brightness_factor": 0.875,
                    "method": "RGB channels scaled by 7/8, alpha kept opaque; no flowers"}}
    (ASSETS / "round56-report.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    preview()
    for asset in report:
        print(asset["name"], asset["size"], "alpha bbox", asset["alpha_bbox"])
    print(f"Preserved {len(untouched)} unrelated PNGs; converted 0 characters.")


if __name__ == "__main__":
    main()
