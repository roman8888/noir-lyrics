// The lyrics inside the city: each line is built as 3D type at the place the storyboard gives it, each word
// appears on its own timestamp, the sung word is lit by a follow-spot, words act out their meaning (fx.js).
import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { clamp, easeOutExpo } from './util.js?v=20261017100122';
import { fxFor, applyFx } from './fx.js?v=20261017100122';
import { FACADE } from './layout.js?v=20261017100122';
import { LOOKS, MOODS } from './songs.js?v=20261017100122';

// every word appears 0.2 s before its timestamp: Roman's ear test (the aligner marks vowel onsets a touch late); ?lead= overrides
const LEAD_PARAM = parseFloat(new URLSearchParams(location.search).get('lead'));
export const LEAD = Number.isFinite(LEAD_PARAM) ? Math.max(-1, Math.min(1, LEAD_PARAM)) : 0.2;
const FLAT = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));   // text laid flat on the ground
const SIZE = 0.56, DEPTH = 0.07, SPACE = SIZE * 0.42, LINE_H = SIZE * 1.6, MAXW = 7.4;
const PAPER = new THREE.Color(0xf1eee8), INK = new THREE.Color(0x060607), COLD = new THREE.Color(0.62, 0.74, 0.9);
const SMALL = new Set(['the','a','an','to','and','of','in','on','for','by','with','as','at','or','so','but','i','i\'m','i\'ll','you','your','you\'re','me','my','he','his','they','them','their','it','is','was','be','that','what','when','then','than','though','if','all','do','don\'t','who','there','were','will','would','we']);
const KEYS = ['rain', 'warm', 'red', 'beam', 'dawn', 'cut', 'fog'];

export function createSong(fonts, scene, route, occluders = []) {
  const occ = new THREE.Raycaster();
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 1200);
  camera.layers.enable(1);                                   // the lyrics live on layer 1: the wet street's mirror never reflects them
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
    const mood = ((MOODS[song.slug] || []).find(([re]) => re.test(L.text)) || [null, {}])[1];   // how this line is set: its emotional typography
    const raw = L.words || L.text.split(/\s+/).map(w => ({ w }));
    const accentSet = new Set(song.accents || []); let accents = 0;
    const toks = raw.map(x => { const clean = x.w.replace(/[*]/g, '');
      const acc = /^\*.+\*$/.test(x.w) || (accents < 2 && accentSet.has(clean.replace(/[^a-z']/gi, '').toLowerCase()) && ++accents);
      return { ...x, w: clean, acc: !!acc || !!L.title || mood.tone === 'blood' }; });
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
      tk.geo = wordGeo(tk.w, (tk.acc || !!mood.italic) && !L.title); tk.wd = tk.geo.width * tk.ws;
      if (rw > 0 && (rw + SPACE + tk.wd > maxW || (tk === toks.at(-1) && /coming for me/i.test(L.text)))) { rows.push([]); rw = 0; }   // "I'm coming for me": the me stands alone on its own row
      rows.at(-1).push(tk); rw += (rw ? SPACE : 0) + tk.wd;
    }
    const rowH = rows.map(row => LINE_H * Math.max(...row.map(tk => tk.ws))), totH = rowH.reduce((s, b) => s + b, 0);
    const group = new THREE.Group(); group.position.copy(a.pos); group.quaternion.copy(a.q); group.scale.setScalar(a.scale * (mood.size || 1));
    if ((a.kind === 'banner' || a.kind === 'ahead') && Math.abs(a.pos.x) < FACADE - 1) {
      // on the avenue the whole line stays inside the kerb line: nothing hugs a facade, its awnings or its shop signs
      const hw = Math.max(...rows.map(row => row.reduce((s2, tk) => s2 + tk.wd, 0) + SPACE * (row.length - 1))) * a.scale / 2;
      const rx = Math.abs(new THREE.Vector3(1, 0, 0).applyQuaternion(a.q).x), lim = FACADE - 1.8, span = hw * rx;
      if (span > lim) { const k = lim / span; group.scale.multiplyScalar(k); a.scale *= k; }
      const ext = Math.min(span, lim);
      if (a.pos.x + ext > lim) a.pos.x = lim - ext; else if (a.pos.x - ext < -lim) a.pos.x = -lim + ext;
      group.position.copy(a.pos);
    }
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
        const hit = occ.intersectObjects(occluders, true).find(h => { for (let o = h.object; o; o = o.parent) if (!o.visible) return false; return true; });   // hidden set pieces (the hands between scenes) never occlude
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
        mesh.userData = { w: tk.w, home, seed, reveal: (tk.t ?? (L.t + wi * step)) - LEAD, acc: tk.acc, blood, base: mat.emissiveIntensity, cut: act.cut, ws: tk.ws, fx: L.title ? null : (/^and so am i/i.test(L.text) && /^i\.?$/i.test(tk.w) ? 'huge' : /the man you left standing/i.test(L.text) && /^man\.?$/i.test(tk.w) ? 'tall' : /coming for me/i.test(L.text) && /^me\.?$/i.test(tk.w) ? 'grow' : /not my soul/i.test(L.text) && /^soul[,.]?$/i.test(tk.w) ? 'soul' : fxFor(tk.w)), growTo: rows.length > 1 && ri > 0 ? Math.max(2, (rows[0].reduce((s2, q) => s2 + q.wd, 0) + SPACE * (rows[0].length - 1)) / tk.wd) : 1, tone: mood.tone, arrive: mood.arrive, motion: mood.motion, hl: 0, hov: 0 };
        if (mesh.userData.fx === 'tight' || mesh.userData.fx === 'home' || a.fall) {   // built letter by letter: these words move as letters
          const chars = [...tk.w], geos = chars.map(ch => wordGeo(ch, tk.acc)), gap = SIZE * 0.1;
          const natW = geos.reduce((s2, g) => s2 + g.width, 0) + gap * (chars.length - 1), sqW = geos.reduce((s2, g) => s2 + g.width * 0.86, 0);
          let nx = -natW / 2, sx = -sqW / 2;
          chars.forEach((ch, k) => {
            const lm = new THREE.Mesh(geos[k].g, mat.clone()); lm.castShadow = true;
            const lh = home.clone(); lh.x += (nx + geos[k].width / 2) * tk.ws;
            lm.userData = { ...mesh.userData, home: lh, sqX: home.x + (sx + geos[k].width * 0.86 / 2) * tk.ws, letter: k, seed: seed.clone(), hl: 0, hov: 0 };
            if (a.fall) lm.userData.scatter = { dx: (Math.random() - 0.5) * 1.6, dz: (Math.random() - 0.5) * 1.8, yaw: (Math.random() - 0.5) * 1.6, delay: Math.random() * 0.45, spin: (Math.random() - 0.5) * 2 };   // where it lands, how it tumbles
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
      const maxH = 2 * d * tanH * 0.55;
      let maxW = 2 * d * tanH * camera.aspect * 0.62 * (camera.view?.enabled ? camera.view.width / camera.view.fullWidth : 1);   // only the part of the frame the lyrics panel leaves
      const al = a.beat?.alley; if (al && Math.abs(group.position.x) > 8) maxW = Math.min(maxW, al.w - 0.5);   // inside an alley: narrower than the alley
      const fit = Math.min(1, maxW / lineW, maxH / lineH);
      if (fit < 1) group.scale.multiplyScalar(fit);
    }
    for (const m of words) m.layers.set(1);
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
    // world position + visibility of a word of a live line (for set pieces that attach to a word, like the fire on "hell")
    wordAt(i, re, out) { const e = live.get(i); if (!e) return null; const m = e.words.find(m => re.test(m.userData.w || '')); if (!m || !m.visible) return null; m.getWorldPosition(out); out.alpha = m.material.opacity; out.width = (m.geometry.boundingBox ? (m.geometry.boundingBox.max.x - m.geometry.boundingBox.min.x) : 1) * m.scale.x * e.group.scale.x; return out; },
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
        const want = t >= lines[i].t - 0.3 && t < (nxt ? nxt.t + (cut ? 0.5 : 1.2) + (/hell|losing all the only way|not my soul/i.test(lines[i].text) ? 4.5 : 0) : lineEnd(i) + 4);
        if (want && !live.has(i)) build(i); else if (!want && live.has(i)) drop(i);
      }

      for (const [i, { group, words, a }] of live) {
        const end = lineEnd(i), isActive = i === active, cut = actAt(lines[i].t).cut;
        const nx = lines[i + 1];                                               // a line steps aside when the next one starts
        const hold = words.some(m => m.userData.fx === 'hell') ? 2.4 : words.some(m => m.userData.fx === 'soul') ? 2.0 : a.fall ? 3.2 : 0;   // (the soul is sung as the next line starts: it stays)    // a burning word, or letters lying on the road, stay a while after the next line starts
        let leave = nx ? clamp((t - nx.t + 0.15 - hold) / (cut && !hold ? 0.35 : a.kind === 'floor' ? 0.5 : 0.9)) : clamp((t - end) / 3);
        // a street line also steps aside as the walk reaches it: never a wall of giant letters at the lens
        if ((a.kind === 'banner' || a.kind === 'ahead' || a.kind === 'sky') && !a.fall) { const dx = camera.position.x - group.position.x, dz = camera.position.z - group.position.z; const near = (a.beat?.dist ?? 9) > 12 ? 9 : 7.5; leave = Math.max(leave, clamp((near - Math.hypot(dx, dz)) / (near * 0.5))); }
        let newest = null;
        for (const m of words) if (m.userData.reveal <= t) newest = m;
        if (isActive && newest) { newest.getWorldPosition(spotAt); spotOn = 1; }
        for (const m of words) {
          const u = m.userData;
          u.hl += (((isActive && m === newest) ? 1 : 0) - u.hl) * Math.min(1, dt * 10);
          u.hov += ((m === hovered ? 1 : 0) - u.hov) * Math.min(1, dt * 8);
          const arriveT = u.arrive === 'slam' ? 0.22 : u.arrive === 'slow' ? 1.4 : (u.cut ? 0.3 : 0.55);
          const k = clamp((t - u.reveal) / arriveT);
          if (k <= 0) { m.visible = false; continue; }
          m.visible = true;
          const e = easeOutExpo(k), life = clamp((t - u.reveal) / Math.max(1, (lineEnd(i) - lines[i].t)));
          // a word arrives: settles from a touch above and behind (slow: rises from below; slam: lands from large), no spin, no flash
          m.position.copy(u.home);
          const still = u.motion === 'still';
          m.position.y += (u.arrive === 'slow' ? -(1 - e) * 0.3 : (1 - e) * 0.35) + (still ? 0 : Math.sin(now * 0.8 + u.seed.x * 9) * 0.012);
          m.position.z += (1 - e) * (u.arrive === 'slam' ? -1.2 : -0.6) + u.hl * 0.12 + u.hov * 0.4 - leave * 0.8;
          if (u.motion === 'tremble') { m.position.x += Math.sin(now * 24 + u.seed.x * 7) * 0.011; m.position.y += Math.cos(now * 31 + u.seed.y * 5) * 0.009; }
          else if (u.motion === 'drift') { m.position.x += Math.sin(now * 0.45 + u.seed.x * 6) * 0.09; m.position.y += Math.sin(now * 0.3 + u.seed.y * 6) * 0.05; }
          else if (u.motion === 'sink') m.position.y -= life * 0.35;
          else if (u.motion === 'rise') m.position.y += life * 0.4;
          m.rotation.set(0, 0, 0);
          if (u.scatter && route.fallAt) {                                    // after the line: the letter drops to the road, tumbles, lands flat on its own spot
            const q = clamp((route.fallAt(t) * 1.45 - u.scatter.delay) / 1.0), g = q * q;               // gravity: slow, then fast (each letter lets go in its own moment)
            const floorY = (0.06 - group.position.y) / group.scale.y;                                   // the road, in the line's own frame
            const yEnd = floorY + 0.02, bounce = q > 0.82 ? Math.sin((q - 0.82) / 0.18 * Math.PI) * 0.12 * (1 - q) : 0;
            m.position.y = u.home.y + (yEnd - u.home.y) * g + bounce;
            m.position.x += u.scatter.dx * q; m.position.z += u.scatter.dz * q;
            m.rotation.x = -Math.PI / 2 * clamp(q * 1.25); m.rotation.z = u.scatter.yaw * q; m.rotation.y = u.scatter.spin * Math.sin(q * Math.PI) * 0.6;
            m.material.opacity = Math.max(m.material.opacity, (1 - leave) * e);
          }
          m.scale.setScalar(Math.max(0.001, u.ws * (u.arrive === 'slam' ? 1.3 - 0.3 * e : 0.82 + 0.18 * e) * (1 + u.hl * 0.06 + u.hov * 0.2)));
          if (u.dup) m.scale.multiplyScalar(Math.max(0.001, 1 - leave * 1.6));   // the knocked-in copies are the first to go: never a wall of them at the lens while the next line speaks
          m.material.opacity = e * (1 - leave);
          if (!u.acc) { m.material.color.copy(PAPER).multiplyScalar(isActive ? 0.72 + 0.28 * Math.max(u.hl, u.hov) : 0.82).lerp(INK, P.dawn * 0.9);
            if (u.tone === 'ash') m.material.color.multiplyScalar(0.42); else if (u.tone === 'cold') m.material.color.multiply(COLD);   // ash: half-swallowed by the dark; cold: under water, in the storm
            m.material.emissive.copy(m.material.color); }
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
      // a line the walk has reached or passed no longer holds the gaze: never a turn-around to look back at it
      if (act) { const fw = tmp.copy(pose.look).sub(pose.pos); fw.y = 0; fw.normalize(); const ahead = (focusAt.x - pose.pos.x) * fw.x + (focusAt.z - pose.pos.z) * fw.z; w *= clamp((ahead - 3) / 5); }
      const nxI = active + 1;
      if (lines[nxI] && lines[nxI].t != null) {
        const lead = clamp((t - (lines[nxI].t - 2.2)) / 1.8);
        if (lead > 0) { const ln = live.get(nxI); if (ln) ln.group.getWorldPosition(nextAt); else nextAt.copy(route.anchorFor(nxI).pos);
          focusAt.lerp(nextAt, lead * lead * (3 - 2 * lead)); w = Math.max(w, 0.88 * lead); }
      }
      if (route.prayAt) w *= 1 - route.prayAt(t);
      if (route.floorAt) w *= 1 - route.floorAt(t);                           // eyes down to the road for the scattered line
      if (route.buryAt) w *= 1 - 0.8 * route.buryAt(t);                       // and to the grave as it fills                             // eyes up for "pray": the storyboard look leads
      tmp.copy(pose.look).lerp(focusAt, w);
      const dash = route.dashAt ? route.dashAt(t) : 0;
      const kp = 1.6 + 7 * dash, kl = 1.3 + 2 * dash;                           // slow, cinematic easing: no quick turns — except the run from the car
      if (snap) { camBase.copy(pose.pos); look.copy(tmp); }
      camBase.lerp(pose.pos, 1 - Math.exp(-dt * kp));
      look.lerp(tmp, 1 - Math.exp(-dt * kl));
      ptrS.lerp(pointer, 1 - Math.exp(-dt * 3));
      camera.position.copy(camBase); camera.position.y += route.dive(t);
      camera.position.x += Math.sin(now * 0.37) * 0.015;                 // the faintest breathing, nothing more
      camera.position.y += Math.sin(now * 0.29 + 1) * 0.01;
      camera.lookAt(look);                                                  // level horizon, then the gait's small roll, nod and wander
      { const g = route.gait(t); camera.rotateZ(g.roll); camera.rotateX(g.pitch); camera.rotateY(g.yaw); }
      spot.position.lerp(tmp.copy(spotAt).add(new THREE.Vector3(0, 0.5, 0)).addScaledVector(tmp.subVectors(camera.position, spotAt).normalize(), 1.1), 1 - Math.exp(-dt * 14));
      spot.intensity += ((spotOn ? 7 : 0) - spot.intensity) * (1 - Math.exp(-dt * 8)); spotOn = 0;
      key.position.copy(camera.position).add(new THREE.Vector3(-3, 5, 2)); key.target.position.copy(look);
      key.color.setRGB(0.87, 0.9, 1);
      key.intensity = 1.3 + env.bass * 0.8 + P.warm * 0.5;
    },
  };
}
