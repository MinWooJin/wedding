import { esc, h } from './dom.js';

let timer = null;
export function toast(msg, ms = 2000) {
  const root = document.getElementById('toast');
  root.innerHTML = '';
  root.appendChild(h(`<div class="toast-msg">${esc(msg)}</div>`));
  root.hidden = false;
  clearTimeout(timer);
  timer = setTimeout(() => { root.hidden = true; }, ms);
}
