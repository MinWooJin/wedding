"""Prepare only round 7 sprites; preserve every existing PNG and character.

Built-in imagegen originals live in raw/round7-source (ignored by Git).
Run: .venv-assets/Scripts/python.exe tools/prepare_round7_assets.py
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'raw/round7-source'
SPECS = {
    'arch': (224, 160), 'stage-steps': (160, 64), 'planter-box': (64, 48),
    'aisle-edge-left': (32, 32), 'aisle-edge-right': (32, 32),
    'lavender': (32, 48), 'rose-bush-l': (96, 64), 'rose-bush-s': (64, 48),
    'tree-green': (96, 128), 'birdbath': (32, 48),
}
FILES = {name: name + '-v4.png' for name in SPECS}
TILES = {'G': 'G-v5.png', 'J': 'J-v5.png', 'U': 'U-v5.png', 'H': 'H-v5.png', 'N': 'N-v4.png'}


def limited(image):
    alpha = image.getchannel('A').point(lambda a: 255 if a >= 160 else 0)
    result = image.convert('RGB').quantize(colors=31, dither=Image.Dither.NONE).convert('RGBA')
    result.putalpha(alpha)
    # Canonical transparent pixel makes total RGBA colors <=32, including alpha.
    result.paste((0, 0, 0, 0), (0, 0), alpha.point(lambda a: 255-a))
    return result


def sprite(name, size):
    source = Image.open(RAW / (name + '.png')).convert('RGBA')
    source.putalpha(source.getchannel('A').point(lambda a: 255 if a >= 180 else 0))
    source = source.crop(source.getbbox())
    if name == 'arch':
        out = source.resize(size, Image.Resampling.BOX)
        # Required free volume for existing couple, expressed in final pixels.
        out.paste((0, 0, 0, 0), (52, 70, 172, 160))
    elif name == 'aisle-edge-left':
        # Narrow strip: source crop keeps the flowers, not its large clear margin.
        strip = source.resize((12, 32), Image.Resampling.BOX)
        out = Image.new('RGBA', size)
        out.alpha_composite(strip, (10, 0))
        # Shared connector rows give exact vertical repeat, with no blank end cap.
        join = out.crop((0, 14, 32, 16))
        out.paste(join, (0, 0)); out.paste(join, (0, 30))
        out.paste(out.crop((0, 0, 32, 1)), (0, 31))
    else:
        source.thumbnail(size, Image.Resampling.BOX)
        out = Image.new('RGBA', size)
        out.alpha_composite(source, ((size[0]-source.width)//2, size[1]-source.height))
    return limited(out)


def tile(name):
    source = Image.open(RAW / (name + '.png')).convert('RGB').resize((32, 32), Image.Resampling.BOX)
    # Flat base with rare flecks: eliminate generated gradients before tiling.
    base = (144, 173, 89) if name == 'G' else (239, 219, 177)
    out = Image.new('RGBA', (32, 32), (*base, 255))
    pixels = sorted([(sum(source.getpixel((x, y))), x, y) for y in range(2,30) for x in range(2,30)])
    colors = [(133, 162, 79), (153, 181, 98)] if name == 'G' else [(227, 206, 165), (247, 230, 195)]
    for candidates, color in [(pixels[:26], colors[0]), (pixels[-14:], colors[1])]:
        for _, x, y in candidates: out.putpixel((x,y), (*color,255))
    return out


def flower_tile(name, base):
    out = base.copy()
    source = Image.open(RAW / (name + '.png')).convert('RGB').resize((128,128), Image.Resampling.NEAREST)
    # Extract generated flower heads before downsampling, so each remains 3px.
    flowers = Image.new('RGBA', (128,128))
    for y in range(8,120):
        for x in range(8,120):
            r,g,b = source.getpixel((x,y))
            if min(r,g,b)>195 or (r>180 and r>g*1.12 and b>105) or (r>195 and g>175 and b<130):
                flowers.putpixel((x,y), (255,247,224,255) if min(r,g,b)>195 else (237,153,179,255) if b>130 else (246,208,83,255))
    pending={(x,y) for y in range(128) for x in range(128) if flowers.getpixel((x,y))[3]}
    groups=[]
    while pending:
        seed=pending.pop(); group={seed}; queue=[seed]
        while queue:
            x,y=queue.pop()
            for p in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
                if p in pending: pending.remove(p); group.add(p); queue.append(p)
        groups.append(group)
    for group in sorted(groups,key=len,reverse=True)[:3]:
        left=min(x for x,y in group); top=min(y for x,y in group)
        right=max(x for x,y in group)+1; bottom=max(y for x,y in group)+1
        head=flowers.crop((left,top,right,bottom)).resize((3,3),Image.Resampling.NEAREST)
        out.alpha_composite(head,(max(2,min(27,round((left+right)/8)-1)),max(2,min(27,round((top+bottom)/8)-1))))
    return out


def stats(image):
    return {'size': list(image.size), 'bbox': image.getbbox(), 'colors': len(image.getcolors(image.width*image.height)), 'alpha_values': sorted(set(image.getchannel('A').tobytes()))}


def main():
    manifest_path = ROOT / 'assets/manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    baseline = json.loads((ROOT/'assets/round7-prompts.json').read_text(encoding='utf-8'))['previous_manifest']
    previous = {group: {name: baseline.get('files',{}).get(group,{}).get(name,name+'.png') for name in baseline[group]} for group in ['objects','tiles']}
    output = {}
    for name, size in SPECS.items():
        if name == 'aisle-edge-right': image = output['objects/aisle-edge-left'].transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        else: image = sprite(name, size)
        output['objects/'+name] = image
    base = tile('G')
    for name in ['G','J','U','H','N']:
        image = base.copy() if name == 'G' else flower_tile(name,base) if name in ['J','U'] else tile('N') if name == 'N' else base.point(lambda v: (v*7+4)//8)
        if name == 'H': image.putalpha(255)
        output['tiles/'+name] = image
    report = {}
    for key,image in output.items():
        group,name = key.split('/')
        filename = (FILES if group=='objects' else TILES)[name]
        image.save(ROOT/'assets'/group/filename)
        report[key] = {**stats(image), 'file': filename}
        assert report[key]['colors'] <= 32
        assert set(report[key]['alpha_values']) <= {0,255}
        if group=='tiles':
            assert image.getchannel('A').getextrema() == (255,255)
            assert image.crop((0,0,1,32)).tobytes() == image.crop((31,0,32,32)).tobytes()
            assert image.crop((0,0,32,1)).tobytes() == image.crop((0,31,32,32)).tobytes()
    assert output['objects/arch'].crop((52,70,172,160)).getbbox() is None
    for name in ['aisle-edge-left','aisle-edge-right']:
        im=output['objects/'+name]
        assert im.getbbox()[2]-im.getbbox()[0] <=14
        assert im.crop((0,0,32,1)).tobytes()==im.crop((0,31,32,32)).tobytes()
    for name in ['J','U']:
        report['tiles/'+name]['shared_grass_pixels'] = sum(a==b for a,b in zip(base.get_flattened_data(),output['tiles/'+name].get_flattened_data()))
    # Only arch/platform and tiles replace selected assets; new IDs await Claude placement.
    objects = manifest.setdefault('files',{}).setdefault('objects',{})
    objects['arch'] = FILES['arch']; objects['platform'] = FILES['stage-steps']
    for name in SPECS:
        if name in ['arch','stage-steps']: continue
        if name not in manifest['objects']: manifest['objects'].append(name)
        objects[name] = FILES[name]
    manifest['files'].setdefault('tiles',{}).update(TILES)
    manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (ROOT/'assets/round7-report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    preview(output,previous)
    print(json.dumps(report,indent=2))


def preview(output, previous):
    font=ImageFont.truetype('C:/Windows/Fonts/malgun.ttf',18)
    small=ImageFont.truetype('C:/Windows/Fonts/malgun.ttf',14)
    sheet=Image.new('RGBA',(1100,1800),'#fff5df'); draw=ImageDraw.Draw(sheet)
    draw.text((24,12),'7차 에셋 비교 · 현재 / 새 버전 (배치는 Claude 연결 예정)',font=font,fill='#3d4935')
    for index,(key,im) in enumerate(output.items()):
        x=24+(index%2)*540; y=60+(index//2)*208
        group,name=key.split('/')
        draw.text((x,y),f'{name} · {im.width}×{im.height}',font=small,fill='#3d4935')
        oldname='platform' if name=='stage-steps' else 'tree' if name=='tree-green' else 'bush' if name.startswith('rose-bush') else 'aisle-flower-left' if name.startswith('aisle-edge') else name
        oldpath=ROOT/'assets'/group/previous[group].get(oldname,oldname+'.png')
        old=Image.open(oldpath).convert('RGBA') if oldpath.exists() else None
        if group=='tiles' and old and old.width==128: old=old.crop((32,32,64,64))
        scale=min(2,240/max(im.width,old.width if old else 0),145/max(im.height,old.height if old else 0))
        for j,pic in enumerate([old,im]):
            xx=x+j*255
            draw.text((xx,y+23),'현재' if j==0 else '새 버전',font=small,fill='#67745b')
            if pic:
                pic=pic.resize((round(pic.width*scale),round(pic.height*scale)),Image.Resampling.NEAREST)
                sheet.alpha_composite(pic,(xx,y+46))
            else: draw.text((xx,y+55),'신규',font=small,fill='#888877')
    sheet.convert('RGB').save(ROOT/'assets/round7-comparison.png')
    repeats=Image.new('RGBA',(640,270),'#fff5df'); d=ImageDraw.Draw(repeats)
    for i,name in enumerate(['G','J','U','H','N']):
        d.text((i*128+8,5),name+' · 3×3',font=small,fill='#33452d')
        for y in range(3):
            for x in range(3): repeats.alpha_composite(output['tiles/'+name],(i*128+8+x*32,32+y*32))
    for i,name in enumerate(['aisle-edge-left','aisle-edge-right']):
        d.text((i*220+8,145),name,font=small,fill='#33452d')
        for y in range(3): repeats.alpha_composite(output['objects/'+name],(i*220+8,170+y*32))
    repeats.save(ROOT/'assets/round7-repeats.png')


if __name__ == '__main__': main()
