# 11차 입구 그림 제작·연결 기록 (2026-10-18)

방명록 임시 확대 그림을 전용 그림으로 교체하고, 선택 항목인 마음 전하기도 96×112로 새로 제작했다. 네 공간 입구의 배치·이름표 없음·즉시 이동 동작은 Claude 46절의 구현을 유지한다.

| 파일 (`assets/objects/`) | 규격 | 내용 |
|---|---|---|
| `landmark-guestbook-v1.png` | 96×112 RGBA, 46색 | 크림 웰컴보드·하트, 편지가 꽂힌 세이지 우체통, 꽃바구니. 글자 없음 |
| `landmark-gifts-v2.png` | 96×112 RGBA, 48색 | 높아진 하트 꽃 화환과 크림·분홍 선물. v1 보존 |

두 파일 모두 알파 0/255, 실제 그림 폭 96px, 바닥 y112다. 갤러리 v1·예식 안내 v1·선물 v1은 변경하지 않았다. 네 파일의 캔버스는 모두 96×112이며, 갤러리의 실제 그림 폭 64px은 기존 그림 그대로다.

## 등록과 적용

- manifest.objects·files.objects에 `landmark-guestbook` → `landmark-guestbook-v1.png`를 추가했다. js/assets.js의 OBJECT_IDS에 같은 ID를 추가했다.
- `files.objects.landmark-gifts`만 `landmark-gifts-v2.png`로 바꿨다.
- 광장 배치 코드는 변경하지 않았다. 기존 `LANDMARKS`가 새 방명록을 사용하고, 로드 실패 때만 임시 웰컴보드 대체 경로가 남는다.
- 운영 API·Google 배포·설정은 변경하지 않았으며 실제 방명록에 기록하지 않았다. 원격 게시하지 않았다.

## 제작과 검증

- 내장 image_gen으로 방명록 신규 생성 1회, 기존 선물 참조 편집 1회. API 키 사용 없음. 실제 프롬프트와 참조·원본 경로는 `assets/round11-prompts.json`.
- 선택 규격 변환: `.venv-assets/Scripts/python.exe tools/prepare_round11_assets.py`. 생성 원본의 알파 임계값 200, 투명 여백 자르기, 최근접 96×112 변환, 가시 47색 이하 + 투명 1색. 이 도구는 새 두 파일만 처리한다. 원본은 `raw/round11-source/`(Git 제외), 최종 PNG는 원본 없이 사용 가능하다.
- 치수·실제 bbox·알파·색 수·SHA256·기존 파일 보존 해시는 `assets/round11-report.json`.
- 요구한 96×112 칸 2×2 비교: `assets/round11-landmarks-comparison.png`, 확대판 `round11-landmarks-comparison-3x.png`. 순서는 좌상 방명록·우상 갤러리·좌하 마음 전하기·우하 예식 안내다. 비교 그림의 제목은 PNG 에셋에 포함된 글자가 아니다.
- `/tools/round11-art-review.html`은 실제 loadAssets·createHub·Renderer·Scene.onTap을 사용한다. 4/4종 96×112, 방명록이 임시 그림 대신 새 v1로 로드되는 것을 검사한다. API 호출과 프로필 저장 없이 정지 광장과 네 입구 이동 요청을 확인할 수 있다.
- 브라우저에서 네 입구 이동 요청, 콘솔 오류 없음, 390×844·320×568 가로 넘침 없음, 그림 잘림과 정원 안내인 가림 없음을 확인했다. 화면 기록 `docs/round11-landmarks-390-2026-10-18.png`.
- `npm test` 174개 통과. 기존 광장 테스트의 임시 `welcome-board` 기대값을 새 `landmark-guestbook`으로 갱신했다. 중앙 통로·두 사람 단상·안내인 가림·군중 관련 검사도 통과했다.

Claude 후속 검토 시 이 파일과 HANDOFF 47절을 읽으면 된다. 이 작업에 별도 배치 연결은 남아 있지 않다.
