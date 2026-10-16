"""Prepare round 4 only, with shared grass pixels and untouched characters.

python tools/prepare_natural_garden.py
Requires generated sources in raw/round4-source/. Originals and previous results
are backed up once in raw/round4-backup/. Uses prepare_assets.py in an isolated
output directory, WITHOUT --skip-existing and WITHOUT processing characters.
"""
import hashlib
import json
from pathlib import Path
import shutil
import tempfile

from PIL import Image, ImageDraw
import prepare_assets as prepare

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "raw" / "round4-source"
BACKUP = ROOT / "raw" / "round4-backup"
ASSETS = ROOT / "assets"
GRASS = {"J": ("grass-flowers-a", "grass-flowers-a-layer"),
         "U": ("grass-flowers-b", "grass-flowers-b-layer"),
         "W": ("W", "grass-white-cluster-layer")}
JOBS = [
    ("tiles", "G", (32, 32)), ("tiles", "J", (32, 32)),
    ("tiles", "U", (32, 32)), ("tiles", "W", (32, 32)),
    ("tiles", "N", (32, 32)), ("tiles", "H", (32, 32)),
    ("objects", "tree", (96, 128)), ("objects", "arch", (224, 160)),
    ("objects", "bush-white", (64, 64)),
]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def backup(path):
    destination = BACKUP / path.relative_to(ROOT)
    if path.exists() and not destination.exists():
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, destination)


def make_raw():
    """All uncovered flower-tile pixels come from ONE generated grass master."""
    with Image.open(SOURCE / "G.png") as source:
        base = source.convert("RGBA").resize((32, 32), Image.Resampling.LANCZOS)
    if base.getchannel("A").getextrema() != (255, 255):
        raise ValueError("Grass master must be opaque")
    raw_g = ROOT / "raw" / "tiles" / "G.png"
    backup(raw_g)
    raw_g.parent.mkdir(parents=True, exist_ok=True)
    base.save(raw_g)
    checks = {}
    for tile_id, (name, layer_name) in GRASS.items():
        with Image.open(SOURCE / f"{layer_name}.png") as source:
            layer = source.convert("RGBA").resize((32, 32), Image.Resampling.LANCZOS)
        # Discard faint invisible matte pixels, keeping the actual AI flower art.
        alpha = layer.getchannel("A").point(lambda a: 0 if a < 16 else a)
        mask = alpha.tobytes()
        coverage = sum(a > 0 for a in mask)
        if not 0 < coverage <= 256:
            raise ValueError(f"{tile_id}: flowers must occupy at most 25% of the tile ({coverage}/1024)")
        layer.putalpha(alpha)
        final = Image.alpha_composite(base, layer)
        pixels, originals = final.tobytes(), base.tobytes()
        equal = all(a != 0 or pixels[i * 4:i * 4 + 4] == originals[i * 4:i * 4 + 4]
                    for i, a in enumerate(mask))
        if not equal:
            raise ValueError(f"{tile_id}: grass master changed outside flowers")
        target = ROOT / "raw" / "tiles" / ("W.png" if tile_id == "W" else f"wedding/{name}.png")
        backup(target)
        target.parent.mkdir(parents=True, exist_ok=True)
        final.save(target)
        checks[tile_id] = {"flower_pixels": coverage, "identical_background_pixels": 1024 - coverage,
                           "background_matches_G_exactly": equal}
    # Round 6 supersedes the original hedge: same grass pattern, 12.5% darker.
    hedge = base.convert("RGB").point(lambda value: (value * 7 + 4) // 8).convert("RGBA")
    raw_h = ROOT / "raw" / "tiles" / "H.png"
    backup(raw_h)
    hedge.save(raw_h)
    for source_name, target_name in [
        ("sand-path", "tiles/wedding/sand-path"),
        ("tree", "objects/tree"), ("arch", "objects/arch"), ("bush-white", "objects/bush-white"),
    ]:
        target = ROOT / "raw" / f"{target_name}.png"
        backup(target)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(SOURCE / f"{source_name}.png", target)
    return checks


def preview():
    sheet = Image.new("RGB", (672, 660), "#fff4df")
    draw = ImageDraw.Draw(sheet)
    for i, (group, name, size) in enumerate(JOBS):
        x, y = i % 3 * 224, i // 3 * 220
        with Image.open(ASSETS / group / f"{name}.png") as source:
            image = source.convert("RGBA")
        if group == "tiles":
            tile = image.convert("RGB").resize((64, 64), Image.Resampling.NEAREST)
            for row in range(2):
                for col in range(2):
                    sheet.paste(tile, (x + 48 + col * 64, y + 12 + row * 64))
        else:
            sheet.paste(image, (x + (224 - image.width) // 2, y + 166 - image.height), image)
        draw.text((x + 18, y + 171), name, fill="#352b34")
        draw.text((x + 18, y + 190), f"{size[0]}x{size[1]}", fill="#6a5956")
    sheet.save(ASSETS / "round4-preview.png")
    mix = Image.new("RGBA", (256, 256))
    names = ["G", "J", "U", "W"]
    for row in range(8):
        for col in range(8):
            with Image.open(ASSETS / "tiles" / f"{names[(row + col) % 4]}.png") as tile:
                mix.paste(tile, (col * 32, row * 32))
    mix.resize((512, 512), Image.Resampling.NEAREST).save(ASSETS / "round4-grass-mix.png")


def main():
    manifest_path = ASSETS / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    selected = {(group, name) for group, name, _ in JOBS}
    untouched = {ASSETS / group / f"{name}.png": digest(ASSETS / group / f"{name}.png")
                 for group, names in manifest.items() for name in names if (group, name) not in selected}
    for group, name, _ in JOBS:
        backup(ASSETS / group / f"{name}.png")
    checks = make_raw()
    report = []
    with tempfile.TemporaryDirectory(prefix="round4-", dir=ROOT / "raw") as temporary:
        stage = Path(temporary).resolve()
        if not stage.is_relative_to((ROOT / "raw").resolve()):
            raise ValueError("Staging directory must stay inside workspace raw/")
        prepare.OUT = stage
        prepare.CHARACTERS = []  # Never decode or transform existing characters.
        prepare.TILES = ["G", "W", "H"]
        prepare.WEDDING_TILES = {k: prepare.WEDDING_TILES[k] for k in ["J", "U", "N"]}
        prepare.OBJECT_SIZES = {k: prepare.OBJECT_SIZES[k] for k in ["tree", "arch", "bush-white"]}
        prepare.MAP_SIZES = {}
        prepare.SKIP_EXISTING = False
        prepare.main()
        for group, name, expected in JOBS:
            with Image.open(stage / group / f"{name}.png") as image:
                if image.size != expected or image.mode != "RGBA":
                    raise ValueError(f"Unexpected output: {name} {image.size} {image.mode}")
                alpha = image.getchannel("A")
                if group == "tiles" and alpha.getextrema() != (255, 255):
                    raise ValueError(f"Transparent floor: {name}")
                if name == "N":
                    colors = image.convert("RGB").tobytes()
                    if any(colors[i + 1] > colors[i] + 8 and colors[i + 1] > colors[i + 2] + 8
                           for i in range(0, len(colors), 3)):
                        raise ValueError("Sand path must not contain green vegetation")
                if group == "objects" and (alpha.getextrema()[0] != 0 or not alpha.getbbox()):
                    raise ValueError(f"Missing transparent object: {name}")
                if name == "arch" and alpha.crop((52, 70, 172, 160)).getextrema() != (0, 0):
                    raise ValueError("Arch lower character opening must be completely transparent")
                report.append({"group": group, "name": name, "size": list(image.size),
                               "alpha_bbox": list(alpha.getbbox()), "alpha_extrema": list(alpha.getextrema())})
        for group, name, _ in JOBS:
            shutil.copyfile(stage / group / f"{name}.png", ASSETS / group / f"{name}.png")
            if name not in manifest[group]:
                manifest[group].append(name)
    for path, old_digest in untouched.items():
        if digest(path) != old_digest:
            raise ValueError(f"Unrelated asset changed: {path}")
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    result = {"assets": report, "grass_background_checks": checks,
              "untouched_asset_count": len(untouched), "characters_processed": 0}
    (ASSETS / "round4-report.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    preview()
    for asset in report:
        print(asset["name"], asset["size"], "alpha bbox", asset["alpha_bbox"])
    print(f"Preserved {len(untouched)} unrelated assets; processed 0 characters.")


if __name__ == "__main__":
    main()
