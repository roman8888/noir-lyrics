// The music-video scene: each lyric line is a 3D "shot" in a void; words land on their own timestamps.
import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { rng, clamp, easeOutExpo, makeRain } from './util.js';
import { buildMotif, pickMotif } from './motifs.js';
import { fxFor, applyFx } from './fx.js';
import { LOOKS } from './songs.js';

const SIZE = 0.56, DEPTH = 0.3, SPACE = SIZE * 0.42, LINE_H = SIZE * 1.6, MAXW = 7.4, GAP = 16;
const RED = new THREE.Color(0xff1a12), GOLD = new THREE.Color(0xffb347);
const COLD = new THREE.Color(0.32, 0.42, 0.68), BLOOD = new THREE.Color(0.5, 0.03, 0.035), AMBER = new THREE.Color(1, 0.6, 0.28);
const PAPER = new THREE.Color(0xf1eee8), INK = new THREE.Color(0x060607);
const glowFor = a => COLD.clone().lerp(BLOOD, clamp(a.red ?? 0)).lerp(AMBER, clamp(a.warm ?? 0));
const SMALL = new Set(['the','a','an','to','and','of','in','on','for','by','with','as','at','or','so','but','i','i\'m','i\'ll','you','your','you\'re','me','my','he','his','they','them','their','it','is','was','be','that','what','when','then','than','though','if','all','do','don\'t','who','there','were','will','would','we']);
const KEYS = ['rain', 'warm', 'red', 'beam', 'dawn', 'cut', 'fog'];

const skyVS = `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`;
const skyFS = `uniform vec3 uTop, uHorizon; uniform float uSun; varying vec3 vP;
  void main(){ float y = vP.y; vec3 c = mix(uHorizon, uTop, smoothstep(-0.1, 0.6, y));
    float sun = pow(max(0., dot(vP, normalize(vec3(0., 0.05, -1.)))), 900.) * uSun * 1.6 + pow(max(0., dot(vP, normalize(vec3(0., 0.05, -1.)))), 12.) * uSun * 0.12;
    c += vec3(1.0, 0.7, 0.45) * sun; gl_FragColor = vec4(c, 1.); }`;
const beamVS = `varying float vY; varying float vE; void main(){ vY = uv.y; vec4 mv = modelViewMatrix*vec4(position,1.);
  vE = abs(dot(normalize(normalMatrix*normal), normalize(-mv.xyz))); gl_Position = projectionMatrix*mv; }`;
const beamFS = `uniform float uA; uniform float uTime; uniform vec3 uC; varying float vY; varying float vE;
  void main(){ float a = pow(vY, 1.3) * pow(vE, 2.5) * uA * (0.85 + 0.15*sin(uTime*0.7 + vY*6.0));
    gl_FragColor = vec4(uC * a, a); }`;

export function createSong(fonts) {
  const scene = new THREE.Scene();
  const fog = new THREE.FogExp2(0x050506, 0.07); scene.fog = fog;

  const skyU = { uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uSun: { value: 0 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16),
    new THREE.ShaderMaterial({ vertexShader: skyVS, fragmentShader: skyFS, uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false }));
  scene.add(sky);

  scene.add(new THREE.AmbientLight(0xffffff, 0.06));
  const key = new THREE.DirectionalLight(0xdfe6ff, 2.6); scene.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left: -10, right: 10, top: 8, bottom: -8, near: 0.5, far: 40 });
  const rim = new THREE.DirectionalLight(0x9a1414, 1.0); scene.add(rim, rim.target);

  const beamU = { uA: { value: 0 }, uTime: { value: 0 }, uC: { value: new THREE.Color(1, 0.8, 0.5) } };
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 4.5, 26, 32, 1, true),
    new THREE.ShaderMaterial({ vertexShader: beamVS, fragmentShader: beamFS, uniforms: beamU, transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
  scene.add(beam);

  // far lamps / embers give depth in the void
  const lampGeo = new THREE.SphereGeometry(0.09, 8, 6), lamps = [];
  const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.9, 1.6) });
  for (let i = 0; i < 70; i++) {
    const m = new THREE.Mesh(lampGeo, lampMat);
    m.position.set((Math.random() - 0.5) * 34, (Math.random() - 0.5) * 16, -Math.random() * 140 + 10);
    scene.add(m); lamps.push(m);
  }

  const rain = makeRain(4000, 0x9aa6b8, 0.25); scene.add(rain.object);
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 900);

  const geoCache = new Map();
  const wordGeo = (w, it) => {
    const key = (it ? 'i:' : 'r:') + w;
    if (!geoCache.has(key)) {
      const g = new TextGeometry(w, { font: it ? fonts.italic : fonts.roman, size: SIZE, height: DEPTH, curveSegments: 14,
        bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.012, bevelSegments: 4 });
      g.computeBoundingBox(); const b = g.boundingBox;
      g.translate(-(b.min.x + b.max.x) / 2, -SIZE * 0.36, -DEPTH / 2);
      geoCache.set(key, { g, width: b.max.x - b.min.x });
    }
    return geoCache.get(key);
  };
  // blood: deep crimson, wet clear coat, clotted surface (procedural bump + roughness), no neon glow
  const bloodTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#808080'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2600; i++) { const r = Math.random() ** 3 * 22 + 1, v = 90 + Math.random() * 110;
      g.fillStyle = `rgba(${v},${v},${v},${0.15 + Math.random() * 0.35})`; g.beginPath();
      g.ellipse(Math.random() * 512, Math.random() * 512, r, r * (0.6 + Math.random() * 0.8), Math.random() * 3, 0, 7); g.fill(); }
    for (let i = 0; i < 40; i++) { const x = Math.random() * 512; const gr = g.createLinearGradient(x, 0, x, 512);
      gr.addColorStop(0, 'rgba(40,40,40,.0)'); gr.addColorStop(1, 'rgba(40,40,40,.35)'); g.fillStyle = gr; g.fillRect(x, Math.random() * 300, 2 + Math.random() * 4, 512); }   // drips
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.9, 0.9); return t;
  })();
  const bloodMat = new THREE.MeshPhysicalMaterial({ color: 0x5c0409, roughness: 0.42, roughnessMap: bloodTex, bumpMap: bloodTex, bumpScale: 0.6,
    metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 0.4, sheenColor: new THREE.Color(0x8a0d12),
    emissive: 0x2a0002, emissiveIntensity: 0.25, transparent: true });
  const baseMat = new THREE.MeshStandardMaterial({ color: 0xf1eee8, roughness: 0.36, metalness: 0.15,
    emissive: 0xffffff, emissiveIntensity: 0.04, transparent: true });

  let song = null, lines = [], live = new Map(), lastT = 0, actIdx = -1, hovered = null;
  const P = Object.fromEntries(KEYS.map(k => [k, 0]));
  const wpos = new THREE.Vector3(), orbitE = new THREE.Euler(), spotAt = new THREE.Vector3();
  let spotOn = 0;
  // follow-spot: a small warm light that travels to each word as it is sung and rakes across its bevels
  const spot = new THREE.PointLight(0xffeeda, 0, 5, 2); scene.add(spot);
  const camBase = new THREE.Vector3(0, 0, 14), look = new THREE.Vector3(), tmp = new THREE.Vector3();
  const env = { fast: 0, slow: 0, bass: 0, peak: 0.05 };
  let onAct = () => {};
  const pointer = new THREE.Vector2(0, 0), ptrS = new THREE.Vector2(), ray = new THREE.Raycaster();

  function shot(i) {
    const r = rng(i * 7919 + 13);
    const cut = actAt(lines[i]?.t ?? 0).cut;
    const anchor = new THREE.Vector3((r() - 0.5) * 3.2, (r() - 0.5) * 1.8, -i * GAP);
    const rot = new THREE.Euler(0, (r() - 0.5) * (cut ? 0.6 : 0.6), (r() - 0.5) * (cut ? 0.22 : 0.08));
    const dist = cut ? 6.4 + r() * 1.6 : 7 + r() * 2.4;
    const lat = new THREE.Vector2((r() - 0.5) * 1.0, (r() - 0.5) * 0.6);
    return { anchor, rot, dist, lat, orbit: (r() < 0.5 ? -1 : 1) * (0.28 + r() * 0.22), w: MAXW, h: LINE_H * 2, roll: (r() - 0.5) * (cut ? 0.12 : 0.03), cam: new THREE.Vector3() };
  }
  const shots = [];
  const shotFor = i => shots[i] || (shots[i] = shot(i));

  function actAt(t) {
    const acts = song?.acts || [{ t: 0 }]; let a = acts[0];
    for (const x of acts) if (x.t <= t) a = x;
    return a;
  }
  function blendActs(t) {                    // crossfade into each act over ~4 s (1 s for hard-cut acts)
    const acts = song.acts; let i = 0;
    for (let k = 0; k < acts.length; k++) if (acts[k].t <= t) i = k;
    const cur = acts[i], prev = acts[Math.max(0, i - 1)];
    const f = clamp((t - cur.t) / (cur.cut ? 1 : 4));
    for (const k of KEYS) P[k] = (prev[k] ?? 0) + ((cur[k] ?? 0) - (prev[k] ?? 0)) * (i === 0 ? 1 : f);
    if (i !== actIdx) { actIdx = i; onAct(cur); }
  }

  const lineEnd = i => {
    const L = lines[i], n = lines[i + 1];
    if (!n) return Infinity;
    return Math.min(n.t, L.t + Math.max(5, (L.words?.length || 6) * 0.7 + 3.5));
  };

  function build(i) {
    const L = lines[i], s = shotFor(i), act = actAt(L.t);
    const accentCol = (act.warm ?? 0) > (act.red ?? 0) ? GOLD : RED;
    const raw = L.words || L.text.split(/\s+/).map(w => ({ w }));
    const accentSet = new Set(song.accents || []);
    let accents = 0;
    const toks = raw.map(x => {
      const clean = x.w.replace(/[*]/g, '');
      const acc = /^\*.+\*$/.test(x.w) || (accents < 2 && accentSet.has(clean.replace(/[^a-z']/gi, '').toLowerCase()) && ++accents);
      return { ...x, w: clean, acc: !!acc || !!L.title };
    });
    // word size: meaning (small connectors, big key words) x singing (held notes grow, fast rap shrinks)
    toks.forEach((tk, k) => {
      const bare = tk.w.toLowerCase().replace(/[^a-z']/g, '');
      let ws = SMALL.has(bare) ? 0.74 : 1;
      if (tk.acc) ws = 1.38; else if (fxFor(tk.w)) ws = 1.18;
      const next = toks[k + 1]?.t ?? (tk.t != null ? tk.t + 0.7 : null);
      if (tk.t != null && next != null) ws *= clamp(0.88 + (next - tk.t - 0.25) * 0.45, 0.85, 1.3);
      tk.ws = L.title ? 1 : ws;
    });
    // wrap into rows
    const rows = [[]]; let rw = 0;
    for (const tk of toks) {
      tk.geo = wordGeo(tk.w, tk.acc && !L.title); tk.wd = tk.geo.width * tk.ws;
      if (rw > 0 && rw + SPACE + tk.wd > MAXW) { rows.push([]); rw = 0; }
      rows.at(-1).push(tk); rw += (rw ? SPACE : 0) + tk.wd;
    }
    const rowH = rows.map(row => LINE_H * Math.max(...row.map(tk => tk.ws)));
    const totH = rowH.reduce((a, b) => a + b, 0);
    const group = new THREE.Group(); group.position.copy(s.anchor); group.rotation.copy(s.rot);
    const words = []; const n = toks.length;
    const dur = Number.isFinite(lineEnd(i)) ? lineEnd(i) - L.t : 5;
    const step = Math.min(0.5, Math.max(0.1, dur * 0.6 / n));
    let wi = 0;
    rows.forEach((row, ri) => {
      const total = row.reduce((a, tk) => a + tk.wd, 0) + SPACE * (row.length - 1);
      let x = -total / 2; const y = totH / 2 - rowH.slice(0, ri).reduce((a, b) => a + b, 0) - rowH[ri] / 2;
      for (const tk of row) {
        const blood = tk.acc && accentCol === RED;
        const mat = blood ? bloodMat.clone() : baseMat.clone();
        if (tk.acc && !blood) { mat.color.copy(accentCol).multiplyScalar(0.35); mat.emissive.copy(accentCol); mat.emissiveIntensity = 0.9; }
        mat.side = THREE.FrontSide;
        const mesh = new THREE.Mesh(tk.geo.g, mat);
        const home = new THREE.Vector3(x + tk.wd / 2, y - (rowH[ri] / LINE_H - tk.ws) * SIZE * 0.4, 0);
        const seed = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
        mesh.castShadow = true;
        mesh.userData = { home, seed, reveal: tk.t ?? (L.t + wi * step), acc: tk.acc, blood, base: mat.emissiveIntensity, cut: act.cut, ws: tk.ws, fx: L.title ? null : fxFor(tk.w) };
        mesh.visible = false; group.add(mesh); words.push(mesh);
        x += tk.wd + SPACE; wi++;
      }
    });
    s.w = Math.max(...rows.map(row => row.reduce((a, tk) => a + tk.wd, 0) + SPACE * (row.length - 1))) * (L.title ? 0.7 : 1) * 1.3;
    s.h = totH * (L.title ? 0.7 : 1) + 0.6;
    if (L.title) group.scale.setScalar(0.7);
    const motif = buildMotif(L.title ? 'rain' : pickMotif(L.text), glowFor(act), rng(i * 31 + 5), L.text);
    motif.root.position.set(0, 0.6, -8); group.add(motif.root);
    scene.add(group); live.set(i, { group, words, motif });
  }
  function drop(i) {
    const e = live.get(i); if (!e) return;
    e.words.forEach(m => m.material.dispose()); e.motif.dispose(); scene.remove(e.group); live.delete(i);
  }
  const clear = () => { for (const i of [...live.keys()]) drop(i); };

  function analyse(analyser, buf) {
    if (!analyser) return;
    analyser.getByteFrequencyData(buf);
    let b = 0, all = 0; for (let k = 1; k < 8; k++) b += buf[k]; for (let k = 1; k < 180; k++) all += buf[k];
    b /= 7 * 255; all /= 179 * 255;
    env.peak = Math.max(env.peak * 0.9995, all, 0.05);
    const e = all / env.peak;
    env.fast += (e - env.fast) * 0.25; env.slow += (e - env.slow) * 0.01;
    env.bass += (b - env.bass) * (b > env.bass ? 0.6 : 0.1);
  }

  return {
    scene, camera, env, P,
    get focus() { return camera.position.distanceTo(look); },
    set onAct(fn) { onAct = fn; },
    load(s, timing) {
      clear(); shots.length = 0; actIdx = -1;
      song = { ...s, acts: timing.sections.map(x => ({ ...(LOOKS[x.name] || LOOKS['Verse 1']), name: x.name, desc: x.desc, t: x.name === 'Intro' ? 0 : x.t - 0.8 })) };
      lines = timing.lines.slice();
      if (!lines.length || lines[0].t > 5) lines.unshift({ t: 1.2, text: s.title, title: true, words: null });
      camBase.copy(shotFor(0).anchor).add(new THREE.Vector3(0, 0, 22)); look.copy(shotFor(0).anchor);
    },
    lines: () => lines,
    setPointer(x, y) { pointer.set(x, y); },
    reset() { clear(); },
    update(dt, now, t, analyser, buf) {
      if (!song) return;
      const jumped = Math.abs(t - lastT) > 1.5;          // a seek: cut, don't glide across the void
      if (t < lastT - 0.4) clear();
      ray.setFromCamera(pointer, camera);
      const pool = []; for (const e of live.values()) for (const m of e.words) if (m.visible) pool.push(m);
      hovered = ray.intersectObjects(pool, false)[0]?.object || null;
      lastT = t;
      analyse(analyser, buf);
      blendActs(t);
      const hit = clamp((env.bass - 0.45) * 2.5);

      let active = -1;
      for (let i = 0; i < lines.length; i++) if (lines[i].t != null && lines[i].t <= t) active = i;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].t == null) { if (live.has(i)) drop(i); continue; }
        const want = t >= lines[i].t - 0.4 && t < lineEnd(i) + 1.6;
        if (want && !live.has(i)) build(i); else if (!want && live.has(i)) drop(i);
      }

      for (const [i, { words, motif }] of live) {
        const end = lineEnd(i), isActive = i === active;
        motif.root.getWorldPosition(wpos);
        const near = clamp((camera.position.distanceTo(wpos) - 3) / 6);   // fade as the camera flies through the frame
        motif.update(t - lines[i].t, clamp((t - lines[i].t + 0.6) / 1.2) * (1 - clamp((t - end) / 0.9)) * near, env, now);
        let newest = null;
        for (const m of words) if (m.userData.reveal <= t) newest = m;
        if (isActive && newest) { newest.getWorldPosition(spotAt); spotOn = 1; }
        for (const m of words) {
          const u = m.userData;
          u.hl = (u.hl || 0) + (((isActive && m === newest) ? 1 : 0) - (u.hl || 0)) * Math.min(1, dt * 12);
          u.hov = (u.hov || 0) + ((m === hovered ? 1 : 0) - (u.hov || 0)) * Math.min(1, dt * 8);
          const a = clamp((t - u.reveal) / (u.cut ? 0.22 : 0.7));
          if (a <= 0) { m.visible = false; continue; }
          m.visible = true;
          const e = easeOutExpo(a), d = clamp((t - end) / 1.3) * (u.fx === 'stay' ? 0.25 : 1), de = d * d;
          const slam = u.cut ? 1 + Math.sin(a * Math.PI) * 0.35 : 1;
          m.position.copy(u.home);
          m.position.z += (1 - e) * (u.cut ? 3 : -5) + (isActive ? hit * 0.25 * (0.5 + u.seed.z) : 0);
          // leaving words part like a curtain, so the camera flies through the gap
          m.position.x += (1 - e) * u.seed.x * 2 + de * Math.sign(u.home.x || u.seed.x) * (4 + Math.abs(u.seed.x) * 6);
          m.position.y += (1 - e) * u.seed.y * 1.5 + de * (Math.sign(u.home.y + 0.01) * 2 + u.seed.y * 3) + Math.sin(now * 0.8 + u.seed.x * 9) * 0.03;
          m.rotation.set((1 - e) * u.seed.x * 2.2 + de * u.seed.y * 4, (1 - e) * u.seed.y * 1.6 + de * u.seed.z * 3, de * u.seed.x * 2);
          m.position.z += u.hl * 0.35 + u.hov * 0.6;
          m.rotation.y += u.hov * Math.sin(now * 9) * 0.15;
          m.scale.setScalar(Math.max(0.001, u.ws * e * slam * (1 - de * 0.4) * (1 + u.hl * 0.1 + u.hov * 0.25)));
          m.material.opacity = e * (1 - d);
          // at dawn the plain words become ink silhouettes against the sky; accents keep their light
          // no flashing: words already sung step back into shade, the sung one is lit by the follow-spot
          if (!u.acc) m.material.color.copy(PAPER).multiplyScalar(isActive ? 0.62 + 0.38 * Math.max(u.hl, u.hov) : 0.8).lerp(INK, P.dawn * 0.93);
          m.material.emissiveIntensity = (u.acc ? 1 : 1 - P.dawn * 0.95) * u.base * (u.blood ? 1 : 0.6);
          if (u.fx) applyFx(u.fx, m, u, t - u.reveal, { now, bass: env.bass });
        }
      }

      spot.position.lerp(tmp.copy(spotAt).add(new THREE.Vector3(0.35, 0.55, 0.9).applyEuler(shotFor(Math.max(active, 0)).rot)), 1 - Math.exp(-dt * 14));
      spot.intensity += ((spotOn ? 9 : 0) - spot.intensity) * (1 - Math.exp(-dt * 8)); spotOn = 0;

      // camera: glide (or snap, in hard-cut acts) to the active line's shot
      const s = shotFor(Math.max(active, 0));
      // frame the line so it always fits the screen, whatever the aspect ratio
      const tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const fit = Math.max(s.dist, (s.w / 2 + 0.5) / (tanH * camera.aspect), (s.h / 2 + 0.6) / tanH);
      // slow orbit across each line so the extruded letters show their depth
      const la = active >= 0 ? clamp((t - lines[active].t) / Math.min(8, Number.isFinite(lineEnd(active)) ? lineEnd(active) - lines[active].t : 8)) : 0;
      orbitE.set(s.rot.x, s.rot.y + s.orbit * (la - 0.5), s.rot.z);
      s.cam.set(s.lat.x, s.lat.y + s.orbit * 0.6 * (0.5 - la), fit).applyEuler(orbitE).add(s.anchor);
      tmp.copy(s.cam); if (active < 0) tmp.z += 10;
      if (!Number.isFinite(lineEnd(Math.max(active, 0))) && active >= 0) tmp.add(new THREE.Vector3(0, 0, clamp((t - lines[active].t - 6) / 40) * 9).applyEuler(s.rot));
      const k = P.cut > 0.5 ? 7 : 1.5;
      if (jumped) { camBase.copy(tmp); look.copy(s.anchor); }
      camBase.lerp(tmp, 1 - Math.exp(-dt * k));
      look.lerp(s.anchor, 1 - Math.exp(-dt * (k + 0.6)));
      ptrS.lerp(pointer, 1 - Math.exp(-dt * 3));
      camera.position.copy(camBase).add(tmp.set(ptrS.x * 0.9, ptrS.y * 0.5, 0).applyEuler(s.rot));
      const shake = hit * hit * (0.03 + P.red * 0.05);
      camera.position.x += Math.sin(now * 0.37) * 0.18 + (Math.random() - 0.5) * shake;
      camera.position.y += Math.sin(now * 0.29 + 1) * 0.12 + (Math.random() - 0.5) * shake;
      camera.lookAt(look);
      camera.rotateZ(s.roll + Math.sin(now * 0.21) * 0.015);

      // weather
      rain.update(dt, camera.position, 0.15 + P.rain * 0.9);
      rain.mat.opacity = 0.32 * clamp(P.rain);
      fog.density = P.fog * (1 - env.slow * 0.15);
      const night = new THREE.Color(0x050506), dawnH = new THREE.Color(0.3, 0.13, 0.07), dawnT = new THREE.Color(0.035, 0.045, 0.09);
      skyU.uHorizon.value.copy(night).lerp(dawnH, P.dawn);
      skyU.uTop.value.copy(night).lerp(dawnT, P.dawn);
      skyU.uSun.value = P.dawn;
      fog.color.copy(skyU.uHorizon.value).lerp(night, 0.25);
      key.color.setRGB(0.87, 0.9, 1).lerp(new THREE.Color(1, 0.8, 0.55), P.warm);
      key.intensity = 2.4 + env.bass * 1.6;
      key.position.copy(look).add(new THREE.Vector3(-4, 6, 8)); key.target.position.copy(look);
      rim.position.copy(look).add(new THREE.Vector3(5, -2, -4)); rim.target.position.copy(look);
      rim.color.setHex(0x9a1414).lerp(GOLD, P.warm); rim.intensity = 0.6 + P.red * 1.2 + P.warm * 0.6;
      beam.position.copy(look).add(new THREE.Vector3(0, 9, -1.5));
      beamU.uA.value = 0.14 * P.beam * (0.8 + env.slow * 0.4); beamU.uTime.value = now;
      beamU.uC.value.setRGB(1, 0.82, 0.55);
      for (const l of lamps) if (l.position.z > camera.position.z + 6) l.position.z -= 150;
      sky.position.copy(camera.position);
    },
  };
}
