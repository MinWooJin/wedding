"""
AI로 생성한 원본 이미지를 게임 규격 PNG로 변환하고 assets/manifest.json을 만든다.

사용법:
  pip install pillow
  python tools/prepare_assets.py            # raw/ → assets/
  python tools/prepare_assets.py --pixel    # 결과를 더 또렷한 도트 느낌으로(인접 보간)

입력 폴더 구조(raw/):
  raw/characters/preset-0.png ... preset-9.png, groom.png, bride.png   정면 전신 1장(배경은 단색 또는 투명)
  raw/characters/<name>-sheet.png                                    선택: 3열×4행 걷기 시트(열: idle/걷기A/걷기B, 행: down/left/right/up)
  raw/tiles/G.png W.png P.png H.png F.png D.png K.png R.png S.png     정사각 타일(이음새 없는 패턴 권장)
  raw/objects/arch.png tree.png sign.png mailbox.png frame.png bench.png chest.png desk.png board.png phone.png calendar.png mapframe.png flower.png stone.png door.png
  raw/maps/hub.png info.png guestbook.png gifts.png                   씬 배경 한 장(선택)

출력(assets/): 같은 이름으로 규격에 맞춘 PNG + manifest.json
"""
import json
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw
except ImportError:
    sys.exit("Pillow가 필요합니다: pip install pillow")

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "raw"
OUT = ROOT / "assets"
TILE = 32
CHAR_W, CHAR_H = 64, 96

CHARACTERS = [f"preset-{i}" for i in range(10)] + ["groom", "bride"]
TILES = list("GWPHFDKRS")
OBJECT_SIZES = {
    "arch": (96, 64), "tree": (32, 64), "bench": (64, 32), "desk": (64, 32),
    "sign": (32, 32), "mailbox": (32, 32), "frame": (32, 32), "chest": (32, 32), "board": (32, 32),
    "phone": (32, 32), "calendar": (32, 32), "mapframe": (32, 32), "flower": (32, 32), "stone": (32, 32), "door": (32, 32),
}
# 고정 크기 씬(갤러리·이야기 길은 사진/타임라인 수에 따라 길이가 변해 배경 이미지를 쓰지 않는다)
MAP_SIZES = {"hub": (352, 1024), "info": (352, 256), "guestbook": (352, 384), "gifts": (352, 256)}

PIXEL = "--pixel" in sys.argv
RESAMPLE_DOWN = Image.Resampling.BOX if PIXEL else Image.Resampling.LANCZOS


def remove_background(img: Image.Image, tol: int = 40) -> Image.Image:
    """알파가 없으면 네 모서리 색을 배경으로 보고 플러드필로 투명 처리."""
    img = img.convert("RGBA")
    alpha = img.getchannel("A")
    if alpha.getextrema()[0] < 255:  # 이미 투명 배경
        return img
    w, h = img.size
    for cx, cy in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        ImageDraw.floodfill(img, (cx, cy), (0, 0, 0, 0), thresh=tol)
    return img


def trim(img: Image.Image) -> Image.Image:
    bbox = img.getchannel("A").getbbox()
    return img.crop(bbox) if bbox else img


def fit_bottom_center(img: Image.Image, w: int, h: int) -> Image.Image:
    """비율 유지로 w×h 안에 맞추고 아래 가운데 정렬(발이 바닥에 닿게)."""
    scale = min(w / img.width, h / img.height)
    nw, nh = max(1, round(img.width * scale)), max(1, round(img.height * scale))
    small = img.resize((nw, nh), RESAMPLE_DOWN)
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    canvas.paste(small, ((w - nw) // 2, h - nh), small)
    return canvas


def process_character(src: Path, name: str) -> Image.Image:
    img = Image.open(src)
    if src.stem.endswith("-sheet"):
        fw, fh = img.width // 3, img.height // 4
        sheet = Image.new("RGBA", (CHAR_W * 3, CHAR_H * 4), (0, 0, 0, 0))
        for r in range(4):
            for c in range(3):
                cell = img.crop((c * fw, r * fh, (c + 1) * fw, (r + 1) * fh))
                cell = fit_bottom_center(trim(remove_background(cell)), CHAR_W, CHAR_H)
                sheet.paste(cell, (c * CHAR_W, r * CHAR_H), cell)
        return sheet
    return fit_bottom_center(trim(remove_background(img)), CHAR_W, CHAR_H)


def main():
    manifest = {"characters": [], "tiles": [], "objects": [], "maps": []}
    for sub in ["characters", "tiles", "objects", "maps"]:
        (OUT / sub).mkdir(parents=True, exist_ok=True)

    for name in CHARACTERS:
        src = RAW / "characters" / f"{name}-sheet.png"
        if not src.exists():
            src = RAW / "characters" / f"{name}.png"
        if not src.exists():
            continue
        process_character(src, name).save(OUT / "characters" / f"{name}.png")
        manifest["characters"].append(name)
        print("character", name)

    for tid in TILES:
        src = RAW / "tiles" / f"{tid}.png"
        if not src.exists():
            continue
        Image.open(src).convert("RGBA").resize((TILE, TILE), RESAMPLE_DOWN).save(OUT / "tiles" / f"{tid}.png")
        manifest["tiles"].append(tid)
        print("tile", tid)

    for oid, (w, h) in OBJECT_SIZES.items():
        src = RAW / "objects" / f"{oid}.png"
        if not src.exists():
            continue
        fit_bottom_center(trim(remove_background(Image.open(src))), w, h).save(OUT / "objects" / f"{oid}.png")
        manifest["objects"].append(oid)
        print("object", oid, f"{w}x{h}")

    for sid, (w, h) in MAP_SIZES.items():
        src = RAW / "maps" / f"{sid}.png"
        if not src.exists():
            continue
        Image.open(src).convert("RGBA").resize((w, h), RESAMPLE_DOWN).save(OUT / "maps" / f"{sid}.png")
        manifest["maps"].append(sid)
        print("map", sid, f"{w}x{h}")

    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print("manifest:", OUT / "manifest.json")


if __name__ == "__main__":
    main()
