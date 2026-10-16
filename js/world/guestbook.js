import { Scene } from './scene.js';
import { HUB_DOORS } from './hub.js';
import { freeTiles, pickTiles } from './guest-layout.js';
import { showOverlay } from '../ui/overlay.js';
import { toast } from '../ui/toast.js';
import { esc } from '../ui/dom.js';
import { validateEntry, postMessage, MESSAGE_MAX } from '../api.js';

const ROWS = [
  'HHHHHHHHHHH',
  'HMMMMMMMMMH',
  'HMEEEEEEEMH',
  'HMEEEEEEEMH',
  'HMEEEEEEEMH',
  'HMEEEEEEEMH',
  'HMEEEEEEEMH',
  'HMEEEEEEEMH',
  'HMEEEEEEEMH',
  'HMEEEAEEEMH',
  'HMMMMAMMMMH',
  'HHHHHPHHHHH',
];
const MAILBOX = { tx: 4, ty: 2 }; // 64×64: 4~5열, 2~3행
const EXIT = { tx: 5, ty: 11 };
const SPAWN = { tx: 5, ty: 10 };
const RESERVED = new Set(['4,2', '5,2', '4,3', '5,3', '4,4', '5,4', '3,3', '6,3', '5,9', '5,10', '4,10', '6,10']); // 우체통 주변, 입구 근처
const POST_COOLDOWN_MS = 60_000;
let lastPostAt = 0;

export class GuestbookScene extends Scene {
  constructor(game) {
    super({
      id: 'guestbook', rows: ROWS, spawn: SPAWN, assets: game.assets,
      entrances: [{ ...EXIT, to: 'hub', spawn: HUB_DOORS.guestbook.back }],
      objects: [
        { id: 'door', sprite: 'door', floor: true, ...EXIT },
        { id: 'mailbox', sprite: 'mailbox', ...MAILBOX, interact: () => this.openForm(game) },
      ],
    });
    this.game = game;
    this.baseObjects = this.objects.slice();
    this.setEntries(game.data?.messages ?? []);
  }

  /** 메시지 목록 → 꽃 오브젝트 재배치 */
  setEntries(entries) {
    this.entries = entries;
    const tiles = pickTiles(freeTiles(ROWS, RESERVED), Math.min(entries.length, 40), 7);
    const flowers = tiles.map((t, i) => this.makeObject({
      id: `flower${i}`, sprite: 'flower', tx: t.tx, ty: t.ty, solid: false,
      interact: () => showOverlay(this.game, { title: `${entries[i].n}님의 메시지`, html: `<p>${esc(entries[i].m)}</p>` }),
    }));
    this.objects = [...this.baseObjects, ...flowers];
    this.rebuildSolid();
  }

  openForm(game) {
    const url = game.config.guestbookApi;
    if (!url) { showOverlay(game, { title: '방명록', html: '<p class="muted">방명록이 아직 열리지 않았어요.</p>' }); return; }
    showOverlay(game, {
      title: '축하 메시지 남기기',
      html: `<p class="muted">${esc(game.profile.nickname)}님으로 남겨져요</p>
             <textarea id="msg" rows="4" maxlength="${MESSAGE_MAX}" placeholder="축하 메시지를 적어주세요 (최대 ${MESSAGE_MAX}자)"></textarea>
             <p id="err" style="color:#c0392b;min-height:1.5em"></p>`,
      buttons: [
        { label: '취소' },
        { label: '보내기', primary: true, onClick: async (card) => {
          const err = card.querySelector('#err');
          if (Date.now() - lastPostAt < POST_COOLDOWN_MS) { err.textContent = '1분에 한 번만 남길 수 있어요'; return true; }
          const v = validateEntry({ nickname: game.profile.nickname, characterId: game.profile.charId, message: card.querySelector('#msg').value });
          if (!v.ok) { err.textContent = v.error; return true; }
          err.textContent = '보내는 중…';
          const r = await postMessage(url, v.value);
          if (!r.ok) { err.textContent = r.error; return true; }
          lastPostAt = Date.now();
          const entry = { t: Date.now(), n: v.value.nickname, c: v.value.characterId, m: v.value.message };
          game.data.messages = [entry, ...game.data.messages];
          game.onMessagesChanged?.();
          game.player.say('💛 감사합니다!');
          toast('메시지를 남겼어요. 정원에 꽃이 피었어요 🌸');
          return false;
        } },
      ],
    });
  }
}

export function createGuestbook(game) { return new GuestbookScene(game); }
