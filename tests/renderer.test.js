import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Renderer, TILE, VIEW_TILES_W, computeViewport } from '../js/renderer.js';

test('정적 바닥은 카메라 이동 중 재사용하고 자산·바닥 변경 시에만 다시 합성한다', (t) => {
  const frames = [];
  const ctx = { drawImage: (...args) => frames.push(args) };
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: () => ({ getContext: () => ({ drawImage: () => {} }) }) } });
  t.after(() => { if (previous) Object.defineProperty(globalThis, 'document', previous); else delete globalThis.document; });
  const r = new Renderer({ getContext: () => ctx });
  let tilePaints = 0, floorPaints = 0;
  r.drawGardenTile = () => { tilePaints++; };
  r.drawSprite = () => { floorPaints++; };
  const map = { w: 2, h: 2, rows: ['GN', 'NN'] };
  const floor = { spr: {}, tx: 0, drawY: 32 };
  r.drawGround(map, null, [floor]);
  const canvas = frames[0][0];
  assert.equal(canvas.width, 64); assert.equal(canvas.height, 64);
  r.cam = { x: 16, y: 32 };
  r.drawGround(map, null, [floor]);
  assert.deepEqual(frames.at(-1), [canvas, -16, -32]);
  assert.equal(tilePaints, 4); assert.equal(floorPaints, 1);
  r.tiles = {};
  r.drawGround(map, null, [floor]);
  assert.equal(tilePaints, 8);
  r.drawGround(map, null, []);
  assert.equal(tilePaints, 12);
  r.invalidateGround(map);
  r.drawGround(map, null, []);
  assert.equal(tilePaints, 16);
  assert.equal(r.drawGround({ w: 11, h: 1000 }, null, []), false, '긴 갤러리에 대형 캐시를 할당하지 않음');
  assert.equal(tilePaints, 16);
  globalThis.document.createElement = () => ({ getContext: () => null });
  r.invalidateGround(map);
  assert.equal(r.drawGround(map, null, []), false, '캐시 캔버스를 만들 수 없으면 일반 렌더링으로 복귀');
});

test('기본 상수', () => {
  assert.equal(TILE, 32);
  assert.equal(VIEW_TILES_W, 11);
});

test('모션 변환은 발 밑에 고정하고 매번 복원하며 reduced motion이면 생략한다', () => {
  const calls = [];
  const ctx = Object.fromEntries(['save', 'translate', 'transform', 'drawImage', 'restore'].map((key) => [key, (...args) => calls.push([key, ...args])]));
  const r = new Renderer({ getContext: () => ctx });
  r.motionPreference = { matches: false };
  const canvas = {}, spr = { w: 48, h: 72, canvas };
  r.drawSprite(spr, 10, 20, { lean: 0.01, scaleY: 0.99, lift: 1 });
  assert.deepEqual(calls, [
    ['save'], ['translate', 34, 91], ['transform', 1, 0, 0.01, 0.99, 0, 0],
    ['drawImage', canvas, -24, -72], ['restore'],
  ]);
  calls.length = 0;
  r.motionPreference.matches = true;
  r.drawSprite(spr, 10, 20, { lean: 0.01, scaleY: 0.99, lift: 1 });
  assert.deepEqual(calls, [['drawImage', canvas, 10, 20]]);
});

test('뷰 폭은 항상 352px, 352 이상이면 정수 배율, 더 좁으면 꽉 차는 소수 배율', () => {
  assert.deepEqual(computeViewport(390, 844), { scale: 1, width: 352, height: 844 });
  assert.deepEqual(computeViewport(430, 932), { scale: 1, width: 352, height: 932 });
  assert.deepEqual(computeViewport(1200, 900), { scale: 3, width: 352, height: 300 });
  assert.deepEqual(computeViewport(176, 300), { scale: 0.5, width: 352, height: 600 });
});
