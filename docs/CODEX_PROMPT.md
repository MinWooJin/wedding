# 에셋 작업 인수인계 프롬프트 (Codex / Claude)

> 신랑·신부 최신 디자인은 **애즈펌·올림머리 재작화**다. `assets/couple-hairstyle-prompts.json`을 우선한다.
> 과거의 “얼굴 표정만 수정하고 헤어 유지” 프롬프트는 재사용하지 않는다.

- 신랑 최신 머리: 검은색 자연스러운 6:4 가르마, 양옆으로 흐르는 C컬 앞머리와 둥근 볼륨의 애즈펌.
  기존 하객처럼 뾰족하게 뻗은 머리와 큰 중앙 앞머리는 사용하지 않는다.
- 신부 최신 머리: 이마를 드러내고 뒤로 빗어 올린 갈색 올림머리, 정수리 위로 또렷하게 보이는 둥근 번.
  베일은 번 아래에 달아 묶은 머리를 가리지 않는다. 두꺼운 앞머리는 사용하지 않는다.
- 두 캐릭터를 내장 이미지 도구로 재작화해 48×72 RGBA로 적용했다. 비교 이미지는 `assets/couple-preview.png`다.

> 앞부분은 1차 인수인계 기록이다. 현재 크기·등록 상태·후속 연결 사항은 문서 마지막의
> **2차 에셋 작업 기록**을 우선한다. 현재 캐릭터 규격은 48×72이고 기존 웨딩 6종은 연결되어 있다.

2026-10-16 작업 결과를 반영한 최신 프롬프트다. 예전의 “API 키를 설정하고 전체 에셋을
처음부터 생성”하는 지시는 완료된 작업이며 현재 작업 지시로 사용하지 않는다.

```text
작업 폴더: C:\Users\alsdn\wedding
Git 저장소이며 원격 없음. git push 또는 remote 추가 금지. 로컬 커밋은 가능.

이 프로젝트는 바닐라 JS 캔버스로 만든 픽셀 게임형 모바일 청첩장이다.
먼저 README.md, assets/README.md, 이 문서와 관련 생성 프롬프트 JSON을 읽어라.
완료된 에셋을 다시 생성하거나 신랑·신부 얼굴을 하객 얼굴로 되돌리지 마라.

현재 게임에 적용 완료:
- assets/characters/: 하객 preset-0..9, groom, bride 총 12종, 64x96 RGBA.
- assets/tiles/: G W P H F D K R S 총 9종, 32x32 RGBA.
- assets/objects/: arch 등 15종. 크기는 tools/prepare_assets.py의 OBJECT_SIZES 참고.
- assets/manifest.json에 위 36종이 등록되어 있다.
- Codex 내장 이미지 생성 도구로 생성했다. OPENAI_API_KEY는 사용하지 않았다.
- tools/generate_assets.py는 선택적 OpenAI API 재생성 도구다. 이미 작성되어 있으므로
  새로 만들거나 키 설정을 선행 조건으로 요구하지 마라. API 호출은 별도 요청 때만 한다.

신랑·신부 얼굴 수정 (사용자 요청, 반영 완료):
- 하객과 같은 얼굴을 예복만 바꿔 사용하지 않는다.
- 신랑: 조금 길고 갸름한 얼굴, 살짝 각진 턱, 작은 아몬드형 눈, 또렷한 일자 눈썹,
  입을 다문 편안한 미소. 기존 검은 머리와 턱시도 유지.
- 신부: 볼이 부드러운 하트형 얼굴, 웃는 반달 눈, 가는 아치형 눈썹, 보조개가 있는
  다문 입 미소. 기존 갈색 올림머리, 베일, 흰 드레스, 작은 부케 유지.
- 실제 편집 프롬프트: assets/couple-face-prompts.json.
- 공통 스타일과 원본 프롬프트: assets/generation-prompts.json.
- 기존 타일·오브젝트의 실제 생성 프롬프트: assets/tile-object-prompts.json.
- API 스크립트의 캐릭터 프롬프트는 최초 생성 기준이므로 위 얼굴 수정 JSON을 우선한다.

추가 준비한 웨딩 타일 6종 (아직 게임에 연결하지 않은 라이브러리):
- raw/tiles/wedding/에 생성 원본, assets/tiles/wedding/에 최종 PNG.
- 최종 파일명과 제안 ID (아직 등록된 ID가 아님):
  A = aisle-ivory.png        아이보리 버진로드 기본형
  B = aisle-petals.png       꽃잎 버진로드 변형
  C = aisle-entrance.png     버진로드 입구 마감
  E = rose-petal-grass.png   장미 꽃잎 잔디
  M = ivory-marble.png       아이보리 대리석 바닥
  L = blush-carpet.png       블러시 핑크 카펫
- 모두 32x32 RGBA, 완전히 불투명한 바닥이다. 캐릭터/오브젝트와 달리 투명하게 만들지 않는다.
- A/B는 세로 방향으로 반복하며 좌우 골드 라인은 의도한 테두리다.
- C는 반복 타일이 아니라 입구 마감이다. 위쪽은 A/B, 아래쪽은 잔디와 연결한다.
- E/M/L은 가로·세로 반복용이다.
- assets/tiles/wedding/manifest.json은 별도 에셋 목록이며 런타임 manifest가 아니다.
- 실제 생성 프롬프트: assets/tiles/wedding/prompts.json.
- 반복·입구 연결 미리보기: assets/tiles/wedding/preview.png.
- python tools/prepare_wedding_tiles.py로 이 6종만 다시 변환할 수 있다.
  이 명령은 기존 assets/manifest.json과 게임 적용 에셋을 수정하지 않는다.
  raw가 없는 새 체크아웃에서도 기존 최종 PNG를 검증하고 목록/미리보기를 재생성한다.

사용자가 향후 맵 적용을 요청할 때 참고할 연결 지점:
1. js/assets.js의 TILE_IDS는 현재 G W P H F D K R S만 허용한다.
   추가 PNG를 하위 폴더에 저장하는 것만으로는 게임에 표시되지 않는다.
2. 새 ID를 사용하려면 로더 경로·허용 목록, js/sprites/tiles.js의 폴백 타일,
   런타임 manifest 생성 방식까지 함께 연결해야 한다.
3. js/world/hub.js의 HUB_ROWS에서 가운데 길은 5열(tx=5)이다.
   위쪽 1..19행이 아치로 가는 길이고 20행은 시작 교차로다.
   우선 이 세로 구간에 A/B를 쓰는 방향을 검토하고, 교차로·문·귀환 위치를 보존한다.
   입구 C는 위로 버진로드가 이어지는 방향에 놓는다.
4. 새 바닥 ID는 보행 가능하게 유지한다. SOLID_TILES에 넣지 않는다.
   E로 잔디를 교체하면 js/world/guest-layout.js의 하객 배치 조건도 확인한다.
   현재 하객 배치는 G/W만 잔디로 인식한다.
5. A/B/C 연결부와 반복 이음새는 실제 32x32 크기 및 게임에서 확인한다.
   미리보기는 검토용이며 맵 통합 및 이동 검증을 완료했다는 뜻은 아니다.
6. 관련 테스트를 갱신하고 npm test, 브라우저에서 길 이동·출입·NPC 배치를 검증한다.

작업 범위와 주의:
- 이번 에셋 준비 작업에서는 js/, css/, index.html을 수정하지 않았다.
  이후 해당 파일 수정은 사용자가 맵/엔진 적용을 요청한 범위에서 진행한다.
- 기존 P(흙길)나 R(카펫)을 일괄 덮어쓰지 마라. 다른 방까지 의도치 않게 바뀐다.
- raw/는 .gitignore 대상이다. 원본은 이 컴퓨터에 있고 Git 복제본에는 없을 수 있다.
- raw가 없는 체크아웃에서 tools/prepare_assets.py를 무작정 실행하면 런타임 manifest가
  비어 버릴 수 있다. 기존 36종 전체 원본이 있는지 먼저 확인한다.
- 내장 이미지 생성 도구가 없는 환경에서는 기존 최종 PNG를 사용해 작업을 진행한다.
  API 키를 요구하거나 다른 생성 수단으로 자동 전환하지 마라.
- 스타일은 따뜻한 파스텔 16-bit RPG 픽셀 아트. 새 바닥은 실제 32x32에서 읽히는 단순한
  큰 픽셀 덩어리와 적은 색을 사용한다. 세밀한 사진 질감, 텍스트, 워터마크는 넣지 않는다.
- npm run serve로 http://localhost:5173에서 확인한다. 저장된 프로필이 없으면 입장 화면이 나온다.
- 완료 후 검증한 변경분만 로컬 커밋하고 원격 추가나 push는 하지 마라.
```

# 2차 요청: 초록 면적을 줄일 장식 타일·오브젝트 (Claude가 2026-10-16 작성)

```text
작업 폴더: C:\Users\alsdn\wedding (원격 없음, push 금지, 로컬 커밋 가능)

현재 광장이 잔디 위주라 "가든 웨딩" 느낌이 약하다. 내장 이미지 생성 도구로 아래 에셋을 만들어
raw/에 넣고 python tools/prepare_assets.py 로 변환해라(스크립트는 아래 새 ID/크기를 아직 모르므로
TILES/WEDDING_TILES/OBJECT_SIZES에 추가한 뒤 실행). js/ 는 수정하지 마라. 연결은 Claude가 한다.
스타일은 기존 에셋(assets/generation-prompts.json의 공통 스타일 문구)과 동일하게 맞춘다.

새 타일 (32×32, 불투명, 이음새 없음) → raw/tiles/wedding/<이름>.png
  - flower-bed-pink.png   (ID X1) 분홍·흰 장미가 빽빽한 꽃밭. 잔디가 거의 안 보일 정도로 꽃 위주
  - flower-bed-white.png  (ID X2) 흰·연노랑 꽃밭 변형
  - white-gravel.png      (ID X3) 흰 자갈 산책로(대리석보다 질감 있는 밝은 바닥)
  - hedge-rose.png        (ID X4) 장미가 핀 산울타리(막힘 타일, 현재 H를 대체할 수 있게 같은 톤)

새 오브젝트 (투명 배경, 아래 가운데 정렬) → raw/objects/<이름>.png
  - chair.png     32×48  흰색 접이식 하객 의자(정면). 버진로드 양옆에 줄지어 놓을 것
  - bush.png      64×64  분홍 꽃이 핀 둥근 꽃덤불
  - lantern.png   32×64  리본 달린 랜턴 기둥
  - petal-pile.png 32×32 바닥에 흩어진 꽃잎(비충돌 장식)
  - welcome-board.png 64×64 "Welcome" 느낌의 이젤 안내판(글자 없이 장식 위주)

변환 후 assets/manifest.json에 자동 등록되는지 확인하고, 결과 PNG 크기를 출력해 보고해라.
```

## 2차 에셋 작업 기록 (2026-10-16, 완료)

내장 이미지 생성 도구로 요청한 9종을 생성하고 최종 PNG 및 런타임 manifest에 등록했다.
JS·CSS·HTML은 이 작업에서 수정하지 않았다. **새 9종의 맵 배치와 로더 연결은 클로드 작업으로 남아 있다.**

| ID / 이름 | 원본 | 최종 파일 | 크기 / 배경 |
|---|---|---|---|
| X1 | raw/tiles/wedding/flower-bed-pink.png | assets/tiles/X1.png | 32×32 RGBA, 불투명 |
| X2 | raw/tiles/wedding/flower-bed-white.png | assets/tiles/X2.png | 32×32 RGBA, 불투명 |
| X3 | raw/tiles/wedding/white-gravel.png | assets/tiles/X3.png | 32×32 RGBA, 불투명 |
| X4 | raw/tiles/wedding/hedge-rose.png | assets/tiles/X4.png | 32×32 RGBA, 불투명 |
| chair | raw/objects/chair.png | assets/objects/chair.png | 32×48 RGBA, 투명 |
| bush | raw/objects/bush.png | assets/objects/bush.png | 64×64 RGBA, 투명 |
| lantern | raw/objects/lantern.png | assets/objects/lantern.png | 32×64 RGBA, 투명 |
| petal-pile | raw/objects/petal-pile.png | assets/objects/petal-pile.png | 32×32 RGBA, 투명 |
| welcome-board | raw/objects/welcome-board.png | assets/objects/welcome-board.png | 64×64 RGBA, 투명 |

- 정확한 생성 프롬프트·출력 경로·연결 메모: `assets/round2-prompts.json`.
- 반복 타일과 오브젝트 비교 미리보기: `assets/round2-preview.png`.
- `tools/prepare_assets.py`의 `WEDDING_TILES`에 X1~X4, `OBJECT_SIZES`에 새 오브젝트 5종을 추가했다.
- `--skip-existing` 옵션을 추가했다. 기존 최종 PNG를 재축소하지 않고 manifest에는 계속 등록한다.
  현재 권장 명령은 `python tools/prepare_assets.py --skip-existing`이다.
  원본이 없는 기존 PNG도 유지되므로 새 체크아웃에서 이 옵션으로 등록 목록을 재생성할 수 있다.
  원본 수정 후 재변환하려면 해당 최종 PNG를 별도 보관해 제거한 뒤 실행하거나,
  전체 원본이 있을 때 옵션 없이 실행한다. 옵션 없이 실행하면 기존 PNG도 다시 변환된다.
- 새 오브젝트는 축소 후 사라진 미세 알파 여백을 다시 잘라 실제 보이는 픽셀 기준으로
  아래 가운데 정렬한다. 이 처리를 `process_object()`로 분리했다.
- 기존 42종 PNG는 변환 전후 SHA-256이 동일하다. 캐릭터 48×72와 수정된 신랑·신부 얼굴을 보존했다.
- 현재 런타임 manifest는 캐릭터 12종 / 타일 19종 / 오브젝트 20종, 총 51종이다.
  PNG 크기·RGBA·타일 불투명도·오브젝트 투명도 및 정렬·새 ID 9개 등록 검증을 통과했다.
- 앞부분의 “캐릭터 64×96”, “기존 웨딩 6종 미연결”은 1차 당시 기록이다.
  현재 캐릭터는 48×72이며 기존 A/B/C/E/M/L은 이미 JS 허용 목록과 런타임 manifest에 있다.
  `assets/tiles/wedding/manifest.json`의 등록 상태는 초기 라이브러리 기록이므로 현재 런타임 판단에 쓰지 않는다.

### 클로드가 연결할 때 확인할 점

1. `js/assets.js`의 `TILE_IDS`와 `OBJECT_IDS`에 새 9종은 아직 없다.
   manifest에 적혀 있어도 이 허용 목록을 통과하지 못하면 로드되지 않는다.
2. X1~X4는 요청대로 두 글자 ID로 저장했다. 현재 `js/world/tilemap.js`는 문자열의
   한 글자를 한 칸으로 읽으므로, 맵 문자열에 `X1`을 그대로 넣으면 두 칸으로 해석된다.
   맵 표현을 토큰 배열로 확장하거나, 한 글자 맵 코드와 X1~X4 에셋 키를 매핑해야 한다.
   기존 `X`는 맵 밖/막힘 타일이므로 재사용하지 않는다.
3. `X4` 장미 산울타리는 막힘 타일로 연결한다. 표시용 키와 충돌용 키가 다르면 둘을 함께 매핑한다.
4. 현재 오브젝트 로더는 높이를 32의 배수로 반올림한다. 의자 48px는 그대로 두면 64px로 늘어나므로
   로더에서 원본 32×48을 보존하고 배치/충돌 영역은 따로 계산한다.
5. `petal-pile`은 비충돌 바닥 장식이다. 배치할 때 `solid: false`, `floor: true`로 처리한다.
6. 환영 안내판에는 실제 글자를 그리지 않았다. 기존 폴백·클릭 상호작용·NPC 자리·출입 동선을 확인하며 배치한다.
7. 신규 9종은 `tools/prepare_assets.py`가 담당한다. `tools/prepare_wedding_tiles.py`는
   이전 별도 라이브러리 6종만 담당하므로 이번 파일의 변환 명령으로 사용하지 않는다.

# 3차 요청: 웨딩 단상(제단) 오브젝트 (Claude가 2026-10-16 작성)

```text
작업 폴더: C:\Users\alsdn\wedding (원격 없음, push 금지, 로컬 커밋 가능)

광장 맨 위 아치 앞에 신랑·신부가 "올라서 있는" 단상이 필요하다. 내장 이미지 생성 도구로 만들어
raw/objects/에 넣고 tools/prepare_assets.py의 OBJECT_SIZES에 추가한 뒤 --skip-existing 으로 변환해라.
js/ 는 수정하지 마라. 연결은 Claude가 한다. 스타일은 기존 에셋과 동일(assets/generation-prompts.json 공통 문구).

- platform.png  160×64  (ID platform) 아이보리 대리석 2단 단상. 위에서 내려다본 RPG 시점, 앞면(아래쪽)에
  계단 2칸이 보이고 윗면은 평평한 밝은 대리석. 가장자리에 분홍 꽃 장식 약간. 투명 배경.
  캐릭터(48×72) 두 명이 윗면 가운데에 나란히 설 수 있어야 하므로 윗면 가로 폭이 넓어야 한다.
  단상 아래 두 행(2×5칸)을 덮는 크기라 높이 64 중 윗면이 36px 안팎, 계단이 28px 안팎이면 좋다.
- platform-step.png 32×32 (ID platform-step, 선택) 단상 양옆에 이어 붙일 낮은 계단 1칸.

완료 후 결과 PNG 크기와 알파 bbox를 출력해 보고하고, 이 문서 하단에 완료 기록을 남겨라.
```

# 4차 요청: 레퍼런스(@dding_one) 톤의 자연 정원 세트 (Claude가 2026-10-16 작성) — 3차 단상 요청은 보류

```text
작업 폴더: C:\Users\alsdn\wedding (원격 없음, push 금지, 로컬 커밋 가능)

방향 수정: 꽃밭·대리석·의자 같은 격식 장식이 아니라, 레퍼런스(인스타 @dding_one 픽셀 게스트북 첫 장면)처럼
"울타리 안 짙은 잔디 정원 + 가운데 밝은 모래빛 돌길 + 가장자리 큰 나무 + 흰 꽃 아치" 톤으로 간다.
참고 장면: 위쪽에 흰·분홍 장미 아치, 그 아래 길 한가운데 신랑신부, 좌우 잔디에 흰 꽃이 드문드문,
울타리 안쪽을 따라 둥근 나무들, 가운데 길은 연한 베이지색 자갈/돌 느낌(갈색 흙길 아님).
3차 "단상" 요청은 레퍼런스에 없으므로 만들지 않는다.

내장 이미지 생성 도구로 아래를 만들고 raw/에 넣은 뒤 tools/prepare_assets.py의 TILES/WEDDING_TILES/OBJECT_SIZES에
추가·수정하고 --skip-existing 없이(아래 파일만 교체되도록 해당 raw만 두거나, 기존 결과를 백업 후) 변환해라.
js/ 는 수정하지 마라. 완료 후 이 문서 하단에 결과 크기·bbox를 기록해라.

타일(32×32, 불투명, 이음새 없음). 아래 4종은 **베이스 잔디 색이 완전히 같아야** 섞어 깔아도 얼룩이 안 생긴다.
  - raw/tiles/G.png        (ID G, 교체) 짙고 선명한 잔디. 레퍼런스의 녹색(#5e9a3c 근방), 잔잔한 결 텍스처
  - raw/tiles/wedding/grass-flowers-a.png (ID J) 같은 잔디 + 흰 꽃 2~3송이
  - raw/tiles/wedding/grass-flowers-b.png (ID U) 같은 잔디 + 분홍·노랑 꽃 2~3송이
  - raw/tiles/W.png        (ID W, 교체) 같은 잔디 + 작은 흰 꽃 다발(기존 W는 톤이 달라 얼룩져 보였음)
  - raw/tiles/wedding/sand-path.png (ID N) 연한 베이지 모래/자갈 돌길. 격자 없이 부드러운 질감, 4방향 이음새 없음
  - raw/tiles/H.png        (ID H, 교체) 짙은 녹색 산울타리에 작은 흰 꽃. 위에서 본 두툼한 울타리

오브젝트(투명 배경, 아래 가운데 정렬)
  - raw/objects/tree.png   (교체) 96×128 크고 둥근 짙은 녹색 나무, 갈색 줄기, 레퍼런스의 가장자리 나무 느낌
  - raw/objects/bush-white.png (신규, ID bush-white) 64×64 흰 꽃이 핀 둥근 덤불
  - raw/objects/arch.png   (교체) 160×128 흰 장미와 연분홍 장미, 초록 잎의 결혼식 아치. 가운데 비어 있음. 기둥 두 개

prepare_assets.py 반영: TILES에 G/W/H는 이미 있음, WEDDING_TILES에 {"J":"grass-flowers-a","U":"grass-flowers-b","N":"sand-path"},
OBJECT_SIZES에 "tree": (96, 128), "bush-white": (64, 64). 기존 캐릭터 PNG(48×72, 수정된 신랑신부 얼굴)는 절대 다시 변환하지 마라.
```
