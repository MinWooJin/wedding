"""Keep complete tree silhouettes inside the painted garden; preserve world geometry."""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parents[1]
G=(144,173,89,255)
RAW=ROOT/'raw/garden-framing-source'


def tree(name):
    im=Image.open(RAW/f'{name}.png').convert('RGBA')
    im.putalpha(im.getchannel('A').point(lambda a:255 if a>=180 else 0))
    im=im.crop(im.getbbox()); im.thumbnail((80,104),Image.Resampling.BOX)
    alpha=im.getchannel('A').point(lambda a:255 if a>=128 else 0)
    im=im.convert('RGB').quantize(colors=40,dither=Image.Dither.NONE).convert('RGBA');im.putalpha(alpha)
    return im


def ground_patch(image,rect):
    # Match the existing world-aligned outdoor ground along map edges too.
    grass=Image.open(ROOT/'assets/tiles/G-v5.png').convert('RGBA')
    x0,y0,x1,y1=rect
    for y in range(y0,y1):
        for x in range(x0,x1): image.putpixel((x,y),grass.getpixel((x%32,y%32)))


def put_tree(image,im,cx):
    x=round(cx-im.width/2); y=116-im.height
    image.alpha_composite(im,(x,y))
    rect=[x,y,x+im.width,y+im.height]
    assert rect[0]>=6 and rect[2]<=346 and rect[1]>=12 and rect[3]<=116
    return rect


def main():
    source=json.loads((ROOT/'assets/garden-framing-prompts.json').read_text(encoding='utf-8'))
    for p,digest in source['previous_png_sha256'].items(): assert hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==digest,p
    greens=tree('green');pink=tree('cherry');report={};frames=[]
    for name in ['hub-top','guestbook-bg']:
        before=Image.open(ROOT/'assets/maps'/f'{name}.png').convert('RGBA'); im=before.copy()
        if name=='hub-top':
            # Keep the arch and planter pixels that meet the corner clearing.
            keep=[((76,64,100,128),before.crop((76,64,100,128))),((252,64,276,128),before.crop((252,64,276,128)))]
            for rect in [(0,0,96,128),(256,0,352,128)]: ground_patch(im,rect)
            for rect,art in keep: im.paste(art,rect[:2])
        else:
            for rect in [(0,0,104,112),(248,0,352,112)]: ground_patch(im,rect)
        bounds=[put_tree(im,greens,46),put_tree(im,greens if name=='hub-top' else pink,306)]
        # Preserve every original color outside the repaired area and all joins.
        original_colors=list(dict.fromkeys(before.convert('RGB').get_flattened_data()))
        # Reuse the painted scene's exact palette: original geometry/joins stay
        # byte-identical, while new trees inherit its foliage/wood colors.
        palette=Image.new('P',(1,1)); colors=original_colors+[original_colors[0]]*(256-len(original_colors))
        palette.putpalette([v for rgb in colors for v in rgb])
        im=im.convert('RGB').quantize(palette=palette,dither=Image.Dither.NONE).convert('RGBA')
        # Pillow's palette lookup may approximate near-identical source colors.
        # Restore all untouched pixels explicitly, including the three-way join.
        im.paste(before.crop((0,128,352,before.height)),(0,128))
        im.paste(before.crop((104,0,248,128)),(104,0))
        if name=='hub-top': assert im.crop((0,128,352,256)).tobytes()==before.crop((0,128,352,256)).tobytes()
        else:
            # A short garden should not end as a rectangular photo pasted on
            # the larger lawn. Leave irregular grass margins around its plants.
            grass=Image.open(ROOT/'assets/tiles/G-v5.png').convert('RGBA')
            for y in range(128,448):
                for x in range(352):
                    edge=min(x,351-x,447-y)
                    margin=4+((x//3*13+y//3*7)%5)
                    if edge<margin: im.putpixel((x,y),grass.getpixel((x%32,y%32)))
        im.save(ROOT/'assets/maps'/f'{name}-v2.png')
        assert im.getchannel('A').getextrema()==(255,255)
        assert len(im.getcolors(im.width*im.height))<=64
        report[name]={'file':f'{name}-v2.png','size':list(im.size),'tree_bounds':bounds,'colors':len(im.getcolors(im.width*im.height)),'original':f'{name}.png'}
        frames.append((name,before,im))
    manifest_path=ROOT/'assets/manifest.json';manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
    for name in report: manifest.setdefault('files',{}).setdefault('maps',{})[name]=report[name]['file']
    manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (ROOT/'assets/garden-framing-report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    sheet=Image.new('RGB',(760,632),'#fff5e6'); d=ImageDraw.Draw(sheet);font=ImageFont.truetype('C:/Windows/Fonts/malgun.ttf',16)
    for i,(name,before,after) in enumerate(frames):
        y=12+i*310;d.text((20,y),name+' · 이전',fill='#3d4935',font=font);d.text((396,y),name+' · 수정',fill='#3d4935',font=font)
        for x,pic in [(20,before),(396,after)]:sheet.paste(pic.crop((0,0,352,256)).convert('RGB'),(x,y+30))
    sheet.save(ROOT/'assets/garden-framing-comparison.png')
    print(json.dumps(report,indent=2))


if __name__=='__main__':main()
