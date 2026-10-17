"""Prepare only the arm-in-arm couple; never redraw individual character PNGs."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def main():
    source = Image.open(ROOT / 'raw' / 'couple-source' / 'couple.png').convert('RGBA')
    source.putalpha(source.getchannel('A').point(lambda a: 255 if a >= 160 else 0))
    source = source.crop(source.getbbox())
    source.thumbnail((84, 68), Image.Resampling.BOX)
    alpha = source.getchannel('A').point(lambda a: 255 if a >= 128 else 0)
    source = source.convert('RGB').quantize(colors=36, dither=Image.Dither.NONE).convert('RGBA')
    source.putalpha(alpha)
    final = Image.new('RGBA', (96, 72))
    final.alpha_composite(source, ((96 - source.width) // 2, 72 - source.height))
    final.save(ROOT / 'assets' / 'characters' / 'couple.png')
    raw = ROOT / 'raw' / 'characters' / 'couple.png'
    raw.parent.mkdir(parents=True, exist_ok=True)
    final.save(raw)
    path = ROOT / 'assets' / 'manifest.json'
    manifest = json.loads(path.read_text(encoding='utf-8'))
    if 'couple' not in manifest['characters']:
        manifest['characters'].append('couple')
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    report = {'file': 'characters/couple.png', 'size': final.size, 'bbox': final.getbbox(),
              'colors': len(final.getcolors(96 * 72)), 'alpha_values': sorted(set(final.getchannel('A').tobytes()))}
    (ROOT / 'assets' / 'couple-joined-report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8', newline='\n')
    preview = Image.new('RGBA', (192, 144), '#fff4df')
    preview.alpha_composite(final.resize(preview.size, Image.Resampling.NEAREST))
    preview.save(ROOT / 'assets' / 'couple-joined-preview.png')
    print(report)


if __name__ == '__main__':
    main()
