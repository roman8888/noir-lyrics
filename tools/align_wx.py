"""Forced alignment of the official lyrics to the mix with whisperx (wav2vec2 CTC), using the current timing.json
line times as the segment windows. Writes timing.json back with refined word starts (keeps the structure).
usage: .venv/bin/python tools/align_wx.py songs/<slug>"""
import json, sys, re, copy
import whisperx, torch
d = sys.argv[1]
T = json.load(open(f"{d}/timing.json"))
old = copy.deepcopy(T)
import wave, numpy as np
wav = sys.argv[2] if len(sys.argv) > 2 else None                      # a 16 kHz mono wav (afconvert) when ffmpeg is not around
if wav:
    with wave.open(wav, "rb") as W: assert W.getframerate() == 16000 and W.getnchannels() == 1; audio = np.frombuffer(W.readframes(W.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
else: audio = whisperx.load_audio(f"{d}/song.mp3")
device = "cpu"
model_a, meta = whisperx.load_align_model(language_code="en", device=device)
lines = [L for L in T["lines"] if L.get("t") is not None]
segs = []
for i, L in enumerate(lines):
    nxt = lines[i + 1]["t"] if i + 1 < len(lines) else L["t"] + 6
    segs.append({"text": L["text"], "start": max(0, L["t"] - 0.35), "end": max(L["t"] + 1.0, min(nxt + 0.1, L["t"] + 9))})
res = whisperx.align(segs, model_a, meta, audio, device, return_char_alignments=False)
norm = lambda w: re.sub(r"[^a-z0-9']", "", w.lower().replace("’", "'"))
json.dump(res["segments"], open(f"{d}/timing.wx_raw.json", "w"), indent=1, ensure_ascii=False)
import statistics
moved, kept, deltas = 0, 0, []
for L, S, seg in zip(lines, res["segments"], segs):
    aw = [w for w in S.get("words", []) if w.get("start") is not None]
    j = 0; cand = []
    for w in L["words"]:
        while j < len(aw) and norm(aw[j]["word"]) != norm(w["w"]): j += 1
        if j < len(aw):
            A = aw[j]; j += 1
            snapped = abs(float(A["start"]) - seg["start"]) < 0.03            # a word pinned to the window edge: no information
            if not snapped and A.get("score", 0) >= 0.55: cand.append((w, float(A["start"]) - w["t"]))
    if len(cand) < 3: kept += len(L["words"]); continue
    bias = statistics.median([dlt for _, dlt in cand])                       # the aligner's systematic lag on this line: discard it
    for w, dlt in cand:
        r = dlt - bias
        if abs(r) <= 0.25: w["t"] = round(w["t"] + r, 2); deltas.append(r); moved += 1   # only small, bias-free, confident corrections
        else: kept += 1
# every line starts with its first word; keep words in order
for L in lines:
    ts = [w["t"] for w in L["words"]]
    for k in range(1, len(ts)):
        if ts[k] < ts[k - 1]: ts[k] = ts[k - 1] + 0.05
    for w, t in zip(L["words"], ts): w["t"] = t
    L["t"] = L["words"][0]["t"]
json.dump(T, open(f"{d}/timing.json", "w"), indent=1, ensure_ascii=False)
json.dump(old, open(f"{d}/timing.before_wx.json", "w"), indent=1, ensure_ascii=False)
print(f"aligned {moved} words, {kept} kept; delta mean {statistics.mean(deltas):+.3f}s median {statistics.median(deltas):+.3f}s, |delta|>0.3s: {sum(abs(x) > 0.3 for x in deltas)}")
