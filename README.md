# 픽셀 가든 모바일 청첩장

터치로 캐릭터를 움직여 가든 웨딩 맵(광장 + 방 5개)을 돌아다니는 모바일 청첩장.
빌드 도구 없이 정적 파일만으로 동작하며 GitHub Pages에 그대로 올릴 수 있다.

```
npm test          # 단위 테스트 (Node 20+)
npm run serve     # http://localhost:5173
```

## 구성

| 공간 | 내용 |
|---|---|
| 가든 광장(hub) | 꽃 아치 아래 신랑·신부, 방명록을 남긴 하객 캐릭터들, 방 5개로 가는 문 |
| 예식 안내소(info) | 일시·장소 팝업, 지도 링크, 연락처(전화/문자), 교통 안내, 캘린더(.ics) 저장 |
| 갤러리관(gallery) | 사진 수만큼 액자가 걸린 복도. 액자 앞에서 탭하면 확대, 스와이프로 넘김 |
| 우리 이야기 길(story) | 타임라인 이정표, 끝에 벤치에 앉은 두 사람 |
| 방명록 정원(guestbook) | 우체통에서 축하 메시지 작성 → 꽃으로 피어남. Google 스프레드시트에 저장 |
| 마음 전하는 곳(gifts) | 신랑·신부측 계좌 복사, 카카오페이 링크, 청첩장 공유 |

## 내용 수정

- `data/config.json`: 이름, 날짜(`+09:00` 포함 ISO), 장소, 지도 링크, 교통, 연락처, 계좌, 인사말, 타임라인
- `gallery/`: 사진 파일을 넣고 `gallery/manifest.json`에 파일명 배열로 적는다. 긴 변 1600px 이하 권장.
- 혼주 계좌: `parents[]` 항목에 `"account": {"bank":"","number":"","holder":"","kakaopay":""}` 추가(선택)
- 카카오톡 공유: Kakao Developers에서 JavaScript 키 발급 → `kakaoJsKey`. 플랫폼에 배포 도메인 등록. 루트에 `og.png`(1200×630) 추가 권장.

## 그래픽 교체 (AI 생성 PNG)

기본 그래픽은 코드로 그린 간단한 픽셀 아트다. 레퍼런스 수준의 캐릭터·맵을 원하면
`assets/README.md`의 프롬프트로 이미지를 만들어 `raw/`에 넣고 변환 스크립트를 돌린다.

```
pip install pillow
python tools/prepare_assets.py
```

캐릭터는 **정면 전신 1장**이면 되고(좌우 반전·걷기 들썩임은 엔진이 처리), 맵은 타일 9종 또는 씬 배경 한 장으로 교체할 수 있다.
게임을 켠 뒤 브라우저 콘솔에서 `__exportMap()`을 실행하면 현재 씬 레이아웃 PNG가 내려받아져 img2img 밑그림으로 쓸 수 있다.

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
