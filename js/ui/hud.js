import { esc, h } from './dom.js';
import { ddayLabel, formatDate } from '../config.js';
import { HUB_SPAWN } from '../world/hub.js';

export function createHud(root, config, game) {
  const w = config.wedding;
  root.innerHTML = '';
  root.appendChild(h(`<div><b>${esc(config.groom.name)} ♥ ${esc(config.bride.name)}</b><br>
    <span>${esc(formatDate(w.date).replace(/ (오전|오후).*$/, ''))} · ${esc(ddayLabel(w.date))}</span></div>`));
  const home = h(`<button class="btn ghost" hidden>광장으로</button>`);
  home.onclick = () => game.goTo('hub', HUB_SPAWN);
  root.appendChild(home);
  root.hidden = false;
  return { onScene(id) { home.hidden = id === 'hub'; } };
}
