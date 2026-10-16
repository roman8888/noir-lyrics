// "On My Way to You" — this song's own set pieces. Everything is keyed to a line or a word by its text, so the
// storyboard follows the words wherever the timing puts them. Rules as ever: dark city, red = blood, no yellow.
import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FACADE, ROW2, CHURCH, lampZs } from './layout.js?v=20261016235123';
import { rng, clamp } from './util.js?v=20261016235123';

const ease = x => 1 - Math.pow(1 - clamp(x), 3);
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };

export function createProps2(scene, city, timing, fonts, route, props) {
  const r = rng(77), solid = [];
  const lines = timing.lines;
  const lineAt = re => lines.find(l => re.test(l.text));
  const T = re => lineAt(re)?.t ?? -1;
  const wordT = (re, wre) => { const L = lineAt(re); return L?.words?.find(w => wre.test(w.w || ''))?.t ?? L?.t ?? -1; };
  const idx = re => lines.findIndex(l => re.test(l.text));
  const blood = () => new THREE.MeshStandardMaterial({ color: 0x7a0e14, roughness: 0.3, metalness: 0.55, emissive: 0x4a060a, emissiveIntensity: 0.9 });
  const paper = () => new THREE.MeshStandardMaterial({ color: 0xd9d4ca, roughness: 0.6, emissive: 0x55504a, emissiveIntensity: 0.5, transparent: true });
  const charcoal = new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.8, emissive: 0x3a0a0e, emissiveIntensity: 0.9, transparent: true });   // LIES: dark iron with a red heat in it, readable against the night
  const glyph = (ch, size, mat, height = size * 0.15) => {
    const g = new TextGeometry(ch, { font: fonts.roman, size, height, curveSegments: 8, bevelEnabled: false });
    g.computeBoundingBox(); const b = g.boundingBox; g.translate(-(b.max.x + b.min.x) / 2, -(b.max.y + b.min.y) / 2, -height / 2);
    return new THREE.Mesh(g, mat);
  };
  const figure = (s, mat) => {                                              // a plain dark figure, no face
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22 * s, 0.9 * s, 4, 10), mat); body.position.y = 1.0 * s; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14 * s, 12, 10), mat); head.position.y = 1.72 * s; g.add(head);
    return g;
  };
  const camF = new THREE.Vector3(), tmp = new THREE.Vector3();
  const fwd = camera => { camera.getWorldDirection(camF); camF.y = 0; camF.normalize(); return camF; };

  // ---- the lone figure under one lamp: "standing all alone" (intro), "the man you left standing alone" (chorus),
  //      and the bridge, where he turns and walks into you: "I'm coming for him. I'm coming for me."
  const T_ALONE = T(/standing all alone/i), T_MAN = T(/standing alone\.?$/i), T_BRIDGE = T(/remember the silence/i), T_FORME = T(/coming for me/i), T_FORHIM = T(/coming for him/i);
  const manMat = new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 0.95 });
  const man = figure(1.0, manMat); man.visible = false; scene.add(man); solid.push(man);
  const manLight = new THREE.PointLight(0xdfe6ff, 0, 9, 1.8); manLight.position.y = 4.5; man.add(manLight);
  let manPlaced = null, manGone = false;

  // ---- "against the venom of people" / "Throw your poison": black drips run down the facades beside you
  const T_VENOM = wordT(/venom of people/i, /^venom/i), T_POISON = wordT(/throw your poison/i, /^poison/i);
  const dripMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.06, 0.005, 0.01) });
  const drips = [];
  for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.09 + r() * 0.08, 1.2 + r() * 1.6), dripMat); m.visible = false; m.userData = { side: i % 2 ? 1 : -1, z: (r() - 0.5) * 28, ph: r(), sp: 0.7 + r() * 0.6 }; scene.add(m); drips.push(m); }
  let dripZ = null;

  // ---- "That I bury you in words": words rain from the dark and pile on the road
  const T_BURY = wordT(/bury you in words/i, /^bury/i);
  const LETTERS = 'eeeeaaaarrrttoonnsslliiuuddhhyycmwbgpfkv';
  const rainGlyphs = [];
  const glyphGeo = {}; for (const ch of new Set(LETTERS)) { const g = new TextGeometry(ch, { font: fonts.roman, size: 0.34, height: 0.05, curveSegments: 6, bevelEnabled: false }); g.computeBoundingBox(); const b = g.boundingBox; g.translate(-(b.max.x + b.min.x) / 2, -(b.max.y + b.min.y) / 2, 0); glyphGeo[ch] = g; }
  for (let i = 0; i < 150; i++) { const m = new THREE.Mesh(glyphGeo[LETTERS[i % LETTERS.length]], paper()); m.visible = false;
    m.userData = { x: (r() - 0.5) * 7, dz: -6 - r() * 16, delay: r() * 2.6, spin: (r() - 0.5) * 3, yaw: (r() - 0.5) * 3, y0: 9 + r() * 6 }; scene.add(m); rainGlyphs.push(m); }
  let buryZ = null;

  // ---- "just how rotten you really are" / "Even the darkness struggles to swallow what's inside": the avenue goes dark around you
  const T_ROTTEN = wordT(/how rotten/i, /^rotten/i), T_DARK = T(/darkness struggles/i), T_WAIT = T(/^just wait/i);

  // ---- "Karma is coming": the word rises out of the road ahead and bars the street, swivelling like the R
  const T_KARMA = wordT(/karma is coming/i, /^karma/i), T_SOAMI = T(/and so am i/i);
  const karma = new THREE.Group(); karma.visible = false; karma.scale.setScalar(0.62); scene.add(karma);   // sized for the 8 m lane
  const kLetters = [...'KARMA'].map((ch, k) => { const m = glyph(ch, 2.1, blood(), 0.5); m.position.x = (k - 2) * 2.3; karma.add(m); return m; });
  const kLight = new THREE.PointLight(0xff2a2a, 0, 26, 1.5); kLight.position.set(0, 3, 3); karma.add(kLight);
  let karmaZ = null;

  // ---- "I won't need fire": a small fire rides the word (as "hell" does in the other song)
  const I_FIRE = idx(/won't need fire/i);
  const NF = 90, fPos = new Float32Array(NF * 3), fCol = new Float32Array(NF * 3), fLife = new Float32Array(NF).map(() => r()), fSeed = new Float32Array(NF * 2).map(() => r());
  const puff = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const flameGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(fPos, 3)).setAttribute('color', new THREE.BufferAttribute(fCol, 3));
  const flames = new THREE.Points(flameGeo, new THREE.PointsMaterial({ map: puff, size: 0.4, transparent: true, depthWrite: false, opacity: 0.75, vertexColors: true, blending: THREE.AdditiveBlending })); flames.visible = false; scene.add(flames);
  const fireLight = new THREE.PointLight(0xff4a14, 0, 8, 1.8); scene.add(fireLight);
  const fireAt = new THREE.Vector3(); let fireLife = 0, fireW = 1;

  // ---- "I'll tear through your lies": LIES stands across the street ahead; the words tear it apart
  const T_TEAR = wordT(/tear through your lies/i, /^tear/i), T_LIES_SHOW = T(/won't need fists/i);
  const lies = new THREE.Group(); lies.visible = false; lies.scale.setScalar(0.5); scene.add(lies);
  const lLetters = [...'LIES'].map((ch, k) => { const m = glyph(ch, 3.2, charcoal, 0.7); m.position.set((k - 1.5) * 3.4, 1.9, 0); m.userData = { x: m.position.x, vx: (k - 1.5) * 2.2 + (r() - 0.5), vy: 4 + r() * 3, vz: -(2 + r() * 3), rx: (r() - 0.5) * 4, rz: (r() - 0.5) * 4 }; lies.add(m); solid.push(m); return m; });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xa8161c, transparent: true });
  lLetters.forEach(m => { const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 30), edgeMat); m.add(e); });
  let liesZ = null;

  // ---- "I'm not frozen anymore": the rain hangs frozen on "frozen" and falls again on "anymore"
  const T_FROZEN = wordT(/not frozen anymore/i, /^frozen/i), T_FROZEN_END = wordT(/not frozen anymore/i, /^anymore/i);

  // ---- "Straight as an arrow, locked on the truth": a line of embers races down the middle of the road to the vanishing point
  const T_ARROW = wordT(/straight as an arrow/i, /^arrow/i);
  const arrow = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.22, 1.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 0.12, 0.08), transparent: true, opacity: 0.9 }), 60); arrow.visible = false; scene.add(arrow);
  const M = new THREE.Matrix4(); let arrowZ = null;

  // ---- the last line: "stop letting them speak for you" — the city's lamps go out one by one down the avenue;
  //      only yours stays, and the red R far ahead
  const T_LAST = T(/stop letting them speak for you/i);
  let outLamps = null; const R = () => scene.getObjectByName('towerR');

  // ---- the back lane's light: bulbs on wires every 22 m; six real lights ride along with the camera to the nearest bulbs
  const LANE = -23, bulbs = [], bulbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.0, 1.3) }), wireMat = new THREE.LineBasicMaterial({ color: 0x0a0a0c });
  for (let z = -200; z > -980; z -= 22) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), bulbMat.clone()); b.position.set(LANE + (r() - 0.5) * 1.2, 5.0 + (r() - 0.5) * 0.4, z); scene.add(b);
    const w = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-19, 5.6, z), new THREE.Vector3(b.position.x, b.position.y + 0.1, z), new THREE.Vector3(-27, 5.7, z)]), wireMat); scene.add(w);
    bulbs.push({ mesh: b, on: 1 });
  }
  const laneLights = []; for (let i = 0; i < 6; i++) { const L = new THREE.PointLight(0xffc27a, 0, 16, 1.8); scene.add(L); laneLights.push(L); }
  const lightTheLane = cp => {
    const near = bulbs.map(b => ({ b, d: Math.abs(b.mesh.position.z - cp.z) })).sort((a, b) => a.d - b.d).slice(0, 6);
    near.forEach(({ b }, i) => { const L = laneLights[i]; L.position.copy(b.mesh.position).add(new THREE.Vector3(0, -0.3, 0)); L.intensity = 7 * b.on; });
    bulbs.forEach(b => { b.mesh.material.color.setRGB(2.6 * b.on, 2.0 * b.on, 1.3 * b.on); });
  };
  // ---- the lamps: one for the lone man, the rest dimmed; all dark for the bridge
  const nLamps = lampZs().length * 2; let lampMode = '';
  const setLamps = (mode, keep = -1) => { if (mode === lampMode) return; lampMode = mode;
    for (let i = 0; i < nLamps; i++) city.dimLamp(i, mode === 'all' ? 1 : mode === 'one' ? (i === keep ? 1 : 0.12) : 0.04); };

  return {
    solid,
    update(dt, t, time, camera, song) {
      const f = fwd(camera), cp = camera.position;
      lightTheLane(cp);
      // -- the lone figure
      const alone = (T_ALONE > 0 && t > T_ALONE - 2 && t < T_ALONE + 7) || (T_MAN > 0 && t > T_MAN - 3 && t < T_MAN + 6) || (T_BRIDGE > 0 && t > T_BRIDGE - 1 && t < T_FORME + 6);
      if (alone && !manGone) {
        const key = t < T_MAN - 3 ? 'a' : t < T_BRIDGE - 1 ? 'b' : 'c';
        if (manPlaced !== key) { manPlaced = key; man.position.copy(cp).addScaledVector(f, key === 'c' ? 14 : 26); man.position.x = cp.x + (key === 'b' ? -2.2 : 2.2); man.position.y = 0;                         // a step to the side of your own line
          man.rotation.y = Math.atan2(cp.x - man.position.x, cp.z - man.position.z); }
        man.visible = true; manLight.intensity = 16 + Math.sin(time * 9) * 2 + Math.random() * 1.5;   // a lamp that stutters over him
        const li = city.lampAt(man.position.z, Math.sign(man.position.x) || 1); setLamps(key === 'c' ? 'none' : 'one', li);
        if (key === 'c' && T_FORME > 0 && t > T_FORME - 0.2) {                                            // he comes to you, and is gone when he reaches you
          const d = man.position.distanceTo(cp); man.position.addScaledVector(tmp.subVectors(cp, man.position).normalize(), Math.min(d, 2.4 * dt));
          man.position.y = Math.abs(Math.sin(time * 5.2)) * 0.04; manMat.opacity = 1; if (d < 1.4) { manGone = true; man.visible = false; manLight.intensity = 0; } }
      } else { man.visible = false; manLight.intensity = 0; if (lampMode && !(T_DARK > 0 && t > T_DARK && t < T_WAIT + 1)) setLamps('all'); }
      // -- the drips
      const dv = [T_VENOM, T_POISON].find(T0 => T0 > 0 && t > T0 - 0.3 && t < T0 + 4.5);
      if (dv) { if (dripZ !== dv) { dripZ = dv; drips.forEach(m => { m.userData.z0 = cp.z - 4 + m.userData.z; }); }
        drips.forEach(m => { const u = m.userData, k = ((t - dv + u.ph * 3) * u.sp * 0.45) % 1; m.visible = true;
          const lane = cp.x < -12, wx = lane ? (u.side < 0 ? -19.02 : -26.98) : u.side * (FACADE - 0.02), face = lane ? (u.side < 0 ? -1 : 1) : -u.side;   // the lane's two walls, or the avenue's facades
          m.position.set(wx, 8.5 - k * 9, u.z0); m.rotation.y = face * Math.PI / 2; m.scale.y = 0.6 + k * 0.8; }); }
      else drips.forEach(m => (m.visible = false));
      // -- the word rain
      if (T_BURY > 0 && t > T_BURY - 0.2 && t < T_BURY + 11) {
        if (buryZ == null) buryZ = cp.z;
        const k = t - T_BURY, fade = clamp((k - 8.5) / 2.2);
        rainGlyphs.forEach(m => { const u = m.userData, q = clamp((k - u.delay) / 1.35), g = q * q;
          m.visible = q > 0; m.position.set(u.x, u.y0 - (u.y0 - 0.05) * g, buryZ + u.dz);
          m.rotation.set(-Math.PI / 2 * clamp(q * 1.2), u.yaw * q, u.spin * Math.sin(q * Math.PI) * 0.5); m.material.opacity = 1 - fade; });
      } else rainGlyphs.forEach(m => (m.visible = false));
      // -- the dark: rotten (a breath of it), then the darkness that struggles to swallow (the whole avenue) until "Just wait"
      if (T_ROTTEN > 0 && t > T_ROTTEN - 0.3 && t < T_ROTTEN + 3.6) city.setDark(0.9 * smooth((t - T_ROTTEN + 0.3) / 0.8) * (1 - smooth((t - T_ROTTEN - 2.4) / 1.2)), cp.z - 20);
      else if (T_DARK > 0 && t > T_DARK - 0.4 && t < T_WAIT + 1.2) { const w = smooth((t - T_DARK + 0.4) / 3.5), back = smooth((t - T_WAIT + 0.2) / 1.2); city.setDark((1 - back) * Math.min(1, w * 1.2), cp.z - 10 - w * 220); setLamps(back > 0.5 ? 'all' : 'none');
        if (!(T_LAST > 0 && t > T_LAST)) bulbs.forEach(b => { b.on = 1 - 0.85 * Math.min(1, w * 1.2) * (1 - back); }); }
      else if (!(T_LAST > 0 && t > T_LAST + 1)) bulbs.forEach(b => { b.on = 1; });
      // -- KARMA across the street
      if (T_KARMA > 0 && t > T_KARMA - 0.1 && t < T_SOAMI + 2.5) {
        if (karmaZ == null) { karmaZ = cp.z - 34; karma.position.set(0, -2.6, karmaZ); karma.rotation.y = Math.atan2(cp.x - 0, cp.z - karmaZ); }
        const k = ease((t - T_KARMA) / 1.6), out = smooth((t - T_SOAMI - 0.4) / 1.8);
        karma.visible = out < 1; karma.position.y = -2.6 + 6.2 * k - 9 * out;                   // up out of the road, back into it when "I" come
        kLetters.forEach((m, i) => { m.rotation.y = Math.sin(time * 0.6 + i * 0.5) * 0.35; });
        kLight.intensity = 60 * k * (1 - out);
      } else karma.visible = false;
      // -- fire on "fire"
      const fw = (I_FIRE >= 0 && props.wordAt) ? props.wordAt(I_FIRE, /^fire/i, fireAt) : null;
      fireLife += (((fw && fw.alpha > 0.05) ? 1 : 0) - fireLife) * Math.min(1, dt * (fw ? 3.5 : 6));
      flames.visible = fireLife > 0.01; fireLight.intensity = (5 + Math.random() * 2) * fireLife;
      if (flames.visible) { if (fw) { flames.position.set(fw.x, fw.y - 0.2, fw.z + 0.05); fireLight.position.copy(flames.position).add(new THREE.Vector3(0, 0.4, 0.3)); fireW = Math.max(0.5, fw.width || 1); }
        for (let i = 0; i < NF; i++) { fLife[i] += dt * (1.6 + fSeed[i * 2] * 1.2); if (fLife[i] > 1) fLife[i] -= 1; const q = fLife[i];
          fPos[i * 3] = (fSeed[i * 2 + 1] - 0.5) * fireW * (1 - q * 0.35); fPos[i * 3 + 1] = q * q * (0.45 + fSeed[i * 2] * 0.5) * fireLife; fPos[i * 3 + 2] = (fSeed[i * 2] - 0.5) * 0.12;
          const heat = (1 - q) * fireLife; fCol[i * 3] = (0.5 + 0.5 * heat) * fireLife; fCol[i * 3 + 1] = (0.04 + 0.14 * heat * heat) * fireLife; fCol[i * 3 + 2] = 0.01 * fireLife; }
        flameGeo.attributes.position.needsUpdate = true; flameGeo.attributes.color.needsUpdate = true; }
      // -- LIES, and the tearing
      if (T_LIES_SHOW > 0 && t > T_LIES_SHOW - 0.5 && t < T_TEAR + 6) {
        if (liesZ == null) { liesZ = cp.z - 30; lies.position.set(0, 0, liesZ); lies.rotation.y = Math.atan2(cp.x, cp.z - liesZ); }
        lies.visible = true; const rise = ease((t - T_LIES_SHOW + 0.5) / 1.4), k = T_TEAR > 0 ? clamp((t - T_TEAR) / 1.8) : 0, g = k * k;
        lLetters.forEach(m => { const u = m.userData;
          if (k <= 0) { m.position.set(u.x, -1.6 + 3.5 * rise, 0); m.rotation.set(0, 0, 0); }
          else { m.position.set(u.x + u.vx * k, Math.max(0.3, 1.9 + u.vy * k - 9 * g), u.vz * k); m.rotation.set(u.rx * k, 0, u.rz * k); } });
        charcoal.opacity = 1; lies.traverse(o => { if (o.material && o.material.transparent) o.material.opacity = 1 - clamp((t - T_TEAR - 3.5) / 2); });
      } else lies.visible = false;
      // -- frozen rain
      city.rainSpeed = (T_FROZEN > 0 && t > T_FROZEN - 0.1 && t < T_FROZEN_END + 0.1) ? 0.02 : 1;
      // -- the arrow of embers down the road
      if (T_ARROW > 0 && t > T_ARROW && t < T_ARROW + 3.2) {
        if (arrowZ == null) arrowZ = { z: cp.z, x: cp.x };
        arrow.visible = true; const k = (t - T_ARROW) / 1.3;
        for (let i = 0; i < 60; i++) { const on = clamp((k * 60 - i) / 3) * (1 - clamp((t - T_ARROW - 2.2) / 1)); M.makeRotationX(-Math.PI / 2).setPosition(arrowZ.x, 0.04, arrowZ.z - 3 - i * 2.2); M.scale(new THREE.Vector3(on, on, 1)); arrow.setMatrixAt(i, M); }
        arrow.instanceMatrix.needsUpdate = true;
      } else arrow.visible = false;
      // -- the end: after the last line the lamps go out, nearest first, all the way down the avenue
      if (T_LAST > 0 && t > T_LAST + 1.0) {
        if (!outLamps) { outLamps = []; const keep = city.lampAt(cp.z, 1), keepL = city.lampAt(cp.z, -1);
          for (let z = cp.z - 12; z > -1000; z -= 18) for (const side of [-1, 1]) { const i = city.lampAt(z, side); if (i !== keep && i !== keepL && !outLamps.includes(i)) outLamps.push(i); } }
        const k = (t - T_LAST - 1.0) * 9;                                                             // nine lamps a second, receding
        outLamps.forEach((i, n) => city.dimLamp(i, 1 - clamp((k - n) / 2)));
        const ahead = bulbs.filter(b => b.mesh.position.z < cp.z - 6).sort((a, b) => b.mesh.position.z - a.mesh.position.z);   // nearest first, down the lane
        ahead.forEach((b, n) => { b.on = 1 - clamp(((t - T_LAST - 1.0) * 1.6 - n) / 1.5); });
        lampMode = 'end';
        const rr = R(); if (rr) rr.material.emissiveIntensity = 0.4 + 0.5 * Math.pow(Math.max(0, Math.sin(time * 1.3)), 2) * clamp((t - T_LAST - 2) / 4);
      }
    },
  };
}
