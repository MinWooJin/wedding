import { esc, h } from './dom.js';

/**
 * 팝업 카드. buttons: [{label, primary?, onClick?(card) => boolean|Promise<boolean>}]
 * onClick이 true를 돌려주면 닫지 않는다(검증 실패 등). 열려 있는 동안 game.paused = true.
 */
const active = new WeakMap();
export function showOverlay(game, { title = '', html = '', buttons = [{ label: '닫기' }], onClose = null }) {
  active.get(game)?.();
  // Dismiss the scene-entry toast before opening a card; later action feedback still appears.
  const toast = document.getElementById('toast');
  if (toast) toast.hidden = true;
  const root = document.getElementById('overlay');
  const previousFocus = document.activeElement;
  const hud = document.getElementById('hud'), previousInert = hud?.inert ?? false;
  root.innerHTML = '';
  const card = h(`<section class="card" role="dialog" aria-modal="true" aria-label="${esc(title || '안내')}" tabindex="-1">${title ? `<h2>${esc(title)}</h2>` : ''}<div class="body">${html}</div><div class="row dialog-actions"></div></section>`);
  let busy = false, closed = false;
  const close = (force = false) => {
    if (closed || (busy && !force)) return;
    closed = true; document.removeEventListener('keydown', onKey);
    root.hidden = true; root.innerHTML = ''; root.onclick = null; game.paused = false;
    active.delete(game);
    if (hud) hud.inert = previousInert;
    if (previousFocus?.isConnected) previousFocus.focus();
    onClose?.(card);
  };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if (e.key !== 'Tab') return;
    const nodes = [...card.querySelectorAll('button:not(:disabled),a[href],input,textarea,[tabindex="0"]')];
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (!first) { e.preventDefault(); card.focus(); return; }
    if (e.shiftKey && (document.activeElement === first || document.activeElement === card)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || document.activeElement === card)) { e.preventDefault(); first.focus(); }
  };
  const row = card.querySelector('.dialog-actions');
  for (const b of buttons) {
    const btn = h(`<button class="btn${b.primary ? ' primary' : ''}">${esc(b.label)}</button>`);
    btn.onclick = async () => {
      if (busy) return;
      busy = true; card.setAttribute('aria-busy', 'true');
      const controls = [...card.querySelectorAll('button,input,textarea,select')].map((el) => [el, el.disabled]);
      controls.forEach(([el]) => { el.disabled = true; });
      try {
        const keep = b.onClick ? await b.onClick(card) : false;
        if (!keep) close(true);
      } catch {
        const err = card.querySelector('[role="status"]');
        if (err) err.textContent = '처리하지 못했어요. 잠시 후 다시 시도해 주세요.';
      } finally {
        busy = false;
        if (!closed) { card.removeAttribute('aria-busy'); controls.forEach(([el, disabled]) => { el.disabled = disabled; }); }
      }
    };
    row.appendChild(btn);
  }
  root.appendChild(card);
  root.hidden = false;
  game.paused = true;
  if (hud) hud.inert = true;
  active.set(game, () => close(true));
  document.addEventListener('keydown', onKey); card.focus();
  root.onclick = (e) => { if (e.target === root) close(); };
  return { close, card };
}

/** key: value 표를 만드는 작은 헬퍼(빈 값은 생략) */
export function kv(pairs) {
  return pairs.filter(([, v]) => v).map(([k, v]) => `<p><b>${esc(k)}</b> ${esc(v)}</p>`).join('');
}
