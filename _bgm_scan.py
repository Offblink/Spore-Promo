"""BGM 候选测量：时长 / 分段 RMS 能量曲线 / 起尾能量（loop 自然度证据）。纯 stdlib + ffmpeg。"""
import subprocess, os, sys, math, json

BGM_DIR = r"C:\Users\37549\Desktop\Vibe Coding\useful\Pot\data\skills\video-shotcraft\assets\audio\bgm"
SR = 11025  # 分析用低采样率，够看能量曲线


def decode(path):
    p = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR),
         "-f", "s16le", "-"],
        capture_output=True)
    raw = p.stdout
    n = len(raw) // 2
    import array
    a = array.array('h')
    a.frombytes(raw[:n * 2])
    return a


def rms(a, i0, i1):
    s = 0
    for i in range(i0, min(i1, len(a))):
        s += a[i] * a[i]
    n = min(i1, len(a)) - i0
    return math.sqrt(s / n) if n else 0.0


def db(x):
    return 20 * math.log10(x / 32768.0) if x > 0 else -99.0


for name in sorted(os.listdir(BGM_DIR)):
    if not name.endswith('.mp3'):
        continue
    path = os.path.join(BGM_DIR, name)
    a = decode(path)
    dur = len(a) / SR
    # 1 秒分段 RMS（dBFS）
    seg = SR
    curve = [round(db(rms(a, i, i + seg)), 1) for i in range(0, len(a) - 1, seg)]
    head = round(db(rms(a, 0, SR // 2)), 1)      # 前 0.5s
    tail = round(db(rms(a, len(a) - SR // 2, len(a))), 1)  # 后 0.5s
    print("%-22s dur=%6.1fs head=%6.1f tail=%6.1f" % (name, dur, head, tail))
    print("    per-1s dBFS:", curve)
