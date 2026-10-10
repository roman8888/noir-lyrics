// The noir city: wet street, two rows of buildings with alleys, a hero building with a real apartment opening,
// interior-mapped windows (every lit window is a small parallax room), street lamps, traffic, rain.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { rng, makeRain } from './util.js?v=20261010211412';
import { FACADE, ROW2, Z_START, Z_END, ALLEYS, HERO, ROOM, LAMP_H, LAMP_X, lampZs, CELL } from './layout.js?v=20261010211412';

const buildingVS = /* glsl */`
  varying vec3 vW; varying vec3 vN; varying float vSeed;
  void main() {
    mat4 m = modelMatrix * instanceMatrix;
    vec4 wp = m * vec4(position, 1.0);
    vW = wp.xyz; vN = normalize(mat3(m) * normal); vSeed = float(gl_InstanceID);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }`;
// interior mapping: each lit window is a ray-marched box room behind the glass (walls, floor, lamp, furniture, a figure)
const buildingFS = /* glsl */`
  uniform float uTime, uFog, uFlash, uDawn, uDark, uDarkZ; uniform vec3 uFogColor, uSkyTint;
  varying vec3 vW; varying vec3 vN; varying float vSeed;
  float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float h3(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  void main() {
    vec3 base = vec3(0.012, 0.012, 0.015) + vec3(0.05, 0.04, 0.03) * exp(-vW.y * 0.14);
    // brick-ish grime bands
    base *= 0.8 + 0.4 * h(floor(vec2(vW.x + vW.z, vW.y * 3.0)));
    vec3 col = base;
    if (abs(vN.y) < 0.5) {
      bool xf = abs(vN.x) > 0.5;
      float u = xf ? vW.z : vW.x;
      vec2 g = vec2(u / ${CELL.w.toFixed(2)}, vW.y / ${CELL.h.toFixed(2)}), c = floor(g), f = fract(g);
      float win = step(0.18, f.x) * step(f.x, 0.82) * step(0.24, f.y) * step(f.y, 0.80);
      float r = h(c + vSeed * 13.7);
      float lit = step(0.84, r);
      lit *= 1.0 - uDark * smoothstep(uDarkZ - 10.0, uDarkZ + 10.0, vW.z);      // the blackout wave: windows go dark behind, then ahead
      float flick = 0.9 + 0.1 * sin(uTime * (1.5 + r * 6.0) + r * 40.0);
      vec3 glass = vec3(0.006, 0.007, 0.010) + 0.012 * f.y + uSkyTint * 0.04 * (1.0 - f.y);
      vec3 room = glass;
      if (lit > 0.5) {
        // ray from the eye through this point on the glass, in cell units (lateral, up, depth-inwards)
        vec3 V = normalize(vW - cameraPosition);
        vec3 inward = -vN;
        vec3 lat = xf ? vec3(0., 0., 1.) : vec3(1., 0., 0.);
        vec3 dir = vec3(dot(V, lat) / ${CELL.w.toFixed(2)}, V.y / ${CELL.h.toFixed(2)}, max(dot(V, inward), 0.02) / ${CELL.w.toFixed(2)});
        vec3 o = vec3(f.x, f.y, 0.0);
        float D = 1.3;                                   // room depth in cell units
        float tz = (D - o.z) / dir.z;
        float tx = ((dir.x > 0. ? 0.98 : 0.02) - o.x) / dir.x;
        float ty = ((dir.y > 0. ? 0.96 : 0.04) - o.y) / dir.y;
        float t = min(tz, min(tx, ty));
        vec3 p = o + dir * t;
        float r2 = h(c * 1.7 + vSeed * 3.1), r3 = h(c * 2.9 + vSeed * 7.7);
        // palette: warm paper, cold tv-blue, sickly green, red lamp
        vec3 wall = mix(vec3(0.55, 0.42, 0.28), vec3(0.35, 0.42, 0.5), step(0.75, r2));
        if (r2 > 0.93) wall = vec3(0.5, 0.12, 0.1);
        vec3 lampP = vec3(0.5 + (r3 - 0.5) * 0.4, 0.86, 0.55);
        float L = 3.2 / (1.0 + 4.0 * dot(p - lampP, p - lampP));
        if (t == tz) {                                   // back wall: a dark wardrobe / headboard + a picture
          float furn = step(0.55, p.x) * step(p.x, 0.92) * step(p.y, 0.42);
          float pic = step(0.15, p.x) * step(p.x, 0.38) * step(0.5, p.y) * step(p.y, 0.72);
          room = wall * (0.6 + 0.4 * h(floor(p.xy * 9.0)));
          room = mix(room, vec3(0.05, 0.04, 0.035), furn);
          room = mix(room, vec3(0.2, 0.17, 0.12), pic);
        } else if (t == ty) {
          if (dir.y > 0.) { room = wall * 0.75; room += vec3(1.0, 0.85, 0.6) * smoothstep(0.08, 0.0, length(p.xz - lampP.xz)) * 2.5; }
          else room = vec3(0.16, 0.1, 0.06) * (0.7 + 0.3 * h(floor(vec2(p.x * 6.0, p.z * 6.0))));
        } else room = wall * 0.55;
        room *= L * flick * 1.4;
        // a figure standing near the window in some rooms
        if (r3 > 0.62 && r3 < 0.8) {
          float tf = (0.35 - o.z) / dir.z; vec3 q = o + dir * tf;
          float fx = 0.5 + (r2 - 0.5) * 0.5, sway = 0.02 * sin(uTime * 0.7 + r2 * 9.0);
          float body = step(abs(q.x - fx - sway), 0.08) * step(0.05, q.y) * step(q.y, 0.62);
          float head = step(length((q.xy - vec2(fx + sway, 0.7)) * vec2(1.0, 0.75)), 0.06);
          if (tf < t && (body + head) > 0.5) room = vec3(0.01);
        }
        // tv flicker in the blue rooms
        if (r2 > 0.75 && r2 < 0.93) room += vec3(0.25, 0.35, 0.6) * (0.3 + 0.7 * h(vec2(floor(uTime * 9.0), c.x))) * 0.6;
        // curtains at the glass edges
        float curt = smoothstep(0.26, 0.18, f.x) + smoothstep(0.74, 0.82, f.x);
        room = mix(room, wall * 0.25, curt * step(0.5, r2));
        room += uSkyTint * 0.03;
      }
      col = mix(col, room, win);
    } else {
      col = vec3(0.006) + uSkyTint * 0.02;
      if (vN.y > 0.5) {                                             // rooftops: gravel, vents, a few lights so the city sparkles from above
        vec2 rc = floor(vW.xz / 2.2); float rr = h(rc + vSeed * 3.3);
        col += vec3(0.012) * h(rc * 0.5);
        if (rr > 0.985) col += vec3(1.4, 0.9, 0.45) * smoothstep(0.35, 0.0, length(fract(vW.xz / 2.2) - 0.5));
        if (rr < 0.004) col += vec3(2.2, 0.1, 0.08) * smoothstep(0.3, 0.0, length(fract(vW.xz / 2.2) - 0.5)) * (0.5 + 0.5 * sin(uTime * 2.0 + rr * 900.0));
      }
    }
    col += uFlash * vec3(0.35, 0.37, 0.42) * (0.5 + 0.5 * max(vN.y, 0.0));
    col += uDawn * vec3(0.5, 0.3, 0.18) * max(dot(vN, normalize(vec3(0.1, 0.25, -1.0))), 0.0);
    float d = length(vW - cameraPosition);
    col = mix(col, uFogColor, 1.0 - exp(-uFog * uFog * d * d));
    gl_FragColor = vec4(col, 1.0);
  }`;
const coneVS = /* glsl */`
  varying float vY; varying float vEdge; varying float vI;
  attribute float aDim;
  void main() {
    vY = position.y; vI = aDim;
    vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * mat3(instanceMatrix) * normal);
    vEdge = abs(dot(n, normalize(-mv.xyz)));
    gl_Position = projectionMatrix * mv;
  }`;
const coneFS = /* glsl */`
  uniform float uH, uGain; varying float vY; varying float vEdge; varying float vI;
  void main() {
    float a = pow(clamp((vY + uH * 0.5) / uH, 0.0, 1.0), 1.6) * pow(vEdge, 2.0) * uGain * vI;
    gl_FragColor = vec4(vec3(1.0, 0.82, 0.6) * a, a);
  }`;

export function createCity() {
  const scene = new THREE.Scene();
  const fogColor = new THREE.Color(0x07080c);
  scene.fog = new THREE.FogExp2(fogColor, 0.016);
  const r = rng(7);
  const M = new THREE.Matrix4();

  const hemi = new THREE.HemisphereLight(0x4a5878, 0x050505, 0.35); scene.add(hemi);
  const moon = new THREE.DirectionalLight(0x9fb4ff, 0.6); moon.position.set(-30, 60, 20); scene.add(moon);
  const flashLight = new THREE.DirectionalLight(0xdfe6ff, 0); flashLight.position.set(10, 80, -100); scene.add(flashLight);

  // wet asphalt: a real mirror under a dark translucent skin (the skin thins when the camera is high)
  // black ground to the horizon; the wet mirror only under the city itself
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.08, -140); scene.add(ground);
  const mirror = new Reflector(new THREE.PlaneGeometry(110, 440), { textureWidth: innerWidth * 0.5, textureHeight: innerHeight * 0.5, color: 0x6a6a6a });
  mirror.rotation.x = -Math.PI / 2; mirror.position.set(0, 0, -140); scene.add(mirror);
  const skin = new THREE.Mesh(new THREE.PlaneGeometry(110, 440), new THREE.MeshBasicMaterial({ color: 0x030406, transparent: true, opacity: 0.62 }));
  skin.rotation.x = -Math.PI / 2; skin.position.set(0, 0.02, -140); scene.add(skin);
  const dashes = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.14, 2.4), new THREE.MeshBasicMaterial({ color: 0x8a8670 }), 64);
  for (let i = 0; i < 64; i++) dashes.setMatrixAt(i, M.makeRotationX(-Math.PI / 2).setPosition(0, 0.03, 40 - i * 6));
  scene.add(dashes);
  // kerbs
  const kerbMat = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.9 });
  for (const s of [-1, 1]) { const k = new THREE.Mesh(new THREE.BoxGeometry(1, 0.18, 400), kerbMat); k.position.set(s * (FACADE - 0.5), 0.09, -140); scene.add(k); }

  // buildings as instanced boxes; the first row leaves gaps for the alleys and the hero slot
  const boxes = [];
  const inAlley = (z, side) => ALLEYS.some(a => a.side === side && Math.abs(z - a.z) < a.w / 2 + 0.3);
  for (const side of [-1, 1]) for (let row = 0; row < 2; row++) {
    let z = Z_START;
    while (z > Z_END - 20) {
      const d = 8 + r() * 10, wd = 8 + r() * 9;
      const cz = z - d / 2;
      const off = row === 0 ? FACADE : ROW2 + r() * 6;
      const ht = row === 0 ? 10 + r() * 26 : 30 + r() * 50;
      const hero = side === 1 && row === 0 && Math.abs(cz - HERO.z) < HERO.depth / 2 + 4;
      let cut = false;
      if (row === 0) for (const a of ALLEYS) if (a.side === side && cz + d / 2 > a.z - a.w / 2 && cz - d / 2 < a.z + a.w / 2) cut = true;
      if (!hero && !cut) boxes.push([side * (off + wd / 2), cz, wd, ht, d]);
      else if (cut && !hero) {                                   // split the box around the alley
        const a = ALLEYS.find(a => a.side === side && cz + d / 2 > a.z - a.w / 2 && cz - d / 2 < a.z + a.w / 2);
        const top = cz + d / 2, bot = cz - d / 2, a1 = a.z + a.w / 2, a0 = a.z - a.w / 2;
        if (top - a1 > 2) boxes.push([side * (off + wd / 2), (top + a1) / 2, wd, ht, top - a1]);
        if (a0 - bot > 2) boxes.push([side * (off + wd / 2), (a0 + bot) / 2, wd, ht, a0 - bot]);
      }
      z -= d + 0.5 + r() * 1.2;
    }
  }
  // hero building = slabs with a real hole where the apartment window is
  const hx = HERO.x, hw = HERO.width, hz0 = HERO.z - HERO.depth / 2, hz1 = HERO.z + HERO.depth / 2, hh = HERO.height;
  const W = ROOM.win, wz0 = W.z - W.w / 2, wz1 = W.z + W.w / 2, wy0 = W.y - W.h / 2, wy1 = W.y + W.h / 2;
  const slab = (x, z, wd, ht, d, y0 = 0) => boxes.push([x, z, wd, ht, d, y0]);
  slab(hx + 0.3, (hz0 + wz0) / 2, 0.6, hh, wz0 - hz0);                   // facade left of the window
  slab(hx + 0.3, (wz1 + hz1) / 2, 0.6, hh, hz1 - wz1);                   // right
  slab(hx + 0.3, W.z, 0.6, wy0, W.w);                                    // below the window
  slab(hx + 0.3, W.z, 0.6, hh - wy1, W.w, wy1);                          // above
  slab((ROOM.x1 + 0.2 + hx + hw) / 2, HERO.z, hx + hw - ROOM.x1 - 0.2, hh, HERO.depth, 0);   // the body behind the apartment (props builds the room in the gap)
  const bGeo = new THREE.BoxGeometry(1, 1, 1); bGeo.translate(0, 0.5, 0);
  const bMat = new THREE.ShaderMaterial({
    vertexShader: buildingVS, fragmentShader: buildingFS,
    uniforms: { uTime: { value: 0 }, uFog: { value: 0.016 }, uFogColor: { value: fogColor }, uFlash: { value: 0 }, uDawn: { value: 0 }, uSkyTint: { value: new THREE.Color(0.05, 0.05, 0.07) }, uDark: { value: 0 }, uDarkZ: { value: 0 } },
  });
  const blds = new THREE.InstancedMesh(bGeo, bMat, boxes.length);
  const placeBoxes = part => {                                   // part: how far (m) the two sides have slid apart
    boxes.forEach(([x, z, wd, ht, d, y0 = 0], i) => {
      M.compose(new THREE.Vector3(x + Math.sign(x) * part, y0, z), new THREE.Quaternion(), new THREE.Vector3(wd, ht, d)); blds.setMatrixAt(i, M);
    });
    blds.instanceMatrix.needsUpdate = true;
  };
  placeBoxes(0);
  scene.add(blds);

  // street lamps with volumetric cones; each can be dimmed (the song puts one out)
  const zs = lampZs(), n = zs.length * 2;
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.6, metalness: 0.7 });
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.1, LAMP_H, 6), poleMat, n);
  const bulbGeo = new THREE.SphereGeometry(0.16, 12, 8);
  const bulbs = new THREE.InstancedMesh(bulbGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3.8, 2.4) }), n);
  const dim = new Float32Array(n).fill(1);
  const coneGeo = new THREE.ConeGeometry(2.6, LAMP_H, 24, 1, true);
  const coneMat = new THREE.ShaderMaterial({ vertexShader: coneVS, fragmentShader: coneFS, uniforms: { uH: { value: LAMP_H }, uGain: { value: 0.16 } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const cones = new THREE.InstancedMesh(coneGeo, coneMat, n);
  cones.geometry = coneGeo.clone(); cones.geometry.setAttribute('aDim', new THREE.InstancedBufferAttribute(dim, 1));
  const lampPos = [];
  let k = 0;
  for (const z of zs) for (const s of [-1, 1]) {
    const zz = z + (s > 0 ? 9 : 0);
    poles.setMatrixAt(k, M.makeTranslation(s * (LAMP_X + 0.6), LAMP_H / 2, zz));
    bulbs.setMatrixAt(k, M.makeTranslation(s * LAMP_X, LAMP_H, zz));
    cones.setMatrixAt(k, M.makeTranslation(s * LAMP_X, LAMP_H / 2, zz));
    lampPos.push([s * LAMP_X, zz]); k++;
  }
  scene.add(poles, bulbs, cones);
  const bulbColor = new THREE.Color();
  bulbs.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3);

  // traffic
  const cars = [];
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0b0c0f, roughness: 0.25, metalness: 0.9 });
  const headMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 6, 5.4) });
  const tailMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.15, 0.1) });
  const makeCar = () => {
    const car = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 4.2), bodyMat); body.position.y = 0.55;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 2.2), bodyMat); cab.position.set(0, 1.15, 0.2);
    car.add(body, cab);
    for (const sx of [-0.65, 0.65]) {
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), headMat); hl.position.set(sx, 0.6, -2.12);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.05), tailMat); tl.position.set(sx, 0.7, 2.12);
      car.add(hl, tl);
    }
    return car;
  };
  for (let i = 0; i < 7; i++) {
    const car = makeCar();
    const dir = i % 2 ? 1 : -1;
    car.rotation.y = dir > 0 ? Math.PI : 0;
    car.userData = { dir, x: dir < 0 ? 4.2 : -4.2, z: 40 - r() * 340, v: 9 + r() * 7 };   // lanes clear of the camera's walk
    scene.add(car); cars.push(car);
  }
  // parked cars at the kerbs
  for (let i = 0; i < 14; i++) {
    const car = makeCar(); const s = i % 2 ? 1 : -1;
    let cz = 30 - i * 26 - r() * 10; if (Math.abs(cz - HERO.z) < 16) cz -= 20;          // keep the kerb clear by the apartment
    car.position.set(s * 6.3, 0, cz); car.rotation.y = s > 0 ? 0 : Math.PI;
    car.traverse(o => { if (o.material === headMat || o.material === tailMat) o.material = poleMat; });
    scene.add(car);
  }

  const rain = makeRain(6000, 0x8b97a8, 0.3); scene.add(rain.object);
  const sunLight = new THREE.DirectionalLight(0xffb070, 0); sunLight.position.set(5, 8, -200); scene.add(sunLight);

  return {
    scene, fogColor, cars, lampPos, makeCar, blds,
    lampAt(z, side) { let best = 0, bd = 1e9; lampPos.forEach(([x, zz], i) => { const d = Math.abs(zz - z) + (Math.sign(x) === side ? 0 : 100); if (d < bd) { bd = d; best = i; } }); return best; },
    part(m) { placeBoxes(m); },
    setDark(amount, z) { bMat.uniforms.uDark.value = amount; bMat.uniforms.uDarkZ.value = z; },
    dimLamp(i, v) { dim[i] = v; cones.geometry.attributes.aDim.needsUpdate = true; bulbColor.setRGB(v, v, v); bulbs.setColorAt(i, bulbColor); bulbs.instanceColor.needsUpdate = true; },
    update(dt, time, camera, sky) {
      bMat.uniforms.uTime.value = time;
      bMat.uniforms.uFlash.value = sky.flash; flashLight.intensity = sky.flash * 2.5;
      bMat.uniforms.uDawn.value = sky.sun || 0; sunLight.intensity = (sky.sun || 0) * 1.4;
      bMat.uniforms.uSkyTint.value.copy(sky.uniforms.uHorizon.value);
      fogColor.copy(sky.fogColor); bMat.uniforms.uFogColor.value = fogColor;
      // the fog thins with altitude so the city stays visible from the sky
      scene.fog.density = (0.012 + 0.012 * sky.uniforms.uHaze.value) * Math.max(0.12, 1 - Math.max(0, camera.position.y - 25) / 110);
      bMat.uniforms.uFog.value = scene.fog.density;
      hemi.intensity = 0.35 + (sky.sun || 0) * 0.9 + (sky.moon || 0) * 0.15; hemi.color.setRGB(0.29, 0.35, 0.47).lerp(new THREE.Color(1, 0.75, 0.5), sky.sun || 0);
      moon.intensity = 0.3 + (sky.moon || 0) * 0.9;
      skin.material.opacity = 0.62 + 0.36 * Math.min(1, Math.max(0, (camera.position.y - 20) / 60));   // from the sky the ground reads black
      for (const c of cars) {
        const u = c.userData; u.z += u.dir * u.v * dt;
        if (u.z < Z_END) u.z = Z_START; if (u.z > Z_START) u.z = Z_END;
        c.position.set(u.x, 0, u.z);
      }
      rain.update(dt, camera.position, 1); rain.mat.opacity = 0.3 * Math.min(1, sky.rain);
    },
    resize(w, h) { mirror.getRenderTarget().setSize(w * 0.5, h * 0.5); },
  };
}
