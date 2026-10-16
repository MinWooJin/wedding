import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILES, SOLID_TILES, tileSprite } from '../js/sprites/tiles.js';

test('모든 타일은 32×32(코드 그림 2배 확대)', () => {
  for (const id of Object.keys(TILES)) {
    const s = tileSprite(id);
    assert.equal(s.w, 32, `${id} width`);
    assert.equal(s.h, 32, `${id} height`);
  }
});

test('필수 타일 ID 존재', () => {
  for (const id of ['G', 'W', 'P', 'H', 'F', 'D', 'K', 'R', 'S', 'X', 'A', 'B', 'C', 'E', 'M', 'L', 'Q', 'Y', 'V', 'Z']) assert.ok(TILES[id], id);
});

test('울타리/벽/산울타리/공백은 solid', () => {
  for (const id of ['H', 'F', 'K', 'X', 'Z']) assert.ok(SOLID_TILES.has(id), id);
  for (const id of ['G', 'W', 'P', 'D', 'R', 'S', 'A', 'B', 'C', 'E', 'M', 'L', 'Q', 'Y', 'V']) assert.ok(!SOLID_TILES.has(id), id);
});
