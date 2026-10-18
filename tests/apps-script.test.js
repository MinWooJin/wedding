// apps-script/Code.gs를 가짜 Google 서비스(시트·캐시·잠금) 위에서 실행해 동작을 검사한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');

function makeApp({ token = '' } = {}) {
  const rows = [['timestamp', 'nickname', 'characterId', 'message', 'guestId', 'hidden']];
  const cache = new Map();
  const sheet = {
    getLastRow: () => rows.length,
    getLastColumn: () => rows[0].length,
    getRange: (r, c, nr, nc) => ({
      getValues: () => rows.slice(r - 1, r - 1 + nr).map((row) => row.slice(c - 1, c - 1 + nc)),
      setValues: (v) => { rows[r - 1] = v[0]; },
    }),
    appendRow: (row) => rows.push(row),
  };
  const env = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => sheet, insertSheet: () => sheet }) },
    CacheService: { getScriptCache: () => ({ get: (k) => cache.get(k) ?? null, put: (k, v) => cache.set(k, v), remove: (k) => cache.delete(k) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (text) => ({ text, setMimeType() { return this; } }) },
    Utilities: { formatDate: () => '20270109' },
  };
  const code = source.replace("const PUBLIC_TOKEN = '';", `const PUBLIC_TOKEN = ${JSON.stringify(token)};`);
  const fn = new Function(...Object.keys(env), `${code}\nreturn { doGet, doPost };`);
  const app = fn(...Object.values(env));
  const post = (body) => JSON.parse(app.doPost({ postData: { contents: JSON.stringify(body) } }).text);
  const get = () => JSON.parse(app.doGet().text);
  return { rows, cache, post, get };
}

test('글 저장 → 목록 반환. 닉네임당 최신 1건, 메시지 있는 행 우선, 숨김 행 제외', () => {
  const app = makeApp();
  assert.deepEqual(app.get(), []);
  assert.equal(app.post({ nickname: '민우', characterId: 1, message: '축하해', guestId: 'guest-aaaaaaaa' }).ok, true);
  app.cache.clear();
  assert.equal(app.post({ type: 'visit', nickname: '민우', characterId: 3, message: '', guestId: 'guest-aaaaaaaa' }).ok, true);
  app.cache.clear();
  assert.equal(app.post({ nickname: '새암', characterId: 2, message: '행복해', guestId: 'guest-bbbbbbbb' }).ok, true);
  app.rows.slice(1).forEach((row, i) => { row[0] = new Date(Date.UTC(2027, 0, 1, 0, i)); }); // 같은 ms에 쓰인 행의 순서를 고정
  app.cache.clear();
  const list = app.get();
  assert.deepEqual(list.map((e) => [e.n, e.c, e.m]), [['새암', 2, '행복해'], ['민우', 3, '축하해']], '입장 기록은 캐릭터만 갱신');
  assert.ok(list.every((e) => Object.keys(e).sort().join() === 'c,m,n,t'), 'guestId·hidden은 내려주지 않는다');
  app.rows[1][5] = true; app.cache.clear();
  assert.deepEqual(app.get().map((e) => [e.n, e.m]), [['새암', '행복해'], ['민우', '']], 'hidden 체크한 글은 빠지고, 입장 기록만 남은 사람은 메시지 없는 하객으로 남는다');
  app.rows[2][5] = 'TRUE'; app.cache.clear();
  assert.deepEqual(app.get().map((e) => e.n), ['새암'], '입장 행까지 숨기면 완전히 빠진다');
});

test('수식 주입: = + - @ 로 시작하는 글은 앞에 \' 를 붙여 저장하고 읽을 때 벗긴다', () => {
  const app = makeApp();
  assert.equal(app.post({ nickname: '=SUM(1)', characterId: 0, message: '+1 축하', guestId: 'guest-cccccccc' }).ok, true);
  assert.equal(app.rows[1][1], "'=SUM(1)");
  assert.equal(app.rows[1][3], "'+1 축하");
  app.cache.clear();
  assert.deepEqual(app.get().map((e) => [e.n, e.m]), [['=SUM(1)', '+1 축하']]);
});

test('도배 방지: 같은 기기는 1분 1건, 하루 10건. 다른 기기는 영향 없음', () => {
  const app = makeApp();
  const g = { guestId: 'guest-dddddddd' };
  assert.equal(app.post({ nickname: '민우', characterId: 1, message: '1', ...g }).ok, true);
  assert.equal(app.post({ nickname: '민우', characterId: 1, message: '2', ...g }).error, '1분에 한 번만 남길 수 있어요');
  assert.equal(app.post({ nickname: '민우', characterId: 1, message: '2', guestId: 'guest-eeeeeeee' }).ok, true, '다른 기기');
  for (let i = 2; i <= 10; i++) { app.cache.delete('post:guest-dddddddd'); assert.equal(app.post({ nickname: '민우', characterId: 1, message: String(i), ...g }).ok, true); }
  app.cache.delete('post:guest-dddddddd');
  assert.match(app.post({ nickname: '민우', characterId: 1, message: '11', ...g }).error, /오늘은 더/);
  assert.equal(app.post({ type: 'visit', nickname: '민우', characterId: 1, message: '', ...g }).ok, true, '입장 등록은 별도');
  assert.equal(app.post({ type: 'visit', nickname: '민우', characterId: 1, message: '', ...g }).ok, true, '1시간 안 재입장은 조용히 ok');
  assert.equal(app.rows.filter((r) => r[3] === '').length, 1, '한 번만 기록');
});

test('검증: 닉네임 2~10, 메시지 1~100, 캐릭터 0~9, 잘못된 JSON, 기기 토큰 없으면 닉네임 기준 제한', () => {
  const app = makeApp();
  assert.equal(app.post({ nickname: '민', characterId: 1, message: 'x' }).error, '닉네임은 2~10자');
  assert.equal(app.post({ nickname: '민우', characterId: 1, message: '' }).error, '메시지는 1~100자');
  assert.equal(app.post({ nickname: '민우', characterId: 1, message: 'x'.repeat(101) }).error, '메시지는 1~100자');
  assert.equal(app.post({ nickname: '민우', characterId: 12, message: 'x' }).error, '캐릭터 오류');
  assert.equal(app.post({ nickname: '민우', characterId: 1, message: 'x', guestId: 'bad id!' }).ok, true, '형식이 틀린 토큰은 무시');
  assert.equal(app.rows[1][4], '', '무시된 토큰은 저장하지 않는다');
  assert.equal(app.post({ nickname: '민우', characterId: 1, message: 'y' }).error, '1분에 한 번만 남길 수 있어요', '닉네임 기준 제한');
  assert.equal(makeApp().post(undefined).error, '잘못된 요청', '본문이 JSON이 아니면 거절');
});

test('공개 토큰을 설정하면 일치하는 요청만 받는다', () => {
  const app = makeApp({ token: 'secret' });
  assert.equal(app.post({ nickname: '민우', characterId: 1, message: 'x', guestId: 'guest-ffffffff' }).error, '잘못된 요청');
  assert.equal(app.post({ nickname: '민우', characterId: 1, message: 'x', guestId: 'guest-ffffffff', token: 'secret' }).ok, true);
});

test('목록은 캐시되고 글이 들어오면 캐시가 지워진다', () => {
  const app = makeApp();
  app.get();
  assert.ok(app.cache.has('list'));
  app.post({ nickname: '민우', characterId: 1, message: 'x', guestId: 'guest-gggggggg' });
  assert.ok(!app.cache.has('list'));
  assert.equal(app.get().length, 1);
});
