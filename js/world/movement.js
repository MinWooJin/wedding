export function dirOf(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

/**
 * pos에서 target 쪽으로 최대 dist만큼 이동. blocked(x,y)는 그 위치가 막혔는지.
 * x축, y축을 따로 시도해 벽을 따라 미끄러진다.
 * @returns {{x:number,y:number,dir:string,moved:boolean,arrived:boolean}}
 */
export function stepToward(pos, target, dist, blocked) {
  const dx = target.x - pos.x, dy = target.y - pos.y;
  const len = Math.hypot(dx, dy);
  const dir = dirOf(dx, dy);
  if (len === 0) return { x: pos.x, y: pos.y, dir, moved: false, arrived: true };

  const step = Math.min(dist, len);
  const nx = pos.x + (dx / len) * step;
  const ny = pos.y + (dy / len) * step;

  let x = pos.x, y = pos.y, moved = false;
  if (!blocked(nx, y)) { x = nx; moved = true; }
  if (!blocked(x, ny)) { y = ny; moved = true; }

  const remaining = Math.hypot(target.x - x, target.y - y);
  const arrived = !moved || remaining < 0.5;
  return { x, y, dir, moved, arrived };
}
