"""Stamp a build id on every module import so browsers never serve a stale module after a deploy.
Run before committing (the pre-commit hook does): python3 tools/stamp.py"""
import re, time, pathlib, subprocess
root = pathlib.Path(__file__).resolve().parent.parent
v = time.strftime('%Y%m%d%H%M%S')
for p in (root / 'js').glob('*.js'):
    s = p.read_text()
    s2 = re.sub(r"from '(\./[a-z0-9_]+\.js)(\?v=\d+)?'", lambda m: "from '%s?v=%s'" % (m.group(1), v), s)
    if s2 != s: p.write_text(s2)
idx = root / 'index.html'
s = idx.read_text()
s2 = re.sub(r'src="js/main\.js(\?v=\d+)?"', 'src="js/main.js?v=%s"' % v, s)
s2 = re.sub(r'href="css/site\.css(\?v=\d+)?"', 'href="css/site.css?v=%s"' % v, s2)
if s2 != s: idx.write_text(s2)
print('stamped', v)
