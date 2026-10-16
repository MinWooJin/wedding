"""Convert only the two v2 props; never reprocess characters or existing tiles."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SIZES = {"wedding-mailbox": (64, 96), "share-letter": (64, 64)}

def main():
    report = {}
    for name, size in SIZES.items():
        source = ROOT / "raw" / "v2-source" / f"{name}.png"
        if not source.exists():
            raise FileNotFoundError(f"Missing {source}; keep the committed final PNG instead.")
        sprite = Image.open(source).convert("RGBA")
        sprite.putalpha(sprite.getchannel("A").point(lambda value: value if value >= 40 else 0))
        sprite = sprite.crop(sprite.getbbox())
        sprite.thumbnail(size, Image.Resampling.LANCZOS)
        output = Image.new("RGBA", size)
        output.alpha_composite(sprite, ((size[0] - sprite.width) // 2, size[1] - sprite.height))
        output.save(ROOT / "assets" / "objects" / f"{name}.png")
        report[name] = {"size": size, "bbox": output.getbbox()}
    manifest_path = ROOT / "assets" / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["objects"] = list(dict.fromkeys(manifest["objects"] + list(SIZES)))
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (ROOT / "assets" / "v2-asset-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

if __name__ == "__main__":
    main()
