#!/usr/bin/env python3
"""Search Freesound (HTML, CC0 filter) for ambience candidates. Usage: amb_search.py "query" ... (sleeps 4 s between queries)."""
import html, re, sys, time, urllib.parse, urllib.request

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36'


def search(q, n=15):
    url = 'https://freesound.org/search/?' + urllib.parse.urlencode({'q': q, 'f': 'license:"Creative Commons 0"', 's': 'Rating highest first'})
    body = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=40).read().decode('utf8', 'replace')
    out = []
    for m in re.finditer(r'<div\s+class="bw-player"(.*?)tabindex', body, re.S):
        b = m.group(1)
        g = lambda k: (re.search(r'data-%s="([^"]*)"' % k, b) or [None, ''])[1]
        out.append(dict(id=g('sound-id'), user=g('username'), title=html.unescape(g('title')),
                        dur=round(float(g('duration') or 0), 1), dl=int(g('num-downloads') or 0)))
    return out[:n]


if __name__ == '__main__':
    for i, q in enumerate(sys.argv[1:]):
        if i:
            time.sleep(4)
        print('##', q)
        for r in search(q):
            print(f"  {r['id']:>7} {r['dur']:7.1f}s dl={r['dl']:<6} {r['user'][:18]:18} {r['title'][:64]}", flush=True)
