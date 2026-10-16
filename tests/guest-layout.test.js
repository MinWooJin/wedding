import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freeTiles, pickTiles } from '../js/world/guest-layout.js';

const rows = ['HHHH', 'HGPH', 'HWGH', 'HHHH'];

test('freeTiles: G/W 타일 중 제외 집합에 없는 것', () => {
  assert.deepEqual(freeTiles(rows, new Set(['1,1'])), [{ tx: 1, ty: 2 }, { tx: 2, ty: 2 }]);
});

test('pickTiles: 결정적, 중복 없음, 개수 제한', () => {
  const tiles = Array.from({ length: 20 }, (_, i) => ({ tx: i, ty: 0 }));
  const a = pickTiles(tiles, 5, 42), b = pickTiles(tiles, 5, 42);
  assert.deepEqual(a, b);
  assert.equal(new Set(a.map((t) => t.tx)).size, 5);
  assert.equal(pickTiles(tiles, 50, 1).length, 20);
  assert.notDeepEqual(pickTiles(tiles, 5, 1), pickTiles(tiles, 5, 2));
});
