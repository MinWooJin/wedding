import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateNickname, loadProfile, saveProfile } from '../js/state.js';

const memStorage = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const brokenStorage = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };

test('닉네임은 공백 제거 후 2~10자', () => {
  assert.equal(validateNickname(' 민 ').ok, false);
  assert.equal(validateNickname('민우').ok, true);
  assert.equal(validateNickname('민우').value, '민우');
  assert.equal(validateNickname('가나다라마바사아자차카').ok, false);
  assert.equal(validateNickname(undefined).ok, false);
  assert.match(validateNickname('a').error, /2자/);
});

test('저장 후 불러오기', () => {
  const s = memStorage();
  assert.equal(saveProfile({ nickname: '민우', charId: 3 }, s), true);
  assert.deepEqual(loadProfile(s), { nickname: '민우', charId: 3 });
});

test('없거나 깨진 값이면 null', () => {
  assert.equal(loadProfile(memStorage()), null);
  const s = memStorage(); s.setItem('pixel-wedding-profile', '{bad json');
  assert.equal(loadProfile(s), null);
  const s2 = memStorage(); s2.setItem('pixel-wedding-profile', JSON.stringify({ nickname: '민우', charId: 99 }));
  assert.equal(loadProfile(s2), null);
});

test('스토리지가 예외를 던져도 조용히 실패', () => {
  assert.equal(loadProfile(brokenStorage), null);
  assert.equal(saveProfile({ nickname: '민우', charId: 0 }, brokenStorage), false);
});
