"""Re-time only the words whisper never heard. align.py matches the official lyrics to whisper's words; a lyric word it
could not match is interpolated, and when whisper loses a stretch those interpolated words get spread evenly over the
next 10-30 s (one word every 2.5 s or 8 s), so the line is never whole on screen. A word counts as HEARD when whisper has
a word starting within 0.06 s of its time; heard words never move. Each run of unheard words is set at a sung pace
(0.32 s apart) straight after the last heard word, never past the next heard word or the next line.
usage: python3 tools/fix_word_spread.py songs/<slug>"""
import json, sys
d = sys.argv[1]; T = json.load(open(f'{d}/timing.json')); W = json.load(open(f'{d}/whisper.json'))
heard = sorted(float(w['start']) for s in W['segments'] for w in s.get('words', []) if w.get('start') is not None)
is_heard = lambda t: any(abs(h - t) < 0.06 for h in heard)
L = T['lines']; fixed = []
for i, l in enumerate(L):
    ws = l.get('words') or []
    if l.get('t') is None or len(ws) < 2: continue
    nxt = next((x['t'] for x in L[i + 1:] if x.get('t') is not None), l['t'] + 8)
    before = [w['t'] for w in ws]; k = 0
    while k < len(ws):
        if is_heard(ws[k]['t']) or k == 0: k += 1; continue
        j = k
        while j < len(ws) and not is_heard(ws[j]['t']): j += 1             # ws[k:j] = a run of unheard words
        lo = ws[k - 1]['t']; hi = ws[j]['t'] if j < len(ws) else nxt - 0.25
        span = hi - lo; n = j - k
        step = min(0.32, max(0.12, span / (n + 1)))
        for m in range(n): ws[k + m]['t'] = round(lo + step * (m + 1), 2)
        k = j
    if [w['t'] for w in ws] != before: fixed.append((i, l['text'], before, [w['t'] for w in ws]))
json.dump(T, open(f'{d}/timing.json', 'w'), ensure_ascii=False, indent=1)
for f in fixed: print(f[0], f[1], '\n   was', f[2], '\n   now', f[3])
print(len(fixed), 'lines re-timed')
