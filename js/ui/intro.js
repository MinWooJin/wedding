import { PRESET_COUNT, presetSprites } from '../sprites/characters.js';
import { spriteCanvas } from '../renderer.js';
import { validateNickname } from '../state.js';
import { esc, h } from './dom.js';
import { characterSet } from '../assets.js';

/** 인트로 화면을 띄우고 {nickname, charId}를 resolve한다. */
export function showIntro(root, config, assets = {}) {
  return new Promise((resolve) => {
    let charId = Math.floor(Math.random() * PRESET_COUNT);
    let frame = 0;
    const card = h(`
      <div class="card">
        <h2>${esc(config.groom.name)} ♥ ${esc(config.bride.name)}</h2>
        <p>픽셀 가든에 오신 걸 환영해요!<br>닉네임을 정하고 캐릭터를 골라주세요.</p>
        <input id="nick" maxlength="10" placeholder="닉네임 (2~10자)" autocomplete="off">
        <div class="picker">
          <button class="btn" id="prev">◀</button>
          <canvas width="48" height="72"></canvas>
          <button class="btn" id="next">▶</button>
        </div>
        <p class="muted" id="count"></p>
        <p id="err" style="color:#c0392b;min-height:1.5em"></p>
        <div class="row"><button class="btn primary" id="go">입장하기</button></div>
      </div>`);
    const cv = card.querySelector('canvas'), ctx = cv.getContext('2d');
    const count = card.querySelector('#count'), err = card.querySelector('#err'), nick = card.querySelector('#nick');

    const render = () => {
      const set = characterSet(assets, `preset-${charId}`, presetSprites(charId));
      const spr = set.down[Math.min(frame, set.down.length - 1)];
      cv.width = spr.w; cv.height = spr.h;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(spriteCanvas(spr), 0, 0);
      count.textContent = `캐릭터 ${charId + 1} / ${PRESET_COUNT}`;
    };
    const timer = setInterval(() => { frame = frame ? 0 : 2; render(); }, 300);
    card.querySelector('#prev').onclick = () => { charId = (charId + PRESET_COUNT - 1) % PRESET_COUNT; render(); };
    card.querySelector('#next').onclick = () => { charId = (charId + 1) % PRESET_COUNT; render(); };
    const go = () => {
      const v = validateNickname(nick.value);
      if (!v.ok) { err.textContent = v.error; return; }
      clearInterval(timer);
      root.hidden = true; root.innerHTML = '';
      resolve({ nickname: v.value, charId });
    };
    card.querySelector('#go').onclick = go;
    nick.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });

    root.innerHTML = ''; root.appendChild(card); root.hidden = false;
    render();
    setTimeout(() => nick.focus(), 50);
  });
}
