// The lyrics inside the city: each line is built as 3D type at the place the storyboard gives it, each word
// appears on its own timestamp, the sung word is lit by a follow-spot, words act out their meaning (fx.js).
import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { clamp, easeOutExpo } from './util.js?v=20261010195658';
import { fxFor, applyFx } from './fx.js?v=20261010195658';
import { LOOKS } from './songs.js?v=20261010195658';

const SIZE = 0.56, DEPTH = 0.07, SPACE = SIZE * 0.42, LINE_H = SIZE * 1.6, MAXW = 7.4;
const PAPER = new THREE.Color(0xf1eee8), INK = new THREE.Color(0x060607);
const SMALL = new Set(['the','a','an','to','and','of','in','on','for','by','with','as','at','or','so','but','i','i\'m','i\'ll','you','your','you\'re','me','my','he','his','they','them','their','it','is','was','be','that','what','when','then','than','though','if','all','do','don\'t','who','there','were','will','would','we']);
const KEYS = ['rain', 'warm', 'red', 'beam', 'dawn', 'cut', 'fog'];

export function createSong(fonts, scene, route, occluders = []) {
  const occ = new THREE.Raycaster();
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 1200);
  // a soft key that travels with the camera, plus the follow-spot on the sung word
  const key = new THREE.DirectionalLight(0xdfe6ff, 1.6); scene.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03;
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 6, bottom: -6, near: 0.5, far: 40 });
  const spot = new THREE.PointLight(0xffeeda, 0, 5, 2); scene.add(spot);

  const geoCache = new Map();
  const wordGeo = (w, it) => {
    const k = (it ? 'i:' : 'r:') + w;
    if (!geoCache.has(k)) {
      const g = new TextGeometry(w, { font: it ? fonts.italic : fonts.roman, size: SIZE, height: DEPTH, curveSegments: 12, bevelEnabled: false });
      g.computeBoundingBox(); const b = g.boundingBox;
      g.translate(-(b.min.x + b.max.x) / 2, -SIZE * 0.36, -DEPTH / 2);
      geoCache.set(k, { g, width: b.max.x - b.min.x });
    }
    return geoCache.get(k);
  };
  // blood: deep crimson, wet clear coat, clotted surface, no glow
  const bloodTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#808080'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2600; i++) { const r = Math.random() ** 3 * 22 + 1, v = 90 + Math.random() * 110;
      g.fillStyle = `rgba(${v},${v},${v},${0.15 + Math.random() * 0.35})`; g.beginPath();
      g.ellipse(Math.random() * 512, Math.random() * 512, r, r * (0.6 + Math.random() * 0.8), Math.random() * 3, 0, 7); g.fill(); }
    for (let i = 0; i < 40; i++) { const x = Math.random() * 512; const gr = g.createLinearGradient(x, 0, x, 512);
      gr.addColorStop(0, 'rgba(40,40,40,.0)'); gr.addColorStop(1, 'rgba(40,40,40,.35)'); g.fillStyle = gr; g.fillRect(x, Math.random() * 300, 2 + Math.random() * 4, 512); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.9, 0.9); return t;
  })();
  const bloodMat = new THREE.MeshStandardMaterial({ color: 0x6a070c, roughness: 0.55, roughnessMap: bloodTex, bumpMap: bloodTex, bumpScale: 0.25,
    metalness: 0.0, emissive: 0x4a0408, emissiveIntensity: 0.55, transparent: true });
  const baseMat = new THREE.MeshStandardMaterial({ color: 0xf1eee8, roughness: 0.9, metalness: 0.0, emissive: 0xf1eee8, emissiveIntensity: 0.42, transparent: true });

  let song = null, lines = [], live = new Map(), lastT = 0, actIdx = -1, hovered = null;
  const P = Object.fromEntries(KEYS.map(k => [k, 0]));
  const spotAt = new THREE.Vector3(); let spotOn = 0;
  const camBase = new THREE.Vector3(), look = new THREE.Vector3(), tmp = new THREE.Vector3(), focusAt = new THREE.Vector3(), nextAt = new THREE.Vector3();
  const env = { fast: 0, slow: 0, bass: 0, peak: 0.05 };
  let onAct = () => {}, lastStation = null;
  const pointer = new THREE.Vector2(), ptrS = new THREE.Vector2(), ray = new THREE.Raycaster();
  const pose = { pos: new THREE.Vector3(), look: new THREE.Vector3(), beat: null, cut: false, u: 0 };

  function actAt(t) { const acts = song?.acts || [{ t: 0 }]; let a = acts[0]; for (const x of acts) if (x.t <= t) a = x; return a; }
  function blendActs(t) {
    const acts = song.acts; let i = 0;
    for (let k = 0; k < acts.length; k++) if (acts[k].t <= t) i = k;
    const cur = acts[i], prev = acts[Math.max(0, i - 1)], f = clamp((t - cur.t) / (cur.cut ? 1 : 4));
    for (const k of KEYS) P[k] = (prev[k] ?? 0) + ((cur[k] ?? 0) - (prev[k] ?? 0)) * (i === 0 ? 1 : f);
    if (i !== actIdx) { actIdx = i; onAct(cur); }
  }
  const lineEnd = i => { const L = lines[i], n = lines[i + 1]; if (!n) return L.t + 9; return Math.min(n.t, L.t + Math.max(5, (L.words?.length || 6) * 0.7 + 3.5)); };

  function build(i) {
    const L = lines[i], act = actAt(L.t), a = route.anchorFor(i);
    const raw = L.words || L.text.split(/\s+/).map(w => ({ w }));
    const accentSet = new Set(song.accents || []); let accents = 0;
    const toks = raw.map(x => { const clean = x.w.replace(/[*]/g, '');
      const acc = /^\*.+\*$/.test(x.w) || (accents < 2 && accentSet.has(clean.replace(/[^a-z']/gi, '').toLowerCase()) && ++accents);
      return { ...x, w: clean, acc: !!acc || !!L.title }; });
    // word size: meaning (small connectors, big key words) × singing (held notes grow, fast rap shrinks)
    toks.forEach((tk, k) => {
      const bare = tk.w.toLowerCase().replace(/[^a-z']/g, '');
      let ws = SMALL.has(bare) ? 0.74 : 1;
      if (tk.acc) ws = 1.38; else if (fxFor(tk.w)) ws = 1.18;
      const next = toks[k + 1]?.t ?? (tk.t != null ? tk.t + 0.7 : null);
      if (tk.t != null && next != null) ws *= clamp(0.88 + (next - tk.t - 0.25) * 0.45, 0.85, 1.3);
      tk.ws = L.title ? 1 : ws;
    });
    const maxW = MAXW * (a.kind === 'room' ? 1.0 : a.kind === 'wall' ? 0.9 : 1);
    const rows = [[]]; let rw = 0;
    for (const tk of toks) {
      tk.geo = wordGeo(tk.w, tk.acc && !L.title); tk.wd = tk.geo.width * tk.ws;
      if (rw > 0 && rw + SPACE + tk.wd > maxW) { rows.push([]); rw = 0; }
      rows.at(-1).push(tk); rw += (rw ? SPACE : 0) + tk.wd;
    }
    const rowH = rows.map(row => LINE_H * Math.max(...row.map(tk => tk.ws))), totH = rowH.reduce((s, b) => s + b, 0);
    const group = new THREE.Group(); group.position.copy(a.pos); group.quaternion.copy(a.q); group.scale.setScalar(a.scale);
    if (a.kind !== 'room' && a.camPos) {
      // nothing may stand between the camera and the line
      const dir = new THREE.Vector3().subVectors(a.pos, a.camPos), dist = dir.length(); dir.normalize();
      // test the centre and both ends of the line (and a point below it): the nearest obstacle wins
      const halfW = Math.max(...rows.map(row => row.reduce((s2, tk) => s2 + tk.wd, 0) + SPACE * (row.length - 1))) * a.scale / 2;
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(a.q), down = new THREE.Vector3(0, -totH * a.scale / 2, 0);
      let nearest = Infinity;
      for (const off of [new THREE.Vector3(), right.clone().multiplyScalar(halfW), right.clone().multiplyScalar(-halfW), down]) {
        const target = a.pos.clone().add(off), d2 = new THREE.Vector3().subVectors(target, a.camPos), L2 = d2.length(); d2.normalize();
        occ.set(a.camPos, d2); occ.far = L2;
        const hit = occ.intersectObjects(occluders, true)[0];
        if (hit && hit.distance < L2 - 0.4) nearest = Math.min(nearest, hit.distance * (dist / L2));
      }
      if (nearest < Infinity) group.position.copy(a.camPos).addScaledVector(dir, Math.max(1.5, nearest - 0.8));
    }
    const words = [], n = toks.length, dur = Number.isFinite(lineEnd(i)) ? lineEnd(i) - L.t : 5, step = Math.min(0.5, Math.max(0.1, dur * 0.6 / n));
    let wi = 0;
    rows.forEach((row, ri) => {
      const total = row.reduce((s, tk) => s + tk.wd, 0) + SPACE * (row.length - 1);
      let x = -total / 2; const y = totH / 2 - rowH.slice(0, ri).reduce((s, b) => s + b, 0) - rowH[ri] / 2;
      for (const tk of row) {
        const blood = tk.acc;
        const mat = blood ? bloodMat.clone() : baseMat.clone();
        const mesh = new THREE.Mesh(tk.geo.g, mat); mesh.castShadow = true;
        const home = new THREE.Vector3(x + tk.wd / 2, y - (rowH[ri] / LINE_H - tk.ws) * SIZE * 0.4, 0);
        const seed = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
        mesh.userData = { home, seed, reveal: tk.t ?? (L.t + wi * step), acc: tk.acc, blood, base: mat.emissiveIntensity, cut: act.cut, ws: tk.ws, fx: L.title ? null : fxFor(tk.w), hl: 0, hov: 0 };
        if (mesh.userData.fx === 'tight') {                        // built letter by letter, so the letters can squeeze together when sung
          const chars = [...tk.w], geos = chars.map(ch => wordGeo(ch, tk.acc)), gap = SIZE * 0.1;
          const natW = geos.reduce((s2, g) => s2 + g.width, 0) + gap * (chars.length - 1), sqW = geos.reduce((s2, g) => s2 + g.width * 0.86, 0);
          let nx = -natW / 2, sx = -sqW / 2;
          chars.forEach((ch, k) => {
            const lm = new THREE.Mesh(geos[k].g, mat.clone()); lm.castShadow = true;
            const lh = home.clone(); lh.x += (nx + geos[k].width / 2) * tk.ws;
            lm.userData = { ...mesh.userData, home: lh, sqX: home.x + (sx + geos[k].width * 0.86 / 2) * tk.ws, seed: seed.clone(), hl: 0, hov: 0 };
            lm.visible = false; group.add(lm); words.push(lm);
            nx += geos[k].width + gap; sx += geos[k].width * 0.86;
          });
        } else { mesh.visible = false; group.add(mesh); words.push(mesh); }
        if (mesh.userData.fx === 'shame') {                      // shame shame shame: copies knock in around the word
          const offs = [[-1.9, 0.9], [1.8, 1.0], [-2.1, -0.8], [2.0, -0.85], [-0.3, 1.5], [0.5, -1.45]];
          offs.forEach(([ox, oy], k) => {
            const d = new THREE.Mesh(tk.geo.g, mesh.material.clone()); d.castShadow = true;
            d.userData = { ...mesh.userData, home: home.clone().add(new THREE.Vector3(ox, oy, -0.4 - k * 0.1)), reveal: mesh.userData.reveal + 0.12 + k * 0.14, ws: tk.ws * (0.8 + (k % 3) * 0.12), dup: true, seed: seed.clone() };
            d.visible = false; group.add(d); words.push(d);
          });
        }
        x += tk.wd + SPACE; wi++;
      }
    });
    // the whole line must fit inside the frame: shrink it until it spans at most ~70% of the view
    if (a.camPos) {
      const lineW = Math.max(...rows.map(row => row.reduce((s2, tk) => s2 + tk.wd, 0) + SPACE * (row.length - 1))) * group.scale.x, lineH = totH * group.scale.x;
      const d = group.position.distanceTo(a.camPos), tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      let maxW = 2 * d * tanH * camera.aspect * 0.62; const maxH = 2 * d * tanH * 0.55;
      const al = a.beat?.alley; if (al && Math.abs(group.position.x) > 8) maxW = Math.min(maxW, al.w - 0.5);   // inside an alley: narrower than the alley
      const fit = Math.min(1, maxW / lineW, maxH / lineH);
      if (fit < 1) group.scale.multiplyScalar(fit);
    }
    scene.add(group); live.set(i, { group, words, a });
  }
  function drop(i) { const e = live.get(i); if (!e) return; e.words.forEach(m => m.material.dispose()); scene.remove(e.group); live.delete(i); }
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
    camera, env, P, live,
    get focus() { return camera.position.distanceTo(focusAt); },
    set onAct(fn) { onAct = fn; },
    load(s, timing) {
      clear(); actIdx = -1;
      song = { ...s, acts: timing.sections.map(x => ({ ...(LOOKS[x.name] || LOOKS['Verse 1']), name: x.name, desc: x.desc, t: x.name === 'Intro' ? 0 : x.t - 0.8 })) };
      lines = timing.lines.slice();
      route.pose(-0.5, pose); camBase.copy(pose.pos); look.copy(pose.look);
    },
    lines: () => lines,
    setPointer(x, y) { pointer.set(x, y); },
    reset() { clear(); },
    update(dt, now, t, analyser, buf) {
      if (!song) return;
      const jumped = Math.abs(t - lastT) > 1.5;
      if (t < lastT - 0.4) clear();
      lastT = t;
      analyse(analyser, buf);
      blendActs(t);
      ray.setFromCamera(pointer, camera);
      const pool = []; for (const e of live.values()) for (const m of e.words) if (m.visible) pool.push(m);
      hovered = ray.intersectObjects(pool, false)[0]?.object || null;

      let active = -1;
      for (let i = 0; i < lines.length; i++) if (lines[i].t != null && lines[i].t <= t) active = i;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].t == null) { if (live.has(i)) drop(i); continue; }
        const cut = actAt(lines[i].t).cut;
        const nxt = lines[i + 1];
        const want = t >= lines[i].t - 0.3 && t < (nxt ? nxt.t + (cut ? 0.5 : 1.2) : lineEnd(i) + 4);
        if (want && !live.has(i)) build(i); else if (!want && live.has(i)) drop(i);
      }

      for (const [i, { words, a }] of live) {
        const end = lineEnd(i), isActive = i === active, cut = actAt(lines[i].t).cut;
        const nx = lines[i + 1];                                               // a line steps aside when the next one starts
        const leave = nx ? clamp((t - nx.t + 0.15) / (cut ? 0.35 : 0.9)) : clamp((t - end) / 3);
        let newest = null;
        for (const m of words) if (m.userData.reveal <= t) newest = m;
        if (isActive && newest) { newest.getWorldPosition(spotAt); spotOn = 1; }
        for (const m of words) {
          const u = m.userData;
          u.hl += (((isActive && m === newest) ? 1 : 0) - u.hl) * Math.min(1, dt * 10);
          u.hov += ((m === hovered ? 1 : 0) - u.hov) * Math.min(1, dt * 8);
          const k = clamp((t - u.reveal) / (u.cut ? 0.3 : 0.55));
          if (k <= 0) { m.visible = false; continue; }
          m.visible = true;
          const e = easeOutExpo(k);
          // a word arrives: settles from a touch above and behind, no spin, no flash
          m.position.copy(u.home);
          m.position.y += (1 - e) * 0.35 + Math.sin(now * 0.8 + u.seed.x * 9) * 0.012;
          m.position.z += (1 - e) * -0.6 + u.hl * 0.12 + u.hov * 0.4 - leave * 0.8;
          m.rotation.set(0, 0, 0);
          m.scale.setScalar(Math.max(0.001, u.ws * (0.82 + 0.18 * e) * (1 + u.hl * 0.06 + u.hov * 0.2)));
          m.material.opacity = e * (1 - leave);
          if (!u.acc) { m.material.color.copy(PAPER).multiplyScalar(isActive ? 0.72 + 0.28 * Math.max(u.hl, u.hov) : 0.82).lerp(INK, P.dawn * 0.9); m.material.emissive.copy(m.material.color); }
          m.material.emissiveIntensity = (u.acc ? 1 : 1 - P.dawn * 0.95) * u.base;
          if (u.fx) applyFx(u.fx, m, u, t - u.reveal, { now, bass: env.bass });
        }
      }

      // camera: the storyboard pose, eased; it looks toward the line being sung
      route.pose(t, pose);
      const snap = jumped;
      // where to look: the line being sung — and, ahead of time, where the next line is about to appear,
      // so the camera is already framed when the words arrive instead of correcting afterwards
      const act = active >= 0 ? live.get(active) : null;
      if (act) { act.group.getWorldPosition(focusAt); } else focusAt.copy(pose.look);
      let w = act ? 0.88 * (1 - clamp((t - lineEnd(active)) / 1.5)) : 0;
      const nxI = active + 1;
      if (lines[nxI] && lines[nxI].t != null) {
        const lead = clamp((t - (lines[nxI].t - 2.2)) / 1.8);
        if (lead > 0) { const ln = live.get(nxI); if (ln) ln.group.getWorldPosition(nextAt); else nextAt.copy(route.anchorFor(nxI).pos);
          focusAt.lerp(nextAt, lead * lead * (3 - 2 * lead)); w = Math.max(w, 0.88 * lead); }
      }
      tmp.copy(pose.look).lerp(focusAt, w);
      const kp = 1.6, kl = 1.3;                                                // slow, cinematic easing: no quick turns
      if (snap) { camBase.copy(pose.pos); look.copy(tmp); }
      camBase.lerp(pose.pos, 1 - Math.exp(-dt * kp));
      look.lerp(tmp, 1 - Math.exp(-dt * kl));
      ptrS.lerp(pointer, 1 - Math.exp(-dt * 3));
      camera.position.copy(camBase); camera.position.y += route.dive(t);
      camera.position.x += Math.sin(now * 0.37) * 0.015;                 // the faintest breathing, nothing more
      camera.position.y += Math.sin(now * 0.29 + 1) * 0.01;
      camera.lookAt(look);                                                  // level horizon, always
      spot.position.lerp(tmp.copy(spotAt).add(new THREE.Vector3(0, 0.5, 0)).addScaledVector(tmp.subVectors(camera.position, spotAt).normalize(), 1.1), 1 - Math.exp(-dt * 14));
      spot.intensity += ((spotOn ? 7 : 0) - spot.intensity) * (1 - Math.exp(-dt * 8)); spotOn = 0;
      key.position.copy(camera.position).add(new THREE.Vector3(-3, 5, 2)); key.target.position.copy(look);
      key.color.setRGB(0.87, 0.9, 1);
      key.intensity = 1.3 + env.bass * 0.8 + P.warm * 0.5;
    },
  };
}
