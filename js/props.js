// Street dressing and set pieces: alleys, the hero apartment, the overpass, the church, wires, steam, hydrants,
// awnings, figures (walkers, the crowd that turns its back, the two walking together), the drowning, embers, birds.
import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { rng, clamp } from './util.js?v=20261010213038';
import { FACADE, ROW2, ALLEYS, ROOM, BRIDGE, CHURCH, LAMP_H, HERO } from './layout.js?v=20261010213038';

const INK = () => new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.9 });
const STEEL = () => new THREE.MeshStandardMaterial({ color: 0x1a1b1f, roughness: 0.55, metalness: 0.8 });
const EMIT = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b) });
const ease = x => 1 - Math.pow(1 - clamp(x), 3);

// a standing silhouette (capsule + head); facing -z by default
function figure(s = 1, mat = INK(), umbrella = false) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3 * s, 1.35 * s, 4, 12), mat); body.position.y = 1.05 * s; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21 * s, 14, 10), mat); head.position.y = 2.08 * s; g.add(head); g.userData.head = head;
  if (umbrella) {
    const u = new THREE.Mesh(new THREE.SphereGeometry(0.85 * s, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat); u.position.y = 2.25 * s; g.add(u);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.2 * s), mat); st.position.y = 1.7 * s; g.add(st);
  }
  g.userData.s = s;
  return g;
}

export function createProps(scene, city, timing, fonts, route) {
  const font = fonts.italic;
  const solid = []; let roadPaint = null;
  const r = rng(99);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3();
  const add = (geo, mat, x, y, z, parent = scene) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  const lineT = text => timing.lines.find(l => l.text.toLowerCase().includes(text))?.t ?? -1;

  // ---- overhead wires sagging across the street
  const wirePts = [];
  for (let i = 0; i < 18; i++) {
    const z = 20 - i * 19 - r() * 6, y0 = 6 + r() * 4, y1 = 6 + r() * 4, sag = 0.8 + r() * 1.2;
    for (let k = 0; k < 16; k++) {
      const a = k / 16, b = (k + 1) / 16;
      wirePts.push(-FACADE, y0 + (y1 - y0) * a - Math.sin(a * Math.PI) * sag, z, -FACADE + 2 * FACADE * 1, 0, 0);
      const p = wirePts.length - 6; wirePts[p] = -FACADE + 2 * FACADE * a; wirePts[p + 3] = -FACADE + 2 * FACADE * b; wirePts[p + 4] = y0 + (y1 - y0) * b - Math.sin(b * Math.PI) * sag; wirePts[p + 5] = z;
    }
  }
  const wires = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(wirePts, 3)),
    new THREE.LineBasicMaterial({ color: 0x0a0a0c })); scene.add(wires);

  // ---- hydrants, bins, benches, awnings, dim shop tubes along both kerbs
  const hyd = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.2, 0.8, 8), new THREE.MeshStandardMaterial({ color: 0x3a0a0a, roughness: 0.7 }), 20);
  const bin = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.32, 0.28, 0.95, 10), STEEL(), 24);
  const awn = new THREE.InstancedMesh(new THREE.BoxGeometry(5, 0.08, 1.6), new THREE.MeshStandardMaterial({ color: 0x2a1c1a, roughness: 0.9 }), 22);
  const tube = new THREE.InstancedMesh(new THREE.BoxGeometry(2.4, 0.08, 0.08), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.3, 0.25) }), 16);
  tube.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(16 * 3), 3);
  const tubeCols = [[0.9, 0.2, 0.18], [0.3, 0.5, 0.9], [0.7, 0.75, 0.85], [0.6, 0.12, 0.1]];
  for (let i = 0; i < 20; i++) hyd.setMatrixAt(i, M.makeTranslation((i % 2 ? 1 : -1) * (FACADE - 1.3), 0.4, 25 - i * 18 - r() * 8));
  for (let i = 0; i < 24; i++) bin.setMatrixAt(i, M.makeTranslation((i % 2 ? -1 : 1) * (FACADE - 1.1), 0.48, 15 - i * 15 - r() * 9));
  for (let i = 0; i < 22; i++) { const s = i % 2 ? 1 : -1; let az = 10 - i * 16 - r() * 8; if (s > 0 && Math.abs(az - HERO.z) < 14) az -= 30;   // not over the apartment window
    M.compose(V.set(s * (FACADE - 0.9), 3.1, az), Q.setFromEuler(new THREE.Euler(s * 0.25, 0, 0)), new THREE.Vector3(1, 1, 1)); awn.setMatrixAt(i, M); }
  for (let i = 0; i < 16; i++) { const s = i % 2 ? 1 : -1; const c = tubeCols[i % 4];
    M.compose(V.set(s * (FACADE - 0.1), 3.6 + (i % 3) * 0.3, 0 - i * 22 - r() * 10), Q.setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)), new THREE.Vector3(1, 1, 1)); tube.setMatrixAt(i, M);
    tube.setColorAt(i, new THREE.Color(c[0], c[1], c[2])); }
  scene.add(hyd, bin, awn, tube);

  // ---- alleys: dumpsters, fire escapes, a hanging bulb, puddles
  const alleyLights = [];
  for (const a of ALLEYS) {
    const s = a.side, zc = a.z;
    for (let i = 0; i < 2; i++) add(new THREE.BoxGeometry(1.8, 1.3, 1.1), new THREE.MeshStandardMaterial({ color: 0x0f1a12, roughness: 0.8, metalness: 0.3 }), s * (FACADE + (a === ALLEYS[0] ? 2.2 : 4) + i * 3), 0.65, zc + (i ? 1 : -1) * (a.w / 2 - 0.7));
    // fire escape zigzag on the alley's -z wall
    const fe = new THREE.Group(); fe.position.set(s * (FACADE + 12.5), 0, zc - a.w / 2 + 0.45); scene.add(fe);
    for (let f = 0; f < 4; f++) {
      const y = 5.2 + f * 3.2;
      const plat = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.08, 0.9), STEEL()); plat.position.set(0, y, 0); fe.add(plat);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.04, 0.04), STEEL()); rail.position.set(0, y + 0.95, -0.42); fe.add(rail);
      for (let p = -2; p <= 2; p++) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.95, 0.04), STEEL()); post.position.set(p * 1.0, y + 0.48, -0.42); fe.add(post); }
      const ladder = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3.3, 0.05), STEEL()); ladder.position.set(f % 2 ? 1.6 : -1.6, y + 1.6, 0.2); ladder.rotation.x = 0.35; fe.add(ladder);
    }
    const bx = s * (FACADE + 9), by = 4.6;
    add(new THREE.CylinderGeometry(0.01, 0.01, 3), INK(), bx, by + 1.5, zc);
    add(new THREE.SphereGeometry(0.12, 10, 8), EMIT(4, 3, 1.8), bx, by, zc);
    const pl = new THREE.PointLight(0xffc27a, 7, 16, 1.8); pl.position.set(bx, by, zc); scene.add(pl); alleyLights.push(pl);
    // wet alley floor (the big mirror ends at the facades)
    const fl = add(new THREE.PlaneGeometry(ROW2 - FACADE + 2, a.w), new THREE.MeshStandardMaterial({ color: 0x08090c, roughness: 0.18, metalness: 0.6 }), s * (FACADE + (ROW2 - FACADE) / 2), 0.015, zc);
    fl.rotation.x = -Math.PI / 2;
  }
  // puddle rings on the street (rain)
  const ringGeo = new THREE.RingGeometry(0.2, 0.215, 40), rings = [];
  for (let i = 0; i < 40; i++) { const m = add(ringGeo, new THREE.MeshBasicMaterial({ color: 0x5a6270, transparent: true }), (r() - 0.5) * 14, 0.04, 30 - r() * 350); m.rotation.x = -Math.PI / 2; m.userData.p = r(); rings.push(m); }

  // ---- traffic light at the second alley
  const tl = new THREE.Group(); tl.position.set(-FACADE + 1.2, 0, ALLEYS[1].z + 6); scene.add(tl);
  add(new THREE.CylinderGeometry(0.06, 0.08, 5.5), STEEL(), 0, 2.75, 0, tl);
  add(new THREE.BoxGeometry(0.1, 0.1, 4.4), STEEL(), 2.2, 5.4, 0, tl);
  add(new THREE.BoxGeometry(0.4, 1.1, 0.35), INK(), 4.2, 4.9, 0, tl);
  const lights = [EMIT(1, 0.1, 0.05), EMIT(1, 0.6, 0.1), EMIT(0.2, 1, 0.4)].map((m, i) => add(new THREE.CircleGeometry(0.11, 12), m, 4.2, 5.25 - i * 0.33, 0.19, tl));

  // ---- steam vents
  const puffTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c); })();
  const vents = [[-8.7, -22], [8.7, -88], [-8.7, -158], [8.7, -244]], NP = 60;   // against the facades, well off the walking line
  const puffs = vents.map(([x, z]) => {
    const pos = new Float32Array(NP * 3), life = new Float32Array(NP).map(() => Math.random());
    const g = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ map: puffTex, size: 1.1, transparent: true, depthWrite: false, opacity: 0.28, color: 0x9aa0aa }));
    scene.add(p); return { p, pos, life, x, z };
  });

  // ---- the overpass
  const deck = add(new THREE.BoxGeometry(BRIDGE.span, BRIDGE.thick, 7), new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.85 }), 0, BRIDGE.y, BRIDGE.z); solid.push(deck);
  for (const s of [-1, 1]) {
    add(new THREE.BoxGeometry(BRIDGE.span, 1.1, 0.12), STEEL(), 0, BRIDGE.y + 1.0, BRIDGE.z + s * 3.45);
    for (let i = -10; i <= 10; i += 2) add(new THREE.BoxGeometry(0.08, 1.0, 0.08), STEEL(), i * 2, BRIDGE.y + 0.95, BRIDGE.z + s * 3.45);
    add(new THREE.BoxGeometry(2.4, BRIDGE.y, 6), new THREE.MeshStandardMaterial({ color: 0x101114, roughness: 0.9 }), s * 10.5, BRIDGE.y / 2, BRIDGE.z);
  }
  for (let i = -2; i <= 2; i++) add(new THREE.BoxGeometry(0.9, 0.08, 0.3), EMIT(2.2, 1.9, 1.5), i * 4, BRIDGE.y - BRIDGE.thick / 2 - 0.05, BRIDGE.z);
  const under = new THREE.PointLight(0xffd9a0, 3, 18, 1.6); under.position.set(0, BRIDGE.y - 1.5, BRIDGE.z); scene.add(under);
  // embers under the bridge ("some bridges burn")
  const NE = 260, ePos = new Float32Array(NE * 3), eSeed = [...Array(NE)].map(() => [(r() - 0.5) * 16, r() * 7, (r() - 0.5) * 6, 0.4 + r()]);
  const emberGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(ePos, 3));
  const emberMat = new THREE.PointsMaterial({ color: new THREE.Color(3.5, 1.2, 0.25), size: 0.09, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const embers = new THREE.Points(emberGeo, emberMat); embers.position.set(0, 0, BRIDGE.z); scene.add(embers);
  const fire = new THREE.PointLight(0xff6a1a, 0, 22, 1.5); fire.position.set(0, 1.5, BRIDGE.z); scene.add(fire);

  // ---- the church closing the street (the sun rises behind it)
  const stone = new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: 0.95 });
  // the church is a gateway: a passage runs straight through it under the tower
  solid.push(add(new THREE.BoxGeometry(10, 22, 14), stone, -8, 11, CHURCH.z), add(new THREE.BoxGeometry(10, 22, 14), stone, 8, 11, CHURCH.z));
  solid.push(add(new THREE.BoxGeometry(6.4, 10, 14), stone, 0, 17, CHURCH.z));
  add(new THREE.BoxGeometry(7, 26, 7), stone, 0, 35, CHURCH.z - 2);
  add(new THREE.ConeGeometry(4.2, 12, 4), stone, 0, 54, CHURCH.z - 2).rotation.y = Math.PI / 4;
  // the tower beyond the gateway: the same stone spire as before, only further and taller, the R on its tip
  solid.push(add(new THREE.BoxGeometry(7, 50, 7), stone, 0, 25, -425));
  add(new THREE.ConeGeometry(4.2, 12, 4), stone, 0, 56, -425).rotation.y = Math.PI / 4;
  // the letter R crowns the spire: a monument in blood-dark steel, lit from below like a landmark, turning slowly
  const rGeo = new TextGeometry('R', { font: fonts.roman, size: 6.5, height: 1.4, curveSegments: 16, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.15, bevelSegments: 4 });
  rGeo.computeBoundingBox(); const rb = rGeo.boundingBox; rGeo.translate(-(rb.max.x + rb.min.x) / 2, -rb.min.y, -(rb.max.z + rb.min.z) / 2);
  const steel = new THREE.MeshStandardMaterial({ color: 0x6a0c12, roughness: 0.34, metalness: 0.6, emissive: 0x3a0408, emissiveIntensity: 0.4 });
  const R = new THREE.Mesh(rGeo, steel);
  R.position.set(0, 63.2, -425); scene.add(R);
  add(new THREE.CylinderGeometry(1.1, 1.4, 0.8, 24), new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.5, metalness: 0.7 }), 0, 63.2, -425);
  // the capitals that complete KARMA around the R on the spire, in the same steel; they land one by one at the end
  const karmaLetters = [];
  [['K', -14.6], ['A', -7.6], ['M', 7.4], ['A', 15.2]].forEach(([ch, x], i) => {
    const g = new TextGeometry(ch, { font: fonts.roman, size: 6.0, height: 1.3, curveSegments: 16, bevelEnabled: true, bevelThickness: 0.22, bevelSize: 0.14, bevelSegments: 4 });
    g.computeBoundingBox(); const b = g.boundingBox; g.translate(-(b.max.x + b.min.x) / 2, -b.min.y, -(b.max.z + b.min.z) / 2);
    const m = new THREE.Mesh(g, steel); m.position.set(x, 63.4, -425); m.visible = false; m.userData = { x, order: i === 1 || i === 2 ? 0 : 1 }; scene.add(m); karmaLetters.push(m);   // inner pair first, then the outer
  });
  const rSpots = [];
  for (const sx of [-5, 5]) { const sp = new THREE.SpotLight(0xdfe6ff, 1700, 45, 0.33, 0.5, 1.3); sp.position.set(sx, 55.6, -425 + 7); sp.target = R; scene.add(sp); rSpots.push(sp); }
  for (const sx of [-12, 12]) { const sp = new THREE.SpotLight(0xdfe6ff, 1400, 45, 0.4, 0.5, 1.3); sp.position.set(sx * 1.4, 53.6, -425 + 10); sp.target.position.set(sx, 65.6, -425); scene.add(sp, sp.target); rSpots.push(sp); }
  const rRim = new THREE.PointLight(0xff2a2a, 60, 30, 1.5); rRim.position.set(0, 68, -425 - 6); scene.add(rRim);
  const rose = add(new THREE.CircleGeometry(3.2, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.16, 0.03, 0.03) }), 0, 14, CHURCH.z + 7.05);
  add(new THREE.RingGeometry(3.1, 3.4, 48), stone, 0, 14, CHURCH.z + 7.08);
  { const g = new TextGeometry('RS', { font: fonts.roman, size: 3.0, height: 0.12, curveSegments: 12, bevelEnabled: false }); g.computeBoundingBox(); const b = g.boundingBox;
    g.translate(-(b.max.x + b.min.x) / 2, -(b.max.y + b.min.y) / 2, 0);
    const rs = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x3a0609, roughness: 0.4, metalness: 0.5, emissive: 0x2a0406, emissiveIntensity: 0.5 })); rs.position.set(0, 14, CHURCH.z + 7.1); scene.add(rs); }
  // the door: two leaves that swing outward on "free", and the light beyond them
  const doorW = 3.4, doorH = 4.6, DZ = CHURCH.z + 7.0;
  const doorLight = add(new THREE.PlaneGeometry(doorW, doorH), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.37, 0.4) }), 0, doorH / 2, DZ + 0.02);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2a0d10, roughness: 0.6, metalness: 0.2 });
  const leaves = [];
  for (const sx of [-1, 1]) { const hinge = new THREE.Group(); hinge.position.set(sx * doorW / 2, 0, DZ + 0.1); scene.add(hinge);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(doorW / 2, doorH, 0.16), leafMat); leaf.position.set(-sx * doorW / 4, doorH / 2, 0); hinge.add(leaf);
    for (let k = 0; k < 3; k++) { const stud = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.06), new THREE.MeshStandardMaterial({ color: 0x6a6660, metalness: 0.8, roughness: 0.3 })); stud.position.set(-sx * doorW / 4, 0.8 + k * 1.5, 0.1); hinge.add(stud); }
    hinge.userData.sx = sx; leaves.push(hinge); }
  const glow = new THREE.PointLight(0xe8eeff, 0, 40, 1.3); glow.position.set(0, 2.5, DZ + 2); scene.add(glow);
  const inside = new THREE.Mesh(new THREE.SphereGeometry(9.5, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 1.25, 1.35), side: THREE.BackSide, fog: false })); inside.position.set(0, 4, CHURCH.z - 1.5); inside.visible = false; scene.add(inside);
  const lastLine = timing.lines[timing.lines.length - 1];
  const T_FREE = (lastLine.words || []).find(w => /free/i.test(w.w))?.t ?? lastLine.t + 2.4;
  for (const i of [-3, -2, 2, 3]) add(new THREE.BoxGeometry(0.4, 2.2, 0.4), stone, i * 3.4, 1.1, CHURCH.z + 10);   // steps' bollards, clear of the road text

  // ---- the hero apartment behind the real window hole
  const room = new THREE.Group(); scene.add(room);
  const paper = new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 0.95 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x241810, roughness: 0.55, metalness: 0.05 });
  const RX0 = ROOM.x0 + 0.55, RX1 = ROOM.x1, RZ0 = ROOM.z0, RZ1 = ROOM.z1, RY0 = ROOM.y0, RY1 = ROOM.y1, RW = RZ1 - RZ0, RD = RX1 - RX0, RH = RY1 - RY0;
  const floor = add(new THREE.PlaneGeometry(RD, RW), wood, (RX0 + RX1) / 2, RY0 + 0.01, (RZ0 + RZ1) / 2, room); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  const ceil = add(new THREE.PlaneGeometry(RD, RW), new THREE.MeshStandardMaterial({ color: 0x2a2520, roughness: 1 }), (RX0 + RX1) / 2, RY1 - 0.01, (RZ0 + RZ1) / 2, room); ceil.rotation.x = Math.PI / 2;
  const back = add(new THREE.PlaneGeometry(RW, RH), paper, RX1 - 0.01, (RY0 + RY1) / 2, (RZ0 + RZ1) / 2, room); back.rotation.y = -Math.PI / 2;
  const wl = add(new THREE.PlaneGeometry(RD, RH), paper, (RX0 + RX1) / 2, (RY0 + RY1) / 2, RZ0 + 0.01, room);
  const wr = add(new THREE.PlaneGeometry(RD, RH), paper, (RX0 + RX1) / 2, (RY0 + RY1) / 2, RZ1 - 0.01, room); wr.rotation.y = Math.PI;
  // the window wall from inside (around the hole) + frame + glass
  const W = ROOM.win;
  for (const [cz, cw] of [[(RZ0 + W.z - W.w / 2) / 2, W.z - W.w / 2 - RZ0], [(W.z + W.w / 2 + RZ1) / 2, RZ1 - W.z - W.w / 2]]) { const p = add(new THREE.PlaneGeometry(cw, RH), paper, RX0 + 0.01, (RY0 + RY1) / 2, cz, room); p.rotation.y = Math.PI / 2; }
  for (const [cy, ch] of [[(RY0 + W.y - W.h / 2) / 2, W.y - W.h / 2 - RY0], [(W.y + W.h / 2 + RY1) / 2, RY1 - W.y - W.h / 2]]) { const p = add(new THREE.PlaneGeometry(W.w, ch), paper, RX0 + 0.01, cy, W.z, room); p.rotation.y = Math.PI / 2; }
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.6 });
  add(new THREE.BoxGeometry(0.12, W.h + 0.2, 0.12), frameMat, ROOM.x0 + 0.3, W.y, W.z - W.w / 2 - 0.02, room);
  add(new THREE.BoxGeometry(0.12, W.h + 0.2, 0.12), frameMat, ROOM.x0 + 0.3, W.y, W.z + W.w / 2 + 0.02, room);
  add(new THREE.BoxGeometry(0.12, 0.12, W.w + 0.3), frameMat, ROOM.x0 + 0.3, W.y - W.h / 2 - 0.02, W.z, room);
  add(new THREE.BoxGeometry(0.12, 0.12, W.w + 0.3), frameMat, ROOM.x0 + 0.3, W.y + W.h / 2 + 0.02, W.z, room);
  add(new THREE.BoxGeometry(0.06, W.h, 0.06), frameMat, ROOM.x0 + 0.3, W.y, W.z, room);
  const curtain = add(new THREE.BoxGeometry(0.1, W.h + 0.6, 0.7), new THREE.MeshStandardMaterial({ color: 0x3a1a16, roughness: 1 }), RX0 + 0.35, W.y + 0.1, W.z + W.w / 2 + 0.3, room);
  // furniture: bed, chair at the window, table with a bottle and a glass, a picture, a floor lamp
  add(new THREE.BoxGeometry(2.2, 0.5, 1.5), new THREE.MeshStandardMaterial({ color: 0x2b2a30, roughness: 1 }), RX1 - 1.3, RY0 + 0.25, RZ1 - 1.0, room);
  add(new THREE.BoxGeometry(0.12, 1.1, 1.5), wood, RX1 - 0.25, RY0 + 0.55, RZ1 - 1.0, room);
  add(new THREE.BoxGeometry(0.6, 0.08, 0.6), wood, RX0 + 1.1, RY0 + 0.5, RZ0 + 0.9, room);
  add(new THREE.BoxGeometry(0.08, 0.7, 0.6), wood, RX0 + 1.38, RY0 + 0.85, RZ0 + 0.9, room);
  add(new THREE.CylinderGeometry(0.45, 0.45, 0.06, 20), wood, RX0 + 2.6, RY0 + 0.75, RZ0 + 0.9, room);
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.75), wood, RX0 + 2.6, RY0 + 0.37, RZ0 + 0.9, room);
  add(new THREE.CylinderGeometry(0.06, 0.07, 0.34, 10), new THREE.MeshPhysicalMaterial({ color: 0x1c2a1a, roughness: 0.15, transmission: 0.5, thickness: 0.3 }), RX0 + 2.45, RY0 + 0.95, RZ0 + 0.8, room);
  add(new THREE.CylinderGeometry(0.05, 0.04, 0.12, 10), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transmission: 0.9, thickness: 0.1 }), RX0 + 2.8, RY0 + 0.84, RZ0 + 1.05, room);
  add(new THREE.BoxGeometry(0.03, 0.6, 0.8), new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 0.9 }), RX1 - 0.03, RY0 + 1.35, RZ0 + 0.9, room);
  add(new THREE.CylinderGeometry(0.02, 0.02, 1.5), STEEL(), RX1 - 0.7, RY0 + 0.75, RZ0 + 0.5, room);
  const shade = add(new THREE.ConeGeometry(0.32, 0.4, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xe8d4a8, roughness: 1, side: THREE.DoubleSide, emissive: 0xffc070, emissiveIntensity: 0.8 }), RX1 - 0.7, RY0 + 1.65, RZ0 + 0.5, room);
  const fill = new THREE.PointLight(0xffd9b0, 2.5, 9, 1.6); fill.position.set((RX0 + RX1) / 2, RY1 - 0.3, (RZ0 + RZ1) / 2); room.add(fill);
  const lamp = new THREE.PointLight(0xffb878, 7, 10, 1.7); lamp.position.set(RX1 - 0.7, RY0 + 1.5, RZ0 + 0.5); lamp.castShadow = false; room.add(lamp);
  // the man on the edge of the bed, facing the window
  const man = figure(0.85, new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.9 })); man.position.set(RX1 - 0.9, RY0 + 0.5, RZ1 - 0.5); man.rotation.y = Math.PI / 2 + 0.5; man.scale.y = 0.72; room.add(man);
  const roomLightOn = 1;

  // ---- a bar on the left, halfway down the intro walk: ROMAN'S, in tired neon
  const signMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.1, 0.14, 0.1) });
  const signGeo = new TextGeometry("ROMAN'S", { font, size: 0.62, height: 0.05, curveSegments: 10 });
  signGeo.computeBoundingBox(); signGeo.translate(-(signGeo.boundingBox.max.x + signGeo.boundingBox.min.x) / 2, 0, 0);
  const sign = new THREE.Mesh(signGeo, signMat); sign.position.set(-FACADE + 0.12, 4.3, -37); sign.rotation.y = Math.PI / 2; scene.add(sign);
  add(new THREE.BoxGeometry(0.1, 0.9, 3.4), new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.9 }), -FACADE + 0.05, 4.55, -37);
  const signLight = new THREE.PointLight(0xff2a1a, 4, 9, 1.8); signLight.position.set(-FACADE + 1.2, 4.2, -37); scene.add(signLight);
  add(new THREE.PlaneGeometry(1.1, 2.3), EMIT(1.2, 0.8, 0.45), -FACADE + 0.03, 1.15, -37.2).rotation.y = Math.PI / 2;   // the bar door, lit

  // ---- the opening credits: ROMAN in the same blood-steel as the R, hanging over the street as the camera descends
  const credits = new THREE.Group(); scene.add(credits);
  const nameGeo = new TextGeometry('ROMAN', { font: fonts.roman, size: 7, height: 1.6, curveSegments: 16, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.16, bevelSegments: 4 });
  nameGeo.computeBoundingBox(); const nb = nameGeo.boundingBox; nameGeo.translate(-(nb.max.x + nb.min.x) / 2, -(nb.max.y + nb.min.y) / 2, -(nb.max.z + nb.min.z) / 2);
  const nameMesh = new THREE.Mesh(nameGeo, new THREE.MeshStandardMaterial({ color: 0x7a0e14, roughness: 0.3, metalness: 0.55, emissive: 0x4a060a, emissiveIntensity: 0.9 })); credits.add(nameMesh);
  const titleGeo = new TextGeometry('When God Wants to Make You Stronger', { font: fonts.italic, size: 1.3, height: 0.3, curveSegments: 10, bevelEnabled: false });
  titleGeo.computeBoundingBox(); const tb = titleGeo.boundingBox; titleGeo.translate(-(tb.max.x + tb.min.x) / 2, 0, 0);
  const titleMesh = new THREE.Mesh(titleGeo, new THREE.MeshStandardMaterial({ color: 0x6a0c12, roughness: 0.4, metalness: 0.5, emissive: 0x4a060a, emissiveIntensity: 0.8 })); titleMesh.position.y = -5.4; credits.add(titleMesh);   // the song name, same blood-steel
  credits.position.set(0, 58, -62);
  for (const sx of [-12, 12]) { const sp = new THREE.SpotLight(0xdfe6ff, 16000, 70, 0.55, 0.5, 1.1); sp.position.set(sx, -10, 26); sp.target = nameMesh; credits.add(sp); }
  const cKey = new THREE.PointLight(0xffe6e0, 900, 60, 1.3); cKey.position.set(0, 6, 22); credits.add(cKey);
  const cRim = new THREE.PointLight(0xff2a2a, 400, 50, 1.4); cRim.position.set(0, 8, -10); credits.add(cRim);
  const T_FIRST = timing.lines[0].t;

  // ---- walkers with umbrellas, always somewhere on the pavements
  const walkers = [];
  for (let i = 0; i < 7; i++) {
    const f = figure(0.9 + r() * 0.2, INK(), true); const s = i % 2 ? 1 : -1;
    f.userData.w = { x: s * (FACADE - 1.6 - r() * 0.8), z: 30 - r() * 330, v: (r() < 0.5 ? 1 : -1) * (0.8 + r() * 0.6) };
    f.rotation.y = f.userData.w.v < 0 ? 0 : Math.PI; scene.add(f); walkers.push(f);
  }
  // ---- the crowd that turns its back (Rap 1, "they watched me fall and turned their backs")
  const T_CROWD = lineT('turned their backs');
  const crowd = [];
  const A = ALLEYS[0];
  const crowdMat = new THREE.MeshStandardMaterial({ color: 0x16131a, roughness: 0.85 });
  for (let i = 0; i < 11; i++) { const f = figure(0.95 + r() * 0.2, crowdMat); f.position.set(-(FACADE + 11.5) - (i % 2) * 1.3 - r() * 0.5, 0, A.z - A.w / 2 + 0.6 + (i / 11) * (A.w - 1.2)); f.rotation.y = Math.PI / 2; f.userData.ph = r(); scene.add(f); crowd.push(f); }
  // ---- two walking together (Pre-Chorus, "you were walking with me there")
  const T_TWO = lineT('walking with me');
  let twoZ = 0;
  const two = [figure(0.95), figure(0.95, new THREE.MeshStandardMaterial({ color: 0x2a2418, roughness: 0.6, emissive: 0xffc070, emissiveIntensity: 0.35 }))];
  two.forEach((f, i) => { f.position.set(-0.6 + i * 1.2, 0, -120); f.visible = false; scene.add(f); });

  // ---- the drowning (Rap 1, "they watched me drown"): a flooded alley, a head at the surface, twenty hands pushing down
  const T_DROWN = lineT('watched me drown');
  const pool = new THREE.Group(); scene.add(pool);
  const PX = -(FACADE + 10), PZ = A.z;                           // the flooded end of the first alley
  const waterGeo = new THREE.PlaneGeometry(14, A.w + 1, 70, 24);
  const water = new THREE.Mesh(waterGeo, new THREE.MeshStandardMaterial({ color: 0x0a1218, roughness: 0.25, metalness: 0.35, transparent: true, opacity: 0.72, side: THREE.DoubleSide }));
  water.rotation.x = -Math.PI / 2; water.position.set(PX, 0.42, PZ); pool.add(water);
  const w0 = waterGeo.attributes.position.array.slice();
  const victim = new THREE.Group(); victim.position.set(PX - 1.2, 0.42, PZ); pool.add(victim);
  const vm = new THREE.MeshStandardMaterial({ color: 0x0b0a0c, roughness: 0.9 });
  const vHead = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), vm); vHead.position.y = 0.12; victim.add(vHead);
  const vSh = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.3, 4, 12), vm); vSh.rotation.z = Math.PI / 2; vSh.position.y = -0.25; victim.add(vSh);
  for (const s of [-1, 1]) { const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.8, 4, 8), vm); arm.position.set(s * 0.45, 0.25, 0.1 * s); arm.rotation.z = s * 0.5; victim.add(arm); }
  const hands = [];
  const handMat = new THREE.MeshStandardMaterial({ color: 0x17100f, roughness: 0.75 });
  const HR = 0.5 + r() * 0.0;                                             // all arms are built around the victim's head
  for (let i = 0; i < 20; i++) {
    // shoulder → upper arm → elbow → forearm → wrist → palm → fingers, each a child of the one before
    const arm = new THREE.Group();
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 1.25, 4, 10), handMat); upper.position.y = -0.62; arm.add(upper);
    const elbow = new THREE.Group(); elbow.position.y = -1.25; arm.add(elbow);
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 1.1, 4, 10), handMat); fore.position.y = -0.55; elbow.add(fore);
    const wrist = new THREE.Group(); wrist.position.y = -1.1; elbow.add(wrist);
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 10), handMat); palm.scale.set(1, 0.42, 1.2); palm.position.y = -0.08; wrist.add(palm);
    const fingers = [];
    for (let f = 0; f < 4; f++) {
      const base = new THREE.Group(); base.position.set(-0.1 + f * 0.067, -0.08, 0.15); wrist.add(base);
      const p1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.16, 3, 6), handMat); p1.rotation.x = Math.PI / 2; p1.position.z = 0.1; base.add(p1);
      const knuckle = new THREE.Group(); knuckle.position.z = 0.2; base.add(knuckle);
      const p2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.023, 0.14, 3, 6), handMat); p2.rotation.x = Math.PI / 2; p2.position.z = 0.08; knuckle.add(p2);
      fingers.push({ base, knuckle });
    }
    const thumb = new THREE.Group(); thumb.position.set(0.15, -0.06, 0.02); thumb.rotation.y = -0.9; thumb.rotation.z = 0.5; wrist.add(thumb);
    const tp = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.16, 3, 6), handMat); tp.rotation.x = Math.PI / 2; tp.position.z = 0.1; thumb.add(tp);
    const ang = (i / 20) * Math.PI * 2 + (r() - 0.5) * 0.35, radius = 0.22 + (i % 4) * 0.09, tilt = 0.55 + r() * 0.5;
    arm.userData = { ang, radius, tilt, delay: r(), ph: r() * 6, elbow, wrist, fingers, thumb, sway: (r() - 0.5) * 0.4 };
    pool.add(arm); hands.push(arm);
  }
  // rings on the water where the hands press
  const pressRings = [];
  for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.115, 40), new THREE.MeshBasicMaterial({ color: 0x7a8494, transparent: true, opacity: 0 })); m.rotation.x = -Math.PI / 2; m.position.set(PX - 1.2, 0.44, PZ); m.userData.ph = i / 10; pool.add(m); pressRings.push(m); }
  const NB = 70, bPos = new Float32Array(NB * 3), bLife = new Float32Array(NB).map(() => Math.random());
  const bubbleGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(bPos, 3));
  const bubbles = new THREE.Points(bubbleGeo, new THREE.PointsMaterial({ map: puffTex, size: 0.09, transparent: true, depthWrite: false, opacity: 0.8, color: 0xcfe0ee })); bubbles.visible = false; scene.add(bubbles);
  const poolLight = new THREE.PointLight(0xcfd8ff, 0, 14, 1.6); poolLight.position.set(PX + 2, 4.5, PZ); pool.add(poolLight);
  // a hard backlight at the end of the alley: the head and the hands become silhouettes on lit water
  const poolBack = new THREE.PointLight(0xe8eeff, 0, 30, 1.2); poolBack.position.set(PX - 3.6, 3.0, PZ); pool.add(poolBack);
  const backWall = add(new THREE.PlaneGeometry(A.w + 1, 7), new THREE.MeshStandardMaterial({ color: 0x3a3f48, roughness: 1 }), PX - 6.6, 3.5, PZ, pool); backWall.rotation.y = Math.PI / 2;
  pool.visible = false;

  // ---- "the truth behind their eyes": two eyes float ahead, look around, then flip to show their backs — hollow, bleeding
  const T_EYES = lineT('behind their eyes');
  const eyes = new THREE.Group(); eyes.visible = false; scene.add(eyes);
  const irises = [];
  for (const sx of [-0.6, 0.6]) {
    const e = new THREE.Group(); e.position.x = sx; eyes.add(e);
    const front = new THREE.Group(); e.add(front);
    front.add(new THREE.Mesh(new THREE.CircleGeometry(0.36, 48), new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.35, emissive: 0x777066, emissiveIntensity: 0.3 })));
    const iris = new THREE.Group(); iris.position.z = 0.006; front.add(iris); irises.push(iris);
    iris.add(new THREE.Mesh(new THREE.CircleGeometry(0.16, 40), new THREE.MeshStandardMaterial({ color: 0x3a4a5c, roughness: 0.3 })));
    const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.075, 32), new THREE.MeshBasicMaterial({ color: 0x000000 })); pupil.position.z = 0.004; iris.add(pupil);
    const glint = new THREE.Mesh(new THREE.CircleGeometry(0.026, 16), new THREE.MeshBasicMaterial({ color: 0xffffff })); glint.position.set(0.05, 0.065, 0.006); iris.add(glint);
    // the back of the eye: a hollow socket, dark and wet, a drip of blood
    const back = new THREE.Group(); back.rotation.y = Math.PI; back.position.z = -0.01; e.add(back);
    back.add(new THREE.Mesh(new THREE.CircleGeometry(0.36, 48), new THREE.MeshStandardMaterial({ color: 0x1a0507, roughness: 0.35, emissive: 0x120204, emissiveIntensity: 0.3 })));
    const hollow = new THREE.Mesh(new THREE.CircleGeometry(0.22, 40), new THREE.MeshBasicMaterial({ color: 0x030101 })); hollow.position.z = 0.004; back.add(hollow);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.26, 40), new THREE.MeshStandardMaterial({ color: 0x5a060a, roughness: 0.25 })); ring.position.z = 0.005; back.add(ring);
    const drip = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.55, 4, 8), new THREE.MeshStandardMaterial({ color: 0x5a060a, roughness: 0.3 })); drip.position.set(-0.06, -0.55, 0.004); back.add(drip);
  }
  let eyesPlaced = false;
  solid.push(...crowd, victim, ...hands, eyes);

  // ---- "my heart still breaks, but still it beats": a heart hangs by a chain from the wires under the line, beating, dripping
  const T_HEART = lineT('heart still breaks');
  const heart = new THREE.Group(); heart.visible = false; scene.add(heart);
  const hGeo = new THREE.SphereGeometry(0.3, 48, 36);
  { const pa = hGeo.attributes.position; const v = new THREE.Vector3();
    for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i); const n = v.clone().normalize();
      const lump = 1 + 0.12 * Math.sin(n.x * 7 + n.y * 3) * Math.sin(n.z * 6 + 1) + 0.08 * Math.sin(n.y * 11) + (n.y > 0.5 ? -0.12 * (n.y - 0.5) : 0) + (Math.abs(n.x) < 0.08 && n.y > 0 ? -0.06 : 0);
      v.multiplyScalar(lump * (1 + 0.25 * Math.max(0, -n.y)) ); v.x *= 1.08; pa.setXYZ(i, v.x, v.y * 1.15, v.z * 0.9); }
    hGeo.computeVertexNormals(); }
  const flesh = new THREE.MeshPhysicalMaterial({ color: 0x4a0509, roughness: 0.38, metalness: 0.0, clearcoat: 0.7, clearcoatRoughness: 0.25, sheen: 0.3, sheenColor: new THREE.Color(0x7a1014) });
  const hBody = new THREE.Mesh(hGeo, flesh); heart.add(hBody);
  for (const [x, z, tl] of [[0.08, 0.02, 0.3], [-0.1, -0.05, 0.2], [0.02, 0.12, -0.25]]) { const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.22, 12), new THREE.MeshPhysicalMaterial({ color: 0x3a0a14, roughness: 0.45, clearcoat: 0.5 })); tube.position.set(x, 0.36, z); tube.rotation.z = tl; hBody.add(tube); }
  const veinMat = new THREE.MeshStandardMaterial({ color: 0x2a1030, roughness: 0.5 });
  for (let i = 0; i < 5; i++) { const vein = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.012, 6, 24, 1.6), veinMat); vein.rotation.set(r() * 3, r() * 3, r() * 3); hBody.add(vein); }
  const crack = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.42, 0.06), new THREE.MeshBasicMaterial({ color: 0x050102 })); crack.position.set(0.02, -0.02, 0.27); crack.rotation.z = 0.25; crack.visible = false; hBody.add(crack);
  const chainMat = new THREE.MeshStandardMaterial({ color: 0x8a8a90, roughness: 0.35, metalness: 1 });
  const links = [];
  for (let i = 0; i < 14; i++) { const l = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 8, 16), chainMat); l.rotation.y = i % 2 ? Math.PI / 2 : 0; l.position.y = 0.42 + i * 0.085; heart.add(l); links.push(l); }
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 16, Math.PI), chainMat); hook.position.y = 0.42 + 14 * 0.085; heart.add(hook);
  const hDrip = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.12, 4, 8), new THREE.MeshStandardMaterial({ color: 0x5a060a, roughness: 0.3 })); hDrip.position.set(0.04, -0.4, 0.05); heart.add(hDrip);
  const hDrops = []; for (let i = 0; i < 3; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), new THREE.MeshStandardMaterial({ color: 0x5a060a, roughness: 0.3 })); d.userData.ph = i / 3; heart.add(d); hDrops.push(d); }
  const hPool = new THREE.Mesh(new THREE.CircleGeometry(0.01, 24), new THREE.MeshStandardMaterial({ color: 0x3a0406, roughness: 0.15, metalness: 0.2 })); hPool.rotation.x = -Math.PI / 2; scene.add(hPool); hPool.visible = false;
  const hLight = new THREE.PointLight(0xdfe6ff, 0, 6, 1.6); heart.add(hLight); hLight.position.set(0.6, 0.4, 0.9);
  const hWire = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 2 * FACADE), new THREE.MeshStandardMaterial({ color: 0x0a0a0c })); hWire.rotation.z = Math.PI / 2; scene.add(hWire); hWire.visible = false;
  let heartPlaced = false;
  solid.push(hBody);

  // ---- KARMA IS NEAR, painted on the road in faint red on the last stretch of the avenue, stretched like road lettering
  {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 1024; const g = c.getContext('2d');
    const draw = () => { g.clearRect(0, 0, 1024, 1024); g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '900 250px "Playfair Display", Georgia, serif'; g.fillText('KARMA', 512, 300); g.fillText('IS NEAR', 512, 740); };   // from the air above the church: KARMA far, IS NEAR near
    draw();
    const tex = new THREE.CanvasTexture(c); tex.anisotropy = 8;
    const paint = new THREE.Mesh(new THREE.PlaneGeometry(28, 28), new THREE.MeshStandardMaterial({ map: tex, alphaMap: tex, transparent: true, opacity: 0.94, color: 0xa01c16, emissive: 0x5a0a08, emissiveIntensity: 0.9, roughness: 0.95, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    paint.rotation.x = -Math.PI / 2; paint.rotation.z = Math.PI; paint.position.set(0, 0.045, -300); paint.visible = false; scene.add(paint); roadPaint = paint;   // reads from the air, above the church
    document.fonts?.ready.then(() => { draw(); tex.needsUpdate = true; });
  }

  // ---- the void after the door: GOD and ROMAN in blood-steel; blood drips from their letters and writes KARMA IS NEAR
  const voidG = new THREE.Group(); voidG.position.set(0, 500, 0); voidG.visible = false; scene.add(voidG);
  const vSteel = new THREE.MeshStandardMaterial({ color: 0x6a0c12, roughness: 0.34, metalness: 0.6, emissive: 0x3a0408, emissiveIntensity: 0.45 });
  const mkWord = (txt, size, y) => { const g = new TextGeometry(txt, { font: fonts.roman, size, height: size * 0.22, curveSegments: 14, bevelEnabled: true, bevelThickness: size * 0.03, bevelSize: size * 0.02, bevelSegments: 3 });
    g.computeBoundingBox(); const b = g.boundingBox; g.translate(-(b.max.x + b.min.x) / 2, 0, -(b.max.z + b.min.z) / 2); const m = new THREE.Mesh(g, vSteel); m.position.y = y; voidG.add(m); return { m, w: b.max.x - b.min.x }; };
  const GOD = { m: new THREE.Group() }; voidG.add(GOD.m);                   // (GOD was cut: the void holds only the red ROMAN credits)
  const vKey = new THREE.PointLight(0xdfe6ff, 900, 80, 1.2); vKey.position.set(-8, 20, 16); voidG.add(vKey);
  const vKey2 = new THREE.PointLight(0xff3a3a, 300, 60, 1.3); vKey2.position.set(10, 0, 10); voidG.add(vKey2);
  const vFill = new THREE.AmbientLight(0x404048, 0.4); voidG.add(vFill);
  // ---- birds at dawn
  const wing = new THREE.BufferGeometry();
  wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -0.6, 0.14, 0.12, -0.12, 0, -0.18, 0, 0, 0, 0.6, 0.14, 0.12, 0.12, 0, -0.18], 3));
  const birds = new THREE.InstancedMesh(wing, new THREE.MeshBasicMaterial({ color: 0x050506, side: THREE.DoubleSide }), 48);
  const bSeed = [...Array(48)].map(() => ({ a: r() * 6.28, rr: 6 + r() * 14, h: 26 + r() * 14, v: 0.3 + r() * 0.4, ph: r() * 6, s: 0.7 + r() * 0.9 }));
  birds.visible = false; scene.add(birds);
  const T_DAWN = timing.sections.find(s => s.name === 'Final Chorus')?.t ?? 256;

  return {
    room, pool, hands, alleyLights, solid, under: 0,
    update(dt, t, time, env, camera) {
      // walkers
      for (const f of walkers) { const w = f.userData.w; w.z += w.v * dt; if (w.z < -330) w.z = 40; if (w.z > 40) w.z = -330; f.position.set(w.x, Math.abs(Math.sin(time * 5 + w.x)) * 0.03, w.z);
        const dz = camera.position.z - w.z; f.visible = !(camera.position.y < 6 && dz > -6 && dz < 42); }   // only far down the street, never near the lens
      // crowd: faces the camera until the line, then turns its back and walks away
      const ct = T_CROWD > 0 ? t - T_CROWD : -99;
      for (const f of crowd) {
        const ph = f.userData.ph;
        f.visible = ct > -1.2 && ct < 11;
        const headTurn = ease((ct - 0.9 - ph * 0.5) / 0.7), bodyTurn = ease((ct - 1.7 - ph * 0.6) / 1.1), walk = clamp((ct - 3.0 - ph * 0.8) / 0.5);
        f.userData.head.rotation.y = Math.PI * 0.6 * headTurn * (1 - bodyTurn);
        f.rotation.y = Math.PI / 2 + Math.PI * bodyTurn + Math.sin(time * 0.6 + ph * 9) * 0.04;
        if (walk > 0) { f.position.x -= 0.55 * dt * walk; f.position.y = Math.abs(Math.sin(time * 4.2 + ph * 7)) * 0.045 * walk; f.rotation.z = Math.sin(time * 4.2 + ph * 7) * 0.03 * walk; }
      }
      // the two walking
      const tw = T_TWO > 0 ? t - T_TWO + 1.5 : -1;
      if (tw > 0 && !twoZ && route) twoZ = route.pose(T_TWO).pos.z - 9;             // start a few steps ahead of the walker
      two.forEach((f, i) => { f.visible = false; f.position.set(-0.6 + i * 1.2, Math.abs(Math.sin(time * 4.8 + i)) * 0.04, twoZ - tw * 1.0); f.rotation.y = 0; });
      // the heart
      const hk = T_HEART > 0 ? t - T_HEART : -99;
      heart.visible = hWire.visible = hPool.visible = hk > -2.5 && hk < 11;
      if (heart.visible) {
        if (!heartPlaced && route) {
          const idx = timing.lines.findIndex(l => l.text.toLowerCase().includes('heart still breaks'));
          const a = route.anchorFor(idx);
          const side = new THREE.Vector3(1, 0, 0).applyQuaternion(a.q);                      // hang it just past the right end of the line
          heart.position.copy(a.pos).addScaledVector(side, 4.1); heart.position.y = a.pos.y - 0.35; heart.position.z += 0.2;
          heart.position.x = Math.max(-FACADE + 1.5, Math.min(FACADE - 1.5, heart.position.x));
          const chainTop = heart.position.y + 0.42 + 14 * 0.085 + 0.06;
          hWire.position.set(0, chainTop, heart.position.z); hPool.position.set(heart.position.x + 0.04, 0.05, heart.position.z + 0.05); heartPlaced = true;
        }
        const ph = t * Math.PI * 2 * (68 / 60);
        const lub = Math.pow(Math.max(0, Math.sin(ph)), 9), dub = Math.pow(Math.max(0, Math.sin(ph - 1.1)), 14) * 0.7;
        const beat = 1 + (lub * 0.16 + dub * 0.1) * (0.8 + env.bass * 0.5);
        hBody.scale.set(beat, 1 / Math.sqrt(beat) * (0.5 + beat * 0.5), beat);
        heart.rotation.y = Math.sin(time * 0.6) * 0.35; heart.rotation.z = Math.sin(time * 0.9) * 0.04;
        crack.visible = hk > 0.85; crack.scale.y = 1 + Math.max(0, Math.min(1, (hk - 0.85) / 0.6)) * 0.4;
        hLight.intensity = 5 + lub * 3;
        hDrops.forEach(d => { const k = (t * 0.45 + d.userData.ph) % 1; d.position.set(0.04, -0.45 - k * (heart.position.y - 0.45), 0.05); d.visible = k < 0.98; });
        hPool.scale.setScalar(Math.min(1, (hk + 2.5) / 6) * 32);
      } else heartPlaced = heartPlaced && hk < 11;
      // the eyes
      const ek = T_EYES > 0 ? t - T_EYES : -99;
      eyes.visible = false;                                                   // (the eyes were cut)
      if (eyes.visible) {
        if (!eyesPlaced && route) { const cam = route.pose(T_EYES + 0.5); const f = cam.look.clone().sub(cam.pos); f.y = 0; f.normalize();
          eyes.position.copy(cam.pos).addScaledVector(f, 5.5); eyes.position.y = cam.pos.y + 2.7; eyes.rotation.y = Math.atan2(cam.pos.x - eyes.position.x, cam.pos.z - eyes.position.z); eyesPlaced = true; }
        const open = ease((ek + 0.6) / 0.8), flip = ease((ek - 1.9) / 0.9), gone = ease((ek - 5.2) / 1.2);
        eyes.scale.set(open * (1 - gone * 0.5), open * (1 - gone), 1);
        eyes.children.forEach(e => { e.rotation.y = Math.PI * flip; });
        irises.forEach(ir => ir.position.set(Math.sin(time * 1.7) * 0.1 * (1 - flip), Math.cos(time * 1.1) * 0.05 * (1 - flip), 0.005));
      } else eyesPlaced = eyesPlaced && ek < 6.5;
      // the drowning
      const dk = T_DROWN > 0 ? t - T_DROWN : -1;
      if (dk > -0.9 && dk < 5.5) {                                           // they stand around the water and watch
        const cf = new THREE.Vector3(); camera.getWorldDirection(cf); cf.y = 0; cf.normalize();
        crowd.forEach((f, i) => { const a = (i / (crowd.length - 1) - 0.5) * 2.3, cs = Math.cos(a), sn = Math.sin(a);
          const dx = cf.x * cs - cf.z * sn, dz = cf.x * sn + cf.z * cs, rad = 3.2 + (i % 3) * 0.4;
          f.visible = true; f.position.set(camera.position.x + dx * rad, 0, camera.position.z + dz * rad);
          f.rotation.y = Math.atan2(camera.position.x - f.position.x, camera.position.z - f.position.z) + Math.PI + Math.sin(time * 0.5 + i) * 0.03;
          f.rotation.z = 0; f.userData.head.rotation.set(0.42, 0, 0); });
      } else if (dk >= 5.5 && dk < 60) crowd.forEach(f => (f.visible = false));
      pool.visible = dk > -1.5 && dk < 9; if (!pool.visible) { this.under = 0; bubbles.visible = false; }
      if (pool.visible) {
        const press = ease((dk - 1.0) / 1.6);                                    // the arms arrive over ~1.6 s
        const sink = ease((dk - 2.3) / 3.0);                                     // the head goes under, push by push
        const pulse = Math.pow(Math.max(0, Math.sin(time * 5.2)), 3);            // the pressing rhythm
        victim.position.y = 0.42 - sink * 0.85 - press * pulse * 0.08 + Math.sin(time * 6) * 0.03 * (1 - sink);
        victim.rotation.z = Math.sin(time * 3.1) * 0.14 * (1 - sink);
        victim.rotation.x = -0.35 * press * (1 - sink);                           // the head tilts back, gasping
        victim.children.forEach((c, k) => { if (k >= 2) { const sd = k === 2 ? -1 : 1; c.rotation.z = sd * (0.5 + Math.sin(time * 7 + k) * 0.6 * (1 - sink) * press); c.rotation.x = Math.sin(time * 9 + k * 2) * 0.4 * (1 - sink); } });
        // the viewer is the one drowning: the hands close in on the lens and force the camera under
        victim.visible = false;
        const camF = new THREE.Vector3(); camera.getWorldDirection(camF);
        const camR = new THREE.Vector3().crossVectors(camF, new THREE.Vector3(0, 1, 0)).normalize(), camU = new THREE.Vector3().crossVectors(camR, camF).normalize();
        const lens = camera.position.clone().addScaledVector(camF, 0.42);
        const hx = lens.x, hz = lens.z, hy = lens.y;
        hands.forEach(g => { const u = g.userData;
          const k = ease((dk - u.delay * 0.9 - 0.7) / 1.5);                        // this arm's descent (after you have seen them watching)
          const ca = Math.cos(u.ang), sa = Math.sin(u.ang);
          // shoulders in a ring above and around the viewer, hands aiming at the lens
          const sh = camera.position.clone().addScaledVector(camR, ca * (1.9 + u.radius * 2)).addScaledVector(camU, 1.6 + Math.max(0, sa) * 1.2 + (u.ph % 1) * 0.4).addScaledVector(camF, 0.9 + u.radius);
          const tgt = lens.clone().addScaledVector(camR, ca * u.radius * 0.9).addScaledVector(camU, sa * u.radius * 0.6 + 0.05).addScaledVector(camF, (1 - k) * 2.5 - press * pulse * 0.06 * k);
          g.position.copy(sh).addScaledVector(camR, Math.sin(time * 1.3 + u.ph) * 0.05 * u.sway);
          const L = g.position.distanceTo(tgt);
          g.lookAt(tgt); g.rotateX(-Math.PI / 2);                                  // the arm hangs along -y: point it at the lens
          const bend = Math.max(0, 1 - L / 2.35) * 1.3;
          u.elbow.rotation.x = -bend; g.rotateX(bend * 0.5);
          u.wrist.rotation.x = -0.9 + 0.6 * k;
          const curl = 0.25 + k * (0.55 + pulse * press * 0.35);
          u.fingers.forEach((f, j) => { f.base.rotation.x = -curl * (0.8 + j * 0.08); f.knuckle.rotation.x = -curl * 1.1; });
          u.thumb.rotation.x = -curl * 0.6;
        });
        this.under = Math.max(0, Math.min(1, (0.44 - camera.position.y) / 0.12));
        // under the surface the hands are pale, lit from above, so they read against the dark water
        handMat.color.setHex(0x17100f).lerp(new THREE.Color(0x7d8a94), this.under * 0.7);
        handMat.emissive.setHex(0x000000).lerp(new THREE.Color(0x2a3842), this.under); handMat.roughness = 0.75 - this.under * 0.3;
        bubbles.visible = this.under > 0;
        if (bubbles.visible) { for (let i = 0; i < NB; i++) { bLife[i] += dt * (0.35 + (i % 5) * 0.08); if (bLife[i] > 1) bLife[i] = 0; const L2 = bLife[i];
            const p = lens.clone().addScaledVector(camR, Math.sin(i * 7.3) * 0.5).addScaledVector(camU, -0.4 + L2 * 1.1).addScaledVector(camF, 0.25 + (i % 7) * 0.08); bPos.set([p.x, p.y, p.z], i * 3); }
          bubbleGeo.attributes.position.needsUpdate = true; }
        pressRings.forEach(m => { const q = (time * 0.7 + m.userData.ph) % 1; m.scale.setScalar(1 + q * 9); m.material.opacity = (1 - q) * 0.5 * press; m.position.set(camera.position.x + Math.cos(m.userData.ph * 6.28) * 0.15, 0.44, camera.position.z + Math.sin(m.userData.ph * 6.28) * 0.15); });
        const pa = waterGeo.attributes.position.array;
        for (let i = 0; i < pa.length; i += 3) { const x = w0[i], y = w0[i + 1]; const d = Math.hypot(x + 1.2, y);
          pa[i + 2] = Math.sin(x * 2.1 + time * 2.2) * 0.02 + Math.sin(y * 3.3 - time * 1.7) * 0.015 + Math.sin(d * 9 - time * 7) * 0.05 * press * Math.exp(-d * 0.9); }
        waterGeo.attributes.position.needsUpdate = true; waterGeo.computeVertexNormals();
        poolLight.intensity = 1.2 + Math.random() * 0.5 + this.under * 12; poolBack.intensity = 4 + Math.random() * 1;   // under water the surface glows above you
      }
      // embers under the bridge when the bridges burn
      const T_BURN = lineT('bridges burn');
      const bk = T_BURN > 0 ? clamp((t - T_BURN + 0.5) / 2) * (1 - clamp((t - T_BURN - 14) / 6)) : 0;
      emberMat.opacity = bk; fire.intensity = bk * (5 + Math.random() * 2);
      if (bk > 0) { eSeed.forEach(([x, y, z, v], i) => ePos.set([x + Math.sin(time + i) * 0.4, 0.2 + ((y + time * v) % 7.2), z], i * 3)); emberGeo.attributes.position.needsUpdate = true; }
      // traffic light cycle
      const ph = Math.floor(time / 4) % 3; lights.forEach((l, i) => (l.material.color.setScalar(i === [2, 1, 0][ph] ? 1 : 0.08).multiply(new THREE.Color(...[[1, 0.1, 0.05], [1, 0.6, 0.1], [0.2, 1, 0.4]][i]))));
      // steam
      for (const s of puffs) { for (let i = 0; i < NP; i++) { s.life[i] += dt * 0.25; if (s.life[i] > 1) s.life[i] = 0; const L = s.life[i];
        s.pos.set([s.x + Math.sin(i * 7 + time * 0.5) * L * 1.2, 0.2 + L * 4.5, s.z + Math.cos(i * 5) * L * 1.0], i * 3); } s.p.geometry.attributes.position.needsUpdate = true; }
      // puddle rings
      for (const m of rings) { const k = (time * 0.5 + m.userData.p) % 1; m.scale.setScalar(1 + k * 5); m.material.opacity = (1 - k) * 0.5; }
      if (roadPaint) roadPaint.visible = camera.position.y > 14;
      // the letters of KARMA land around the R once the camera has reached the tower, and swivel with it
      const tk = route ? t - route.T_TOWER : -99;
      karmaLetters.forEach(m => { const q = Math.max(0, Math.min(1, (tk - m.userData.order * 1.6) / 2.6)), k = q * q * (3 - 2 * q);   // each letter slides out of the R, slow and smooth
        m.visible = k > 0.01; const sc = 0.55 + 0.45 * k; m.scale.set(sc, sc, sc);
        m.position.set(m.userData.x * k, 63.4, -425 - (1 - k) * 1.6); m.rotation.y = R.rotation.y; });                 // KARMA IS NEAR shows only from the sky
      // "free": the city slides apart to both sides and the church door opens outward into the light
      const fk = ease((t - T_FREE) / 5), dk2 = ease((t - T_FREE - 0.6) / 2.6);
      city.part(fk * 34);
      leaves.forEach(h => { h.rotation.y = h.userData.sx * 1.9 * dk2; });
      doorLight.material.color.setRGB(0.35, 0.37, 0.4).lerp(new THREE.Color(0.5, 0.53, 0.6), dk2); doorLight.visible = dk2 < 0.5;   // once open, the passage is clear
      glow.intensity = dk2 * 22; inside.visible = false;
      // the void: once the black lifts, drops fall from GOD and ROMAN and write the words, letter by letter
      const vt = route ? t - route.T_VOID : -99;
      voidG.visible = vt > -0.2;
      // the credits come back for the end: the same red ROMAN and the title, hanging in the dark
      if (vt > -0.2) { credits.visible = true; credits.position.set(0, 500 + 2.4, 0); credits.scale.setScalar(0.5); nameMesh.rotation.y = Math.sin(time * 0.15 + 1) * 0.1;
        credits.traverse(o => { if (o.isSpotLight) o.intensity = 500; else if (o.isPointLight) o.intensity = o === cRim ? 60 : 40; }); }
      if (voidG.visible) {
        void 0;
      }
      // birds at dawn
      birds.visible = t > T_DAWN;
      if (birds.visible) { const cz = camera.position.z - 40; bSeed.forEach((b, i) => { const a = b.a + time * b.v;
        M.compose(V.set(Math.cos(a) * b.rr, b.h + Math.sin(a * 2) * 2, cz + Math.sin(a) * b.rr), Q.setFromEuler(new THREE.Euler(0, -a, Math.sin(time * 8 + b.ph) * 0.5)), new THREE.Vector3(b.s, b.s, b.s)); birds.setMatrixAt(i, M); });
        birds.instanceMatrix.needsUpdate = true; }
      R.rotation.y = Math.sin(time * 0.12) * 0.55;
      // the credits hang over the street for the intro, then sink back into the fog before the first line
      const ck2 = clamp((t - (T_FIRST - 3.5)) / 3);
      if (t < T_FIRST + 1) { credits.visible = t < T_FIRST; credits.position.set(0, 58 - ck2 * 6, -62 - ck2 * 140); nameMesh.rotation.y = Math.sin(time * 0.1) * 0.25; credits.scale.setScalar(1 - ck2 * 0.6); }
      else if (!(route && t - route.T_VOID > -0.2)) credits.visible = false;
      rose.material.color.setRGB(0.16, 0.03, 0.03);
      const sk = Math.random() < 0.02 ? 0.25 : 1; signMat.color.setRGB(1.1 * sk, 0.14 * sk, 0.1 * sk); signLight.intensity = 4 * sk;
    },
  };
}
