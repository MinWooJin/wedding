export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** HTML 문자열 → 첫 번째 엘리먼트 */
export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

/** 클립보드 복사. 클립보드 API가 막힌 인앱 브라우저는 예전 방식으로 복사한다(iOS는 readonly·setSelectionRange·16px가 있어야 선택되고 확대되지 않는다). */
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {}
  const previous = document.activeElement, area = document.createElement('textarea');
  area.value = text; area.setAttribute('readonly', ''); area.style.cssText = 'position:fixed;left:0;top:0;opacity:0;font-size:16px';
  document.body.appendChild(area); area.focus(); area.select(); area.setSelectionRange(0, area.value.length);
  let ok = false;
  try { ok = document.execCommand('copy'); } catch {}
  area.remove(); previous?.focus?.({ preventScroll: true }); return ok;
}
