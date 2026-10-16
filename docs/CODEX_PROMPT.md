# Codex에게 전달할 프롬프트 (복사해서 그대로 붙여넣기)

```
작업 폴더: C:\Users\alsdn\wedding (git 저장소, 원격 없음. git push/remote 추가 금지. 커밋은 해도 됨)

이 프로젝트는 바닐라 JS 캔버스로 만든 "픽셀 게임형 모바일 청첩장"이다. 엔진과 UI는 완성되어 있고,
그래픽만 PNG로 교체하면 된다. 네 임무는 **OpenAI 이미지 API(gpt-image-1)로 에셋 이미지를 생성해서
규격에 맞게 넣는 것**이다. js/ 아래 엔진 코드는 수정하지 마라. 필요한 모든 규격과 프롬프트는
assets/README.md 에 있다. 먼저 그 파일과 README.md, tools/prepare_assets.py 를 읽어라.

해야 할 일:
1. tools/generate_assets.py 를 새로 작성한다.
   - OpenAI Python SDK 사용, 모델 gpt-image-1, size 1024x1536(세로) 또는 1024x1024, quality high,
     background "transparent", output_format png. API 키는 환경변수 OPENAI_API_KEY.
   - assets/README.md 의 프롬프트를 바탕으로 아래 파일을 raw/ 에 생성한다(이미 있으면 건너뛰기 옵션 --skip-existing).
     raw/characters/preset-0.png … preset-9.png  (하객 10종: 머리모양/머리색 5종 × 피부톤 2종, 옷 색 모두 다르게)
     raw/characters/groom.png, bride.png
     raw/tiles/G.png W.png P.png H.png F.png D.png K.png R.png S.png  (정사각, 1024x1024, seamless)
     raw/objects/arch.png tree.png sign.png mailbox.png frame.png bench.png chest.png desk.png board.png phone.png calendar.png mapframe.png flower.png stone.png door.png
   - 스타일 통일을 위해 모든 프롬프트 앞에 같은 스타일 문구를 붙여라:
     "cute chibi pixel art, 4-head-tall proportions, big head with expressive face, thick dark outline,
      soft cel shading, pastel warm palette, 16-bit RPG sprite style, centered, no text, no watermark"
     캐릭터는 "full body, front view, standing, arms at sides, wedding guest outfit",
     타일은 "top-down seamless tileable texture, flat, no border",
     오브젝트는 "top-down RPG object sprite, no ground shadow".
   - 각 캐릭터 프롬프트 예: "short black hair, red hoodie, blue jeans" / "long brown hair, yellow cardigan, skirt" /
     "curly blonde hair, green sweater" / "bob cut dark hair, pink blouse" / "baseball cap, navy jacket" …
     피부톤 2종(light / tan)으로 나눠서 10개. 신랑: "black hair, black tuxedo, bow tie". 신부: "brown updo with small veil, white wedding dress, tiny bouquet".
   - 실패한 요청은 3회까지 재시도. 생성 로그를 출력. 비용 절감을 위해 --only characters|tiles|objects 옵션 제공.
2. pip install pillow openai 후 python tools/generate_assets.py --only characters 를 먼저 실행해
   캐릭터 12장을 만들고, python tools/prepare_assets.py 를 실행한다.
   결과 assets/characters/*.png 가 64x96 RGBA 이고 assets/manifest.json 에 이름이 적혔는지 확인한다.
3. npm run serve (포트 5173) 로 띄우고 브라우저로 http://localhost:5173 을 열어 캐릭터가 교체됐는지 확인한다.
   (localStorage 에 프로필이 없으면 닉네임 입력 화면이 먼저 나온다.)
4. 캐릭터가 만족스러우면 --only tiles, --only objects 도 실행하고 다시 prepare_assets.py 를 돌린다.
   타일은 이어붙였을 때 경계가 티 나지 않아야 한다. 티가 나면 프롬프트에 "seamless, tileable, uniform lighting" 을 강조해 재생성.
5. 완료 후 변경 사항을 커밋한다. raw/ 는 .gitignore 에 있으니 커밋되지 않는다(정상).
   커밋 메시지 끝에 Co-Authored-By 줄은 넣지 않아도 된다.

주의:
- js/, css/, index.html 은 건드리지 마라. 문제가 있으면 수정하지 말고 보고만 해라.
- 캐릭터 PNG 는 배경이 투명해야 한다. 투명이 아니면 prepare_assets.py 가 모서리 색으로 배경을 지우긴 하지만 품질이 떨어진다.
- 한 번에 많은 이미지를 생성하면 비용이 든다. 먼저 캐릭터 1장만 생성해 스타일을 확인하는 --test 옵션도 넣어라.
```
