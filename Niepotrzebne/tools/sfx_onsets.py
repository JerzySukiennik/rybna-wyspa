#!/usr/bin/env python3
"""Find sound events in downloaded previews so one-shots can be cut at real onsets.

  python3 -I sfx_onsets.py events <file> [<file> ...]   onsets with time, peak and length
  python3 -I sfx_onsets.py rms <file>                    loudness per 0.5 s (to pick steady loop regions)
"""
import os, subprocess, sys
import numpy as np

FFMPEG = '/usr/local/bin/ffmpeg'


def decode(path):
    raw = subprocess.run([FFMPEG, '-v', 'error', '-i', path, '-ac', '1', '-ar', '44100', '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def events(x, sr=44100, thr_db=-30.0, gap=0.12):
    w = int(0.005 * sr)
    win = w / sr
    n = len(x) // w
    rms = np.sqrt((x[:n * w].reshape(n, w) ** 2).mean(axis=1) + 1e-12)
    db = 20 * np.log10(rms / rms.max())
    on = db > thr_db
    out, i, last_end = [], 0, -1e9
    while i < n:
        if on[i] and i * win - last_end > gap:
            j = i
            while j < n and on[j]:
                j += 1
            seg = np.abs(x[i * w:j * w])
            peak = seg.max() if len(seg) else 1e-9
            out.append((i * win, 20 * np.log10(peak + 1e-12), (j - i) * win))
            last_end = j * win
            i = j
        else:
            i += 1
    return out


def main():
    cmd, files = sys.argv[1], sys.argv[2:]
    for f in files:
        x = decode(f)
        dur = len(x) / 44100
        pk = 20 * np.log10(np.abs(x).max() + 1e-12)
        print(f'## {f.split("/")[-1]}  {dur:.2f}s  peak {pk:.1f} dBFS')
        if cmd == 'events':
            minpk = float(os.environ.get('MINPK', '-99'))
            for t, p, L in events(x):
                if p >= minpk:
                    print(f'   t={t:7.3f}s  peak={p:6.1f} dBFS  len={L:.3f}s')
        else:
            step = int(0.5 * 44100)
            row = []
            for k in range(0, len(x) - step + 1, step):
                r = np.sqrt((x[k:k + step] ** 2).mean() + 1e-12)
                row.append(f'{k / 44100:.1f}:{20 * np.log10(r):.0f}')
            print('   ' + '  '.join(row))


if __name__ == '__main__':
    main()
