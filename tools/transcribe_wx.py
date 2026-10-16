"""Transcribe a song with whisperx (word timestamps) from a 16 kHz mono wav (afconvert; no ffmpeg needed),
then align the official lyrics with tools/align.py.  usage: .venv/bin/python tools/transcribe_wx.py <song_dir> <wav>"""
import sys, json, wave, subprocess, functools, numpy as np, torch
_tl = torch.load
def _load(*a, **k): k['weights_only'] = False; return _tl(*a, **k)   # the VAD checkpoint whisperx ships predates torch 2.6's weights-only default
torch.load = _load
import whisperx
d, wav = sys.argv[1], sys.argv[2]
with wave.open(wav, "rb") as W:
    assert W.getframerate() == 16000 and W.getnchannels() == 1
    audio = np.frombuffer(W.readframes(W.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
model = whisperx.load_model("medium.en", device="cpu", compute_type="int8", language="en")
res = model.transcribe(audio, batch_size=8)
model_a, meta = whisperx.load_align_model(language_code="en", device="cpu")
res = whisperx.align(res["segments"], model_a, meta, audio, "cpu", return_char_alignments=False)
segs = [{"start": s["start"], "end": s["end"], "text": s["text"], "words": [{"word": w["word"], "start": w.get("start", s["start"]), "end": w.get("end", s["end"])} for w in s.get("words", [])]} for s in res["segments"]]
json.dump({"segments": segs}, open(f"{d}/whisper.json", "w"), indent=1, ensure_ascii=False)
print(f"{len(segs)} segments, {sum(len(s['words']) for s in segs)} words")
for s in segs[:6]: print(f"  {s['start']:6.1f} {s['text'][:70]}")
subprocess.run([sys.executable.replace('.venv/bin/python', 'python3') if False else "python3", "tools/align.py", f"{d}/whisper.json", d], check=True)
