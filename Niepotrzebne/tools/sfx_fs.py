#!/usr/bin/env python3
"""Rybna Wyspa SFX sourcing from Freesound: CC0 search, licence checked on each sound page, hq preview download.

  python3 -I sfx_fs.py search "fish slap" "wet thud"   candidate table (CC0 filter only, for browsing)
  python3 -I sfx_fs.py fetch 571119 637823             licence check on the sound page + preview into audio-cache/sfx/fs-<id>/

Freesound answers 429 to bursts, so every request waits GAP seconds after the previous one.
"""
import html, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CACHE = os.path.join(ROOT, 'Niepotrzebne', 'audio-cache', 'sfx')
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36'
GAP = 3.5
ALLOWED = ('CC0 1.0', 'CC BY 4.0', 'CC BY 3.0')
LICENCES = [('publicdomain/zero/1.0', 'CC0 1.0'), ('licenses/by/4.0', 'CC BY 4.0'), ('licenses/by/3.0', 'CC BY 3.0')]
_last = [0.0]


def get(url):
    for attempt in range(6):
        wait = GAP - (time.time() - _last[0])
        if wait > 0:
            time.sleep(wait)
        _last[0] = time.time()
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=60) as r:
                return r.read(), r.geturl()
        except urllib.error.HTTPError as e:
            if e.code == 404:
                raise
            print(f'  HTTP {e.code} for {url}, backing off', file=sys.stderr)
            time.sleep(15 * (attempt + 1))
        except Exception as e:
            print(f'  {e} for {url}, retrying', file=sys.stderr)
            time.sleep(6 * (attempt + 1))
    raise RuntimeError('gave up: ' + url)


def search(q, n=8):
    url = 'https://freesound.org/search/?' + urllib.parse.urlencode({'q': q, 'f': 'license:"Creative Commons 0"'})
    s = get(url)[0].decode('utf8', 'replace')
    out = []
    for m in re.finditer(r'<div\s+class="bw-player"(.*?)tabindex', s, re.S):
        b = m.group(1)
        g = lambda k: (re.search(r'data-%s="([^"]*)"' % k, b) or [None, ''])[1]
        out.append(dict(id=g('sound-id'), user=g('username'), title=html.unescape(g('title')),
                        dur=round(float(g('duration') or 0), 2), dl=int(g('num-downloads') or 0)))
    return out[:n]


def page(sid):
    body, url = get(f'https://freesound.org/s/{sid}/')
    s = body.decode('utf8', 'replace')
    m = re.search(r'<a title="Go to the full license text" href="([^"]+)"[^>]*>([^<]+)</a>', s)
    href = m.group(1) if m else ''
    lic = next((name for key, name in LICENCES if key in href), 'UNKNOWN: ' + (m.group(2).strip() if m else 'no licence link'))
    grab = lambda k: html.unescape((re.search(r'data-%s="([^"]*)"' % k, s) or [None, ''])[1])
    user = (re.search(r'/people/([^/]+)/sounds/', url) or [None, ''])[1]
    desc = (re.search(r'<meta\s+(?:property="og:description"|name="description")\s+content="([^"]*)"', s) or [None, ''])[1]
    return dict(id=str(sid), title=grab('title'), user=user, licence=lic, page=url,
                mp3=grab('mp3').replace('-lq.mp3', '-hq.mp3'), dur=float(grab('duration') or 0),
                dl=int(grab('num-downloads') or 0), desc=html.unescape(desc)[:300])


def fetch(sid):
    d = os.path.join(CACHE, f'fs-{sid}')
    meta_path = os.path.join(d, 'info.json')
    if os.path.exists(meta_path):
        return json.load(open(meta_path))
    meta = page(sid)
    if meta['licence'] not in ALLOWED:
        print(f"{sid}: REFUSED, licence is {meta['licence']} ({meta['page']})")
        return None
    body, _ = get(meta['mp3'])
    os.makedirs(d, exist_ok=True)
    meta['file'] = os.path.join(d, f'{sid}-hq.mp3')
    open(meta['file'], 'wb').write(body)
    json.dump(meta, open(meta_path, 'w'), ensure_ascii=False, indent=1)
    return meta


if __name__ == '__main__':
    cmd, args = sys.argv[1], sys.argv[2:]
    if cmd == 'search':
        for q in args:
            print('##', q)
            for r in search(q):
                print(f"  {r['id']:>7} {r['dur']:6.2f}s dl={r['dl']:<6} {r['user'][:16]:16} {r['title'][:70]}")
    elif cmd == 'fetch':
        for sid in args:
            m = fetch(sid)
            if m:
                print(f"{sid} | {m['licence']} | {m['dur']:.2f}s | {m['user']} | {m['title']}\n   {m['page']}\n   {m['desc'][:200]}\n   -> {m['file']}")
    else:
        sys.exit('usage: sfx_fs.py search|fetch ARGS...')
