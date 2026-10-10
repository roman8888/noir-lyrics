import * as THREE from 'three';
import { Font } from 'three/addons/loaders/FontLoader.js';
import { TTFLoader } from 'three/addons/loaders/TTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { createCity } from './city.js?v=20261010200729';
import { createProps } from './props.js?v=20261010200729';
import { createSky } from './sky.js?v=20261010200729';
import { createRoute } from './route.js?v=20261010200729';
import { createSong } from './song.js?v=20261010200729';
import { SONGS } from './songs.js?v=20261010200729';
import { clamp, fmt, toLRC } from './util.js?v=20261010200729';
import { createDrops } from './drops.js?v=20261010200729';

const $ = id => document.getElementById(id);
const FONTS = { roman: 'fonts/playfair-700-normal.woff', italic: 'fonts/playfair-700-italic.woff' };

const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// film look: faint chromatic aberration on the kick, mono with surviving reds/golds, grain, vignette (no flicker)
const NoirShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uBass: { value: 0 }, uAspect: { value: 1 }, uColor: { value: 0.0 }, uWater: { value: 0.0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uBass, uAspect, uColor, uWater; varying vec2 vUv;
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
const audio = new Audio(); audio.preload = 'auto';
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
const current = SONGS[0];
const timing = await fetch(`songs/${current.slug}/timing.json`).then(r => r.json());
const city = createCity();
const sky = createSky(city.scene);
const route = createRoute(timing);
const props = createProps(city.scene, city, timing, { roman, italic }, route);
const song = createSong({ roman, italic }, city.scene, route, [city.blds, ...props.solid]);
song.load(current, timing);
audio.src = `songs/${current.slug}/song.mp3`;
renderPass.scene = city.scene; renderPass.camera = song.camera; bokeh.scene = city.scene; bokeh.camera = song.camera;
const drops = createDrops($('glass'));
if (new URLSearchParams(location.search).has('edit')) $('tools').hidden = false;

// ---------- opening: the song starts at once; the camera descends into the city while the credits show and five blood
// drops fall through the rain; the first line is sung at the bottom of the descent ----------
let mode = 'song', dropsFallen = 0;
const DROP_AT = [1.0, 2.8, 4.6, 6.4, 8.2], TITLES_OFF = timing.lines[0].t - 1.2;
const clock = new THREE.Clock();
setTimeout(() => { $('loading').classList.add('gone'); }, 150);
// Autoplay: the song starts by itself. If the browser refuses sound before any touch, it starts muted and the
// first touch/scroll/key anywhere unmutes it silently. The analyser is wired only once the browser allows audio.
let needUnmute = false;
async function startSong() {
  audio.currentTime = 0; audio.muted = false;
  try { await audio.play(); }
  catch { audio.muted = true; needUnmute = true; try { await audio.play(); } catch { /* nothing more we can do until a gesture */ } }
  if (actx) actx.resume();
}
$('player').hidden = false;
startSong();
const unlock = () => {
  ensureAudioGraph(); actx.resume();
  if (needUnmute) { needUnmute = false; audio.muted = false; }
  if (audio.paused && !userPaused) audio.play().catch(() => {});
};
for (const ev of ['pointerdown', 'keydown', 'touchend', 'wheel']) addEventListener(ev, unlock, { passive: true });
let userPaused = false;

// ---------- player ----------
const togglePlay = () => { if (audio.paused) { userPaused = false; audio.play(); } else { userPaused = true; audio.pause(); } };
$('pp').addEventListener('click', togglePlay);
audio.addEventListener('play', () => { $('pp').textContent = 'pause'; $('ending').hidden = true; $('player').hidden = false; });
audio.addEventListener('pause', () => ($('pp').textContent = 'play'));
audio.addEventListener('ended', () => { $('player').hidden = true; $('ending').hidden = false; });
$('again').addEventListener('click', () => { $('ending').hidden = true; $('player').hidden = false; song.reset(); dropsFallen = 0; $('titles').classList.remove('off'); audio.currentTime = 0; audio.play(); });
$('bar').addEventListener('click', e => { const r = e.currentTarget.getBoundingClientRect(); if (audio.duration) audio.currentTime = clamp((e.clientX - r.left) / r.width) * audio.duration; });
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
  if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
  else if (e.code === 'ArrowRight') audio.currentTime += 5;
  else if (e.code === 'ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - 5);
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
const openLyrics = v => { $('lyrics').classList.toggle('open', v); $('lyopen').hidden = v; resize(); };
$('lytoggle').addEventListener('click', () => openLyrics(false));
$('lyopen').addEventListener('click', () => openLyrics(true));
setTimeout(() => openLyrics(innerWidth > 1100), 0);
let lyNow = -1;
function markLyrics(t) {
  let n = -1; for (let i = 0; i < timing.lines.length; i++) if (timing.lines[i].t <= t) n = i;
  if (n === lyNow) return;
  if (lyNow >= 0) lyItems[lyNow].classList.remove('now');
  lyNow = n; if (n >= 0) { lyItems[n].classList.add('now'); lyItems[n].scrollIntoView({ block: 'center', behavior: 'smooth' }); }
}
let idleTimer = 0;
addEventListener('pointermove', e => { $('player').classList.remove('idle'); idleTimer = 0; song.setPointer((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); });

// ---------- loop ----------
let skyName = '';
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05), now = clock.elapsedTime;
  const t = audio.currentTime;
  if (audio.duration) $('fill').style.width = `${(t / audio.duration) * 100}%`;
  $('clock').textContent = `${fmt(t)} / ${fmt(audio.duration || 0)}`;
  idleTimer += dt; if (idleTimer > 2.5 && !audio.paused && !tapping) $('player').classList.add('idle');
  markLyrics(t);
  while (dropsFallen < 5 && t >= DROP_AT[dropsFallen]) { drops.drop(5 - dropsFallen); dropsFallen++; }
  if (t < 0.5) dropsFallen = 0;
  const sName = route.skyAt(t); if (sName !== skyName) { skyName = sName; sky.set(sName, skyName ? 7 : 0.1); }
  song.update(dt, now, t, analyser, fbuf);
  const env = song.env, P = song.P;
  sky.update(dt, now, song.camera.position, env.bass);
  city.update(dt, now, song.camera, sky);
  props.update(dt, t, now, { ...env, sun: sky.sun }, song.camera);
  route.cue(t, city);
  bloom.strength = 0.45 + (sky.sun || 0) * 0.25 + env.slow * 0.2;
  noir.uniforms.uBass.value = env.bass * (0.5 + P.red * 0.5);
  noir.uniforms.uColor.value = (sky.sun || 0) * 0.7 + (sky.moon || 0) * 0.1;
  noir.uniforms.uTime.value = now;
  bokeh.uniforms.focus.value = song.focus;
  noir.uniforms.uWater.value = props.under; bokeh.uniforms.maxblur.value = 0.0022 + props.under * 0.012;
  composer.render(dt);
  drops.update(dt); drops.fade(clamp((t - DROP_AT[4] - 1.5) / 2.5));                   // the blood runs for a moment after the last drop, then is gone
  requestAnimationFrame(frame);
}
let lastSize = '';
function resize() {
  const w = innerWidth, h = innerHeight;
  const key = `${w}x${h}x${$('lyrics').classList.contains('open')}`; if (key === lastSize) return; lastSize = key;   // never clear the frame for nothing
  renderer.setSize(w, h, false); composer.setSize(w, h); bloom.setSize(w, h);
  song.camera.aspect = w / h;
  // with the lyrics panel open, frame the scene in the visible part of the screen
  const panel = $('lyrics').classList.contains('open') ? $('lyrics').offsetWidth : 0;
  if (panel) song.camera.setViewOffset(w, h, -panel / 2, 0, w, h); else song.camera.clearViewOffset();
  song.camera.updateProjectionMatrix();
  noir.uniforms.uAspect.value = w / h; city.resize(w, h);
}
addEventListener('resize', resize); new ResizeObserver(resize).observe(document.documentElement); resize();
requestAnimationFrame(frame);
window.__noir = { audio, song, city, props, sky, route, renderer, get mode() { return mode; } };
