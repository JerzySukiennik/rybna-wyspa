# Rybna Wyspa: local static dev server that never lets the browser cache files (no stale modules after edits).
import functools
import http.server
import sys

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, max-age=0')
        super().end_headers()

    def log_message(self, *args):
        pass

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8740
root = sys.argv[2] if len(sys.argv) > 2 else '.'
handler = functools.partial(NoCache, directory=root)
http.server.ThreadingHTTPServer(('127.0.0.1', port), handler).serve_forever()
