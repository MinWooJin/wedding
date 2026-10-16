import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSprite, flipX, stackY, mirrorRows } from '../js/sprites/raster.js';
import { PAL } from '../js/sprites/palette.js';

test('문자열 배열을 픽셀 그리드로 파싱한다', () => {
  const s = parseSprite(['.o', 'g.'], { '.': null, o: '#000', g: '#0f0' });
  assert.equal(s.w, 2);
  assert.equal(s.h, 2);
  assert.deepEqual(s.px, [[null, '#000'], ['#0f0', null]]);
});

test('팔레트에 없는 문자는 에러', () => {
  assert.throws(() => parseSprite(['x'], {}), /unknown palette char "x"/);
});

test('행 길이가 다르면 에러', () => {
  assert.throws(() => parseSprite(['..', '.'], { '.': null }), /row 1 length/);
});

test('flipX는 좌우 반전', () => {
  const s = parseSprite(['.o', 'g.'], { '.': null, o: '#000', g: '#0f0' });
  assert.deepEqual(flipX(s).px, [['#000', null], [null, '#0f0']]);
});

test('stackY는 세로로 이어붙인다', () => {
  const a = parseSprite(['oo'], { o: '#000' });
  const b = parseSprite(['..', '..'], { '.': null });
  const s = stackY(a, b);
  assert.equal(s.h, 3);
  assert.deepEqual(s.px[0], ['#000', '#000']);
});

test('mirrorRows는 왼쪽 절반을 받아 좌우 대칭 행을 만든다', () => {
  assert.deepEqual(mirrorRows(['.o', 'ab']), ['.oo.', 'abba']);
});

test('공용 팔레트는 투명과 외곽선을 포함', () => {
  assert.equal(PAL['.'], null);
  assert.match(PAL.o, /^#/);
});
