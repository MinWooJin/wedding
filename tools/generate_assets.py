"""Generate wedding sprites with the OpenAI Image API.

Install: python -m pip install -r tools/requirements-assets.txt
Preview prompts: python tools/generate_assets.py --only characters --test --dry-run
Generate: python tools/generate_assets.py --only characters --skip-existing
Requires OPENAI_API_KEY in the environment; never put a key in this file.
"""

import argparse
import base64
import binascii
import io
import os
from pathlib import Path
import sys
import time

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "raw"
STYLE = (
    "cute chibi pixel art, 4-head-tall proportions, big head with expressive face, "
    "thick dark outline, soft cel shading, pastel warm palette, 16-bit RPG sprite style, "
    "centered, no text, no watermark"
)
HAIR = ["short black hair", "long brown hair", "curly blonde hair",
        "bob cut dark hair", "baseball cap over short auburn hair"]
OUTFITS = [
    "red hoodie, blue jeans", "yellow cardigan, brown skirt",
    "green sweater, cream trousers", "pink blouse, charcoal skirt",
    "navy jacket, beige trousers", "orange blazer, grey trousers",
    "purple cardigan, ivory skirt", "teal sweater, dark trousers",
    "coral blouse, white skirt", "sky blue jacket, brown trousers",
]
TILES = {
    "G": "lush green grass", "W": "grass with tiny pink and yellow flowers",
    "P": "dirt path", "H": "dense green hedge",
    "F": "wooden picket fence on grass", "D": "warm wooden plank floor",
    "K": "cream wallpaper wall with wooden baseboard",
    "R": "red carpet with gold center", "S": "grey stone floor",
}
OBJECTS = {
    "arch": "flower arch with pink roses and green leaves, wide horizontal silhouette",
    "tree": "round green tree with brown trunk, tall vertical silhouette",
    "sign": "wooden signpost with a blank sign",
    "mailbox": "red mailbox on a post", "frame": "small wooden picture frame",
    "bench": "wooden park bench, wide horizontal silhouette",
    "chest": "wooden treasure chest with gold lock",
    "desk": "wooden reception desk, wide horizontal silhouette",
    "board": "cork notice board with blank notes", "phone": "grey telephone",
    "calendar": "wall calendar with red header, blank grid without numbers",
    "mapframe": "framed pictorial map without labels", "flower": "single pink flower",
    "stone": "grey stone monument", "door": "yellow-bordered doormat, flat floor marker",
}


def assets():
    """Return stable filenames, sizes, and the exact prompts sent to the API."""
    character_pose = (
        "full body, front view, standing, arms at sides, wedding guest outfit, "
        "one character only, entire head and feet visible, transparent background, "
        "no shadow on ground"
    )
    for index, outfit in enumerate(OUTFITS):
        skin = "light" if index < 5 else "tan"
        yield ("characters", f"preset-{index}", "1024x1536",
               f"{STYLE}, {character_pose}, {HAIR[index % 5]}, {skin} skin tone, {outfit}")
    for name, details in (
        ("groom", "black hair, black tuxedo, bow tie, white shirt"),
        ("bride", "brown updo with small veil, white wedding dress, tiny bouquet"),
    ):
        yield "characters", name, "1024x1536", f"{STYLE}, {character_pose}, {details}"
    for name, details in TILES.items():
        yield ("tiles", name, "1024x1024",
               f"{STYLE}, top-down seamless tileable texture, flat, no border, "
               f"{details}, 32x32 style, subtle pixel details, seamless, tileable, "
               "uniform lighting, texture fills every edge, opaque texture coverage")
    for name, details in OBJECTS.items():
        yield ("objects", name, "1024x1024",
               f"{STYLE}, top-down RPG object sprite, no ground shadow, {details}, "
               "one object only, complete silhouette, transparent background")


def generate(client, job, destination):
    from PIL import Image
    from openai import APIConnectionError, APIStatusError

    group, name, size, prompt = job
    for attempt in range(1, 4):
        try:
            print(f"[generate {attempt}/3] {group}/{name} ({size}, high)", flush=True)
            response = client.images.generate(
                model="gpt-image-1", prompt=prompt, size=size, quality="high",
                background="transparent", output_format="png", n=1,
            )
            if not response.data or not response.data[0].b64_json:
                raise ValueError("The API returned no base64 image")
            data = base64.b64decode(response.data[0].b64_json, validate=True)
            with Image.open(io.BytesIO(data)) as image:
                image.load()
                if image.format != "PNG" or image.size != tuple(map(int, size.split("x"))):
                    raise ValueError("Unexpected image format or dimensions")
                alpha = image.convert("RGBA").getchannel("A")
                if group != "tiles" and (alpha.getextrema()[0] == 255 or not alpha.getbbox()):
                    raise ValueError("Sprite needs transparent background and visible content")
            destination.parent.mkdir(parents=True, exist_ok=True)
            temporary = destination.with_suffix(".tmp")
            try:
                temporary.write_bytes(data)
                temporary.replace(destination)
            finally:
                temporary.unlink(missing_ok=True)
            print(f"[saved] {destination.relative_to(ROOT)}", flush=True)
            return True
        except (APIConnectionError, APIStatusError, ValueError, binascii.Error, OSError) as error:
            # Do not print API response bodies: they may contain sensitive request data.
            status = getattr(error, "status_code", None)
            print(f"[failed] {group}/{name}: {type(error).__name__}"
                  + (f" (HTTP {status})" if status else ""), file=sys.stderr, flush=True)
            if status in (400, 401, 403, 404):
                raise RuntimeError(f"API request rejected (HTTP {status}); generation stopped") from None
            if attempt < 3:
                time.sleep(2 ** attempt)
    return False


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--only", choices=("characters", "tiles", "objects"))
    parser.add_argument("--skip-existing", action="store_true", help="Keep existing raw PNG files")
    parser.add_argument("--test", action="store_true", help="Generate only the first guest (preset-0)")
    parser.add_argument("--dry-run", action="store_true", help="Print prompts without API calls or writes")
    args = parser.parse_args(argv)
    if args.test and args.only not in (None, "characters"):
        parser.error("--test generates a character; use --only characters or omit --only")
    jobs = [job for job in assets() if args.only is None or job[0] == args.only]
    if args.test:
        jobs = jobs[:1]
    pending = []
    for job in jobs:
        destination = RAW / job[0] / f"{job[1]}.png"
        if args.skip_existing and destination.exists():
            print(f"[skip] {destination.relative_to(ROOT)}")
        else:
            pending.append((job, destination))
    print(f"Selected {len(jobs)} assets; {len(pending)} to generate.", flush=True)
    if args.dry_run:
        for job, destination in pending:
            print(f"\n{destination.relative_to(ROOT)} | {job[2]}\n{job[3]}")
        return 0
    if not pending:
        return 0
    if not os.environ.get("OPENAI_API_KEY", "").strip():
        print("OPENAI_API_KEY is missing. Set it locally before running this command; "
              "never paste your key into chat or commit it.", file=sys.stderr)
        return 1
    try:
        from openai import OpenAI
        import PIL  # noqa: F401 — check before any billable request
    except ImportError:
        print("Install dependencies: python -m pip install -r tools/requirements-assets.txt",
              file=sys.stderr)
        return 1
    failed = []
    try:
        # Disable SDK retries so the maximum really is three attempts per image.
        with OpenAI(max_retries=0, timeout=300.0) as client:
            for job, destination in pending:
                if not generate(client, job, destination):
                    failed.append(f"{job[0]}/{job[1]}")
    except RuntimeError as error:
        print(str(error), file=sys.stderr)
        return 1
    print(f"Done: {len(pending) - len(failed)} saved, {len(failed)} failed.")
    if failed:
        print("Failed assets: " + ", ".join(failed), file=sys.stderr)
    return int(bool(failed))


if __name__ == "__main__":
    raise SystemExit(main())
