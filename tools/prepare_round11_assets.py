"""Normalize only the two ImageGen round11 sprites to the requested PNG format.

Run: .venv-assets/Scripts/python.exe tools/prepare_round11_assets.py
No API calls, drawing or edits to existing assets. Raw sources are Git ignored.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / 'assets/round11-prompts.json').read_text('utf-8'))
RAW = ROOT / 'raw/round11-source'
OUTPUTS = {'guestbook': 'landmark-guestbook-v1.png', 'gifts': 'landmark-gifts-v2.png'}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    RAW.mkdir(parents=True, exist_ok=True)
    report = {'size': [96, 112], 'files': {}, 'preserved': {}}
    for name in ['landmark-gallery-v1.png', 'landmark-info-v1.png', 'landmark-gifts-v1.png']:
        report['preserved'][name] = digest(ROOT / 'assets/objects' / name)
    for key, filename in OUTPUTS.items():
        raw = RAW / (key + '.png')
        if not raw.exists():
            raw.write_bytes(Path(CONFIG['sources'][key]).read_bytes())
        im = Image.open(raw).convert('RGBA')
        im.putalpha(im.getchannel('A').point(lambda a: 255 if a >= 200 else 0))
        bbox = im.getbbox()
        assert bbox, key
        # Delivery-format normalization only; never resize the old gift sprite.
        im = im.crop(bbox).resize((96, 112), Image.Resampling.NEAREST)
        alpha = im.getchannel('A')
        visible = [p[:3] for p in im.get_flattened_data() if p[3]]
        swatch = Image.new('RGB', (len(visible), 1))
        swatch.putdata(visible)
        palette = swatch.quantize(colors=47, dither=Image.Dither.NONE)
        im = im.convert('RGB').quantize(palette=palette, dither=Image.Dither.NONE).convert('RGBA')
        im.putalpha(alpha)
        im.paste((0, 0, 0, 0), (0, 0), alpha.point(lambda a: 255 - a))
        out = ROOT / 'assets/objects' / filename
        im.save(out)
        colors = len(im.getcolors(96 * 112))
        box = im.getbbox()
        alphas = sorted(set(im.getchannel('A').get_flattened_data()))
        assert im.size == (96, 112) and colors <= 48
        assert alphas == [0, 255] and box[3] == 112
        assert 80 <= box[2] - box[0] <= 96
        report['files'][filename] = {'mode': im.mode, 'size': list(im.size), 'bbox': box,
            'rgbaColors': colors, 'alpha': alphas, 'sha256': digest(out),
            'sourceSha256': digest(raw), 'sourceCrop': bbox}
    font = ImageFont.truetype('C:/Windows/Fonts/malgun.ttf', 11)
    board = Image.new('RGB', (256, 300), '#f6efdf')
    draw = ImageDraw.Draw(board)
    for i, (key, title) in enumerate([('guestbook', '방명록 정원'), ('gallery', '갤러리관'), ('gifts', '마음 전하기'), ('info', '예식 안내')]):
        x, y = 20 + (i % 2) * 120, 10 + (i // 2) * 148
        filename = OUTPUTS.get(key, f'landmark-{key}-v1.png')
        im = Image.open(ROOT / 'assets/objects' / filename).convert('RGBA')
        draw.text((x, y), title, font=font, fill='#645646')
        draw.rectangle((x - 1, y + 19, x + 96, y + 132), fill='#a6bc79', outline='#d5c6aa')
        board.paste(im, (x, y + 20), im)
    board.save(ROOT / 'assets/round11-landmarks-comparison.png')
    board.resize((768, 900), Image.Resampling.NEAREST).save(ROOT / 'assets/round11-landmarks-comparison-3x.png')
    (ROOT / 'assets/round11-report.json').write_bytes((json.dumps(report, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
    print(json.dumps(report['files'], ensure_ascii=False))


if __name__ == '__main__':
    main()
