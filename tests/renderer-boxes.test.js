import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Renderer } from '../js/renderer.js';

test('긴 지도 이름표는 화면 안에 머물고 말풍선은 캔버스 글씨 상태를 복원한다', () => {
  const boxes = [], texts = [], states = [];
  const ctx = {
    font: '16px sans-serif', textAlign: 'right', textBaseline: 'bottom',
    save() { states.push([this.font, this.textAlign, this.textBaseline]); },
    restore() { [this.font, this.textAlign, this.textBaseline] = states.pop(); },
    beginPath() {}, roundRect: (...args) => boxes.push(args), fill() {}, stroke() {}, fillRect() {},
    measureText: (text) => ({ width: text.length * 14 }),
    fillText: (...args) => texts.push(args),
  };
  const renderer = new Renderer({ getContext: () => ctx });
  renderer.drawLabel('길이가 긴 안내 표지판 이름을 표시합니다', 2, 120);
  for (const [x,,w] of boxes) assert.ok(x >= 0 && x + w <= renderer.view.width);
  assert.ok(texts[0][3] < renderer.view.width, '긴 글씨에는 최대 폭을 지정한다');
  boxes.length = 0;
  renderer.drawBubble('두 분의 결혼을 축하합니다. 행복한 날들이 이어지기를 바랍니다.', -10, 250);
  for (const [x,,w] of boxes) assert.ok(x >= 0 && x + w <= renderer.view.width);
  assert.equal(ctx.font, '16px sans-serif');
  assert.equal(ctx.textAlign, 'right');
  assert.equal(states.length, 0);
});
