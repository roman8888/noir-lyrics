import * as THREE from 'three';
import { Font } from 'three/addons/loaders/FontLoader.js';
import { TTFLoader } from 'three/addons/loaders/TTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { createCity } from './city.js';
import { createSong } from './song.js';
import { SONGS } from './songs.js';
import { clamp, fmt, toLRC } from './util.js';
import { createGlass, crackSound } from './glass.js';

const $ = id => document.getElementById(id);
// Playfair Display (OFL), self-hosted, turned into extrudable outlines at load time
const FONTS = { roman: 'fonts/playfair-700-normal.woff', italic: 'fonts/playfair-700-italic.woff' };

const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));   // full retina
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const cityCam = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 900);

// film look: chromatic aberration on the kick, mono with surviving reds/golds, venetian-blind shadows, grain, vignette
const NoirShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uBass: { value: 0 }, uAspect: { value: 1 }, uBlinds: { value: 0.22 }, uColor: { value: 0.0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uBass, uAspect, uBlinds, uColor; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec2 uv = vUv, c = uv - 0.5;
      float ca = uBass * 0.0016;
      vec3 col = vec3(texture2D(tDiffuse, uv + c*ca*2.).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - c*ca*2.).b);
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      float sat = smoothstep(0.06, 0.28, max(col.r - col.b, col.g - col.b) );
      col = mix(vec3(lum) * vec3(1.0, 0.985, 0.96), col, clamp(sat + uColor, 0., 1.));
      vec2 r = vec2(c.x * uAspect, c.y);
      float s = r.x * 0.48 + r.y * 0.88;
      float bl = smoothstep(0.4, 0.6, sin(s * 44.0 + uTime * 0.12) * 0.5 + 0.5);
      col *= 1.0 - uBlinds * bl * smoothstep(0.9, 0.2, length(c + vec2(0.2, -0.15)));
      col *= smoothstep(1.0, 0.28, length(c * vec2(uAspect * 0.78, 1.0)));
      col += (h(gl_FragCoord.xy + fract(uTime) * 91.) - 0.5) * 0.035;
      col *= 0.975 + 0.025 * h(vec2(floor(uTime * 24.0)));
      gl_FragColor = vec4(col, 1.);
    }`,
};

// multisampled target: real anti-aliasing for the 3D type inside the post chain
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(innerWidth * renderer.getPixelRatio(), innerHeight * renderer.getPixelRatio(), { type: THREE.HalfFloatType, samples: 4 }));
const renderPass = new RenderPass(new THREE.Scene(), cityCam);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.85, 0.55, 0.72);
const noir = new ShaderPass(NoirShader);
// depth of field: focus on the line being sung, everything else falls soft
const bokeh = new BokehPass(new THREE.Scene(), cityCam, { focus: 8, aperture: 0.0022, maxblur: 0.007 });
bokeh.enabled = false;
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

// ---------- boot ----------
const ttf = new TTFLoader();
const [roman, italic] = await Promise.all([FONTS.roman, FONTS.italic].map(u => ttf.loadAsync(u).then(j => new Font(j))));
const current = SONGS[0];
const timing = await fetch(`songs/${current.slug}/timing.json`).then(r => r.json());
const city = createCity(renderer, italic);
const song = createSong({ roman, italic });
song.load(current, timing);
audio.src = `songs/${current.slug}/song.mp3`;
renderPass.scene = city.scene;
const glass = createGlass($('glass'));
const snap = document.createElement('canvas');
if (new URLSearchParams(location.search).has('edit')) $('tools').hidden = false;

// ---------- opening: titles, 5-second countdown, the glass cracks on every count, then shatters ----------
const COUNT_AT = 1.8, SHATTER_AT = COUNT_AT + 5;
let mode = 'intro', introT = 0, lastCount = -1, crackReach = 0, crackTarget = 0, flash = 0, wantSnap = false;
const clock = new THREE.Clock();
setTimeout(() => { $('loading').classList.add('gone'); $('titles').classList.add('on'); }, 150);

function onCount(n) {                     // n = 5..1
  const el = $('count'); el.innerHTML = `<span>${n}</span>`;
  crackTarget = (6 - n) / 5 * 0.85; flash = 1;
  document.body.classList.remove('shake'); void document.body.offsetWidth; document.body.classList.add('shake');
  crackSound(actx);
}
const withTimeout = (p, ms) => Promise.race([p, new Promise(r => setTimeout(r, ms))]);
async function startSong() {
  ensureAudioGraph();
  await withTimeout(actx.resume(), 250);
  audio.currentTime = 0;
  try { await audio.play(); } catch { /* blocked until the first tap */ }
  if (audio.paused || actx.state !== 'running') { audio.pause(); $('listen').hidden = false; }
}
function shatter() {
  mode = 'song';
  $('count').innerHTML = ''; $('titles').classList.add('off');
  crackSound(actx, true);
  renderPass.scene = song.scene; renderPass.camera = song.camera;
  bokeh.scene = song.scene; bokeh.camera = song.camera; bokeh.enabled = true;
  $('player').hidden = false;
  glass.shatter(snap).then(() => {});
  startSong();
}

// the first touch anywhere unlocks sound (browsers require one gesture)
const unlock = () => {
  ensureAudioGraph(); actx.resume();
  if (mode === 'song' && !$('listen').hidden) { $('listen').hidden = true; audio.play(); }
};
addEventListener('pointerdown', unlock); addEventListener('keydown', unlock);
$('listen').addEventListener('click', unlock);

// ---------- player ----------
const togglePlay = () => (audio.paused ? audio.play() : audio.pause());
$('pp').addEventListener('click', togglePlay);
audio.addEventListener('play', () => ($('pp').textContent = 'pause'));
audio.addEventListener('pause', () => ($('pp').textContent = 'play'));
audio.addEventListener('ended', () => { $('player').hidden = true; $('ending').hidden = false; });
$('again').addEventListener('click', () => {
  $('ending').hidden = true; $('player').hidden = false; song.reset(); audio.currentTime = 0; audio.play();
});
$('bar').addEventListener('click', e => {
  const r = e.currentTarget.getBoundingClientRect();
  if (audio.duration) audio.currentTime = clamp((e.clientX - r.left) / r.width) * audio.duration;
});
// tap-sync (only with ?edit): replay the song and press Enter at the start of every line to re-time it
let tapping = false, tapIdx = 0;
const tapLines = () => song.lines().filter(l => !l.title);
function showTapHint() {
  const L = tapLines()[tapIdx];
  $('taphint').innerHTML = L ? `press <b>Enter</b> when this line starts:<br>${L.text}` : 'done &mdash; press <b>save .lrc</b>';
}
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
  if (mode !== 'song') return;
  if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
  else if (e.code === 'ArrowRight') audio.currentTime += 5;
  else if (e.code === 'ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - 5);
  else if (e.code === 'Enter' && tapping) {
    const L = tapLines()[tapIdx]; if (L) { L.t = audio.currentTime; tapIdx++; showTapHint(); }
  }
});
let idleTimer = 0;
addEventListener('pointermove', e => {
  $('player').classList.remove('idle'); idleTimer = 0;
  song.setPointer((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
});

// ---------- loop ----------
const easeInOut = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05), now = clock.elapsedTime;
  if (mode === 'intro') {
    introT += dt;
    city.update(dt, now, easeInOut(clamp(introT / SHATTER_AT)) * 0.97, cityCam);
    const n = Math.floor(introT - COUNT_AT);
    if (n >= 0 && n < 5 && n !== lastCount) { lastCount = n; onCount(5 - n); }
    crackReach += (crackTarget - crackReach) * (1 - Math.exp(-dt * 9));
    flash *= Math.exp(-dt * 6);
    glass.draw(crackReach, flash);
    if (introT >= SHATTER_AT) wantSnap = true;
    bloom.strength = 0.9; noir.uniforms.uBass.value = flash * 0.4; noir.uniforms.uBlinds.value = 0.12; noir.uniforms.uColor.value = 0;
  } else {
    song.update(dt, now, audio.currentTime, analyser, fbuf);
    const P = song.P, env = song.env;
    bloom.strength = 0.55 + P.warm * 0.2 + P.beam * 0.1 + env.slow * 0.3;
    noir.uniforms.uBass.value = env.bass * (0.6 + P.red);
    noir.uniforms.uBlinds.value = 0.2 * (1 - P.dawn) * (1 - P.warm * 0.5);
    noir.uniforms.uColor.value = P.dawn * 0.6;
    bokeh.uniforms.focus.value = song.focus;
    if (audio.duration) $('fill').style.width = `${(audio.currentTime / audio.duration) * 100}%`;
    $('clock').textContent = `${fmt(audio.currentTime)} / ${fmt(audio.duration || 0)}`;
    idleTimer += dt; if (idleTimer > 2.5 && !audio.paused && !tapping) $('player').classList.add('idle');
  }
  noir.uniforms.uTime.value = now;
  composer.render(dt);
  if (wantSnap) {                          // grab this exact frame (+ its cracks) for the shards, then break
    wantSnap = false;
    snap.width = $('glass').width; snap.height = $('glass').height;
    const c = snap.getContext('2d'); c.drawImage(renderer.domElement, 0, 0, snap.width, snap.height); c.drawImage($('glass'), 0, 0);
    shatter();
  }
  requestAnimationFrame(frame);
}
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); composer.setSize(w, h); bloom.setSize(w, h);
  for (const c of [cityCam, song.camera]) { c.aspect = w / h; c.updateProjectionMatrix(); }
  noir.uniforms.uAspect.value = w / h; city.resize(w, h);
}
addEventListener('resize', resize); new ResizeObserver(resize).observe(document.documentElement); resize();
requestAnimationFrame(frame);
window.__noir = { audio, song, city, get mode() { return mode; } };   // handy for debugging
