import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILES, SOLID_TILES, tileSprite } from '../js/sprites/tiles.js';

test('모든 타일은 16×16', () => {
  for (const id of Object.keys(TILES)) {
    const s = tileSprite(id);
    assert.equal(s.w, 16, `${id} width`);
    assert.equal(s.h, 16, `${id} height`);
  }
});

test('필수 타일 ID 존재', () => {
  for (const id of ['G', 'W', 'P', 'H', 'F', 'D', 'K', 'R', 'S', 'X']) assert.ok(TILES[id], id);
});

test('울타리/벽/산울타리/공백은 solid', () => {
  for (const id of ['H', 'F', 'K', 'X']) assert.ok(SOLID_TILES.has(id), id);
  for (const id of ['G', 'W', 'P', 'D', 'R', 'S']) assert.ok(!SOLID_TILES.has(id), id);
});
