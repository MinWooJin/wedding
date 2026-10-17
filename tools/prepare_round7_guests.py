"""Prepare only the six additional crowd PNGs; never rebuild existing guests.

Run with .venv-assets/Scripts/python.exe tools/prepare_round7_guests.py
Raw built-in imagegen sources are ignored; final PNGs work without them.
"""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
NAMES = [f'guest-extra-{i}' for i in range(6)]
RAW = ROOT/'raw/round7-guests-source'


def prepare(name):
    path = RAW/(name+('-selected' if name=='guest-extra-3' else '')+'.png')
    im = Image.open(path).convert('RGBA')
    im.putalpha(im.getchannel('A').point(lambda a:255 if a>=180 else 0))
    im = im.crop(im.getbbox())
    width = min(36,round(im.width*60/im.height))
    im = im.resize((width,60),Image.Resampling.BOX)
    alpha = im.getchannel('A').point(lambda a:255 if a>=128 else 0)
    im = im.convert('RGB').quantize(colors=31,dither=Image.Dither.NONE).convert('RGBA')
    im.putalpha(alpha)
    im.paste((0,0,0,0),(0,0),alpha.point(lambda a:255-a))
    im = im.crop(im.getbbox())
    out = Image.new('RGBA',(48,72))
    out.alpha_composite(im,((48-im.width)//2,72-im.height))
    return out


def main():
    provenance = json.loads((ROOT/'assets/round7-guests-prompts.json').read_text(encoding='utf-8'))
    for path,digest in provenance['previous_png_sha256'].items():
        assert hashlib.sha256((ROOT/path).read_bytes()).hexdigest()==digest, f'Existing PNG changed: {path}'
    report = {}
    images = []
    manifest_path = ROOT/'assets/manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    for name in NAMES:
        im = prepare(name); filename = name+'-v4.png'
        im.save(ROOT/'assets/characters'/filename)
        colors = len(im.getcolors(48*72)); bbox=im.getbbox()
        assert bbox[3]==72 and 58<=bbox[3]-bbox[1]<=60
        assert colors<=32 and set(im.getchannel('A').tobytes())=={0,255}
        report[name]={'file':filename,'size':[48,72],'bbox':bbox,'colors':colors,'alpha_values':[0,255],'role':'crowd-only; scene/loader integration by Claude'}
        images.append(im)
        if name not in manifest['characters']: manifest['characters'].append(name)
        manifest.setdefault('files',{}).setdefault('characters',{})[name]=filename
    manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (ROOT/'assets/round7-guests-report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    font=ImageFont.truetype('C:/Windows/Fonts/malgun.ttf',16)
    small=ImageFont.truetype('C:/Windows/Fonts/malgun.ttf',13)
    sheet=Image.new('RGBA',(768,420),'#fff5df'); draw=ImageDraw.Draw(sheet)
    draw.text((18,8),'기존 하객 v3 / 7차 추가 군중 6명 · 같은 2배 배율',font=font,fill='#3d4935')
    for row in range(2):
        draw.text((18,40+row*186),'기존' if row==0 else '추가',font=small,fill='#667553')
        for i in range(6):
            im=Image.open(ROOT/f'assets/characters/preset-{i}-v3.png').convert('RGBA') if row==0 else images[i]
            sheet.alpha_composite(im.resize((96,144),Image.Resampling.NEAREST),(20+i*124,62+row*186))
            draw.text((20+i*124,207+row*186),f'preset-{i}' if row==0 else f'guest-extra-{i}',font=small,fill='#3d4935')
    sheet.convert('RGB').save(ROOT/'assets/round7-guests-comparison.png')
    # Transparent contact sheet is an inspection artifact, never a walk sheet.
    contact=Image.new('RGBA',(288,72))
    for i,im in enumerate(images): contact.alpha_composite(im,(i*48,0))
    contact.save(ROOT/'assets/round7-guests-strip.png')
    print(json.dumps(report,indent=2))


if __name__=='__main__': main()
