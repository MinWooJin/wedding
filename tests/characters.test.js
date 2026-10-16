import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRESET_COUNT, makeCharacter, presetSprites, presetColors, GROOM, BRIDE } from '../js/sprites/characters.js';

test('프리셋은 10종', () => {
  assert.equal(PRESET_COUNT, 10);
});

test('각 프리셋은 4방향 × 3프레임(idle+걷기2), 32×48', () => {
  for (let i = 0; i < PRESET_COUNT; i++) {
    const s = presetSprites(i);
    for (const dir of ['down', 'up', 'left', 'right']) {
      assert.equal(s[dir].length, 3, `${i} ${dir} frames`);
      for (const f of s[dir]) {
        assert.equal(f.w, 32);
        assert.equal(f.h, 48);
      }
    }
  }
});

test('프리셋마다 색 조합이 다르다', () => {
  const keys = new Set();
  for (let i = 0; i < PRESET_COUNT; i++) {
    const c = presetColors(i);
    keys.add(`${c.hair}|${c.skin}|${c.cloth}`);
  }
  assert.equal(keys.size, PRESET_COUNT);
});

test('머리색과 옷색이 지정 위치에 칠해진다', () => {
  const f = presetSprites(3).down[0];
  const c = presetColors(3);
  assert.equal(f.px[6][14], c.hair);
  assert.equal(f.px[32][14], c.cloth);
  assert.equal(f.px[42][8], c.pants);
});

test('right는 left의 좌우 반전', () => {
  const s = presetSprites(0);
  assert.deepEqual(s.right[0].px[16], [...s.left[0].px[16]].reverse());
});

test('신랑·신부 스프라이트 존재', () => {
  assert.equal(GROOM.down[0].h, 48);
  assert.equal(BRIDE.down[0].h, 48);
});

test('makeCharacter는 임의 색을 받는다', () => {
  const s = makeCharacter({ hair: '#111', skin: '#eee', cloth: '#f00', pants: '#00f' });
  assert.equal(s.down[0].px[4][14], '#111');
});
