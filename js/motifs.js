// Per-line backdrops: a backlit noir "frame" with a silhouette motif chosen from the words of the line.
import * as THREE from 'three';
import { clamp } from './util.js?v=20261010222625';

// first rule that matches the line wins
const RULES = [
  ['door',    /\b(door|shut me out|beg)\b/],
  ['chain',   /\b(chain|price)\b/],
  ['bridge',  /\b(bridges?|flame|burn)\b/],
  ['candles', /\b(one by one|not one|counted|chances)\b/],
  ['sun',     /\b(sun|morning|hope|drawing near)\b/],
  ['heart',   /\b(heart|beats|whole|soul|still here|i'm here)\b/],
  ['house',   /\b(home|built|decay|ground|family)\b/],
  ['water',   /\b(drown|bleed|tears|breathe)\b/],
  ['mirror',  /\b(eyes|truth|lies|pretend|dressed)\b/],
  ['scars',   /\b(scars|wounds|cracks|broken|fight|break|hell)\b/],
  ['crowd',   /\b(they|them|none|those|friend)\b/],
  ['birds',   /\b(rise|fly|free|sleep|man i'm meant|strength)\b/],
  ['fall',    /\b(fall|crawl|lost|end of me)\b/],
  ['road',    /\b(road|walk|walking|way|ahead|nowhere|retreat|back|turn)\b/],
  ['bulb',    /\b(light|fade|sign|design|hears|call|said|heard)\b/],
  ['rain',    /\b(rain|pray|prayer|pain|signs)\b/],
];
export const pickMotif = text => {
  const s = text.toLowerCase();
  for (const [name, re] of RULES) if (re.test(s)) return name;
  return 'dust';
};

const glowVS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const glowFS = `uniform vec3 uC; uniform float uA, uTime, uSeed; varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1)))*43758.5453); }
  float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+1.),f.x), f.y); }
  void main(){ vec2 c = vUv - vec2(0.5, 0.46); c.x *= 1.7;
    float r = length(c);
    float g = exp(-r*r*7.0) * (0.75 + 0.5*n(vUv*4.0 + vec2(uTime*0.05, uSeed)));
    float a = g * uA; gl_FragColor = vec4(uC * a, a); }`;

const BLACK = () => new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true });
const EMIT = (r, g, b) => new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), transparent: true });

export function buildMotif(name, color, r, text) {
  const root = new THREE.Group();
  const mats = [];
  const add = (geo, mat, parent = root) => { const m = new THREE.Mesh(geo, mat); mats.push(mat); parent.add(m); return m; };
  const glowU = { uC: { value: color.clone() }, uA: { value: 0 }, uTime: { value: 0 }, uSeed: { value: r() * 50 } };
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(34, 20), new THREE.ShaderMaterial({
    vertexShader: glowVS, fragmentShader: glowFS, uniforms: glowU, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, fog: false }));
  glow.position.z = -4; root.add(glow);
  // wet floor: catches the words' shadows and the light's sheen
  const ground = add(new THREE.PlaneGeometry(60, 30), new THREE.MeshStandardMaterial({ color: 0x0a0a0d, roughness: 0.22, metalness: 0.5, transparent: true }));
  ground.receiveShadow = true;
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -3.4, 4);
  let tick = () => {};
  const fig = (sc, mat) => { const g = figure(add, sc, mat); root.add(g); return g; };
  const s = text.toLowerCase();

  switch (name) {
    case 'birds': {
      const wing = new THREE.BufferGeometry();
      wing.setAttribute('position', new THREE.Float32BufferAttribute([0,0,0, -0.5,0.12,0.1, -0.1,0,-0.15, 0,0,0, 0.5,0.12,0.1, 0.1,0,-0.15], 3));
      const birds = [];
      for (let i = 0; i < 34; i++) {
        const b = add(wing, BLACK()); b.material.side = THREE.DoubleSide;
        b.userData = { x: (r() - 0.5) * 14, y: -3 - r() * 4, v: 0.8 + r() * 1.2, ph: r() * 6, sc: 0.5 + r() * 0.8, sway: (r() - 0.5) * 0.8 };
        birds.push(b);
      }
      tick = (age) => birds.forEach(b => { const u = b.userData;
        b.position.set(u.x + Math.sin(age * 0.7 + u.ph) * u.sway + u.x * age * 0.04, u.y + age * u.v, Math.sin(u.ph) * 2);
        b.scale.set(u.sc, u.sc * (0.4 + Math.abs(Math.sin(age * 7 + u.ph))), u.sc); });
      break;
    }
    case 'fall': {
      const shards = [];
      for (let i = 0; i < 46; i++) {
        const m = add(new THREE.BoxGeometry(0.05 + r() * 0.2, 0.3 + r() * 0.9, 0.02), BLACK());
        m.userData = { x: (r() - 0.5) * 18, y: 6 + r() * 6, v: 1 + r() * 2.5, rx: r() * 3, z: (r() - 0.5) * 4 };
        shards.push(m);
      }
      const fg = fig(0.9); fg.position.set(0, 6, -1);
      tick = (age) => {
        shards.forEach(m => { const u = m.userData; m.position.set(u.x, u.y - age * u.v, u.z); m.rotation.set(age * u.rx, age, 0); });
        fg.position.y = 6 - age * age * 0.5; fg.rotation.z = age * 0.4;
      };
      break;
    }
    case 'bulb': {
      add(new THREE.CylinderGeometry(0.012, 0.012, 6), BLACK()).position.set(2.6, 5.4, 0);
      const bulb = add(new THREE.SphereGeometry(0.28, 16, 12), EMIT(5, 3.6, 2.2)); bulb.position.set(2.6, 2.3, 0);
      const fade = /fade/.test(s);
      tick = (age, env) => { const k = (fade ? clamp(1 - age / 6) : 1) * (Math.random() < 0.03 ? 0.2 : 1) * (0.9 + env.bass * 0.4);
        bulb.material.color.setRGB(5 * k, 3.6 * k, 2.2 * k); glowU.uA.value *= 0.4 + 0.6 * k; };
      break;
    }
    case 'house': {
      const h = new THREE.Group(); root.add(h); h.position.set(0, -3.4, -1);
      const parts = [];
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
        const m = add(new THREE.BoxGeometry(1.0, 1.0, 1.6), BLACK(), h); m.position.set(-1.5 + i, 0.5 + j, 0); parts.push(m);
      }
      const roof = add(new THREE.ConeGeometry(3.0, 1.8, 4), BLACK(), h); roof.position.y = 3.9; roof.rotation.y = Math.PI / 4; parts.push(roof);
      const win = add(new THREE.PlaneGeometry(0.5, 0.6), EMIT(3, 1.8, 0.9), h); win.position.set(0.5, 1.6, 0.81);
      parts.forEach(p => (p.userData = { home: p.position.clone(), d: new THREE.Vector3(r() - 0.5, r() * 0.5, r() - 0.5) }));
      const decay = /decay|away|broke|never home/.test(s);
      tick = (age) => { if (!decay) return; const k = clamp((age - 1.2) / 5);
        parts.forEach(p => { p.position.copy(p.userData.home).addScaledVector(p.userData.d, k * k * 6); p.rotation.set(k * p.userData.d.x * 3, k * p.userData.d.z * 3, 0); });
        win.material.opacity = 1 - k; };
      break;
    }
    case 'water': {
      const red = /bleed|drown/.test(s);
      const u = { uT: { value: 0 }, uC: { value: red ? new THREE.Color(0.6, 0.02, 0.02) : color.clone().multiplyScalar(0.6) }, uA: { value: 1 } };
      const mat = new THREE.ShaderMaterial({ transparent: true, uniforms: u,
        vertexShader: `uniform float uT; varying float vH; varying vec2 vUv; void main(){ vUv=uv; vec3 p=position;
          p.z += sin(p.x*1.3+uT*1.4)*0.12 + sin(p.y*2.1-uT*1.1)*0.08; vH=p.z; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
        fragmentShader: `uniform vec3 uC; uniform float uA; varying float vH; varying vec2 vUv; void main(){
          float l = smoothstep(-0.15,0.2,vH); vec3 c = uC*(0.15+l*1.2)*(1.0-vUv.y*0.6); gl_FragColor=vec4(c, uA); }` });
      mats.push(mat);
      const w = new THREE.Mesh(new THREE.PlaneGeometry(40, 24, 120, 60), mat); w.rotation.x = -Math.PI / 2; root.add(w);
      tick = (age, env, life) => { u.uA.value = life; u.uT.value = age; w.position.y = -3.2 + Math.min(age * 0.35, 2.2); };
      break;
    }
    case 'mirror': {
      const shards = [];
      for (let i = 0; i < 16; i++) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, (r() - 0.5) * 3, 1 + r() * 2, 0, 1 + r() * 2, (r() - 0.5) * 2, 0], 3));
        g.computeVertexNormals();
        const m = add(g, new THREE.MeshStandardMaterial({ color: 0x888c94, metalness: 1, roughness: 0.1, transparent: true, side: THREE.DoubleSide }));
        m.position.set((r() - 0.5) * 12, (r() - 0.5) * 6, -1 - r() * 2); m.userData = { s: (r() - 0.5) * 0.4 };
        shards.push(m);
      }
      const eye = add(new THREE.RingGeometry(0.5, 0.62, 48), EMIT(3, 3, 3)); eye.position.set(0, 2.6, -2);
      tick = (age) => shards.forEach(m => { m.rotation.y = age * m.userData.s + 0.3; m.rotation.x = age * m.userData.s * 0.5; });
      break;
    }
    case 'candles': {
      const n = 7, flames = [];
      for (let i = 0; i < n; i++) {
        const c = add(new THREE.CylinderGeometry(0.12, 0.12, 0.9 + r() * 0.5), EMIT(0.35, 0.33, 0.3)); c.position.set((i - (n - 1) / 2) * 1.1, -2.8, 0);
        const f = add(new THREE.SphereGeometry(0.09, 10, 8), EMIT(6, 3.2, 1)); f.scale.y = 1.8; f.position.set(c.position.x, -2.1 + c.geometry.parameters.height / 2 - 0.45, 0);
        flames.push(f);
      }
      const dying = /not one|counted|lost/.test(s);
      tick = (age) => flames.forEach((f, i) => { const out = dying ? age > 0.8 + i * 0.45 : age > 3 + (n - i) * 0.35 && /not one/.test(s);
        f.visible = !out; f.scale.set(1 + Math.random() * 0.15, 1.8 + Math.random() * 0.4, 1); });
      break;
    }
    case 'road': {
      const road = add(new THREE.PlaneGeometry(5, 80), EMIT(0.05, 0.05, 0.06)); road.rotation.x = -Math.PI / 2; road.position.set(0, -3.38, -30);
      for (let i = 0; i < 20; i++) {
        const d = add(new THREE.PlaneGeometry(0.12, 1.2), EMIT(0.9, 0.85, 0.6)); d.rotation.x = -Math.PI / 2; d.position.set(0, -3.36, 4 - i * 4);
        const l = add(new THREE.SphereGeometry(0.07, 8, 6), EMIT(4, 3, 2)); l.position.set(i % 2 ? 3.2 : -3.2, -1.5, 2 - i * 4);
      }
      const two = /with me/.test(s);
      const a = fig(0.55); a.position.set(two ? -0.4 : 0, -3.4, -6);
      let b = null; if (two) { b = fig(0.55, EMIT(1.6, 1.3, 0.8)); b.position.set(0.4, -3.4, -6); }
      tick = (age) => { a.position.z = -6 - age * 0.5; if (b) b.position.z = a.position.z; };
      break;
    }
    case 'sun': {
      const sun = add(new THREE.CircleGeometry(2.4, 64), EMIT(1.9, 0.95, 0.4)); sun.position.set(0, -5, -3.9);
      add(new THREE.PlaneGeometry(60, 6), BLACK()).position.set(0, -6.3, -3.8);   // horizon
      tick = (age) => { sun.position.y = -5 + Math.min(age * 0.55, 5); glowU.uC.value.setRGB(1, 0.55, 0.25); };
      break;
    }
    case 'heart': {
      const core = add(new THREE.SphereGeometry(0.7, 24, 16), EMIT(1.3, 0.04, 0.05)); core.position.set(0, 2.4, -2);
      const rings = [];
      for (let i = 0; i < 3; i++) { const ring = add(new THREE.RingGeometry(0.9, 0.95, 64), EMIT(0.9, 0.03, 0.04)); ring.position.copy(core.position); rings.push(ring); }
      tick = (age, env) => { const beat = Math.pow(Math.max(0, Math.sin(age * 7.1)), 12) + env.bass * 0.6;
        core.scale.setScalar(1 + beat * 0.25);
        rings.forEach((ring, i) => { const k = ((age * 0.8 + i / 3) % 1); ring.scale.setScalar(1 + k * 6); ring.material.opacity *= 1 - k; }); };
      break;
    }
    case 'chain': {
      const links = [], n = 9;
      const mat = () => new THREE.MeshStandardMaterial({ color: 0x9a9690, metalness: 1, roughness: 0.3, transparent: true });
      for (let i = 0; i < n; i++) { const l = add(new THREE.TorusGeometry(0.45, 0.1, 10, 28), mat()); l.scale.y = 1.5;
        l.rotation.set(0, i % 2 ? Math.PI / 2 : 0, Math.PI / 2); l.position.set((i - (n - 1) / 2) * 0.95, 2.6, -1.5); links.push(l); }
      const breaks = /broke|break/.test(s);
      tick = (age) => { const k = breaks ? clamp((age - 1.6) / 1.2) : 0;
        links.forEach((l, i) => { const side = i < n / 2 ? -1 : 1; l.position.x = (i - (n - 1) / 2) * 0.95 + side * k * k * 5; l.position.y = 2.6 - k * k * 2 * Math.abs(i - 4) * 0.3; }); };
      break;
    }
    case 'bridge': {
      const arch = add(new THREE.TorusGeometry(5, 0.35, 8, 48, Math.PI), BLACK()); arch.position.set(0, -3.4, -2);
      add(new THREE.BoxGeometry(14, 0.35, 1), BLACK()).position.set(0, 0.6, -2);
      const n = 200, pos = new Float32Array(n * 3), seeds = [];
      for (let i = 0; i < n; i++) seeds.push([(r() - 0.5) * 12, r() * 6, r(), 0.4 + r()]);
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pm = new THREE.PointsMaterial({ color: new THREE.Color(4, 1.4, 0.3), size: 0.07, transparent: true }); mats.push(pm);
      root.add(new THREE.Points(geo, pm));
      tick = (age) => { seeds.forEach(([x, y, p, v], i) => { pos.set([x + Math.sin(age + p * 9) * 0.3, 0.6 + ((y + age * v) % 6), -2 + p], i * 3); });
        geo.attributes.position.needsUpdate = true; glowU.uC.value.setRGB(1, 0.35, 0.1); };
      break;
    }
    case 'door': {
      const frame = new THREE.Group(); frame.position.set(0, -3.4, -2); root.add(frame);
      const light = add(new THREE.PlaneGeometry(1.6, 3.2), EMIT(3.5, 3.2, 2.8), frame); light.position.set(0, 1.6, 0);
      const pivot = new THREE.Group(); pivot.position.set(-0.8, 0, 0.02); frame.add(pivot);
      const door = add(new THREE.BoxGeometry(1.6, 3.2, 0.08), BLACK(), pivot); door.position.set(0.8, 1.6, 0);
      const slam = /slammed|shut/.test(s);
      tick = (age) => { const k = slam ? clamp((age - 0.6) / 0.5) : 0; pivot.rotation.y = -1.3 * (1 - k * k); };
      break;
    }
    case 'scars': {
      const pts = [];
      for (let c = 0; c < 9; c++) { let x = (r() - 0.5) * 12, y = 5 + r() * 2;
        for (let i = 0; i < 14; i++) { const nx = x + (r() - 0.5) * 1.4, ny = y - 0.3 - r() * 0.7; pts.push(x, y, -2, nx, ny, -2); x = nx; y = ny; } }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const lm = new THREE.LineBasicMaterial({ color: new THREE.Color(1.1, 0.05, 0.05), transparent: true }); mats.push(lm);
      root.add(new THREE.LineSegments(g, lm));
      tick = (age) => { g.setDrawRange(0, Math.floor(clamp(age / 1.8) * pts.length / 3)); };
      break;
    }
    case 'crowd': {
      const figs = [];
      for (let i = 0; i < 11; i++) { const f = fig(0.8 + r() * 0.25); f.position.set((i - 5) * 1.25 + (r() - 0.5) * 0.4, -3.4, -1.5 - r() * 2); f.userData.v = 0.2 + r() * 0.4; figs.push(f); }
      const leave = /turned|turn|backs|away|none|not one/.test(s);
      tick = (age) => figs.forEach(f => { if (leave) f.position.z -= f.userData.v * 0.016 * (age > 0.8 ? 1 : 0); });
      break;
    }
    case 'rain': {
      const rings = [];
      for (let i = 0; i < 14; i++) { const ring = add(new THREE.RingGeometry(0.2, 0.215, 48), EMIT(0.35, 0.4, 0.5)); ring.rotation.x = -Math.PI / 2;
        ring.position.set((r() - 0.5) * 12, -3.35, (r() - 0.5) * 6); ring.userData.p = r(); rings.push(ring); }
      const um = fig(0.8); um.position.set(3, -3.4, -1);
      add(new THREE.SphereGeometry(0.75, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), BLACK(), um).position.set(0, 2.25, 0);   // umbrella
      tick = (age) => rings.forEach(ring => { const k = (age * 0.6 + ring.userData.p) % 1; ring.scale.setScalar(1 + k * 6); ring.material.opacity *= 1 - k; });
      break;
    }
    default: {
      const n = 300, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) pos.set([(r() - 0.5) * 20, (r() - 0.5) * 10, (r() - 0.5) * 6], i * 3);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const pm = new THREE.PointsMaterial({ color: new THREE.Color(1.5, 1.4, 1.3), size: 0.03, transparent: true }); mats.push(pm);
      const p = new THREE.Points(g, pm); root.add(p);
      tick = (age) => { p.rotation.y = age * 0.03; p.position.y = age * 0.05; };
    }
  }

  return {
    root, name,
    update(age, life, env, now) {
      glowU.uA.value = 0.3 * life * (0.85 + env.slow * 0.3);
      glowU.uTime.value = now;
      for (const m of mats) m.opacity = life;
      tick(age, env, life);
    },
    dispose() { root.traverse(o => { o.geometry?.dispose(); o.material?.dispose?.(); }); },
  };
}

// a standing silhouette: capsule body + head (noir figure)
function figure(add, s, mat) {
  const g = new THREE.Group();
  const m = mat || BLACK();
  const body = add(new THREE.CapsuleGeometry(0.32 * s, 1.5 * s, 4, 12), m, g); body.position.y = 1.1 * s;
  const head = add(new THREE.SphereGeometry(0.24 * s, 14, 10), m, g); head.position.y = 2.25 * s;
  return g;
}
