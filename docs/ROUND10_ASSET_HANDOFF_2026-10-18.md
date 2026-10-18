# 10차 에셋 인계 — 입구 랜드마크·예식 안내관

사용자 요청 문서의 1부와 뒤에 확정된 2부를 모두 제작했다. **제작·등록·검토 모형까지 완료했으며 실제 앱의 입구 교체·예식 타임라인·지도 카드 연결은 Claude 작업이다.** 기존 PNG와 장면 코드는 보존했다.

## 파일과 등록

| 파일 | 픽셀 크기 | ID / 용도 |
|---|---|---|
| `assets/objects/landmark-gallery-v1.png` | 96×112 | `landmark-gallery`, 액자·커플·이젤·꽃·조명 |
| `assets/objects/landmark-gifts-v1.png` | 96×96 | `landmark-gifts`, 선물·하트 실링 봉투·화환 |
| `assets/objects/landmark-info-v1.png` | 96×112 | `landmark-info`, 꽃장식 흰 아치 문·빈 현판 |
| `assets/ceremony/ceremony-back-v1.png` | 352×288 | `ceremony.back`, 불투명 배경·단상·의자 앉는 면 |
| `assets/ceremony/ceremony-front-v1.png` | 352×288 | `ceremony.front`, 투명 등받이·꽃·랜턴 |
| `assets/ceremony/ceremony-petals-v1.png` | 32×8 | `ceremony.petals`, 8×8 네 칸 |
| `assets/ceremony/ceremony-heart-v1.png` | 16×16 | `ceremony.heart`, 윗줄8×8 두 칸; 아랫줄은 투명 |
| `assets/ceremony/map-v1.png` | 352×200 | `ceremony.map`, 불투명 약도·하트 핀, 글자 없음 |
| `assets/characters/groom-ceremony-v1.png` | 384×72 | `groom-ceremony`, 48×72 가로8칸 |
| `assets/characters/bride-ceremony-v1.png` | 384×72 | `bride-ceremony`, 48×72 가로8칸 |
| `assets/characters/guest-seated-v1.png` | 480×48 | `guest-seated`, 40×48 가로12칸 |

- `manifest.objects`·`files.objects`, `js/assets.js`의 `OBJECT_IDS`에 랜드마크3종을 등록했다. 런타임 JS 수정은 이 허용 목록 한 줄뿐이다.
- 새 `manifest.ceremony`와 `files.ceremony`는 표의5개 파일을 가리킨다. 별도 폴더에 모아 기존 장면 배경과 혼동하지 않게 했다.
- 세 인물 ID는 `manifest.characters`에 등록했다. **전용 시트 경로와 프레임 규격은 `manifest.ceremonySheets`**에 있다. 일반 `files.characters`/`CHARACTER_NAMES`에는 넣지 않았다. 기존 캐릭터 로더는 정면1장 또는3×4행 시트만 해석하므로, 가로8/12칸을 그 로더에 넣으면 잘못 잘린다. Claude가 전용 로더에서 `ceremonySheets[id].file`을 assets 기준으로 읽고 프레임을 잘라 사용한다. 선택 캐릭터10종은 늘리지 않는다.

## 캐릭터와 효과 프레임

- 신랑·신부0~3: 뒷모습 걷기. 머리 y8·발 기준 y72를 고정했다. 몸 전체 scaleY·기울임·추가 소수점 흔들림을 겹치지 않는다. 네 프레임이 서로 다른지와 실제 높이64px가 같은지 확인했다.
- 4: 신랑 오른쪽 / 신부 왼쪽 보고 서기. 5: 같은 방향 맞절. 6: 신랑 정면 손 들어 말하기 / 신부 정면 부케 들고 웃기. 7: 정면 서기. 맞절은 실제 높이56px이며 발 기준은 그대로다.
- 하객 `person*2+pose`, person0~5, pose0착석·1박수. 검정 정장·갈색 단발 원피스·회색 머리 정장·올림머리 장미색 원피스·흰 머리 크림 재킷·갈색 머리 회색 정장 순서다.
- 하객 프레임은40×48이나 실제 인물 높이는26px(y22~47)다. 28px 좌석 간격에서48px 전체를 인물로 채우면 앞줄 등받이가 뒷줄 머리를 가리므로 이 여백을 유지한다. **40×48 그대로 drawImage**하고 알파 bbox로 잘라 다시 늘리지 않는다.
- 꽃잎: 소스 사각형 `(i*8,0,8,8)`, i0~3. 하트·반짝이: `(0,0,8,8)`·`(8,0,8,8)`. 하트 시트 아랫줄은 비어 있다. 효과 원점은 report에도 기록했다.
- 정면 행진은 기존 신랑·신부를 사용한다. 검토 정지 모형도 기존 그림을 합성했다.

## 예식관 합성 좌표

- 순서: **back → 하객·두 사람 → front → 캔버스 밖 DOM 대사 상자**. 대사 상자를 캔버스 아래에 두어 맨 아랫줄 하객 머리를 가리지 않는다.
- 단상 윗면은 y150~176, 앞면은 y176~184. 권장 발 위치는 신랑(154,168), 신부(198,168). 평평한 바닥의 버진로드는 x144~208, y184~288이며 단상 앞면과 연결된다.
- 하객 발 기준: y200/228/256/284, x32/60/88/116 및236/264/292/320. 각 시트의 왼쪽 위를 `(x-frameWidth/2, feetY-frameHeight)`에 그린다. 마지막 불투명 줄은 기준선 바로 위다.
- 등받이는 해당 발 기준선 앞8px만 가린다. 전체 front 레이어가 버진로드·단상·하객32명의 머리를 덮지 않는지 알파 픽셀 검사했다. 하객을 더 크게 그리거나 좌석 위치를 옮기면 다시 확인한다.

## 입구 배치 제안

- 광장 전체352×864 기준: 갤러리 중심 x240/발 y668(20행), 마음 전하기 x112/y796(24행), 예식 안내 x240/y796. 각각 sprite 전체 bbox는 `[192,556,288,668]`, `[64,700,160,796]`, `[192,684,288,796]`이다.
- 기존 문의 중심 x48/304와 발 y636/764, 케이크 중심(176,636)을 보존했다. 네 문의 PNG와 케이크에 새 그림의 불투명 픽셀이 겹치지 않는지 검사했다. 리셉션 무리도 그대로 둔 모형이다.
- **이 좌표는 모형 제안이며 실제 HUB_DOORS를 바꾸지 않았다.** 기존19/23행 문과 새20/24행 랜드마크의 발 기준을 혼동하지 않는다. Claude는 이름표를 그림 위에, 클릭 범위를 보이는 그림 전체에, 충돌은 맨 아래 발 부분에 맞춘다. 등록 실패 시 기존 표지판 폴백을 유지한다.

## 약도와 글자

- [롯데백화점 공식 위치 안내](https://global.lotteshopping.com/eng/store/main?cstrCd=0001)의 [주변 지도](https://minfo.lotteshopping.com/content/cstr/map/mltilang/0001_gmap.png)에서 상대 위치·도로 방향을 확인했다. 원본을 복사하거나 트레이싱하지 않고 블록 형태로 새로 생성했다.
- 북쪽 가로 도로는 을지로, 동쪽에서 남서로 내려가는 도로는 남대문로, 호텔은 백화점 서쪽이다. **호텔과 더그랜드롯데 서울 예식장을 별도 가짜 건물로 나누지 않았다.** 같은 호텔 건물에 하트 핀을 두었다.
- 역·건물·도로 이름, 출구 번호는 PNG에 없다. 검토 도구의 HTML 라벨 위치는 호텔 x28%/y80%, 백화점 x60%/y82%, 역 x66%/y2%다. 공개 길찾기는 기존 지도 앱 버튼으로 연결하며 약도에 출구 번호를 추측해서 넣지 않는다.

## 검토와 재생성

- `/tools/round10-art-review.html`: 기존/신규 비교, 390px 광장, 착석·마주 보기·행진 정지 모형3장, 보행·맞절·박수 재생, 라벨을 얹은 약도. 검토 도구의 모션은 실제 앱 연출 코드가 아니다.
- 정지 모형: `tools/round10-ceremony-seated.png`, `round10-ceremony-facing.png`, `round10-ceremony-march.png`; 입구 모형 `tools/round10-hub-proposal.png`.
- 생성 방식: **내장 image_gen**, API 키 사용 없음. 원본과 최종 프롬프트12건은 `assets/round10-prompts.json`에 기록했다. 각 에셋을 별도 호출로 생성하고 배경만 한 번 편집했다. 원본은 Git 제외 `raw/round10-source/`에 복사했다.
- 규격 보정: `.venv-assets/Scripts/python.exe tools/prepare_round10_assets.py`. 생성 그림의 프레임을 잘라 정렬하고 최근접 축소·이진 알파·팔레트 제한을 적용했다. 배경의 원근을 정해진 좌표에 맞추고, 생성된 의자·꽃 조각을 좌석 격자에 정렬했다. 랜드마크는48색 이하, 배경96색, 약도48색이다. 새 그림의 글자는 굽지 않았다.
- `assets/round10-report.json`에 실제 PNG 치수·알파·색 수·해시·프레임 bbox·효과 원점·추천 좌표를 기록했다. 최종 PNG는 원본 없이 바로 쓸 수 있으며 원본은 선택 재변환에만 필요하다.
- 검증: 생성 도구의 픽셀/좌표 assertions 통과, `npm test`163개 통과. 브라우저에서390px 카드 내부352px 모형3장, 실제390px 모바일 가로 넘침 없음, 모든 그림 로드, 대사 상자 분리, 재생·정지·맞절 확인, 콘솔 오류 없음. 실앱 배치·충돌·타임라인 재생은 Claude 연결 후 확인해야 한다.
- 화면 기록: `docs/round10-ceremony-review-2026-10-18.jpg`, `round10-mobile-390-2026-10-18.jpg`, `round10-motion-review-2026-10-18.jpg`, `round10-map-390-2026-10-18.jpg`.
