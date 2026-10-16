import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPreview, savePreview, deletePreviewEntry } from '../js/guestbook-store.js';

test('같은 타임스탬프의 두 글 중 선택한 글 하나만 지운다', () => {
  let stored;
  const storage = { setItem: (_, value) => { stored = JSON.parse(value); } };
  const entries = [{ n: '하객', c: 1, m: '첫 글', t: 1 }, { n: '하객', c: 1, m: '다른 글', t: 1 }];
  const result = deletePreviewEntry(entries, 1, storage);
  assert.equal(result.ok, true);
  assert.deepEqual(result.entries, [entries[0]]);
  assert.deepEqual(stored, [entries[0]]);
  assert.equal(entries.length, 2);
});

test('삭제 저장 실패나 잘못된 선택은 기존 글을 보존한다', () => {
  const entries = [{ n: '하객', c: 1, m: '축하', t: 1 }];
  const storage = { setItem: () => { throw Error('quota'); } };
  assert.deepEqual(deletePreviewEntry(entries, 0, storage), { ok: false, entries });
  assert.deepEqual(deletePreviewEntry(entries, -1, storage), { ok: false, entries });
});

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
