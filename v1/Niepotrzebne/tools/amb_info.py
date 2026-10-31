#!/usr/bin/env python3
"""Read Freesound sound pages (title, licence, description, tags). Usage: amb_info.py <sound_id> ... (sleeps 3 s between pages)."""
import html, re, sys, time, urllib.request

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36'


def info(sid):
    r = urllib.request.urlopen(urllib.request.Request(f'https://freesound.org/s/{sid}/', headers={'User-Agent': UA}), timeout=40)
    page = r.read().decode('utf8', 'replace')
    title = re.search(r'data-title="([^"]*)"', page)
    user = re.search(r'data-username="([^"]*)"', page)
    dur = re.search(r'data-duration="([^"]*)"', page)
    desc = re.search(r'<meta\s+name="description"\s+content="([^"]*)"', page)
    tags = sorted(set(re.findall(r'/browse/tags/([^/"]+)/', page)))
    if 'publicdomain/zero' in page or 'Creative Commons 0' in page:
        lic = 'CC0'
    elif 'licenses/by/4.0' in page:
        lic = 'CC BY 4.0'
    elif 'licenses/by/3.0' in page:
        lic = 'CC BY 3.0'
    else:
        lic = 'OTHER'
    return dict(id=sid, title=html.unescape(title.group(1)) if title else '?', user=user.group(1) if user else '?',
                dur=dur.group(1) if dur else '?', lic=lic, desc=html.unescape(desc.group(1)) if desc else '', tags=tags)


if __name__ == '__main__':
    for i, sid in enumerate(sys.argv[1:]):
        if i:
            time.sleep(3)
        try:
            d = info(sid)
        except Exception as e:
            print(sid, 'ERR', e, flush=True); continue
        print(f"## {d['id']} | {d['title'][:60]} | {d['user']} | {float(d['dur']):.1f}s | {d['lic']}", flush=True)
        print(f"   tags: {' '.join(d['tags'][:24])}", flush=True)
        print(f"   desc: {d['desc'][:260]}", flush=True)
