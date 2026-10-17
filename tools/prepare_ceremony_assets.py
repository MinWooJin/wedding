"""Prepare only the aisle and its two low flower borders; no old assets change."""
import json
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'
SOURCE = ROOT / 'raw' / 'ceremony-source'


def main():
    runner = Image.open(SOURCE / 'aisle-runner.png').convert('RGB').resize((96, 32), Image.Resampling.BOX)
    # Average only along the repeating direction: keep generated edge stitches,
    # but remove horizontal seams and alternating brightness across segments.
    column = runner.resize((96, 1), Image.Resampling.BOX)
    runner = column.resize((96, 32), Image.Resampling.NEAREST).quantize(colors=6, dither=Image.Dither.NONE).convert('RGBA')
    flower = Image.open(SOURCE / 'aisle-flowers.png').convert('RGBA')
    flower.putalpha(flower.getchannel('A').point(lambda a: 255 if a >= 160 else 0))
    flower = flower.crop(flower.getbbox()).resize((16, 32), Image.Resampling.BOX)
    alpha = flower.getchannel('A').point(lambda a: 255 if a >= 128 else 0)
    flower = flower.convert('RGB').quantize(colors=16, dither=Image.Dither.NONE).convert('RGBA')
    flower.putalpha(alpha)
    left = Image.new('RGBA', (32, 32))
    left.alpha_composite(flower)
    right = ImageOps.mirror(left)
    outputs = {'aisle-runner': runner, 'aisle-flower-left': left, 'aisle-flower-right': right}
    manifest_path = ASSETS / 'manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    report = {}
    for name, im in outputs.items():
        im.save(ASSETS / 'objects' / f'{name}.png')
        # These raw inputs are already aligned; the general converter preserves
        # their transparent margins rather than centering the narrow flowers.
        raw_object = ROOT / 'raw' / 'objects' / f'{name}.png'
        raw_object.parent.mkdir(parents=True, exist_ok=True)
        im.save(raw_object)
        if name not in manifest['objects']:
            manifest['objects'].append(name)
        report[name] = {'size': im.size, 'bbox': im.getbbox(), 'alpha_values': sorted(set(im.getchannel('A').tobytes()))}
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    (ASSETS / 'ceremony-report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8', newline='\n')
    sheet = Image.new('RGBA', (192, 256), '#7d985e')
    for y in range(0, 256, 32):
        sheet.alpha_composite(runner, (48, y))
        sheet.alpha_composite(left, (48, y))
        sheet.alpha_composite(right, (112, y))
    sheet.resize((384, 512), Image.Resampling.NEAREST).save(ASSETS / 'ceremony-preview.png')
    print('Prepared aisle-runner 96x32 and two mirrored 32x32 borders (16px ink width).')


if __name__ == '__main__':
    main()
