// The front page: the same dark city at rest, with every song pasted to a wall like a club bill — blood-red titles on
// black paper under one hard street light. Hover brightens a bill; a click walks into that song.
import * as THREE from 'three';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FACADE } from './layout.js?v=20261017005048';

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
    const lines = wrap(s.title, 16), size = lines.length > 2 ? 0.34 : 0.42, lh = size * 1.35;
    const mats = [], title = new THREE.Group(); bill.add(title);
    let widest = 0;
    lines.forEach((ln, k) => { const m = text(ln, size, blood()); m.position.set(0, (lines.length - 1) * lh / 2 - k * lh, 0.03); title.add(m); mats.push(m.material);
      m.geometry.computeBoundingBox(); widest = Math.max(widest, m.geometry.boundingBox.max.x - m.geometry.boundingBox.min.x); });
    const fit = Math.min(1, (W - 0.7) / widest); title.scale.setScalar(fit); title.position.y = 0;         // the title alone, centred, inside the bill
    // one hard street light on the bill
    const sp = new THREE.SpotLight(0xdfe6ff, 90, 14, 0.5, 0.55, 1.3); sp.position.set(-FACADE + 3.2, y + 4.2, z + 0.4); sp.target.position.set(-FACADE, y, z); group.add(sp, sp.target);
    group.add(bill); bills.push({ bill, plate, mats, song: s, hov: 0, z });
  });
  // ---- quotes: a handful of lines from every song pasted high on the facades, each with a note you can click to be
  //      taken to that line in the song
  const quotes = [];
  const noteMat = () => new THREE.MeshStandardMaterial({ color: 0x7a0e14, roughness: 0.3, metalness: 0.55, emissive: 0x4a060a, emissiveIntensity: 0.9 });
  const noteIcon = mat => { const g = new THREE.Group();                                   // a quaver: head, stem, flag
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), mat); head.scale.set(1.25, 0.85, 0.5); head.rotation.z = 0.5; head.position.set(-0.1, -0.22, 0); g.add(head);
    const stem = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.78, 0.06), mat); stem.position.set(0.07, 0.12, 0); g.add(stem);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.06), mat); flag.position.set(0.22, 0.47, 0); flag.rotation.z = -0.55; g.add(flag);
    return g; };
  const quoteMat = new THREE.MeshStandardMaterial({ color: 0xcfc9bf, roughness: 0.7, emissive: 0x4a4640, emissiveIntensity: 0.55 });
  Promise.all(songs.map(s => fetch(`songs/${s.slug}/timing.json`).then(r => r.json()).then(tm => ({ s, tm })).catch(() => null))).then(all => {
    let n = 0;
    for (const item of all.filter(Boolean)) {
      const { s, tm } = item, L = tm.lines.map((l, i) => ({ l, i })).filter(x => x.l.text.split(' ').length >= 4 && x.l.t != null);
      const step = Math.max(1, Math.floor(L.length / 6)), picks = L.filter((_, k) => k % step === Math.floor(step / 2)).slice(0, 6);
      for (const { l, i } of picks) {
        const side = n % 2 ? 1 : -1, z = -34 - n * 19 - (n % 3) * 3, y = 5.2 + (n % 3) * 2.4, lines = wrap(l.text.replace(/[.,]$/, ''), 20);
        const q = new THREE.Group(); q.position.set(side * (FACADE - 0.08), y, z); q.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        lines.forEach((ln, k) => { const m = text(ln, 0.48, quoteMat, true); m.position.set(0, (lines.length - 1) * 0.36 - k * 0.72, 0.02); q.add(m); });
        const note = noteIcon(noteMat()); note.position.set(-2.9, (lines.length - 1) * 0.36 + 0.1, 0.1); q.add(note);
        const num = text(String(i + 1), 0.26, noteMat()); num.position.set(-2.9, (lines.length - 1) * 0.36 - 0.6, 0.06); q.add(num);
        const hit = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.9), new THREE.MeshBasicMaterial({ visible: false })); hit.position.set(-2.9, (lines.length - 1) * 0.36 - 0.2, 0.08); q.add(hit);
        group.add(q); quotes.push({ q, note, num, hit, song: s, line: i + 1, hov: 0 }); n++;
      }
    }
  });
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), look = new THREE.Vector3();
  let over = null, overNote = null;
  // ---- free movement: drag to look, WASD / arrows to walk, wheel to roll forward; the first touch ends the idle drift
  const free = { on: false, pos: new THREE.Vector3(-4.3, EYE + 0.15, 0), yaw: 0, pitch: 0, vel: new THREE.Vector3(), tyaw: 0, tpitch: 0, wheel: 0 };
  const keys = new Set(); let dragging = false, lastX = 0, lastY = 0, downAt = 0, moved = 0, held = false;   // press and hold = walk forward; drag = turn; a short tap = click
  addEventListener('keydown', e => { if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyQ', 'KeyE'].includes(e.code)) { keys.add(e.code); free.on = true; e.preventDefault(); } });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('pointerdown', e => { if (e.target.closest('a, button, #about')) return; dragging = true; lastX = e.clientX; lastY = e.clientY; downAt = performance.now(); moved = 0; });
  addEventListener('pointerup', () => { dragging = false; held = false; });
  addEventListener('pointermove', e => { if (!dragging) return; const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy); if (moved > 6) free.on = true; free.tyaw -= dx * 0.0032; free.tpitch = Math.max(-1.0, Math.min(0.9, free.tpitch - dy * 0.0028)); });
  addEventListener('wheel', e => { free.on = true; free.wheel += e.deltaY * 0.004; }, { passive: true });
  const mid = bills.reduce((a, b) => a + b.z, 0) / Math.max(1, bills.length);
  return {
    group,
    // a slow drift down the middle of the street, eyes on the wall of bills
    camera(camera, now, dt = 0.016) {
      if (!free.on) {
        const sway = Math.sin(now * 0.11) * 0.5, drift = Math.sin(now * 0.05) * 2.5;    // standing on the pavement across from the bills, weight shifting
        camera.position.set(-4.3 + sway, EYE + 0.15 + Math.sin(now * 0.37) * 0.03, mid + 6.5 + drift);
        look.set(-FACADE, 3.4, mid + Math.sin(now * 0.07) * 1.2);
        camera.lookAt(look);
        free.pos.copy(camera.position); const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ'); free.yaw = free.tyaw = e.y; free.pitch = free.tpitch = e.x;
        return;
      }
      // smooth look
      free.yaw += (free.tyaw - free.yaw) * Math.min(1, dt * 9); free.pitch += (free.tpitch - free.pitch) * Math.min(1, dt * 9);
      // smooth walk: acceleration along the view's heading, damping, a gentle bob
      const fwd = new THREE.Vector3(-Math.sin(free.yaw), 0, -Math.cos(free.yaw)), right = new THREE.Vector3(fwd.z, 0, -fwd.x);
      const acc = new THREE.Vector3();
      if (held) acc.add(fwd);                                                                 // the held press walks you forward
      if (keys.has('KeyW') || keys.has('ArrowUp')) acc.add(fwd); if (keys.has('KeyS') || keys.has('ArrowDown')) acc.sub(fwd);
      if (keys.has('KeyD') || keys.has('ArrowRight')) acc.add(right); if (keys.has('KeyA') || keys.has('ArrowLeft')) acc.sub(right);
      if (keys.has('KeyE')) acc.y += 1; if (keys.has('KeyQ')) acc.y -= 1;
      if (Math.abs(free.wheel) > 0.001) { acc.addScaledVector(fwd, -free.wheel * 6); free.wheel *= Math.exp(-dt * 6); }
      if (acc.lengthSq() > 0) acc.normalize().multiplyScalar(14);
      free.vel.addScaledVector(acc, dt); free.vel.multiplyScalar(Math.exp(-dt * 3.2));
      free.pos.addScaledVector(free.vel, dt);
      // stay in the streets: the avenue (|x| < 7.6), or up above the rooftops; height between eye level and the sky
      free.pos.y = Math.max(EYE + 0.15, Math.min(90, free.pos.y));
      if (free.pos.y < 40) free.pos.x = Math.max(-7.6, Math.min(7.6, free.pos.x));
      free.pos.z = Math.max(-980, Math.min(44, free.pos.z));
      const speed = free.vel.length(), bob = free.pos.y < 3 ? Math.abs(Math.sin(now * 7.5)) * 0.03 * Math.min(1, speed / 2) : 0;
      camera.position.copy(free.pos); camera.position.y += bob;
      camera.quaternion.setFromEuler(new THREE.Euler(free.pitch, free.yaw, 0, 'YXZ'));
    },
    pointer(x, y) { ndc.set(x, y); },
    update(dt, camera) {
      if (dragging && !held && performance.now() - downAt > 260) { held = true; free.on = true; }   // a press that lasts becomes a walk
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(bills.map(b => b.plate))[0];
      over = hit ? bills.find(b => b.plate === hit.object) : null;
      const nh = ray.intersectObjects(quotes.map(q => q.hit))[0];
      overNote = nh ? quotes.find(q => q.hit === nh.object) : null;
      document.body.style.cursor = (over || overNote) ? 'pointer' : '';
      for (const q of quotes) { q.hov += (((q === overNote) ? 1 : 0) - q.hov) * Math.min(1, dt * 7);
        q.note.traverse(o => { if (o.material) o.material.emissiveIntensity = 0.9 + q.hov * 1.6; }); q.num.material.emissiveIntensity = 0.9 + q.hov * 1.6;
        q.note.scale.setScalar(1 + q.hov * 0.25); }
      for (const b of bills) {
        b.hov += (((b === over) ? 1 : 0) - b.hov) * Math.min(1, dt * 6);
        b.mats.forEach(m => { m.emissiveIntensity = 0.8 + b.hov * 1.4; });
        b.bill.position.x = -FACADE + 0.06 + b.hov * 0.12;
      }
    },
    click() { if (held || moved > 6 || performance.now() - downAt > 300) return;   // a walk or a turn is not a click
      if (overNote) location.href = root + overNote.song.slug + '/line/' + overNote.line; else if (over) location.href = root + over.song.slug + '/'; },
    get free() { return free.on; },
    teleport(x, y, z, yaw = 0, pitch = 0) { free.on = true; free.pos.set(x, y, z); free.vel.set(0, 0, 0); free.yaw = free.tyaw = yaw; free.pitch = free.tpitch = pitch; },
  };
}
