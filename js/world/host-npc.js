import { Character, standPos } from '../entities/character.js';
import { GROOM, BRIDE } from '../sprites/characters.js';
import { characterSet } from '../assets.js';
import { displayName } from '../config.js';

/** 개별 신랑/신부 그림을 재사용한다. 지나갈 수 있고, 누를 때마다 다음 대사를 말한다. */
export function makeHostNpc(game, side, position, lines) {
  const person = game.config[side];
  const character = new Character({ sprites: characterSet(game.assets, side, side === 'groom' ? GROOM : BRIDE), name: displayName(person), ...standPos(position.tx, position.ty) });
  let next = 0;
  return {
    character, host: true, solid: false,
    interact: () => {
      character.stop();
      character.say(lines[next++ % lines.length], 5);
    },
  };
}
