"""Fit built-in ImageGen artwork to the explicitly requested game pixel grids.

No API calls. Source art: raw/round10-source (ignored). Only new v1 files,
comparison boards and review stills are written; existing art stays intact.
Run: .venv-assets/Scripts/python.exe tools/prepare_round10_assets.py
"""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageDraw, ImageFont, ImageChops

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'raw/round10-source'
ROWS = [200, 228, 256, 284]
COLS = [32, 60, 88, 116, 236, 264, 292, 320]
REPORT = {'files': {}, 'seats': {'x': COLS, 'feetY': ROWS}, 'stage': {'rect': [96,150,256,176], 'groomFeet':[154,168], 'brideFeet':[198,168]}, 'aisle':[144,176,208,288], 'effects': {'petals':{'frameSize':[8,8],'origins':[[0,0],[8,0],[16,0],[24,0]]},'heart':{'frameSize':[8,8],'origins':[[0,0],[8,0]],'unusedTransparentRect':[0,8,16,16]}}}


def source(name):
    return Image.open(RAW / (name+'.png')).convert('RGBA')


def clean(im):
    im = im.copy().convert('RGBA')
    # Alpha threshold discards generated edge fringes before nearest fitting.
    im.putalpha(im.getchannel('A').point(lambda v: 255 if v >= 200 else 0))
    return im


def palette(im, colors=48, opaque=False):
    im = clean(im)
    alpha = Image.new('L',im.size,255) if opaque else im.getchannel('A')
    visible = [rgb[:3] for rgb in im.get_flattened_data() if rgb[3]]
    strip = Image.new('RGB',(max(1,len(visible)),1));strip.putdata(visible or [(0,0,0)])
    pal = strip.quantize(colors=colors if opaque else colors-1,dither=Image.Dither.NONE)
    result = im.convert('RGB').quantize(palette=pal,dither=Image.Dither.NONE).convert('RGBA')
    result.putalpha(alpha)
    result.paste((0,0,0,0),(0,0),alpha.point(lambda v:255-v))
    return result


def fit(im, size, max_body=None):
    im=clean(im)
    box=im.getbbox()
    if not box: raise ValueError('Empty sprite')
    im=im.crop(box)
    limits=max_body or size
    ratio=min(limits[0]/im.width,limits[1]/im.height)
    im=im.resize((max(1,round(im.width*ratio)),max(1,round(im.height*ratio))),Image.Resampling.NEAREST)
    out=Image.new('RGBA',size)
    out.alpha_composite(im,((size[0]-im.width)//2,size[1]-im.height))
    return out


def save(im, relative, colors=48, opaque=False, frames=None):
    im=palette(im,colors,opaque)
    p=ROOT/relative;p.parent.mkdir(parents=True,exist_ok=True);im.save(p)
    item={'size':list(im.size),'rgbaColors':len(im.getcolors(im.width*im.height)), 'alpha':sorted(set(im.getchannel('A').get_flattened_data())), 'bbox':im.getbbox(), 'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
    if frames:
        fw,fh=frames
        cells=[im.crop((x,0,x+fw,fh)) for x in range(0,im.width,fw)]
        item['frameSize']=[fw,fh];item['frames']=[{'bbox':c.getbbox(),'sha256':hashlib.sha256(c.tobytes()).hexdigest()} for c in cells]
    REPORT['files'][relative]=item
    return im


def sheet(name, columns, rows, frame_size, output, guests=False):
    raw=source(name);fw,fh=frame_size
    out=Image.new('RGBA',(fw*(12 if guests else 8),fh))
    cells=[]
    order=[(c,r) for c in range(6) for r in range(2)] if guests else [(c,r) for r in range(rows) for c in range(columns)]
    for index,(c,r) in enumerate(order):
        cell=raw.crop((round(c*raw.width/columns),round(r*raw.height/rows),round((c+1)*raw.width/columns),round((r+1)*raw.height/rows)))
        # 26px seated silhouettes fit the 28px seat pitch. Their heads stay
        # above their own backrest and below the preceding row's backrest.
        height=26 if guests else 56 if index==5 else 64
        frame=fit(cell,frame_size,(34 if guests else 42,height))
        out.alpha_composite(frame,(fw*index,0));cells.append(frame)
    return save(out,output,frames=frame_size)


def environment():
    raw=source('back-clean').resize((352,288),Image.Resampling.NEAREST)
    back=Image.new('RGBA',(352,288))
    # Separate the top surface from the vertical front panel. Characters at
    # feetY168 must stand ON the y150..176 top, not on the front panel.
    for a,b,c,d in [(0,143,0,150),(143,158,150,176),(158,173,176,184)]:
        back.paste(raw.crop((0,a,352,b)).resize((352,d-c),Image.Resampling.NEAREST),(0,c))
    floor=raw.crop((0,173,352,288)).resize((352,104),Image.Resampling.NEAREST)
    # Rectify the generated slight perspective to the required parallel aisle.
    for y in range(104):
        left=round(145-7*y/103);right=round(206+7*y/103)
        for x0,x1,outx,w in [(0,left,0,144),(left,right,144,64),(right,352,208,144)]:
            back.paste(floor.crop((x0,y,x1,y+1)).resize((w,1),Image.Resampling.NEAREST),(outx,y+184))
    generated=clean(source('front').resize((352,288),Image.Resampling.NEAREST))
    chair=fit(generated.crop((9,176,36,195)),(20,8))
    cushion=chair.resize((20,4),Image.Resampling.NEAREST)
    front=Image.new('RGBA',(352,288))
    for y in ROWS:
        for x in COLS:
            back.alpha_composite(cushion,(x-10,y-3))
            front.alpha_composite(chair,(x-10,y-8))
    # Independent flower/lantern clusters, no continuous flower wall.
    bloom=fit(generated.crop((127,174,148,207)),(12,17))
    for y in [188,229,270]:
        front.alpha_composite(bloom,(132,y))
        front.alpha_composite(bloom.transpose(Image.Transpose.FLIP_LEFT_RIGHT),(208,y))
    return save(back,'assets/ceremony/ceremony-back-v1.png',96,True),save(front,'assets/ceremony/ceremony-front-v1.png')


def effects():
    petals=Image.new('RGBA',(32,8));raw=source('petals')
    for c in range(4):
        cell=raw.crop((round(raw.width*c/4),0,round(raw.width*(c+1)/4),raw.height))
        icon=fit(cell,(8,8),(5,6));petals.alpha_composite(icon,(c*8,0))
    heart=Image.new('RGBA',(16,16));raw=source('heart')
    for c in range(2):
        cell=raw.crop((round(raw.width*c/2),0,round(raw.width*(c+1)/2),raw.height//2))
        icon=fit(cell,(8,8),(7,7));heart.alpha_composite(icon,(c*8,0))
    save(petals,'assets/ceremony/ceremony-petals-v1.png',8)
    save(heart,'assets/ceremony/ceremony-heart-v1.png',8)


def existing(category,name):
    manifest=json.loads((ROOT/'assets/manifest.json').read_text(encoding='utf-8'))
    f=manifest.get('files',{}).get(category,{}).get(name,name+'.png')
    return Image.open(ROOT/'assets'/category/f).convert('RGBA')


def font(size=14):
    return ImageFont.truetype('C:/Windows/Fonts/malgun.ttf',size)


def stills(back,front,groom,bride,guests):
    for state in ['seated','facing','march']:
        scene=back.copy()
        for r,y in enumerate(ROWS):
            for c,x in enumerate(COLS):
                who=(r*8+c)%6;frame=who*2+(state=='march')
                scene.alpha_composite(guests.crop((frame*40,0,(frame+1)*40,48)),(x-20,y-48))
        if state=='facing':
            for sheet,index,x in [(groom,4,154),(bride,4,198)]:scene.alpha_composite(sheet.crop((index*48,0,(index+1)*48,72)),(x-24,168-72))
        elif state=='march':
            for name,x in [('groom',158),('bride',194)]:scene.alpha_composite(existing('characters',name),(x-24,246-72))
        scene.alpha_composite(front)
        scene.save(ROOT/f'tools/round10-ceremony-{state}.png')
    # A board is a review artifact; these code labels never enter game sprites.
    board=Image.new('RGB',(816,268),'#faf6ee');d=ImageDraw.Draw(board)
    labels=[('갤러리관','gallery',112),('마음 전하는 곳','gifts',96),('예식 안내관','info',112)]
    for i,(title,name,h) in enumerate(labels):
        x=i*272;d.text((x+12,12),title,font=font(),fill='#453b32')
        old=existing('objects','sign');board.paste(old,(x+20,188-old.height),old)
        new=Image.open(ROOT/f'assets/objects/landmark-{name}-v1.png').convert('RGBA')
        board.paste(new,(x+134,188-h),new)
        d.text((x+16,207),'기존 64×64',font=font(12),fill='#736c62')
        d.text((x+128,207),f'새 그림 96×{h}',font=font(12),fill='#a95670')
    board.save(ROOT/'assets/round10-landmarks-comparison.png')
    frames=Image.new('RGB',(1060,488),'#faf6ee');d=ImageDraw.Draw(frames)
    for sheet,label,y,fw,fh in [(groom,'신랑 0~7',12,48,72),(bride,'신부 0~7',180,48,72),(guests,'하객 6명 × 2',348,40,48)]:
        d.text((10,y+12),label,font=font(12),fill='#453b32')
        for n in range(sheet.width//fw):
            sprite=sheet.crop((n*fw,0,(n+1)*fw,fh)).resize((fw*2,fh*2),Image.Resampling.NEAREST)
            frames.paste(sprite,(92+n*fw*2,y+20),sprite)
            d.text((96+n*fw*2,y),str(n),font=font(10),fill='#736c62')
    frames.save(ROOT/'assets/round10-characters-comparison.png')
    hub=Image.new('RGBA',(352,864))
    for name,y in [('hub-top',0),('hub-repeat',256),('hub-bottom',544)]:hub.alpha_composite(existing('maps',name),(0,y))
    def place(im,x,feet):hub.alpha_composite(im,(round(x-im.width/2),feet-im.height))
    for x,y in [(48,636),(304,636),(48,764),(304,764)]:place(existing('objects','door'),x,y)
    place(existing('objects','welcome-board'),80,636)
    for name,x,y in [('ribbon-lantern',112,668),('party-table',144,668),('wedding-cake',176,636)]:place(existing('objects',name),x,y)
    for name,x,y in [('gallery',240,668),('gifts',112,796),('info',240,796)]:place(Image.open(ROOT/f'assets/objects/landmark-{name}-v1.png').convert('RGBA'),x,y)
    hub.crop((0,512,352,864)).save(ROOT/'tools/round10-hub-proposal.png')
    REPORT['landmarkProposal']={'gallery':{'centerX':240,'feetY':668,'rect':[192,556,288,668]},'gifts':{'centerX':112,'feetY':796,'rect':[64,700,160,796]},'info':{'centerX':240,'feetY':796,'rect':[192,684,288,796]},'doors':{'x':[48,304],'feetY':[636,764]},'cake':{'centerX':176,'feetY':636},'previewWorldTop':512}
    def mask(im,x,feet):
        layer=Image.new('L',(352,864));layer.paste(im.getchannel('A'),(round(x-im.width/2),feet-im.height));return layer
    checks=[]
    for name,x,y in [('gallery',240,668),('gifts',112,796),('info',240,796)]:
        art=Image.open(ROOT/f'assets/objects/landmark-{name}-v1.png').convert('RGBA');a=mask(art,x,y)
        for ox,oy in [(48,636),(304,636),(48,764),(304,764)]:
            assert ImageChops.multiply(a,mask(existing('objects','door'),ox,oy)).getbbox() is None,'Landmark covers door'
        assert ImageChops.multiply(a,mask(existing('objects','wedding-cake'),176,636)).getbbox() is None,'Landmark covers cake'
        checks.append(name)
    REPORT['checks']={'landmarksClearOfAllFourDoorsAndCake':checks,'foregroundClearOfAll32GuestHeads':True,'frameBaseline':'exclusive bottom y72 / y48; last opaque row y71 / y47','seatedVisibleHeight':26,'seatedHeadLocalRect':[10,22,30,39],'backrestHeight':8,'floorAisleStartsBelowStageFrontAtY':184}


def main():
    for name,size in [('gallery',(96,112)),('gifts',(96,96)),('info',(96,112))]:save(fit(source(name),size),f'assets/objects/landmark-{name}-v1.png')
    groom=sheet('groom',4,2,(48,72),'assets/characters/groom-ceremony-v1.png')
    bride=sheet('bride',8,1,(48,72),'assets/characters/bride-ceremony-v1.png')
    guests=sheet('guests',6,2,(40,48),'assets/characters/guest-seated-v1.png',True)
    back,front=environment();effects()
    save(source('map').resize((352,200),Image.Resampling.NEAREST),'assets/ceremony/map-v1.png',48,True)
    stills(back,front,groom,bride,guests)
    # A single source sheet palette guarantees consistent colors across poses.
    for relative,item in REPORT['files'].items():
        assert item['alpha'] in [[255],[0,255]],relative
        if 'landmark-' in relative:assert item['rgbaColors']<=48,relative
        if 'frames' in item:
            for frame in item['frames']:assert frame['bbox'][3]==item['frameSize'][1],relative
        if 'ceremony-v1' in relative and 'frames' in item:
            assert len({f['sha256'] for f in item['frames'][:4]})==4,'Four walking frames must differ'
            assert all(f['bbox'][1]==8 for f in item['frames'][:4]),'Walking head height must stay fixed'
    assert front.crop((144,0,208,288)).getbbox() is None,'Aisle must remain transparent'
    assert front.crop((0,0,352,178)).getbbox() is None,'Foreground must not cover stage faces'
    for y in ROWS:
        for x in COLS:
            assert front.crop((x-10,y-26,x+10,y-9)).getbbox() is None,'Chair must not cover a guest head'
    (ROOT/'assets/round10-report.json').write_text(json.dumps(REPORT,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    print('Prepared',len(REPORT['files']),'sprites and six review boards; geometry assertions passed.')


if __name__=='__main__':main()
