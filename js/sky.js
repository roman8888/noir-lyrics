// The sky: a dome with drifting clouds, moon, stars, a sunrise and lightning. Presets blend per section.
import * as THREE from 'three';
import { clamp } from './util.js?v=20261010230826';

const VS = `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;
const FS = /* glsl */`
  uniform vec3 uHorizon, uZenith, uCloudCol, uSunCol; uniform vec3 uMoonDir, uSunDir;
  uniform float uTime, uCover, uSoft, uMoon, uSun, uStars, uFlash, uHaze;
  varying vec3 vD;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
    return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+1.), f.x), f.y); }
  float fbm(vec2 p){ float a = 0., w = .5; for (int k = 0; k < 5; k++) { a += w * n(p); p = p * 2.03 + 11.3; w *= .5; } return a; }
  void main(){
    vec3 d = normalize(vD);
    float y = max(d.y, 0.0);
    vec3 sky = mix(uHorizon, uZenith, pow(y, 0.55));
    // sun: a disc plus a wide warm halo near the horizon
    float sd = max(0., dot(d, uSunDir));
    sky += uSunCol * (pow(sd, 9000.) * 1.6 + pow(sd, 60.) * 0.5 + pow(sd, 6.) * 0.22 + pow(sd, 2.) * 0.06) * uSun;
    // stars where the sky is clear
    float st = step(0.9985, h(floor(d.xz / max(d.y, 0.05) * 160.))) * uStars * smoothstep(0.02, 0.3, d.y);
    sky += vec3(st) * 0.9;
    // clouds: two layers scrolled at different speeds, projected on a flat plane above
    vec2 uv = d.xz / (d.y + 0.12);
    float c1 = fbm(uv * 0.9 + vec2(uTime * 0.012, uTime * 0.004));
    float c2 = fbm(uv * 2.1 - vec2(uTime * 0.02, 0.));
    float cl = smoothstep(1.0 - uCover - uSoft, 1.0 - uCover + uSoft, c1 * 0.7 + c2 * 0.3) * smoothstep(0.0, 0.18, d.y);
    vec3 cloud = uCloudCol * (0.6 + 0.6 * c2) + uSunCol * pow(sd, 4.) * uSun * 0.9;
    cloud += vec3(1.0, 0.98, 0.9) * uFlash * (0.6 + 0.8 * c2);
    sky = mix(sky, cloud, cl);
    // moon through the gaps
    float md = max(0., dot(d, uMoonDir));
    sky += vec3(0.85, 0.9, 1.0) * (pow(md, 2500.) * 3.0 + pow(md, 40.) * 0.12) * uMoon * (1.0 - cl * 0.85);
    // haze at the horizon
    sky = mix(sky, uHorizon, uHaze * (1.0 - smoothstep(0.0, 0.25, d.y)));
    sky *= smoothstep(-0.35, 0.05, d.y);                               // below the horizon: black
    sky += uFlash * 0.15;
    gl_FragColor = vec4(sky, 1.0);
  }`;

const C = (r, g, b) => new THREE.Color(r, g, b);
// one look per section (blended on section change)
export const SKIES = {
  black:    { horizon: C(0, 0, 0), zenith: C(0, 0, 0), cloud: C(0, 0, 0), cover: 0.0, soft: 0.1, moon: 0, sun: 0, stars: 0, haze: 0, rain: 0.4 },
  night:    { horizon: C(0.019, 0.021, 0.029), zenith: C(0.003, 0.003, 0.006), cloud: C(0.05, 0.055, 0.07), cover: 0.78, soft: 0.22, moon: 0.0, sun: 0, stars: 0.0, haze: 0.55, rain: 1.0 },
  verse:    { horizon: C(0.021, 0.021, 0.027), zenith: C(0.003, 0.004, 0.007), cloud: C(0.06, 0.06, 0.075), cover: 0.7, soft: 0.25, moon: 0.15, sun: 0, stars: 0.1, haze: 0.5, rain: 1.1 },
  storm:    { horizon: C(0.015, 0.015, 0.019), zenith: C(0.002, 0.002, 0.004), cloud: C(0.04, 0.04, 0.05), cover: 0.95, soft: 0.15, moon: 0.0, sun: 0, stars: 0.0, haze: 0.65, rain: 1.5, lightning: 1 },
  breaking: { horizon: C(0.025, 0.027, 0.038), zenith: C(0.004, 0.006, 0.010), cloud: C(0.1, 0.11, 0.14), cover: 0.45, soft: 0.3, moon: 1.0, sun: 0, stars: 0.5, haze: 0.4, rain: 0.6 },
  moon:     { horizon: C(0.029, 0.032, 0.042), zenith: C(0.005, 0.007, 0.014), cloud: C(0.14, 0.15, 0.19), cover: 0.3, soft: 0.3, moon: 1.0, sun: 0, stars: 0.8, haze: 0.3, rain: 0.25 },
  drizzle:  { horizon: C(0.021, 0.021, 0.027), zenith: C(0.003, 0.004, 0.008), cloud: C(0.07, 0.07, 0.085), cover: 0.72, soft: 0.25, moon: 0.3, sun: 0, stars: 0.2, haze: 0.5, rain: 0.8 },
  fog:      { horizon: C(0.038, 0.038, 0.042), zenith: C(0.010, 0.011, 0.016), cloud: C(0.12, 0.12, 0.13), cover: 0.6, soft: 0.45, moon: 0.5, sun: 0, stars: 0.1, haze: 0.9, rain: 0.2 },
  predawn:  { horizon: C(0.118, 0.059, 0.071), zenith: C(0.014, 0.016, 0.035), cloud: C(0.22, 0.14, 0.17), cover: 0.4, soft: 0.35, moon: 0.4, sun: 0.35, stars: 0.3, haze: 0.5, rain: 0.05 },
  sunrise:  { horizon: C(0.399, 0.210, 0.092), zenith: C(0.056, 0.070, 0.126), cloud: C(0.7, 0.42, 0.3), cover: 0.35, soft: 0.35, moon: 0.0, sun: 1.0, stars: 0.0, haze: 0.45, rain: 0.0 },
  morning:  { horizon: C(0.412, 0.302, 0.176), zenith: C(0.105, 0.147, 0.217), cloud: C(0.9, 0.75, 0.62), cover: 0.3, soft: 0.4, moon: 0.0, sun: 1.0, stars: 0.0, haze: 0.4, rain: 0.0 },
};
const KEYS = ['cover', 'soft', 'moon', 'sun', 'stars', 'haze', 'rain'];

export function createSky(scene) {
  const u = {
    uHorizon: { value: new THREE.Color() }, uZenith: { value: new THREE.Color() }, uCloudCol: { value: new THREE.Color() },
    uSunCol: { value: new THREE.Color(1.0, 0.62, 0.32) }, uMoonDir: { value: new THREE.Vector3(-0.35, 0.55, -0.75).normalize() },
    uSunDir: { value: new THREE.Vector3(0.05, 0.06, -1).normalize() }, uTime: { value: 0 },
    uCover: { value: 0.8 }, uSoft: { value: 0.2 }, uMoon: { value: 0 }, uSun: { value: 0 }, uStars: { value: 0 }, uFlash: { value: 0 }, uHaze: { value: 0.5 },
  };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(700, 48, 24),
    new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: u, side: THREE.BackSide, depthWrite: false, fog: false }));
  dome.renderOrder = -10; scene.add(dome);

  const cur = { horizon: new THREE.Color(), zenith: new THREE.Color(), cloud: new THREE.Color() };
  for (const k of KEYS) cur[k] = 0;
  let from = SKIES.night, to = SKIES.night, mix = 1, fadeLen = 6, flash = 0, nextBolt = 2, lightning = 0;
  Object.assign(cur, { cover: from.cover, soft: from.soft, haze: from.haze, rain: from.rain });
  cur.horizon.copy(from.horizon); cur.zenith.copy(from.zenith); cur.cloud.copy(from.cloud);

  return {
    dome, uniforms: u, fogColor: new THREE.Color(), rain: 1, flash: 0,
    set(name, seconds = 6) {
      const p = SKIES[name] || SKIES.night; if (p === to) return;
      from = { horizon: cur.horizon.clone(), zenith: cur.zenith.clone(), cloud: cur.cloud.clone() };
      for (const k of KEYS) from[k] = cur[k];
      to = p; mix = 0; fadeLen = seconds;
    },
    update(dt, time, cameraPos, bass) {
      mix = Math.min(1, mix + dt / fadeLen);
      const e = mix * mix * (3 - 2 * mix);
      cur.horizon.copy(from.horizon).lerp(to.horizon, e); cur.zenith.copy(from.zenith).lerp(to.zenith, e); cur.cloud.copy(from.cloud).lerp(to.cloud, e);
      for (const k of KEYS) cur[k] = from[k] + ((to[k] ?? 0) - from[k]) * e;
      lightning += (((to.lightning ? 1 : 0) - lightning)) * Math.min(1, dt * 0.5);
      nextBolt -= dt;
      if (nextBolt < 0 && lightning > 0.3) { flash = 0.6 + Math.random() * 0.6 + bass * 0.4; nextBolt = 2.5 + Math.random() * 6; }
      flash *= Math.exp(-dt * (flash > 0.5 ? 7 : 3)); if (flash < 0.003) flash = 0;
      if (flash > 0.2 && Math.random() < 0.25) flash *= 0.55;       // the stutter of a real bolt
      u.uHorizon.value.copy(cur.horizon); u.uZenith.value.copy(cur.zenith); u.uCloudCol.value.copy(cur.cloud);
      u.uCover.value = cur.cover; u.uSoft.value = cur.soft; u.uMoon.value = cur.moon; u.uSun.value = cur.sun;
      u.uStars.value = cur.stars; u.uHaze.value = cur.haze; u.uFlash.value = flash * lightning; u.uTime.value = time;
      dome.position.copy(cameraPos);
      this.fogColor.copy(cur.horizon).multiplyScalar(0.85);
      this.rain = cur.rain; this.flash = flash * lightning; this.sun = cur.sun; this.moon = cur.moon;
    },
  };
}
