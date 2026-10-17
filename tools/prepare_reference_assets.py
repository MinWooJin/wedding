"""Prepare only the v3 reference-study variants; canonical PNGs stay untouched.

Requires built-in imagegen outputs in raw/reference-v3-source/. Run with the
project Pillow environment. --draft prepares the available subset for review.
"""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'
SOURCE = ROOT / 'raw' / 'reference-v3-source'
CHARACTERS = [f'preset-{i}' for i in range(10)] + ['groom', 'bride']


def sprite(path, frame, bounds, colors=32):
    source = Image.open(path).convert('RGBA')
    source.putalpha(source.getchannel('A').point(lambda a: 255 if a >= 160 else 0))
    source = source.crop(source.getbbox())
    width = min(bounds[0], round(source.width * bounds[1] / source.height))
    height = min(bounds[1], round(source.height * bounds[0] / source.width))
    # One final downsample, then a limited palette and binary alpha: no blurred halo.
    small = source.resize((width, height), Image.Resampling.BOX)
    alpha = small.getchannel('A').point(lambda a: 255 if a >= 128 else 0)
    small = small.convert('RGB').quantize(colors=colors, dither=Image.Dither.NONE).convert('RGBA')
    small.putalpha(alpha)
    out = Image.new('RGBA', frame)
    out.alpha_composite(small, ((frame[0] - width) // 2, frame[1] - height))
    return out


def ground(name, base, light, dark):
    small = Image.open(SOURCE / f'{name}.png').convert('RGB').resize((32, 32), Image.Resampling.BOX)
    local = small.filter(ImageFilter.MedianFilter(5))
    out = Image.new('RGBA', (32, 32), base)
    for y in range(1, 31):
        for x in range(1, 31):
            color, nearby = small.getpixel((x, y)), local.getpixel((x, y))
            difference = sum(a - b for a, b in zip(color, nearby)) / 3
            if difference > 3:
                out.putpixel((x, y), light)
            elif difference < -3:
                out.putpixel((x, y), dark)
    return out


def main(draft=False):
    required = CHARACTERS + ['tree', 'G', 'N']
    missing = [name for name in required if not (SOURCE / f'{name}.png').exists()]
    if missing and not draft:
        raise FileNotFoundError('Missing generation sources: ' + ', '.join(missing))
    manifest_path = ASSETS / 'manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    files = manifest.setdefault('files', {})
    report = {}

    def save(group, name, im):
        filename = f'{name}-v3.png'
        im.save(ASSETS / group / filename)
        files.setdefault(group, {})[name] = filename
        report[f'{group}/{name}'] = {'file': filename, 'size': im.size, 'bbox': im.getbbox(),
                                    'colors': len(im.getcolors(im.width * im.height)),
                                    'alpha_values': sorted(set(im.getchannel('A').tobytes()))}

    for name in CHARACTERS:
        if name in missing:
            continue
        # Same foot line and frame, but 60px guests / 64px couple leave headroom.
        bounds = (44, 64) if name == 'bride' else (38, 64) if name == 'groom' else (36, 60)
        save('characters', name, sprite(SOURCE / f'{name}.png', (48, 72), bounds))
    if 'tree' not in missing:
        save('objects', 'tree', sprite(SOURCE / 'tree.png', (64, 96), (64, 94), colors=16))
    if 'G' not in missing:
        grass = ground('G', '#7d985e', (142, 166, 106, 255), (109, 139, 80, 255))
        save('tiles', 'G', grass)
        shade = grass.convert('RGB').point(lambda v: (v * 7 + 4) // 8).convert('RGBA')
        save('tiles', 'H', shade)
        old_grass = Image.open(ASSETS / 'tiles' / 'G.png').convert('RGBA')
        for name in ['J', 'U', 'W']:
            flowers = Image.open(ASSETS / 'tiles' / f'{name}.png').convert('RGBA')
            output = grass.copy()
            for y in range(32):
                for x in range(32):
                    # These existing tiles share exactly the same grass master.
                    # Retain only flower pixels, rebuilding their common ground.
                    old = old_grass.getpixel((x, y))
                    color = flowers.getpixel((x, y))
                    if max(abs(a - b) for a, b in zip(old[:3], color[:3])) >= 22:
                        output.putpixel((x, y), color)
            save('tiles', name, output)
    if 'N' not in missing:
        save('tiles', 'N', ground('N', '#dfcda0', (235, 222, 184, 255), (204, 185, 141, 255)))

    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    (ASSETS / 'reference-v3-report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8', newline='\n')
    preview(files)
    print(f'Prepared {len(report)} versioned assets. Canonical PNGs untouched.')


def preview(files):
    sheet = Image.new('RGB', (800, 740), '#fff4df')
    d = ImageDraw.Draw(sheet)
    d.text((20, 14), 'REFERENCE STUDY V3 - BEFORE / AFTER (actual game pixels)', fill='#4c5140')
    for i, name in enumerate(CHARACTERS):
        x, y = 20 + (i % 6) * 128, 42 + (i // 6) * 150
        for row, path in enumerate([ASSETS / 'characters' / f'{name}.png',
                                    ASSETS / 'characters' / files.get('characters', {}).get(name, f'{name}.png')]):
            im = Image.open(path).convert('RGBA')
            # Each comparison is at true 1x scale.
            sheet.paste(im, (x + row * 56, y), im)
        d.text((x, y + 78), name, fill='#4c5140')
        d.text((x, y + 94), 'old       v3', fill='#747563')
    for i, name in enumerate(['G', 'J', 'U', 'H', 'N']):
        x, y = 20 + i * 152, 350
        for row, filename in enumerate([f'{name}.png', files.get('tiles', {}).get(name, f'{name}.png')]):
            tile = Image.open(ASSETS / 'tiles' / filename).convert('RGBA')
            for tx in range(2):
                for ty in range(2):
                    sheet.paste(tile, (x + tx * 32, y + row * 78 + ty * 32), tile)
        d.text((x, y + 148), f'{name}  old / v3', fill='#4c5140')
    for i, filename in enumerate(['tree.png', files.get('objects', {}).get('tree', 'tree.png')]):
        im = Image.open(ASSETS / 'objects' / filename).convert('RGBA')
        sheet.paste(im, (20 + i * 132, 672 - im.height), im)
    d.text((20, 683), 'tree: 96x128 -> 64x96', fill='#4c5140')
    d.text((300, 580), 'Same 32px tile grid / same foot anchors', fill='#4c5140')
    d.text((300, 602), 'Guest ink height: 60px / couple: 64px', fill='#4c5140')
    d.text((300, 624), 'Crisp outlines, limited colors, quiet ground', fill='#4c5140')
    sheet.save(ASSETS / 'reference-v3-comparison.png')
    characters = Image.new('RGB', (768, 360), '#fff4df')
    labels = ImageDraw.Draw(characters)
    for i, name in enumerate(CHARACTERS):
        filename = files.get('characters', {}).get(name, f'{name}.png')
        im = Image.open(ASSETS / 'characters' / filename).convert('RGBA').resize((96, 144), Image.Resampling.NEAREST)
        x, y = 16 + (i % 6) * 128, 8 + (i // 6) * 180
        characters.paste(im, (x, y), im)
        labels.text((x + 12, y + 150), name, fill='#4c5140')
    characters.save(ASSETS / 'reference-v3-characters.png')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--draft', action='store_true')
    main(parser.parse_args().draft)
