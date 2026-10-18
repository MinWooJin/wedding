import { Scene } from './scene.js';
import { HUB_DOORS } from './hub.js';
import { galleryLayout } from './gallery-layout.js';
import { openViewer } from '../ui/viewer.js';
import { toast } from '../ui/toast.js';
import { TILE, spriteCanvas } from '../renderer.js';
import { objectSprite } from '../sprites/objects.js';
import { makeHostNpc } from './host-npc.js';

// frame 스프라이트(64×64) 안쪽 사진 영역(액자 PNG의 테두리 안쪽)
const THUMB_X = 27, THUMB_Y = 28, THUMB_W = 45, THUMB_H = 42;

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
    let assets = game.assets;
    const originalFrame = assets?.objects?.frame ?? objectSprite('frame');
    if (originalFrame) {
      const canvas = document.createElement('canvas'); canvas.width = 96; canvas.height = 96;
      const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(spriteCanvas(originalFrame), 0, 0, 96, 96);
      assets = { ...assets, objects: { ...assets.objects, frame: { w: 96, h: 96, canvas } } };
    }
    const images = files.map((f) => { const img = new Image(); img.decoding = 'async'; img.src = `gallery/${f}`; return img; });
    const objects = [
      { id: 'door', sprite: 'door', floor: true, ...L.exit },
      ...L.frames.map((f) => ({
        id: `frame${f.index}`, sprite: 'frame', tx: f.tx, ty: f.ty, stand: f.stand,
        interact: () => openViewer(game, images, f.index),
      })),
    ];
    // 사진이 없을 때 안내 이젤: 방 가운데 축(x176)에 맞추고(반 칸 좌표라 충돌 없이), 설 자리는 아래 가운데
    if (files.length === 0) objects.push({ id: 'empty', sprite: 'welcome-board', label: '우리의 사진을 기다려 주세요', tx: 4.5, ty: 3, solid: false, stand: { tx: 5, ty: 5 }, interact: () => toast('사진은 마지막 준비 단계에서 채워질 예정이에요 📷') });
    if (game.assets?.objects?.window) objects.push({ id: 'winL', sprite: 'window', tx: 2, ty: -1 }, { id: 'winR', sprite: 'window', tx: 7, ty: -1 });

    if (game.assets?.objects?.plant) objects.push({ id: 'plantL', sprite: 'plant', tx: 1, ty: L.exit.ty - 3 }, { id: 'plantR', sprite: 'plant', tx: 9, ty: L.exit.ty - 3 });

    super({
      id: 'gallery', rows: L.rows, bg: '#f6efe7', spawn: L.spawn, assets,
      // 두 사람이 방 한가운데 통로에 단상처럼 나란히 선다(액자·이젤 앞이 아닌 빈 바닥)
      npcs: [makeHostNpc(game, 'groom', { tx: 4.45, ty: L.hostRow }, [
        files.length ? '액자를 누르면 사진을 크게 볼 수 있어요.' : '우리의 사진은 조금 더 준비하고 있어요. 완성되면 이곳에 담아둘게요.',
        '함께한 순간들을 천천히 둘러봐 주세요.',
      ]), makeHostNpc(game, 'bride', { tx: 5.55, ty: L.hostRow }, [
        '사진 속 이야기를 하나씩 들려드릴게요.',
        '마음에 드는 사진이 있으면 오래 보고 가세요.',
      ])],
      entrances: [{ ...L.exit, to: 'hub', spawn: HUB_DOORS.gallery.back }],
      objects,
    });
    this.frames = L.frames;
    this.images = images;
    this.thumbs = new Array(files.length).fill(null);
    this.objects.forEach((o) => {
      const f = L.frames.find((entry) => `frame${entry.index}` === o.id);
      if (f) o.drawContent = (r) => { const thumb = this.thumbs[f.index]; if (thumb) r.drawCanvas(thumb, f.tx * TILE + THUMB_X, o.drawY + THUMB_Y); };
    });
    images.forEach((img, i) => {
      img.addEventListener('load', () => { this.thumbs[i] = makeThumb(img); }, { once: true });
      img.addEventListener('error', () => console.warn('사진 로드 실패', files[i]), { once: true });
    });
  }

}

export function createGallery(game) { return new GalleryScene(game, game.gallery ?? []); }
