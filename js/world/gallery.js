import { Scene } from './scene.js';
import { HUB_DOORS } from './hub.js';
import { galleryLayout } from './gallery-layout.js';
import { openViewer } from '../ui/viewer.js';
import { toast } from '../ui/toast.js';
import { TILE } from '../renderer.js';
import { makeHostNpc } from './host-npc.js';

/**
 * 세로 사진 액자(96×112, 3칸×4행). 예전 액자 그림은 안쪽 구멍이 22×19px밖에 안 돼 사진이 테두리를 덮고 작게 보였다.
 * 나무 테두리와 금빛 안쪽 선을 코드로 그리고, 그 안(3:4, 72×96)에 사진을 꽉 채운다.
 */
export const FRAME_W = 96, FRAME_H = 112;
export const PHOTO = { x: 12, y: 8, w: 72, h: 96 };
const THUMB_SCALE = 3; // 화면 배율(2~3배)에서도 또렷하게: 사진은 3배 해상도로 줄여 두고 부드럽게 그린다

function frameCanvas() {
  const c = document.createElement('canvas'); c.width = FRAME_W; c.height = FRAME_H;
  const ctx = c.getContext('2d');
  const fill = (color, x, y, w, h) => { if (!ctx.fillRect) return; ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
  const { x, y, w, h } = PHOTO;
  fill('rgba(60,40,24,.22)', x - 4, y - 4, w + 10, h + 10);   // 벽에 드리운 그림자(오른쪽 아래)
  fill('#5a3d27', x - 6, y - 6, w + 12, h + 12);               // 바깥 어두운 테
  fill('#9a6b42', x - 5, y - 5, w + 10, h + 10);               // 나무
  fill('#c08d5a', x - 5, y - 5, w + 10, 1); fill('#c08d5a', x - 5, y - 5, 1, h + 10); // 위·왼쪽 빛
  fill('#e6c77d', x - 2, y - 2, w + 4, h + 4);                 // 금빛 안쪽 선
  fill('#4a3322', x - 1, y - 1, w + 2, h + 2);
  fill('#efe6d8', x, y, w, h);                                  // 사진이 오기 전 바탕
  for (const [cx, cy] of [[x - 5, y - 5], [x + w + 3, y - 5], [x - 5, y + h + 3], [x + w + 3, y + h + 3]]) fill('#e6c77d', cx, cy, 2, 2); // 모서리 장식
  return c;
}

/** 이미지를 액자 안 크기(3배 해상도)로 cover 크롭 */
function makeThumb(img) {
  const c = document.createElement('canvas');
  c.width = PHOTO.w * THUMB_SCALE; c.height = PHOTO.h * THUMB_SCALE;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  const s = Math.max(c.width / img.naturalWidth, c.height / img.naturalHeight);
  const w = img.naturalWidth * s, h = img.naturalHeight * s;
  ctx.drawImage(img, (c.width - w) / 2, (c.height - h) / 2, w, h);
  return c;
}

export class GalleryScene extends Scene {
  /** @param files gallery/manifest.json의 파일명 배열 */
  constructor(game, files) {
    const L = galleryLayout(files.length);
    const assets = { ...game.assets, objects: { ...game.assets?.objects, frame: { w: FRAME_W, h: FRAME_H, canvas: frameCanvas() } } };
    const images = files.map((f) => { const img = new Image(); img.decoding = 'async'; img.src = `gallery/${f}`; return img; });
    const objects = [
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
      // 걸어서 나가는 문·매트는 없다(하단 "정원으로" 버튼). 이 항목은 그 버튼이 돌아갈 광장 자리만 알려 준다(화면 밖 좌표).
      entrances: [{ tx: -9, ty: -9, to: 'hub', spawn: HUB_DOORS.gallery.back }],
      objects,
    });
    this.frames = L.frames;
    this.images = images;
    this.thumbs = new Array(files.length).fill(null);
    this.objects.forEach((o) => {
      const f = L.frames.find((entry) => `frame${entry.index}` === o.id);
      if (f) o.drawContent = (r) => {
        const thumb = this.thumbs[f.index];
        if (!thumb) return;
        if (r.drawPhoto) r.drawPhoto(thumb, f.tx * TILE + PHOTO.x, o.drawY + PHOTO.y, PHOTO.w, PHOTO.h);
        else r.drawCanvas(thumb, f.tx * TILE + PHOTO.x, o.drawY + PHOTO.y);
      };
    });
    images.forEach((img, i) => {
      img.addEventListener('load', () => { this.thumbs[i] = makeThumb(img); }, { once: true });
      img.addEventListener('error', () => console.warn('사진 로드 실패', files[i]), { once: true });
    });
  }

}

export function createGallery(game) { return new GalleryScene(game, game.gallery ?? []); }
