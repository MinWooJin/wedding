import { Scene } from './scene.js';
import { HUB_DOORS } from './hub.js';
import { galleryLayout } from './gallery-layout.js';
import { openViewer } from '../ui/viewer.js';
import { toast } from '../ui/toast.js';
import { TILE } from '../renderer.js';

// frame 스프라이트(64×64) 안쪽 사진 영역(액자 PNG의 테두리 안쪽)
const THUMB_X = 18, THUMB_Y = 19, THUMB_W = 30, THUMB_H = 28;

/** 이미지를 썸네일 캔버스로(cover 크롭) */
function makeThumb(img) {
  const c = document.createElement('canvas');
  c.width = THUMB_W; c.height = THUMB_H;
  const ctx = c.getContext('2d');
  const s = Math.max(THUMB_W / img.naturalWidth, THUMB_H / img.naturalHeight);
  const w = img.naturalWidth * s, h = img.naturalHeight * s;
  ctx.drawImage(img, (THUMB_W - w) / 2, (THUMB_H - h) / 2, w, h);
  return c;
}

export class GalleryScene extends Scene {
  /** @param files gallery/manifest.json의 파일명 배열 */
  constructor(game, files) {
    const L = galleryLayout(files.length);
    const images = files.map((f) => { const img = new Image(); img.decoding = 'async'; img.src = `gallery/${f}`; return img; });
    const objects = [
      { id: 'door', sprite: 'door', floor: true, ...L.exit },
      ...L.frames.map((f) => ({
        id: `frame${f.index}`, sprite: 'frame', tx: f.tx, ty: f.ty, stand: f.stand,
        interact: () => openViewer(game, images, f.index),
      })),
    ];
    if (files.length === 0) objects.push({ id: 'empty', sprite: 'sign', tx: 5, ty: 2, interact: () => toast('사진을 준비하고 있어요 📷') });

    super({
      id: 'gallery', rows: L.rows, bg: '#3b2a1e', spawn: L.spawn, assets: game.assets,
      entrances: [{ ...L.exit, to: 'hub', spawn: HUB_DOORS.gallery.back }],
      objects,
    });
    this.frames = L.frames;
    this.images = images;
    this.thumbs = new Array(files.length).fill(null);
    images.forEach((img, i) => {
      img.addEventListener('load', () => { this.thumbs[i] = makeThumb(img); }, { once: true });
      img.addEventListener('error', () => console.warn('사진 로드 실패', files[i]), { once: true });
    });
  }

  draw(r, player) {
    super.draw(r, player);
    for (const f of this.frames) {
      const t = this.thumbs[f.index];
      if (t) r.drawCanvas(t, f.tx * TILE + THUMB_X, f.ty * TILE + THUMB_Y);
    }
  }
}

export function createGallery(game) { return new GalleryScene(game, game.gallery ?? []); }
