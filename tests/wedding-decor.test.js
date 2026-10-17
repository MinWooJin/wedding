import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WEDDING_FLOWERS, decorateWeddingHub } from '../js/world/wedding-decor.js';

test('꽃 장식은 좌우 높이가 같고 길을 침범하지 않으며 가운데 밀도가 낮다', () => {
  for (let i = 0; i < WEDDING_FLOWERS.length; i += 2) {
    const [, lx, ly, lw, lh] = WEDDING_FLOWERS[i];
    const [, rx, ry, rw, rh] = WEDDING_FLOWERS[i + 1];
    assert.deepEqual([ly, lw, lh], [ry, rw, rh]);
    assert.equal(lx + lw, 128);
    assert.equal(rx, 224);
    assert.ok(rx + rw <= 264);
  }
  for (let i=2; i<WEDDING_FLOWERS.length; i+=2) {
    const previous=WEDDING_FLOWERS[i-2], next=WEDDING_FLOWERS[i];
    assert.ok(next[2]-(previous[2]+previous[4])>=40, '꽃무더기 사이에 빈 잔디 구간을 둔다');
  }
});

test('꽃띠 정리는 기존 길·단상 픽셀을 덮지 않고 잔디가 없으면 원본을 보존한다', () => {
  const map = { width: 352, height: 864 };
  const calls = [], clips = [];
  const ctx = { drawImage: (...args) => calls.push(args), save() {}, restore() {}, beginPath() {}, rect: (...args) => clips.push(args), clip() {} };
  const create = (width, height) => ({ width, height, getContext: () => ctx });
  decorateWeddingHub(map, { objects: {} }, create);
  assert.deepEqual(calls, [[map, 0, 0]], '누락 에셋 때문에 빈 꽃띠를 만들지 않는다');
  calls.length = 0;
  decorateWeddingHub(map, { objects: {}, grass: { width: 32, height: 32 } }, create);
  assert.equal(calls.filter((a) => a[0] === map).length, 1, '지운 빽빽한 꽃띠를 다시 그리지 않는다');
  for (const [x,y,w,h] of clips) {
    assert.ok(x+w<=128 || x>=224, '중앙 길은 보존');
    assert.ok(y>=184 && y+h<=576, '단상·광장은 보존');
  }
});
