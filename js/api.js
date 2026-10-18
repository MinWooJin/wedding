import { PRESET_COUNT } from './sprites/characters.js';
import { validateNickname } from './state.js';

export const MESSAGE_MAX = 100;

export function validateEntry({ nickname, characterId, message }) {
  const n = validateNickname(nickname);
  if (!n.ok) return { ok: false, error: n.error };
  if (!Number.isInteger(characterId) || characterId < 0 || characterId >= PRESET_COUNT) return { ok: false, error: '캐릭터 정보가 올바르지 않아요' };
  const m = (message ?? '').toString().trim();
  if (m.length < 1) return { ok: false, error: '메시지를 입력해 주세요' };
  if (m.length > MESSAGE_MAX) return { ok: false, error: `메시지는 ${MESSAGE_MAX}자 이하로 해주세요` };
  return { ok: true, value: { nickname: n.value, characterId, message: m } };
}

const isEntry = (e) => e && typeof e.n === 'string' && typeof e.m === 'string' && Number.isInteger(e.c);

/** @returns {Promise<{t:number,n:string,c:number,m:string}[]>} 실패 시 [] */
export async function fetchMessages(url, { fetchImpl = globalThis.fetch, timeoutMs = 5000, withStatus = false } = {}) {
  const finish = (ok, entries = []) => withStatus ? { ok, entries } : entries;
  if (!url) return finish(false);
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  try {
    const res = await fetchImpl(url, { signal: ctrl?.signal, cache: 'no-store' });
    if (!res.ok) return finish(false);
    const data = await res.json();
    return Array.isArray(data) ? finish(true, data.filter(isEntry)) : finish(false);
  } catch (e) {
    console.warn('방명록 불러오기 실패', e);
    return finish(false);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * 닉네임을 다른 기기가 이미 쓰고 있는지 서버에 묻는다.
 * @returns {Promise<{ok:boolean, available?:boolean}>} 네트워크 실패면 ok:false(이때는 막지 않고 글쓰기 때 서버가 다시 확인한다)
 */
export async function checkNickname(url, nickname, guestId, { fetchImpl = globalThis.fetch, timeoutMs = 5000 } = {}) {
  if (!url) return { ok: false };
  const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
  try {
    const q = new URLSearchParams({ action: 'check', nickname, guestId: guestId || '' });
    const res = await fetchImpl(`${url}${url.includes('?') ? '&' : '?'}${q}`, { signal: ctrl?.signal, cache: 'no-store' });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return data && data.ok && typeof data.available === 'boolean' ? { ok: true, available: data.available } : { ok: false };
  } catch {
    return { ok: false };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** 입장 기록: 닉네임을 이 기기 것으로 확보하고 캐릭터를 갱신한다(메시지 없음, 광장에는 세우지 않는다). 실패해도 조용히 넘어간다. */
export async function postVisit(url, { nickname, characterId }, { fetchImpl = globalThis.fetch, guestId, token, claim = false } = {}) {
  if (!url) return { ok: false, error: 'no api' };
  return postMessage(url, { type: 'visit', nickname, characterId, message: '' }, { fetchImpl, guestId, token, claim });
}

/**
 * Apps Script는 text/plain POST면 CORS 프리플라이트 없이 받는다.
 * guestId(기기 토큰)와 token(설정의 공개 토큰)은 있을 때만 본문에 붙인다.
 */
export async function postMessage(url, entry, { fetchImpl = globalThis.fetch, timeoutMs = 10000, guestId, token, claim = false } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  // claim: 같은 닉네임이 이미 있을 때 하객이 "네, 저예요"로 본인임을 확인한 경우에만 붙인다.
  const body = { ...entry, ...(guestId ? { guestId } : {}), ...(token ? { token } : {}), ...(claim && guestId ? { claim: true } : {}) };
  try {
    const res = await fetchImpl(url, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), signal: ctrl.signal,
    });
    if (!res.ok) return { ok: false, error: '잠시 후 다시 시도해 주세요' };
    const data = await res.json();
    return data.ok ? { ok: true } : { ok: false, error: data.error || '잠시 후 다시 시도해 주세요' };
  } catch {
    return { ok: false, error: '잠시 후 다시 시도해 주세요' };
  } finally {
    clearTimeout(timer);
  }
}
