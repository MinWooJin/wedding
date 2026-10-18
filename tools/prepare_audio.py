"""예식장 BGM 만들기: 위키미디어 공용의 멘델스존 결혼행진곡(퍼블릭 도메인) 녹음을 잘라 MP3로.

사용: .venv-assets/Scripts/python.exe tools/prepare_audio.py <원본.ogg>
원본: https://commons.wikimedia.org/wiki/File:A_Midsummer_Night%27s_Dream_Op._61_Wedding_March_(Mendelssohn)_European_Archive.ogg
      (SHA-1 1fc5f898efd2fa13a0fcb11e328a8b69145b2f01, 7,748,964 bytes)
- 0~83.3초: 트럼펫 팡파르 + 주제 전체(83.3초는 다음 부분 직전의 숨 쉬는 자리)
- 끝 1.7초 페이드아웃, 음량 -16 LUFS로 맞춤, 44.1kHz 스테레오 128kbps
변환기: pip install imageio-ffmpeg (.venv-assets 안에만)
"""
import subprocess, sys
import imageio_ffmpeg

src = sys.argv[1]
subprocess.run([
    imageio_ffmpeg.get_ffmpeg_exe(), '-hide_banner', '-loglevel', 'error', '-i', src, '-t', '83.3',
    '-af', 'afade=t=in:st=0:d=0.03,afade=t=out:st=81.6:d=1.7,loudnorm=I=-16:TP=-1.5:LRA=11',
    '-ar', '44100', '-ac', '2', '-c:a', 'libmp3lame', '-b:a', '128k', '-map_metadata', '-1', '-y', 'assets/audio/wedding-march.mp3',
], check=True)
print('assets/audio/wedding-march.mp3')
