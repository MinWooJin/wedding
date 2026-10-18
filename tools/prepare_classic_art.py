"""Compose classic invitation preview art from existing project sprites only."""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'classic/img'

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    manifest=json.loads((ROOT/'assets/manifest.json').read_text(encoding='utf-8'))
    cfg=json.loads((ROOT/'data/config.json').read_text(encoding='utf-8'))
    def asset(category,name):
        filename=manifest.get('files',{}).get(category,{}).get(name,name+'.png')
        return Image.open(ROOT/'assets'/category/filename).convert('RGBA')
    top=asset('maps','hub-top'); guestbook=asset('maps','guestbook-bg')
    image=top.crop((0,0,352,240))
    corner=guestbook.crop((256,0,352,128))
    image.paste(corner,(256,0));image.paste(ImageOps.mirror(corner),(0,0))
    for rect in [(76,64,100,128),(252,64,276,128)]:image.paste(top.crop(rect),rect[:2])
    grass=asset('tiles','G')
    for x0,x1 in [(80,128),(224,272)]:
        for y in range(184,240):
            for x in range(x0,x1):image.putpixel((x,y),grass.getpixel((x%grass.width,y%grass.height)))
    image.alpha_composite(asset('characters','couple'),(128,88))
    for name,x in [('aisle-flower-left',96),('aisle-flower-right',224)]:
        image.alpha_composite(asset('objects',name),(x,184))
    for name,cx in [('preset-2',46),('guest-extra-2',306)]:
        image.alpha_composite(asset('characters',name),(cx-24,162))
    image.convert('RGB').save(OUT/'garden-preview.png')

    og=Image.new('RGB',(1200,630),'#faf6ee');draw=ImageDraw.Draw(og)
    draw.rounded_rectangle((34,28,1166,602),radius=28,outline='#dfdace',width=2)
    draw.rounded_rectangle((430,48,770,304),radius=128,fill='#f5e5e9')
    couple=asset('characters','couple').resize((288,216),Image.Resampling.NEAREST)
    og.paste(couple,(456,76),couple)
    font_path='C:/Windows/Fonts/malgun.ttf'
    for text,y,size,color in [
        ('OUR WEDDING',320,18,'#a95670'),
        (cfg['groom']['name']+' ♥ '+cfg['bride']['name'],361,48,'#4f5143'),
        ('2027. 01. 09 SAT 11:30 AM',442,28,'#756a61'),
        (cfg['wedding']['venue']+' '+cfg['wedding']['hall'],496,28,'#756a61')]:
        draw.text((600,y),text,font=ImageFont.truetype(font_path,size),fill=color,anchor='mt')
    for side in ['groom','bride']:og.save(OUT/f'og-{side}.png')
    print('Saved opaque preview 352x240 and two 1200x630 share cards from existing art.')

if __name__=='__main__':main()
