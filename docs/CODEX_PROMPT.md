# 에셋 작업 인수인계 프롬프트 (Codex / Claude)

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
