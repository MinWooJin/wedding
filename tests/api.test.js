import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateEntry, fetchMessages, postMessage, postVisit } from '../js/api.js';

test('validateEntry: 닉네임 2~10, 메시지 1~100, characterId 0~9', () => {
  assert.equal(validateEntry({ nickname: '민우', characterId: 0, message: '축하해요' }).ok, true);
  assert.deepEqual(validateEntry({ nickname: '민우', characterId: 0, message: '  축하해요  ' }).value,
    { nickname: '민우', characterId: 0, message: '축하해요' });
  assert.match(validateEntry({ nickname: '민우', characterId: 0, message: '  ' }).error, /메시지/);
  assert.match(validateEntry({ nickname: '민우', characterId: 0, message: 'a'.repeat(101) }).error, /100자/);
  assert.match(validateEntry({ nickname: '민우', characterId: 10, message: 'hi' }).error, /캐릭터/);
  assert.match(validateEntry({ nickname: 'a', characterId: 0, message: 'hi' }).error, /닉네임/);
});

test('fetchMessages: 배열이면 정규화해서 반환, 실패면 []', async () => {
  const okFetch = async () => ({ ok: true, json: async () => [{ t: 1, n: '민우', c: 3, m: '축하' }, { bad: true }] });
  assert.deepEqual(await fetchMessages('u', { fetchImpl: okFetch }), [{ t: 1, n: '민우', c: 3, m: '축하' }]);
  assert.deepEqual(await fetchMessages('u', { fetchImpl: async () => { throw new Error('x'); } }), []);
  assert.deepEqual(await fetchMessages('u', { fetchImpl: async () => ({ ok: false }) }), []);
  assert.deepEqual(await fetchMessages('', { fetchImpl: okFetch }), [], 'URL 비어 있으면 호출 없이 []');
});

test('postVisit: type=visit로 빈 메시지 POST, URL 없으면 호출 안 함', async () => {
  let seen = null;
  const f = async (url, init) => { seen = JSON.parse(init.body); return { ok: true, json: async () => ({ ok: true }) }; };
  assert.equal((await postVisit('https://x/exec', { nickname: '민우', characterId: 2 }, { fetchImpl: f })).ok, true);
  assert.deepEqual(seen, { type: 'visit', nickname: '민우', characterId: 2, message: '' });
  seen = null;
  assert.equal((await postVisit('', { nickname: '민우', characterId: 2 }, { fetchImpl: f })).ok, false);
  assert.equal(seen, null);
});

test('postMessage: text/plain JSON POST, 응답 ok 전달', async () => {
  let seen;
  const f = async (url, init) => { seen = { url, init }; return { ok: true, json: async () => ({ ok: true }) }; };
  const r = await postMessage('https://x/exec', { nickname: '민우', characterId: 1, message: 'hi' }, { fetchImpl: f });
  assert.equal(r.ok, true);
  assert.equal(seen.init.method, 'POST');
  assert.equal(seen.init.headers['Content-Type'], 'text/plain;charset=utf-8');
  assert.deepEqual(JSON.parse(seen.init.body), { nickname: '민우', characterId: 1, message: 'hi' });
  const bad = await postMessage('https://x/exec', {}, { fetchImpl: async () => ({ ok: true, json: async () => ({ ok: false, error: '너무 빨라요' }) }) });
  assert.deepEqual(bad, { ok: false, error: '너무 빨라요' });
  const net = await postMessage('https://x/exec', {}, { fetchImpl: async () => { throw new Error('offline'); } });
  assert.equal(net.ok, false);
  assert.match(net.error, /잠시 후/);
});
