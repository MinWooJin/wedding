import { Scene } from './scene.js';
import { HUB_DOORS, grassAt } from './hub.js';
import { freeTiles, pickTiles } from './guest-layout.js';
import { showOverlay } from '../ui/overlay.js';
import { toast } from '../ui/toast.js';
import { savePreview, deletePreviewEntry } from '../guestbook-store.js';
import { esc } from '../ui/dom.js';
import { validateEntry, postMessage, MESSAGE_MAX } from '../api.js';
import { makeHostNpc } from './host-npc.js';

// 11열 × 14행. 광장과 같은 들꽃 잔디 위에 가운데 돌길이 우체통까지 이어지고,
// 우체통 양옆에 두 사람이 서서 편지를 기다린다. 가장자리는 나무·장미·라벤더·버드배스로 채워 빈 느낌을 없앴다.
const COLS = 11, LAST = 13;
const rowAt = (ty) => 'H' + Array.from({ length: COLS - 2 }, (_, i) => {
  const tx = i + 1;
  return tx === 5 && ty >= PATH_START ? 'N' : grassAt(tx + 20, ty + 40); // 광장과 다른 들꽃 배열
}).join('') + 'H';
const PATH_START = 5;
const ROWS = [
  'H'.repeat(COLS),
  ...Array.from({ length: LAST - 1 }, (_, i) => rowAt(i + 1)),
  'HHHHHNHHHHH',
];
const MAILBOX = { tx: 4, ty: 2 }; // 64×96: 4~5열, 2~4행
const EXIT = { tx: 5, ty: LAST };
const SPAWN = { tx: 5, ty: LAST - 1 };
const GROOM_POS = { tx: 3, ty: 4 }, BRIDE_POS = { tx: 6, ty: 4 }; // 우체통 양옆
const POST_COOLDOWN_MS = 60_000;
let lastPostAt = 0;

const has = (assets, id) => !!assets?.objects?.[id];

/** 가장자리 장식과 바닥 장식. PNG가 있는 것만 넣는다(코드 그림이 있는 tree·bush는 항상). */
function gardenDecor(assets) {
  const always = new Set(['tree', 'bush', 'bush-white', 'door']);
  const list = [
    ['tree-green', 0, 0], ['tree', 8, 0],
    ['rose-bush-s', 0, 5], ['lavender', 10, 5],
    ['lavender', 0, 7], ['rose-bush-s', 9, 7],
    ['birdbath', 1, 9], ['ribbon-lantern', 10, 9],
    ['lavender', 0, 11], ['lavender', 10, 11],
    ['planter-box', 1, 12], ['planter-box', 8, 12],
  ];
  const floors = [
    ...Array.from({ length: LAST - 1 - PATH_START }, (_, i) => ['aisle-edge-left', (160 - 22) / 32, PATH_START + 1 + i]),
    ...Array.from({ length: LAST - 1 - PATH_START }, (_, i) => ['aisle-edge-right', (192 - 10) / 32, PATH_START + 1 + i]),
    ['petal-pile', 3, 3], ['petal-pile', 6, 3],
    ['meadow-sprig', 2, 7], ['meadow-sprig', 8, 9], ['meadow-sprig', 3, 11], ['meadow-sprig', 7, 6],
  ];
  return [
    ...floors.filter(([id]) => has(assets, id)).map(([sprite, tx, ty]) => ({ id: `floor-${sprite}-${ty}`, sprite, tx, ty, floor: true })),
    ...list.filter(([id]) => always.has(id) || has(assets, id)).map(([sprite, tx, ty]) => ({ id: `decor-${sprite}-${tx}-${ty}`, sprite, tx, ty })),
  ];
}

export class GuestbookScene extends Scene {
  constructor(game) {
    super({
      id: 'guestbook', rows: ROWS, spawn: SPAWN, assets: game.assets, groundTile: 'G',
      npcs: [
        makeHostNpc(game, 'groom', GROOM_POS, [
          '와 주셔서 고마워요. 편지 한 통이 이 정원의 꽃 한 송이가 돼요.',
          '꽃을 누르면 다른 분들의 마음도 읽을 수 있어요.',
        ]),
        makeHostNpc(game, 'bride', BRIDE_POS, [
          '축하 편지를 남겨 주시면 이 정원에 꽃이 피어요.',
          '멀리서 보내 주신 마음도 오래 소중히 간직할게요.',
        ]),
      ],
      entrances: [{ ...EXIT, to: 'hub', spawn: HUB_DOORS.guestbook.back }],
      objects: [
        { id: 'door', sprite: 'door', floor: true, ...EXIT },
        // 배경 그림(assets.maps.guestbook)에 나무·장미·라벤더·버드배스·길·꽃띠가 들어 있으면 장식 오브젝트는 올리지 않는다.
        ...(game.assets?.maps?.guestbook ? [] : gardenDecor(game.assets)),
        { id: 'mailbox', sprite: game.assets?.objects?.['wedding-mailbox'] ? 'wedding-mailbox' : 'mailbox', label: '축하 편지 쓰기', ...MAILBOX, interact: () => this.openForm(game) },
      ],
    });
    this.game = game;
    // 꽃을 피우지 않을 자리: 돌길·입구·우체통 앞, 두 사람 주변(얼굴·이름표), 장식이 덮는 칸(바닥 장식 제외).
    this.reserved = new Set();
    for (let ty = 0; ty <= LAST; ty++) this.reserved.add(`5,${ty}`);
    for (const t of [`4,${LAST - 1}`, `6,${LAST - 1}`, '4,5', '6,5']) this.reserved.add(t);
    for (const pos of [GROOM_POS, BRIDE_POS]) for (let dy = -2; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) this.reserved.add(`${pos.tx + dx},${pos.ty + dy}`);
    for (const o of this.objects) {
      if (o.floor) continue;
      for (let y = -1; y < Math.ceil(o.spr.h / 32); y++) for (let x = 0; x < Math.ceil(o.spr.w / 32); x++) this.reserved.add(`${o.tx + x},${o.ty + y}`);
    }
    if (game.assets?.maps?.guestbook) { // 배경 그림의 가장자리 식생 위(바깥 열, 위쪽 모서리, 아래 모서리)에는 꽃을 피우지 않는다
      for (let ty = 0; ty <= LAST; ty++) { this.reserved.add(`0,${ty}`); this.reserved.add(`${COLS - 1},${ty}`); }
      for (let ty = 0; ty <= 3; ty++) for (const tx of [1, 2, 8, 9]) this.reserved.add(`${tx},${ty}`);
      for (let ty = LAST - 3; ty <= LAST; ty++) for (const tx of [1, 9]) this.reserved.add(`${tx},${ty}`);
    }
    this.baseObjects = this.objects.slice();
    this.setEntries(game.data?.messages ?? []);
  }

  /** 메시지 목록 → 꽃 오브젝트 재배치 */
  setEntries(allEntries) {
    const entries = allEntries.filter((e) => e.m); // 입장만 한 하객(메시지 없음)은 꽃을 피우지 않는다
    this.entries = entries;
    const tiles = pickTiles(freeTiles(ROWS, this.reserved), Math.min(entries.length, 40), 7);
    const flowers = tiles.map((t, i) => this.makeObject({
      id: `flower${i}`, sprite: 'flower', tx: t.tx, ty: t.ty, solid: false,
      interact: () => showOverlay(this.game, { title: `${entries[i].n}님의 메시지`, html: `<p>${esc(entries[i].m)}</p>` }),
    }));
    this.objects = [...this.baseObjects, ...flowers];
    this.rebuildSolid();
  }

  openList() {
    const snapshot = this.game.data.messages;
    const entries = snapshot.map((entry, index) => ({ ...entry, sourceIndex: index })).filter((e) => e.m).sort((a, b) => b.t - a.t);
    const { card, close } = showOverlay(this.game, {
      title: `정원에 도착한 마음 · ${entries.length}`,
      html: `${!this.game.config.guestbookApi ? '<p class="preview-notice">이 기기에 저장한 미리보기예요. 다른 사람에게 공개되지 않아요.</p>' : ''}
        <div class="message-list">${entries.length ? entries.map((e) => `<article class="message-item"><strong>${esc(e.n)}</strong><p>${esc(e.m)}</p><small>${esc(new Date(e.t).toLocaleDateString('ko-KR'))}</small>${!this.game.config.guestbookApi ? `<button class="text-button preview-delete" data-index="${e.sourceIndex}">이 미리보기 지우기</button>` : ''}</article>`).join('') : '<div class="empty-state"><span>❀</span><h3>첫 번째 꽃을 기다리고 있어요</h3><p>따뜻한 한마디가 정원의 첫 꽃이 됩니다.</p></div>'}</div>`,
      buttons: [{ label: '축하 남기기', primary: true, onClick: () => { close(true); this.openForm(this.game); return true; } }, { label: '닫기' }],
    });
    card.querySelectorAll('.preview-delete').forEach((button) => {
      button.onclick = () => {
        if (snapshot !== this.game.data.messages) { close(); this.openList(); return; }
        const result = deletePreviewEntry(snapshot, Number(button.dataset.index));
        if (!result.ok) { toast('기기에 저장할 수 없어 지우지 못했어요.'); return; }
        this.game.data.messages = result.entries; this.game.onMessagesChanged?.();
        close(); this.openList();
      };
    });
    return card;
  }

  openForm(game) {
    const url = game.config.guestbookApi;
    let submitted = false;
    const { card } = showOverlay(game, {
      title: '마음을 꽃으로 남겨 주세요',
      html: `${!url ? '<p class="preview-notice">기기 저장 미리보기 · 이 브라우저에만 남으며 실제 방명록으로 전송되지 않아요.</p>' : ''}
        <p class="muted">${esc(game.profile.nickname)}님의 축하 편지</p>
        <label for="msg">축하 메시지</label>
        <textarea id="msg" rows="4" maxlength="${MESSAGE_MAX}" placeholder="두 사람에게 전하고 싶은 마음을 적어 주세요.">${esc(game.guestbookDraft || '')}</textarea>
        <p class="message-count muted" aria-live="polite"></p><p id="err" class="form-error" role="status"></p>`,
      onClose: (el) => { game.guestbookDraft = submitted ? '' : el.querySelector('#msg').value; },
      buttons: [
        { label: '나중에 쓸게요' },
        { label: url ? '축하 보내기' : '이 기기에 미리 저장', primary: true, onClick: async (el) => {
          const err = el.querySelector('#err');
          if (url && Date.now() - lastPostAt < POST_COOLDOWN_MS) { err.textContent = '1분에 한 번만 남길 수 있어요'; return true; }
          const v = validateEntry({ nickname: game.profile.nickname, characterId: game.profile.charId, message: el.querySelector('#msg').value });
          if (!v.ok) { err.textContent = v.error; return true; }
          err.textContent = url ? '마음을 전하고 있어요…' : '이 기기에 저장하고 있어요…';
          if (url) {
            const result = await postMessage(url, v.value);
            if (!result.ok) { err.textContent = result.error; return true; }
            lastPostAt = Date.now();
          }
          const entry = { t: Date.now(), n: v.value.nickname, c: v.value.characterId, m: v.value.message };
          const entries = [entry, ...game.data.messages];
          if (!url && !savePreview(entries)) { err.textContent = '기기에 저장할 수 없어요. 브라우저 저장 공간 설정을 확인해 주세요.'; return true; }
          game.data.messages = entries.slice(0, url ? Infinity : 100);
          submitted = true; game.onMessagesChanged?.();
          game.player.say(url ? '축하를 전했어요 ♡' : '내 기기에 꽃이 피었어요 ♡');
          toast(url ? '마음을 전했어요. 메시지 보기에서 확인해 주세요.' : '이 기기에만 저장했어요. 메시지 보기에서 확인해 주세요.');
          return false;
        } },
      ],
    });
    const input = card.querySelector('#msg'), count = card.querySelector('.message-count');
    const updateCount = () => { count.textContent = `${input.value.length} / ${MESSAGE_MAX}`; };
    input.addEventListener('input', updateCount); updateCount();
  }
}

export function createGuestbook(game) { return new GuestbookScene(game); }
