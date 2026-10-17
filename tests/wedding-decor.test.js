import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WEDDING_FLOWERS, flowerBedWidth, decorateWeddingHub } from '../js/world/wedding-decor.js';

test('꽃 장식은 좌우 높이가 같고 길을 침범하지 않으며 가운데 밀도가 낮다', () => {
  for (let i = 0; i < WEDDING_FLOWERS.length; i += 2) {
    const [, lx, ly, lw, lh] = WEDDING_FLOWERS[i];
    const [, rx, ry, rw, rh] = WEDDING_FLOWERS[i + 1];
    assert.deepEqual([ly, lw, lh], [ry, rw, rh]);
    assert.equal(lx + lw, 128);
    assert.equal(rx, 224);
    assert.ok(rx + rw <= 264);
  }
  assert.ok(flowerBedWidth(216) > flowerBedWidth(304));
  assert.ok(flowerBedWidth(552) > flowerBedWidth(440));
});

test('꽃띠 정리는 기존 길·단상 픽셀을 덮지 않고 잔디가 없으면 원본을 보존한다', () => {
  const map = { width: 352, height: 864 };
  const calls = [];
  const ctx = { drawImage: (...args) => calls.push(args), save() {}, restore() {}, beginPath() {}, rect() {}, clip() {} };
  const create = (width, height) => ({ width, height, getContext: () => ctx });
  decorateWeddingHub(map, { objects: {} }, create);
  assert.deepEqual(calls, [[map, 0, 0]], '누락 에셋 때문에 빈 꽃띠를 만들지 않는다');
  calls.length = 0;
  decorateWeddingHub(map, { objects: {}, grass: { width: 32, height: 32 } }, create);
  for (const args of calls.filter((a) => a[0] === map && a.length === 9)) {
    const [, sx, sy, sw, sh, dx, dy, dw, dh] = args;
    assert.deepEqual([sx, sy, sw, sh], [dx, dy, dw, dh], '원본 픽셀 크기와 위치 유지');
    assert.ok(dx + dw <= 128 || dx >= 224, '중앙 길은 보존');
    assert.ok(dy >= 184 && dy < 576, '단상·광장·접합부는 보존');
  }
});
