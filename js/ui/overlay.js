import { esc, h } from './dom.js';

/**
 * 팝업 카드. buttons: [{label, primary?, onClick?(card) => boolean|Promise<boolean>}]
 * onClick이 true를 돌려주면 닫지 않는다(검증 실패 등). 열려 있는 동안 game.paused = true.
 */
export function showOverlay(game, { title = '', html = '', buttons = [{ label: '닫기' }] }) {
  const root = document.getElementById('overlay');
  root.innerHTML = '';
  const card = h(`<div class="card">${title ? `<h2>${esc(title)}</h2>` : ''}<div class="body">${html}</div><div class="row"></div></div>`);
  const close = () => { root.hidden = true; root.innerHTML = ''; root.onclick = null; game.paused = false; };
  const row = card.querySelector('.row');
  for (const b of buttons) {
    const btn = h(`<button class="btn${b.primary ? ' primary' : ''}">${esc(b.label)}</button>`);
    btn.onclick = async () => { const keep = b.onClick ? await b.onClick(card) : false; if (!keep) close(); };
    row.appendChild(btn);
  }
  root.appendChild(card);
  root.hidden = false;
  game.paused = true;
  root.onclick = (e) => { if (e.target === root) close(); };
  return { close, card };
}

/** key: value 표를 만드는 작은 헬퍼(빈 값은 생략) */
export function kv(pairs) {
  return pairs.filter(([, v]) => v).map(([k, v]) => `<p><b>${esc(k)}</b> ${esc(v)}</p>`).join('');
}
