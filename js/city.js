// The scroll-driven noir city: drone shot -> street level -> the lit window of a song.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { rng, makeRain } from './util.js';

const FOG = new THREE.Color(0x07080c);
export const HERO = { x: 9, y: 14, z: -160 };          // the facade point the camera ends on

const buildingVS = /* glsl */`
  varying vec3 vW; varying vec3 vN; varying float vSeed;
  void main() {
    mat4 m = modelMatrix * instanceMatrix;
    vec4 wp = m * vec4(position, 1.0);
    vW = wp.xyz; vN = normalize(mat3(m) * normal); vSeed = float(gl_InstanceID);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
const buildingFS = /* glsl */`
  uniform float uTime, uFog; uniform vec3 uFogColor;
  varying vec3 vW; varying vec3 vN; varying float vSeed;
  float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    vec3 col = vec3(0.010, 0.011, 0.014) + vec3(0.06, 0.045, 0.03) * exp(-vW.y * 0.18);
    if (abs(vN.y) < 0.5) {
      float u = abs(vN.x) > 0.5 ? vW.z : vW.x;
      vec2 g = vec2(u / 1.7, vW.y / 2.6), c = floor(g), f = fract(g);
      float win = step(0.18, f.x) * step(f.x, 0.82) * step(0.24, f.y) * step(f.y, 0.80);
      float r = h(c + vSeed * 13.7);
      float lit = step(0.86, r);
      float flick = 0.88 + 0.12 * sin(uTime * (1.5 + r * 6.0) + r * 40.0);
      vec3 wc = mix(vec3(1.7, 1.1, 0.55), vec3(0.55, 0.75, 1.5), step(0.955, r));
      if (r > 0.988) wc = vec3(3.2, 0.12, 0.1);
      vec3 glass = vec3(0.006, 0.007, 0.010) + 0.012 * f.y;
      col = mix(col, mix(glass, wc * flick * (0.5 + 0.9 * h(c + 1.3)), lit), win);
    } else col = vec3(0.004);
    float d = length(vW - cameraPosition);
    col = mix(col, uFogColor, 1.0 - exp(-uFog * uFog * d * d));
    gl_FragColor = vec4(col, 1.0);
  }`;
const coneVS = /* glsl */`
  varying float vY; varying float vEdge;
  void main() {
    vY = position.y;
    vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * mat3(instanceMatrix) * normal);
    vEdge = abs(dot(n, normalize(-mv.xyz)));
    gl_Position = projectionMatrix * mv;
  }`;
const coneFS = /* glsl */`
  uniform float uH, uGain; varying float vY; varying float vEdge;
  void main() {
    float a = pow(clamp((vY + uH * 0.5) / uH, 0.0, 1.0), 1.6) * pow(vEdge, 2.0) * uGain;
    gl_FragColor = vec4(vec3(1.0, 0.82, 0.6) * a, a);
  }`;

export function createCity(renderer, font) {
  const scene = new THREE.Scene();
  scene.background = FOG.clone();
  scene.fog = new THREE.FogExp2(FOG, 0.016);
  const r = rng(7);

  scene.add(new THREE.HemisphereLight(0x4a5878, 0x050505, 0.35));
  const moon = new THREE.DirectionalLight(0x9fb4ff, 0.7); moon.position.set(-30, 60, 20); scene.add(moon);

  // wet asphalt = a real mirror under a dark, translucent skin
  const w = innerWidth, h = innerHeight;
  const mirror = new Reflector(new THREE.PlaneGeometry(400, 600), {
    textureWidth: w * 0.5, textureHeight: h * 0.5, color: 0x6a6a6a,
  });
  mirror.rotation.x = -Math.PI / 2; mirror.position.set(0, 0, -120);
  scene.add(mirror);
  const skin = new THREE.Mesh(new THREE.PlaneGeometry(400, 600),
    new THREE.MeshBasicMaterial({ color: 0x050608, transparent: true, opacity: 0.62 }));
  skin.rotation.x = -Math.PI / 2; skin.position.set(0, 0.02, -120);
  scene.add(skin);
  // lane markings
  const dashes = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.14, 2.4),
    new THREE.MeshBasicMaterial({ color: 0x8a8670 }), 60);
  for (let i = 0; i < 60; i++) {
    const m = new THREE.Matrix4().makeRotationX(-Math.PI / 2).setPosition(0, 0.03, 40 - i * 6);
    dashes.setMatrixAt(i, m);
  }
  scene.add(dashes);

  // buildings: two rows each side, one hero building holding the song
  const boxes = [];
  for (const side of [-1, 1]) {
    for (let row = 0; row < 2; row++) {
      let z = 50;
      while (z > -330) {
        const d = 8 + r() * 10, wd = 8 + r() * 8;
        const cz = z - d / 2;
        const off = row === 0 ? 9 : 27 + r() * 6;
        const ht = row === 0 ? 10 + r() * 26 : 30 + r() * 50;
        const isHeroSlot = side === 1 && row === 0 && Math.abs(cz - HERO.z) < 14;
        if (!isHeroSlot) boxes.push([side * (off + wd / 2), cz, wd, ht, d]);
        z -= d + 0.6 + r() * 1.2;
      }
    }
  }
  boxes.push([HERO.x + 6, HERO.z, 12, 36, 20]);           // hero
  const bGeo = new THREE.BoxGeometry(1, 1, 1); bGeo.translate(0, 0.5, 0);
  const bMat = new THREE.ShaderMaterial({
    vertexShader: buildingVS, fragmentShader: buildingFS,
    uniforms: { uTime: { value: 0 }, uFog: { value: 0.016 }, uFogColor: { value: FOG } },
  });
  const blds = new THREE.InstancedMesh(bGeo, bMat, boxes.length);
  const M = new THREE.Matrix4();
  boxes.forEach(([x, z, wd, ht, d], i) => {
    M.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion(), new THREE.Vector3(wd, ht, d));
    blds.setMatrixAt(i, M);
  });
  scene.add(blds);

  // street lamps with volumetric cones
  const lampZ = []; for (let z = 34; z > -320; z -= 18) lampZ.push(z);
  const n = lampZ.length * 2, LH = 6.6;
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.6, metalness: 0.7 });
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.1, LH, 6), poleMat, n);
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 12, 8),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3.8, 2.4) }), n);
  const coneMat = new THREE.ShaderMaterial({
    vertexShader: coneVS, fragmentShader: coneFS, uniforms: { uH: { value: LH }, uGain: { value: 0.16 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const cones = new THREE.InstancedMesh(new THREE.ConeGeometry(2.6, LH, 24, 1, true), coneMat, n);
  let k = 0;
  for (const z of lampZ) for (const s of [-1, 1]) {
    const zz = z + (s > 0 ? 9 : 0);
    M.makeTranslation(s * 8.2, LH / 2, zz); poles.setMatrixAt(k, M);
    M.makeTranslation(s * 7.6, LH, zz); bulbs.setMatrixAt(k, M);
    M.makeTranslation(s * 7.6, LH / 2, zz); cones.setMatrixAt(k, M);
    k++;
  }
  scene.add(poles, bulbs, cones);

  // cars: headlights + tail-lights, reflected by the wet street
  const cars = [];
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0b0c0f, roughness: 0.25, metalness: 0.9 });
  const headMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 6, 5.4) });
  const tailMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.15, 0.1) });
  for (let i = 0; i < 6; i++) {
    const car = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 4.2), bodyMat); body.position.y = 0.55;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 2.2), bodyMat); cab.position.set(0, 1.15, 0.2);
    car.add(body, cab);
    for (const sx of [-0.65, 0.65]) {
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), headMat); hl.position.set(sx, 0.6, -2.12);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.05), tailMat); tl.position.set(sx, 0.7, 2.12);
      car.add(hl, tl);
    }
    const dir = i % 2 ? 1 : -1;                    // -1 drives away from the drone (toward the hero)
    car.rotation.y = dir > 0 ? Math.PI : 0;
    car.userData = { dir, x: dir < 0 ? 2.8 : -2.8, z: 40 - r() * 340, v: 9 + r() * 7 };
    scene.add(car); cars.push(car);
  }

  // the song's window: red neon title on the hero facade
  const neonMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.07, 0.05) });
  const neon = new THREE.Group();
  [['When God Wants', 1.0], ['to Make You Stronger', -0.8]].forEach(([txt, y]) => {
    const g = new TextGeometry(txt, { font, size: 1.05, height: 0.06, curveSegments: 12 });
    g.computeBoundingBox(); const b = g.boundingBox; g.translate(-(b.min.x + b.max.x) / 2, 0, 0);
    const m = new THREE.Mesh(g, neonMat); m.position.y = y; neon.add(m);
  });
  neon.position.set(HERO.x - 0.15, HERO.y, HERO.z); neon.rotation.y = -Math.PI / 2;
  scene.add(neon);
  const glow = new THREE.PointLight(0xff2a1a, 60, 30, 1.6); glow.position.set(HERO.x - 2, HERO.y, HERO.z); scene.add(glow);
  // one window behind the sign, warm and bright
  const win = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.22, 0.1) }));
  win.position.set(HERO.x - 0.05, HERO.y + 3.6, HERO.z); win.rotation.y = -Math.PI / 2; scene.add(win);

  const rain = makeRain(5000, 0x8b97a8, 0.3); scene.add(rain.object);

  // camera choreography — position and look-at curves sampled by scroll progress
  const P = (x, y, z) => new THREE.Vector3(x, y, z);
  const posCurve = new THREE.CatmullRomCurve3([
    P(0, 78, 95), P(0, 42, 52), P(1.5, 9, 8), P(-1, 3.4, -40), P(0.5, 3.2, -90),
    P(-1.5, 4.5, -118), P(-3.5, 6.8, -132), P(-4.2, 8.2, -138),
  ], false, 'centripetal');
  const lookCurve = new THREE.CatmullRomCurve3([
    P(0, 0, -70), P(0, 3, -85), P(0, 4, -100), P(1, 4.5, -130), P(4, 8, -158),
    P(8, 12.5, -160), P(9, 13.2, -160), P(9, 13.2, -160),
  ], false, 'centripetal');

  const look = new THREE.Vector3();
  let neonT = 0;
  return {
    scene,
    entryPoint: new THREE.Vector3(HERO.x + 2, HERO.y + 3.6, HERO.z),
    update(dt, time, p, camera) {
      bMat.uniforms.uTime.value = time;
      posCurve.getPointAt(p, camera.position);
      lookCurve.getPointAt(p, look);
      camera.position.x += Math.sin(time * 0.31) * 0.12 * (1 - p * 0.5);   // handheld drift
      camera.position.y += Math.sin(time * 0.47) * 0.08;
      camera.lookAt(look);
      for (const c of cars) {
        const u = c.userData; u.z += u.dir * u.v * dt;
        if (u.z < -330) u.z = 50; if (u.z > 50) u.z = -330;
        c.position.set(u.x, 0, u.z);
      }
      // neon flickers like an old tube
      neonT -= dt;
      if (neonT < 0) { neonT = Math.random() < 0.05 ? 0.06 : 0.4 + Math.random() * 2; }
      const on = neonT > 0.07 || Math.random() > 0.5;
      neonMat.color.setRGB(on ? 2.4 : 0.3, on ? 0.07 : 0.01, on ? 0.05 : 0.01);
      glow.intensity = on ? 60 : 8;
      rain.update(dt, camera.position, 1);
    },
    resize(w, h) { mirror.getRenderTarget().setSize(w * 0.5, h * 0.5); },
  };
}
