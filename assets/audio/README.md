# 배경음악 파일

| 파일 | 곡 | 연주·출처 | 라이선스 |
|---|---|---|---|
| `wedding-march.mp3` (1분 23초, 1.3MB) | 멘델스존 「한여름 밤의 꿈」 Op.61 중 결혼행진곡 | European Archive 연주, [위키미디어 공용](https://commons.wikimedia.org/wiki/File:A_Midsummer_Night%27s_Dream_Op._61_Wedding_March_(Mendelssohn)_European_Archive.ogg) (원 출처 Musopen) | 퍼블릭 도메인(작품·녹음) |

- 원본 OGG(4분 54초, 7.7MB, SHA-1 1fc5f898…2f01)의 0~83.3초(팡파르와 주제 전체)를 잘라 끝을 부드럽게 줄이고 -16 LUFS로 맞춘 MP3(아이폰 호환). 다시 만들기: `tools/prepare_audio.py`.
- 예식장에 머무는 동안 끝나면 처음부터 반복한다.
- 파일이 없으면 예식장은 직접 합성한 행진곡으로 대신 재생한다(`js/audio/bgm.js` TRACKS.march).
- 정원 BGM은 파일 없이 합성(파헬벨 캐논 편곡).
