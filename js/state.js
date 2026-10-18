import { PRESET_COUNT } from './sprites/characters.js';

const KEY = 'pixel-wedding-profile';
const GUEST_KEY = 'pixel-wedding-guest';

/** 기기마다 한 번 만들어 두는 임의 토큰. 서버가 도배를 막는 기준이며 개인정보가 아니다. */
export function getGuestId(storage = safeStorage()) {
  try {
    const saved = storage?.getItem(GUEST_KEY);
    if (saved && /^[A-Za-z0-9_-]{8,64}$/.test(saved)) return saved;
  } catch {}
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  const id = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  try { storage?.setItem(GUEST_KEY, id); } catch {}
  return id;
}

export function validateNickname(raw) {
  const n = (raw ?? '').toString().trim();
  if (n.length < 2) return { ok: false, error: '닉네임은 2자 이상이어야 해요' };
  if (n.length > 10) return { ok: false, error: '닉네임은 10자 이하로 해주세요' };
  return { ok: true, value: n };
}

function safeStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function loadProfile(storage = safeStorage()) {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    const v = validateNickname(p.nickname);
    if (!v.ok) return null;
    if (!Number.isInteger(p.charId) || p.charId < 0 || p.charId >= PRESET_COUNT) return null;
    return { nickname: v.value, charId: p.charId };
  } catch { return null; }
}

export function saveProfile(profile, storage = safeStorage()) {
  try { storage?.setItem(KEY, JSON.stringify(profile)); return true; } catch { return false; }
}
