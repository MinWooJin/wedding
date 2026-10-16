import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Renderer, TILE, VIEW_TILES_W, computeViewport } from '../js/renderer.js';

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
