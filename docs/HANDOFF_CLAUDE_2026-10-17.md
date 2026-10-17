# Claude 수정 인수인계 (2026-10-17)

Codex가 다음 작업 전에 읽을 문서다. 오늘 Claude가 바꾼 내용, 지켜야 할 결정, 남은 일을 정리했다.
자세한 배경은 `docs/superpowers/specs/2026-10-17-v2-upgrade-design.md`의 10절·13절에 있다.

- 관련 커밋: `8e8adb4`(이야기 길 제거·광장 확장), `04b6a4f`(사용자 요청 6건)
- 커밋 시점 테스트: `npm test` 106개 통과
- 원격 저장소 연결·push 금지, 로컬 커밋만 가능

## 1. 사용자 결정 사항 (되돌리지 말 것)

| 결정 | 현재 상태 |
|---|---|
| 우리 이야기 길 제외 | `story` 씬·`story-layout`·관련 테스트·메뉴 항목·`config.timeline` 모두 삭제됨 |
| 광장 문 배치 | 왼쪽 위 **방명록**, 오른쪽 위 **갤러리**, 왼쪽 아래 **마음 전하는 곳**, 오른쪽 아래 **예식 안내소** |
| 축의금 사양 | `config.gifts.declineMoney = true`. 마음 전하는 곳에서 계좌를 보여 주지 않고, 초대하지 못한 사과와 축의금 사양 편지를 보여 준다 |
| 하객이 적어도 광장이 붐비게 | 실제 하객이 10명보다 적으면 이름이 "하객"인 캐릭터로 채운다 |
| 막힌 곳을 눌러도 거절하지 않기 | "그곳으로 갈 수 없어요" 말풍선은 없앴다. 가장 가까운 갈 수 있는 칸으로 걸어간다 |
| 혼주 표기 | 예식 안내에 "진영근 · 박순이 의 아들 진민우", "한성훈 · 이주영 의 딸 한새암"(사용자 후속 요청: 부모님 이름 뒤 한 칸) |
| 일반형 청첩장 | 사용자가 별도 제작. 이 프로젝트는 `config.classicUrl` 링크만 둔다 |
| API·실사진 | 마지막 단계에 한 번에 연결. 그전까지 방명록은 기기 저장 미리보기 |

## 2. 변경 내용

### 2.1 광장 (`js/world/hub.js`)
- 크기: 11열 × **27행**(352×864). 정원 17행(`GARDEN_ROWS`), 아래에 교차로 2줄과 문 블록 2개.
- 문 위치는 `BLOCK_A`(19행)·`BLOCK_B`(23행) 상수로 계산한다. 숫자를 직접 쓰지 말고 이 상수와 `HUB_DOORS`를 쓴다.
- 장식: 큰 나무는 아치 아래 한 쌍(`tx 1`, `tx 7`, `ty 5`)만. 그 아래 가장자리는 2칸 덤불. 하객 자리를 확보하기 위한 배치다.
- 하객 간격 `tooClose(a, b)`: 같은 열은 위아래 1칸, 옆 열은 같은 줄만 금지(대각선 허용). 배치와 배회(`scene.js pickWanderTile`)가 같은 규칙을 쓴다.
- 분위기용 하객:
  - `MIN_CROWD = 10`, `withExtras(guests)`가 부족분을 `{ n: '하객', m: '', extra: i }`로 채운다.
  - 하객 식별 키는 `guestKey(entry)`. 분위기용은 `extra:<i>`, 실제 하객은 `닉네임:캐릭터`.
  - 메시지가 비어 있어 "지금까지 N개의 축하" 개수와 방명록 목록에는 잡히지 않는다.
  - 실제 하객이 늘면 그만큼 분위기용이 줄어든다.

### 2.2 이동 (`js/world/movement.js`, `js/world/scene.js`)
- `reachableTiles(w, h, blocked, from)`: 걸어서 닿을 수 있는 칸 전부(BFS).
- `Scene.walkTo`: 목적지가 막혔거나 경로가 없으면 닿을 수 있는 칸 중 목적지에 가장 가까운 칸으로 간다.
  - 입구 칸은 후보에서 제외한다(방으로 빨려 들어가지 않게).
  - `onArrive`(상호작용)는 원래 목적지에 도착했을 때만 부른다.
  - 도착하면 누른 방향을 바라본다.

### 2.3 마음 전하는 곳 (`js/world/gifts.js`, `js/ui/hud.js`)
- `showGiftsNotice(game)`: `config.gifts.notice`를 보여 주고 "축하 남기기" 버튼으로 방명록 작성에 연결한다.
- `declineMoney`가 true면 첫 입장 때 편지를 자동으로 띄운다.
  - 계좌 상자 대신 `welcome-board`("두 사람의 편지")와 `wedding-mailbox`("축하 남기기")를 둔다.
  - HUD 링크도 "두 사람의 편지 →"로 바뀐다.
- `declineMoney`가 false면 예전처럼 신랑측·신부측 계좌 상자를 보여 준다.
- 공유 편지 소품은 6행으로 올렸다. 입장한 캐릭터와 겹치지 않게 하기 위해서다.

### 2.4 예식 안내 (`js/world/info.js`, `js/config.js`)
- `familyLine(person)`: `parents[].name`을 " · "로 잇고 `relation`(아들/딸)과 본명을 붙인다.
- `infoHtml` 맨 위에 두 줄로 표시한다(`.family-lines`).

### 2.5 줄바꿈과 문구 (`css/style.css`, `data/config.json`)
- `html, body`에 `word-break: keep-all; overflow-wrap: break-word;`를 넣어 한국어를 어절 단위로 줄바꿈한다.
- `.cover-notice`에 `text-wrap: balance`를 넣었다.
- `wedding.notice`와 `gifts.notice`는 `\n`으로 의미 단위 줄을 직접 나눴다.
  - 문구를 바꿀 때는 320px 폭에서 한 줄이 넘치지 않는지 확인한다.
- 추가 CSS: `.family-lines`, `.gifts-notice`.

### 2.6 기타
- `objectSprite`는 PNG 전용 장식의 코드 그림이 없을 때 투명 1칸을 돌려준다.
  - Codex의 `missing` 처리(충돌·탭 제외)와 함께 동작한다.
- 테스트 갱신:
  - 실제 PNG 크기로 광장 수용 인원 검사(30명 중 20명 이상)
  - 문 배치 검사
  - `withExtras` 검사
  - 막힌 곳 → 가까운 칸 이동 검사

## 3. 새 config 항목 (`data/config.json`)

```json
"groom": { "relation": "아들" },
"bride": { "relation": "딸" },
"gifts": {
  "declineMoney": true,
  "notice": "저희 예식은 양가 직계가족만 모시고\n조용히 올리게 되어, ..."
}
```

`timeline`은 삭제했다. 기본값은 `js/config.js`의 `DEFAULT_CONFIG`에 있다.

## 4. 주의할 점

- **줄바꿈 문자**: Claude가 파일을 다시 쓰면서 일부 파일이 CRLF에서 LF로 바뀌었다.
  - 대상: `css/style.css`, `js/world/movement.js`, `js/sprites/objects.js` 등.
  - 그래서 git diff 변경 줄 수가 실제보다 크다. 내용 변경은 `git diff -w --ignore-cr-at-eol`로 보면 몇 줄이다.
  - 앞으로는 LF로 통일하는 것을 권장한다. 줄바꿈만 다시 바꾸는 커밋은 하지 않는다.
- 광장 수용 인원을 검사할 때는 **실제 PNG 크기**를 써야 한다. 코드 대체 그림은 작아서 수용 인원이 부풀려진다.
- 하객 키(`닉네임:캐릭터`)는 임시다. 서로 다른 동명 하객 구분은 아래 남은 일의 guestId로 해결한다.

## 5. 남은 일 (데이터 연결 단계)

- 서버
  - 하객 식별을 기기 ID(guestId)로 바꾼다.
  - Apps Script 재설계: 방문 시트 분리, 전역 도배 방지, `=` 수식 주입 방지, `doGet` 캐시, 락 안에서 쿨다운 확인.
  - 설계 문서 5절 #3·#4·#5·#9·#11.
- 갤러리: 썸네일 파일을 따로 만든다. 지금은 원본 사진을 전부 받아 썸네일을 만든다(5절 #15).
- 공유: `og.png`(1200×630)와 `og:image`·`og:url` 메타를 추가한다.
- 실제 데이터: 연락처, 계좌(사양 정책 유지 시 불필요), 사진, API URL, `siteUrl`, `classicUrl`.
- 실제 iOS·Android·카카오톡 인앱 브라우저 확인.

## 6. Codex 후속: 단상·버진로드·꽃장식 (2026-10-17)

사용자의 후속 요청에 따라 위 인수인계와 04b6a4f를 확인하고 적용했다. 1절 사용자 결정은 유지했다.

- 월드 크기는 352×864, 네 문 위치는 그대로다. `CEREMONY`가 장면 수치를 모은다.
- 신랑 발 중심 (157,176), 신부 (192,176): 중심 간격 48→35px, 단상 윗면으로 발 위치를 12px 올렸다.
  기존 애즈펌·올림머리 PNG와 모션은 변경하지 않았다. 커버에도 단상과 같은 인물 간격을 적용했다.
- `aisle-runner` 96×32 바닥 조각을 tx4, ty5~25에 반복한다. 단상보다 먼저 그려 시작이 단상 밑에 들어간다.
- 꽃장식 `aisle-flower-left/right`는 32×32 프레임, 실제 꽃 폭 16px. tx4/6, ty6~17을 이어 중앙 64px를 비운다.
  방 앞 교차로는 꽃장식 구간 밖이므로 좌우 문으로 자연스럽게 이동할 수 있다.
- 모두 `floor:true`로 정적 바닥 캐시에 합성하고 충돌을 만들지 않는다. 하객 예약에서도 바닥 장식을 제외한다.
- 하객 구역은 [1,2,3,7,8,9]열로 바꿔 버진로드를 비운다. 배회도 같은 구역에 제한된다.
  안내인은 (3,CROSS_A)로 옮겼다. 실제 선택 PNG 기준 30명 중 **21명** 배치(길 위까지 채우던 29명과 배치 목적이 다름).
  `MIN_CROWD=10`, 실제/분위기 하객 키, 빈 메시지 처리, 최근접 이동 로직은 그대로다.
- 최초 위치는 (5,8). 처음 진입할 때 두 사람의 얼굴이 상단 HUD에 가려지는 현상을 줄였다.
- 새 에셋 3종만 내장 이미지 도구로 생성·준비했다. 기존 PNG는 전부 보존했다.
  프롬프트 `assets/ceremony-prompts.json`, bbox/알파 `assets/ceremony-report.json`, 반복 미리보기 `assets/ceremony-preview.png`.
- `tools/prepare_ceremony_assets.py`로 세 조각만 재변환한다. 원본은 `raw/ceremony-source/`(Git 제외).
  일반 변환기도 꽃 조각의 투명 여백을 가운데로 옮기지 않도록 특별 처리했다. 캐릭터 전체 재변환은 하지 마라.
- 테스트 **110개 통과**. 단상 발 위치/두 인물 개별 탭, 길의 연속성/합성 순서, 중앙 통로/네 문 경로,
  길 밖 하객 배치·배회, 에셋 누락 폴백을 검사했다. 390px·320px 비교 화면도 확인했다.
- API·실사진과 5절의 마지막 데이터 연결 범위는 그대로 보류한다.

## 7. Codex 후속: 웨딩홀 꽃장식 재작화 (2026-10-17)

사용자가 6절의 꽃띠가 너무 작아 꽃으로 보이지 않는다고 요청했다. **현재 꽃은 이 절을 우선한다.**

- [워커힐 공식 웨딩 안내](https://app.walkerhill.com/convention/Wedding)의 비스타홀·워커홀 사진을 시각적으로 확인했다.
  얇은 띠 대신 풍성한 꽃 덩어리를 양옆에 반복하는 구성을 참고했다. 사진 자체는 프로젝트에 복사하지 않았다.
- 내장 imagegen으로 아이보리 장미·분홍 장미·흰 수국이 크게 구분되는 새 꽃다발 원본을 만들었다.
  최종 `assets/objects/aisle-flower-left-v2.png`·`aisle-flower-right-v2.png`는 32×48, 실제 bbox (0,9,32,48), 24색·이진 알파다.
  기존 16px 꽃띠를 단순 확대하지 않고 새로 그렸으며, 이전 PNG도 그대로 보존한다.
- 기존 ID의 manifest.files 매핑이 새 파일을 선택한다. 오른쪽은 왼쪽의 정확한 반전이다.
- 배치: tx4/6, ty6/8/10/12/14/16. 양쪽 6개, 총 12개. 프레임 간격 64px로 꽃송이를 겹치지 않게 한다.
  48px 프레임 사이에 16px 여백이 있다. 마지막 장식은 y576에서 끝나 교차로를 가리지 않는다.
- 중앙 시각적 여백은 32px(플레이어 발 충돌 폭 20px). 비충돌 바닥이며 기존 이동·NPC 배치 정책을 유지한다.
  광장 하객 수용 인원 21명, 분위기용 10명, 단상/커플/커버/문 배치와 API·실사진 보류는 그대로다.
- 안전한 재변환: `python tools/prepare_hall_flowers.py`, 원본 `raw/hall-flowers-source/arrangement.png`.
  이전 `prepare_ceremony_assets.py`는 예전 꽃띠 원본도 만들지만, 현재 선택한 v2 매핑은 보존한다.
- 실제 프롬프트·사진 URL·처리: `assets/hall-flowers-prompts.json`. 크기·bbox: `hall-flowers-report.json`.
  이전/개선 비교: `hall-flowers-comparison.png`, 확대: `hall-flowers-detail.png`. `tools/art-review.html`에도 추가했다.
- 테스트 110개 통과. 새 PNG 32×48 선택, 한쪽 6개·중앙 여백·꽃 사이 간격·교차로 침범 없음 검사를 보강했다.
  390px·320px 앱 화면에서 꽃송이 구분과 중앙 통로를 확인했다.
