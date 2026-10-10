"""Align official lyrics (lyrics.txt with [Section — description] headers) to Whisper word timings.
usage: python3 tools/align.py <whisper.json> <song_dir>   -> writes song_dir/timing.json and lyrics.lrc"""
import json, re, sys, difflib
wj, d = sys.argv[1], sys.argv[2]
norm = lambda w: re.sub(r"[^a-z0-9']", "", w.lower().replace("’", "'"))
ws = [w for s in json.load(open(wj))["segments"] if s["start"] < 355 for w in s.get("words", []) if norm(w["word"])]
sections, lines = [], []
for raw in open(f"{d}/lyrics.txt", encoding="utf-8"):
    raw = raw.strip()
    if not raw: continue
    m = re.match(r"\[(.+?)\]", raw)
    if m:
        name, _, desc = m.group(1).partition("—")
        sections.append({"name": name.strip(), "desc": desc.strip(), "t": None}); continue
    lines.append({"text": raw, "section": len(sections) - 1, "words": [{"w": w} for w in raw.split()]})
off = [(li, wi) for li, L in enumerate(lines) for wi in range(len(L["words"]))]
A = [norm(lines[li]["words"][wi]["w"]) for li, wi in off]
B = [norm(w["word"]) for w in ws]
times = [None] * len(A)
for a, b, n in difflib.SequenceMatcher(None, A, B, autojunk=False).get_matching_blocks():
    for k in range(n): times[a + k] = ws[b + k]["start"]
# interpolate gaps
known = [i for i, t in enumerate(times) if t is not None]
for i in range(len(times)):
    if times[i] is None:
        p = max([k for k in known if k < i], default=None); q = min([k for k in known if k > i], default=None)
        if p is None: times[i] = times[q] - 0.3 * (q - i)
        elif q is None: times[i] = times[p] + 0.35 * (i - p)
        else: times[i] = times[p] + (times[q] - times[p]) * (i - p) / (q - p)
for (li, wi), t in zip(off, times): lines[li]["words"][wi]["t"] = round(t, 2)
for L in lines:
    L["t"] = L["words"][0]["t"]
    s = sections[L["section"]]
    if s["t"] is None: s["t"] = L["t"]
for s in sections:
    if s["t"] is None: s["t"] = round(lines[-1]["words"][-1]["t"] + 4, 2)
matched = sum(t is not None for t in times)
json.dump({"sections": sections, "lines": lines}, open(f"{d}/timing.json", "w"), indent=1, ensure_ascii=False)
ts = lambda t: f"{int(t//60):02d}:{t%60:05.2f}"
with open(f"{d}/lyrics.lrc", "w") as f:
    for L in lines: f.write(f"[{ts(L['t'])}]" + " ".join(f"<{ts(w['t'])}>{w['w']}" for w in L["words"]) + "\n")
print(f"{len(lines)} lines, {len(sections)} sections, words matched {len(known)}/{len(A)}")
for s in sections: print(f"  {s['t']:7.2f}  {s['name']}")
