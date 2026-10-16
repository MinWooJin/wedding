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
export async function fetchMessages(url, { fetchImpl = globalThis.fetch, timeoutMs = 5000 } = {}) {
  if (!url) return [];
  try {
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
    const res = await fetchImpl(url, { signal: ctrl?.signal, cache: 'no-store' });
    if (timer) clearTimeout(timer);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.filter(isEntry) : [];
  } catch (e) {
    console.warn('방명록 불러오기 실패', e);
    return [];
  }
}

/** Apps Script는 text/plain POST면 CORS 프리플라이트 없이 받는다 */
export async function postMessage(url, entry, { fetchImpl = globalThis.fetch } = {}) {
  try {
    const res = await fetchImpl(url, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(entry),
    });
    if (!res.ok) return { ok: false, error: '잠시 후 다시 시도해 주세요' };
    const data = await res.json();
    return data.ok ? { ok: true } : { ok: false, error: data.error || '잠시 후 다시 시도해 주세요' };
  } catch {
    return { ok: false, error: '잠시 후 다시 시도해 주세요' };
  }
}
