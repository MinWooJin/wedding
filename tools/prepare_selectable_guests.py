"""Fit the twenty generated selectable guests without rebuilding existing art.

Run: .venv-assets/Scripts/python.exe tools/prepare_selectable_guests.py
Originals live in ignored raw/selectable-guests-source; final PNGs are standalone.
"""
import hashlib
import json
from collections import deque
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
RAW=ROOT/'raw/selectable-guests-source'


def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()


def prepare(id):
    im=Image.open(RAW/f'preset-{id}.png').convert('RGBA')
    # Some generated originals include faint semi-transparent glow. Keep only
    # their solid character pixels, not the glow, before small-grid fitting.
    im.putalpha(im.getchannel('A').point(lambda a:255 if a>=230 else 0))
    im=im.crop(im.getbbox())
    width=max(32,min(36,round(im.width*62/im.height)))
    if id<14:
        # The first four originals have taller adult proportions. Fit their
        # head/torso bands to the same compact head size as existing avatars.
        split=round(im.height*(.34 if id==11 else .31))
        fitted=Image.new('RGBA',(width,62))
        fitted.paste(im.crop((0,0,im.width,split)).resize((width,25),Image.Resampling.NEAREST),(0,0))
        fitted.paste(im.crop((0,split,im.width,im.height)).resize((width,37),Image.Resampling.NEAREST),(0,25))
        im=fitted
    else:im=im.resize((width,62),Image.Resampling.NEAREST)
    alpha=im.getchannel('A').point(lambda a:255 if a>=128 else 0)
    im=im.convert('RGB').quantize(colors=31,dither=Image.Dither.NONE).convert('RGBA')
    im.putalpha(alpha);im.paste((0,0,0,0),(0,0),alpha.point(lambda a:255-a))
    # Remove only isolated resampling specks, keeping the actual silhouette.
    seen=set()
    for y in range(im.height):
        for x in range(im.width):
            if (x,y) in seen or not im.getpixel((x,y))[3]:continue
            queue=deque([(x,y)]);seen.add((x,y));component=[]
            while queue:
                px,py=queue.popleft();component.append((px,py))
                for nx,ny in [(px-1,py),(px+1,py),(px,py-1),(px,py+1)]:
                    if 0<=nx<im.width and 0<=ny<im.height and (nx,ny) not in seen and im.getpixel((nx,ny))[3]:seen.add((nx,ny));queue.append((nx,ny))
            if len(component)<4:
                for point in component:im.putpixel(point,(0,0,0,0))
    im=im.crop(im.getbbox())
    out=Image.new('RGBA',(48,72));out.alpha_composite(im,((48-im.width)//2,72-im.height))
    return out


def main():
    manifest_path=ROOT/'assets/manifest.json'
    manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
    def old_path(i):return ROOT/'assets/characters'/manifest.get('files',{}).get('characters',{}).get(f'preset-{i}',f'preset-{i}.png')
    original_hashes={str(i):digest(old_path(i)) for i in range(10)}
    report={'count':30,'newIds':list(range(10,30)),'frameSize':[48,72],'originalPresetsSha256':original_hashes,'files':{}}
    for id in range(10,30):
        im=prepare(id);filename=f'preset-{id}-v1.png';path=ROOT/'assets/characters'/filename;im.save(path)
        bbox=im.getbbox();colors=len(im.getcolors(48*72))
        assert im.size==(48,72) and bbox[3]==72 and 60<=bbox[3]-bbox[1]<=62
        assert colors<=32 and set(im.getchannel('A').tobytes())=={0,255}
        report['files'][f'preset-{id}']={'file':filename,'size':[48,72],'bbox':bbox,'rgbaColors':colors,'alpha':[0,255],'sha256':digest(path)}
        if f'preset-{id}' not in manifest['characters']:manifest['characters'].append(f'preset-{id}')
        manifest.setdefault('files',{}).setdefault('characters',{})[f'preset-{id}']=filename
    assert len({x['sha256'] for x in report['files'].values()})==20
    for i in range(10):assert digest(old_path(i))==original_hashes[str(i)],'Existing preset changed'
    manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    (ROOT/'assets/selectable-guests-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    board=Image.new('RGB',(720,630),'#faf6ee');draw=ImageDraw.Draw(board)
    font=ImageFont.truetype('C:/Windows/Fonts/malgun.ttf',14)
    for i in range(30):
        path=old_path(i) if i<10 else ROOT/f'assets/characters/preset-{i}-v1.png'
        x=(i%6)*120+12;y=(i//6)*126
        sprite=Image.open(path).convert('RGBA').resize((72,108),Image.Resampling.NEAREST)
        board.paste(sprite,(x+12,y),sprite)
        draw.text((x+44,y+110),str(i+1),font=font,fill='#736c62',anchor='mt')
    board.save(ROOT/'assets/selectable-guests-comparison.png')
    print('Prepared 20 unique 48x72 avatars, 30-person board; existing ten preserved.')


if __name__=='__main__':main()
