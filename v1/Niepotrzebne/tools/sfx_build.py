#!/usr/bin/env python3
"""Rybna Wyspa sound effects: cut each recording from audio-cache/sfx, trim, fade, two-pass loudnorm
(-16 LUFS one-shots, -20 LUFS loops, true peak -1.5 dB), mono 44.1 kHz MP3 96 kbps.

  SFX_TMP=<scratch dir> nice -n 10 /usr/local/bin/python3 -I Niepotrzebne/tools/sfx_build.py

Writes assets/audio/sfx/<key>.mp3, manifest.json and CREDITS.md. Cut points are in SPEC.
Loops are crossfaded at the seam (equal power), 'tile' loops repeat a short designed loop.
"""
import json, math, os, re, subprocess, sys, urllib.parse
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CACHE = os.path.join(ROOT, 'Niepotrzebne', 'audio-cache', 'sfx')
OUT = os.path.join(ROOT, 'assets', 'audio', 'sfx')
TMP = os.environ['SFX_TMP']
FFMPEG = '/usr/local/bin/ffmpeg'
FFPROBE = '/usr/local/bin/ffprobe'
SR = 44100

SPEC = {
    'flop_1': dict(src='450830', at=0.00, len=0.90, gain=0.8),
    'flop_2': dict(src='450830', at=1.10, len=0.90, gain=0.8),
    'flop_3': dict(src='450830', at=3.28, len=0.92, gain=0.8),
    'flop_4': dict(src='679389', at=0.50, len=1.10, gain=0.8),
    'flop_5': dict(src='679389', at=3.18, len=0.57, gain=0.8),
    'land_soft_1': dict(src='679391', gain=0.7),
    'land_soft_2': dict(src='847272', gain=0.7),
    'land_soft_3': dict(src='540077', gain=0.7),
    'land_hard_1': dict(src='223966', gain=0.8),
    'land_hard_2': dict(src='532139', gain=0.8),
    'pickup_1': dict(src='515620', gain=0.7),
    'pickup_2': dict(src='445968', gain=0.7),
    'pickup_3': dict(src='575333', at=1.16, len=0.75, gain=0.7),
    'throw_1': dict(src='394873', gain=0.6),
    'throw_2': dict(src='632700', len=1.5, gain=0.6),
    'splash_small_1': dict(src='233975', at=1.60, len=0.65, gain=0.7),
    'splash_small_2': dict(src='853279', gain=0.7),
    'splash_big': dict(src='320330', at=2.27, len=2.2, gain=0.9),
    'dump': dict(src='656727', at=16.06, len=1.3, gain=0.9),
    'sell_1': dict(src='336571', gain=0.6),
    'sell_2': dict(src='83915', at=13.74, len=1.46, gain=0.7),
    'sell_3': dict(src='534066', at=4.0, len=1.3, gain=0.8),
    'sell_big': dict(src='453763', at=0.84, len=1.5, gain=0.9),
    'level_up': dict(src='502882', len=2.6, gain=0.8),
    'quest_done': dict(src='333695', gain=0.8),
    'rare': dict(src='552536', len=2.2, gain=0.8),
    'place_wood': dict(src='543705', at=5.76, len=0.65, gain=0.7),
    'place_metal': dict(src='682153', gain=0.6),
    'remove': dict(src='565699', gain=0.6),
    'rotate': dict(src='872341', gain=0.5),
    'deny': dict(src='653370', gain=0.6),
    'conveyor_loop': dict(kind='loop', src='455666', at=2.0, len=6.0, xf=1.0, gain=0.35),
    'flume_loop': dict(kind='loop', src='249666', at=0.5, len=6.5, xf=1.5, gain=0.4),
    'pump_manual': dict(src='361771', at=4.42, len=1.28, gain=0.7),
    'spawner_auto': dict(src='148957', gain=0.6),
    'bubble_1': dict(src='529383', at=0.30, len=0.75, gain=0.6),
    'bubble_2': dict(src='529383', at=2.46, len=0.65, gain=0.6),
    'freezer': dict(src='457069', at=2.0, len=1.5, gain=0.6),
    'smoker': dict(src='363092', at=9.0, len=1.5, gain=0.6),
    'fry': dict(src='223728', at=0.33, len=2.25, gain=0.75),
    'fryer_loop': dict(kind='loop', src='440587', at=1.0, len=5.0, xf=1.2, gain=0.3),
    'zap': dict(src='160421', at=0.12, len=1.2, gain=0.7),
    'geiger': dict(src='674113', at=0.0, len=1.5, gain=0.6),
    'machine': dict(src='453311', at=7.43, len=1.5, gain=0.7),
    'polish': dict(src='764988', at=18.1, len=1.3, gain=0.6),
    'ice_crackle': dict(src='369982', at=29.55, len=1.0, gain=0.7),
    'step_grass_1': dict(src='521587', at=0.085, len=0.45, gain=0.6),
    'step_grass_2': dict(src='521587', at=0.785, len=0.45, gain=0.6),
    'step_grass_3': dict(src='521587', at=1.475, len=0.45, gain=0.6),
    'step_grass_4': dict(src='521587', at=2.265, len=0.45, gain=0.6),
    'step_sand_1': dict(src='564893', at=50.361, len=0.5, gain=0.6),
    'step_sand_2': dict(src='564893', at=52.366, len=0.5, gain=0.6),
    'step_sand_3': dict(src='564893', at=53.304, len=0.5, gain=0.6),
    'step_sand_4': dict(src='564893', at=54.361, len=0.5, gain=0.6),
    'step_wood_1': dict(src='543685', at=13.494, len=0.5, gain=0.6),
    'step_wood_2': dict(src='543685', at=14.662, len=0.5, gain=0.6),
    'step_wood_3': dict(src='543685', at=17.301, len=0.5, gain=0.6),
    'step_wood_4': dict(src='543685', at=18.393, len=0.5, gain=0.6),
    'step_metal_1': dict(src='698697', at=0.0, len=0.5, gain=0.6),
    'step_metal_2': dict(src='698697', at=1.497, len=0.5, gain=0.6),
    'step_metal_3': dict(src='698697', at=3.003, len=0.5, gain=0.6),
    'step_metal_4': dict(src='698697', at=4.52, len=0.5, gain=0.6),
    'jump': dict(src='509410', gain=0.7),
    'land': dict(src='669714', gain=0.7),
    'jetpack_loop': dict(kind='tile', src='402816', xf=0.1, reps=3, gain=0.35),
    'thunder_1': dict(src='744722', at=6.2, len=2.6, gain=0.9, notrim=True),
    'thunder_2': dict(src='672776', at=0.25, len=4.25, gain=0.9, notrim=True),
    'meteor': dict(src='812667', at=0.35, len=1.2, gain=0.8),
    'wind_gust': dict(src='726319', at=0.0, len=3.0, gain=0.7),
    'rocket': dict(src='730041', at=4.2, len=1.8, gain=0.8),
    'fire_whoosh': dict(src='457209', at=0.85, len=1.4, gain=0.8),
    'printer': dict(src='241801', gain=0.5),
    'glitch': dict(src='199939', gain=0.6),
    'growl': dict(src='345733', gain=0.8),
    'shimmer': dict(src='211624', at=4.86, len=1.74, gain=0.7),
    'ui_click': dict(src='546974', gain=0.5),
    'ui_open': dict(src='580826', gain=0.5),
    'ui_close': dict(src='582425', at=1.0, len=1.0, gain=0.5),
    'ui_buy': dict(src='720218', gain=0.5),
    'ui_tab': dict(src='108335', gain=0.5),
    'ui_error': dict(src='811740', gain=0.5),
}


def info(sid):
    return json.load(open(os.path.join(CACHE, f'fs-{sid}', 'info.json')))


def decode(sid, at=0.0, length=None):
    path = os.path.join(CACHE, f'fs-{sid}', f'{sid}-hq.mp3')
    cmd = [FFMPEG, '-v', 'error', '-i', path, '-ss', f'{at}']
    if length is not None:
        cmd += ['-t', f'{length}']
    cmd += ['-ac', '1', '-ar', str(SR), '-f', 'f32le', '-']
    return np.frombuffer(subprocess.run(cmd, capture_output=True, check=True).stdout, dtype=np.float32).copy()


def trim(x, db=-40.0, minlen=0.2):
    idx = np.where(np.abs(x) > np.abs(x).max() * 10 ** (db / 20))[0]
    a = max(0, idx[0] - int(0.003 * SR))
    b = min(len(x), idx[-1] + int(0.02 * SR))
    if b - a < minlen * SR:
        b = min(len(x), a + int(minlen * SR))
    return x[a:b].copy()


def fades(x, fin=0.002, fout=0.03):
    n = len(x)
    k = min(n // 2, int(fin * SR))
    if k:
        x[:k] *= np.linspace(0, 1, k, dtype=np.float32)
    k = min(n // 2, int(fout * SR))
    if k:
        x[n - k:] *= np.linspace(1, 0, k, dtype=np.float32)
    return x


def crossfade_loop(seg, D, X):
    n, x = int(D * SR), int(X * SR)
    body, tail = seg[:n].copy(), seg[n:n + x]
    k = min(len(tail), x)
    w = np.linspace(0, 1, k, dtype=np.float32)
    body[:k] = body[:k] * np.sqrt(w) + tail[:k] * np.sqrt(1 - w)
    return body


def ffmpeg_measure(raw, target):
    cmd = [FFMPEG, '-hide_banner', '-nostats', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', raw,
           '-af', f'loudnorm=I={target}:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-']
    err = subprocess.run(cmd, capture_output=True, text=True).stderr
    return json.loads(re.findall(r'\{[^{}]*"input_i"[^{}]*\}', err)[-1])


def loudnorm_encode(x, out, target, tp=-1.5):
    meas = os.path.join(TMP, 'meas.raw')
    np.concatenate([x, np.zeros(SR, dtype=np.float32)]).astype(np.float32).tofile(meas)
    j = ffmpeg_measure(meas, target)
    if not (-70 < float(j['input_i']) < 0):
        raise RuntimeError(f'bad measurement for {out}: {j["input_i"]}')
    raw = os.path.join(TMP, 'cur.raw')
    x.astype(np.float32).tofile(raw)
    af = (f"loudnorm=I={target}:TP={tp}:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}"
          f":measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
    subprocess.run([FFMPEG, '-hide_banner', '-nostats', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1',
                    '-i', raw, '-af', af, '-ar', str(SR), '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '96k', out], check=True)
    return float(j['input_i']), float(j['input_tp'])


def measure_out(path):
    cmd = [FFMPEG, '-hide_banner', '-nostats', '-i', path, '-af',
           'apad=pad_dur=1,loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-']
    err = subprocess.run(cmd, capture_output=True, text=True).stderr
    j = json.loads(re.findall(r'\{[^{}]*"input_i"[^{}]*\}', err)[-1])
    return float(j['input_i']), float(j['input_tp'])


def probe(path):
    return float(subprocess.run([FFPROBE, '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
                                capture_output=True, text=True, check=True).stdout.strip())


REF_LUFS = -23.0


def build(key, s):
    out = os.path.join(OUT, f'{key}.mp3')
    loop = s.get('kind') == 'loop'
    if s.get('kind') == 'tile':
        seg = decode(s['src'])
        one = crossfade_loop(seg, len(seg) / SR - s['xf'], s['xf'])
        x = np.tile(one, s['reps']).astype(np.float32)
        target = -20
        loop = True
    elif loop:
        seg = decode(s['src'], s['at'], s['len'] + s['xf'])
        x = crossfade_loop(seg, s['len'], s['xf'])
        target = -20
    else:
        x = decode(s['src'], s.get('at', 0.0), s.get('len'))
        x = fades(x if s.get('notrim') else trim(x), fout=0.03)
        target = -16
    for tp in (-1.5, -2.5, -3.5):
        lufs_in, tp_in = loudnorm_encode(x, out, target, tp)
        lufs_out, tp_out = measure_out(out)
        if tp_out <= -1.0:
            break
    auto = min(1.0, max(0.05, 10 ** ((REF_LUFS - lufs_out) / 20)))
    gain = round(min(1.0, auto * (0.6 if key.startswith('ui_') else 1.0)), 2)
    d = probe(out)
    entry = dict(file=f'{key}.mp3', dur=round(d, 3), loop=loop, gain=gain)
    return entry, lufs_out, tp_out, s['src']


def main():
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(TMP, exist_ok=True)
    only = [k for k in os.environ.get('ONLY', '').split(',') if k]
    man_path, cred_path = os.path.join(OUT, 'manifest.json'), os.path.join(OUT, 'CREDITS.md')
    manifest = json.load(open(man_path)) if only else {}
    lines = {}
    if only and os.path.exists(cred_path):
        for line in open(cred_path, encoding='utf8'):
            m = re.match(r'- `([^`]+)\.mp3`:', line)
            if m:
                lines[m.group(1)] = line.rstrip('\n')
    for key in (only or list(SPEC)):
        entry, lufs, tp, src = build(key, SPEC[key])
        manifest[key] = entry
        i = info(src)
        author = urllib.parse.unquote(i['user'])
        lines[key] = f'- `{key}.mp3`: "{i["title"]}" by {author} (Freesound, {i["licence"]}) {i["page"]}'
        print(f'{key:15} {entry["dur"]:6.3f}s  loop={str(entry["loop"]):5}  src={src:7}  out={lufs:6.1f} LUFS  tp={tp:5.1f}  gain={entry["gain"]}')
    manifest = {k: manifest[k] for k in SPEC if k in manifest}
    json.dump(manifest, open(man_path, 'w'), indent=1)
    head = ['# Rybna Wyspa sound effects credits', '',
            'Every recording is a Freesound sound under CC0 1.0 (Public Domain Dedication). The licence was checked on each sound page.',
            'Trimmed, faded, looped where needed and loudness-normalised with ffmpeg.', '']
    open(cred_path, 'w').write('\n'.join(head + [lines[k] for k in SPEC if k in lines]) + '\n')
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT) if f.endswith('.mp3'))
    print(f'files {len(manifest)}  total {total / 1e6:.2f} MB')


if __name__ == '__main__':
    main()
