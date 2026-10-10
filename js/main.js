import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createCity } from './city.js';
import { createSong } from './song.js';
import { SONGS } from './songs.js';
import { clamp, fmt, toLRC } from './util.js';

const $ = id => document.getElementById(id);
const FONT_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/fonts/gentilis_bold.typeface.json';

const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const cityCam = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 900);

// film look: chromatic aberration on the kick, mono with surviving reds/golds, venetian-blind shadows, grain, vignette
const NoirShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uBass: { value: 0 }, uAspect: { value: 1 }, uBlinds: { value: 0.22 }, uColor: { value: 0.0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uBass, uAspect, uBlinds, uColor; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec2 uv = vUv, c = uv - 0.5;
      float ca = 0.0012 + uBass * 0.007;
      vec3 col = vec3(texture2D(tDiffuse, uv + c*ca*2.).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - c*ca*2.).b);
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      float sat = smoothstep(0.06, 0.28, max(col.r - col.b, col.g - col.b) );
      col = mix(vec3(lum) * vec3(1.0, 0.985, 0.96), col, clamp(sat + uColor, 0., 1.));
      vec2 r = vec2(c.x * uAspect, c.y);
      float s = r.x * 0.48 + r.y * 0.88;
      float bl = smoothstep(0.4, 0.6, sin(s * 44.0 + uTime * 0.12) * 0.5 + 0.5);
      col *= 1.0 - uBlinds * bl * smoothstep(0.9, 0.2, length(c + vec2(0.2, -0.15)));
      col *= smoothstep(1.0, 0.28, length(c * vec2(uAspect * 0.78, 1.0)));
      col += (h(uv * vec2(1931., 1087.) + fract(uTime) * 91.) - 0.5) * 0.065;
      col *= 0.975 + 0.025 * h(vec2(floor(uTime * 24.0)));
      gl_FragColor = vec4(col, 1.);
    }`,
};

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(new THREE.Scene(), cityCam);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.85, 0.55, 0.72);
const noir = new ShaderPass(NoirShader);
composer.addPass(renderPass); composer.addPass(bloom); composer.addPass(new OutputPass()); composer.addPass(noir);

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
const font = await new FontLoader().loadAsync(FONT_URL);
const city = createCity(renderer, font);
const song = createSong(font);
renderPass.scene = city.scene;
$('loading').classList.add('gone');

let mode = 'city';                 // city | entering | song
let scrollP = 0, scrollTarget = 0, enterT = 0, current = null;
const enterFrom = new THREE.Vector3(), enterLook = new THREE.Vector3();
const clock = new THREE.Clock();

function readScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  scrollTarget = max > 0 ? clamp(scrollY / max) : 0;
}
addEventListener('scroll', readScroll, { passive: true }); readScroll();

async function enterSong(idx) {
  if (mode !== 'city') return;
  current = SONGS[idx];
  audio.src = `songs/${current.slug}/song.mp3`;
  ensureAudioGraph();
  const timing = await fetch(`songs/${current.slug}/timing.json`).then(r => r.json());
  song.load(current, timing);
  mode = 'entering'; enterT = 0; enterFrom.copy(cityCam.position);
  cityCam.getWorldDirection(enterLook).multiplyScalar(10).add(cityCam.position);
  setTimeout(() => $('fade').classList.add('on'), 1100);
  setTimeout(() => {
    mode = 'song'; document.body.classList.add('in-song');
    renderPass.scene = song.scene; renderPass.camera = song.camera;
    $('player').hidden = false; $('ptitle').textContent = current.title;
    audio.currentTime = 0; audio.play();
    $('fade').classList.remove('on');
  }, 1900);
}
function backToCity() {
  if (mode !== 'song') return;
  $('fade').classList.add('on');
  setTimeout(() => {
    audio.pause(); song.reset(); mode = 'city'; tapping = false; $('tap').classList.remove('on'); $('taphint').textContent = '';
    document.body.classList.remove('in-song'); $('player').hidden = true;
    renderPass.scene = city.scene; renderPass.camera = cityCam;
    $('fade').classList.remove('on');
  }, 700);
}
$('enter').addEventListener('click', e => enterSong(+e.currentTarget.dataset.song));
$('back').addEventListener('click', backToCity);

// ---------- player controls ----------
const togglePlay = () => (audio.paused ? audio.play() : audio.pause());
$('pp').addEventListener('click', togglePlay);
audio.addEventListener('play', () => ($('pp').innerHTML = '&#10074;&#10074;'));
audio.addEventListener('pause', () => ($('pp').innerHTML = '&#9654;'));
$('bar').addEventListener('click', e => {
  const r = e.currentTarget.getBoundingClientRect();
  if (audio.duration) audio.currentTime = clamp((e.clientX - r.left) / r.width) * audio.duration;
});
// tap-sync: replay the song and press Enter at the start of every line to re-time it
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
  else if (e.code === 'Escape') backToCity();
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

// act caption (section name) — shown like a film chapter card
let actCard = document.createElement('div'); actCard.id = 'act'; $('player').appendChild(actCard);
song.onAct = a => {
  actCard.innerHTML = `<span>${a.name}</span>${a.desc ? `<i>${a.desc}</i>` : ''}`;
  actCard.classList.remove('show'); void actCard.offsetWidth; actCard.classList.add('show');
};

// ---------- loop ----------
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05), now = clock.elapsedTime;
  if (mode === 'city' || mode === 'entering') {
    scrollP += (scrollTarget - scrollP) * (1 - Math.exp(-dt * 3.5));
    if (mode === 'city') city.update(dt, now, scrollP, cityCam);
    else {
      enterT += dt; const k = clamp(enterT / 1.8), e = k * k * k;
      city.update(dt, now, scrollP, new THREE.PerspectiveCamera());           // keep the city alive
      cityCam.position.lerpVectors(enterFrom, city.entryPoint, e);
      enterLook.lerp(city.entryPoint.clone().add(new THREE.Vector3(4, 0, 0)), 0.08);
      cityCam.lookAt(enterLook);
    }
    bloom.strength = 0.9; noir.uniforms.uBass.value = 0; noir.uniforms.uBlinds.value = 0.12; noir.uniforms.uColor.value = 0;
  } else {
    song.update(dt, now, audio.currentTime, analyser, fbuf);
    const P = song.P, env = song.env;
    bloom.strength = 0.55 + P.warm * 0.2 + P.beam * 0.1 + env.slow * 0.3;
    noir.uniforms.uBass.value = env.bass * (0.6 + P.red);
    noir.uniforms.uBlinds.value = 0.2 * (1 - P.dawn) * (1 - P.warm * 0.5);
    noir.uniforms.uColor.value = P.dawn * 0.6;
    if (audio.duration) $('fill').style.width = `${(audio.currentTime / audio.duration) * 100}%`;
    $('clock').textContent = `${fmt(audio.currentTime)} / ${fmt(audio.duration || 0)}`;
    idleTimer += dt; if (idleTimer > 2.5 && !audio.paused && !tapping) $('player').classList.add('idle');
  }
  noir.uniforms.uTime.value = now;
  composer.render(dt);
  requestAnimationFrame(frame);
}
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); composer.setSize(w, h); bloom.setSize(w, h);
  for (const c of [cityCam, song.camera]) { c.aspect = w / h; c.updateProjectionMatrix(); }
  noir.uniforms.uAspect.value = w / h; city.resize(w, h); readScroll();
}
addEventListener('resize', resize); new ResizeObserver(resize).observe(document.documentElement); resize();
requestAnimationFrame(frame);
window.__noir = { audio, song, city, enterSong, get mode() { return mode; } };   // handy for debugging
