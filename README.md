# 픽셀 가든 모바일 청첩장

터치로 캐릭터를 움직여 가든 웨딩 맵(광장 + 방 4개)을 돌아다니는 모바일 청첩장.
빌드 도구 없이 정적 파일만으로 동작하며 GitHub Pages에 그대로 올릴 수 있다.

커버에서 두 사람의 소식을 확인한 뒤 정원으로 입장한다. 공간 메뉴로 바로 이동할 수 있고,
아래의 **축하 남기기 / 메시지 보기**는 어느 공간에서나 사용할 수 있다.
API와 실제 갤러리 사진은 마지막 단계에 연결한다. API가 비어 있는 현재 상태에서는
**이 브라우저에만 저장되는 기기 미리보기**로 작성 흐름을 확인할 수 있다.
미리보기 글은 서버로 전송되지 않으며 API 연결 후 운영 글과 자동으로 합쳐지지 않는다.
메시지 목록에서 개별 미리보기를 지울 수 있다.

`config.classicUrl`을 넣으면 별도로 만든 일반형 청첩장으로 연결하는 버튼이 나타난다.
공간 메뉴에서 닉네임과 캐릭터를 다시 고를 수도 있다.

```
npm test          # 단위 테스트 (Node 20+)
npm run serve     # http://localhost:5173
```

## 구성

| 공간 | 내용 |
|---|---|
| 가든 광장(hub) | 꽃 아치 아래 신랑·신부, 방명록을 남긴 하객 캐릭터들, 방 4개로 가는 문 |
| 예식 안내소(info) | 일시·장소 팝업, 지도 링크, 연락처(전화/문자), 교통 안내, 캘린더(.ics) 저장 |
| 갤러리관(gallery) | 사진 수만큼 액자가 걸린 복도. 액자 앞에서 탭하면 확대, 스와이프로 넘김 |
| 방명록 정원(guestbook) | 우체통에서 축하 메시지 작성 → 꽃으로 피어남. Google 스프레드시트에 저장 |
| 마음 전하는 곳(gifts) | 신랑·신부측 계좌 복사, 카카오페이 링크, 청첩장 공유 |

## 내용 수정

- `data/config.json`: 이름, 날짜(`+09:00` 포함 ISO), 장소, 지도 링크, 교통, 연락처, 계좌, 인사말, 타임라인
- `gallery/`: 사진 파일을 넣고 `gallery/manifest.json`에 파일명 배열로 적는다. 긴 변 1600px 이하 권장.
- 혼주 계좌: `parents[]` 항목에 `"account": {"bank":"","number":"","holder":"","kakaopay":""}` 추가(선택)
- 카카오톡 공유: Kakao Developers에서 JavaScript 키 발급 → `kakaoJsKey`. 플랫폼에 배포 도메인 등록. 루트에 `og.png`(1200×630) 추가 권장.

## 그래픽 교체 (AI 생성 PNG)

현재는 PNG 캐릭터 13종, 타일 22종, 오브젝트 35종을 사용한다. 코드 픽셀 아트는 로드 실패 시의 폴백이다.
기존 캐릭터를 전체 변환 명령으로 다시 축소하지 말고 `assets/README.md`의 선택 변환 지침을 따른다.

2026-10-17 레퍼런스 고도화로 캐릭터 12종·정원 타일 6종·나무의 새 버전을 적용했다.
이전 PNG는 보존하며 `assets/manifest.json`의 `files`가 현재 버전을 선택한다.
[비교 페이지](tools/art-review.html), [생성 프롬프트](assets/reference-v3-prompts.json),
[크기·투명도 기록](assets/reference-v3-report.json)을 참고한다.

단상과 커버에는 팔짱 낀 커플을 새로 그린 96×72 이미지 한 장으로 배치했다. 기존 신랑·신부는 네 방에서 탭하면 공간별 안내 대사를 전한다.
결합 이미지의 [생성 프롬프트](assets/couple-joined-prompts.json)와 [미리보기](assets/couple-joined-preview.png)를 참고한다.

단상 아래에는 아이보리 버진로드 양옆에 웨딩홀을 참고한 32×48 꽃다발을 6개씩 배치했다.
꽃은 길 바깥 3/7열에 놓고 버진로드 96px 폭을 모두 비웠다. 나무 한 쌍은 단상 양옆 바깥에 두고 덤불을 덜어, 하객 10명은 좌우에서 시작한 뒤 잔디 안에서 자유롭게 돌아다닌다. 현재 꽃만 변환할 때는 `python tools/prepare_hall_flowers.py`를 사용한다.
이전 꽃띠는 보존되어 있으며 `manifest.files`가 새 버전을 선택한다. 비교 페이지에서 이전/개선 모습을 함께 볼 수 있다.

```
pip install pillow
python tools/prepare_v2_assets.py  # v2 소품 2종만, raw/v2-source 원본이 있을 때
```

캐릭터는 **정면 전신 1장**이면 되고, 3열×4행 보행 시트도 지원한다. 대기는 정지하며 단일 PNG는 보행 중 정수1px 리듬만 적용한다. 그림 전체를 늘리거나 기울이지 않는다.
맵은 타일 또는 씬 배경 한 장으로 교체할 수 있다. 현재 광장은 352×864px이다.
게임을 켠 뒤 브라우저 콘솔에서 `__exportMap()`을 실행하면 현재 씬 레이아웃 PNG가 내려받아져 img2img 밑그림으로 쓸 수 있다.

정원 파티 소품으로 아이보리 리셉션 테이블과 리본 조명을 좌우에 배치했다. 나무와 빈 버진로드는 유지한다.
[새 소품 미리보기](assets/party-preview.png) · [프롬프트](assets/party-prompts.json). 선택 변환은 `python tools/prepare_party_assets.py`.

현재 잔디는128px 연속 재질(v5)을 월드 좌표로 이어 그리고 작은 들꽃을 흩어 배치한다. 이동 격자는32px를 유지하며 양옆 배경도 카메라와 함께 움직인다. 버진로드 장미와 수국 장식을 번갈아 놓고 케이크도 추가했다.
[잔디·꽃 가독성 비교](assets/lawn-review-preview.png) · [생성 프롬프트](assets/lawn-review-prompts.json). 선택 변환은 `python tools/prepare_lawn_review_assets.py`.

메인과 방명록의 나무는 연분홍 벚꽃나무로 맞췄다. 기존 64×96 프레임과 동선은 유지한다.
[벚꽃나무 전후 비교](assets/cherry-tree-preview.png) · [생성 프롬프트](assets/cherry-tree-prompts.json).

## 방명록(Google 스프레드시트) 연결

1. 새 스프레드시트 → 확장 프로그램 → Apps Script → `apps-script/Code.gs` 내용 붙여넣기
2. 배포 → 새 배포 → 유형 "웹 앱", 실행 주체 "나", 액세스 "모든 사용자" → 배포
3. 생성된 `https://script.google.com/macros/s/.../exec` URL을 `data/config.json`의 `guestbookApi`에 넣는다
4. 메시지는 `guestbook` 시트에 쌓인다. 부적절한 행은 시트에서 삭제하면 1분 안에 사라진다.

## 배포 (GitHub Pages)

1. GitHub에 저장소 생성 후 이 폴더를 push
2. Settings → Pages → Source: Deploy from a branch, Branch: main / (root)
3. 발급된 URL을 `data/config.json`의 `siteUrl`에 넣고 다시 push

## 한계

- 갤러리 뷰어는 길게 누르기 저장·우클릭·드래그를 막고 탭 전환 시 닫히지만, OS 스크린샷·화면 녹화는 막을 수 없다.
- 하객 캐릭터와 방명록 꽃은 접속 시점 + 1분 간격으로 갱신된다(실시간 아님).
- 카카오톡 인앱 브라우저에서 클립보드 복사가 막히는 기기가 있다. 그 경우 계좌번호를 길게 눌러 복사하도록 안내한다.

## 구조

`js/sprites/` 코드 픽셀 아트(폴백) · `js/assets.js` PNG 로더 · `js/world/` 씬과 타일맵·경로 탐색 · `js/entities/character.js` 캐릭터 ·
`js/ui/` 인트로·팝업·뷰어·HUD · `js/game.js` 루프·카메라·전환 · `tests/` Node 단위 테스트 · `docs/superpowers/` 설계·계획 문서
