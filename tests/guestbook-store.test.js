import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPreview, savePreview } from '../js/guestbook-store.js';

test('미리보기는 전용 키에 저장하고 재방문 시 읽으며 100건까지 보관한다', () => {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k), setItem: (k, v) => values.set(k, v) };
  const entries = Array.from({ length: 105 }, (_, t) => ({ n: '하객', c: 1, m: `축하 ${t}`, t }));
  assert.equal(savePreview(entries, storage), true);
  assert.deepEqual(readPreview(storage), entries.slice(0, 100));
  assert.equal(values.size, 1);
});

test('손상된 데이터와 저장 실패는 성공으로 표시하지 않는다', () => {
  assert.deepEqual(readPreview({ getItem: () => 'invalid' }), []);
  assert.deepEqual(readPreview({ getItem: () => '[null,{"n":"가짜"}]' }), []);
  assert.equal(savePreview([], { setItem: () => { throw Error('quota'); } }), false);
});
