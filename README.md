# Noir — interactive lyric videos

A scroll-driven 3D site for Roman's songs (noir British trip-hop):

1. **The city** (home page): scrolling flies a camera from a drone shot over a rainy noir city down to
   street level (wet reflections, cars, street lamps) and on to one lit window with the song title in red neon.
2. **The song**: "enter the song" flies through the window into a music video. Each word appears in 3D
   the moment it is sung, the word being sung is highlighted, and each line has its own backlit image
   (birds, a house, a crumbling ground, red water, a door, a chain, a sunrise…) picked from the words.
   Each section (Intro, Rap 1, Chorus…) has its own weather: rain, red hard cuts, light from above, dawn.

Plain Three.js (r160 from a CDN), no build step.

## Run

```
./serve.sh        # http://localhost:8812  (serve.py supports Range, so seeking in the mp3 works)
```

Player keys: Space play/pause · ←/→ seek 5 s · Esc back to the city · move the mouse = camera parallax,
hover a word to make it swell.

## Add a song

1. `songs/<slug>/song.mp3` (git-ignored; unreleased audio stays local).
2. `songs/<slug>/lyrics.txt` — official lyrics with `[Section — description]` headers.
3. Word timings: transcribe with Whisper (word timestamps) and align the official text:
   `python3 tools/align.py whisper.json songs/<slug>` → `timing.json` + `lyrics.lrc`.
4. Add the song to `js/songs.js`; section looks live in `LOOKS` there (rain, warm, red, beam, dawn, cut, fog).
5. Fix a line's timing by hand in `timing.json`, or use **tap-sync** in the player (Enter at each line start → save .lrc).

## Files

| file | what |
|---|---|
| `js/city.js` | the city: instanced buildings with procedural windows, mirror street, lamps, cars, neon, camera spline |
| `js/song.js` | the lyric video: word timing, shots/camera, section weather, highlight, hover |
| `js/motifs.js` | per-line backdrop images, chosen by keyword rules (`RULES`) |
| `js/main.js` | renderer, film-look post (bloom, grain, blinds, chromatic aberration), scroll, player UI |
| `tools/align.py` | align official lyrics to Whisper word timings |
