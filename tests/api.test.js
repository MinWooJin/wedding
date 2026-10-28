import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateEntry, fetchMessages, postMessage, postVisit, checkNickname } from '../js/api.js';

test('상태 포함 조회는 정상 빈 목록과 실패를 구분한다', async () => {
  assert.deepEqual(await fetchMessages('u', { withStatus: true, fetchImpl: async () => ({ ok: true, json: async () => [] }) }), { ok: true, entries: [] });
  assert.deepEqual(await fetchMessages('u', { withStatus: true, fetchImpl: async () => ({ ok: false }) }), { ok: false, entries: [] });
});

test('전송이 지연되면 중단하고 재시도 가능한 오류를 반환한다', async () => {
  const fetchImpl = (_, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(Error('timeout'))));
  const result = await postMessage('u', {}, { fetchImpl, timeoutMs: 10 });
  assert.equal(result.ok, false);
});

test('validateEntry: 닉네임 2~10, 메시지 1~100, characterId 0~29', () => {
  assert.equal(validateEntry({ nickname: '민우', characterId: 0, message: '축하해요' }).ok, true);
  assert.equal(validateEntry({ nickname: '민우', characterId: 10, message: '축하해요' }).ok, true);
  assert.equal(validateEntry({ nickname: '민우', characterId: 29, message: '축하해요' }).ok, true);
  assert.equal(validateEntry({ nickname: '민우', characterId: -1, message: '축하해요' }).ok, false);
  assert.deepEqual(validateEntry({ nickname: '민우', characterId: 0, message: '  축하해요  ' }).value,
    { nickname: '민우', characterId: 0, message: '축하해요' });
  assert.match(validateEntry({ nickname: '민우', characterId: 0, message: '  ' }).error, /메시지/);
  assert.match(validateEntry({ nickname: '민우', characterId: 0, message: 'a'.repeat(101) }).error, /100자/);
  assert.match(validateEntry({ nickname: '민우', characterId: 30, message: 'hi' }).error, /캐릭터/);
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

test('checkNickname: GET ?action=check, 결과 전달, 실패하면 ok:false(막지 않음)', async () => {
  let url;
  const ok = await checkNickname('https://x/exec', '민 우', 'guest-1234abcd', { fetchImpl: async (u) => { url = u; return { ok: true, json: async () => ({ ok: true, available: false }) }; } });
  assert.deepEqual(ok, { ok: true, available: false });
  const q = new URL(url).searchParams;
  assert.deepEqual([q.get('action'), q.get('nickname'), q.get('guestId')], ['check', '민 우', 'guest-1234abcd']);
  assert.deepEqual(await checkNickname('', '민우', 'g'), { ok: false });
  assert.deepEqual(await checkNickname('https://x/exec', '민우', 'g', { fetchImpl: async () => { throw new Error('offline'); } }), { ok: false });
  assert.deepEqual(await checkNickname('https://x/exec', '민우', 'g', { fetchImpl: async () => ({ ok: true, json: async () => ({ ok: false }) }) }), { ok: false });
});

test('postMessage/postVisit: 기기 토큰과 공개 토큰은 있을 때만 본문에 붙인다', async () => {
  const bodies = [];
  const f = async (u, o) => { bodies.push(JSON.parse(o.body)); return { ok: true, json: async () => ({ ok: true }) }; };
  await postMessage('https://x/exec', { nickname: '민우', characterId: 1, message: 'hi' }, { fetchImpl: f, guestId: 'abcdef1234567890', token: 'T' });
  await postVisit('https://x/exec', { nickname: '민우', characterId: 1 }, { fetchImpl: f, guestId: 'abcdef1234567890' });
  await postMessage('https://x/exec', { nickname: '민우', characterId: 1, message: 'hi' }, { fetchImpl: f });
  assert.deepEqual(bodies[0], { nickname: '민우', characterId: 1, message: 'hi', guestId: 'abcdef1234567890', token: 'T' });
  assert.deepEqual(bodies[1], { type: 'visit', nickname: '민우', characterId: 1, message: '', guestId: 'abcdef1234567890' });
  assert.deepEqual(bodies[2], { nickname: '민우', characterId: 1, message: 'hi' });
  await postVisit('https://x/exec', { nickname: '민우', characterId: 1 }, { fetchImpl: f, guestId: 'abcdef1234567890', claim: true });
  await postVisit('https://x/exec', { nickname: '민우', characterId: 1 }, { fetchImpl: f, claim: true });
  assert.equal(bodies[3].claim, true, '본인 확인은 기기 토큰과 함께');
  assert.equal('claim' in bodies[4], false, '기기 토큰이 없으면 claim을 보내지 않는다');
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

test('닉네임 "test"는 시험용: 불러온 방명록에서 빠진다(대소문자·공백 무시, 비슷한 닉네임은 그대로)', async () => {
  const { fetchMessages, isHiddenNickname, visibleEntries } = await import('../js/api.js');
  const rows = [
    { t: 1, n: 'test', c: 0, m: '시험' }, { t: 2, n: ' TEST ', c: 1, m: '' }, { t: 3, n: 'Test', c: 2, m: '시험2' },
    { t: 4, n: '테스트', c: 3, m: '축하해요' }, { t: 5, n: 'tester', c: 4, m: '축하' }, { t: 6, n: '민지', c: 5, m: '행복하세요' },
  ];
  const entries = await fetchMessages('https://example.test/exec', { fetchImpl: async () => ({ ok: true, json: async () => rows }) });
  assert.deepEqual(entries.map((e) => e.n), ['테스트', 'tester', '민지']);
  assert.equal(isHiddenNickname('tEsT'), true);
  assert.equal(isHiddenNickname('test2'), false);
  assert.deepEqual(visibleEntries(null), []);
});
