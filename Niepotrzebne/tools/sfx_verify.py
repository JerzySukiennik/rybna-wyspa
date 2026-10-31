#!/usr/bin/env python3
"""Check the built Rybna Wyspa SFX: format, duration, integrated loudness and true peak of every MP3.

  SFX_TMP=<scratch dir> nice -n 10 /usr/local/bin/python3 -I Niepotrzebne/tools/sfx_verify.py
"""
import json, os, re, subprocess, sys
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'assets', 'audio', 'sfx')
FFMPEG = '/usr/local/bin/ffmpeg'
FFPROBE = '/usr/local/bin/ffprobe'


def probe(path):
    r = subprocess.run([FFPROBE, '-v', 'error', '-select_streams', 'a:0', '-show_entries',
                        'stream=codec_name,channels,sample_rate,bit_rate:format=duration', '-of', 'json', path],
                       capture_output=True, text=True, check=True).stdout
    j = json.loads(r)
    s = j['streams'][0]
    return dict(codec=s['codec_name'], ch=s['channels'], sr=int(s['sample_rate']),
                kbps=round(int(s.get('bit_rate', 0)) / 1000), dur=float(j['format']['duration']))


def measure(path):
    cmd = [FFMPEG, '-hide_banner', '-nostats', '-i', path, '-af',
           'apad=pad_dur=1,loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-']
    err = subprocess.run(cmd, capture_output=True, text=True).stderr
    j = json.loads(re.findall(r'\{[^{}]*"input_i"[^{}]*\}', err)[-1])
    return float(j['input_i']), float(j['input_tp'])


def main():
    man = json.load(open(os.path.join(OUT, 'manifest.json')))
    files = sorted(f for f in os.listdir(OUT) if f.endswith('.mp3'))
    print(f'{"key":16}{"dur":>7}{"LUFS":>8}{"TP":>7}{"gain":>6}  fmt')
    bad = 0
    for f in files:
        key = f[:-4]
        p = os.path.join(OUT, f)
        m = probe(p)
        lufs, tp = measure(p)
        flags = []
        if m['codec'] != 'mp3' or m['ch'] != 1 or m['sr'] != 44100:
            flags.append('FORMAT')
        if tp > -1.0:
            flags.append('PEAK')
        if key not in man:
            flags.append('NOT-IN-MANIFEST')
        if abs(man.get(key, {}).get('dur', -1) - m['dur']) > 0.02:
            flags.append('DUR-MISMATCH')
        bad += bool(flags)
        gain = man.get(key, {}).get('gain', float('nan'))
        print(f'{key:16}{m["dur"]:7.3f}{lufs:8.1f}{tp:7.1f}{gain:6.2f}  {m["codec"]} {m["ch"]}ch {m["sr"]} {m["kbps"]}k {" ".join(flags)}')
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    print(f'\n{len(files)} files, problems {bad}, folder {total / 1e6:.2f} MB ({total} bytes)')


if __name__ == '__main__':
    main()
