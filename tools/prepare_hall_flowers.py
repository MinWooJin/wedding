"""Prepare the large wedding-hall floral mounds; retain the old narrow borders."""
import json
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'
SOURCE = ROOT / 'raw' / 'hall-flowers-source' / 'arrangement.png'


def main():
    source = Image.open(SOURCE).convert('RGBA')
    source.putalpha(source.getchannel('A').point(lambda a: 255 if a >= 160 else 0))
    source = source.crop(source.getbbox())
    source.thumbnail((32, 46), Image.Resampling.BOX)
    alpha = source.getchannel('A').point(lambda a: 255 if a >= 128 else 0)
    source = source.convert('RGB').quantize(colors=24, dither=Image.Dither.NONE).convert('RGBA')
    source.putalpha(alpha)
    left = Image.new('RGBA', (32, 48))
    left.alpha_composite(source, ((32 - source.width) // 2, 48 - source.height))
    right = ImageOps.mirror(left)
    outputs = {'aisle-flower-left': left, 'aisle-flower-right': right}
    path = ASSETS / 'manifest.json'
    manifest = json.loads(path.read_text(encoding='utf-8'))
    files = manifest.setdefault('files', {}).setdefault('objects', {})
    report = {}
    for name, image in outputs.items():
        filename = f'{name}-v2.png'
        image.save(ASSETS / 'objects' / filename)
        files[name] = filename
        report[name] = {'file': filename, 'size': image.size, 'bbox': image.getbbox(),
                        'colors': len(image.getcolors(image.width * image.height)),
                        'alpha_values': sorted(set(image.getchannel('A').tobytes()))}
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    (ASSETS / 'hall-flowers-report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8', newline='\n')

    # Same scale on both halves: old dense strips versus new, larger flower heads.
    sheet = Image.new('RGBA', (400, 448), '#7d985e')
    draw = ImageDraw.Draw(sheet)
    draw.text((18, 12), 'BEFORE: tiny border', fill='#fff9e8')
    draw.text((218, 12), 'AFTER: floral mounds', fill='#fff9e8')
    runner = Image.open(ASSETS / 'objects' / 'aisle-runner.png').convert('RGBA')
    for x in [52, 252]:
        for y in range(48, 432, 32):
            sheet.alpha_composite(runner, (x, y))
    old_left = Image.open(ASSETS / 'objects' / 'aisle-flower-left.png').convert('RGBA')
    old_right = Image.open(ASSETS / 'objects' / 'aisle-flower-right.png').convert('RGBA')
    for y in range(48, 432, 32):
        sheet.alpha_composite(old_left, (52, y))
        sheet.alpha_composite(old_right, (116, y))
    for y in range(64, 432 - 47, 64):
        sheet.alpha_composite(left, (252, y))
        sheet.alpha_composite(right, (316, y))
    sheet.save(ASSETS / 'hall-flowers-comparison.png')
    enlarged = Image.new('RGBA', (160, 112), '#7d985e')
    enlarged.alpha_composite(left.resize((64, 96), Image.Resampling.NEAREST), (8, 8))
    enlarged.alpha_composite(right.resize((64, 96), Image.Resampling.NEAREST), (88, 8))
    enlarged.save(ASSETS / 'hall-flowers-detail.png')
    print('Prepared two 32x48 floral mounds; previous PNGs retained.')


if __name__ == '__main__':
    main()
