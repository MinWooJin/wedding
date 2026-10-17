"""Prepare only the two garden wedding reception sprites from built-in generation."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SPECS = {'party-table': ((64, 64), (54, 56)), 'ribbon-lantern': ((32, 64), (26, 60))}


def main():
    report = {}
    preview = Image.new('RGBA', (256, 160), '#fff4df')
    for i, (name, (frame, ink)) in enumerate(SPECS.items()):
        source = Image.open(ROOT / 'raw' / 'party-source' / f'{name}.png').convert('RGBA')
        source.putalpha(source.getchannel('A').point(lambda a: 255 if a >= 160 else 0))
        source = source.crop(source.getbbox())
        source.thumbnail(ink, Image.Resampling.BOX)
        alpha = source.getchannel('A').point(lambda a: 255 if a >= 128 else 0)
        source = source.convert('RGB').quantize(colors=32, dither=Image.Dither.NONE).convert('RGBA')
        source.putalpha(alpha)
        final = Image.new('RGBA', frame)
        final.alpha_composite(source, ((frame[0] - source.width) // 2, frame[1] - source.height))
        final.save(ROOT / 'assets' / 'objects' / f'{name}.png')
        preview.alpha_composite(final.resize((frame[0]*2, frame[1]*2), Image.Resampling.NEAREST), (16 + i*144, 16))
        report[name] = {'size': frame, 'bbox': final.getbbox(), 'colors': len(final.getcolors(frame[0]*frame[1])), 'alpha_values': sorted(set(final.getchannel('A').tobytes()))}
    path = ROOT / 'assets' / 'manifest.json'
    manifest = json.loads(path.read_text(encoding='utf-8'))
    manifest['objects'] += [name for name in SPECS if name not in manifest['objects']]
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    preview.save(ROOT / 'assets' / 'party-preview.png')
    (ROOT / 'assets' / 'party-report.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(report))


if __name__ == '__main__':
    main()
