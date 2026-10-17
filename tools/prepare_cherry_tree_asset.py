"""Prepare only the new flowering tree; preserve earlier tree PNGs."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def main():
    im = Image.open(ROOT / 'raw' / 'cherry-tree-source' / 'tree.png').convert('RGBA')
    im.putalpha(im.getchannel('A').point(lambda a: 255 if a >= 160 else 0))
    im = im.crop(im.getbbox())
    im.thumbnail((64, 74), Image.Resampling.BOX)
    alpha = im.getchannel('A').point(lambda a: 255 if a >= 128 else 0)
    im = im.convert('RGB').quantize(colors=32, dither=Image.Dither.NONE).convert('RGBA')
    im.putalpha(alpha)
    final = Image.new('RGBA', (64,96))
    final.alpha_composite(im, ((64-im.width)//2, 96-im.height))
    filename = 'tree-v4-cherry.png'
    final.save(ROOT / 'assets' / 'objects' / filename)
    path = ROOT / 'assets' / 'manifest.json'
    manifest = json.loads(path.read_text(encoding='utf-8'))
    manifest.setdefault('files', {}).setdefault('objects', {})['tree'] = filename
    path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    report = {'file':filename,'size':final.size,'bbox':final.getbbox(),'colors':len(final.getcolors(64*96)), 'alpha_values':sorted(set(final.getchannel('A').tobytes()))}
    (ROOT / 'assets' / 'cherry-tree-report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    preview = Image.new('RGBA',(256,192),'#fff4df')
    old = Image.open(ROOT / 'assets' / 'objects' / 'tree-v3.png').convert('RGBA')
    preview.alpha_composite(old.resize((128,192),Image.Resampling.NEAREST),(0,0))
    preview.alpha_composite(final.resize((128,192),Image.Resampling.NEAREST),(128,0))
    preview.save(ROOT / 'assets' / 'cherry-tree-preview.png')
    print(report)


if __name__ == '__main__':
    main()
