import * as THREE from 'three';
import { Font } from 'three/addons/loaders/FontLoader.js';
import { TTFLoader } from 'three/addons/loaders/TTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { createCity } from './city.js?v=20261017102144';
import { createProps } from './props.js?v=20261017102144';
import { createSky } from './sky.js?v=20261017102144';
import { createRoute } from './route.js?v=20261017102144';
import { createSong, LEAD } from './song.js?v=20261017102144';
import { SONGS } from './songs.js?v=20261017102144';
import { clamp, fmt, toLRC } from './util.js?v=20261017102144';
import { createLanding } from './landing.js?v=20261017102144';
import { createDrops } from './drops.js?v=20261017102144';

const $ = id => document.getElementById(id);
const FONTS = { roman: 'fonts/playfair-700-normal.woff', italic: 'fonts/playfair-700-italic.woff' };

const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(new URLSearchParams(location.search).has('record') ? 1 : Math.min(devicePixelRatio, 2));   // recordings at 1x: a quarter of the pixels, a quarter of the file
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// film look: faint chromatic aberration on the kick, mono with surviving reds/golds, grain, vignette (no flicker)
const NoirShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uBass: { value: 0 }, uAspect: { value: 1 }, uColor: { value: 0.0 }, uWater: { value: 0.0 }, uFade: { value: 0.0 }, uFadeCol: { value: new THREE.Color(0, 0, 0) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uBass, uAspect, uColor, uWater, uFade; uniform vec3 uFadeCol; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec2 uv = vUv, c = uv - 0.5;
      uv += uWater * 0.012 * vec2(sin(uv.y * 28.0 + uTime * 3.1), cos(uv.x * 24.0 + uTime * 2.7));   // underwater: the image wobbles
      float ca = uBass * 0.0012;
      vec3 col = vec3(texture2D(tDiffuse, uv + c*ca*2.).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - c*ca*2.).b);
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      float sat = smoothstep(0.06, 0.28, max(col.r - col.b, col.g - col.b));
      col = mix(vec3(lum) * vec3(1.0, 0.985, 0.96), col, clamp(sat + uColor, 0., 1.));
      col = mix(col, col * vec3(0.55, 0.78, 0.9) + vec3(0.01, 0.035, 0.045), uWater * 0.85);
      col *= smoothstep(1.05, 0.3 + uWater * 0.35, length(c * vec2(uAspect * 0.78, 1.0)));
      col += (h(gl_FragCoord.xy + fract(uTime) * 91.) - 0.5) * 0.028;
      col = mix(col, uFadeCol, uFade);
      gl_FragColor = vec4(col, 1.);
    }`,
};

const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(innerWidth * renderer.getPixelRatio(), innerHeight * renderer.getPixelRatio(), { type: THREE.HalfFloatType, samples: 4 }));
const renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.6, 0.78);
const noir = new ShaderPass(NoirShader);
const bokeh = new BokehPass(new THREE.Scene(), new THREE.PerspectiveCamera(), { focus: 8, aperture: 0.0005, maxblur: 0.0022 });
composer.addPass(renderPass); composer.addPass(bokeh); composer.addPass(bloom); composer.addPass(new OutputPass()); composer.addPass(noir);

// ---------- audio ----------
// Low-power machines get the recorded tour (a video with the song in it) instead of the live city. Decided up front from the
// device, or later from the measured frame rate (the page then reloads itself with ?video=1). ?live=1 forces the city.
const Q = new URLSearchParams(location.search);
const LOWPOWER = (() => { if (Q.has('live') || localStorage.getItem('noir-live') === '1') return false; if (Q.has('video')) return true;
  const cores = navigator.hardwareConcurrency || 8, mem = navigator.deviceMemory || 8, mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  return mobile || cores <= 2 || mem <= 2; })();
const RECORD = Q.has('record');                                           // ?record=1: capture this tour to a .webm (dev)
const audio = LOWPOWER ? document.getElementById('tourvideo') : new Audio(); audio.preload = 'auto';
let actx = null, analyser = null, fbuf = null;
function ensureAudioGraph() {
  if (actx) return actx.resume();
  actx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = actx.createAnalyser(); analyser.fftSize = 1024; analyser.smoothingTimeConstant = 0.6;
  fbuf = new Uint8Array(analyser.frequencyBinCount);
  actx.createMediaElementSource(audio).connect(analyser); analyser.connect(actx.destination);
}

// ---------- boot: one world, the city; the song is sung inside it ----------
const ttf = new TTFLoader();
const [roman, italic] = await Promise.all([FONTS.roman, FONTS.italic].map(u => ttf.loadAsync(u).then(j => new Font(j))));
// which page: /<song>/… is that song; anything else is the front page with the bills on the wall
const ROOT = window.__root || '/';
const SEG = location.pathname.slice(ROOT.length).split('/')[0];
const current = SONGS.find(s => s.slug === SEG) || SONGS[0];
const LANDING = !SONGS.some(s => s.slug === SEG);
const ABOUT = SEG === 'about';                                           // /about/: the city at rest behind the sheet
const PLAYLIST_PAGE = SEG === 'playlist';                                // /playlist/: the plain list, play all in order
const PLAYLIST = Q.has('playlist') || sessionStorage.getItem('playlist') === '1';   // a tour inside the running playlist
if (Q.has('playlist')) sessionStorage.setItem('playlist', '1');
document.title = LANDING ? 'Roman Shikhri — hyperfeeling' : `Roman Shikhri — ${current.title}`;
$('lytitle').textContent = current.title;                               // the panel header names the song being sung
const timing = await fetch(`songs/${current.slug}/timing.json`).then(r => r.json());
const city = createCity();
const sky = createSky(city.scene);
const route = createRoute(timing, current.slug);
const props = createProps(city.scene, city, timing, { roman, italic }, route, current);
const props2 = current.slug === 'on-my-way-to-you' ? (await import('./props2.js?v=0')).createProps2(city.scene, city, timing, { roman, italic }, route, props) : null;   // this song's own set pieces
const song = createSong({ roman, italic }, city.scene, route, [city.blds, ...props.solid, ...(props2 ? props2.solid : [])]);
props.wordAt = (i, re, out) => song.wordAt(i, re, out);                 // set pieces that ride on a word (the fire on "hell")
song.load(current, timing);
const AAC = !LOWPOWER && !RECORD && !!document.createElement('audio').canPlayType('audio/mp4; codecs="mp4a.40.2"');   // AAC seeks sample-accurately; VBR mp3 drifts after a seek
audio.src = LOWPOWER ? `songs/${current.slug}/tour.webm` : `songs/${current.slug}/song.${AAC ? 'm4a' : 'mp3'}`;
if (LOWPOWER) { $('tourvideo').hidden = false; $('gl').style.display = 'none'; $('lowpower').hidden = false;
  $('lowpower').addEventListener('click', () => { localStorage.setItem('noir-live', '1'); location.href = location.pathname + '?live=1'; });
  audio.addEventListener('error', () => { location.href = location.pathname + '?live=1'; }); }   // no recording: the live city after all
renderPass.scene = city.scene; renderPass.camera = song.camera; bokeh.scene = city.scene; bokeh.camera = song.camera;
const drops = createDrops($('glass'));
const landing = LANDING ? createLanding(city.scene, { roman, italic }, SONGS, ROOT) : null;
const fmtLen = n => `${Math.floor(n / 60)}:${String(Math.round(n % 60)).padStart(2, '0')}`;
if (PLAYLIST_PAGE) {                                                      // the list, in order
  sessionStorage.removeItem('playlist');
  const ol = $('plsongs'); SONGS.forEach((sg, i) => { const li = document.createElement('li');
    li.innerHTML = `<span class="n">${String(i + 1).padStart(2, '0')}</span><div><p class="t">${sg.title}</p><p class="d">${sg.note || ''}</p></div><span class="len">${fmtLen(sg.duration || 0)}</span>`;
    li.addEventListener('click', () => { location.href = ROOT + sg.slug + '/?playlist=1'; }); ol.appendChild(li); });
  $('playall').addEventListener('click', () => { location.href = ROOT + SONGS[0].slug + '/?playlist=1'; });
}
if (LANDING) { document.body.classList.add('home'); $('home').hidden = ABOUT || PLAYLIST_PAGE; $('about').hidden = !ABOUT; $('playlist').hidden = !PLAYLIST_PAGE; $('lyrics').classList.remove('open');
  addEventListener('pointermove', e => landing.pointer((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1));
  addEventListener('click', e => { if (!ABOUT && !PLAYLIST_PAGE && !e.target.closest('a, button')) landing.click(); }); }
if (new URLSearchParams(location.search).has('edit')) $('tools').hidden = false;

// ---------- opening: the song starts at once; the camera descends into the city while the credits show and five blood
// drops fall through the rain; the first line is sung at the bottom of the descent ----------
let mode = 'song', dropsFallen = 0;
const DROP_AT = [1.0, 2.8, 4.6, 6.4, 8.2], TITLES_OFF = timing.lines[0].t - 1.2;
const clock = new THREE.Clock();
// the loader stays for a couple of drops (two 2.4 s cycles), then fades; the song starts as it goes. A touch ends it early.
const LOADER_MS = LANDING ? 2400 : 4800; let started = false;
const endLoader = () => { if ($('loading').classList.contains('gone')) return; $('loading').classList.add('gone'); if (!LANDING && !started && (!RECORD || Q.has('auto'))) { started = true; startSong(); } };
setTimeout(endLoader, LOADER_MS);
// Autoplay: the song starts by itself. If the browser refuses sound before any touch, it starts muted and the
// first touch/scroll/key anywhere unmutes it silently. The analyser is wired only once the browser allows audio.
let needUnmute = false;
// a deep link /<song>/line/<n> starts the song at that line
const LINE_AT = (() => { const m = location.pathname.match(/\/([^/]+)\/line\/(\d+)\/?$/); if (!m || m[1] !== current.slug) return 0;   // /<song>/ alone starts from the top
  const L = timing.lines[parseInt(m[2], 10) - 1]; return L && L.t != null ? Math.max(0, L.t - 0.15) : 0; })();
async function startSong() {
  if (LINE_AT > 0 && audio.readyState < 1) {                                   // seek only once the file is known, or the seek is lost
    const known = await new Promise(r => { audio.addEventListener('loadedmetadata', () => r(true), { once: true }); setTimeout(() => r(false), 6000); });
    if (!known && !LOWPOWER && /\.m4a$/.test(audio.src)) {                     // the AAC file never came (a server that mislabels .m4a): the mp3 instead of silence
      audio.src = audio.src.replace(/\.m4a$/, '.mp3'); audio.load();
      await new Promise(r => { audio.addEventListener('loadedmetadata', () => r(true), { once: true }); setTimeout(() => r(false), 8000); });
    }
  }
  audio.currentTime = LINE_AT; audio.muted = false;
  try { await audio.play(); }
  catch { audio.muted = true; needUnmute = true; $('mute').classList.add('muted', 'ask');   // the browser refused sound: say so on the speaker icon until the first touch
    try { await audio.play(); } catch { /* nothing more we can do until a gesture */ } }
  if (actx) actx.resume();
}
if (!LANDING) { $('player').hidden = false; $('lyr').hidden = false; $('barsong').textContent = current.title; }   // the song starts when the loader ends (recording waits for one click unless &auto=1)
const unlock = () => {
  ensureAudioGraph(); actx.resume(); endLoader();
  if (needUnmute) { needUnmute = false; audio.muted = false; $('mute').classList.remove('muted', 'ask'); }
  if (audio.paused && !userPaused) audio.play().catch(() => {});
};
for (const ev of ['pointerdown', 'click', 'keydown', 'touchstart', 'touchend', 'wheel']) addEventListener(ev, unlock, { passive: true });
let userPaused = false;

// ---------- player ----------
const togglePlay = () => { if (audio.paused) { userPaused = false; audio.play(); } else { userPaused = true; audio.pause(); } };
$('pp').addEventListener('click', togglePlay);
const lineStep = dir => { const ts = timing.lines.map(L => L.t).filter(t => t != null).sort((x, y) => x - y), now = audio.currentTime;
  const to = dir > 0 ? ts.find(t => t > now + 0.3) : [...ts].reverse().find(t => t < now - 1.0); if (to != null) audio.currentTime = Math.max(0, to - 0.15); };
// (the line-step buttons are gone from the strip; ↑/↓ on the keyboard still step lines)
$('restart').addEventListener('click', () => { audio.currentTime = 0; if (audio.paused) { userPaused = false; audio.play().catch(() => {}); } });
$('mute').addEventListener('click', () => { audio.muted = !audio.muted; $('mute').classList.toggle('muted', audio.muted); });
$('lyr').addEventListener('click', () => openLyrics(!$('lyrics').classList.contains('open')));
$('fs').addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); });
{ const other = SONGS[(SONGS.findIndex(s => s.slug === current.slug) + 1) % SONGS.length]; $('nextsong').href = ROOT + other.slug + '/'; $('nextsong').title = other.title; }
audio.addEventListener('play', () => { $('pp').classList.add('playing'); $('ending').hidden = true; $('player').hidden = false; });
audio.addEventListener('pause', () => $('pp').classList.remove('playing'));
const nextInList = () => { const i = SONGS.findIndex(sg => sg.slug === current.slug); return ROOT + SONGS[(i + 1) % SONGS.length].slug + '/'; };   // round and round
audio.addEventListener('ended', () => { if (!LANDING) { location.href = nextInList(); return; } });   // the next song follows
if (!PLAYLIST_PAGE) { $('plist').hidden = false; const ol = $('plist').querySelector('ol');
  SONGS.forEach((sg, i) => { const li = document.createElement('li'); li.className = sg.slug === current.slug ? 'now' : ''; li.innerHTML = `<span class="n">${String(i + 1).padStart(2, '0')}</span><span>${sg.title}</span>`;
    li.addEventListener('click', () => { location.href = ROOT + sg.slug + '/'; }); ol.appendChild(li); });
}
$('again').addEventListener('click', () => { $('ending').hidden = true; $('player').hidden = false; song.reset(); dropsFallen = 0; $('titles').classList.remove('off'); audio.currentTime = 0; audio.play(); });
$('bar').addEventListener('click', e => { const r = e.currentTarget.getBoundingClientRect(); const D = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : (current.duration || 0); if (D) audio.currentTime = clamp((e.clientX - r.left) / r.width) * D; });
let tapping = false, tapIdx = 0;
const tapLines = () => song.lines().filter(l => !l.title);
function showTapHint() { const L = tapLines()[tapIdx]; $('taphint').innerHTML = L ? `press <b>Enter</b> when this line starts:<br>${L.text}` : 'done &mdash; press <b>save .lrc</b>'; }
$('tap').addEventListener('click', () => {
  tapping = !tapping; $('tap').classList.toggle('on', tapping);
  if (tapping) { tapLines().forEach(l => { l.t = null; l.words = null; }); tapIdx = 0; song.reset(); audio.currentTime = 0; audio.play(); showTapHint(); }
  else $('taphint').textContent = '';
});
$('save').addEventListener('click', () => {
  const blob = new Blob([toLRC(tapLines(), current.title)], { type: 'text/plain' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${current.slug}.lrc`; a.click();
});
addEventListener('keydown', e => {
  if (LANDING) return;                                                  // the front page has its own keys (walk)
  if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
  else if (e.code === 'ArrowRight') audio.currentTime += 5;
  else if (e.code === 'ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - 5);
  else if (e.code === 'ArrowDown' || e.code === 'ArrowUp') { e.preventDefault(); lineStep(e.code === 'ArrowDown' ? 1 : -1); }   // a line down / up
  else if (e.code === 'KeyM') $('mute').click();
  else if (e.code === 'KeyL') $('lyr').click();
  else if (e.code === 'KeyF') $('fs').click();
  else if (e.code === 'Enter' && tapping) { const L = tapLines()[tapIdx]; if (L) { L.t = audio.currentTime; tapIdx++; showTapHint(); } }
});
// ---------- lyrics panel: every line with its time; click to jump; the sung line is marked
const lyList = $('lylist'), lyItems = [];
{
  let sec = -1;
  timing.lines.forEach((L, i) => {
    if (L.section !== sec) { sec = L.section; const h = document.createElement('li'); h.className = 'sec'; h.textContent = timing.sections[sec].name; lyList.appendChild(h); }
    const li = document.createElement('li'); li.innerHTML = `<time>${fmt(L.t)}</time><span>${L.text}</span>`;
    li.addEventListener('click', () => { audio.currentTime = Math.max(0, L.t - 0.4); if (audio.paused) { userPaused = false; audio.play().catch(() => {}); } });
    lyList.appendChild(li); lyItems.push(li);
  });
}
const openLyrics = v => { $('lyrics').classList.toggle('open', v); document.body.classList.toggle('panel-open', v); $('lyr').style.opacity = v ? '1' : ''; resize(); };
$('lytoggle').addEventListener('click', () => openLyrics(false));
setTimeout(() => openLyrics(!LANDING && innerWidth > 1100), 0);
let lyNow = -1;
function markLyrics(t) {
  let n = -1; for (let i = 0; i < timing.lines.length; i++) if (timing.lines[i].t <= t) n = i;
  if (n === lyNow) return;
  if (lyNow >= 0) lyItems[lyNow].classList.remove('now');
  lyNow = n; if (n >= 0) { lyItems[n].classList.add('now'); lyItems[n].scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  // the address follows the line: /<song>/line/<n> (1-based, as listed in the panel)
  try { history.replaceState(null, '', ROOT + current.slug + (n >= 0 ? `/line/${n + 1}` : '/')); } catch { /* file:// and friends */ }   // before the first line: /<song>/
}
let idleTimer = 0;
addEventListener('pointermove', e => { $('player').classList.remove('idle'); idleTimer = 0; song.setPointer((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); });

// ---------- loop ----------
let skyName = '';
const fadeOut = { k: 0, r: 0, g: 0, b: 0 }, carPos = new THREE.Vector3();
let fpsN = 0, fpsT0 = 0, fpsChecked = LOWPOWER || RECORD;
function frame(once) {
  const dt = Math.min(clock.getDelta(), 0.05), now = clock.elapsedTime;
  // the first seconds of the song tell us whether this machine can carry the city; if not, the recorded tour takes over
  if (!fpsChecked && !LANDING && !audio.paused && audio.currentTime > 3 && document.visibilityState === 'visible') { if (!fpsT0) fpsT0 = now; fpsN++;   // (a hidden tab renders nothing: only visible frames count)
    if (now - fpsT0 > 10) { fpsChecked = true; const fps = fpsN / (now - fpsT0);
      if (fps < 12 && !Q.has('live') && localStorage.getItem('noir-live') !== '1') fetch(`songs/${current.slug}/tour.webm`, { method: 'HEAD' }).then(r => { if (r.ok) location.replace(location.pathname + '?video=1'); }).catch(() => {}); } }
  const t = LANDING ? 6 : audio.currentTime;                             // the front page holds the city at the moment the credits hang in the sky
  const DUR = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : (current.duration || 0);
  if (DUR) $('fill').style.width = `${(t / DUR) * 100}%`;
  $('clock').textContent = `${fmt(t)} / ${fmt(DUR)}`;
  idleTimer += dt; if (idleTimer > 2.5 && !audio.paused && !tapping) $('player').classList.add('idle');
  if (!LANDING) markLyrics(t + LEAD);                                    // the panel keeps step with the words
  while (!LANDING && dropsFallen < 5 && t >= DROP_AT[dropsFallen]) { drops.drop(5 - dropsFallen); dropsFallen++; }
  if (t < 0.5) dropsFallen = 0;
  const sName = route.skyAt(t); if (sName !== skyName) { skyName = sName; sky.set(sName, skyName ? 7 : 0.1); }
  if (LANDING) { landing.camera(song.camera, now, dt); landing.update(dt, song.camera); } else song.update(dt, now, t, analyser, fbuf);
  const env = song.env, P = song.P;
  sky.update(dt, now, song.camera.position, env.bass);
  city.chaseAt(route.carAt(t, carPos), song.camera);                                     // the car that comes for you (Rap 2)
  city.update(dt, now, song.camera, sky);
  props.update(dt, t, now, { ...env, sun: sky.sun }, song.camera);
  if (props2) props2.update(dt, t, now, song.camera, song);
  route.cue(t, city);
  bloom.strength = 0.45 + (sky.sun || 0) * 0.25 + env.slow * 0.2;
  noir.uniforms.uBass.value = env.bass * (0.5 + P.red * 0.5);
  noir.uniforms.uColor.value = (sky.sun || 0) * 0.7 + (sky.moon || 0) * 0.1;
  noir.uniforms.uTime.value = now;
  bokeh.uniforms.focus.value = song.focus;
  const fd = route.fade(t, fadeOut); noir.uniforms.uFade.value = fd.k; noir.uniforms.uFadeCol.value.setRGB(fd.r || 0, fd.g || 0, fd.b || 0);
  noir.uniforms.uWater.value = props.under; bokeh.uniforms.maxblur.value = 0.0022 + props.under * 0.012;
  if (!LOWPOWER) composer.render(dt);
  drops.update(dt); drops.fade(clamp((t - DROP_AT[4] - 1.5) / 2.5));                   // the blood runs for a moment after the last drop, then is gone
  if (once !== true && !RECORD) requestAnimationFrame(frame);             // (rAF passes a timestamp as the first argument: only an explicit true is a one-shot)
}
let lastSize = '';
function resize() {
  const w = innerWidth, h = innerHeight;
  const key = `${w}x${h}x${$('lyrics').classList.contains('open')}`; if (key === lastSize) return; lastSize = key;   // never clear the frame for nothing
  renderer.setSize(w, h, false); composer.setSize(w, h); bloom.setSize(w, h);
  song.camera.aspect = w / h;
  // with the lyrics panel open, frame the scene in the visible part of the screen
  const panel = ($('lyrics').classList.contains('open') && innerWidth > 760) ? $('lyrics').offsetWidth : 0;
  if (panel) song.camera.setViewOffset(w, h, -panel / 2, 0, w, h); else song.camera.clearViewOffset();
  song.camera.updateProjectionMatrix();
  noir.uniforms.uAspect.value = w / h; city.resize(w, h);
}
addEventListener('resize', resize); new ResizeObserver(resize).observe(document.documentElement); resize();
if (RECORD) {
  // capture: frames by timer (30 fps, keeps going in a background tab while the song plays), video from the canvas,
  // sound from the song; the .webm downloads when the song ends
  ensureAudioGraph(); const dest = actx.createMediaStreamDestination(); analyser.disconnect(); analyser.connect(dest);   // the sound goes into the file, not the speakers
  const stream = renderer.domElement.captureStream(30); dest.stream.getAudioTracks().forEach(tr => stream.addTrack(tr));
  const rec = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus', videoBitsPerSecond: 1_300_000, audioBitsPerSecond: 96_000 });
  const chunks = []; rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  rec.onstop = () => { const blob = new Blob(chunks, { type: 'video/webm' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${current.slug}.tour.webm`; a.click(); document.title = 'recorded ✓'; };
  setInterval(() => frame(true), 1000 / 30);
  audio.addEventListener('playing', () => { if (rec.state === 'inactive') rec.start(1000); }, { once: true });
  audio.addEventListener('ended', () => { if (rec.state !== 'inactive') setTimeout(() => rec.stop(), 1500); });
  window.__rec = rec;
} else requestAnimationFrame(frame);
window.__noir = { audio, song, city, props, sky, route, renderer, landing, get mode() { return mode; }, step: () => frame(true) };   // step(): one frame on demand (probes while the tab is hidden and rAF sleeps)
