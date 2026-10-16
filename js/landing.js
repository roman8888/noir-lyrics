// The front page: the same dark city at rest, with every song pasted to a wall like a club bill — blood-red titles on
// black paper under one hard street light. Hover brightens a bill; a click walks into that song.
import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FACADE } from './layout.js?v=20261016232009';

const EYE = 1.7;
export function createLanding(scene, fonts, songs, root) {
  const group = new THREE.Group(); scene.add(group);
  const bills = [];
  const paper = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.95 });
  const blood = () => new THREE.MeshStandardMaterial({ color: 0x7a0e14, roughness: 0.3, metalness: 0.55, emissive: 0x4a060a, emissiveIntensity: 0.8 });
  const pale = new THREE.MeshStandardMaterial({ color: 0x9a948a, roughness: 0.8, emissive: 0x26231f, emissiveIntensity: 0.6 });
  const text = (str, size, mat, italic = false) => {
    const g = new TextGeometry(str, { font: italic ? fonts.italic : fonts.roman, size, height: size * 0.12, curveSegments: 10, bevelEnabled: false });
    g.computeBoundingBox(); const b = g.boundingBox; g.translate(-(b.max.x + b.min.x) / 2, -(b.max.y + b.min.y) / 2, 0);
    return new THREE.Mesh(g, mat);
  };
  // the title wraps into lines no wider than the bill
  const wrap = (title, max = 18) => { const out = []; let line = ''; for (const w of title.split(' ')) { if ((line + ' ' + w).trim().length > max && line) { out.push(line); line = w; } else line = (line + ' ' + w).trim(); } if (line) out.push(line); return out; };
  songs.forEach((s, i) => {
    const W = 4.6, H = 3.1, z = -12 - i * 7.5, y = 3.6;
    const bill = new THREE.Group(); bill.position.set(-FACADE + 0.06, y, z); bill.rotation.y = Math.PI / 2;   // on the left facade, facing the street
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(W, H), paper); bill.add(plate);
    const frame = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.11, 4), new THREE.MeshBasicMaterial({ color: 0x3a0a0c })); frame.visible = false; bill.add(frame);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(W - 0.2, H - 0.2)), new THREE.LineBasicMaterial({ color: 0x5a0c10 })); edge.position.z = 0.01; bill.add(edge);
    const lines = wrap(s.title), size = lines.length > 2 ? 0.34 : 0.42, lh = size * 1.35;
    const mats = [];
    lines.forEach((ln, k) => { const m = text(ln, size, blood()); m.position.set(0, 0.55 + (lines.length - 1) * lh / 2 - k * lh, 0.03); bill.add(m); mats.push(m.material); });
    const by = text('ROMAN SHIKHRI', 0.17, pale); by.position.set(0, -0.75, 0.03); bill.add(by);
    const hint = text('play', 0.15, pale, true); hint.position.set(0, -1.15, 0.03); bill.add(hint);
    // one hard street light on the bill
    const sp = new THREE.SpotLight(0xdfe6ff, 90, 14, 0.5, 0.55, 1.3); sp.position.set(-FACADE + 3.2, y + 4.2, z + 0.4); sp.target.position.set(-FACADE, y, z); group.add(sp, sp.target);
    group.add(bill); bills.push({ bill, plate, mats, song: s, hov: 0, z });
  });
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), look = new THREE.Vector3();
  let over = null;
  const mid = bills.reduce((a, b) => a + b.z, 0) / Math.max(1, bills.length);
  return {
    group,
    // a slow drift down the middle of the street, eyes on the wall of bills
    camera(camera, now) {
      const sway = Math.sin(now * 0.11) * 0.5, drift = Math.sin(now * 0.05) * 2.5;      // standing on the pavement across from the bills, weight shifting
      camera.position.set(-4.3 + sway, EYE + 0.15 + Math.sin(now * 0.37) * 0.03, mid + 6.5 + drift);
      look.set(-FACADE, 3.4, mid + Math.sin(now * 0.07) * 1.2);
      camera.lookAt(look);
    },
    pointer(x, y) { ndc.set(x, y); },
    update(dt, camera) {
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(bills.map(b => b.plate))[0];
      over = hit ? bills.find(b => b.plate === hit.object) : null;
      document.body.style.cursor = over ? 'pointer' : '';
      for (const b of bills) {
        b.hov += (((b === over) ? 1 : 0) - b.hov) * Math.min(1, dt * 6);
        b.mats.forEach(m => { m.emissiveIntensity = 0.8 + b.hov * 1.4; });
        b.bill.position.x = -FACADE + 0.06 + b.hov * 0.12;
      }
    },
    click() { if (over) location.href = root + over.song.slug + '/'; },
  };
}
