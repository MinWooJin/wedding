/** 캔버스 pointerdown→pointerup → onTap(cssX, cssY) (캔버스 기준 CSS px). 드래그/롱프레스는 무시. */
export function attachPointer(canvas, onTap) {
  let down = null;
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const quick = performance.now() - down.t < 500;
    down = null;
    if (moved > 12 || !quick) return;
    const r = canvas.getBoundingClientRect();
    onTap(e.clientX - r.left, e.clientY - r.top);
  });
  canvas.addEventListener('pointercancel', () => { down = null; });
}
