import { PRESET_COUNT } from './sprites/characters.js';

const KEY = 'pixel-wedding-profile';

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
