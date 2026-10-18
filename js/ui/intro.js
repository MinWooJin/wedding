import { PRESET_COUNT, presetSprites } from '../sprites/characters.js';
import { spriteCanvas } from '../renderer.js';
import { validateNickname } from '../state.js';
import { esc, h } from './dom.js';
import { characterSet } from '../assets.js';
import { displayName } from '../config.js';

/** 정원에서 헷갈리는 이름(분위기용 하객, 두 사람 이름)은 닉네임으로 쓰지 않는다. */
export function reservedNickname(nickname, config) {
  const key = (s) => String(s || '').normalize('NFC').trim().toLowerCase();
  const names = ['하객', '정원 안내인', config?.groom?.name, config?.groom?.shortName, config?.bride?.name, config?.bride?.shortName].filter(Boolean).map(key);
  return names.includes(key(nickname));
}

/**
 * 인트로 화면을 띄우고 {nickname, charId}를 resolve한다.
 * checkNickname(nickname) → Promise<{ok, available}>가 있으면 다른 기기가 쓰는 닉네임인지 확인한다.
 */
export function showIntro(root, config, assets = {}, current = null, { checkNickname = null } = {}) {
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
        <button class="btn picker-all" id="show-characters" aria-expanded="false" aria-controls="character-grid">${PRESET_COUNT}종 한눈에 보기</button>
        <div class="character-grid" id="character-grid" role="group" aria-label="캐릭터 목록" hidden></div>
        <p id="err" style="color:#c0392b;min-height:1.5em"></p>
        <div class="claim-box" id="claim" hidden>
          <p><b id="claim-name"></b> 님은 이미 정원에 다녀가셨어요.<br>같은 분이세요?</p>
          <div class="row"><button class="btn primary" id="claim-yes">네, 저예요</button><button class="btn" id="claim-no">다른 닉네임 쓸게요</button></div>
          <p class="muted">다른 휴대폰이나 브라우저로 다시 오셨다면 "네, 저예요"를 눌러 주세요.</p>
        </div>
        <div class="row" id="main-row"><button class="btn primary" id="go">입장하기</button></div>
      </div>`);
    const cv = card.querySelector('canvas'), ctx = cv.getContext('2d');
    const count = card.querySelector('#count'), err = card.querySelector('#err'), nick = card.querySelector('#nick');
    const grid = card.querySelector('#character-grid'), showCharacters = card.querySelector('#show-characters');
    let selectedButton;
    const closeGrid = () => { grid.hidden = true; showCharacters.setAttribute('aria-expanded','false'); };
    showCharacters.onclick = () => { grid.hidden = !grid.hidden; showCharacters.setAttribute('aria-expanded',String(!grid.hidden)); };
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
      const nextButton = grid.children[charId];
      if (nextButton && nextButton !== selectedButton) {
        selectedButton?.setAttribute('aria-pressed','false');
        nextButton.setAttribute('aria-pressed','true'); selectedButton = nextButton;
      }
    };
    for (let id = 0; id < PRESET_COUNT; id++) {
      const button = h(`<button class="character-option" type="button" aria-label="캐릭터 ${id + 1} 선택" aria-pressed="false"><canvas width="48" height="72" aria-hidden="true"></canvas><span>${id + 1}</span></button>`);
      const sprite = characterSet(assets,`preset-${id}`,presetSprites(id)).down[0];
      const canvas = button.querySelector('canvas'), context = canvas.getContext('2d');
      canvas.width = sprite.w; canvas.height = sprite.h; context.imageSmoothingEnabled = false;
      context.drawImage(spriteCanvas(sprite),0,0);
      button.onclick = () => { charId = id; frame = 0; render(); closeGrid(); showCharacters.focus({preventScroll:true}); };
      grid.appendChild(button);
    }
    const timer = setInterval(() => { frame = frame ? 0 : 2; render(); }, 300);
    card.querySelector('#prev').onclick = () => { charId = (charId + PRESET_COUNT - 1) % PRESET_COUNT; render(); };
    card.querySelector('#next').onclick = () => { charId = (charId + 1) % PRESET_COUNT; render(); };
    const goButton = card.querySelector('#go');
    const claimBox = card.querySelector('#claim'), mainRow = card.querySelector('#main-row');
    let checking = false, pending = null;
    const showClaim = (show) => { claimBox.hidden = !show; mainRow.hidden = show; };
    card.querySelector('#claim-yes').onclick = () => { if (pending) finish({ ...pending, claim: true }); };
    card.querySelector('#claim-no').onclick = () => { pending = null; showClaim(false); nick.select(); nick.focus(); };
    nick.addEventListener('input', () => { if (pending) { pending = null; showClaim(false); } });
    const go = async () => {
      if (checking) return;
      const v = validateNickname(nick.value);
      if (!v.ok) { err.textContent = v.error; return; }
      if (reservedNickname(v.value, config)) { err.textContent = '정원에서 쓰는 이름이라 다른 닉네임을 골라 주세요'; return; }
      if (checkNickname && v.value !== current?.nickname) {
        checking = true; goButton.disabled = true; err.textContent = '닉네임을 확인하고 있어요…';
        const r = await checkNickname(v.value);
        checking = false; goButton.disabled = false; err.textContent = '';
        if (r.ok && !r.available) { // 막지 않고 본인인지 묻는다(카카오톡 ↔ 사파리처럼 같은 사람이 다른 브라우저로 온 경우)
          pending = { nickname: v.value, charId };
          card.querySelector('#claim-name').textContent = v.value;
          showClaim(true); card.querySelector('#claim-yes').focus();
          return;
        }
      }
      finish({ nickname: v.value, charId });
    };
    goButton.onclick = go;
    if (current) {
      const cancel = h('<button class="btn">그대로 돌아가기</button>');
      cancel.onclick = () => finish(current);
      card.querySelector('#main-row').appendChild(cancel);
    }
    nick.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && current) finish(current);
      if (e.key !== 'Tab') return;
      const nodes = [...card.querySelectorAll('input,button')], first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === card)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || document.activeElement === card)) { e.preventDefault(); first.focus(); }
    });

    root.innerHTML = ''; root.appendChild(card); root.hidden = false;
    render();
    card.focus({ preventScroll: true });
  });
}
