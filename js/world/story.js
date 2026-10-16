import { Scene, standPos } from './scene.js';
import { HUB_DOORS } from './hub.js';
import { storyLayout } from './story-layout.js';
import { Character } from '../entities/character.js';
import { GROOM, BRIDE } from '../sprites/characters.js';
import { characterSet } from '../assets.js';
import { showOverlay } from '../ui/overlay.js';
import { esc } from '../ui/dom.js';
import { displayName } from '../config.js';

export function createStory(game) {
  const cfg = game.config;
  const L = storyLayout(cfg.timeline.length);
  // 벤치(6..7, h-4)와 같은 타일 행에 세우면 y정렬상 벤치가 나중에 그려져 다리를 가린다 → 앉은 것처럼 보임.
  // NPC는 충돌 검사를 하지 않으므로 solid 타일 위에 둘 수 있다.
  const groom = new Character({ sprites: characterSet(game.assets, 'groom', GROOM), name: displayName(cfg.groom), ...standPos(6, L.bench.ty) });
  const bride = new Character({ sprites: characterSet(game.assets, 'bride', BRIDE), name: displayName(cfg.bride), ...standPos(7, L.bench.ty) });
  const thanks = (c) => () => c.say('여기까지 와줘서 고마워요 💕');

  return new Scene({
    id: 'story', rows: L.rows, spawn: L.spawn, assets: game.assets,
    entrances: [{ ...L.exit, to: 'hub', spawn: HUB_DOORS.story.back }],
    objects: [
      { id: 'door', sprite: 'door', floor: true, ...L.exit },
      { id: 'bench', sprite: 'bench', ...L.bench },
      ...L.signs.map((s) => {
        const t = cfg.timeline[s.index];
        return { id: `sign${s.index}`, sprite: 'sign', tx: s.tx, ty: s.ty,
          interact: () => showOverlay(game, { title: `${t.icon ?? ''} ${t.year}`.trim(), html: `<p>${esc(t.text)}</p>` }) };
      }),
    ],
    npcs: [{ character: groom, interact: thanks(groom) }, { character: bride, interact: thanks(bride) }],
  });
}
