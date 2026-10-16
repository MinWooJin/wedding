# 픽셀 웨딩 청첩장 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 하객이 닉네임을 입력하고 픽셀 캐릭터를 골라 터치로 가든 웨딩 맵(허브 + 5개 방)을 탐험하는 모바일 청첩장을 GitHub Pages용 정적 사이트로 만든다.

**Architecture:** 바닐라 ES 모듈 + 단일 `<canvas>`. 게임 월드(타일맵·캐릭터·오브젝트)는 canvas에 내부 해상도 176px 폭으로 그린 뒤 정수 배율로 확대한다. 팝업·HUD·토스트는 DOM 오버레이. 모든 픽셀 아트는 문자열 배열 + 팔레트로 코드 안에 정의한다. 방명록만 Google Apps Script 웹앱(스프레드시트)에 저장한다.

**Tech Stack:** HTML/CSS/JavaScript(ES2022 모듈, 빌드 없음), Node 24 `node --test`(순수 로직 단위 테스트), Google Apps Script.

**Spec:** `docs/superpowers/specs/2026-10-16-pixel-wedding-invitation-design.md`

**규칙:**
- 원격 저장소 연결·push 금지. 로컬 커밋만 한다.
- `js/ui/*`, `js/renderer.js`, `js/input.js`, `js/game.js`, `js/main.js`만 DOM/canvas API를 호출한다. 그 외 모듈은 import 시 DOM에 접근하지 않아야 Node 테스트가 돈다(renderer.js는 함수 안에서만 DOM을 쓴다).
- 테스트 실행은 항상 프로젝트 루트 `C:\Users\alsdn\wedding`에서 `npm test`.
- 커밋 메시지 끝에 `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` 한 줄을 붙인다.
- 브라우저 확인은 `npm run serve`(포트 5173) 후 내장 브라우저로 `http://localhost:5173` 접속. 모바일 뷰포트 375×812.

---

## 파일 구조

| 경로 | 책임 |
|---|---|
| `index.html` | 캔버스, DOM 레이어(인트로/HUD/오버레이/토스트) 컨테이너, 모듈 스크립트 로드 |
| `css/style.css` | 폰 프레임 레이아웃, 픽셀 렌더링, 오버레이·토스트 스타일, 캡처 억제 CSS |
| `js/main.js` | 부팅: config 로드 → 프로필 확인 → 인트로 또는 게임 시작 |
| `js/game.js` | `Game` 클래스: 씬 레지스트리, 전환(페이드), 루프, 카메라, 입력 연결 |
| `js/renderer.js` | 캔버스 크기/배율 계산, 스프라이트→캔버스 캐시, 텍스트·말풍선 그리기 |
| `js/input.js` | 포인터 이벤트 → CSS 좌표 콜백 |
| `js/state.js` | localStorage 프로필(닉네임·캐릭터) 저장/로드 |
| `js/config.js` | 기본 config + `data/config.json` 병합, D-day 계산 |
| `js/api.js` | 방명록 입력 검증, Apps Script GET/POST |
| `js/sprites/palette.js` | 공용 색상 팔레트(문자→색) |
| `js/sprites/raster.js` | 문자열 배열 → 픽셀 그리드 파싱, 좌우 반전, 세로 결합 |
| `js/sprites/tiles.js` | 타일 정의(16×16), solid 집합 |
| `js/sprites/objects.js` | 오브젝트 스프라이트(아치, 나무, 우체통, 액자, 표지판, 벤치, 보관함, 책상 등) |
| `js/sprites/characters.js` | 캐릭터 템플릿(앞/뒤/옆, 다리 2프레임) + 프리셋 10종 + 신랑/신부 |
| `js/world/tilemap.js` | 맵 문자열 파싱, 타일 조회, 충돌 판정 |
| `js/world/movement.js` | 목표점으로 이동 스텝(축 분리 충돌) |
| `js/world/scene.js` | `Scene` 기본 클래스: 맵·오브젝트·입구·NPC·탭 처리·그리기 |
| `js/world/hub.js`, `info.js`, `gallery.js`, `story.js`, `guestbook.js`, `gifts.js` | 각 방 정의 |
| `js/world/gallery-layout.js` | 사진 수 → 맵 행/액자 좌표(순수 함수) |
| `js/world/guest-layout.js` | 방명록 목록 → 광장 하객 NPC 배치/정원 꽃 배치(순수 함수) |
| `js/entities/character.js` | 플레이어·NPC 공용: 위치, 방향, 프레임, 이름, 말풍선 |
| `js/ui/intro.js` | 닉네임 입력 + 캐릭터 선택 화면 |
| `js/ui/overlay.js` | 공용 DOM 팝업 |
| `js/ui/toast.js` | 토스트 |
| `js/ui/hud.js` | 상단 HUD(이름·날짜·D-day), "광장으로" 버튼 |
| `js/ui/viewer.js` | 갤러리 확대 뷰어(canvas 기반, 캡처 억제) |
| `data/config.json` | 신랑신부가 편집하는 텍스트 전부 |
| `gallery/manifest.json` | 사진 파일명 배열 |
| `apps-script/Code.gs` | `doGet`/`doPost` |
| `tests/*.test.js` | Node 단위 테스트 |
| `README.md` | 설정·배포·Apps Script 안내 |

좌표 규약: 타일 좌표 `(tx, ty)`, 월드 픽셀 좌표 `(x, y)` = 내부 해상도 픽셀. 캐릭터 위치 `(x, y)`는 **발 밑 중앙**. 스프라이트(16×24)는 `(x-8, y-24)`에 그린다. 충돌 박스는 `x-5, y-8, 10×8`.

---

### Task 1: 프로젝트 스캐폴드 + 렌더러 배율 계산

**Files:**
- Create: `package.json`, `.gitignore`, `index.html`, `css/style.css`, `js/renderer.js`, `tests/renderer.test.js`

- [ ] **Step 1: package.json, .gitignore 생성**

`package.json`:
```json
{
  "name": "pixel-wedding-invitation",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/",
    "serve": "npx --yes serve -l 5173 ."
  }
}
```

`.gitignore`:
```
node_modules/
.DS_Store
Thumbs.db
```

- [ ] **Step 2: 실패하는 테스트 작성** — `tests/renderer.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE, VIEW_TILES_W, computeViewport } from '../js/renderer.js';

test('기본 상수', () => {
  assert.equal(TILE, 16);
  assert.equal(VIEW_TILES_W, 11);
});

test('배율은 1~4 사이 정수, 뷰 폭은 항상 176px', () => {
  assert.deepEqual(computeViewport(390, 844), { scale: 2, width: 176, height: 422 });
  assert.deepEqual(computeViewport(430, 932), { scale: 2, width: 176, height: 466 });
  assert.deepEqual(computeViewport(1200, 900), { scale: 4, width: 176, height: 225 });
  assert.deepEqual(computeViewport(150, 300), { scale: 1, width: 176, height: 300 });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../js/renderer.js'`

- [ ] **Step 4: renderer.js 최소 구현(배율만)**

`js/renderer.js`:
```js
export const TILE = 16;
export const VIEW_TILES_W = 11;
export const VIEW_W = TILE * VIEW_TILES_W; // 176

/** 컨테이너 CSS 크기 → 정수 배율과 내부 해상도 */
export function computeViewport(cssW, cssH) {
  const scale = Math.max(1, Math.min(4, Math.floor(cssW / VIEW_W)));
  return { scale, width: VIEW_W, height: Math.ceil(cssH / scale) };
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test`
Expected: `# pass 2`

- [ ] **Step 6: index.html, style.css 작성**

`index.html`:
```html
<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>우리 결혼합니다</title>
<meta property="og:title" content="우리 결혼합니다">
<meta property="og:description" content="픽셀 가든에서 만나요">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/galmuri@latest/dist/galmuri.css">
<link rel="stylesheet" href="css/style.css">
</head>
<body>
<div id="frame">
  <canvas id="game"></canvas>
  <div id="hud" hidden></div>
  <div id="intro" hidden></div>
  <div id="overlay" hidden></div>
  <div id="toast" hidden></div>
</div>
<script type="module" src="js/main.js"></script>
</body>
</html>
```

`css/style.css`:
```css
:root {
  --bg: #1b2a1f;
  --paper: #fff8ec;
  --ink: #2b1d14;
  --accent: #ff7eb6;
  --font: 'Galmuri11', 'Galmuri9', system-ui, sans-serif;
}
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
html, body {
  margin: 0; height: 100%; background: var(--bg);
  font-family: var(--font); color: var(--ink);
  overscroll-behavior: none; -webkit-user-select: none; user-select: none;
  -webkit-touch-callout: none; touch-action: manipulation;
}
#frame {
  position: relative; margin: 0 auto; height: 100%;
  width: 100%; max-width: 430px; overflow: hidden; background: #000;
}
#game {
  display: block; width: 100%; height: 100%;
  image-rendering: pixelated; image-rendering: crisp-edges;
}
#hud, #intro, #overlay, #toast { position: absolute; left: 0; right: 0; }
#hud { top: 0; padding: calc(8px + env(safe-area-inset-top)) 12px 8px; color: #fff; text-shadow: 1px 1px 0 #000; font-size: 13px; display: flex; justify-content: space-between; align-items: center; pointer-events: none; }
#hud button { pointer-events: auto; }
#intro, #overlay { top: 0; bottom: 0; display: flex; align-items: center; justify-content: center; padding: 16px; }
#intro { background: #2d5a3a; }
#overlay { background: rgba(0,0,0,.6); }
#toast { bottom: calc(24px + env(safe-area-inset-bottom)); display: flex; justify-content: center; pointer-events: none; }
.card {
  background: var(--paper); border: 3px solid var(--ink); box-shadow: 4px 4px 0 var(--ink);
  padding: 16px; width: 100%; max-width: 360px; max-height: 90%; overflow: auto; font-size: 14px; line-height: 1.6;
}
.card h2 { margin: 0 0 8px; font-size: 18px; }
.card p { margin: 4px 0; }
.card .row { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
.card .muted { color: #7a6a5a; font-size: 12px; }
.btn {
  font-family: var(--font); font-size: 14px; padding: 8px 12px; cursor: pointer;
  background: #fff; color: var(--ink); border: 2px solid var(--ink); box-shadow: 2px 2px 0 var(--ink);
  text-decoration: none; display: inline-block;
}
.btn:active { transform: translate(2px, 2px); box-shadow: none; }
.btn.primary { background: var(--accent); }
.btn.ghost { background: transparent; color: #fff; border-color: #fff; box-shadow: 2px 2px 0 #fff; }
input, textarea {
  font-family: var(--font); font-size: 16px; width: 100%; padding: 8px;
  border: 2px solid var(--ink); background: #fff; -webkit-user-select: text; user-select: text;
}
.toast-msg { background: var(--ink); color: #fff; padding: 8px 14px; border: 2px solid #fff; font-size: 13px; }
.picker { display: flex; align-items: center; justify-content: center; gap: 12px; margin: 12px 0; }
.picker canvas { width: 96px; height: 144px; image-rendering: pixelated; background: #cfe8c3; border: 2px solid var(--ink); }
#viewer { position: absolute; inset: 0; background: #000; display: flex; align-items: center; justify-content: center; }
#viewer canvas { max-width: 100%; max-height: 100%; }
#viewer .close { position: absolute; top: calc(12px + env(safe-area-inset-top)); right: 12px; }
#viewer .counter { position: absolute; bottom: calc(16px + env(safe-area-inset-bottom)); color: #fff; font-size: 13px; }
[hidden] { display: none !important; }
```

- [ ] **Step 7: 커밋**

```bash
git add package.json .gitignore index.html css/style.css js/renderer.js tests/renderer.test.js
git commit -m "feat: scaffold project, viewport scale calculation

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: 스프라이트 래스터라이저 + 팔레트

**Files:**
- Create: `js/sprites/palette.js`, `js/sprites/raster.js`, `tests/raster.test.js`

- [ ] **Step 1: 실패하는 테스트** — `tests/raster.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSprite, flipX, stackY, mirrorRows } from '../js/sprites/raster.js';
import { PAL } from '../js/sprites/palette.js';

test('문자열 배열을 픽셀 그리드로 파싱한다', () => {
  const s = parseSprite(['.o', 'g.'], { '.': null, o: '#000', g: '#0f0' });
  assert.equal(s.w, 2);
  assert.equal(s.h, 2);
  assert.deepEqual(s.px, [[null, '#000'], ['#0f0', null]]);
});

test('팔레트에 없는 문자는 에러', () => {
  assert.throws(() => parseSprite(['x'], {}), /unknown palette char "x"/);
});

test('행 길이가 다르면 에러', () => {
  assert.throws(() => parseSprite(['..', '.'], { '.': null }), /row 1 length/);
});

test('flipX는 좌우 반전', () => {
  const s = parseSprite(['.o', 'g.'], { '.': null, o: '#000', g: '#0f0' });
  assert.deepEqual(flipX(s).px, [['#000', null], [null, '#0f0']]);
});

test('stackY는 세로로 이어붙인다', () => {
  const a = parseSprite(['oo'], { o: '#000' });
  const b = parseSprite(['..', '..'], { '.': null });
  const s = stackY(a, b);
  assert.equal(s.h, 3);
  assert.deepEqual(s.px[0], ['#000', '#000']);
});

test('mirrorRows는 왼쪽 절반을 받아 좌우 대칭 행을 만든다', () => {
  assert.deepEqual(mirrorRows(['.o', 'ab']), ['.oo.', 'abba']);
});

test('공용 팔레트는 투명과 외곽선을 포함', () => {
  assert.equal(PAL['.'], null);
  assert.match(PAL.o, /^#/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL — cannot find `js/sprites/raster.js`

- [ ] **Step 3: 구현**

`js/sprites/palette.js`:
```js
/** 공용 팔레트: 문자 → CSS 색. '.'은 투명. */
export const PAL = {
  '.': null,
  o: '#2b1d14', // 외곽선
  n: '#ffffff', // 흰색
  g: '#6abe30', G: '#4f9a2a', l: '#8ad15a', // 잔디
  d: '#c9a46a', D: '#a8864f',               // 흙길
  w: '#b5783f', W: '#7a4c23',               // 나무
  k: '#e8dcc6', K: '#bfae91',               // 벽
  s: '#9aa0a6', S: '#6f767d',               // 돌
  t: '#3e8e41', T: '#2c6b2f',               // 잎
  f: '#ff7eb6', y: '#ffd966', r: '#e74c3c', b: '#5dade2', p: '#b07cd6', // 꽃/포인트
  m: '#8d99ae', M: '#4a5568',               // 금속
  c: '#c0392b', C: '#8e2a21',               // 카펫
};
```

`js/sprites/raster.js`:
```js
/**
 * @typedef {{w:number,h:number,px:(string|null)[][]}} Sprite
 */

/** 문자열 배열 + 팔레트 → Sprite. 팔레트에 없는 문자/행 길이 불일치는 에러. */
export function parseSprite(rows, palette) {
  const w = rows[0].length;
  const px = rows.map((row, y) => {
    if (row.length !== w) throw new Error(`row ${y} length ${row.length} != ${w}`);
    return [...row].map((ch) => {
      if (!(ch in palette)) throw new Error(`unknown palette char "${ch}"`);
      return palette[ch];
    });
  });
  return { w, h: rows.length, px };
}

export function flipX(sprite) {
  return { w: sprite.w, h: sprite.h, px: sprite.px.map((row) => [...row].reverse()) };
}

/** 여러 Sprite를 세로로 이어붙인다(머리+다리 조합용). 폭이 같아야 한다. */
export function stackY(...sprites) {
  const w = sprites[0].w;
  for (const s of sprites) if (s.w !== w) throw new Error('stackY width mismatch');
  return { w, h: sprites.reduce((a, s) => a + s.h, 0), px: sprites.flatMap((s) => s.px) };
}

/** 왼쪽 절반 행들을 받아 좌우 대칭인 전체 행을 만든다(대칭 오브젝트 제작용). */
export function mirrorRows(halfRows) {
  return halfRows.map((r) => r + [...r].reverse().join(''));
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: `# pass 9`

- [ ] **Step 5: 커밋**

```bash
git add js/sprites/palette.js js/sprites/raster.js tests/raster.test.js
git commit -m "feat: sprite rasterizer and shared palette

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: 타일 정의

**Files:**
- Create: `js/sprites/tiles.js`, `tests/tiles.test.js`

- [ ] **Step 1: 실패하는 테스트** — `tests/tiles.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILES, SOLID_TILES, tileSprite } from '../js/sprites/tiles.js';

test('모든 타일은 16×16', () => {
  for (const id of Object.keys(TILES)) {
    const s = tileSprite(id);
    assert.equal(s.w, 16, `${id} width`);
    assert.equal(s.h, 16, `${id} height`);
  }
});

test('필수 타일 ID 존재', () => {
  for (const id of ['G', 'W', 'P', 'H', 'F', 'D', 'K', 'R', 'S', 'X']) assert.ok(TILES[id], id);
});

test('울타리/벽/산울타리/공백은 solid', () => {
  for (const id of ['H', 'F', 'K', 'X']) assert.ok(SOLID_TILES.has(id), id);
  for (const id of ['G', 'W', 'P', 'D', 'R', 'S']) assert.ok(!SOLID_TILES.has(id), id);
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test` → FAIL (module not found)

- [ ] **Step 3: 구현** — `js/sprites/tiles.js`

```js
import { PAL } from './palette.js';
import { parseSprite } from './raster.js';

/** 16×16을 한 문자로 채운 뒤 (x,y,ch) 점을 찍어 타일 행을 만든다. */
function fillTile(base, dots = []) {
  const rows = Array.from({ length: 16 }, () => Array(16).fill(base));
  for (const [x, y, ch] of dots) rows[y][x] = ch;
  return rows.map((r) => r.join(''));
}

/** 가로 판자 무늬(마루/돌바닥 공용): 4행마다 어두운 줄, 줄마다 다른 위치에 세로 틈. */
function plankTile(light, dark, seams) {
  return Array.from({ length: 16 }, (_, y) => {
    if (y % 4 === 3) return dark.repeat(16);
    const seam = seams[Math.floor(y / 4)];
    return light.repeat(seam) + dark + light.repeat(15 - seam);
  });
}

const GRASS_DOTS = [[2, 3, 'G'], [9, 1, 'l'], [13, 6, 'G'], [5, 10, 'l'], [11, 12, 'G'], [1, 14, 'l'], [7, 7, 'G']];
const FLOWER_DOTS = [
  [3, 4, 'f'], [4, 4, 'f'], [3, 5, 'f'], [4, 5, 'f'], [4, 6, 't'],
  [11, 9, 'y'], [12, 9, 'y'], [11, 10, 'y'], [12, 10, 'y'], [12, 11, 't'],
];

export const TILES = {
  // 야외
  G: fillTile('g', GRASS_DOTS),                       // 잔디
  W: fillTile('g', [...GRASS_DOTS, ...FLOWER_DOTS]),  // 꽃잔디
  P: fillTile('d', [[1, 2, 'D'], [6, 5, 'D'], [12, 3, 'D'], [3, 9, 'D'], [9, 11, 'D'], [14, 13, 'D'], [7, 14, 'D']]), // 흙길
  H: [ // 산울타리(solid)
    'tttTtttttTtttttt', 'tTtttTtttttTtttt', 'ttttttttTttttttT', 'TtttTtttttTttttt',
    'tttttttTtttttttT', 'ttTtttttttTttttt', 'tttttTttttttTttt', 'TttttttTtttttttt',
    'tttTtttttTtttttt', 'tTtttTtttttTtttt', 'ttttttttTttttttT', 'TtttTtttttTttttt',
    'tttttttTtttttttT', 'ttTtttttttTttttt', 'oooooooooooooooo', 'WWWWWWWWWWWWWWWW',
  ],
  F: [ // 울타리(solid)
    'gggggggggggggggg', 'googgggggggggoog', 'gowoggggggggowog', 'gowoggggggggowog',
    'oooooooooooooooo', 'owwwwwwwwwwwwwwo', 'oooooooooooooooo', 'gowoggggggggowog',
    'gowoggggggggowog', 'oooooooooooooooo', 'owwwwwwwwwwwwwwo', 'oooooooooooooooo',
    'gowoggggggggowog', 'googgggggggggoog', 'gggggggggggggggg', 'gggggggggggggggg',
  ],
  // 실내
  D: plankTile('w', 'W', [7, 3, 11, 5]),  // 마루
  K: [ // 벽(solid): 위는 벽지, 아래는 걸레받이
    'kkkkkkkkkkkkkkkk', 'kkkkkkkkkkkkkkkk', 'kkkkkkkkkkkkkkkk', 'kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkk', 'kkkkkkkkkkkkkkkk', 'kkkkkkkkkkkkkkkk', 'kkkkkkkkkkkkkkkk',
    'kkkkkkkkkkkkkkkk', 'kkkkkkkkkkkkkkkk', 'kkkkkkkkkkkkkkkk', 'KKKKKKKKKKKKKKKK',
    'oooooooooooooooo', 'WWWWWWWWWWWWWWWW', 'WWWWWWWWWWWWWWWW', 'oooooooooooooooo',
  ],
  R: fillTile('c', [[0, 0, 'C'], [15, 0, 'C'], [0, 15, 'C'], [15, 15, 'C'], [7, 7, 'y'], [8, 7, 'y'], [7, 8, 'y'], [8, 8, 'y']]), // 카펫
  S: plankTile('s', 'S', [8, 4, 12, 2]),  // 돌바닥
  X: fillTile('o'),                       // 공백(solid, 맵 밖)
};

export const SOLID_TILES = new Set(['H', 'F', 'K', 'X']);

const cache = new Map();
export function tileSprite(id) {
  if (!cache.has(id)) cache.set(id, parseSprite(TILES[id], PAL));
  return cache.get(id);
}
```

- [ ] **Step 4: 통과 확인** — `npm test` → `# pass 12`

- [ ] **Step 5: 커밋**

```bash
git add js/sprites/tiles.js tests/tiles.test.js
git commit -m "feat: tile sprites and solid set

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: 캐릭터 스프라이트 (템플릿 + 프리셋 10종)

**Files:**
- Create: `js/sprites/characters.js`, `tests/characters.test.js`

- [ ] **Step 1: 실패하는 테스트** — `tests/characters.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRESET_COUNT, makeCharacter, presetSprites, presetColors, GROOM, BRIDE } from '../js/sprites/characters.js';

test('프리셋은 10종', () => {
  assert.equal(PRESET_COUNT, 10);
});

test('각 프리셋은 4방향 × 2프레임, 16×24', () => {
  for (let i = 0; i < PRESET_COUNT; i++) {
    const s = presetSprites(i);
    for (const dir of ['down', 'up', 'left', 'right']) {
      assert.equal(s[dir].length, 2, `${i} ${dir} frames`);
      for (const f of s[dir]) {
        assert.equal(f.w, 16);
        assert.equal(f.h, 24);
      }
    }
  }
});

test('프리셋마다 색 조합이 다르다', () => {
  const keys = new Set();
  for (let i = 0; i < PRESET_COUNT; i++) {
    const c = presetColors(i);
    keys.add(`${c.hair}|${c.skin}|${c.cloth}`);
  }
  assert.equal(keys.size, PRESET_COUNT);
});

test('머리색과 옷색이 지정 위치에 칠해진다', () => {
  const f = presetSprites(3).down[0];
  const c = presetColors(3);
  assert.equal(f.px[3][7], c.hair);
  assert.equal(f.px[16][7], c.cloth);
  assert.equal(f.px[21][4], c.pants);
});

test('right는 left의 좌우 반전', () => {
  const s = presetSprites(0);
  assert.deepEqual(s.right[0].px[8], [...s.left[0].px[8]].reverse());
});

test('신랑·신부 스프라이트 존재', () => {
  assert.equal(GROOM.down[0].h, 24);
  assert.equal(BRIDE.down[0].h, 24);
});

test('makeCharacter는 임의 색을 받는다', () => {
  const s = makeCharacter({ hair: '#111', skin: '#eee', cloth: '#f00', pants: '#00f' });
  assert.equal(s.down[0].px[2][7], '#111');
});
```

- [ ] **Step 2: 실패 확인** — `npm test` → FAIL

- [ ] **Step 3: 구현** — `js/sprites/characters.js`

```js
import { parseSprite, flipX, stackY } from './raster.js';

// 팔레트 문자: o 외곽선, H 머리, S 피부, C 옷, P 바지, E 눈동자, n 흰자, f 볼터치, . 투명
// 머리+몸통 20행 + 다리 4행 = 24행, 폭 16.
const HEAD_BODY_DOWN = [
  '....oooooooo....',
  '..ooHHHHHHHHoo..',
  '.oHHHHHHHHHHHHo.',
  '.oHHHHHHHHHHHHo.',
  'oHHHHHHHHHHHHHHo',
  'oHHHSSSSSSSSHHHo',
  'oHHSSSSSSSSSSHHo',
  'oHSSSSSSSSSSSSHo',
  'oHSSnESSSSEnSSHo',
  'oHSSnESSSSEnSSHo',
  '.oSSSSSSSSSSSSo.',
  '.oSfSSSSSSSSfSo.',
  '..oSSSSooSSSSo..',
  '...ooSSSSSSoo...',
  '....oCCCCCCo....',
  '..ooCCCCCCCCoo..',
  '.oSCCCCCCCCCCSo.',
  '.oSCCCCCCCCCCSo.',
  '.oSoCCCCCCCCoSo.',
  '..ooCCCCCCCCoo..',
];
const HEAD_BODY_UP = [
  '....oooooooo....',
  '..ooHHHHHHHHoo..',
  '.oHHHHHHHHHHHHo.',
  '.oHHHHHHHHHHHHo.',
  'oHHHHHHHHHHHHHHo',
  'oHHHHHHHHHHHHHHo',
  'oHHHHHHHHHHHHHHo',
  'oHHHHHHHHHHHHHHo',
  'oHHHHHHHHHHHHHHo',
  'oHHHHHHHHHHHHHHo',
  '.oHHHHHHHHHHHHo.',
  '.oHHHHHHHHHHHHo.',
  '..oHHHHHHHHHHo..',
  '...ooSSSSSSoo...',
  '....oCCCCCCo....',
  '..ooCCCCCCCCoo..',
  '.oSCCCCCCCCCCSo.',
  '.oSCCCCCCCCCCSo.',
  '.oSoCCCCCCCCoSo.',
  '..ooCCCCCCCCoo..',
];
const HEAD_BODY_LEFT = [
  '....oooooooo....',
  '..ooHHHHHHHHoo..',
  '.oHHHHHHHHHHHHo.',
  '.oHHHHHHHHHHHHo.',
  'oHHHHHHHHHHHHHHo',
  'oHSSSSSSHHHHHHHo',
  'oSSSSSSSHHHHHHHo',
  'oSSSSSSSSHHHHHHo',
  'oSSnESSSSHHHHHHo',
  'oSSnESSSSHHHHHHo',
  '.oSSSSSSSSHHHHo.',
  '.oSfSSSSSSSHHHo.',
  '..oSSSSSSSHHHo..',
  '...ooSSSSSSoo...',
  '....oCCCCCCo....',
  '...ooCCCCCCoo...',
  '..oSCCCCCCCCCo..',
  '..oSCCCCCCCCCo..',
  '..ooCCCCCCCCCo..',
  '...oCCCCCCCCo...',
];
const LEGS_A = [
  '...oPPPooPPPo...',
  '...oPPPooPPPo...',
  '...oPPPooPPPo...',
  '...oooo..oooo...',
];
const LEGS_B = [
  '..oPPPo..oPPPo..',
  '..oPPPo..oPPPo..',
  '..oPPPo..oPPPo..',
  '..oooo....oooo..',
];

function palette({ hair, skin, cloth, pants }) {
  return { '.': null, o: '#2b1d14', H: hair, S: skin, C: cloth, P: pants, E: '#2b1d14', n: '#ffffff', f: '#f4a6b8' };
}

/**
 * @returns {{down:Sprite[],up:Sprite[],left:Sprite[],right:Sprite[]}}
 * 프레임 0 = idle 겸 걷기 A, 프레임 1 = 걷기 B
 */
export function makeCharacter(colors) {
  const pal = palette(colors);
  const frames = (body) => [
    stackY(parseSprite(body, pal), parseSprite(LEGS_A, pal)),
    stackY(parseSprite(body, pal), parseSprite(LEGS_B, pal)),
  ];
  const left = frames(HEAD_BODY_LEFT);
  return { down: frames(HEAD_BODY_DOWN), up: frames(HEAD_BODY_UP), left, right: left.map(flipX) };
}

const HAIR = ['#2b2b2b', '#5a3a1e', '#c98b3a', '#8e4a5b', '#3b5b8c'];
const SKIN = ['#f6d3b3', '#c58c5a'];
const CLOTH = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#e84393', '#34495e', '#f8f8f8'];
const PANTS = ['#2c3e50', '#4a3b2a', '#5d6d7e'];

export const PRESET_COUNT = 10;

export function presetColors(i) {
  return { hair: HAIR[i % 5], skin: SKIN[Math.floor(i / 5) % 2], cloth: CLOTH[i % CLOTH.length], pants: PANTS[i % 3] };
}

const presetCache = new Map();
export function presetSprites(i) {
  if (!presetCache.has(i)) presetCache.set(i, makeCharacter(presetColors(i)));
  return presetCache.get(i);
}

export const GROOM = makeCharacter({ hair: '#2b2b2b', skin: '#f6d3b3', cloth: '#1f2933', pants: '#1f2933' });
export const BRIDE = makeCharacter({ hair: '#5a3a1e', skin: '#f6d3b3', cloth: '#ffffff', pants: '#ffffff' });
```

- [ ] **Step 4: 통과 확인** — `npm test` → `# pass 19`

- [ ] **Step 5: 커밋**

```bash
git add js/sprites/characters.js tests/characters.test.js
git commit -m "feat: chibi character templates and 10 presets

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: 오브젝트 스프라이트

**Files:**
- Create: `js/sprites/objects.js`, `tests/objects.test.js`

- [ ] **Step 1: 실패하는 테스트** — `tests/objects.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OBJECTS, objectSprite } from '../js/sprites/objects.js';

test('필수 오브젝트가 있고 크기는 16의 배수', () => {
  const need = ['arch', 'tree', 'sign', 'mailbox', 'frame', 'bench', 'chest', 'desk', 'board', 'phone', 'calendar', 'mapframe', 'flower', 'stone', 'door'];
  for (const id of need) {
    assert.ok(OBJECTS[id], id);
    const s = objectSprite(id);
    assert.equal(s.w % 16, 0, `${id} w`);
    assert.equal(s.h % 16, 0, `${id} h`);
  }
});

test('아치는 48×32, 나무는 16×32, 벤치/책상은 32×16', () => {
  assert.deepEqual([objectSprite('arch').w, objectSprite('arch').h], [48, 32]);
  assert.deepEqual([objectSprite('tree').w, objectSprite('tree').h], [16, 32]);
  assert.deepEqual([objectSprite('bench').w, objectSprite('bench').h], [32, 16]);
  assert.deepEqual([objectSprite('desk').w, objectSprite('desk').h], [32, 16]);
});
```

- [ ] **Step 2: 실패 확인** — `npm test` → FAIL

- [ ] **Step 3: 구현** — `js/sprites/objects.js`

아치처럼 좌우 대칭인 것은 **왼쪽 절반(24자)만** 쓰고 `mirrorRows`로 펼친다. 모든 행 길이는 parseSprite가 검사한다.

```js
import { PAL } from './palette.js';
import { parseSprite, mirrorRows } from './raster.js';

const ARCH_HALF = [ // 24×32 왼쪽 절반
  '...........ooooooooooooo',
  '.........oottttfttttyttt',
  '.......oottttyttttttfttt',
  '......otttfttttttyttttt.',
  '.....otttttfttty........',
  '....ottyttttt...........',
  '...otttfttt.............',
  '..ottttytt..............',
  '..otfttt................',
  '.ottyttt................',
  '.otttttt................',
  'ottfttt.................',
  'otttttto................',
  'ottytto.................',
  'otttttto................',
  'otftttto................',
  'otttttto................',
  'otttttto................',
  'oWWWWo..................',
  'oWwwWo..................',
  'oWwwWo..................',
  'oWwwWo..................',
  'oWwwWo..................',
  'oWwwWo..................',
  'oWwwWo..................',
  'oWwwWo..................',
  'oWwwWo..................',
  'oWwwWo..................',
  'oWwwWo..................',
  'oWwwWo..................',
  'oWWWWo..................',
  'oooooo..................',
];

export const OBJECTS = {
  arch: mirrorRows(ARCH_HALF), // 48×32 꽃 아치(가운데 비어 있어 지나갈 수 있음)
  tree: [ // 16×32
    '......oooo......', '....ootttToo....', '...otttttttTo...', '..ottttTtttttTo.',
    '..otTtttttttTto.', '.otttttTttttttto', '.ottTtttttttttTo', 'otttttttTtttttto',
    'oTtttttttttTttto', 'otttTtttttttttto', 'ottttttttTttttTo', '.otTtttttttttto.',
    '.otttttTtttttto.', '..ottttttttTto..', '...ootttttooo...', '.....oWWWo......',
    '.....oWwWo......', '.....oWwWo......', '.....oWwWo......', '.....oWwWo......',
    '.....oWwWo......', '.....oWwWo......', '.....oWwWo......', '....ooWwWoo.....',
    '....oWWwWWo.....', '....ooooooo.....', '................', '................',
    '................', '................', '................', '................',
  ],
  sign: [ // 16×16 표지판
    '.oooooooooooooo.', 'owwwwwwwwwwwwwwo', 'owwyyywwwyyywwwo', 'owwwwwwwwwwwwwwo',
    'owwyyyyywwyywwwo', 'owwwwwwwwwwwwwwo', '.oooooooooooooo.', '......oWWo......',
    '......oWWo......', '......oWWo......', '......oWWo......', '......oWWo......',
    '......oWWo......', '......oWWo......', '.....ooWWoo.....', '.....oooooo.....',
  ],
  mailbox: [ // 16×16 우체통
    '....oooooooo....', '...orrrrrrrro...', '..orrrrrrrrrro..', '..orrrrnnrrrro..',
    '..orrrnnnnrrro..', '..orrrrnnrrrro..', '..orrrrrrrrrro..', '..orrrrrrrrrro..',
    '..oooooooooooo..', '......oWWo......', '......oWWo......', '......oWWo......',
    '......oWWo......', '......oWWo......', '.....ooWWoo.....', '.....oooooo.....',
  ],
  frame: [ // 16×16 액자(사진은 코드에서 안쪽 (3,3)~(12,10) 10×8에 그림)
    '................', '.oooooooooooooo.', '.oWWWWWWWWWWWWo.', '.oWkkkkkkkkkkWo.',
    '.oWkkkkkkkkkkWo.', '.oWkkkkkkkkkkWo.', '.oWkkkkkkkkkkWo.', '.oWkkkkkkkkkkWo.',
    '.oWkkkkkkkkkkWo.', '.oWkkkkkkkkkkWo.', '.oWkkkkkkkkkkWo.', '.oWWWWWWWWWWWWo.',
    '.oooooooooooooo.', '................', '................', '................',
  ],
  bench: mirrorRows([ // 32×16
    '................', '................', '................', '................',
    '..oooooooooooooo', '.oWwwwwwwwwwwwww', '.oWwwwwwwwwwwwww', '.ooooooooooooooo',
    '..oWWo..........', '..oWWo..........', '.oWwwwwwwwwwwwww', '.ooooooooooooooo',
    '..oWWo..........', '..oWWo..........', '..oooo..........', '................',
  ]),
  chest: [ // 16×16 보관함
    '................', '................', '..oooooooooooo..', '.oWWWWWWWWWWWWo.',
    '.oWwwwwwwwwwwWo.', '.oWwwwwwwwwwwWo.', '.oooooooooooooo.', '.oWwwwwyyywwwWo.',
    '.oWwwwwyoywwwWo.', '.oWwwwwyyywwwWo.', '.oWwwwwwwwwwwWo.', '.oWwwwwwwwwwwWo.',
    '.oWwwwwwwwwwwWo.', '.oooooooooooooo.', '................', '................',
  ],
  desk: mirrorRows([ // 32×16 안내 데스크
    '................', '................', '................', '................',
    'oooooooooooooooo', 'oWWWWWWWWWWWWWWW', 'oWwwwwwwwwwwwwww', 'oooooooooooooooo',
    'oWwwwwwwwwwwwwww', 'oWwwwwwwwwwwwwww', 'oWwwwwwwwwwwwwww', 'oWwwwwwwwwwwwwww',
    'oWwwwwwwwwwwwwww', 'oWwwwwwwwwwwwwww', 'oooooooooooooooo', '................',
  ]),
  board: [ // 16×16 게시판(벽걸이)
    '.oooooooooooooo.', 'oWWWWWWWWWWWWWWo', 'oWkkkkkkkkkkkkWo', 'oWkbbbkkkkbbbkWo',
    'oWkkkkkkkkkkkkWo', 'oWkrrrrrrkkkkkWo', 'oWkkkkkkkkkkkkWo', 'oWkyyyyykkyyykWo',
    'oWkkkkkkkkkkkkWo', 'oWkbbbbbbbbkkkWo', 'oWkkkkkkkkkkkkWo', 'oWWWWWWWWWWWWWWo',
    '.oooooooooooooo.', '................', '................', '................',
  ],
  phone: [ // 16×16 전화기
    '................', '................', '................', '......oooo......',
    '.....oMMMMo.....', '....oMmmmmMo....', '....oMmnnmMo....', '....oMmmmmMo....',
    '....oMMMMMMo....', '...oMMMMMMMMo...', '..oMMMMMMMMMMo..', '..oMmmmmmmmmMo..',
    '..oMMMMMMMMMMo..', '..oooooooooooo..', '................', '................',
  ],
  calendar: [ // 16×16 달력(벽걸이)
    '......o..o......', '.oooooooooooooo.', '.orrrrrrrrrrrro.', '.orrrrrrrrrrrro.',
    '.onnnnnnnnnnnno.', '.onononononnnno.', '.onnnnnnnnnnnno.', '.onononononnnno.',
    '.onnnnnnnnnnnno.', '.ononononrnnnno.', '.onnnnnnnnnnnno.', '.oooooooooooooo.',
    '................', '................', '................', '................',
  ],
  mapframe: [ // 16×16 지도 액자(벽걸이)
    '.oooooooooooooo.', '.oWWWWWWWWWWWWo.', '.oWbbbbbbbbbbWo.', '.oWbbggbbbggbWo.',
    '.oWbgggbbbgggWo.', '.oWbgggggggggWo.', '.oWbbggdddggbWo.', '.oWbbbgdrdgbbWo.',
    '.oWbbbggdggbbWo.', '.oWbbbbgggbbbWo.', '.oWbbbbbbbbbbWo.', '.oWWWWWWWWWWWWo.',
    '.oooooooooooooo.', '................', '................', '................',
  ],
  flower: [ // 16×16 방명록 꽃
    '................', '................', '................', '......off.......',
    '.....offff......', '.....ofyff......', '.....offff......', '......off.......',
    '.......t........', '.......t.t......', '......ttt.......', '.......t........',
    '.......t........', '................', '................', '................',
  ],
  stone: [ // 16×16 공유 비석
    '................', '.....oooooo.....', '....ossssssso...', '...ossSsssSso...',
    '...osssssssso...', '...ossyyyyyso...', '...osssssssso...', '...osSsssssSo...',
    '...osssssssso...', '...osssssssso...', '..oosssssssoo...', '..oSSSSSSSSSSo..',
    '..oooooooooooo..', '................', '................', '................',
  ],
  door: [ // 16×16 출입구(바닥 표시)
    'oooooooooooooooo', 'oyyyyyyyyyyyyyyo', 'oyddddddddddddyo', 'oyddddddddddddyo',
    'oyddddddddddddyo', 'oyddddddddddddyo', 'oyddddddddddddyo', 'oyddddddddddddyo',
    'oyddddddddddddyo', 'oyddddddddddddyo', 'oyddddddddddddyo', 'oyddddddddddddyo',
    'oyddddddddddddyo', 'oyddddddddddddyo', 'oyyyyyyyyyyyyyyo', 'oooooooooooooooo',
  ],
};

const cache = new Map();
export function objectSprite(id) {
  if (!cache.has(id)) cache.set(id, parseSprite(OBJECTS[id], PAL));
  return cache.get(id);
}
```

- [ ] **Step 4: 통과 확인** — `npm test` → `# pass 21`. 행 길이 에러가 나면 해당 행의 글자 수를 세어 16/24/32로 맞춘다.

- [ ] **Step 5: 커밋**

```bash
git add js/sprites/objects.js tests/objects.test.js
git commit -m "feat: object sprites (arch, tree, sign, mailbox, frame, ...)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: 타일맵 파싱 + 충돌 판정

**Files:**
- Create: `js/world/tilemap.js`, `tests/tilemap.test.js`

- [ ] **Step 1: 실패하는 테스트** — `tests/tilemap.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMap, tileAt, rectBlocked } from '../js/world/tilemap.js';

const map = parseMap([
  'HHHH',
  'HGPH',
  'HGGH',
  'HHHH',
]);

test('parseMap은 폭·높이·행을 돌려준다', () => {
  assert.equal(map.w, 4);
  assert.equal(map.h, 4);
  assert.equal(map.rows[1], 'HGPH');
});

test('행 길이가 다르면 에러', () => {
  assert.throws(() => parseMap(['GG', 'G']), /map row 1/);
});

test('tileAt은 맵 밖을 X로 취급', () => {
  assert.equal(tileAt(map, 1, 1), 'G');
  assert.equal(tileAt(map, 2, 1), 'P');
  assert.equal(tileAt(map, -1, 0), 'X');
  assert.equal(tileAt(map, 0, 99), 'X');
});

test('rectBlocked: 잔디 위 박스는 통과, 울타리에 걸치면 막힘', () => {
  const extra = new Set();
  // 타일 (1,1)~(2,2) 안쪽: x 16..47, y 16..47
  assert.equal(rectBlocked(map, 20, 20, 10, 8, extra), false);
  assert.equal(rectBlocked(map, 10, 20, 10, 8, extra), true);   // x 10..19 → 타일 0 (H)
  assert.equal(rectBlocked(map, 20, 44, 10, 8, extra), true);   // y 44..51 → 타일 3 (H)
});

test('rectBlocked: 추가 solid 타일(오브젝트 발자국)도 막는다', () => {
  const extra = new Set(['2,2']);
  assert.equal(rectBlocked(map, 36, 36, 10, 8, extra), true);
  assert.equal(rectBlocked(map, 18, 36, 10, 8, extra), false);
});
```

- [ ] **Step 2: 실패 확인** — `npm test` → FAIL

- [ ] **Step 3: 구현** — `js/world/tilemap.js`

```js
import { TILE } from '../renderer.js';
import { SOLID_TILES } from '../sprites/tiles.js';

/** 문자열 배열 → {w,h,rows}. 각 문자는 tiles.js의 타일 ID. */
export function parseMap(rows) {
  const w = rows[0].length;
  rows.forEach((r, y) => {
    if (r.length !== w) throw new Error(`map row ${y} length ${r.length} != ${w}`);
  });
  return { w, h: rows.length, rows };
}

export function tileAt(map, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h) return 'X';
  return map.rows[ty][tx];
}

export function tileKey(tx, ty) {
  return `${tx},${ty}`;
}

/** 월드 픽셀 사각형이 solid 타일 또는 extraSolid("tx,ty" 집합)에 걸치는지 */
export function rectBlocked(map, x, y, w, h, extraSolid) {
  const x0 = Math.floor(x / TILE), x1 = Math.floor((x + w - 1) / TILE);
  const y0 = Math.floor(y / TILE), y1 = Math.floor((y + h - 1) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (SOLID_TILES.has(tileAt(map, tx, ty))) return true;
      if (extraSolid.has(tileKey(tx, ty))) return true;
    }
  }
  return false;
}
```

- [ ] **Step 4: 통과 확인** — `npm test` → `# pass 26`

- [ ] **Step 5: 커밋**

```bash
git add js/world/tilemap.js tests/tilemap.test.js
git commit -m "feat: tilemap parsing and rect collision

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: 이동 스텝 (목표점 이동 + 축 분리 충돌)

**Files:**
- Create: `js/world/movement.js`, `tests/movement.test.js`

- [ ] **Step 1: 실패하는 테스트** — `tests/movement.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepToward, dirOf } from '../js/world/movement.js';

const free = () => false;

test('dirOf: 큰 축 기준 4방향', () => {
  assert.equal(dirOf(5, 1), 'right');
  assert.equal(dirOf(-5, 1), 'left');
  assert.equal(dirOf(1, 5), 'down');
  assert.equal(dirOf(1, -5), 'up');
});

test('목표까지 거리가 스텝보다 작으면 바로 도착', () => {
  const r = stepToward({ x: 0, y: 0 }, { x: 1, y: 0 }, 5, free);
  assert.deepEqual([r.x, r.y], [1, 0]);
  assert.equal(r.arrived, true);
  assert.equal(r.moved, true);
});

test('스텝 거리만큼 목표 방향으로 이동', () => {
  const r = stepToward({ x: 0, y: 0 }, { x: 30, y: 40 }, 5, free);
  assert.ok(Math.abs(r.x - 3) < 1e-9);
  assert.ok(Math.abs(r.y - 4) < 1e-9);
  assert.equal(r.arrived, false);
  assert.equal(r.dir, 'down');
});

test('x축이 막히면 y축으로만 미끄러진다', () => {
  const blocked = (x) => x > 0.5; // x가 늘어나면 막힘
  const r = stepToward({ x: 0, y: 0 }, { x: 30, y: 40 }, 5, blocked);
  assert.equal(r.x, 0);
  assert.ok(Math.abs(r.y - 4) < 1e-9);
  assert.equal(r.moved, true);
  assert.equal(r.arrived, false);
});

test('양 축 모두 막히면 그 자리에서 도착 처리(멈춤)', () => {
  const r = stepToward({ x: 0, y: 0 }, { x: 30, y: 40 }, 5, () => true);
  assert.deepEqual([r.x, r.y], [0, 0]);
  assert.equal(r.moved, false);
  assert.equal(r.arrived, true);
});
```

- [ ] **Step 2: 실패 확인** — `npm test` → FAIL

- [ ] **Step 3: 구현** — `js/world/movement.js`

```js
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
```

- [ ] **Step 4: 통과 확인** — `npm test` → `# pass 31`

- [ ] **Step 5: 커밋**

```bash
git add js/world/movement.js tests/movement.test.js
git commit -m "feat: step-toward movement with axis-separated collision

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: 캐릭터 엔티티

**Files:**
- Create: `js/entities/character.js`, `tests/character.test.js`

- [ ] **Step 1: 실패하는 테스트** — `tests/character.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Character, SPEED } from '../js/entities/character.js';
import { presetSprites } from '../js/sprites/characters.js';

const mk = () => new Character({ sprites: presetSprites(0), name: '민우', x: 100, y: 100 });

test('기본 상태: 아래를 보고 정지', () => {
  const c = mk();
  assert.equal(c.dir, 'down');
  assert.equal(c.target, null);
  assert.equal(c.sprite().h, 24);
});

test('충돌 박스는 발 밑 중앙 기준 10×8', () => {
  assert.deepEqual(mk().box(), { x: 95, y: 92, w: 10, h: 8 });
});

test('target이 있으면 update로 이동하고 방향이 바뀐다', () => {
  const c = mk();
  c.moveTo(160, 100);
  c.update(0.1, () => false);
  assert.ok(c.x > 100);
  assert.equal(c.dir, 'right');
  assert.ok(Math.abs(c.x - (100 + SPEED * 0.1)) < 1e-9);
});

test('도착하면 target이 null이 되고 onArrive가 한 번 호출된다', () => {
  const c = mk();
  let n = 0;
  c.moveTo(101, 100, () => n++);
  c.update(1, () => false);
  assert.equal(c.target, null);
  assert.equal(n, 1);
  c.update(1, () => false);
  assert.equal(n, 1);
});

test('걷는 동안 프레임이 0/1을 오간다', () => {
  const c = mk();
  c.moveTo(1000, 100);
  const seen = new Set();
  for (let i = 0; i < 10; i++) { c.update(0.1, () => false); seen.add(c.frame); }
  assert.deepEqual([...seen].sort(), [0, 1]);
});

test('say는 말풍선을 설정하고 시간이 지나면 사라진다', () => {
  const c = mk();
  c.say('축하해요', 1);
  assert.equal(c.bubble, '축하해요');
  c.update(0.5, () => false);
  assert.equal(c.bubble, '축하해요');
  c.update(0.6, () => false);
  assert.equal(c.bubble, null);
});
```

- [ ] **Step 2: 실패 확인** — `npm test` → FAIL

- [ ] **Step 3: 구현** — `js/entities/character.js`

```js
import { stepToward } from '../world/movement.js';

export const SPEED = 60; // px/s (내부 해상도 기준)
const FRAME_TIME = 0.18;

export class Character {
  /** @param {{sprites:object,name:string,x:number,y:number}} o  x,y는 발 밑 중앙 */
  constructor({ sprites, name, x, y }) {
    this.sprites = sprites;
    this.name = name;
    this.x = x; this.y = y;
    this.dir = 'down';
    this.frame = 0;
    this.animT = 0;
    this.target = null;
    this.onArrive = null;
    this.bubble = null;
    this.bubbleT = 0;
  }

  box() { return { x: this.x - 5, y: this.y - 8, w: 10, h: 8 }; }

  moveTo(x, y, onArrive = null) {
    this.target = { x, y };
    this.onArrive = onArrive;
  }

  stop() { this.target = null; this.onArrive = null; this.frame = 0; }

  say(text, seconds = 3) { this.bubble = text; this.bubbleT = seconds; }

  /** blockedAt(x,y): 발 위치가 (x,y)일 때 충돌 박스가 막히는지 */
  update(dt, blockedAt) {
    if (this.bubble) { this.bubbleT -= dt; if (this.bubbleT <= 0) this.bubble = null; }
    if (!this.target) return;
    const r = stepToward(this, this.target, SPEED * dt, blockedAt);
    this.x = r.x; this.y = r.y; this.dir = r.dir;
    if (r.moved) {
      this.animT += dt;
      if (this.animT >= FRAME_TIME) { this.animT = 0; this.frame = this.frame ? 0 : 1; }
    }
    if (r.arrived) {
      const cb = this.onArrive;
      this.stop();
      if (cb) cb();
    }
  }

  sprite() { return this.sprites[this.dir][this.target ? this.frame : 0]; }

  /** 스프라이트 좌상단 */
  drawPos() { return { x: Math.round(this.x) - 8, y: Math.round(this.y) - 24 }; }
}
```

- [ ] **Step 4: 통과 확인** — `npm test` → `# pass 37`

- [ ] **Step 5: 커밋**

```bash
git add js/entities/character.js tests/character.test.js
git commit -m "feat: character entity with movement, animation, speech bubble

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Scene 기본 클래스

**Files:**
- Create: `js/world/scene.js`, `tests/scene.test.js`

Scene은 DOM을 모른다. 그리기는 `draw(r)`에서 renderer 객체(Task 10)의 메서드만 호출하므로 테스트에서는 가짜 renderer를 넘긴다.

- [ ] **Step 1: 실패하는 테스트** — `tests/scene.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scene } from '../js/world/scene.js';
import { Character } from '../js/entities/character.js';
import { presetSprites, GROOM } from '../js/sprites/characters.js';

function makeScene(extra = {}) {
  return new Scene({
    id: 't',
    rows: [
      'HHHHHHH',
      'HGGGGGH',
      'HGGGGGH',
      'HGGGGGH',
      'HGGGGGH',
      'HHHPHHH',
    ],
    spawn: { tx: 3, ty: 2 },
    entrances: [{ tx: 3, ty: 5, to: 'hub', spawn: { tx: 1, ty: 1 } }],
    ...extra,
  });
}
const player = () => new Character({ sprites: presetSprites(0), name: 'me', x: 0, y: 0 });

test('enter는 플레이어를 spawn 타일 중앙 하단에 놓는다', () => {
  const s = makeScene(); const p = player();
  s.enter(p);
  assert.deepEqual([p.x, p.y], [3 * 16 + 8, 2 * 16 + 14]);
});

test('enter에 spawn을 주면 그 타일을 쓴다', () => {
  const s = makeScene(); const p = player();
  s.enter(p, { tx: 1, ty: 1 });
  assert.deepEqual([p.x, p.y], [24, 30]);
});

test('오브젝트 발자국은 solid, solid:false면 통과', () => {
  const s = makeScene({ objects: [
    { id: 'a', sprite: 'tree', tx: 1, ty: 1 },                 // 16×32 → 발자국은 (1,2)
    { id: 'b', sprite: 'arch', tx: 2, ty: 1, solid: false },
  ] });
  assert.ok(s.extraSolid.has('1,2'));
  assert.ok(!s.extraSolid.has('1,1'));
  assert.ok(!s.extraSolid.has('2,2'));
});

test('빈 곳을 탭하면 플레이어가 그쪽으로 이동 목표를 잡는다', () => {
  const s = makeScene(); const p = player(); s.enter(p);
  const game = { player: p, goTo: () => {} };
  s.onTap(40, 60, game);
  assert.deepEqual(p.target, { x: 40, y: 60 });
});

test('오브젝트를 탭하면 앞 타일로 이동한 뒤 interact(game)가 호출된다', () => {
  let hit = 0;
  const s = makeScene({ objects: [{ id: 'm', sprite: 'mailbox', tx: 3, ty: 1, interact: () => hit++ }] });
  const p = player(); s.enter(p, { tx: 3, ty: 4 });
  const game = { player: p, goTo: () => {} };
  s.onTap(3 * 16 + 8, 1 * 16 + 8, game);          // 우체통 스프라이트 안
  assert.deepEqual(p.target, { x: 56, y: 2 * 16 + 14 }); // 바로 아래 타일 (3,2)
  assert.equal(hit, 0, '도착 전에는 호출되지 않음');
  for (let i = 0; i < 20; i++) s.update(0.1, game);
  assert.equal(hit, 1);
});

test('stand를 지정한 오브젝트는 그 타일로 이동한다(갤러리 액자용)', () => {
  const s = makeScene({ objects: [{ id: 'f', sprite: 'frame', tx: 1, ty: 2, stand: { tx: 2, ty: 2 }, interact: () => {} }] });
  const p = player(); s.enter(p, { tx: 5, ty: 4 });
  s.onTap(1 * 16 + 8, 2 * 16 + 8, { player: p, goTo: () => {} });
  assert.deepEqual(p.target, { x: 2 * 16 + 8, y: 2 * 16 + 14 });
});

test('floor 오브젝트는 solid가 아니고 캐릭터보다 먼저 그려진다', () => {
  const s = makeScene({ objects: [{ id: 'd', sprite: 'door', tx: 3, ty: 2, floor: true }] });
  assert.ok(!s.extraSolid.has('3,2'));
  const p = player(); s.enter(p);
  const log = [];
  s.draw({ drawTile: () => {}, drawSprite: (spr) => log.push(spr.h), drawNameTag: () => {}, drawBubble: () => {} }, p);
  assert.deepEqual(log, [16, 24]); // 문(16) 먼저, 캐릭터(24) 나중
});

test('입구 타일을 밟으면 game.goTo가 호출된다', () => {
  const s = makeScene(); const p = player(); s.enter(p, { tx: 3, ty: 4 });
  const calls = [];
  const game = { player: p, goTo: (to, spawn) => calls.push([to, spawn]) };
  p.moveTo(56, 5 * 16 + 8);
  for (let i = 0; i < 20; i++) s.update(0.1, game);
  assert.deepEqual(calls[0], ['hub', { tx: 1, ty: 1 }]);
  assert.equal(calls.length, 1, '입구는 한 번만 발동');
});

test('NPC는 solid이며 탭하면 interact가 호출된다', () => {
  let hit = 0;
  const npc = new Character({ sprites: GROOM, name: '신랑', x: 56, y: 30 });
  const s = makeScene({ npcs: [{ character: npc, interact: () => hit++ }] });
  const p = player(); s.enter(p, { tx: 3, ty: 3 });
  const game = { player: p, goTo: () => {} };
  assert.ok(s.extraSolid.has('3,1'));
  s.onTap(56, 20, game);
  for (let i = 0; i < 20; i++) s.update(0.1, game);
  assert.equal(hit, 1);
});

test('draw는 타일 → y정렬 드로어블 → 말풍선 순으로 renderer를 호출한다', () => {
  const s = makeScene({ objects: [{ id: 'm', sprite: 'mailbox', tx: 3, ty: 1 }] });
  const p = player(); s.enter(p); p.say('hi');
  const log = [];
  const r = {
    drawTile: (id) => log.push(`tile:${id}`),
    drawSprite: () => log.push('sprite'),
    drawNameTag: () => log.push('tag'),
    drawBubble: () => log.push('bubble'),
  };
  s.draw(r, p);
  assert.equal(log.filter((l) => l.startsWith('tile:')).length, 7 * 6);
  assert.equal(log.filter((l) => l === 'sprite').length, 2);
  assert.ok(log.indexOf('bubble') > log.lastIndexOf('sprite'));
});
```

- [ ] **Step 2: 실패 확인** — `npm test` → FAIL

- [ ] **Step 3: 구현** — `js/world/scene.js`

```js
import { TILE } from '../renderer.js';
import { parseMap, tileAt, rectBlocked, tileKey } from './tilemap.js';
import { objectSprite } from '../sprites/objects.js';

const INTERACT_DIST = 26; // px: 이 거리 안이면 이동 없이 바로 상호작용

/** 타일 (tx,ty)에 서 있을 때의 발 위치 */
export function standPos(tx, ty) {
  return { x: tx * TILE + 8, y: ty * TILE + 14 };
}

/**
 * @typedef {{id:string, sprite:string, tx:number, ty:number, solid?:boolean, floor?:boolean,
 *            stand?:{tx:number,ty:number}, interact?:(game)=>void}} SceneObject
 *   sprite: objects.js의 ID. 발자국 = 스프라이트 맨 아래 타일 행 전체(solid 기본 true).
 *   floor: 바닥 장식(문 등). solid 아님, 캐릭터보다 먼저 그림. stand: 상호작용 시 설 타일(기본은 바로 아래/위).
 * @typedef {{tx:number, ty:number, to:string, spawn:{tx:number,ty:number}}} Entrance
 * @typedef {{character:Character, interact?:(game)=>void}} Npc
 */
export class Scene {
  constructor({ id, rows, spawn, objects = [], entrances = [], npcs = [], bg = '#1b2a1f', onEnter = null }) {
    this.id = id;
    this.map = parseMap(rows);
    this.spawn = spawn;
    this.objects = objects.map((o) => ({ solid: !o.floor, ...o, spr: objectSprite(o.sprite) }));
    this.entrances = entrances;
    this.npcs = npcs;
    this.bg = bg;
    this.onEnter = onEnter;
    this.pending = null;      // 도착 후 실행할 상호작용
    this.onEntrance = false;  // 입구 재발동 방지
    this.rebuildSolid();
  }

  rebuildSolid() {
    this.extraSolid = new Set();
    for (const o of this.objects) {
      if (!o.solid) continue;
      const wTiles = o.spr.w / TILE, footY = o.ty + o.spr.h / TILE - 1;
      for (let i = 0; i < wTiles; i++) this.extraSolid.add(tileKey(o.tx + i, footY));
    }
    for (const n of this.npcs) {
      const c = n.character;
      this.extraSolid.add(tileKey(Math.floor(c.x / TILE), Math.floor((c.y - 1) / TILE)));
    }
  }

  get pixelW() { return this.map.w * TILE; }
  get pixelH() { return this.map.h * TILE; }

  enter(player, spawn = this.spawn, game = null) {
    const p = standPos(spawn.tx, spawn.ty);
    player.x = p.x; player.y = p.y; player.dir = 'down';
    player.stop();
    this.pending = null;
    this.onEntrance = this.entranceAt(player) !== null;
    if (this.onEnter && game) this.onEnter(game);
  }

  blockedFor(player) {
    return (x, y) => {
      const b = { x: x - 5, y: y - 8, w: 10, h: 8 };
      return rectBlocked(this.map, b.x, b.y, b.w, b.h, this.extraSolid);
    };
  }

  entranceAt(player) {
    const tx = Math.floor(player.x / TILE), ty = Math.floor((player.y - 1) / TILE);
    return this.entrances.find((e) => e.tx === tx && e.ty === ty) ?? null;
  }

  /** 오브젝트/NPC 앞에 설 타일: 바로 아래가 비어 있으면 아래, 아니면 위 */
  standTileFor(tx, footY, wTiles = 1) {
    const cx = tx + Math.floor((wTiles - 1) / 2);
    const below = { tx: cx, ty: footY + 1 };
    if (!this.isSolidTile(below.tx, below.ty)) return below;
    return { tx: cx, ty: footY - 1 };
  }

  isSolidTile(tx, ty) {
    return rectBlocked(this.map, tx * TILE, ty * TILE, TILE, TILE, this.extraSolid);
  }

  hitObject(wx, wy) {
    for (let i = this.objects.length - 1; i >= 0; i--) {
      const o = this.objects[i];
      const x0 = o.tx * TILE, y0 = o.ty * TILE;
      if (wx >= x0 && wx < x0 + o.spr.w && wy >= y0 && wy < y0 + o.spr.h) return o;
    }
    return null;
  }

  hitNpc(wx, wy) {
    return this.npcs.find((n) => {
      const p = n.character.drawPos();
      return wx >= p.x && wx < p.x + 16 && wy >= p.y && wy < p.y + 24;
    }) ?? null;
  }

  onTap(wx, wy, game) {
    const player = game.player;
    const npc = this.hitNpc(wx, wy);
    const obj = npc ? null : this.hitObject(wx, wy);
    const target = npc ?? obj;
    if (target && target.interact) {
      const c = npc ? npc.character : null;
      const tx = c ? Math.floor(c.x / TILE) : obj.tx;
      const footY = c ? Math.floor((c.y - 1) / TILE) : obj.ty + obj.spr.h / TILE - 1;
      const wTiles = c ? 1 : obj.spr.w / TILE;
      const st = (obj && obj.stand) ? obj.stand : this.standTileFor(tx, footY, wTiles);
      const stand = standPos(st.tx, st.ty);
      if (Math.hypot(stand.x - player.x, stand.y - player.y) < INTERACT_DIST) {
        player.stop();
        this.face(player, c ? c.x : obj.tx * TILE + obj.spr.w / 2, c ? c.y : footY * TILE + 8);
        target.interact(game);
        return;
      }
      this.pending = target;
      player.moveTo(stand.x, stand.y, () => {
        if (this.pending !== target) return;
        this.pending = null;
        this.face(player, c ? c.x : obj.tx * TILE + obj.spr.w / 2, c ? c.y : footY * TILE + 8);
        target.interact(game);
      });
      return;
    }
    this.pending = null;
    const x = Math.max(8, Math.min(this.pixelW - 8, wx));
    const y = Math.max(16, Math.min(this.pixelH - 2, wy));
    player.moveTo(x, y);
  }

  face(player, x, y) {
    const dx = x - player.x, dy = y - player.y;
    player.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  }

  update(dt, game) {
    const player = game.player;
    player.update(dt, this.blockedFor(player));
    for (const n of this.npcs) n.character.update(dt, () => true);
    const e = this.entranceAt(player);
    if (e && !this.onEntrance) {
      this.onEntrance = true;
      player.stop();
      game.goTo(e.to, e.spawn);
    } else if (!e) {
      this.onEntrance = false;
    }
  }

  /** @param r renderer: drawTile(id,x,y), drawSprite(spr,x,y), drawNameTag(text,cx,topY), drawBubble(text,cx,topY) */
  draw(r, player) {
    for (let ty = 0; ty < this.map.h; ty++) {
      for (let tx = 0; tx < this.map.w; tx++) r.drawTile(tileAt(this.map, tx, ty), tx * TILE, ty * TILE);
    }
    for (const o of this.objects) if (o.floor) r.drawSprite(o.spr, o.tx * TILE, o.ty * TILE);
    const items = [];
    for (const o of this.objects) if (!o.floor) items.push({ y: o.ty * TILE + o.spr.h, draw: () => r.drawSprite(o.spr, o.tx * TILE, o.ty * TILE) });
    const chars = [player, ...this.npcs.map((n) => n.character)];
    for (const c of chars) {
      const p = c.drawPos();
      items.push({ y: c.y, draw: () => { r.drawSprite(c.sprite(), p.x, p.y); r.drawNameTag(c.name, p.x + 8, p.y - 2); } });
    }
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();
    for (const c of chars) if (c.bubble) { const p = c.drawPos(); r.drawBubble(c.bubble, p.x + 8, p.y - 10); }
  }
}
```

- [ ] **Step 4: 통과 확인** — `npm test` → `# pass 47`

- [ ] **Step 5: 커밋**

```bash
git add js/world/scene.js tests/scene.test.js
git commit -m "feat: Scene base class (map, objects, entrances, npcs, tap handling)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: 렌더러(캔버스 그리기) + 입력 + Game 루프 + 임시 부팅

브라우저에서 처음으로 화면이 나오는 태스크. 순수 로직 테스트는 카메라 계산만 하고, 나머지는 브라우저로 확인한다.

**Files:**
- Modify: `js/renderer.js`
- Create: `js/input.js`, `js/game.js`, `js/main.js`, `js/world/hub.js`(맵만), `tests/game.test.js`

- [ ] **Step 1: 실패하는 테스트(카메라)** — `tests/game.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeCamera } from '../js/game.js';

test('맵이 뷰보다 크면 플레이어를 세로 중앙에 두고 맵 범위로 클램프', () => {
  const view = { width: 176, height: 300 };
  assert.deepEqual(computeCamera(view, { pixelW: 176, pixelH: 800 }, { x: 88, y: 400 }), { x: 0, y: 250 });
  assert.deepEqual(computeCamera(view, { pixelW: 176, pixelH: 800 }, { x: 88, y: 10 }), { x: 0, y: 0 });
  assert.deepEqual(computeCamera(view, { pixelW: 176, pixelH: 800 }, { x: 88, y: 790 }), { x: 0, y: 500 });
});

test('맵이 뷰보다 작으면 가운데 정렬(음수 카메라)', () => {
  const view = { width: 176, height: 300 };
  assert.deepEqual(computeCamera(view, { pixelW: 176, pixelH: 160 }, { x: 88, y: 80 }), { x: 0, y: -70 });
  assert.deepEqual(computeCamera(view, { pixelW: 112, pixelH: 160 }, { x: 56, y: 80 }), { x: -32, y: -70 });
});
```

- [ ] **Step 2: 실패 확인** — `npm test` → FAIL

- [ ] **Step 3: renderer.js에 그리기 함수 추가**

`js/renderer.js` 전체:
```js
import { tileSprite } from './sprites/tiles.js';

export const TILE = 16;
export const VIEW_TILES_W = 11;
export const VIEW_W = TILE * VIEW_TILES_W; // 176

export function computeViewport(cssW, cssH) {
  const scale = Math.max(1, Math.min(4, Math.floor(cssW / VIEW_W)));
  return { scale, width: VIEW_W, height: Math.ceil(cssH / scale) };
}

/** Sprite → 오프스크린 캔버스(캐시). 브라우저 전용. */
const spriteCache = new WeakMap();
export function spriteCanvas(sprite) {
  let c = spriteCache.get(sprite);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = sprite.w; c.height = sprite.h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(sprite.w, sprite.h);
  for (let y = 0; y < sprite.h; y++) {
    for (let x = 0; x < sprite.w; x++) {
      const col = sprite.px[y][x];
      if (!col) continue;
      const i = (y * sprite.w + x) * 4;
      const n = parseInt(col.slice(1), 16);
      img.data[i] = (n >> 16) & 255; img.data[i + 1] = (n >> 8) & 255; img.data[i + 2] = n & 255; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  spriteCache.set(sprite, c);
  return c;
}

/** 캔버스 위에 월드를 그리는 어댑터. Scene.draw가 이 메서드들만 호출한다. */
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cam = { x: 0, y: 0 };
    this.view = { scale: 1, width: VIEW_W, height: 300 };
  }

  resize(cssW, cssH) {
    this.view = computeViewport(cssW, cssH);
    this.canvas.width = this.view.width;
    this.canvas.height = this.view.height;
    this.canvas.style.width = `${this.view.width * this.view.scale}px`;
    this.canvas.style.height = `${this.view.height * this.view.scale}px`;
    this.ctx.imageSmoothingEnabled = false;
  }

  begin(bg) {
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.fillStyle = bg;
    this.ctx.fillRect(0, 0, this.view.width, this.view.height);
  }

  drawTile(id, x, y) { this.drawSprite(tileSprite(id), x, y); }

  drawSprite(spr, x, y) {
    const sx = Math.round(x - this.cam.x), sy = Math.round(y - this.cam.y);
    if (sx + spr.w < 0 || sy + spr.h < 0 || sx > this.view.width || sy > this.view.height) return;
    this.ctx.drawImage(spriteCanvas(spr), sx, sy);
  }

  /** 반투명 검은 띠 위 흰 글씨 */
  drawNameTag(text, cx, topY) {
    const ctx = this.ctx;
    ctx.font = '7px Galmuri9, sans-serif';
    const w = Math.ceil(ctx.measureText(text).width) + 4;
    const x = Math.round(cx - this.cam.x - w / 2), y = Math.round(topY - this.cam.y - 8);
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(x, y, w, 9);
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'top';
    ctx.fillText(text, x + 2, y + 1);
  }

  /** 흰 말풍선 + 꼬리, 폭 100px에서 줄바꿈 */
  drawBubble(text, cx, bottomY) {
    const ctx = this.ctx;
    ctx.font = '8px Galmuri9, sans-serif';
    const maxW = 100, lines = [];
    let line = '';
    for (const ch of text) {
      if (ctx.measureText(line + ch).width > maxW) { lines.push(line); line = ch; } else line += ch;
    }
    if (line) lines.push(line);
    const w = Math.ceil(Math.max(...lines.map((l) => ctx.measureText(l).width))) + 8;
    const h = lines.length * 10 + 6;
    let x = Math.round(cx - this.cam.x - w / 2);
    x = Math.max(2, Math.min(this.view.width - w - 2, x));
    const y = Math.round(bottomY - this.cam.y - h - 4);
    ctx.fillStyle = '#2b1d14'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, h);
    const tx = Math.round(cx - this.cam.x);
    ctx.fillStyle = '#2b1d14'; ctx.fillRect(tx - 2, y + h, 4, 2); ctx.fillRect(tx - 1, y + h + 2, 2, 2);
    ctx.fillStyle = '#fff'; ctx.fillRect(tx - 1, y + h, 2, 1);
    ctx.fillStyle = '#2b1d14'; ctx.textBaseline = 'top';
    lines.forEach((l, i) => ctx.fillText(l, x + 4, y + 3 + i * 10));
  }

  /** 전환 페이드 */
  drawFade(alpha) {
    if (alpha <= 0) return;
    this.ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    this.ctx.fillRect(0, 0, this.view.width, this.view.height);
  }
}
```

- [ ] **Step 4: input.js**

```js
/** 캔버스 pointerdown → onTap(cssX, cssY) (캔버스 기준 CSS px). 드래그/스크롤은 무시. */
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
```

- [ ] **Step 5: game.js**

```js
import { Renderer } from './renderer.js';
import { attachPointer } from './input.js';
import { Character } from './entities/character.js';
import { presetSprites } from './sprites/characters.js';

/** 카메라: 뷰보다 큰 축은 플레이어 중심 + 클램프, 작은 축은 가운데 정렬(음수) */
export function computeCamera(view, scene, player) {
  const axis = (viewLen, mapLen, p) => {
    if (mapLen <= viewLen) return 0 - Math.floor((viewLen - mapLen) / 2); // 0 - 0 → +0 (deepEqual에서 -0 방지)
    return Math.max(0, Math.min(mapLen - viewLen, Math.round(p - viewLen / 2)));
  };
  return { x: axis(view.width, scene.pixelW, player.x), y: axis(view.height, scene.pixelH, player.y) };
}

const FADE_TIME = 0.3;

export class Game {
  /**
   * @param {{canvas:HTMLCanvasElement, frame:HTMLElement, config:object, profile:{nickname:string,charId:number},
   *          scenes:Record<string,(game)=>Scene>, ui:object}} o
   * scenes: id → 팩토리. 처음 goTo할 때 생성해 캐시한다.
   */
  constructor({ canvas, frame, config, profile, scenes, ui }) {
    this.canvas = canvas; this.frame = frame;
    this.config = config; this.profile = profile; this.ui = ui;
    this.renderer = new Renderer(canvas);
    this.player = new Character({ sprites: presetSprites(profile.charId), name: profile.nickname, x: 0, y: 0 });
    this.factories = scenes;
    this.scenes = {};
    this.scene = null;
    this.fade = { alpha: 0, dir: 0, next: null };
    this.last = 0;
    this.paused = false;
    attachPointer(canvas, (cx, cy) => this.tap(cx, cy));
    new ResizeObserver(() => this.resize()).observe(frame);
    this.resize();
  }

  resize() {
    const r = this.frame.getBoundingClientRect();
    this.renderer.resize(r.width, r.height);
  }

  sceneById(id) {
    if (!this.scenes[id]) this.scenes[id] = this.factories[id](this);
    return this.scenes[id];
  }

  /** 페이드 아웃 → 씬 교체 → 페이드 인 */
  goTo(id, spawn) {
    if (this.fade.dir !== 0) return;
    this.fade = { alpha: 0, dir: 1, next: { id, spawn } };
  }

  switchNow(id, spawn) {
    this.scene = this.sceneById(id);
    this.scene.enter(this.player, spawn ?? this.scene.spawn, this);
    this.ui.hud?.onScene?.(id);
  }

  tap(cssX, cssY) {
    if (!this.scene || this.paused || this.fade.dir !== 0) return;
    const { scale } = this.renderer.view;
    const wx = cssX / scale + this.renderer.cam.x;
    const wy = cssY / scale + this.renderer.cam.y;
    this.scene.onTap(wx, wy, this);
  }

  start(id) {
    this.switchNow(id);
    requestAnimationFrame((t) => this.loop(t));
  }

  loop(t) {
    const dt = Math.min(0.05, (t - this.last) / 1000 || 0);
    this.last = t;
    if (!this.paused) this.update(dt);
    this.draw();
    requestAnimationFrame((tt) => this.loop(tt));
  }

  update(dt) {
    const f = this.fade;
    if (f.dir === 1) {
      f.alpha = Math.min(1, f.alpha + dt / FADE_TIME);
      if (f.alpha >= 1) { this.switchNow(f.next.id, f.next.spawn); f.dir = -1; }
      return;
    }
    if (f.dir === -1) {
      f.alpha = Math.max(0, f.alpha - dt / FADE_TIME);
      if (f.alpha <= 0) f.dir = 0;
    }
    this.scene.update(dt, this);
  }

  draw() {
    const r = this.renderer;
    r.cam = computeCamera(r.view, this.scene, this.player);
    r.begin(this.scene.bg);
    this.scene.draw(r, this.player);
    r.drawFade(this.fade.alpha);
  }
}
```

- [ ] **Step 6: hub.js (맵만, 오브젝트는 Task 13에서)**

`js/world/hub.js`:
```js
import { Scene } from './scene.js';

export const HUB_ROWS = [
  'HHHHHHHHHHH',
  'HGGGGPGGGGH',
  'HGWGGPGGWGH',
  'HGGGGPGGGGH',
  'HWGGGPGGGWH',
  'HGGGGPGGGGH',
  'HGGWGPGWGGH',
  'HGGGGPGGGGH',
  'HPPPPPPPPPH',
  'HPGGGPGGGPH',
  'HPGWGPGWGPH',
  'HPGGGPGGGPH',
  'HPPPPPPPPPH',
  'HPGGGPGGGPH',
  'HPWGGPGGWPH',
  'HPGGGPGGGPH',
  'HHHHHHHHHHH',
];

export const HUB_SPAWN = { tx: 5, ty: 8 };

export function createHub(game) {
  return new Scene({ id: 'hub', rows: HUB_ROWS, spawn: HUB_SPAWN });
}
```

- [ ] **Step 7: main.js (임시 부팅: 프로필 고정)**

`js/main.js`:
```js
import { Game } from './game.js';
import { createHub } from './world/hub.js';

const canvas = document.getElementById('game');
const frame = document.getElementById('frame');

const game = new Game({
  canvas, frame,
  config: {},
  profile: { nickname: '테스트', charId: 0 },
  scenes: { hub: createHub },
  ui: {},
});
game.start('hub');
```

- [ ] **Step 8: 테스트 통과 확인** — `npm test` → `# pass 49`

- [ ] **Step 9: 브라우저 확인**

Run: `npm run serve` (백그라운드), 내장 브라우저로 `http://localhost:5173`, 뷰포트 375×812.
Expected: 산울타리로 둘러싸인 잔디밭과 흙길, 가운데 캐릭터 "테스트". 빈 곳을 탭하면 캐릭터가 걸어가고(다리 애니메이션, 방향 전환) 울타리에 닿으면 멈춤. 캐릭터가 아래로 가면 화면이 따라 스크롤.
콘솔 에러 0.

- [ ] **Step 10: 커밋**

```bash
git add js/renderer.js js/input.js js/game.js js/main.js js/world/hub.js tests/game.test.js
git commit -m "feat: canvas renderer, pointer input, game loop with camera and fade

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: 프로필 저장(state.js) + 인트로 화면

**Files:**
- Create: `js/state.js`, `js/ui/dom.js`, `js/ui/intro.js`, `tests/state.test.js`

- [ ] **Step 1: 실패하는 테스트** — `tests/state.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateNickname, loadProfile, saveProfile } from '../js/state.js';

const memStorage = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const brokenStorage = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };

test('닉네임은 공백 제거 후 2~10자', () => {
  assert.equal(validateNickname(' 민 ').ok, false);
  assert.equal(validateNickname('민우').ok, true);
  assert.equal(validateNickname('민우').value, '민우');
  assert.equal(validateNickname('가나다라마바사아자차카').ok, false);
  assert.equal(validateNickname(undefined).ok, false);
  assert.match(validateNickname('a').error, /2자/);
});

test('저장 후 불러오기', () => {
  const s = memStorage();
  assert.equal(saveProfile({ nickname: '민우', charId: 3 }, s), true);
  assert.deepEqual(loadProfile(s), { nickname: '민우', charId: 3 });
});

test('없거나 깨진 값이면 null', () => {
  assert.equal(loadProfile(memStorage()), null);
  const s = memStorage(); s.setItem('pixel-wedding-profile', '{bad json');
  assert.equal(loadProfile(s), null);
  const s2 = memStorage(); s2.setItem('pixel-wedding-profile', JSON.stringify({ nickname: '민우', charId: 99 }));
  assert.equal(loadProfile(s2), null);
});

test('스토리지가 예외를 던져도 조용히 실패', () => {
  assert.equal(loadProfile(brokenStorage), null);
  assert.equal(saveProfile({ nickname: '민우', charId: 0 }, brokenStorage), false);
});
```

- [ ] **Step 2: 실패 확인** — `npm test` → FAIL

- [ ] **Step 3: state.js 구현**

```js
import { PRESET_COUNT } from './sprites/characters.js';

const KEY = 'pixel-wedding-profile';

export function validateNickname(raw) {
  const n = (raw ?? '').toString().trim();
  if (n.length < 2) return { ok: false, error: '닉네임은 2자 이상이어야 해요' };
  if (n.length > 10) return { ok: false, error: '닉네임은 10자 이하로 해주세요' };
  return { ok: true, value: n };
}

function safeStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function loadProfile(storage = safeStorage()) {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    const v = validateNickname(p.nickname);
    if (!v.ok) return null;
    if (!Number.isInteger(p.charId) || p.charId < 0 || p.charId >= PRESET_COUNT) return null;
    return { nickname: v.value, charId: p.charId };
  } catch { return null; }
}

export function saveProfile(profile, storage = safeStorage()) {
  try { storage?.setItem(KEY, JSON.stringify(profile)); return true; } catch { return false; }
}
```

- [ ] **Step 4: 통과 확인** — `npm test` → `# pass 53`

- [ ] **Step 5: dom.js (DOM 유틸)**

`js/ui/dom.js`:
```js
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** HTML 문자열 → 첫 번째 엘리먼트 */
export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

/** 클립보드 복사(https 아닌 환경 폴백 포함) */
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {}
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch { return false; }
}
```

- [ ] **Step 6: intro.js**

`js/ui/intro.js`:
```js
import { PRESET_COUNT, presetSprites } from '../sprites/characters.js';
import { spriteCanvas } from '../renderer.js';
import { validateNickname } from '../state.js';
import { esc, h } from './dom.js';

/** 인트로 화면을 띄우고 {nickname, charId}를 resolve한다. */
export function showIntro(root, config) {
  return new Promise((resolve) => {
    let charId = Math.floor(Math.random() * PRESET_COUNT);
    let frame = 0;
    const card = h(`
      <div class="card">
        <h2>${esc(config.groom.name)} ♥ ${esc(config.bride.name)}</h2>
        <p>픽셀 가든에 오신 걸 환영해요!<br>닉네임을 정하고 캐릭터를 골라주세요.</p>
        <input id="nick" maxlength="10" placeholder="닉네임 (2~10자)" autocomplete="off">
        <div class="picker">
          <button class="btn" id="prev">◀</button>
          <canvas width="16" height="24"></canvas>
          <button class="btn" id="next">▶</button>
        </div>
        <p class="muted" id="count"></p>
        <p id="err" style="color:#c0392b;min-height:1.5em"></p>
        <div class="row"><button class="btn primary" id="go">입장하기</button></div>
      </div>`);
    const cv = card.querySelector('canvas'), ctx = cv.getContext('2d');
    const count = card.querySelector('#count'), err = card.querySelector('#err'), nick = card.querySelector('#nick');

    const render = () => {
      ctx.clearRect(0, 0, 16, 24);
      ctx.drawImage(spriteCanvas(presetSprites(charId).down[frame]), 0, 0);
      count.textContent = `캐릭터 ${charId + 1} / ${PRESET_COUNT}`;
    };
    const timer = setInterval(() => { frame = frame ? 0 : 1; render(); }, 300);
    card.querySelector('#prev').onclick = () => { charId = (charId + PRESET_COUNT - 1) % PRESET_COUNT; render(); };
    card.querySelector('#next').onclick = () => { charId = (charId + 1) % PRESET_COUNT; render(); };
    const go = () => {
      const v = validateNickname(nick.value);
      if (!v.ok) { err.textContent = v.error; return; }
      clearInterval(timer);
      root.hidden = true; root.innerHTML = '';
      resolve({ nickname: v.value, charId });
    };
    card.querySelector('#go').onclick = go;
    nick.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });

    root.innerHTML = ''; root.appendChild(card); root.hidden = false;
    render();
    setTimeout(() => nick.focus(), 50);
  });
}
```

- [ ] **Step 7: main.js에 인트로 연결(임시 config 사용)**

`js/main.js`:
```js
import { Game } from './game.js';
import { createHub } from './world/hub.js';
import { loadProfile, saveProfile } from './state.js';
import { showIntro } from './ui/intro.js';

const canvas = document.getElementById('game');
const frame = document.getElementById('frame');
const config = { groom: { name: '신랑' }, bride: { name: '신부' } }; // Task 12에서 config.json으로 교체

let profile = loadProfile();
if (!profile) {
  profile = await showIntro(document.getElementById('intro'), config);
  saveProfile(profile);
}

const game = new Game({ canvas, frame, config, profile, scenes: { hub: createHub }, ui: {} });
game.start('hub');
```

- [ ] **Step 8: 브라우저 확인**

시크릿 창(또는 DevTools → Application → Local Storage 삭제) 후 접속.
Expected: 초록 배경 카드에 닉네임 입력, 캐릭터 미리보기가 두 프레임으로 움직임, ◀▶로 10종 순환. 1자 입력 후 입장 → 빨간 에러. 2자 이상 → 광장 진입, 머리 위에 입력한 닉네임. 새로고침 → 인트로 없이 바로 광장.

- [ ] **Step 9: 커밋**

```bash
git add js/state.js js/ui/dom.js js/ui/intro.js js/main.js tests/state.test.js
git commit -m "feat: profile storage and intro screen with character picker

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: config 로더 + D-day + HUD

**Files:**
- Create: `js/config.js`, `data/config.json`, `js/ui/hud.js`, `tests/config.test.js`
- Modify: `js/main.js`

- [ ] **Step 1: 실패하는 테스트** — `tests/config.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, mergeConfig, daysUntil, ddayLabel, formatDate } from '../js/config.js';

test('mergeConfig: 중첩 객체는 병합, 배열·원시값은 교체, undefined는 무시', () => {
  const r = mergeConfig(DEFAULT_CONFIG, { groom: { name: '민우' }, greetings: ['안녕'], wedding: { map: { kakao: 'k' } } });
  assert.equal(r.groom.name, '민우');
  assert.equal(r.groom.phone, '');                  // 기본값 유지
  assert.deepEqual(r.greetings, ['안녕']);          // 배열 교체
  assert.equal(r.wedding.map.kakao, 'k');
  assert.equal(r.wedding.map.naver, '');
  assert.notEqual(r, DEFAULT_CONFIG);               // 원본 불변
  assert.equal(DEFAULT_CONFIG.groom.name, '신랑');
});

test('daysUntil: 날짜 차이(일), 시간 무시', () => {
  const now = new Date(2026, 9, 16, 23, 0); // 2026-10-16 23:00 로컬
  assert.equal(daysUntil('2026-10-17T01:00:00+09:00', now), 1);
  assert.equal(daysUntil('2026-10-16T09:00:00+09:00', now), 0);
  assert.equal(daysUntil('2026-10-10T12:00:00+09:00', now), -6);
});

test('ddayLabel', () => {
  const now = new Date(2026, 9, 16);
  assert.equal(ddayLabel('2026-12-25T12:00:00+09:00', now), 'D-70');
  assert.equal(ddayLabel('2026-10-16T12:00:00+09:00', now), 'D-Day');
  assert.equal(ddayLabel('2026-10-01T12:00:00+09:00', now), '감사합니다');
});

test('formatDate: 한국어 날짜·요일·시각', () => {
  assert.equal(formatDate('2027-03-13T12:30:00+09:00'), '2027년 3월 13일 토요일 오후 12시 30분');
  assert.equal(formatDate('2027-03-14T11:00:00+09:00'), '2027년 3월 14일 일요일 오전 11시');
});
```

- [ ] **Step 2: 실패 확인** — `npm test` → FAIL

- [ ] **Step 3: config.js 구현**

```js
export const DEFAULT_CONFIG = {
  groom: { name: '신랑', phone: '', parents: [], account: { bank: '', number: '', holder: '', kakaopay: '' } },
  bride: { name: '신부', phone: '', parents: [], account: { bank: '', number: '', holder: '', kakaopay: '' } },
  wedding: {
    date: '2027-01-01T12:00:00+09:00',
    venue: '', hall: '', address: '',
    map: { kakao: '', naver: '', tmap: '' },
    transport: { subway: '', bus: '', parking: '' },
  },
  greetings: ['와주셔서 감사해요!', '오늘 꼭 뵈어요 🌸', '천천히 둘러보세요~'],
  timeline: [],
  guestbookApi: '',
  kakaoJsKey: '',
  siteUrl: '',
};

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function mergeConfig(base, over) {
  if (!isObj(over)) return structuredClone(base);
  const out = structuredClone(base);
  for (const [k, v] of Object.entries(over)) {
    if (v === undefined) continue;
    out[k] = isObj(v) && isObj(out[k]) ? mergeConfig(out[k], v) : structuredClone(v);
  }
  return out;
}

export async function loadConfig(url = 'data/config.json') {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status);
    return mergeConfig(DEFAULT_CONFIG, await res.json());
  } catch (e) {
    console.warn('config.json 로드 실패, 기본값 사용', e);
    return structuredClone(DEFAULT_CONFIG);
  }
}

const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function daysUntil(iso, now = new Date()) {
  return Math.round((dayStart(new Date(iso)) - dayStart(now)) / 86400000);
}

export function ddayLabel(iso, now = new Date()) {
  const n = daysUntil(iso, now);
  if (n > 0) return `D-${n}`;
  if (n === 0) return 'D-Day';
  return '감사합니다';
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
export function formatDate(iso) {
  const d = new Date(iso);
  const h = d.getHours(), m = d.getMinutes();
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const time = `${ampm} ${h12}시${m ? ` ${m}분` : ''}`;
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${DAYS[d.getDay()]}요일 ${time}`;
}
```

> `formatDate`는 브라우저/Node의 로컬 시간대를 쓴다. 하객 기기가 한국이라는 전제. 테스트 환경(Windows, KST)에서 통과하면 된다.

- [ ] **Step 4: 통과 확인** — `npm test` → `# pass 57`

- [ ] **Step 5: data/config.json (예시값, 신랑신부가 수정)**

```json
{
  "groom": {
    "name": "신랑이름",
    "phone": "010-0000-0000",
    "parents": [
      { "role": "아버지", "name": "신랑아버지", "phone": "" },
      { "role": "어머니", "name": "신랑어머니", "phone": "" }
    ],
    "account": { "bank": "카카오뱅크", "number": "3333-00-0000000", "holder": "신랑이름", "kakaopay": "" }
  },
  "bride": {
    "name": "신부이름",
    "phone": "010-0000-0000",
    "parents": [
      { "role": "아버지", "name": "신부아버지", "phone": "" },
      { "role": "어머니", "name": "신부어머니", "phone": "" }
    ],
    "account": { "bank": "국민은행", "number": "000000-00-000000", "holder": "신부이름", "kakaopay": "" }
  },
  "wedding": {
    "date": "2027-03-13T12:30:00+09:00",
    "venue": "○○웨딩홀",
    "hall": "3층 그랜드홀",
    "address": "서울특별시 ○○구 ○○로 00",
    "map": {
      "kakao": "https://map.kakao.com/",
      "naver": "https://map.naver.com/",
      "tmap": ""
    },
    "transport": {
      "subway": "2호선 ○○역 3번 출구 도보 5분",
      "bus": "간선 000, 지선 0000 ○○정류장 하차",
      "parking": "건물 지하 주차장 2시간 무료"
    }
  },
  "greetings": ["와주셔서 감사해요!", "오늘 꼭 뵈어요 🌸", "천천히 둘러보세요~", "갤러리도 구경해 주세요!"],
  "timeline": [
    { "year": "2019", "icon": "☕", "text": "처음 만난 날" },
    { "year": "2021", "icon": "✈️", "text": "첫 여행" },
    { "year": "2025", "icon": "💍", "text": "프러포즈" },
    { "year": "2027", "icon": "💒", "text": "결혼합니다" }
  ],
  "guestbookApi": "",
  "kakaoJsKey": "",
  "siteUrl": ""
}
```

- [ ] **Step 6: hud.js**

```js
import { esc, h } from './dom.js';
import { ddayLabel, formatDate } from '../config.js';
import { HUB_SPAWN } from '../world/hub.js';

export function createHud(root, config, game) {
  const w = config.wedding;
  root.innerHTML = '';
  root.appendChild(h(`<div><b>${esc(config.groom.name)} ♥ ${esc(config.bride.name)}</b><br>
    <span>${esc(formatDate(w.date).replace(/ (오전|오후).*$/, ''))} · ${esc(ddayLabel(w.date))}</span></div>`));
  const home = h(`<button class="btn ghost" hidden>광장으로</button>`);
  home.onclick = () => game.goTo('hub', HUB_SPAWN);
  root.appendChild(home);
  root.hidden = false;
  return { onScene(id) { home.hidden = id === 'hub'; } };
}
```

- [ ] **Step 7: main.js 교체**

```js
import { Game } from './game.js';
import { createHub } from './world/hub.js';
import { loadConfig } from './config.js';
import { loadProfile, saveProfile } from './state.js';
import { showIntro } from './ui/intro.js';
import { createHud } from './ui/hud.js';

const canvas = document.getElementById('game');
const frame = document.getElementById('frame');
const config = await loadConfig();
document.title = `${config.groom.name} ♥ ${config.bride.name} 결혼합니다`;

let profile = loadProfile();
if (!profile) {
  profile = await showIntro(document.getElementById('intro'), config);
  saveProfile(profile);
}

const game = new Game({ canvas, frame, config, profile, scenes: { hub: createHub }, ui: {} });
game.ui.hud = createHud(document.getElementById('hud'), config, game);
game.start('hub');
```

- [ ] **Step 8: 브라우저 확인**

Expected: 상단에 "신랑이름 ♥ 신부이름 / 2027년 3월 13일 토요일 · D-NNN" 표시. 광장에서는 "광장으로" 버튼 없음.

- [ ] **Step 9: 커밋**

```bash
git add js/config.js data/config.json js/ui/hud.js js/main.js tests/config.test.js
git commit -m "feat: config loader with defaults, D-day, HUD

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 13: 오버레이·토스트 + 허브 완성(아치, 신랑신부, 나무, 표지판, 입구)

**Files:**
- Create: `js/ui/overlay.js`, `js/ui/toast.js`
- Modify: `js/world/hub.js`

- [ ] **Step 1: overlay.js**

```js
import { esc, h } from './dom.js';

/**
 * 팝업 카드. buttons: [{label, primary?, onClick?(card) => boolean|Promise<boolean>}]
 * onClick이 true를 돌려주면 닫지 않는다(검증 실패 등). 열려 있는 동안 game.paused = true.
 */
export function showOverlay(game, { title = '', html = '', buttons = [{ label: '닫기' }] }) {
  const root = document.getElementById('overlay');
  root.innerHTML = '';
  const card = h(`<div class="card">${title ? `<h2>${esc(title)}</h2>` : ''}<div class="body">${html}</div><div class="row"></div></div>`);
  const close = () => { root.hidden = true; root.innerHTML = ''; root.onclick = null; game.paused = false; };
  const row = card.querySelector('.row');
  for (const b of buttons) {
    const btn = h(`<button class="btn${b.primary ? ' primary' : ''}">${esc(b.label)}</button>`);
    btn.onclick = async () => { const keep = b.onClick ? await b.onClick(card) : false; if (!keep) close(); };
    row.appendChild(btn);
  }
  root.appendChild(card);
  root.hidden = false;
  game.paused = true;
  root.onclick = (e) => { if (e.target === root) close(); };
  return { close, card };
}

/** key: value 표를 만드는 작은 헬퍼(빈 값은 생략) */
export function kv(pairs) {
  return pairs.filter(([, v]) => v).map(([k, v]) => `<p><b>${esc(k)}</b> ${esc(v)}</p>`).join('');
}
```

- [ ] **Step 2: toast.js**

```js
import { esc, h } from './dom.js';

let timer = null;
export function toast(msg, ms = 2000) {
  const root = document.getElementById('toast');
  root.innerHTML = '';
  root.appendChild(h(`<div class="toast-msg">${esc(msg)}</div>`));
  root.hidden = false;
  clearTimeout(timer);
  timer = setTimeout(() => { root.hidden = true; }, ms);
}
```

- [ ] **Step 3: hub.js 완성**

```js
import { Scene, standPos } from './scene.js';
import { Character } from '../entities/character.js';
import { GROOM, BRIDE } from '../sprites/characters.js';
import { toast } from '../ui/toast.js';

export const HUB_ROWS = [
  'HHHHHHHHHHH',
  'HGGGGPGGGGH',
  'HGWGGPGGWGH',
  'HGGGGPGGGGH',
  'HWGGGPGGGWH',
  'HGGGGPGGGGH',
  'HGGWGPGWGGH',
  'HGGGGPGGGGH',
  'HPPPPPPPPPH',
  'HPGGGPGGGPH',
  'HPGWGPGWGPH',
  'HPGGGPGGGPH',
  'HPPPPPPPPPH',
  'HPGGGPGGGPH',
  'HPWGGPGGWPH',
  'HPGGGPGGGPH',
  'HHHHHHHHHHH',
];

export const HUB_SPAWN = { tx: 5, ty: 8 };

/** 각 방으로 가는 문 위치와, 그 방에서 돌아올 때 설 자리 */
export const HUB_DOORS = {
  info:      { door: { tx: 1, ty: 9 },  sign: { tx: 2, ty: 9 },  back: { tx: 1, ty: 8 },  label: '예식 안내소' },
  gallery:   { door: { tx: 9, ty: 9 },  sign: { tx: 8, ty: 9 },  back: { tx: 9, ty: 8 },  label: '갤러리관' },
  story:     { door: { tx: 1, ty: 13 }, sign: { tx: 2, ty: 13 }, back: { tx: 1, ty: 12 }, label: '우리 이야기 길' },
  guestbook: { door: { tx: 9, ty: 13 }, sign: { tx: 8, ty: 13 }, back: { tx: 9, ty: 12 }, label: '방명록 정원' },
  gifts:     { door: { tx: 5, ty: 15 }, sign: { tx: 4, ty: 15 }, back: { tx: 5, ty: 14 }, label: '마음 전하는 곳' },
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export class HubScene extends Scene {
  constructor(game) {
    const cfg = game.config;
    const groom = new Character({ sprites: GROOM, name: cfg.groom.name, ...standPos(4, 3) });
    const bride = new Character({ sprites: BRIDE, name: cfg.bride.name, ...standPos(6, 3) });
    const greet = (c) => () => c.say(pick(cfg.greetings));

    const objects = [
      { id: 'arch', sprite: 'arch', tx: 4, ty: 1, solid: false },
      ...[[1, 1], [9, 1], [1, 5], [9, 5], [3, 5], [7, 5]].map(([tx, ty], i) => ({ id: `tree${i}`, sprite: 'tree', tx, ty })),
    ];
    const entrances = [];
    for (const [id, d] of Object.entries(HUB_DOORS)) {
      objects.push({ id: `door-${id}`, sprite: 'door', floor: true, ...d.door });
      objects.push({ id: `sign-${id}`, sprite: 'sign', ...d.sign, interact: () => toast(`${d.label} →`) });
      entrances.push({ ...d.door, to: id, spawn: null }); // spawn null → 해당 씬의 기본 spawn
    }

    super({
      id: 'hub', rows: HUB_ROWS, spawn: HUB_SPAWN, objects, entrances,
      npcs: [{ character: groom, interact: greet(groom) }, { character: bride, interact: greet(bride) }],
    });
    this.hosts = [groom, bride];
  }
}

export function createHub(game) { return new HubScene(game); }
```

`Scene.update`에서 `game.goTo(e.to, e.spawn)`은 spawn이 null이면 `Game.switchNow`가 `this.scene.spawn`을 쓴다(이미 `spawn ?? this.scene.spawn`). 각 방은 자기 `spawn`을 입구 바로 안쪽으로 정의하고, 방에서 허브로 돌아올 때는 `HUB_DOORS[id].back`을 spawn으로 넘긴다.

- [ ] **Step 4: 브라우저 확인**

Expected: 꽃 아치 아래 신랑·신부 NPC(이름 태그), 나무 6그루, 노란 테두리 문 5개와 표지판 5개. 신랑을 탭하면 캐릭터가 다가가 멈추고 말풍선이 3초 뜸. 표지판 탭 → 하단 토스트. 문을 밟으면 화면이 어두워진 뒤… 아직 다른 씬이 없으므로 콘솔에 `this.factories[id] is not a function` 에러가 난다. 이는 Task 14~18에서 해소된다. 임시로 확인만 하고 넘어간다.

- [ ] **Step 5: 커밋**

```bash
git add js/ui/overlay.js js/ui/toast.js js/world/hub.js
git commit -m "feat: overlay/toast UI and complete hub scene (arch, hosts, trees, doors)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 14: 예식 안내소 씬 (+ .ics 생성)

**Files:**
- Create: `js/ics.js`, `js/world/info.js`, `tests/ics.test.js`
- Modify: `js/main.js`

- [ ] **Step 1: 실패하는 테스트** — `tests/ics.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIcs } from '../js/ics.js';
import { DEFAULT_CONFIG, mergeConfig } from '../js/config.js';

test('buildIcs: 일정 2시간, CRLF, 필수 필드', () => {
  const cfg = mergeConfig(DEFAULT_CONFIG, {
    groom: { name: '민우' }, bride: { name: '지은' },
    wedding: { date: '2027-03-13T12:30:00+09:00', venue: '웨딩홀', hall: '3층', address: '서울' },
  });
  const ics = buildIcs(cfg);
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.includes('DTSTART;TZID=Asia/Seoul:20270313T123000\r\n'));
  assert.ok(ics.includes('DTEND;TZID=Asia/Seoul:20270313T143000\r\n'));
  assert.ok(ics.includes('SUMMARY:민우 ♥ 지은 결혼식\r\n'));
  assert.ok(ics.includes('LOCATION:웨딩홀 3층\\, 서울\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
});
```

- [ ] **Step 2: 실패 확인** — `npm test` → FAIL

- [ ] **Step 3: ics.js 구현**

```js
const pad = (n) => String(n).padStart(2, '0');

/** ISO(+09:00) → KST 벽시계 기준 'YYYYMMDDTHHMMSS' */
function kstStamp(date) {
  const k = new Date(date.getTime() + 9 * 3600 * 1000);
  return `${k.getUTCFullYear()}${pad(k.getUTCMonth() + 1)}${pad(k.getUTCDate())}T${pad(k.getUTCHours())}${pad(k.getUTCMinutes())}00`;
}
const escText = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');

export function buildIcs(cfg) {
  const start = new Date(cfg.wedding.date);
  const end = new Date(start.getTime() + 2 * 3600 * 1000);
  const w = cfg.wedding;
  const location = [w.venue, w.hall].filter(Boolean).join(' ') + (w.address ? `, ${w.address}` : '');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//pixel-wedding//KO', 'BEGIN:VEVENT',
    `UID:wedding-${start.getTime()}@pixel-wedding`,
    `DTSTAMP:${kstStamp(new Date())}`,
    `DTSTART;TZID=Asia/Seoul:${kstStamp(start)}`,
    `DTEND;TZID=Asia/Seoul:${kstStamp(end)}`,
    `SUMMARY:${escText(`${cfg.groom.name} ♥ ${cfg.bride.name} 결혼식`)}`,
    `LOCATION:${escText(location)}`,
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}
```

- [ ] **Step 4: 통과 확인** — `npm test` → `# pass 58`

- [ ] **Step 5: info.js**

```js
import { Scene } from './scene.js';
import { HUB_DOORS } from './hub.js';
import { showOverlay, kv } from '../ui/overlay.js';
import { toast } from '../ui/toast.js';
import { esc, copyText } from '../ui/dom.js';
import { formatDate } from '../config.js';
import { buildIcs } from '../ics.js';

const ROWS = [
  'KKKKKKKKKKK',
  'KDDDDDDDDDK',
  'KDDDDDDDDDK',
  'KDDDDRRRDDK',
  'KDDDDRRRDDK',
  'KDDDDDDDDDK',
  'KDDDDDDDDDK',
  'KKKKKDKKKKK',
];

let shownOnce = false;

function infoHtml(cfg) {
  const w = cfg.wedding;
  return kv([['일시', formatDate(w.date)], ['장소', [w.venue, w.hall].filter(Boolean).join(' ')], ['주소', w.address]]);
}

function contactsHtml(cfg) {
  const line = (label, name, phone) => phone
    ? `<p><b>${esc(label)}</b> ${esc(name)} <a class="btn" href="tel:${esc(phone)}">전화</a> <a class="btn" href="sms:${esc(phone)}">문자</a></p>`
    : '';
  return [
    line('신랑', cfg.groom.name, cfg.groom.phone),
    ...cfg.groom.parents.map((p) => line(`신랑 ${p.role}`, p.name, p.phone)),
    line('신부', cfg.bride.name, cfg.bride.phone),
    ...cfg.bride.parents.map((p) => line(`신부 ${p.role}`, p.name, p.phone)),
  ].join('') || '<p class="muted">연락처가 아직 등록되지 않았어요.</p>';
}

function downloadIcs(cfg) {
  const blob = new Blob([buildIcs(cfg)], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'wedding.ics';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function createInfo(game) {
  const cfg = game.config, w = cfg.wedding;
  const mapButtons = [['카카오맵', w.map.kakao], ['네이버지도', w.map.naver], ['티맵', w.map.tmap]]
    .filter(([, u]) => u).map(([l, u]) => `<a class="btn" target="_blank" rel="noopener" href="${esc(u)}">${esc(l)}</a>`).join(' ');

  return new Scene({
    id: 'info', rows: ROWS, bg: '#3b2a1e',
    spawn: { tx: 5, ty: 6 },
    entrances: [{ tx: 5, ty: 7, to: 'hub', spawn: HUB_DOORS.info.back }],
    objects: [
      { id: 'door', sprite: 'door', floor: true, tx: 5, ty: 7 },
      { id: 'board', sprite: 'board', tx: 1, ty: 0, interact: () => showOverlay(game, {
        title: '오시는 길', html: kv([['지하철', w.transport.subway], ['버스', w.transport.bus], ['주차', w.transport.parking]]) || '<p class="muted">준비 중</p>' }) },
      { id: 'map', sprite: 'mapframe', tx: 3, ty: 0, interact: () => showOverlay(game, {
        title: '지도', html: `<p>${esc(w.address)}</p><div class="row">${mapButtons}</div>`,
        buttons: [{ label: '주소 복사', onClick: async () => { toast((await copyText(w.address)) ? '주소를 복사했어요' : '복사에 실패했어요'); return true; } }, { label: '닫기' }] }) },
      { id: 'calendar', sprite: 'calendar', tx: 7, ty: 0, interact: () => showOverlay(game, {
        title: '캘린더에 저장', html: `<p>${esc(formatDate(w.date))}</p>`,
        buttons: [{ label: '.ics 다운로드', primary: true, onClick: () => { downloadIcs(cfg); } }, { label: '닫기' }] }) },
      { id: 'desk', sprite: 'desk', tx: 4, ty: 1, interact: () => showOverlay(game, { title: '예식 안내', html: infoHtml(cfg) }) },
      { id: 'phone', sprite: 'phone', tx: 8, ty: 1, interact: () => showOverlay(game, { title: '연락하기', html: contactsHtml(cfg) }) },
    ],
    onEnter: (g) => { if (!shownOnce) { shownOnce = true; showOverlay(g, { title: '예식 안내', html: infoHtml(cfg) }); } },
  });
}
```

- [ ] **Step 6: main.js에 씬 등록**

`scenes: { hub: createHub }` → `scenes: { hub: createHub, info: createInfo }` 및 `import { createInfo } from './world/info.js';`

- [ ] **Step 7: 브라우저 확인**

허브 좌측 문(1,9) 밟기 → 페이드 → 실내. 입장 즉시 예식 안내 팝업(한 번만). 게시판/지도/달력/데스크/전화기 각각 탭 → 다가가서 팝업. 지도 팝업의 "주소 복사" → 토스트. 달력 → .ics 다운로드(내장 브라우저에서는 다운로드 허용 여부만 확인). 하단 문 → 허브 (1,8)로 복귀, HUD에 "광장으로" 버튼이 방 안에서만 보임.

- [ ] **Step 8: 커밋**

```bash
git add js/ics.js js/world/info.js js/main.js tests/ics.test.js
git commit -m "feat: info room with map links, contacts, transport, ics download

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 15: 갤러리관 (레이아웃 + 씬 + 캡처 억제 뷰어)

**Files:**
- Create: `js/world/gallery-layout.js`, `js/world/gallery.js`, `js/ui/viewer.js`, `gallery/manifest.json`, `tests/gallery-layout.test.js`
- Modify: `js/renderer.js`(drawCanvas 추가), `js/main.js`

- [ ] **Step 1: 실패하는 테스트** — `tests/gallery-layout.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { galleryLayout } from '../js/world/gallery-layout.js';

test('사진 0장: 최소 복도, 액자 없음', () => {
  const L = galleryLayout(0);
  assert.equal(L.rows.length, 6);
  assert.equal(L.rows[0], 'KKKKKKKKKKK');
  assert.equal(L.rows[1], 'KDDDDDDDDDK');
  assert.equal(L.rows.at(-1), 'KKKKKDKKKKK');
  assert.deepEqual(L.frames, []);
  assert.deepEqual(L.exit, { tx: 5, ty: 5 });
  assert.deepEqual(L.spawn, { tx: 5, ty: 4 });
});

test('사진 5장: 2장씩 3줄, 왼쪽은 tx1/stand tx2, 오른쪽은 tx9/stand tx8', () => {
  const L = galleryLayout(5);
  assert.equal(L.rows.length, 10);
  assert.equal(L.frames.length, 5);
  assert.deepEqual(L.frames[0], { index: 0, tx: 1, ty: 2, stand: { tx: 2, ty: 2 } });
  assert.deepEqual(L.frames[1], { index: 1, tx: 9, ty: 2, stand: { tx: 8, ty: 2 } });
  assert.deepEqual(L.frames[4], { index: 4, tx: 1, ty: 6, stand: { tx: 2, ty: 6 } });
  assert.deepEqual(L.exit, { tx: 5, ty: 9 });
});
```

- [ ] **Step 2: 실패 확인** — `npm test` → FAIL

- [ ] **Step 3: gallery-layout.js**

```js
/** 사진 n장 → 세로 복도 맵. 액자는 2행 간격으로 좌(tx1)/우(tx9) 번갈아. */
export function galleryLayout(n) {
  const pairs = Math.max(1, Math.ceil(n / 2));
  const h = 2 + pairs * 2 + 2;
  const rows = ['KKKKKKKKKKK'];
  for (let y = 1; y < h - 1; y++) rows.push('KDDDDDDDDDK');
  rows.push('KKKKKDKKKKK');
  const frames = [];
  for (let i = 0; i < n; i++) {
    const ty = 2 + Math.floor(i / 2) * 2;
    const left = i % 2 === 0;
    frames.push({ index: i, tx: left ? 1 : 9, ty, stand: { tx: left ? 2 : 8, ty } });
  }
  return { rows, frames, exit: { tx: 5, ty: h - 1 }, spawn: { tx: 5, ty: h - 2 } };
}
```

- [ ] **Step 4: 통과 확인** — `npm test` → `# pass 60`

- [ ] **Step 5: renderer.js에 drawCanvas 추가**

`Renderer` 클래스 안, `drawSprite` 아래에:
```js
  /** 미리 그려둔 캔버스(썸네일 등)를 월드 좌표에 그린다 */
  drawCanvas(c, x, y) {
    this.ctx.drawImage(c, Math.round(x - this.cam.x), Math.round(y - this.cam.y));
  }
```

- [ ] **Step 6: viewer.js (캡처 억제 뷰어)**

```js
import { h } from './dom.js';

/**
 * 사진 확대 뷰어. <img> 대신 canvas에 그려 길게 누르기 저장/드래그를 막고,
 * 우클릭 차단, 탭이 숨겨지면 자동으로 닫는다. (OS 스크린샷은 막을 수 없음)
 */
export function openViewer(game, images, index) {
  const root = document.getElementById('overlay');
  root.innerHTML = '';
  const v = h(`<div id="viewer"><canvas></canvas><button class="btn ghost close">닫기</button><div class="counter"></div></div>`);
  const cv = v.querySelector('canvas'), ctx = cv.getContext('2d'), counter = v.querySelector('.counter');
  let i = index;

  const draw = () => {
    const img = images[i];
    const r = root.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    cv.style.width = `${r.width}px`; cv.style.height = `${r.height}px`;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
    counter.textContent = `${i + 1} / ${images.length}`;
    if (!img || !img.naturalWidth) {
      ctx.fillStyle = '#fff'; ctx.font = `${14 * dpr}px Galmuri11, sans-serif`; ctx.textAlign = 'center';
      ctx.fillText('사진 준비 중', cv.width / 2, cv.height / 2);
      return;
    }
    const s = Math.min(cv.width / img.naturalWidth, cv.height / img.naturalHeight);
    const w = img.naturalWidth * s, hh = img.naturalHeight * s;
    ctx.drawImage(img, (cv.width - w) / 2, (cv.height - hh) / 2, w, hh);
  };

  const prevent = (e) => e.preventDefault();
  let down = null;
  const onDown = (e) => { down = { x: e.clientX, t: performance.now() }; };
  const onUp = (e) => {
    if (!down) return;
    const dx = e.clientX - down.x; down = null;
    if (dx < -40) i = (i + 1) % images.length;
    else if (dx > 40) i = (i + images.length - 1) % images.length;
    else return;
    draw();
  };
  const onHide = () => { if (document.hidden) close(); };

  const close = () => {
    document.removeEventListener('visibilitychange', onHide);
    window.removeEventListener('resize', draw);
    root.hidden = true; root.innerHTML = ''; game.paused = false;
  };

  v.addEventListener('contextmenu', prevent);
  v.addEventListener('dragstart', prevent);
  cv.addEventListener('pointerdown', onDown);
  cv.addEventListener('pointerup', onUp);
  v.querySelector('.close').onclick = close;
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('resize', draw);

  root.appendChild(v); root.hidden = false; game.paused = true;
  draw();
  for (const img of images) if (img && !img.naturalWidth) img.addEventListener('load', draw, { once: true });
  return { close };
}
```

- [ ] **Step 7: gallery.js**

```js
import { Scene } from './scene.js';
import { HUB_DOORS } from './hub.js';
import { galleryLayout } from './gallery-layout.js';
import { openViewer } from '../ui/viewer.js';
import { toast } from '../ui/toast.js';
import { TILE } from '../renderer.js';

const THUMB_W = 10, THUMB_H = 8; // frame 스프라이트 안쪽 (3,3)부터

/** 이미지를 10×8 썸네일 캔버스로(cover 크롭) */
function makeThumb(img) {
  const c = document.createElement('canvas');
  c.width = THUMB_W; c.height = THUMB_H;
  const ctx = c.getContext('2d');
  const s = Math.max(THUMB_W / img.naturalWidth, THUMB_H / img.naturalHeight);
  const w = img.naturalWidth * s, h = img.naturalHeight * s;
  ctx.drawImage(img, (THUMB_W - w) / 2, (THUMB_H - h) / 2, w, h);
  return c;
}

export class GalleryScene extends Scene {
  /** @param files manifest의 파일명 배열 */
  constructor(game, files) {
    const L = galleryLayout(files.length);
    const images = files.map((f) => { const img = new Image(); img.decoding = 'async'; img.src = `gallery/${f}`; return img; });
    const objects = [
      { id: 'door', sprite: 'door', floor: true, ...L.exit },
      ...L.frames.map((f) => ({
        id: `frame${f.index}`, sprite: 'frame', tx: f.tx, ty: f.ty, stand: f.stand,
        interact: () => openViewer(game, images, f.index),
      })),
    ];
    if (files.length === 0) objects.push({ id: 'empty', sprite: 'sign', tx: 5, ty: 2, interact: () => toast('사진을 준비하고 있어요 📷') });

    super({
      id: 'gallery', rows: L.rows, bg: '#3b2a1e', spawn: L.spawn,
      entrances: [{ ...L.exit, to: 'hub', spawn: HUB_DOORS.gallery.back }],
      objects,
    });
    this.frames = L.frames;
    this.thumbs = new Array(files.length).fill(null);
    images.forEach((img, i) => {
      img.addEventListener('load', () => { this.thumbs[i] = makeThumb(img); }, { once: true });
      img.addEventListener('error', () => console.warn('사진 로드 실패', files[i]), { once: true });
    });
  }

  draw(r, player) {
    super.draw(r, player);
    for (const f of this.frames) {
      const t = this.thumbs[f.index];
      if (t) r.drawCanvas(t, f.tx * TILE + 3, f.ty * TILE + 3);
    }
  }
}

export function createGallery(game) { return new GalleryScene(game, game.assets.gallery); }
```

- [ ] **Step 8: gallery/manifest.json (초기값: 빈 배열)**

```json
[]
```

사진을 넣을 때: `gallery/001.jpg` 등을 넣고 `["001.jpg", "002.jpg"]`처럼 적는다. 긴 변 1600px 이하 권장.

- [ ] **Step 9: main.js 수정**

```js
import { createGallery } from './world/gallery.js';
// ...
async function loadManifest() {
  try { const r = await fetch('gallery/manifest.json', { cache: 'no-cache' }); return r.ok ? await r.json() : []; }
  catch { return []; }
}
const assets = { gallery: await loadManifest() };
// Game 생성 시
const game = new Game({ canvas, frame, config, profile, scenes: { hub: createHub, info: createInfo, gallery: createGallery }, ui: {} });
game.assets = assets;
```

- [ ] **Step 10: 브라우저 확인**

(1) manifest 빈 상태: 갤러리 입장 → 복도 가운데 표지판, 탭하면 "사진을 준비하고 있어요". (2) 임시로 아무 jpg 3장을 `gallery/`에 넣고 manifest에 적은 뒤: 좌우 벽에 액자 3개, 안에 썸네일이 보임. 액자 탭 → 옆 타일로 이동 후 전체화면 뷰어. 좌우 스와이프로 넘김, 우클릭 메뉴 안 뜸, 다른 탭으로 갔다 오면 뷰어가 닫혀 있음. 닫기 → 게임 재개. 확인 후 임시 jpg와 manifest 항목은 되돌린다(커밋하지 않음).

- [ ] **Step 11: 커밋**

```bash
git add js/world/gallery-layout.js js/world/gallery.js js/ui/viewer.js js/renderer.js js/main.js gallery/manifest.json tests/gallery-layout.test.js
git commit -m "feat: gallery corridor with thumbnails and capture-deterrent viewer

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 16: 우리 이야기 길

**Files:**
- Create: `js/world/story-layout.js`, `js/world/story.js`, `tests/story-layout.test.js`
- Modify: `js/main.js`

- [ ] **Step 1: 실패하는 테스트** — `tests/story-layout.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { storyLayout } from '../js/world/story-layout.js';

test('이정표 4개: 위에서 아래로 좌우 번갈아, 끝에 벤치, 출구는 맨 아래', () => {
  const L = storyLayout(4);
  assert.equal(L.rows[0], 'HHHHHHHHHHH');
  assert.equal(L.rows.at(-1), 'HHHHHPHHHHH');
  assert.equal(L.rows.length, 2 + 4 * 2 + 4);
  assert.deepEqual(L.signs.map((s) => [s.tx, s.ty]), [[3, 2], [7, 4], [3, 6], [7, 8]]);
  assert.deepEqual(L.bench, { tx: 6, ty: L.rows.length - 4 });
  assert.deepEqual(L.spawn, { tx: 5, ty: 1 });
  assert.deepEqual(L.exit, { tx: 5, ty: L.rows.length - 1 });
  for (const r of L.rows.slice(1, -1)) assert.equal(r[5], 'P', '가운데는 길');
});

test('이정표 0개도 동작', () => {
  const L = storyLayout(0);
  assert.equal(L.signs.length, 0);
  assert.equal(L.rows.length, 6);
});
```

- [ ] **Step 2: 실패 확인** — `npm test` → FAIL

- [ ] **Step 3: story-layout.js**

```js
/** 타임라인 n개 → 세로 산책로. 이정표는 (3,2),(7,4),(3,6)... 끝에 벤치, 맨 아래 출구. */
export function storyLayout(n) {
  const h = 2 + n * 2 + 4;
  const rows = ['HHHHHHHHHHH'];
  for (let y = 1; y < h - 1; y++) rows.push(y % 3 === 0 ? 'HGWGGPGGWGH' : 'HGGGGPGGGGH');
  rows.push('HHHHHPHHHHH');
  const signs = Array.from({ length: n }, (_, i) => ({ index: i, tx: i % 2 === 0 ? 3 : 7, ty: 2 + i * 2 }));
  return { rows, signs, bench: { tx: 6, ty: h - 4 }, spawn: { tx: 5, ty: 1 }, exit: { tx: 5, ty: h - 1 } };
}
```

- [ ] **Step 4: 통과 확인** — `npm test` → `# pass 62`

- [ ] **Step 5: story.js**

```js
import { Scene, standPos } from './scene.js';
import { HUB_DOORS } from './hub.js';
import { storyLayout } from './story-layout.js';
import { Character } from '../entities/character.js';
import { GROOM, BRIDE } from '../sprites/characters.js';
import { showOverlay } from '../ui/overlay.js';
import { esc } from '../ui/dom.js';

export function createStory(game) {
  const cfg = game.config;
  const L = storyLayout(cfg.timeline.length);
  // 벤치(6..7, h-4)와 같은 타일 행에 세우면 y정렬상 벤치가 나중에 그려져 다리를 가린다 → 앉은 것처럼 보임.
  // NPC는 충돌 검사를 하지 않으므로 solid 타일 위에 둘 수 있다.
  const groom = new Character({ sprites: GROOM, name: cfg.groom.name, ...standPos(6, L.bench.ty) });
  const bride = new Character({ sprites: BRIDE, name: cfg.bride.name, ...standPos(7, L.bench.ty) });
  groom.dir = 'down'; bride.dir = 'down';
  const thanks = (c) => () => c.say('여기까지 와줘서 고마워요 💕');

  return new Scene({
    id: 'story', rows: L.rows, spawn: L.spawn,
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
```

- [ ] **Step 6: main.js에 `story: createStory` 등록**

- [ ] **Step 7: 브라우저 확인**

허브 (1,13) 문 → 산책로 맨 위에서 시작. 이정표 4개를 차례로 탭 → "☕ 2019 / 처음 만난 날" 팝업. 맨 아래 벤치에 신랑신부가 앉은 듯 보이고 탭하면 말풍선. 바닥 문 → 허브 (1,12).

- [ ] **Step 8: 커밋**

```bash
git add js/world/story-layout.js js/world/story.js js/main.js tests/story-layout.test.js
git commit -m "feat: story path with timeline signposts and bench scene

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 17: 방명록 (API 모듈 + Apps Script + 정원 씬)

**Files:**
- Create: `js/api.js`, `js/world/guest-layout.js`, `js/world/guestbook.js`, `apps-script/Code.gs`, `tests/api.test.js`, `tests/guest-layout.test.js`
- Modify: `js/main.js`

- [ ] **Step 1: 실패하는 테스트** — `tests/api.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateEntry, fetchMessages, postMessage } from '../js/api.js';

test('validateEntry: 닉네임 2~10, 메시지 1~100, characterId 0~9', () => {
  assert.equal(validateEntry({ nickname: '민우', characterId: 0, message: '축하해요' }).ok, true);
  assert.deepEqual(validateEntry({ nickname: '민우', characterId: 0, message: '  축하해요  ' }).value,
    { nickname: '민우', characterId: 0, message: '축하해요' });
  assert.match(validateEntry({ nickname: '민우', characterId: 0, message: '  ' }).error, /메시지/);
  assert.match(validateEntry({ nickname: '민우', characterId: 0, message: 'a'.repeat(101) }).error, /100자/);
  assert.match(validateEntry({ nickname: '민우', characterId: 10, message: 'hi' }).error, /캐릭터/);
  assert.match(validateEntry({ nickname: 'a', characterId: 0, message: 'hi' }).error, /닉네임/);
});

test('fetchMessages: 배열이면 정규화해서 반환, 실패면 []', async () => {
  const okFetch = async () => ({ ok: true, json: async () => [{ t: 1, n: '민우', c: 3, m: '축하' }, { bad: true }] });
  assert.deepEqual(await fetchMessages('u', { fetchImpl: okFetch }), [{ t: 1, n: '민우', c: 3, m: '축하' }]);
  assert.deepEqual(await fetchMessages('u', { fetchImpl: async () => { throw new Error('x'); } }), []);
  assert.deepEqual(await fetchMessages('u', { fetchImpl: async () => ({ ok: false }) }), []);
  assert.deepEqual(await fetchMessages('', { fetchImpl: okFetch }), [], 'URL 비어 있으면 호출 없이 []');
});

test('postMessage: text/plain JSON POST, 응답 ok 전달', async () => {
  let seen;
  const f = async (url, init) => { seen = { url, init }; return { ok: true, json: async () => ({ ok: true }) }; };
  const r = await postMessage('https://x/exec', { nickname: '민우', characterId: 1, message: 'hi' }, { fetchImpl: f });
  assert.equal(r.ok, true);
  assert.equal(seen.init.method, 'POST');
  assert.equal(seen.init.headers['Content-Type'], 'text/plain;charset=utf-8');
  assert.deepEqual(JSON.parse(seen.init.body), { nickname: '민우', characterId: 1, message: 'hi' });
  const bad = await postMessage('https://x/exec', {}, { fetchImpl: async () => ({ ok: true, json: async () => ({ ok: false, error: '너무 빨라요' }) }) });
  assert.deepEqual(bad, { ok: false, error: '너무 빨라요' });
  const net = await postMessage('https://x/exec', {}, { fetchImpl: async () => { throw new Error('offline'); } });
  assert.equal(net.ok, false);
  assert.match(net.error, /잠시 후/);
});
```

- [ ] **Step 2: 실패하는 테스트** — `tests/guest-layout.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freeTiles, pickTiles } from '../js/world/guest-layout.js';

const rows = ['HHHH', 'HGPH', 'HWGH', 'HHHH'];

test('freeTiles: G/W 타일 중 제외 집합에 없는 것', () => {
  assert.deepEqual(freeTiles(rows, new Set(['1,1'])), [{ tx: 1, ty: 2 }, { tx: 2, ty: 2 }]);
});

test('pickTiles: 결정적, 중복 없음, 개수 제한', () => {
  const tiles = Array.from({ length: 20 }, (_, i) => ({ tx: i, ty: 0 }));
  const a = pickTiles(tiles, 5, 42), b = pickTiles(tiles, 5, 42);
  assert.deepEqual(a, b);
  assert.equal(new Set(a.map((t) => t.tx)).size, 5);
  assert.equal(pickTiles(tiles, 50, 1).length, 20);
  assert.notDeepEqual(pickTiles(tiles, 5, 1), pickTiles(tiles, 5, 2));
});
```

- [ ] **Step 3: 실패 확인** — `npm test` → FAIL (2개 모듈 없음)

- [ ] **Step 4: api.js**

```js
import { PRESET_COUNT } from './sprites/characters.js';
import { validateNickname } from './state.js';

export const MESSAGE_MAX = 100;

export function validateEntry({ nickname, characterId, message }) {
  const n = validateNickname(nickname);
  if (!n.ok) return { ok: false, error: n.error };
  if (!Number.isInteger(characterId) || characterId < 0 || characterId >= PRESET_COUNT) return { ok: false, error: '캐릭터 정보가 올바르지 않아요' };
  const m = (message ?? '').toString().trim();
  if (m.length < 1) return { ok: false, error: '메시지를 입력해 주세요' };
  if (m.length > MESSAGE_MAX) return { ok: false, error: `메시지는 ${MESSAGE_MAX}자 이하로 해주세요` };
  return { ok: true, value: { nickname: n.value, characterId, message: m } };
}

const isEntry = (e) => e && typeof e.n === 'string' && typeof e.m === 'string' && Number.isInteger(e.c);

/** @returns {Promise<{t:number,n:string,c:number,m:string}[]>} 실패 시 [] */
export async function fetchMessages(url, { fetchImpl = globalThis.fetch, timeoutMs = 5000 } = {}) {
  if (!url) return [];
  try {
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
    const res = await fetchImpl(url, { signal: ctrl?.signal, cache: 'no-store' });
    if (timer) clearTimeout(timer);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.filter(isEntry) : [];
  } catch (e) {
    console.warn('방명록 불러오기 실패', e);
    return [];
  }
}

/** Apps Script는 text/plain POST면 CORS 프리플라이트 없이 받는다 */
export async function postMessage(url, entry, { fetchImpl = globalThis.fetch } = {}) {
  try {
    const res = await fetchImpl(url, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(entry),
    });
    if (!res.ok) return { ok: false, error: '잠시 후 다시 시도해 주세요' };
    const data = await res.json();
    return data.ok ? { ok: true } : { ok: false, error: data.error || '잠시 후 다시 시도해 주세요' };
  } catch {
    return { ok: false, error: '잠시 후 다시 시도해 주세요' };
  }
}
```

- [ ] **Step 5: guest-layout.js**

```js
/** rows에서 'G' 또는 'W' 타일 중 exclude("tx,ty")에 없는 타일 목록(행 우선) */
export function freeTiles(rows, exclude = new Set()) {
  const out = [];
  rows.forEach((row, ty) => [...row].forEach((ch, tx) => {
    if ((ch === 'G' || ch === 'W') && !exclude.has(`${tx},${ty}`)) out.push({ tx, ty });
  }));
  return out;
}

/** 결정적 셔플(LCG) 후 앞에서 count개. 같은 seed면 같은 결과. */
export function pickTiles(tiles, count, seed) {
  const arr = tiles.slice();
  let s = (seed >>> 0) || 1;
  const rnd = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr.slice(0, Math.min(count, arr.length));
}
```

- [ ] **Step 6: 통과 확인** — `npm test` → `# pass 67`

- [ ] **Step 7: guestbook.js**

```js
import { Scene, standPos } from './scene.js';
import { HUB_DOORS } from './hub.js';
import { freeTiles, pickTiles } from './guest-layout.js';
import { showOverlay } from '../ui/overlay.js';
import { toast } from '../ui/toast.js';
import { esc } from '../ui/dom.js';
import { validateEntry, postMessage, MESSAGE_MAX } from '../api.js';

const ROWS = [
  'HHHHHHHHHHH',
  'HWGGGGGGGWH',
  'HGGGGGGGGGH',
  'HGGGGGGGGGH',
  'HGGGGGGGGGH',
  'HGWGGGGGWGH',
  'HGGGGGGGGGH',
  'HGGGGGGGGGH',
  'HWGGGGGGGWH',
  'HGGGGPGGGGH',
  'HGGGGPGGGGH',
  'HHHHHPHHHHH',
];
const MAILBOX = { tx: 5, ty: 3 };
const EXIT = { tx: 5, ty: 11 };
const SPAWN = { tx: 5, ty: 10 };
const RESERVED = new Set(['5,3', '5,4', '5,9', '5,10', '4,10', '6,10']); // 우체통, 그 앞, 입구 근처
const POST_COOLDOWN_MS = 60_000;
let lastPostAt = 0;

export class GuestbookScene extends Scene {
  constructor(game) {
    super({
      id: 'guestbook', rows: ROWS, spawn: SPAWN,
      entrances: [{ ...EXIT, to: 'hub', spawn: HUB_DOORS.guestbook.back }],
      objects: [
        { id: 'door', sprite: 'door', floor: true, ...EXIT },
        { id: 'mailbox', sprite: 'mailbox', ...MAILBOX, interact: () => this.openForm(game) },
      ],
    });
    this.game = game;
    this.baseObjects = this.objects.slice();
    this.setEntries(game.data.messages);
  }

  /** 메시지 목록 → 꽃 오브젝트 재배치 */
  setEntries(entries) {
    this.entries = entries;
    const tiles = pickTiles(freeTiles(ROWS, RESERVED), Math.min(entries.length, 40), 7);
    const flowers = tiles.map((t, i) => ({
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
          this.setEntries(game.data.messages);
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
```

- [ ] **Step 8: main.js 수정** — 데이터 로드와 씬 등록

```js
import { createGuestbook } from './world/guestbook.js';
import { fetchMessages } from './api.js';
// ... Game 생성 전
const game = new Game({ canvas, frame, config, profile,
  scenes: { hub: createHub, info: createInfo, gallery: createGallery, story: createStory, guestbook: createGuestbook }, ui: {} });
game.assets = assets;
game.data = { messages: [] };
game.ui.hud = createHud(document.getElementById('hud'), config, game);
game.start('hub');

async function refreshMessages() {
  const list = await fetchMessages(config.guestbookApi);
  if (list.length) { game.data.messages = list; game.onMessagesChanged?.(); }
}
refreshMessages();
setInterval(refreshMessages, 60_000);
```

`game.onMessagesChanged`는 Task 19에서 허브/정원 갱신으로 연결한다. 지금은 undefined라 호출되지 않는다. 정원 씬은 처음 입장 시점의 `game.data.messages`로 꽃을 만든다.

- [ ] **Step 9: Apps Script** — `apps-script/Code.gs`

```js
// Google 스프레드시트 확장 프로그램 → Apps Script에 붙여넣고 "웹 앱"으로 배포(실행: 나, 액세스: 모든 사용자).
// 시트 1행 헤더: timestamp | nickname | characterId | message
const SHEET_NAME = 'guestbook';
const MAX_ROWS = 100;
const COOLDOWN_SEC = 60;

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) { sh = ss.insertSheet(SHEET_NAME); sh.appendRow(['timestamp', 'nickname', 'characterId', 'message']); }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  const sh = sheet_();
  const last = sh.getLastRow();
  if (last < 2) return json_([]);
  const from = Math.max(2, last - MAX_ROWS + 1);
  const rows = sh.getRange(from, 1, last - from + 1, 4).getValues();
  const out = rows.map(r => ({ t: new Date(r[0]).getTime(), n: String(r[1]), c: Number(r[2]), m: String(r[3]) })).reverse();
  return json_(out);
}

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: '잘못된 요청' }); }
  const nickname = String(body.nickname || '').trim();
  const message = String(body.message || '').trim();
  const characterId = Number(body.characterId);
  if (nickname.length < 2 || nickname.length > 10) return json_({ ok: false, error: '닉네임은 2~10자' });
  if (message.length < 1 || message.length > 100) return json_({ ok: false, error: '메시지는 1~100자' });
  if (!Number.isInteger(characterId) || characterId < 0 || characterId > 9) return json_({ ok: false, error: '캐릭터 오류' });

  const cache = CacheService.getScriptCache();
  const key = 'nick:' + nickname;
  if (cache.get(key)) return json_({ ok: false, error: '1분에 한 번만 남길 수 있어요' });

  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    sheet_().appendRow([new Date(), nickname, characterId, message]);
    cache.put(key, '1', COOLDOWN_SEC);
  } finally { lock.releaseLock(); }
  return json_({ ok: true });
}
```

- [ ] **Step 10: 브라우저 확인**

(1) `guestbookApi` 빈 상태: 우체통 탭 → "아직 열리지 않았어요". (2) 테스트용 시트에 Apps Script를 배포하고 URL을 config에 넣은 뒤: 메시지 입력 → 보내기 → 토스트 + 캐릭터 말풍선 + 꽃 1송이 추가. 꽃 탭 → 메시지 팝업. 1분 안에 다시 보내면 에러 문구. 시트에 행이 추가됐는지 확인. 확인 후 테스트 URL은 config에서 지우거나 그대로 두어도 된다(신랑신부가 실제 URL로 교체).

- [ ] **Step 11: 커밋**

```bash
git add js/api.js js/world/guest-layout.js js/world/guestbook.js js/main.js apps-script/Code.gs tests/api.test.js tests/guest-layout.test.js
git commit -m "feat: guestbook garden with Apps Script backend and flower entries

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 18: 마음 전하는 곳 (계좌·공유)

**Files:**
- Create: `js/world/gifts.js`
- Modify: `js/main.js`

- [ ] **Step 1: gifts.js**

```js
import { Scene } from './scene.js';
import { HUB_DOORS } from './hub.js';
import { showOverlay } from '../ui/overlay.js';
import { toast } from '../ui/toast.js';
import { esc, copyText } from '../ui/dom.js';

const ROWS = [
  'HHHHHHHHHHH',
  'HSSSSSSSSSH',
  'HSSSSSSSSSH',
  'HSSSSSSSSSH',
  'HSSSSSSSSSH',
  'HSSSSSSSSSH',
  'HSSSSSSSSSH',
  'HHHHHPHHHHH',
];
const EXIT = { tx: 5, ty: 7 };

function accountHtml(label, acc) {
  if (!acc || !acc.number) return '';
  return `<p><b>${esc(label)}</b> ${esc(acc.bank)} ${esc(acc.number)} (${esc(acc.holder)})
    <button class="btn copy" data-num="${esc(acc.number)}">복사</button>
    ${acc.kakaopay ? `<a class="btn" target="_blank" rel="noopener" href="${esc(acc.kakaopay)}">카카오페이</a>` : ''}</p>`;
}

function showAccounts(game, side, person) {
  const html = [
    accountHtml(side, person.account),
    ...person.parents.map((p) => accountHtml(`${side} ${p.role}`, p.account)),
  ].join('') || '<p class="muted">계좌 정보가 아직 없어요.</p>';
  const { card } = showOverlay(game, { title: `${side}측에 마음 전하기`, html });
  card.querySelectorAll('.copy').forEach((b) => {
    b.onclick = async () => toast((await copyText(b.dataset.num)) ? '계좌번호를 복사했어요' : '복사에 실패했어요');
  });
}

async function loadKakao(key) {
  if (window.Kakao?.isInitialized?.()) return window.Kakao;
  await new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';
    s.crossOrigin = 'anonymous'; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
  window.Kakao.init(key);
  return window.Kakao;
}

function showShare(game) {
  const cfg = game.config;
  const url = cfg.siteUrl || location.href.split('#')[0];
  const title = `${cfg.groom.name} ♥ ${cfg.bride.name} 결혼합니다`;
  const buttons = [
    { label: '링크 복사', onClick: async () => { toast((await copyText(url)) ? '링크를 복사했어요' : '복사에 실패했어요'); return true; } },
  ];
  if (navigator.share) buttons.push({ label: '공유하기', onClick: async () => { try { await navigator.share({ title, url }); } catch {} return true; } });
  if (cfg.kakaoJsKey) buttons.push({ label: '카카오톡', primary: true, onClick: async () => {
    try {
      const K = await loadKakao(cfg.kakaoJsKey);
      K.Share.sendDefault({ objectType: 'feed', content: { title, description: '픽셀 가든에서 만나요', imageUrl: `${url.replace(/\/[^/]*$/, '/')}og.png`, link: { mobileWebUrl: url, webUrl: url } } });
    } catch { toast('카카오톡 공유를 열 수 없어요'); }
    return true;
  } });
  buttons.push({ label: '닫기' });
  showOverlay(game, { title: '청첩장 공유', html: `<p class="muted">${esc(url)}</p>`, buttons });
}

export function createGifts(game) {
  const cfg = game.config;
  return new Scene({
    id: 'gifts', rows: ROWS, bg: '#2a2f33', spawn: { tx: 5, ty: 6 },
    entrances: [{ ...EXIT, to: 'hub', spawn: HUB_DOORS.gifts.back }],
    objects: [
      { id: 'door', sprite: 'door', floor: true, ...EXIT },
      { id: 'groom-chest', sprite: 'chest', tx: 3, ty: 2, interact: () => showAccounts(game, '신랑', cfg.groom) },
      { id: 'bride-chest', sprite: 'chest', tx: 7, ty: 2, interact: () => showAccounts(game, '신부', cfg.bride) },
      { id: 'share', sprite: 'stone', tx: 5, ty: 4, interact: () => showShare(game) },
    ],
  });
}
```

`config.json`의 `parents[]` 항목에 선택적으로 `"account": {"bank":"","number":"","holder":"","kakaopay":""}`를 넣으면 혼주 계좌도 표시된다(없으면 생략). 카카오톡 공유 이미지는 루트의 `og.png`(선택, 신랑신부가 추가)를 가리킨다.

- [ ] **Step 2: main.js에 `gifts: createGifts` 등록**

- [ ] **Step 3: 브라우저 확인**

허브 하단 문(5,15) → 돌바닥 정자. 왼쪽 보관함 → 신랑측 계좌 팝업, "복사" → 토스트. 비석 → 링크 복사 동작. `kakaoJsKey` 비어 있으면 카카오톡 버튼 없음.

- [ ] **Step 4: 커밋**

```bash
git add js/world/gifts.js js/main.js
git commit -m "feat: gifts pavilion with account copy and share

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 19: 광장 하객 NPC + 데이터 갱신 연결 + README + 최종 점검

**Files:**
- Modify: `js/world/hub.js`, `js/main.js`
- Create: `README.md`, `tests/hub-guests.test.js`

- [ ] **Step 1: 실패하는 테스트** — `tests/hub-guests.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guestPlacements } from '../js/world/hub.js';

test('guestPlacements: 최대 30명, 길/오브젝트/주인공 타일 제외, 결정적', () => {
  const entries = Array.from({ length: 40 }, (_, i) => ({ t: i, n: `손님${i}`, c: i % 10, m: `축하 ${i}` }));
  const reserved = new Set(['4,3', '6,3', '5,8']);
  const a = guestPlacements(entries, reserved);
  assert.equal(a.length, 30);
  assert.deepEqual(a, guestPlacements(entries, reserved));
  for (const g of a) {
    assert.ok(!reserved.has(`${g.tx},${g.ty}`));
    assert.ok(g.entry.n.startsWith('손님'));
  }
  assert.equal(new Set(a.map((g) => `${g.tx},${g.ty}`)).size, 30, '타일 중복 없음');
});
```

- [ ] **Step 2: 실패 확인** — `npm test` → FAIL (`guestPlacements` 없음)

- [ ] **Step 3: hub.js 수정** — `guestPlacements` 추가, `HubScene.setGuests`

파일 상단 import에 추가:
```js
import { presetSprites } from '../sprites/characters.js';
import { freeTiles, pickTiles } from './guest-layout.js';
```

`HUB_DOORS` 아래에 추가:
```js
export const MAX_GUESTS = 30;

/** 방명록 항목 → 광장 잔디 위 하객 자리. reserved: "tx,ty" 제외 집합 */
export function guestPlacements(entries, reserved) {
  const list = entries.slice(0, MAX_GUESTS);
  const tiles = pickTiles(freeTiles(HUB_ROWS, reserved), list.length, 2026);
  return tiles.map((t, i) => ({ tx: t.tx, ty: t.ty, entry: list[i] }));
}
```

`HubScene`에 메서드 추가(생성자 끝에 `this.baseNpcs = this.npcs.slice(); this.setGuests(game.data?.messages ?? []);` 도 추가):
```js
  setGuests(entries) {
    // 오브젝트 발자국 + 주인공 + spawn + 문 주변은 비워둔다
    const reserved = new Set(this.extraSolid);
    for (const [, d] of Object.entries(HUB_DOORS)) { reserved.add(`${d.door.tx},${d.door.ty}`); reserved.add(`${d.back.tx},${d.back.ty}`); }
    reserved.add(`${HUB_SPAWN.tx},${HUB_SPAWN.ty}`);
    for (const h of this.hosts) reserved.add(`${Math.floor(h.x / 16)},${Math.floor((h.y - 1) / 16)}`);
    for (const n of this.npcs) if (!this.baseNpcs.includes(n)) reserved.delete(`${Math.floor(n.character.x / 16)},${Math.floor((n.character.y - 1) / 16)}`);

    const guests = guestPlacements(entries, reserved).map(({ tx, ty, entry }) => {
      const c = new Character({ sprites: presetSprites(entry.c % 10), name: entry.n, ...standPos(tx, ty) });
      c.dir = ['down', 'left', 'right'][(tx + ty) % 3];
      return { character: c, interact: () => c.say(entry.m, 4) };
    });
    this.npcs = [...this.baseNpcs, ...guests];
    this.rebuildSolid();
  }
```

> `reserved`를 `extraSolid`에서 시작하므로 이전 하객 자리도 포함되는데, 바로 위 루프에서 이전 하객 타일은 다시 빼준다. 그래야 갱신할 때 같은 자리를 재사용할 수 있다.

- [ ] **Step 4: 통과 확인** — `npm test` → `# pass 68`

- [ ] **Step 5: main.js — 갱신 연결**

`game.start('hub')` 앞에:
```js
game.onMessagesChanged = () => {
  game.scenes.hub?.setGuests(game.data.messages);
  game.scenes.guestbook?.setEntries(game.data.messages);
};
```
그리고 `refreshMessages` 안에서 이미 `game.onMessagesChanged?.()`를 호출하므로 추가 변경 없음. 탭 복귀 시에도 갱신:
```js
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshMessages(); });
```

- [ ] **Step 6: 최종 main.js 전체(확인용)**

```js
import { Game } from './game.js';
import { loadConfig } from './config.js';
import { loadProfile, saveProfile } from './state.js';
import { fetchMessages } from './api.js';
import { showIntro } from './ui/intro.js';
import { createHud } from './ui/hud.js';
import { createHub } from './world/hub.js';
import { createInfo } from './world/info.js';
import { createGallery } from './world/gallery.js';
import { createStory } from './world/story.js';
import { createGuestbook } from './world/guestbook.js';
import { createGifts } from './world/gifts.js';

async function loadManifest() {
  try { const r = await fetch('gallery/manifest.json', { cache: 'no-cache' }); return r.ok ? await r.json() : []; }
  catch { return []; }
}

const canvas = document.getElementById('game');
const frame = document.getElementById('frame');
const [config, gallery] = await Promise.all([loadConfig(), loadManifest()]);
document.title = `${config.groom.name} ♥ ${config.bride.name} 결혼합니다`;

let profile = loadProfile();
if (!profile) {
  profile = await showIntro(document.getElementById('intro'), config);
  saveProfile(profile);
}

const game = new Game({
  canvas, frame, config, profile,
  scenes: { hub: createHub, info: createInfo, gallery: createGallery, story: createStory, guestbook: createGuestbook, gifts: createGifts },
  ui: {},
});
game.assets = { gallery };
game.data = { messages: [] };
game.ui.hud = createHud(document.getElementById('hud'), config, game);
game.onMessagesChanged = () => {
  game.scenes.hub?.setGuests(game.data.messages);
  game.scenes.guestbook?.setEntries(game.data.messages);
};
game.start('hub');

async function refreshMessages() {
  const list = await fetchMessages(config.guestbookApi);
  if (list.length) { game.data.messages = list; game.onMessagesChanged(); }
}
refreshMessages();
setInterval(refreshMessages, 60_000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshMessages(); });
```

- [ ] **Step 7: README.md**

```markdown
# 픽셀 가든 모바일 청첩장

터치로 캐릭터를 움직여 가든 웨딩 맵을 돌아다니는 모바일 청첩장. 빌드 없이 정적 파일만으로 동작한다.

## 로컬 실행
npm test          # 단위 테스트
npm run serve     # http://localhost:5173

## 내용 수정
- `data/config.json`: 이름, 날짜(`+09:00` 포함 ISO), 장소, 지도 링크, 교통, 연락처, 계좌, 인사말, 타임라인
- `gallery/`: 사진 파일을 넣고 `gallery/manifest.json`에 파일명 배열로 적는다. 긴 변 1600px 이하 권장.
- 혼주 계좌: `parents[]` 항목에 `"account": {...}` 추가(선택)
- 카카오톡 공유: Kakao Developers에서 JavaScript 키 발급 → `kakaoJsKey`. 플랫폼에 배포 도메인 등록. 루트에 `og.png`(1200×630) 추가 권장.

## 방명록(Google 스프레드시트) 연결
1. 새 스프레드시트 → 확장 프로그램 → Apps Script → `apps-script/Code.gs` 내용 붙여넣기
2. 배포 → 새 배포 → 유형 "웹 앱", 실행 주체 "나", 액세스 "모든 사용자" → 배포
3. 생성된 `https://script.google.com/macros/s/.../exec` URL을 `data/config.json`의 `guestbookApi`에 넣는다
4. 메시지는 `guestbook` 시트에 쌓인다. 부적절한 행은 시트에서 삭제하면 1분 안에 사라진다.

## 배포(GitHub Pages)
1. GitHub에 저장소 생성 후 이 폴더를 push
2. Settings → Pages → Source: Deploy from a branch, Branch: main / (root)
3. 발급된 URL을 `data/config.json`의 `siteUrl`에 넣고 다시 push

## 한계
- 갤러리 뷰어는 길게 누르기 저장·우클릭·드래그를 막고 탭 전환 시 닫히지만, OS 스크린샷·화면 녹화는 막을 수 없다.
- 하객 캐릭터와 방명록 꽃은 접속 시점 + 1분 간격으로 갱신된다(실시간 아님).
```

- [ ] **Step 8: 전체 수동 QA(내장 브라우저 375×812, 시크릿)**

- [ ] 인트로: 닉네임 검증, 캐릭터 10종 순환, 입장
- [ ] 허브: 신랑신부 말풍선, 표지판 토스트, 5개 문 모두 진입/복귀, 복귀 위치가 문 바로 위
- [ ] 안내소: 입장 팝업 1회, 5개 오브젝트 팝업, 주소 복사, ics 다운로드
- [ ] 갤러리: 빈 상태 표지판 / 사진 있을 때 썸네일·뷰어·스와이프·탭 전환 시 닫힘
- [ ] 이야기 길: 이정표 팝업, 벤치 장면
- [ ] 방명록: API 없을 때 안내 / 있을 때 전송·꽃 추가·쿨다운
- [ ] 마음 전하기: 계좌 복사, 링크 복사
- [ ] HUD: D-day, 방 안에서만 "광장으로" 버튼
- [ ] PC 폭(1200px)에서 가운데 430px 폰 프레임, 배율 2
- [ ] 콘솔 에러 0 (방명록 API 미설정 시 warn은 허용)
- [ ] `npm test` 전부 통과

- [ ] **Step 9: 커밋**

```bash
git add js/world/hub.js js/main.js README.md tests/hub-guests.test.js
git commit -m "feat: hub guest NPCs from guestbook, periodic refresh, README

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## 계획 자체 점검 결과

**스펙 커버리지**
- 인트로(닉네임·캐릭터·localStorage) → Task 11
- 허브(아치·신랑신부·나무·입구 5개·하객 NPC·HUD) → Task 12, 13, 19
- 예식 안내소(안내 팝업·지도·전화·달력·교통) → Task 14
- 갤러리(manifest 자동 액자·썸네일·확대·스와이프·캡처 억제 4종) → Task 15
- 우리 이야기 길(이정표 타임라인·벤치) → Task 16
- 방명록(우체통 폼·Apps Script·꽃·하트·쿨다운) → Task 17
- 마음 전하는 곳(계좌 복사·카카오페이·공유) → Task 18
- 렌더링(176px, 정수 배율, pixelated, PC 폰 프레임) → Task 1, 10
- 에러 처리(API 실패·사진 실패·config 누락·localStorage 불가) → Task 11, 12, 15, 17
- 범위 밖 항목(실시간, 비트맵 폰트, RSVP)은 포함하지 않음

**스펙과 달라진 점(스펙에 이미 반영)**
- 비트맵 폰트 대신 canvas `fillText`(Galmuri 웹폰트)로 닉네임·말풍선을 그림
- 내부 폭 180px → 176px(타일 11개)
- 방명록 꽃 메시지는 말풍선이 아니라 팝업 카드로 표시(가독성). 광장 하객 캐릭터는 스펙대로 말풍선

**타입/이름 일관성 확인**
- `Scene` 옵션: `id, rows, spawn, objects, entrances, npcs, bg, onEnter` / 오브젝트: `id, sprite, tx, ty, solid, floor, stand, interact` — 모든 씬에서 동일하게 사용
- `game.goTo(id, spawn)`, `game.paused`, `game.config`, `game.profile`, `game.data.messages`, `game.assets.gallery`, `game.onMessagesChanged`, `game.ui.hud.onScene` — Task 10/12/15/17/19에서 같은 이름
- renderer 어댑터 메서드: `drawTile, drawSprite, drawCanvas, drawNameTag, drawBubble, drawFade, begin, resize` — Scene/Gallery/Game에서 같은 이름
- `HUB_DOORS[id].back`을 모든 방의 복귀 spawn으로 사용
