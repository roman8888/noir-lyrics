// "On My Way to You" — this song's own set pieces. Everything is keyed to a line or a word by its text, so the
// storyboard follows the words wherever the timing puts them. Rules as ever: dark city, red = blood, no yellow.
import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FACADE, ROW2, CHURCH, lampZs } from './layout.js?v=20261017140116';
import { rng, clamp } from './util.js?v=20261017140116';

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
  const self = figure(1.0, manMat); self.visible = false; scene.add(self);                 // you, seen from behind and above, for "I'm coming for me"
  const selfLight = new THREE.PointLight(0xdfe6ff, 0, 7, 1.8); selfLight.position.y = 3.6; self.add(selfLight);

  // ---- "against the venom of people" / "Throw your poison": black drips run down the facades beside you
  const T_VENOM = wordT(/venom of people/i, /^venom/i), T_POISON = wordT(/throw your poison/i, /^poison/i);
  const dripMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.06, 0.005, 0.01) });
  const drips = [];
  for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.09 + r() * 0.08, 1.2 + r() * 1.6), dripMat); m.visible = false; m.userData = { side: i % 2 ? 1 : -1, z: (r() - 0.5) * 28, ph: r(), sp: 0.7 + r() * 0.6 }; scene.add(m); drips.push(m); }
  let dripZ = null;

  // ---- "That I bury you in words": a grave opens in the road ahead, and the song's own words rain into it in blood
  //      until it is full and they spill over the rim
  const T_BURY = wordT(/bury you in words/i, /^bury/i);
  const GW = 1.3, GL = 2.5, GD = 1.0;
  const grave = new THREE.Group(); grave.visible = false; scene.add(grave);
  const earth = new THREE.MeshStandardMaterial({ color: 0x0b0a0a, roughness: 1 });
  const pitWalls = new THREE.Mesh(new THREE.BoxGeometry(GW, GD, GL), new THREE.MeshStandardMaterial({ color: 0x050405, roughness: 1, side: THREE.BackSide })); pitWalls.position.y = -GD / 2 + 0.02; grave.add(pitWalls);
  const rim = new THREE.Mesh(new THREE.BoxGeometry(GW + 0.9, 0.16, GL + 0.9), earth); rim.position.y = 0.08; grave.add(rim);           // the dug-up edge
  const hole = new THREE.Mesh(new THREE.BoxGeometry(GW, 0.2, GL), new THREE.MeshBasicMaterial({ color: 0x000000 })); hole.position.y = 0.12; grave.add(hole);   // black mouth cut into the rim
  const graveGlow = new THREE.PointLight(0xc01820, 0, 7, 1.8); graveGlow.position.y = 0.4; grave.add(graveGlow);
  const rimLight = new THREE.PointLight(0xdfe6ff, 5, 9, 2); rimLight.position.set(0, 3.2, 0); grave.add(rimLight);   // a cold light over the hole so the rim reads
  const stone = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.14), new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.9 })); stone.position.set(0, 0.55, -GL / 2 - 0.55); grave.add(stone);
  const BURY_WORDS = ['words', 'lies', 'evil', 'venom', 'rotten', 'enough', 'silence', 'shock', 'poison', 'alone', 'darkness', 'broken'];
  const wordGeo = BURY_WORDS.map(w => { const g = new TextGeometry(w, { font: fonts.roman, size: 0.2, height: 0.05, curveSegments: 6, bevelEnabled: false }); g.computeBoundingBox(); const b = g.boundingBox; g.translate(-(b.max.x + b.min.x) / 2, -(b.max.y + b.min.y) / 2, 0); return g; });
  const rainGlyphs = [];
  for (let i = 0; i < 140; i++) { const m = new THREE.Mesh(wordGeo[i % wordGeo.length], blood()); m.visible = false;
    const over = i > 105;                                                                   // the last ones land on the rim and the road around
    m.userData = { x: over ? (r() - 0.5) * 3.2 : (r() - 0.5) * (GW - 0.5), dz: over ? (r() - 0.5) * (GL + 2.4) : (r() - 0.5) * (GL - 0.5), delay: i * 0.052 + r() * 0.1, spin: (r() - 0.5) * 4, yaw: (r() - 0.5) * 3.2, y0: 7 + r() * 5,
      rest: over ? 0.19 : -GD + 0.08 + (i / 105) * (GD + 0.1) };                          // the pile rises as the grave fills
    grave.add(m); rainGlyphs.push(m); }
  let buryZ = null; const gwp = new THREE.Vector3();

  // ---- "I've still got words you haven't heard yet": forty words from later in the song flicker into the lane ahead,
  //      each for a breath, pale, and are gone again — what is still to come
  const I_WORDS = idx(/words you haven't heard yet/i), T_WORDS = wordT(/words you haven't heard yet/i, /^words/i);
  const laterWords = [...new Set(lines.slice(I_WORDS + 1).flatMap(l => l.text.split(/\s+/)).map(w => w.replace(/[^a-zA-Z']/g, '')).filter(w => w.length >= 4))].slice(0, 40);
  const flick = laterWords.map((w, i) => { const m = glyph(w, 0.24 + (i % 3) * 0.06, paper(), 0.03); m.visible = false;
    m.userData = { at: (i / laterWords.length) * 3.2 + r() * 0.3, dur: 0.38 + r() * 0.3, dx: (r() - 0.5) * 5.6, dy: 0.5 + r() * 3.6, dz: 2.5 + r() * 9 }; scene.add(m); return m; });
  let flickAt = null;
  // ---- "just how rotten you really are" / "Even the darkness struggles to swallow what's inside": the avenue goes dark around you
  const T_ROTTEN = wordT(/how rotten/i, /^rotten/i), T_DARK = T(/darkness struggles/i), T_WAIT = T(/^just wait/i);
  const T_SWALLOW = T(/swallow what's inside/i), T_GUST = T(/find the air/i);   // the city swallowed whole for that one line; the air pushed up from the road

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
  // "I won't need fire": the whole lane burns — flames climb both walls, the sky goes ember, four fire lights roam
  const T_FIRE = T(/won't need fire/i), CF = 1800, cfPos = new Float32Array(CF * 3), cfCol = new Float32Array(CF * 3), cfLife = new Float32Array(CF).map(() => r()), cfSeed = new Float32Array(CF * 3).map(() => r());
  const cfGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(cfPos, 3)).setAttribute('color', new THREE.BufferAttribute(cfCol, 3));
  const cityFire = new THREE.Points(cfGeo, new THREE.PointsMaterial({ map: puff, size: 1.1, transparent: true, depthWrite: false, opacity: 0.85, vertexColors: true, blending: THREE.AdditiveBlending })); cityFire.visible = false; scene.add(cityFire);
  const fireLights = [0, 1, 2, 3].map(() => { const L = new THREE.PointLight(0xff5a12, 0, 30, 1.6); scene.add(L); return L; });
  let cityFireZ = null;
  // "Maybe you don't": a huge door swings across the lane and slams shut, BLOCKED across its face
  const T_BLOCK = T(/^maybe you don't/i);
  const door = new THREE.Group(); door.visible = false; scene.add(door);
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x0b0a0a, roughness: 0.55, metalness: 0.6 });
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(8.6, 26, 0.9), doorMat); leaf.position.set(4.3, 13, 0); door.add(leaf);   // hinged on the group origin (the left wall), as tall as the lane walls
  const doorRim = new THREE.Mesh(new THREE.BoxGeometry(8.9, 26.3, 0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 0.06, 0.04), transparent: true, opacity: 0 })); doorRim.position.set(4.3, 13, -0.35); door.add(doorRim);   // the red edge-light bleeding round the leaf
  const studs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshStandardMaterial({ color: 0x3a3230, roughness: 0.4, metalness: 0.8 }), 56);
  { const M2 = new THREE.Matrix4(); for (let i = 0; i < 56; i++) { M2.makeTranslation(0.6 + (i % 8) * 1.05, 1.2 + Math.floor(i / 8) * 3.6, 0.5); studs.setMatrixAt(i, M2); } studs.instanceMatrix.needsUpdate = true; door.add(studs); }
  const DN = 500, dPos = new Float32Array(DN * 3), dVel = new Float32Array(DN * 3), dGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  const dust = new THREE.Points(dGeo, new THREE.PointsMaterial({ map: puff, size: 0.7, transparent: true, depthWrite: false, opacity: 0, color: 0x8a847c })); dust.visible = false; scene.add(dust); let dustInit = false;
  const blocked = new THREE.Group(); [...'BLOCKED'].forEach((ch, k) => { const m = glyph(ch, 1.25, blood(), 0.2); m.position.set(1.0 + k * 1.1, 8.4, 0.6); m.userData.k = k; blocked.add(m); }); door.add(blocked);
  const doorLight = new THREE.PointLight(0xff2a1a, 0, 24, 1.6); doorLight.position.set(4.3, 7, 4); door.add(doorLight);
  let doorZ = null;
  // the end: I'M COMING stands over the end of the lane, seen from the drone shot
  const sign = new THREE.Group(); sign.visible = false; scene.add(sign);
  const sLetters = [...'I AM COMING'].map((ch, k) => { if (ch === ' ') return null; const m = glyph(ch, 4.2, blood(), 0.6); m.position.x = (k - 5) * 3.9; sign.add(m); return m; }).filter(Boolean);
  const sLight = new THREE.PointLight(0xff2a2a, 0, 90, 1.3); sLight.position.set(0, 2, 14); sign.add(sLight);

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
  let outLamps = null; const R = () => scene.getObjectByName('towerR'); const towerText = [];

  // ---- the back lane's light: bulbs on wires every 22 m; six real lights ride along with the camera to the nearest bulbs
  const LANE = -23, bulbs = [], bulbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.0, 1.3) }), wireMat = new THREE.LineBasicMaterial({ color: 0x0a0a0c });
  for (let z = -200; z > -980; z -= 22) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), bulbMat.clone()); b.position.set(LANE + (r() - 0.5) * 1.2, 5.0 + (r() - 0.5) * 0.4, z); scene.add(b);
    const w = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-19, 5.6, z), new THREE.Vector3(b.position.x, b.position.y + 0.1, z), new THREE.Vector3(-27, 5.7, z)]), wireMat); scene.add(w);
    bulbs.push({ mesh: b, on: 1 });
  }
  // the air: a gust of it up from the road (points) and winds racing through the lane (long faint streaks)
  const GN = 900, gustPos = new Float32Array(GN * 3), gustVel = new Float32Array(GN * 3), gustGeo = new THREE.BufferGeometry(); gustGeo.setAttribute('position', new THREE.BufferAttribute(gustPos, 3));
  const gust = new THREE.Points(gustGeo, new THREE.PointsMaterial({ map: puff, size: 0.16, transparent: true, depthWrite: false, opacity: 0, color: new THREE.Color(0.75, 0.82, 0.95), blending: THREE.AdditiveBlending })); gust.visible = false; scene.add(gust);
  const WN = 36, winds = new THREE.InstancedMesh(new THREE.PlaneGeometry(7, 0.05), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.7, 0.78, 0.9), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), WN); winds.visible = false; scene.add(winds);
  const windSeed = Array.from({ length: WN }, (_, i) => ({ x: (r() - 0.5) * 7, y: 0.8 + r() * 5, z0: r() * 60, sp: 22 + r() * 14, ph: r() * 6.3, yaw: (r() - 0.5) * 0.25 }));
  let gustInit = false; const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1), _p = new THREE.Vector3();
  const laneLights = []; for (let i = 0; i < 6; i++) { const L = new THREE.PointLight(0xffc27a, 0, 16, 1.8); scene.add(L); laneLights.push(L); }
  const lightTheLane = cp => {
    const near = bulbs.map(b => ({ b, d: Math.abs(b.mesh.position.z - cp.z) })).sort((a, b) => a.d - b.d).slice(0, 6);
    near.forEach(({ b }, i) => { const L = laneLights[i]; L.position.copy(b.mesh.position).add(new THREE.Vector3(0, -0.3, 0)); L.intensity = 7 * b.on; });
    bulbs.forEach(b => { b.mesh.material.color.setRGB(2.6 * b.on, 2.0 * b.on, 1.3 * b.on); });
  };
  // ---- "From them." / "people so lost in evil": figures in lit windows up the lane walls, watching, then gone
  const T_THEM = T(/^from them/i), T_LOSTE = wordT(/so lost in evil/i, /^lost/i);
  const watchers = [];
  for (let i = 0; i < 7; i++) { const g = new THREE.Group(); const lit = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.0), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.5, 1.3) })); g.add(lit);
    const fig = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.7, 4, 8), new THREE.MeshBasicMaterial({ color: 0x000000 })); fig.position.set((r() - 0.5) * 0.5, -0.25, 0.05); g.add(fig);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), fig.material); head.position.set(fig.position.x, 0.42, 0.05); g.add(head);
    g.visible = false; g.userData = { side: i % 2 ? 1 : -1, dz: -4 - i * 3.2 - r() * 2, y: 4.2 + (i % 3) * 2.6 + r() * 0.8, delay: i * 0.18 + r() * 0.1 }; scene.add(g); watchers.push(g); }
  let watchZ = null;
  // ---- "I won't need fists": two fists come at the lens from the sides and stop short
  const T_FISTS = T(/won't need fists/i);
  const fistMat = new THREE.MeshStandardMaterial({ color: 0x0a0909, roughness: 0.9 });
  const fists = [-1, 1].map(sd => { const g = new THREE.Group(); const fm = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), fistMat); fm.scale.set(1.1, 0.9, 1.3); g.add(fm);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 1.4, 4, 8), fistMat); arm.rotation.z = sd * 1.1; arm.position.set(sd * 0.6, -0.35, 0.3); g.add(arm); g.visible = false; g.userData = { sd }; scene.add(g); return g; });
  // ---- "The shock is over": every bulb flares once
  const T_SHOCK = T(/shock is over/i);
  // ---- the first "I'm coming." (before the verse): the bulbs ahead light up one after another down the lane
  const T_COMING1 = lines.find(l => /^i'm coming\.?$/i.test(l.text))?.t ?? -1;
  // ---- "The words that came too late": pale words overtake you from behind and drift away ahead
  const T_LATE = T(/came too late/i);
  const lateWords = ['sorry', 'stay', 'wait', 'listen', 'enough', 'please', 'no', 'why', 'now', 'here', 'still', 'me'].map((w, i) => { const m = glyph(w, 0.3, paper(), 0.03); m.visible = false; m.userData = { dx: (r() - 0.5) * 4.5, dy: 0.6 + r() * 3, sp: 2.2 + r() * 1.8, delay: i * 0.22 }; scene.add(m); return m; });
  // ---- "But that man isn't waiting anymore": he turns to face you, his bulb flares
  const T_NOTWAIT = T(/isn't waiting anymore/i);
  // ---- "My eyes are open": the view opens — the lens widens for a breath
  const T_EYES = T(/my eyes are open/i); const FOV0 = 50;
  // ---- "Maybe you don't.": the lane dims by half before the last line
  const T_MAYBE = T(/^maybe you don't/i);
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
      // -- you, standing where you stood, while the camera pulls away
      const pl = route.pullAt ? route.pullAt(t) : 0;
      if (pl > 0.02 && route.selfSpot) { self.visible = true; self.position.copy(route.selfSpot); self.position.y = 0; self.rotation.y = Math.atan2(f.x, f.z) + Math.PI; selfLight.intensity = 9 * pl; }
      else self.visible = false;
      // -- the watchers in the windows
      const tw = [T_THEM, T_LOSTE].find(T0 => T0 > 0 && t > T0 - 0.2 && t < T0 + 4.5);
      if (tw) { if (watchZ !== tw) { watchZ = tw; watchers.forEach(g => { const u = g.userData; g.position.set(u.side < 0 ? -19.03 : -26.97, u.y, cp.z + u.dz); g.rotation.y = u.side < 0 ? -Math.PI / 2 : Math.PI / 2; }); }
        watchers.forEach(g => { const u = g.userData, k = t - tw - u.delay; g.visible = k > 0 && k < 2.6 + u.delay; }); }
      else watchers.forEach(g => (g.visible = false));
      // -- the fists
      if (T_FISTS > 0 && t > T_FISTS - 0.1 && t < T_FISTS + 2.6) { const k = t - T_FISTS, q = ease(k / 0.45) * (1 - smooth((k - 1.4) / 0.9));
        const right = new THREE.Vector3(f.z, 0, -f.x);
        fists.forEach(g => { const sd = g.userData.sd; g.visible = q > 0.02;
          g.position.copy(cp).addScaledVector(f, 1.6 - 0.9 * q).addScaledVector(right, sd * (1.6 - 1.15 * q)); g.position.y = cp.y - 0.15 + Math.sin(time * 14) * 0.02 * q;
          g.quaternion.copy(camera.quaternion); }); }
      else fists.forEach(g => (g.visible = false));
      // -- the bulbs: the runway on the first "I'm coming", the flare on "shock", half-light on "Maybe you don't"
      if (T_COMING1 > 0 && t > T_COMING1 && t < T_COMING1 + 3.5) { const k = t - T_COMING1;
        bulbs.forEach(b => { const d = cp.z - b.mesh.position.z; if (d > 0 && d < 140) { const w = Math.sin(Math.max(0, Math.min(Math.PI, (k * 45 - d) / 18 * Math.PI))); b.on = 1 + 1.8 * w; } }); }
      if (T_SHOCK > 0 && t > T_SHOCK && t < T_SHOCK + 0.7) { const k = t - T_SHOCK; bulbs.forEach(b => { b.on = 1 + 2.2 * Math.exp(-k * 6); }); }
      if (T_MAYBE > 0 && t > T_MAYBE && !(T_LAST > 0 && t > T_LAST + 1)) bulbs.forEach(b => { b.on = 1 - 0.5 * smooth((t - T_MAYBE) / 1.2); });
      // -- the words that came too late
      if (T_LATE > 0 && t > T_LATE && t < T_LATE + 4.5) { const k = t - T_LATE, right = new THREE.Vector3(f.z, 0, -f.x);
        lateWords.forEach(m => { const u = m.userData, a = k - u.delay; m.visible = a > 0 && a < 3.2; if (!m.visible) return;
          m.position.copy(cp).addScaledVector(f, -3 + a * u.sp).addScaledVector(right, u.dx + Math.sign(u.dx || 1) * 1.8); m.position.y = u.dy; m.quaternion.copy(camera.quaternion);   // beside the lens, never through it
          const near = Math.max(0, 1 - m.position.distanceTo(cp) / 3.5); m.material.opacity = 0.85 * Math.sin(Math.min(1, a / 3.2) * Math.PI) * (1 - near); }); }
      else lateWords.forEach(m => (m.visible = false));
      // -- the man turns to you when he is done waiting
      if (T_NOTWAIT > 0 && man.visible && t > T_NOTWAIT && t < T_NOTWAIT + 3) { const k = t - T_NOTWAIT; man.rotation.y = Math.atan2(cp.x - man.position.x, cp.z - man.position.z) + Math.PI * (1 - ease(k / 1.2)); manLight.intensity = 16 + 22 * Math.exp(-k * 2.5); }
      // -- the eyes open: a wider lens for a breath
      if (camera.isPerspectiveCamera) { const k = T_EYES > 0 ? t - T_EYES : -1; const wide = (k > -0.2 && k < 2.2) ? Math.sin(Math.min(1, Math.max(0, (k + 0.2) / 2.4)) * Math.PI) : 0;
        const fov = FOV0 + 10 * wide; if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix(); } }
      // -- the drips
      const dv = [T_VENOM, T_POISON].find(T0 => T0 > 0 && t > T0 - 0.3 && t < T0 + 4.5);
      if (dv) { if (dripZ !== dv) { dripZ = dv; drips.forEach(m => { m.userData.z0 = cp.z - 4 + m.userData.z; }); }
        drips.forEach(m => { const u = m.userData, k = ((t - dv + u.ph * 3) * u.sp * 0.45) % 1; m.visible = true;
          const lane = cp.x < -12, wx = lane ? (u.side < 0 ? -19.02 : -26.98) : u.side * (FACADE - 0.02), face = lane ? (u.side < 0 ? -1 : 1) : -u.side;   // the lane's two walls, or the avenue's facades
          m.position.set(wx, 8.5 - k * 9, u.z0); m.rotation.y = face * Math.PI / 2; m.scale.y = 0.6 + k * 0.8; }); }
      else drips.forEach(m => (m.visible = false));
      // -- the grave: opens ahead a breath before the word, fills with red words, is left behind
      if (T_BURY > 0 && t > T_BURY - 1.2 && t < T_BURY + 14) {
        if (buryZ == null) { buryZ = cp.z - 12; grave.position.set(cp.x, 0, buryZ); grave.rotation.y = Math.atan2(f.x, f.z) + Math.PI; }
        const k = t - T_BURY, open = ease((k + 1.2) / 1.0);
        grave.visible = true; grave.scale.set(1, 1, open);                                          // the mouth opens along its length
        rainGlyphs.forEach(m => { const u = m.userData, q = clamp((k - u.delay) / 1.1), g = q * q;
          m.visible = q > 0; m.position.set(u.x, u.y0 - (u.y0 - u.rest) * g, u.dz);
          m.rotation.set(-Math.PI / 2 * clamp(q * 1.25), u.yaw * q, u.spin * Math.sin(q * Math.PI) * 0.5);
          if (q > 0 && q < 1) { m.getWorldPosition(gwp); if (gwp.distanceTo(cp) < 3) m.visible = false;   // a word still in the air never crosses the lens,
            else if (song?.live) { const gd = Math.hypot(gwp.x - cp.x, gwp.z - cp.z);                     // and passes BEHIND the sung line: hidden while it crosses the text band in front of it
              for (const e of song.live.values()) { if (!e.hgt) continue; const ld = Math.hypot(e.group.position.x - cp.x, e.group.position.z - cp.z);
                if (gd < ld && Math.abs(gwp.y - (cp.y + (e.group.position.y - cp.y) * gd / ld)) < (e.hgt * 0.5 + 0.35) * gd / ld + 0.25) { m.visible = false; break; } } } } });
        graveGlow.intensity = 14 * clamp(k / 3) + Math.sin(time * 7) * 0.6;
      } else grave.visible = false;
      // -- the words still to come
      if (T_WORDS > 0 && t > T_WORDS - 0.1 && t < T_WORDS + 4.6) {
        if (!flickAt) { flickAt = { p: cp.clone(), f: f.clone(), r: new THREE.Vector3(f.z, 0, -f.x) }; }
        const k = t - T_WORDS;
        flick.forEach(m => { const u = m.userData, a = (k - u.at) / u.dur, o = a < 0 || a > 1 ? 0 : Math.sin(a * Math.PI);
          m.visible = o > 0.02; if (!m.visible) return;
          m.position.copy(flickAt.p).addScaledVector(flickAt.f, u.dz).addScaledVector(flickAt.r, u.dx); m.position.y = u.dy;
          m.quaternion.copy(camera.quaternion); m.material.opacity = o * 0.9; m.scale.setScalar(0.85 + 0.3 * o); });
      } else flick.forEach(m => (m.visible = false));
      // -- the air, found: a gust up from the road and winds through the lane (the rain whipped with it)
      if (T_GUST > 0 && t > T_GUST - 0.2 && t < T_GUST + 4.5) {
        const k = t - T_GUST + 0.2, up = Math.min(1, k / 0.5), fade = 1 - smooth((k - 3.2) / 1.3);
        if (!gustInit) { gustInit = true; for (let i = 0; i < GN; i++) { gustPos[i * 3] = cp.x + (r() - 0.5) * 7; gustPos[i * 3 + 1] = 0.05 + r() * 0.3; gustPos[i * 3 + 2] = cp.z - 2 - r() * 16; gustVel[i * 3] = (r() - 0.5) * 2.5; gustVel[i * 3 + 1] = 5 + r() * 9; gustVel[i * 3 + 2] = -(2 + r() * 10); } }
        for (let i = 0; i < GN; i++) { const d = dt * up; gustPos[i * 3] += gustVel[i * 3] * d; gustPos[i * 3 + 1] += gustVel[i * 3 + 1] * d; gustPos[i * 3 + 2] += gustVel[i * 3 + 2] * d; gustVel[i * 3 + 1] -= 2.5 * d;
          if (gustPos[i * 3 + 1] > 22 || gustPos[i * 3 + 1] < 0) { gustPos[i * 3] = cp.x + (r() - 0.5) * 7; gustPos[i * 3 + 1] = 0.05; gustPos[i * 3 + 2] = cp.z - 2 - r() * 16; gustVel[i * 3 + 1] = 5 + r() * 9; } }
        gustGeo.attributes.position.needsUpdate = true; gust.visible = true; gust.material.opacity = 0.5 * up * fade;
        winds.visible = true; winds.material.opacity = 0.55 * up * fade;
        windSeed.forEach((w, i) => { const z = cp.z + 8 - ((w.z0 + k * w.sp) % 70); _p.set(cp.x + w.x + Math.sin(k * 3 + w.ph) * 0.6, w.y + Math.sin(k * 2 + w.ph) * 0.5, z); _q.setFromEuler(new THREE.Euler(0, Math.PI / 2 + w.yaw, 0)); _s.set(1 + 0.8 * Math.sin(k * 5 + w.ph) ** 2, 1, 1); _m4.compose(_p, _q, _s); winds.setMatrixAt(i, _m4); });
        winds.instanceMatrix.needsUpdate = true; city.rainSpeed = 1 + 2.2 * up * fade;
      } else if (gust.visible) { gust.visible = false; winds.visible = false; gustInit = false; city.rainSpeed = 1; }
      // -- the dark: rotten (a breath of it), then the darkness that struggles to swallow (the whole avenue) until "Just wait";
      //    on "to swallow what's inside" the city is swallowed whole: every window, bulb and lamp out, for that one line only
      if (T_ROTTEN > 0 && t > T_ROTTEN - 0.3 && t < T_ROTTEN + 3.6) city.setDark(0.9 * smooth((t - T_ROTTEN + 0.3) / 0.8) * (1 - smooth((t - T_ROTTEN - 2.4) / 1.2)), cp.z - 20);
      else if (T_DARK > 0 && t > T_DARK - 0.4 && t < T_WAIT + 1.2) { const w = smooth((t - T_DARK + 0.4) / 3.5), back = smooth((t - T_WAIT + 0.2) / 1.2); city.setDark((1 - back) * Math.min(1, w * 1.2), cp.z - 10 - w * 220); setLamps(back > 0.5 ? 'all' : 'none');
        const sw = T_SWALLOW > 0 ? smooth((t - T_SWALLOW + 0.25) / 0.5) * (1 - back) : 0;
        if (sw > 0) city.setDark(Math.max((1 - back) * Math.min(1, w * 1.2), sw), cp.z - 10 - w * 220 - sw * 400); city.dim(sw * 0.92);
        if (!(T_LAST > 0 && t > T_LAST)) bulbs.forEach(b => { b.on = (1 - 0.85 * Math.min(1, w * 1.2) * (1 - back)) * (1 - sw); }); laneLights.forEach(L => { L.intensity *= 1 - sw; }); }
      else { city.dim(0); if (!(T_LAST > 0 && t > T_LAST + 1)) bulbs.forEach(b => { b.on = 1; }); }
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
      // -- the city on fire
      if (T_FIRE > 0 && t > T_FIRE - 0.1 && t < T_FIRE + 7) {
        const k = t - T_FIRE + 0.1, on = Math.min(1, k / 0.8) * (1 - smooth((k - 5) / 2));
        if (cityFireZ == null) cityFireZ = cp.z;
        cityFire.visible = true; cityFire.material.opacity = 0.85 * on;
        for (let i = 0; i < CF; i++) { cfLife[i] += dt * (0.5 + cfSeed[i * 3] * 0.6); if (cfLife[i] > 1) cfLife[i] -= 1; const q = cfLife[i], wall = cfSeed[i * 3 + 1] < 0.5 ? -19.2 : -26.8, sd = wall < -23 ? 1 : -1;
          cfPos[i * 3] = wall + sd * (0.2 + q * 1.6 * cfSeed[i * 3 + 2]) + Math.sin(time * 3 + i) * 0.25; cfPos[i * 3 + 1] = q * (9 + cfSeed[i * 3] * 9) * on; cfPos[i * 3 + 2] = cityFireZ + 10 - cfSeed[i * 3 + 2] * 90 - q * 2;
          const heat = (1 - q) * on; cfCol[i * 3] = 0.55 + 0.45 * heat; cfCol[i * 3 + 1] = 0.05 + 0.2 * heat * heat; cfCol[i * 3 + 2] = 0.01; }
        cfGeo.attributes.position.needsUpdate = true; cfGeo.attributes.color.needsUpdate = true;
        fireLights.forEach((L, i) => { L.intensity = (40 + 25 * Math.sin(time * 9 + i * 2) ** 2) * on; L.position.set(i % 2 ? -19.5 : -26.5, 3 + 2 * Math.sin(time * 2 + i), cityFireZ - 4 - i * 14 - 8 * Math.sin(time * 0.7 + i)); });
        city.setDark(0, 0); bulbs.forEach(b => { b.on = 1 + 1.5 * on; });
      } else if (cityFire.visible) { cityFire.visible = false; fireLights.forEach(L => (L.intensity = 0)); cityFireZ = null; }
      // -- the door: open along the left wall, then it swings and slams across the lane, BLOCKED
      if (T_BLOCK > 0 && t > T_BLOCK - 0.3 && !(T_LAST > 0 && t > T_LAST + 9)) {
        if (doorZ == null) { doorZ = cp.z - 24; door.position.set(-27.2, 0, doorZ); }
        const k = t - T_BLOCK + 0.3, sw = k < 0 ? 0 : Math.min(1, Math.pow(k / 0.42, 2.4));   // a hard, accelerating swing: shut in under half a second
        door.visible = true; door.rotation.y = -Math.PI / 2 * (1 - sw);
        const hk = k - 0.42, hit = hk > 0 ? Math.exp(-hk * 5) : 0; door.position.x = -27.2 + Math.sin(k * 60) * 0.12 * hit;   // the shudder of the slam
        doorLight.intensity = 260 * hit + 8 * sw; doorRim.material.opacity = 0.9 * hit + 0.25 * sw;
        blocked.children.forEach(m => { const o = hk > 0 ? clamp((hk - m.userData.k * 0.05) / 0.22) : 0; m.visible = o > 0; const pop = 1 + 2.2 * (1 - o); m.scale.setScalar(pop); m.material.emissiveIntensity = 0.9 + 2.5 * (1 - o) + 0.6 * hit; });   // BLOCKED punches in letter by letter
        if (hk > 0 && hk < 2.2) {                                                                  // the dust of the slam rolls out from the foot of the door
          if (!dustInit) { dustInit = true; for (let i = 0; i < DN; i++) { dPos[i * 3] = -27.2 + 0.4 + r() * 8; dPos[i * 3 + 1] = 0.1 + r() * 1.2; dPos[i * 3 + 2] = doorZ + 0.5; dVel[i * 3] = (r() - 0.5) * 3; dVel[i * 3 + 1] = 1 + r() * 4; dVel[i * 3 + 2] = 4 + r() * 10; } }
          for (let i = 0; i < DN; i++) { dPos[i * 3] += dVel[i * 3] * dt; dPos[i * 3 + 1] += dVel[i * 3 + 1] * dt; dPos[i * 3 + 2] += dVel[i * 3 + 2] * dt; dVel[i * 3 + 1] -= 2.2 * dt; dVel[i * 3 + 2] *= 1 - 1.6 * dt; }
          dGeo.attributes.position.needsUpdate = true; dust.visible = true; dust.material.opacity = 0.55 * (1 - hk / 2.2);
        } else dust.visible = false;
        if (hk > 0 && hk < 0.6) bulbs.forEach(b => { b.on = 0.1 + 2.5 * hit * (Math.random() < 0.5 ? 1 : 0); });   // every bulb in the lane blinks hard at the slam
      } else door.visible = false;
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
        // I'M COMING over the end of the lane: letter by letter, lit from below, swivelling a touch like the tower's R
        if (sign.position.z === 0) { sign.position.set(0, 63, -1080);          // across the tower's tip, where the other song's R and KARMA stand
          const rr = R(); if (rr) rr.visible = false;
          const wp = new THREE.Vector3(); scene.traverse(o => { if (o.isMesh && o.geometry?.type === 'TextGeometry' && !sign.children.includes(o)) { o.getWorldPosition(wp); if (wp.z < -1060 && wp.y > 50) towerText.push(o); } }); }   // the other song's KARMA letters round the R go too
        towerText.forEach(o => { o.visible = false; });   // (props.js re-shows them every frame of its own ending)
        sign.visible = true; const sk = t - T_LAST - 3;
        sLetters.forEach((m, n) => { const on = clamp((sk * 2.2 - n) / 1.2); m.visible = on > 0; m.scale.setScalar(0.6 + 0.4 * on); m.material.emissiveIntensity = 1.5 + 1.2 * on * Math.pow(Math.max(0, Math.sin(time * 1.1 + n * 0.3)), 2); });
        sign.rotation.y = Math.sin(time * 0.25) * 0.06; sLight.intensity = 400 * clamp(sk / 2);
      }
    },
  };
}
