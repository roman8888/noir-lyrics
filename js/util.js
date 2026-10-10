import * as THREE from 'three';

export function rng(seed) {                       // mulberry32
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const easeOutExpo = x => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
export const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

// Rain streaks that live in a box around the camera.
export function makeRain(count, color, opacity) {
  const BX = 30, BY = 22, BZ = 40;
  const pos = new Float32Array(count * 6), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * BX, y = (Math.random() - 0.5) * BY, z = (Math.random() - 0.5) * BZ;
    pos.set([x, y, z, x + 0.03, y + 0.45, z], i * 6); seed[i] = 0.7 + Math.random() * 0.6;
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  const object = new THREE.LineSegments(geo, mat); object.frustumCulled = false;
  return {
    object, mat,
    update(dt, center, speed) {
      object.position.copy(center);
      const fall = 22 * dt * speed;
      for (let i = 0; i < count; i++) {
        const o = i * 6; let y = pos[o + 1] - fall * seed[i];
        if (y < -BY / 2) y += BY;
        pos[o + 1] = y; pos[o + 4] = y + 0.45 * Math.max(speed, 0.15);
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

// LRC with optional enhanced word tags: [01:02.30]<01:02.30>word <01:02.80>word
export function parseLRC(text) {
  const tag = /\[(\d+):(\d+(?:\.\d+)?)\]/g, wtag = /<(\d+):(\d+(?:\.\d+)?)>([^<]*)/g;
  const out = [];
  for (const raw of text.split(/\r?\n/)) {
    const stamps = [...raw.matchAll(tag)];
    if (!stamps.length) continue;
    const body = raw.replace(tag, '').trim();
    if (!body) continue;
    let words = null;
    if (body.includes('<')) {
      words = [...body.matchAll(wtag)].map(m => ({ t: +m[1] * 60 + +m[2], w: m[3].trim() })).filter(x => x.w);
    }
    const text = words ? words.map(x => x.w).join(' ') : body;
    for (const s of stamps) out.push({ t: +s[1] * 60 + +s[2], text, words });
  }
  return out.sort((a, b) => a.t - b.t);
}

export function toLRC(lines, title) {
  const ts = t => `${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(2).padStart(5, '0')}`;
  return `[ti:${title}]\n` + lines.filter(l => l.t != null).map(l => `[${ts(l.t)}]${l.text}`).join('\n') + '\n';
}
