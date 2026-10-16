"""
AI로 생성한 원본 이미지를 게임 규격 PNG로 변환하고 assets/manifest.json을 만든다.

사용법:
  pip install pillow
  python tools/prepare_assets.py            # raw/ → assets/
  python tools/prepare_assets.py --pixel    # 결과를 더 또렷한 도트 느낌으로(인접 보간)
  python tools/prepare_assets.py --skip-existing  # 기존 최종 PNG 유지, 새 파일만 변환

입력 폴더 구조(raw/):
  raw/characters/preset-0.png ... preset-9.png, groom.png, bride.png   정면 전신 1장(배경은 단색 또는 투명)
  raw/characters/<name>-sheet.png                                    선택: 3열×4행 걷기 시트(열: idle/걷기A/걷기B, 행: down/left/right/up)
  raw/tiles/G.png W.png P.png H.png F.png D.png K.png R.png S.png     정사각 타일(이음새 없는 패턴 권장)
  raw/tiles/wedding/<name>.png                                      WEDDING_TILES의 이름 → assets/tiles/<ID>.png
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
CHAR_W, CHAR_H = 48, 72

CHARACTERS = [f"preset-{i}" for i in range(10)] + ["groom", "bride"]
TILES = list("GWPHFDKRS")
# 웨딩 타일: raw/tiles/wedding/<이름>.png → assets/tiles/<ID>.png
WEDDING_TILES = {
    "A": "aisle-ivory", "B": "aisle-petals", "C": "aisle-entrance",
    "E": "rose-petal-grass", "M": "ivory-marble", "L": "blush-carpet",
    "X1": "flower-bed-pink", "X2": "flower-bed-white",
    "X3": "white-gravel", "X4": "hedge-rose",
    "J": "grass-flowers-a", "U": "grass-flowers-b", "N": "sand-path",
}
OBJECT_SIZES = {  # 오브젝트별 원본 비율과 요청 규격. 의자는 높이 48px를 유지한다.
    "arch": (160, 128), "tree": (96, 128), "bench": (128, 64), "desk": (128, 64),
    "sign": (64, 64), "mailbox": (64, 64), "frame": (64, 64), "chest": (64, 64), "board": (64, 64),
    "phone": (64, 64), "calendar": (64, 64), "mapframe": (64, 64), "stone": (64, 64), "flower": (32, 32), "door": (32, 32),
    "chair": (32, 48), "bush": (64, 64), "lantern": (32, 64),
    "petal-pile": (32, 32), "welcome-board": (64, 64),
    "bush-white": (64, 64),
}
# 고정 크기 씬(갤러리·이야기 길은 사진/타임라인 수에 따라 길이가 변해 배경 이미지를 쓰지 않는다)
MAP_SIZES = {"hub": (352, 1024), "info": (352, 256), "guestbook": (352, 384), "gifts": (352, 256)}

PIXEL = "--pixel" in sys.argv
SKIP_EXISTING = "--skip-existing" in sys.argv
RESAMPLE_DOWN = Image.Resampling.BOX if PIXEL else Image.Resampling.LANCZOS


def keep_existing(path: Path) -> bool:
    """기존 최종 PNG를 보존하면서 manifest에는 계속 등록한다."""
    if not SKIP_EXISTING or not path.exists():
        return False
    with Image.open(path) as image:
        if image.format != "PNG":
            raise ValueError(f"PNG가 아닙니다: {path}")
        image.verify()
    print("keep", path.relative_to(OUT))
    return True


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


def process_object(src: Path, w: int, h: int) -> Image.Image:
    """축소 시 사라지는 미세 알파 여백까지 제거하고 실제 픽셀을 아래 가운데 정렬."""
    with Image.open(src) as source:
        fitted = fit_bottom_center(trim(remove_background(source)), w, h)
    visible = trim(fitted)
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    canvas.alpha_composite(visible, ((w - visible.width) // 2, h - visible.height))
    return canvas


def main():
    manifest = {"characters": [], "tiles": [], "objects": [], "maps": []}
    for sub in ["characters", "tiles", "objects", "maps"]:
        (OUT / sub).mkdir(parents=True, exist_ok=True)

    for name in CHARACTERS:
        if keep_existing(OUT / "characters" / f"{name}.png"):
            manifest["characters"].append(name)
            continue
        src = RAW / "characters" / f"{name}-sheet.png"
        if not src.exists():
            src = RAW / "characters" / f"{name}.png"
        if not src.exists():
            continue
        process_character(src, name).save(OUT / "characters" / f"{name}.png")
        manifest["characters"].append(name)
        print("character", name)

    for tid in TILES:
        if keep_existing(OUT / "tiles" / f"{tid}.png"):
            manifest["tiles"].append(tid)
            continue
        src = RAW / "tiles" / f"{tid}.png"
        if not src.exists():
            continue
        Image.open(src).convert("RGBA").resize((TILE, TILE), RESAMPLE_DOWN).save(OUT / "tiles" / f"{tid}.png")
        manifest["tiles"].append(tid)
        print("tile", tid)

    for tid, name in WEDDING_TILES.items():
        if keep_existing(OUT / "tiles" / f"{tid}.png"):
            manifest["tiles"].append(tid)
            continue
        src = RAW / "tiles" / "wedding" / f"{name}.png"
        if not src.exists():
            continue
        Image.open(src).convert("RGBA").resize((TILE, TILE), RESAMPLE_DOWN).save(OUT / "tiles" / f"{tid}.png")
        manifest["tiles"].append(tid)
        print("tile", tid, name)

    for oid, (w, h) in OBJECT_SIZES.items():
        if keep_existing(OUT / "objects" / f"{oid}.png"):
            manifest["objects"].append(oid)
            continue
        src = RAW / "objects" / f"{oid}.png"
        if not src.exists():
            continue
        process_object(src, w, h).save(OUT / "objects" / f"{oid}.png")
        manifest["objects"].append(oid)
        print("object", oid, f"{w}x{h}")

    for sid, (w, h) in MAP_SIZES.items():
        if keep_existing(OUT / "maps" / f"{sid}.png"):
            manifest["maps"].append(sid)
            continue
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
