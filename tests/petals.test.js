import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PetalField, PETAL_COUNT } from '../js/world/petals.js';

function seeded(seed = 7) { return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; }

test('벚꽃잎은 아래로 흩날리고 화면 밖으로 나가면 위에서 다시 떨어진다', () => {
  const field = new PetalField({ random: seeded() });
  const view = { width: 320, height: 500 };
  field.update(0, view);
  assert.equal(field.petals.length, PETAL_COUNT);
  assert.ok(field.petals.every((p) => p.x >= 0 && p.x <= 320 && p.y >= 0 && p.y <= 500), '처음엔 화면 곳곳에');
  const before = field.petals.map((p) => p.y);
  field.update(0.5, view);
  assert.ok(field.petals.every((p, i) => p.y > before[i]), '모두 아래로');
  for (let i = 0; i < 600; i++) field.update(0.1, view); // 1분
  assert.ok(field.petals.every((p) => p.y <= 500 + 8 && p.y >= -60), '화면 근처에 머문다(되돌아온다)');
  assert.ok(field.frames().every((f) => f.frame >= 0 && f.frame < 4 && f.alpha > 0 && f.alpha <= 1));
});

test('꽃잎 그림이 없거나 움직임 줄이기면 그리지 않고, 있으면 카메라 기준으로 그린다', () => {
  const field = new PetalField({ count: 3, random: seeded(3) });
  field.update(0.1, { width: 320, height: 500 });
  const calls = [];
  const r = { cam: { x: 0, y: 1000 }, reducedMotion: false, setAlpha() {}, drawCrop: (...a) => calls.push(a) };
  field.draw(r, null);
  assert.equal(calls.length, 0);
  field.draw({ ...r, reducedMotion: true }, {});
  assert.equal(calls.length, 0);
  field.draw(r, {});
  assert.equal(calls.length, 3);
  assert.ok(calls.every((c) => c[6] >= 1000 - 60), '화면 좌표에 카메라 위치를 더한다');
});

test('꽃잎 그림 네 칸은 모두 8×8이고 분홍 픽셀이 있다', async () => {
  const { PETAL_FRAMES } = await import('../js/world/petals.js');
  assert.equal(PETAL_FRAMES.length, 4);
  for (const f of PETAL_FRAMES) {
    assert.equal(f.length, 8);
    assert.ok(f.every((row) => row.length === 8));
    assert.ok(f.join('').replace(/\./g, '').length >= 8, '보일 만큼 크다');
  }
});
