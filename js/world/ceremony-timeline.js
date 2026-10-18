// 예식 안내관 장면 연출. 시간 t(초)를 넣으면 그 순간의 장면 상태를 돌려주는 순수 함수라 테스트로 검증한다.
// 좌표는 예식홀 배경(352×288) 기준 발 위치. 그림 규격은 docs/ROUND10_ASSET_HANDOFF_2026-10-18.md.

export const HALL = { w: 352, h: 288 };
/** 단상 위 두 사람 발 위치(코덱스 권장값) */
export const STAGE = { groom: { x: 154, y: 168 }, bride: { x: 198, y: 168 } };
const AISLE_X = 176, ENTRY_Y = 330, AISLE_TOP_Y = 188;

/** 하객 좌석: 발 기준 y 4줄 × 좌우 4자리(코덱스 좌석 격자) */
export const SEATS = [200, 228, 256, 284].flatMap((y, row) =>
  [32, 60, 88, 116, 236, 264, 292, 320].map((x, col) => ({ x, y, person: (row * 5 + col * 7 + (col > 3 ? 3 : 0)) % 6 })));

/** 대사(장면 아래 DOM 대사 상자) */
export function lines(groomName, brideName) {
  return [
    [0, `${groomName} & ${brideName} 결혼식, 지금부터 시작합니다!!`],
    [3, '신랑 입장!'],
    [8, '신부 입장!'],
    [12.5, '두 사람이 서로에게 인사합니다.'],
    [16.5, '행진!'],
    [END_T, '와 주셔서 감사합니다 ♥'],
  ];
}

export const END_T = 23.5;

const G_IN = [{ x: AISLE_X, y: ENTRY_Y }, { x: AISLE_X, y: AISLE_TOP_Y }, STAGE.groom];
const B_IN = [{ x: AISLE_X, y: ENTRY_Y }, { x: AISLE_X, y: AISLE_TOP_Y }, STAGE.bride];
const G_OUT = [STAGE.groom, { x: 164, y: AISLE_TOP_Y + 4 }, { x: 164, y: ENTRY_Y }];
const B_OUT = [STAGE.bride, { x: 188, y: AISLE_TOP_Y + 4 }, { x: 188, y: ENTRY_Y }];

/** 꺾은선 경로를 t0~t1 동안 같은 속도로 걷는다 */
export function along(points, t0, t1, t) {
  const f = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
  const segs = points.slice(1).map((p, i) => ({ a: points[i], b: p, len: Math.hypot(p.x - points[i].x, p.y - points[i].y) }));
  let d = f * segs.reduce((s, g) => s + g.len, 0);
  for (const g of segs) {
    if (d <= g.len || g === segs[segs.length - 1]) {
      const k = g.len ? Math.min(1, d / g.len) : 1;
      return { x: Math.round(g.a.x + (g.b.x - g.a.x) * k), y: Math.round(g.a.y + (g.b.y - g.a.y) * k) };
    }
    d -= g.len;
  }
  return { ...points[points.length - 1] };
}

const walkFrame = (t) => Math.floor(t * 6.5) % 4;

/**
 * t초의 장면.
 * 인물: { x, y, kind: 'sheet'|'front', frame } (sheet: 예식 전용 8칸, front: 기존 정면 걷기 프레임 번호) 또는 null(화면에 없음)
 */
export function sceneAt(t, names = { groom: '신랑', bride: '신부' }) {
  const done = t >= END_T;
  const line = lines(names.groom, names.bride).filter(([s]) => t >= s).pop()[1];
  let groom = null, bride = null;

  // 신랑: 3~7.5초 입장(뒷모습), 이후 단상
  if (t >= 3 && t < 7.5) groom = { ...along(G_IN, 3, 7.5, t), kind: 'sheet', frame: walkFrame(t) };
  else if (t >= 7.5 && t < 17.5) groom = { ...STAGE.groom, kind: 'sheet', frame: 7 };
  // 신부: 8~12.5초 입장
  if (t >= 8 && t < 12.5) bride = { ...along(B_IN, 8, 12.5, t), kind: 'sheet', frame: walkFrame(t) };
  else if (t >= 12.5 && t < 17.5) bride = { ...STAGE.bride, kind: 'sheet', frame: 7 };
  // 12.5~16.5초 마주 보기, 13.5~15초 맞절
  if (t >= 12.5 && t < 16.5) {
    const f = t >= 13.5 && t < 15 ? 5 : 4;
    groom.frame = f; bride.frame = f;
  }
  // 17.5~22.5초 행진(정면으로 걸어 나옴)
  if (t >= 17.5 && t < 22.5) {
    groom = { ...along(G_OUT, 17.5, 22.5, t), kind: 'front', frame: walkFrame(t) };
    bride = { ...along(B_OUT, 17.5, 22.5, t), kind: 'front', frame: walkFrame(t + 0.07) };
  }
  // 마지막: 단상에서 정면 인사(신랑 손 들기, 신부 부케)
  if (done) { groom = { ...STAGE.groom, kind: 'sheet', frame: 6 }; bride = { ...STAGE.bride, kind: 'sheet', frame: 6 }; }

  const clap = (t >= 8 && t < 12.5) || (t >= 17.5 && t < 22.5);
  const hearts = t >= 14 && t < 16.5
    ? [0, 1, 2].map((i) => { const k = (t - 14 - i * 0.4) / 1.6; return k < 0 || k > 1 ? null : { x: 170 + i * 6 - 6, y: Math.round(100 - k * 40), alpha: 1 - k, frame: i % 2 }; }).filter(Boolean)
    : [];
  const petals = t >= 17.5 && t < END_T + 2
    ? Array.from({ length: 18 }, (_, i) => {
      const x = (i * 97 + 23) % HALL.w, speed = 38 + (i % 5) * 7;
      const y = Math.round(((t - 17.5) * speed + i * 31) % (HALL.h + 20)) - 12;
      return { x: Math.round(x + Math.sin(t * 2 + i) * 6), y, frame: i % 4 };
    })
    : [];
  return { t, done, line, groom, bride, clap, hearts, petals };
}

/** 하객 자세: 박수 중이면 자리마다 박자를 엇갈려 0/1 */
export function guestPose(seatIndex, t, clap) {
  return clap ? (Math.floor(t * 4 + seatIndex * 0.37) % 2) : 0;
}
