# 에셋 가이드 (AI 생성 → 게임 적용)

게임은 `assets/manifest.json`에 적힌 PNG만 읽고, 없는 것은 코드로 그린 기본 그림을 씁니다.
**원본은 `raw/`에 넣고 `python tools/prepare_assets.py`를 실행**하면 규격에 맞게 변환되고 manifest가 자동으로 만들어집니다.

```
pip install pillow
python tools/prepare_assets.py          # 부드럽게 축소
python tools/prepare_assets.py --pixel  # 또렷한 도트 느낌
```

## 규격 요약

| 종류 | raw 파일명 | 결과 크기 | 비고 |
|---|---|---|---|
| 하객 캐릭터 | `raw/characters/preset-0.png` … `preset-9.png` | 48×72 | 정면 전신 1장이면 충분(좌우는 반전, 걷기는 들썩임으로 표현) |
| 신랑·신부 | `raw/characters/groom.png`, `bride.png` | 48×72 | 광장 아치 아래, 이야기 길 벤치에 등장 |
| 걷기 시트(선택) | `raw/characters/<name>-sheet.png` | 144×288 | 3열(idle/걷기A/걷기B) × 4행(앞/왼쪽/오른쪽/뒤) |
| 타일 | `raw/tiles/G W P H F D K R S.png` | 32×32 | G 잔디, W 꽃잔디, P 흙길, H 산울타리, F 울타리, D 마루, K 벽, R 카펫, S 돌바닥 |
| 오브젝트 | `raw/objects/<id>.png` | 32의 배수 | arch 160×128, tree 96×96, bench·desk 128×64, flower·door 32×32, 나머지(sign·mailbox·chest·frame·board·phone·calendar·mapframe·stone) 64×64 |
| 웨딩 타일 | `raw/tiles/wedding/aisle-ivory.png` 등 6종 | 32×32 | A 버진로드, B 꽃잎 버진로드, C 입구 마감, E 꽃잎 잔디, M 대리석, L 블러시 카펫 (광장 5열 1~19행에 A/B/C 사용) |
| 씬 배경(선택) | `raw/maps/hub.png info.png guestbook.png gifts.png` | hub 352×1024, info 352×256, guestbook 352×384, gifts 352×256 | 타일 대신 한 장으로 그림. 길·벽 위치는 아래 레이아웃을 따라야 함 |

배경은 단색(흰색 등)이나 투명이면 됩니다. 스크립트가 모서리 색을 기준으로 배경을 지우고, 여백을 잘라내고, 크기를 맞춥니다.

## 캐릭터 생성 프롬프트

### OpenAI API로 자동 생성

현재 PNG 에셋은 Codex 내장 이미지 생성 도구로 만들었습니다. 이 방식은
`OPENAI_API_KEY` 없이도 사용할 수 있습니다. 프롬프트 구성은
`assets/generation-prompts.json`에 기록합니다. 생성된 원본을 `raw/`의 해당 경로에
복사한 뒤 `tools/prepare_assets.py`로 변환하는 과정은 같습니다.
아래 Python 스크립트는 별도로 API를 사용해 생성할 때 쓰는 선택 사항입니다.

`tools/generate_assets.py`는 `gpt-image-1`, high 품질, 투명 배경 PNG로 생성합니다.
Python 환경에 의존성을 설치하고 `OPENAI_API_KEY`를 환경변수로 설정하세요. 키는 저장소에 넣지 마세요.

```powershell
python -m pip install -r tools/requirements-assets.txt
python tools/generate_assets.py --only characters --test --dry-run
python tools/generate_assets.py --only characters --test
python tools/generate_assets.py --only characters --skip-existing
python tools/prepare_assets.py
npm run serve
```

테스트 캐릭터를 확인한 뒤 나머지를 생성하세요. `--test`는 하객 `preset-0` 한 장만 생성하며,
`--dry-run`은 API 호출 없이 파일명과 실제 프롬프트를 보여줍니다. `--skip-existing`을 생략하면
선택한 원본을 덮어씁니다. 캐릭터는 1024×1536, 타일과 오브젝트는 1024×1024로 생성합니다.
일시적인 실패는 이미지당 최대 3회 시도하며, 인증·권한 오류는 즉시 중단합니다.
다시 실행할 때는 `--skip-existing`으로 이미 생성한 파일의 중복 비용을 피할 수 있습니다.

캐릭터를 게임에서 확인한 뒤 다음을 실행합니다.

```powershell
python tools/generate_assets.py --only tiles --skip-existing
python tools/generate_assets.py --only objects --skip-existing
python tools/prepare_assets.py
```

옵션 없이 실행하면 36종 전체를 생성하므로 API 비용이 발생합니다. 타일은 변환 후 반복 배치해
경계를 확인하고, 이음새가 보이는 원본만 제거하거나 별도로 보관한 뒤 해당 그룹을
`--skip-existing`으로 다시 생성하세요.

생성 해상도는 클수록 좋습니다(예: 1024×1536). 스크립트가 48×72로 줄이면서 자연스럽게 도트화됩니다. 캐릭터가 화면에서 폭 48px·높이 72px(길 1.5칸 폭)로 보이므로 얼굴 표정이 살아 있는 그림을 고르세요. (ComfyUI / ChatGPT 이미지 / Midjourney 공통)

레퍼런스(@dding_one)와 같은 톤을 내기 위한 영문 프롬프트입니다. `[...]` 부분만 바꿔서 12장을 뽑으세요.

```
pixel art chibi character, full body, front view, standing straight, arms at sides,
4-head-tall proportions, big head, small body, thick dark outline, soft cel shading,
[short black hair, red hoodie, blue jeans], cute wedding guest,
centered, plain white background, no shadow on ground, no text, 16-bit game sprite style
```

- 신랑: `black hair, black tuxedo with bow tie, white shirt`
- 신부: `brown updo hair with small veil, white wedding dress, holding a tiny bouquet`
- 하객 10종: 머리 모양/색 5종 × 피부톤 2종에 옷 색을 다르게. 예) `long brown hair, yellow cardigan`, `curly blonde hair, green sweater`, `bob cut, pink blouse`, `cap, navy jacket`, `ponytail, purple dress`
- 네거티브(지원하는 도구일 때): `side view, back view, multiple characters, cropped, blurry, realistic, 3d render, text, watermark`
- 같은 도구·같은 시드 계열로 뽑아야 스타일이 통일됩니다. 한 장에 여러 명을 그리게 한 뒤 잘라 쓰는 것도 방법입니다(배경이 단색이어야 함).

## 타일 · 오브젝트 프롬프트

### 4차 자연 정원 세트 (현재 배경 방향)

G/J/U/W는 하나의 생성 잔디 베이스를 공유하고 J/U/W에만 생성한 작은 꽃 레이어를 합성합니다.
꽃을 덮지 않는 배경 픽셀은 G와 정확히 같습니다. N은 밝은 베이지 모래·자갈길,
H는 작은 흰 꽃이 있는 짙은 산울타리입니다. 여섯 타일은 32×32 불투명 RGBA입니다.
tree는 96×128, arch는 224×160으로 교체했고 bush-white 64×64를 추가했습니다.
아치의 (52,70,172,160) 부분은 인물을 가리지 않도록 완전히 투명하게 유지합니다.

```powershell
python tools/prepare_natural_garden.py
```

`raw/round4-source/`의 생성 원본·꽃 레이어를 사용해 요청한 9종만 격리된 출력 폴더에서
`prepare_assets.py`로 새로 변환합니다. 캐릭터는 변환하지 않습니다.
기존 백업은 `raw/round4-backup/`, 프롬프트는 `assets/round4-prompts.json`,
크기·알파 bbox·배경 일치 검증은 `assets/round4-report.json`을 참고하세요.
미리보기는 `assets/round4-preview.png`, 혼합 배치는 `assets/round4-grass-mix.png`입니다.
원본 폴더가 없는 체크아웃에서는 최종 PNG를 사용하세요. 3차 단상 생성은 보류했습니다.

### 2차 꽃밭·웨딩 장식 에셋

`raw/tiles/wedding/flower-bed-pink.png`, `flower-bed-white.png`, `white-gravel.png`,
`hedge-rose.png`는 `tools/prepare_assets.py`의 `WEDDING_TILES`를 통해
각각 `assets/tiles/X1.png`~`X4.png`로 변환합니다. 네 타일 모두 32×32 불투명 RGBA입니다.
`X4`는 맵 연결 시 막힘 타일로 다룹니다.

새 오브젝트는 `chair` 32×48, `bush` 64×64, `lantern` 32×64,
`petal-pile` 32×32, `welcome-board` 64×64입니다. 원본은 `raw/objects/`,
결과는 `assets/objects/`이며 투명 배경·비율 유지·아래 가운데 정렬을 사용합니다.

```powershell
python tools/prepare_assets.py --skip-existing
```

`--skip-existing`은 이미 있는 최종 PNG를 다시 축소하지 않고 manifest에는 계속 포함합니다.
원본이 없는 기존 에셋도 이 옵션으로 유지할 수 있습니다. 기존 PNG를 재생성하려면
해당 최종 파일을 별도로 보관해 제거한 뒤 실행하거나, 전체 원본을 갖춘 상태에서 옵션을 생략하세요.
기존 캐릭터 크기 48×72와 조정된 오브젝트 크기는 유지합니다.

실제 생성 프롬프트는 `assets/round2-prompts.json`, 미리보기는 `assets/round2-preview.png`입니다.
manifest 등록과 JS 연결은 별도입니다. 새 ID 허용 목록, 두 글자 `X1`~`X4`의 맵 표현,
의자 높이 48px 보존, `petal-pile`의 비충돌 바닥 처리는 클로드의 연결 작업에서 반영해야 합니다.

### 추가 웨딩 타일 라이브러리

`assets/tiles/wedding/`에 버진로드 기본형·꽃잎형·입구, 장미 꽃잎 잔디,
아이보리 대리석, 블러시 핑크 카펫 6종을 준비했습니다. 모두 32×32 RGBA이며
완전히 불투명한 바닥입니다. 원본은 `raw/tiles/wedding/`입니다.

이 타일들은 **아직 게임에 등록하지 않은 추가 에셋**입니다. 기존 9종과 런타임
`assets/manifest.json`은 유지됩니다. 별도 `manifest.json`의 제안 ID·반복 방향,
`prompts.json`의 실제 생성 프롬프트, `preview.png`의 배치 예시를 참고하세요.
버진로드 A/B는 세로 반복용이고 C는 위쪽을 길, 아래쪽을 잔디에 잇는 입구 마감입니다.
다른 바닥 E/M/L은 두 방향으로 반복할 수 있습니다.

```powershell
python tools/prepare_wedding_tiles.py
```

위 명령은 웨딩 타일만 변환하며 게임 manifest는 건드리지 않습니다. raw가 없으면
이미 저장된 최종 PNG를 사용합니다. 맵 적용 시 필요한 로더·타일·보행 처리 변경은
최신 `docs/CODEX_PROMPT.md`에 정리했습니다.

```
pixel art game tile, top-down view, seamless tileable [lush green grass] texture,
32x32 style, flat colors with subtle dots, no border, no text
```
타일 9종: `grass` / `grass with tiny pink and yellow flowers` / `dirt path` / `dense green hedge` / `wooden picket fence on grass` / `warm wooden plank floor` / `cream wallpaper wall with wooden baseboard` / `red carpet with gold center` / `grey stone floor`

```
pixel art game object sprite, top-down RPG style, [wooden signpost], thick dark outline,
soft shading, centered, plain white background, no ground shadow, no text
```
오브젝트: `flower arch with pink roses and green leaves` (가로로 넓게), `round green tree with brown trunk` (세로로 길게), `red mailbox on a post`, `small wooden picture frame`, `wooden park bench` (가로), `wooden treasure chest with gold lock`, `wooden reception desk` (가로), `cork notice board`, `grey telephone`, `wall calendar with red header`, `framed map`, `single pink flower`, `grey stone monument`, `yellow-bordered doormat` (바닥 표시)

## 씬 배경 한 장으로 그리기 (선택, 가장 레퍼런스에 가까운 방법)

광장(hub)은 11×32 타일, 352×1024px입니다. 걸을 수 있는 길과 막힌 곳이 아래 레이아웃과 맞아야 캐릭터가 벽을 통과하거나 길 위에서 막히지 않습니다.

```
H = 산울타리(막힘)  G = 잔디  W = 꽃잔디  P = 흙길
row 0      HHHHHHHHHHH
row 1~19   HGGGGPGGGGH  (가운데 5열만 길, 양옆 잔디·꽃잔디 반복)
           ← 꽃 아치(4~6열, 1~2행), 신랑 (3,3) 신부 (7,3)
row 20     HPPPPPPPPPH  ← 시작 위치 (5,20)
row 21     HPGGGPGGGPH  ← 문: 안내소 (1,21), 갤러리 (9,21)
row 22~23  HPG?GPG?GPH
row 24     HPPPPPPPPPH
row 25     HPGGGPGGGPH  ← 문: 이야기 길 (1,25), 방명록 (9,25)
row 26~27  HPG?GPG?GPH
row 28     HPPPPPPPPPH
row 29     HPGGGPGGGPH
row 30     HPWGGPGGWPH  ← 문: 마음 전하기 (5,30)
row 31     HHHHHHHHHHH
```

가장 쉬운 방법: 게임을 켠 뒤 브라우저 콘솔에서 `__exportMap()`을 실행하면 현재 씬의 타일 렌더가 PNG로 내려받아집니다. 이 이미지를 ComfyUI img2img(ControlNet tile/depth)의 밑그림으로 넣고 아래 프롬프트로 다시 그리면 레이아웃이 유지된 고퀄 배경이 나옵니다.

```
top-down pixel art garden wedding venue, lush grass, dirt path, trimmed hedges border,
pink and yellow flowers, soft shading, cozy 16-bit RPG map, no characters, no text
```
안내소(info)는 `cozy wooden-floor reception room with cream walls`, 방명록 정원(guestbook)은 `flower garden with grass`, 마음 전하는 곳(gifts)은 `stone-floored pavilion`.

배경 이미지를 쓸 때 문·표지판·우체통 같은 오브젝트는 게임이 따로 그리므로, 배경에는 그리지 마세요(또는 그린 뒤 해당 오브젝트 PNG도 함께 교체).

## 확인

변환 후 `npm run serve`로 띄워 보면 바로 반영됩니다. 특정 파일만 바꾸고 싶으면 raw/에 그 파일만 두고 다시 실행하면 됩니다(manifest는 매번 새로 생성).
