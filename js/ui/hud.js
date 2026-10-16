import { esc, h } from './dom.js';
import { ddayLabel, displayName } from '../config.js';
import { HUB_SPAWN } from '../world/hub.js';

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function createHud(root, config, game) {
  const w = config.wedding;
  const d = new Date(w.date);
  const date = `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()} (${DAYS[d.getDay()]})`;
  root.innerHTML = '';
  root.appendChild(h(`<div class="hud-card">
    <div>
      <div class="hud-names">${esc(displayName(config.groom))}<span class="heart">♥</span>${esc(displayName(config.bride))}</div>
      <div class="hud-date">${esc(date)}</div>
    </div>
    <div class="hud-dday">${esc(ddayLabel(w.date))}</div>
  </div>`));
  const home = h(`<button class="btn ghost" hidden>광장으로</button>`);
  home.onclick = () => game.goTo('hub', HUB_SPAWN);
  root.appendChild(home);
  root.hidden = false;
  return { onScene(id) { home.hidden = id === 'hub'; } };
}
