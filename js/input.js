/**
 * 캔버스 포인터 입력.
 *  - 짧게 누르고 떼면 onTap(cssX, cssY)
 *  - 12px 이상 움직이면 드래그: onDrag(dxCss, dyCss) (이동량), 떼면 onDragEnd()
 *  - 마우스 휠: onDrag(0, -deltaY)
 */
export function attachPointer(canvas, { onTap, onDrag, onDragEnd }) {
  let down = null;
  let dragging = false;
  canvas.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY, lastX: e.clientX, lastY: e.clientY, t: performance.now() };
    dragging = false;
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!down) return;
    if (!dragging && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 12) dragging = true;
    if (dragging) {
      onDrag?.(e.clientX - down.lastX, e.clientY - down.lastY);
      down.lastX = e.clientX; down.lastY = e.clientY;
    }
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const wasDragging = dragging;
    const quick = performance.now() - down.t < 500;
    down = null; dragging = false;
    if (wasDragging) { onDragEnd?.(); return; }
    if (!quick) return;
    const r = canvas.getBoundingClientRect();
    onTap?.(e.clientX - r.left, e.clientY - r.top);
  });
  canvas.addEventListener('pointercancel', () => { if (dragging) onDragEnd?.(); down = null; dragging = false; });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); onDrag?.(0, -e.deltaY); onDragEnd?.(); }, { passive: false });
}
