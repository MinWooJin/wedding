"""Prepare generated grass detail and wedding accents without overwriting old PNGs."""
import json
from pathlib import Path
from PIL import Image, ImageEnhance, ImageOps, ImageStat

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets'
SOURCE = ROOT / 'raw' / 'garden-detail-source'


def sprite(name, frame, bounds, colors=32):
    im = Image.open(SOURCE / f'{name}.png').convert('RGBA')
    im.putalpha(im.getchannel('A').point(lambda a: 255 if a >= 160 else 0))
    im = im.crop(im.getbbox())
    im.thumbnail(bounds, Image.Resampling.BOX)
    alpha = im.getchannel('A').point(lambda a: 255 if a >= 128 else 0)
    im = im.convert('RGB').quantize(colors=colors, dither=Image.Dither.NONE).convert('RGBA')
    im.putalpha(alpha)
    final = Image.new('RGBA', frame)
    final.alpha_composite(im, ((frame[0]-im.width)//2, frame[1]-im.height))
    return final


def main():
    manifest = json.loads((OUT / 'manifest.json').read_text(encoding='utf-8'))
    files = manifest.setdefault('files', {}).setdefault('tiles', {})
    report = {}
    old = Image.open(OUT / 'tiles' / 'G-v3.png').convert('RGB')
    target = ImageStat.Stat(old).mean
    source = Image.open(SOURCE / 'grass.png').convert('RGB')
    grass = {}
    # Crop before reduction so generated grass blades survive at 1-3 final pixels.
    for name, (cx, cy) in zip(['G', 'J', 'U'], [(200,200), (650,200), (450,650)]):
        small = source.crop((cx,cy,cx+256,cy+256)).resize((32,32), Image.Resampling.BOX)
        mean = ImageStat.Stat(small).mean
        shifted = Image.new('RGB', small.size)
        shifted.putdata([tuple(max(0,min(255,round(target[k]+(c[k]-mean[k])*0.8))) for k in range(3)) for c in small.get_flattened_data()])
        im = shifted.quantize(colors=12, dither=Image.Dither.NONE).convert('RGBA')
        filename = f'{name}-v4.png'
        im.save(OUT / 'tiles' / filename)
        files[name] = filename
        grass[name] = im
        report['tiles/'+name] = {'file':filename, 'size':im.size, 'colors':len(im.getcolors(1024))}
    airy = sprite('aisle-hydrangea', (32,48), (32,40))
    objects = {'meadow-sprig':sprite('meadow-sprig',(32,32),(24,14),24),
               'aisle-flower-airy-left':airy, 'aisle-flower-airy-right':ImageOps.mirror(airy),
               'wedding-cake':sprite('wedding-cake',(64,80),(44,68))}
    for name, im in objects.items():
        im.save(OUT / 'objects' / f'{name}.png')
        if name not in manifest['objects']: manifest['objects'].append(name)
        report['objects/'+name] = {'size':im.size,'bbox':im.getbbox(),'colors':len(im.getcolors(im.width*im.height)), 'alpha_values':sorted(set(im.getchannel('A').tobytes()))}
    (OUT / 'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (OUT / 'garden-detail-report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    sheet = Image.new('RGBA',(448,224),'#fff4df')
    for x, tile in [(0,old.convert('RGBA')), (112,grass['G']), (224,grass['J']), (336,grass['U'])]:
        for tx in range(3):
            for ty in range(3): sheet.alpha_composite(tile,(x+tx*32,ty*32))
    for name, x in [('meadow-sprig',16),('aisle-flower-airy-left',112),('aisle-flower-airy-right',208),('wedding-cake',304)]:
        im=objects[name]
        sheet.alpha_composite(im.resize((im.width*2,im.height*2),Image.Resampling.NEAREST),(x,224-im.height*2))
    sheet.save(OUT / 'garden-detail-preview.png')
    print(json.dumps(report))


if __name__ == '__main__':
    main()
