/**
 * 정원에 흩날리는 벚꽃잎. 화면 기준 좌표로 천천히 떨어지며 좌우로 흔들리고, 아래로 나가면 위에서 다시 떨어진다.
 * 그림은 아래 8×8 픽셀 네 칸(분홍 벚꽃잎이 뒤집히며 떨어지는 모양)을 캔버스로 한 번 그려 쓴다. 움직임 줄이기 설정이면 그리지 않는다.
 * (예식장 꽃잎 시트는 크림색이라 모래빛 길 위에서 보이지 않는다.)
 */
export const PETAL_COUNT = 28;
const SIZE = 8;
const COLORS = { '#': '#f9c4d4', '+': '#ec8fab', 'o': '#d9718f' };
export const PETAL_FRAMES = [
  ['........', '.##.##..', '.##o##..', '.#####..', '.##+##..', '..###...', '...#....', '........'],
  ['........', '...##...', '..####..', '.##+##..', '.#####..', '..##o...', '...#....', '........'],
  ['........', '........', '..##....', '.####...', '..####..', '...+##..', '........', '........'],
  ['........', '....##..', '...####.', '..##+##.', '..#####.', '..##o...', '........', '........'],
];

let sheet = null;
/** 네 칸 꽃잎 그림(32×8). 브라우저에서만 만든다 */
export function petalSheet() {
  if (sheet || typeof document === 'undefined') return sheet;
  const c = document.createElement('canvas');
  c.width = SIZE * PETAL_FRAMES.length; c.height = SIZE;
  const ctx = c.getContext('2d');
  PETAL_FRAMES.forEach((rows, f) => rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (!COLORS[ch]) return;
    ctx.fillStyle = COLORS[ch]; ctx.fillRect(f * SIZE + x, y, 1, 1);
  })));
  return (sheet = c);
}

export class PetalField {
  constructor({ count = PETAL_COUNT, random = Math.random } = {}) {
    this.random = random;
    this.width = 0; this.height = 0;
    this.petals = Array.from({ length: count }, () => this.spawn(true));
  }

  /** 새 꽃잎. 처음에는 화면 곳곳에, 그다음부터는 화면 위쪽 바깥에서 */
  spawn(anywhere) {
    const r = this.random;
    return {
      x: r() * (this.width || 320), y: anywhere ? r() * (this.height || 600) : -SIZE - r() * 40,
      speed: 14 + r() * 14,          // 초당 아래로
      wind: 4 + r() * 6,             // 초당 오른쪽으로 살짝
      sway: 6 + r() * 10, phase: r() * Math.PI * 2, swaySpeed: 0.8 + r() * 1.2,
      spin: r() * 4, spinSpeed: 2 + r() * 4,
      alpha: 0.65 + r() * 0.35,
    };
  }

  /** @param view 화면 크기(월드 픽셀 단위 {width,height}) */
  update(dt, view) {
    const w = view?.width || 320, h = view?.height || 600;
    const first = !this.width;
    this.width = w; this.height = h;
    if (first) for (const p of this.petals) { p.x = this.random() * w; p.y = this.random() * h; }
    for (const p of this.petals) {
      p.y += p.speed * dt; p.x += p.wind * dt; p.phase += p.swaySpeed * dt; p.spin += p.spinSpeed * dt;
      if (p.y > h + SIZE || p.x > w + 20) Object.assign(p, this.spawn(false), { x: this.random() * (w + 40) - 40 });
    }
  }

  /** 지금 화면에 그릴 위치와 칸(화면 좌표) */
  frames() {
    return this.petals.map((p) => ({ x: Math.round(p.x + Math.sin(p.phase) * p.sway), y: Math.round(p.y), frame: Math.floor(p.spin) % 4, alpha: p.alpha }));
  }

  draw(r, img) {
    if (!img || r.reducedMotion) return;
    const cx = r.cam?.x ?? 0, cy = r.cam?.y ?? 0;
    for (const f of this.frames()) {
      r.setAlpha?.(f.alpha);
      r.drawCrop?.(img, f.frame * SIZE, 0, SIZE, SIZE, cx + f.x, cy + f.y);
    }
    r.setAlpha?.(1);
  }
}
