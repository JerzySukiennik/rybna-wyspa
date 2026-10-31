#!/usr/bin/env python3
"""Build assets/audio/amb: CC0 Freesound field recordings as seamless loops at -22 LUFS, MP3 96k 44.1k stereo.
Previews (hq mp3) land in Niepotrzebne/audio-cache/amb/<key>/ and are only read by ffmpeg. Run: python3 -I amb_build.py"""
import html, json, os, re, shutil, subprocess, time, urllib.request
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
CACHE = os.path.join(ROOT, 'Niepotrzebne', 'audio-cache', 'amb')
OUT = os.path.join(ROOT, 'assets', 'audio', 'amb')
FFMPEG = '/usr/local/bin/ffmpeg'
NICE = ['nice', '-n', '10']
SR = 44100
TARGET_LUFS = -22.0
PEAK_CEIL = -1.0
XFADE = 2.5
TAKE = 30.0
UA ='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36'

# end of the preview is the natural continuation (no fade), so the loop body is the whole preview minus XFADE.
SOURCES = [
    dict(key='waves', fs=851989, user='Biofonik', mood='any', gain=0.70),
    dict(key='birds_day', fs=434564, user='KieranKeegan', mood='day', gain=0.60),
    dict(key='night', fs=412942, user='i_luv_soundz', mood='night', gain=0.60),
    dict(key='rain', fs=487381, user='SpaceJoe', mood='any', gain=0.60),
    dict(key='storm', fs=505469, user='SpaceJoe', mood='any', gain=0.70),
    dict(key='wind', fs=553733, user='Globofonia', mood='any', gain=0.55),
    dict(key='snow', fs=781681, user='kvgarlic', mood='any', gain=0.45),
    dict(key='heat', fs=715693, user='TRP', mood='day', gain=0.50),
    dict(key='fog', fs=860229, user='BayTsai', mood='any', gain=0.50),
]


def fetch_page(sid):
    req = urllib.request.Request(f'https://freesound.org/s/{sid}/', headers={'User-Agent': UA})
    page = urllib.request.urlopen(req, timeout=60).read().decode('utf8', 'replace')
    if not ('publicdomain/zero' in page or 'Creative Commons 0' in page):
        raise RuntimeError(f'freesound {sid} is not CC0')
    mp3 = re.search(r'data-mp3="([^"]+)"', page).group(1).replace('-lq.mp3', '-hq.mp3')
    title = html.unescape(re.search(r'data-title="([^"]*)"', page).group(1))
    return mp3, title


def download(url, dest):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=120) as r, open(dest, 'wb') as f:
        shutil.copyfileobj(r, f)
    if os.path.getsize(dest) < 20_000:
        raise RuntimeError(f'download too small: {url}')


def decode(path):
    raw = subprocess.run(NICE + [FFMPEG, '-v', 'error', '-i', path, '-vn', '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)


def loop(pcm, xfade):
    x = int(round(xfade * SR))
    n = len(pcm) - x
    body = pcm[:n].copy()
    tail = pcm[n:n + x]
    w = np.linspace(0.0, 1.0, x)[:, None]
    body[:x] = body[:x] * np.sqrt(w) + tail * np.sqrt(1.0 - w)
    return body


def ebur(pcm, folder):
    raw = os.path.join(folder, 'measure.f32')
    pcm.astype(np.float32).tofile(raw)
    r = subprocess.run(NICE + [FFMPEG, '-hide_banner', '-nostats', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', raw,
                               '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True)
    os.remove(raw)
    lufs = float(re.findall(r'I:\s+(-?\d+(?:\.\d+)?)\s+LUFS', r.stderr)[-1])
    peak = float(re.findall(r'True peak:\s*\n\s*Peak:\s*(-?\d+(?:\.\d+)?)\s*dBFS', r.stderr)[-1])
    return lufs, peak


def limit(pcm, folder, ceiling_db):
    pad = SR // 2
    ext = np.concatenate([pcm[-pad:], pcm, pcm[:pad]])
    src, dst = os.path.join(folder, 'lim_in.f32'), os.path.join(folder, 'lim_out.f32')
    ext.astype(np.float32).tofile(src)
    subprocess.run(NICE + [FFMPEG, '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', src,
                           '-af', f'alimiter=limit={10 ** (ceiling_db / 20):.4f}:attack=5:release=80:level=disabled',
                           '-f', 'f32le', dst], check=True)
    out = np.fromfile(dst, dtype=np.float32).reshape(-1, 2).astype(np.float64)
    os.remove(src)
    os.remove(dst)
    if len(out) < pad + len(pcm):
        raise RuntimeError('limiter returned a short buffer')
    return out[pad:pad + len(pcm)]


def normalise(x, folder):
    lufs, peak = ebur(x, folder)
    x = x * 10 ** ((TARGET_LUFS - lufs) / 20)
    for _ in range(5):
        lufs, peak = ebur(x, folder)
        if peak <= PEAK_CEIL + 0.05 and abs(lufs - TARGET_LUFS) < 0.1:
            break
        if peak > PEAK_CEIL:
            x = limit(x, folder, PEAK_CEIL)
        else:
            x = x * 10 ** ((TARGET_LUFS - lufs) / 20)
    return x


def write_mp3(pcm, out, folder, title):
    raw = os.path.join(folder, 'final.f32')
    pcm.astype(np.float32).tofile(raw)
    subprocess.run(NICE + [FFMPEG, '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', raw,
                           '-c:a', 'libmp3lame', '-b:a', '96k', '-ar', str(SR), '-ac', '2',
                           '-metadata', f'title={title}', out], check=True)
    os.remove(raw)


def rms_db(x):
    return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)


def best_window(pcm):
    half = SR // 2
    mono = pcm.mean(axis=1)
    n = len(mono) // half
    db = 20 * np.log10(np.sqrt(np.mean(mono[:n * half].reshape(n, half) ** 2, axis=1)) + 1e-9)
    span = int(TAKE / 0.5)
    best_s, best_score = 0, np.inf
    for s0 in range(0, n - span - int(XFADE / 0.5) + 1):
        seg = db[s0:s0 + span]
        if seg.min() < -55:
            continue
        score = seg.std() + abs(seg[-2:].mean() - seg[:2].mean())
        if score < best_score:
            best_s, best_score = s0, score
    return best_s * 0.5


def main():
    os.makedirs(OUT, exist_ok=True)
    manifest, lines = {}, []
    for s in SOURCES:
        folder = os.path.join(CACHE, s['key'])
        if os.path.exists(folder):
            shutil.rmtree(folder)
        os.makedirs(folder)
        mp3_url, title = fetch_page(s['fs'])
        src = os.path.join(folder, f"fs-{s['fs']}.mp3")
        download(mp3_url, src)
        time.sleep(3)
        pcm = decode(src)
        need = int(round((TAKE + XFADE) * SR))
        if len(pcm) < need:
            raise RuntimeError(f"{s['key']}: source {len(pcm)/SR:.2f}s shorter than {TAKE + XFADE:.1f}s")
        t0 = best_window(pcm)
        print(f"{s['key']}: window starts at {t0:.1f}s of {len(pcm)/SR:.1f}s", flush=True)
        seg = pcm[int(round(t0 * SR)):int(round(t0 * SR)) + need]
        body = normalise(loop(seg, XFADE), folder)
        n_body = len(body) / SR
        if not 20.0 <= n_body <= 60.0:
            raise RuntimeError(f"{s['key']}: loop {n_body:.2f}s outside 20-60 s")
        half = SR // 2
        seam = (rms_db(body[-half:]), rms_db(body[:half]), rms_db(body))
        out = os.path.join(OUT, s['key'] + '.mp3')
        for _ in range(5):
            write_mp3(body, out, folder, title)
            c_lufs, c_peak = ebur(decode(out), folder)
            if abs(c_lufs - TARGET_LUFS) <= 0.1 and c_peak <= PEAK_CEIL + 0.3:
                break
            body = body * 10 ** ((TARGET_LUFS - c_lufs) / 20)
            if c_peak > PEAK_CEIL:
                body = limit(body, folder, PEAK_CEIL)
        print(f"{s['key']}: src {len(pcm)/SR:.2f}s -> loop {len(body)/SR:.2f}s, out {c_lufs:.2f} LUFS / {c_peak:.2f} dBTP, "
              f"seam rms end/start/mean {seam[0]:.1f}/{seam[1]:.1f}/{seam[2]:.1f} dB, mp3 {os.path.getsize(out)/1e6:.2f} MB, "
              f"'{title}' by {s['user']}", flush=True)
        manifest[s['key']] = {'file': s['key'] + '.mp3', 'dur': round(len(body) / SR, 2), 'loop': True,
                              'gain': s['gain'], 'mood': s['mood']}
        lines.append(f"- `{s['key']}.mp3`: \"{title}\" by {s['user']} (Freesound, CC0 1.0) "
                     f"https://freesound.org/people/{s['user']}/sounds/{s['fs']}/")
    with open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
        f.write('\n')
    head = ('# Rybna Wyspa ambience credits\n\n'
            'Every loop is a real field recording from Freesound, licence CC0 1.0 (public domain dedication, no attribution '
            'required). Loops were cut from the Freesound previews, crossfaded into a seamless loop and loudness-normalised '
            'to -22 LUFS with ffmpeg.\n\n')
    with open(os.path.join(OUT, 'CREDITS.md'), 'w', encoding='utf8') as f:
        f.write(head + '\n'.join(lines) + '\n')


if __name__ == '__main__':
    main()
