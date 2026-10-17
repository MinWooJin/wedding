"""Prepare a continuous 128px lawn material and more readable flower variants."""
import json
from pathlib import Path
from PIL import Image, ImageStat, ImageOps

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets'
SOURCE=ROOT/'raw'/'lawn-review-source'


def sprite(path, frame, bounds):
    im=Image.open(path).convert('RGBA')
    im.putalpha(im.getchannel('A').point(lambda a:255 if a>=160 else 0))
    im=im.crop(im.getbbox()); im.thumbnail(bounds,Image.Resampling.BOX)
    alpha=im.getchannel('A').point(lambda a:255 if a>=128 else 0)
    im=im.convert('RGB').quantize(colors=32,dither=Image.Dither.NONE).convert('RGBA'); im.putalpha(alpha)
    result=Image.new('RGBA',frame); result.alpha_composite(im,((frame[0]-im.width)//2,frame[1]-im.height))
    return result


def main():
    im=Image.open(SOURCE/'lawn.png').convert('RGB').resize((128,128),Image.Resampling.BOX)
    mean=ImageStat.Stat(im).mean
    target=ImageStat.Stat(Image.open(OUT/'tiles'/'G-v3.png').convert('RGB')).mean
    im.putdata([tuple(max(0,min(255,round(target[k]+(c[k]-mean[k])*0.85))) for k in range(3)) for c in im.get_flattened_data()])
    lawn=im.quantize(colors=8,dither=Image.Dither.NONE).convert('RGBA')
    lawn.save(OUT/'tiles'/'lawn-v5.png')
    meadow=sprite(ROOT/'raw'/'garden-detail-source'/'meadow-sprig.png',(32,32),(32,26))
    airy=sprite(SOURCE/'flowers.png',(32,48),(32,40))
    objects={'meadow-sprig-v2.png':meadow,'aisle-flower-airy-left-v2.png':airy,'aisle-flower-airy-right-v2.png':ImageOps.mirror(airy)}
    report={'tiles/lawn':{'file':'lawn-v5.png','size':lawn.size,'colors':len(lawn.getcolors(128*128)),'world_repeat_px':128,'movement_tile_px':32}}
    for name,image in objects.items():
        image.save(OUT/'objects'/name)
        report[name]={'size':image.size,'bbox':image.getbbox(),'colors':len(image.getcolors(image.width*image.height)),'alpha_values':sorted(set(image.getchannel('A').tobytes()))}
    path=OUT/'manifest.json'; m=json.loads(path.read_text(encoding='utf-8'))
    for name in ['G','J','U']:m['files']['tiles'][name]='lawn-v5.png'
    m['files']['objects'].update({'meadow-sprig':'meadow-sprig-v2.png','aisle-flower-airy-left':'aisle-flower-airy-left-v2.png','aisle-flower-airy-right':'aisle-flower-airy-right-v2.png'})
    path.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (OUT/'lawn-review-report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    old=Image.open(OUT/'tiles'/'G-v4.png').convert('RGBA')
    comparison=Image.new('RGBA',(256,128))
    for y in range(4):
        for x in range(4):comparison.alpha_composite(old,(x*32,y*32))
    comparison.alpha_composite(lawn,(128,0))
    preview=Image.new('RGBA',(512,384),'#fff4df')
    preview.alpha_composite(comparison.resize((512,256),Image.Resampling.NEAREST))
    for image,x in [(Image.open(OUT/'objects'/'meadow-sprig.png'),24),(meadow,104),(Image.open(OUT/'objects'/'aisle-flower-airy-left.png'),240),(airy,336)]:
        preview.alpha_composite(image.convert('RGBA').resize((image.width*2,image.height*2),Image.Resampling.NEAREST),(x,384-image.height*2))
    preview.save(OUT/'lawn-review-preview.png')
    print(json.dumps(report))


if __name__=='__main__':main()
