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
| 혼주 표기 | 예식 안내에 "진영근 · 박순이의 아들 진민우", "한성훈 · 이주영의 딸 한새암" |
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
