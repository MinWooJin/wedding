/**
 * 타일 격자 BFS(4방향). blocked(tx,ty)가 true면 통과 불가.
 * @returns {{tx:number,ty:number}[]|null} from 다음 칸부터 to까지의 타일 목록. from===to면 []. 경로 없으면 null.
 */
export function findPath(w, h, blocked, from, to) {
  const key = (t) => t.ty * w + t.tx;
  if (from.tx === to.tx && from.ty === to.ty) return [];
  if (to.tx < 0 || to.ty < 0 || to.tx >= w || to.ty >= h || blocked(to.tx, to.ty)) return null;
  const prev = new Map([[key(from), -1]]);
  const queue = [from];
  const dirs = [[0, 1], [0, -1], [-1, 0], [1, 0]];
  while (queue.length) {
    const cur = queue.shift();
    for (const [dx, dy] of dirs) {
      const n = { tx: cur.tx + dx, ty: cur.ty + dy };
      if (n.tx < 0 || n.ty < 0 || n.tx >= w || n.ty >= h) continue;
      const k = key(n);
      if (prev.has(k) || blocked(n.tx, n.ty)) continue;
      prev.set(k, key(cur));
      if (n.tx === to.tx && n.ty === to.ty) {
        const path = [];
        let at = k;
        while (at !== key(from)) { path.push({ tx: at % w, ty: Math.floor(at / w) }); at = prev.get(at); }
        return path.reverse();
      }
      queue.push(n);
    }
  }
  return null;
}

/** from에서 걸어서 닿을 수 있는 모든 타일(BFS). */
export function reachableTiles(w, h, blocked, from) {
  const seen = new Set([from.ty * w + from.tx]);
  const out = [from];
  for (let i = 0; i < out.length; i++) {
    const cur = out[i];
    for (const [dx, dy] of [[0, 1], [0, -1], [-1, 0], [1, 0]]) {
      const n = { tx: cur.tx + dx, ty: cur.ty + dy };
      if (n.tx < 0 || n.ty < 0 || n.tx >= w || n.ty >= h) continue;
      const k = n.ty * w + n.tx;
      if (seen.has(k) || blocked(n.tx, n.ty)) continue;
      seen.add(k); out.push(n);
    }
  }
  return out;
}

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
  if (nx !== x && !blocked(nx, y)) { x = nx; moved = true; }
  if (ny !== y && !blocked(x, ny)) { y = ny; moved = true; }

  const remaining = Math.hypot(target.x - x, target.y - y);
  const arrived = remaining < 0.5;
  return { x, y, dir, moved, arrived, blocked: !moved && !arrived };
}
