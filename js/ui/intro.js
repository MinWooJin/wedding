import { PRESET_COUNT, presetSprites } from '../sprites/characters.js';
import { spriteCanvas } from '../renderer.js';
import { validateNickname } from '../state.js';
import { esc, h } from './dom.js';
import { characterSet } from '../assets.js';
import { displayName } from '../config.js';

/** 인트로 화면을 띄우고 {nickname, charId}를 resolve한다. */
export function showIntro(root, config, assets = {}, current = null) {
  return new Promise((resolve) => {
    let charId = current?.charId ?? Math.floor(Math.random() * PRESET_COUNT);
    let frame = 0;
    const card = h(`
      <div class="card" role="dialog" aria-modal="true" aria-label="정원의 내 캐릭터" tabindex="-1">
        <h2>${esc(displayName(config.groom))} ♥ ${esc(displayName(config.bride))}</h2>
        <p>픽셀 가든에 오신 걸 환영해요!<br>닉네임을 정하고 캐릭터를 골라주세요.</p>
        <label for="nick">정원에서 사용할 이름</label><input id="nick" maxlength="10" placeholder="닉네임 (2~10자)" autocomplete="nickname">
        <div class="picker">
          <button class="btn" id="prev" aria-label="이전 캐릭터">◀</button>
          <canvas width="48" height="72"></canvas>
          <button class="btn" id="next" aria-label="다음 캐릭터">▶</button>
        </div>
        <p class="muted" id="count"></p>
        <p id="err" style="color:#c0392b;min-height:1.5em"></p>
        <div class="row"><button class="btn primary" id="go">입장하기</button></div>
      </div>`);
    const cv = card.querySelector('canvas'), ctx = cv.getContext('2d');
    const count = card.querySelector('#count'), err = card.querySelector('#err'), nick = card.querySelector('#nick');
    const hud = document.getElementById('hud'), previousFocus = document.activeElement;
    hud.inert = true;
    const finish = (profile) => {
      clearInterval(timer); hud.inert = false;
      root.hidden = true; root.replaceChildren();
      if (previousFocus?.isConnected) previousFocus.focus();
      resolve(profile);
    };
    nick.value = current?.nickname || '';

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
      finish({ nickname: v.value, charId });
    };
    card.querySelector('#go').onclick = go;
    if (current) {
      const cancel = h('<button class="btn">그대로 돌아가기</button>');
      cancel.onclick = () => finish(current);
      card.querySelector('.row').appendChild(cancel);
    }
    nick.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && current) finish(current);
      if (e.key !== 'Tab') return;
      const nodes = [...card.querySelectorAll('input,button')], first = nodes[0], last = nodes.at(-1);
      if (e.shiftKey && (document.activeElement === first || document.activeElement === card)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || document.activeElement === card)) { e.preventDefault(); first.focus(); }
    });

    root.innerHTML = ''; root.appendChild(card); root.hidden = false;
    render();
    card.focus({ preventScroll: true });
  });
}
