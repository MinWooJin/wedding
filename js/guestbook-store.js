// API 연결 전에는 이 브라우저에만 저장한다. 서버 글과 섞지 않는다.
export const PREVIEW_KEY = 'pixel-wedding-preview-messages';
export function readPreview(storage) {
  try {
    storage ??= globalThis.localStorage;
    const entries = JSON.parse(storage.getItem(PREVIEW_KEY) || '[]');
    return Array.isArray(entries) ? entries.filter((e) => e && typeof e.n === 'string' && typeof e.m === 'string' && Number.isInteger(e.c) && e.c >= 0 && e.c < 10 && Number.isFinite(e.t)).slice(0, 100) : [];
  } catch { return []; }
}
export function savePreview(entries, storage) {
  try { storage ??= globalThis.localStorage; storage.setItem(PREVIEW_KEY, JSON.stringify(entries.slice(0, 100))); return true; }
  catch { return false; }
}

/** 같은 시각에 쓴 글도 선택한 한 건만 지운다. 저장 실패 시 원본을 유지한다. */
export function deletePreviewEntry(entries, index, storage) {
  if (!Number.isInteger(index) || index < 0 || index >= entries.length) return { ok: false, entries };
  const next = entries.filter((_, i) => i !== index);
  return savePreview(next, storage) ? { ok: true, entries: next } : { ok: false, entries };
}
