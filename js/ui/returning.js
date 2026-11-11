import { validateNickname } from '../state.js';
import { esc, h } from './dom.js';
import { displayName } from '../config.js';
import { drawFace } from './intro.js';

const nickKey = (s) => String(s || '').normalize('NFC').trim().toLowerCase();

/** 입력한 닉네임과 같은 입장 기록(대소문자·앞뒤 공백 무시) */
export const findVisitor = (visitors, nickname) => visitors.find((v) => nickKey(v.n) === nickKey(nickname)) ?? null;

/** 검색어가 들어간 닉네임만, 가나다순 */
export const filterVisitors = (visitors, query) =>
  visitors.filter((v) => nickKey(v.n).includes(nickKey(query))).sort((a, b) => a.n.localeCompare(b.n, 'ko'));

/**
 * "전에 정원에 오신 적 있나요?"를 묻는다.
 * 전에 입장했다면 닉네임을 입력하거나(잊었으면 목록에서 골라) 본인 확인 후 {nickname, charId, claim:true}로 resolve.
 * "처음 왔어요"면 null로 resolve한다(호출한 쪽이 닉네임·캐릭터 화면을 띄운다).
 * loadVisitors() → Promise<{ok, visitors:[{n,c}]}>
 */
export function showReturning(root, config, assets, { loadVisitors }) {
  return new Promise((resolve) => {
    const card = h('<div class="card returning" role="dialog" aria-modal="true" aria-label="정원 입장" tabindex="-1"></div>');
    let visitorsPromise = null;
    const visitors = () => (visitorsPromise ??= loadVisitors());
    const finish = (profile) => { root.hidden = true; root.replaceChildren(); resolve(profile); };
    const show = (html, focus) => {
      card.innerHTML = `<h2>${esc(displayName(config.groom))} ♥ ${esc(displayName(config.bride))}</h2>${html}`;
      (focus ? card.querySelector(focus) : card).focus({ preventScroll: true });
    };
    const on = (selector, handler) => { card.querySelector(selector).onclick = handler; };

    const ask = () => {
      show(`<p>픽셀 가든에 오신 걸 환영해요!<br>전에 정원에 오신 적 있나요?</p>
        <div class="returning-actions"><button class="btn primary" id="first">처음 왔어요</button><button class="btn" id="again">전에 입장했어요</button></div>`, '#first');
      on('#first', () => finish(null));
      on('#again', () => byName());
    };

    const byName = () => {
      show(`<p>전에 쓰던 닉네임을 입력해 주세요.</p>
        <label for="old-nick">닉네임</label><input id="old-nick" maxlength="10" placeholder="닉네임 (2~10자)" autocomplete="nickname">
        <p id="err" class="intro-error" role="status"></p>
        <div class="returning-actions"><button class="btn primary" id="find">입장하기</button><button class="btn" id="forgot">닉네임을 잊어버렸어요</button><button class="btn" id="back">뒤로</button></div>`, '#old-nick');
      const input = card.querySelector('#old-nick'), err = card.querySelector('#err'), findButton = card.querySelector('#find');
      const find = async () => {
        const v = validateNickname(input.value);
        if (!v.ok) { err.textContent = v.error; return; }
        findButton.disabled = true; err.textContent = '기록을 찾고 있어요…';
        const r = await visitors();
        findButton.disabled = false;
        if (!r.ok) { visitorsPromise = null; err.textContent = '지금은 기록을 확인할 수 없어요. 잠시 후 다시 시도하거나 "뒤로"에서 처음 왔어요를 눌러 주세요.'; return; }
        const found = findVisitor(r.visitors, v.value);
        if (found) confirmVisitor(found, byName);
        else err.textContent = '그 닉네임으로 입장한 기록이 없어요. 다시 확인하거나 "닉네임을 잊어버렸어요"를 눌러 주세요.';
      };
      on('#find', find);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') find(); });
      on('#forgot', () => list());
      on('#back', () => ask());
    };

    const list = async () => {
      show(`<p>정원에 다녀간 분들이에요. 내 닉네임을 눌러 주세요.</p>
        <label for="search">닉네임 찾기</label><input id="search" maxlength="10" placeholder="닉네임 일부를 입력해 보세요" autocomplete="off">
        <ul class="visitor-list" aria-label="입장했던 분들"><li class="muted">목록을 불러오고 있어요…</li></ul>
        <div class="returning-actions"><button class="btn" id="none">목록에 제 이름이 없어요</button><button class="btn" id="back">뒤로</button></div>`, null); // 검색창에 바로 포커스하면 휴대폰 키보드가 목록을 가린다
      on('#none', () => finish(null));
      on('#back', () => byName());
      const ul = card.querySelector('.visitor-list'), search = card.querySelector('#search');
      const r = await visitors();
      if (!ul.isConnected) return; // 불러오는 사이 다른 화면으로 넘어감
      if (!r.ok) { visitorsPromise = null; ul.innerHTML = '<li class="muted">목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</li>'; return; }
      const render = () => {
        const shown = filterVisitors(r.visitors, search.value);
        ul.replaceChildren(...(shown.length ? shown.map((v) => {
          const li = h(`<li><button class="visitor" type="button"><canvas width="40" height="40" aria-hidden="true"></canvas><span>${esc(v.n)}</span></button></li>`);
          drawFace(li.querySelector('canvas'), assets, v.c);
          li.querySelector('button').onclick = () => confirmVisitor(v, list);
          return li;
        }) : [h(`<li class="muted">${r.visitors.length ? '찾는 닉네임이 없어요' : '아직 입장한 분이 없어요'}</li>`)]));
      };
      search.addEventListener('input', render);
      render();
    };

    const confirmVisitor = (visitor, back) => {
      show(`<div class="claim-box returning-confirm"><canvas width="40" height="40" aria-hidden="true"></canvas>
        <p><b>${esc(visitor.n)}</b> 님이 맞으세요?</p></div>
        <p class="muted">본인이 맞을 때만 눌러 주세요. 이 이름으로 정원에 입장해요.</p>
        <div class="returning-actions"><button class="btn primary" id="yes">네, 저예요</button><button class="btn" id="no">아니요</button></div>`, '#yes');
      drawFace(card.querySelector('canvas'), assets, visitor.c);
      on('#yes', () => finish({ nickname: visitor.n, charId: visitor.c, claim: true }));
      on('#no', () => back());
    };

    card.addEventListener('keydown', (e) => { // 카드 안에서만 Tab이 돈다(인트로와 같은 방식)
      if (e.key !== 'Tab') return;
      const nodes = [...card.querySelectorAll('input,button')].filter((n) => !n.disabled), first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === card)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || document.activeElement === card)) { e.preventDefault(); first.focus(); }
    });
    root.replaceChildren(card); root.hidden = false;
    ask();
  });
}
