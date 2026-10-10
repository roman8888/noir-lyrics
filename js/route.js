// The storyboard: one continuous, slow camera path through the city for the whole song, keyed to the sections.
// Each beat is a list of keys [fraction of the section, x, y, z]; the camera eases from key to key and lingers
// where two keys sit at the same place. Every lyric line is placed squarely facing the camera, never tilted.
import * as THREE from 'three';
import { clamp } from './util.js?v=20261010200729';
import { FACADE, ROW2, ALLEYS, ROOM, BRIDGE, CHURCH } from './layout.js?v=20261010200729';

const EYE = 1.7;
const A1 = ALLEYS[0];
const W = ROOM.win;

// place kinds: banner (across the way, a little high), ahead (eye level), sky (big and far), room (inside the apartment)
const BEATS = {
  Pre:     { sky: 'night', keys: [[0, 0, 92, 90], [0.5, 0, 40, 36], [0.85, 0, 8, -4], [1, 0, EYE + 0.3, -14]], place: ['sky'], lookAt: new THREE.Vector3(0, 28, -62), lookMix: 0.85 },
  Intro:   { sky: 'night', keys: [[0, 0, EYE, -14], [0.5, 0, EYE, -28], [1, 0, EYE, -41]],
             place: ['banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead'], dist: 12 },
  // the avenue goes dark around the walker: windows switch off, then the lamps, one lamp left at the alley mouth
  'Verse 1': { sky: 'verse', keys: [[0, 0, EYE, -41], [0.3, 0, EYE, -47], [0.55, -1.5, EYE, -54], [0.75, -6.5, EYE, -61], [1, -12.5, EYE, -62]],
             place: ['banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead'], dist: 12 },
  // the crowd stands at the end of this alley and turns its back; then the alley floods and the hands come down
  'Rap 1': { sky: 'storm', keys: [[0, -12.5, EYE, -62], [0.12, -14.5, EYE, -62.1], [0.22, -15.8, 1.5, -62], [0.3, -14.5, 0.9, -62.2], [0.47, -14.2, 0.75, -62.2], [0.6, -13, 1.2, -62], [0.78, -7, EYE, -63], [1, -3, EYE, -74]], stride: 1,
             place: ['ahead', 'banner', 'ahead', 'banner', 'ahead', 'banner', 'banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead'], alley: A1,
             lookAt: new THREE.Vector3(-(ROW2 - 1.5), 1.0, A1.z), lookMix: 1 },   // eyes on the end of the alley: the crowd, then the water
  // lights back on; walk out of the alley and down the avenue toward the lit ground-floor window
  'Pre-Chorus': { sky: 'breaking', keys: [[0, -3, EYE, -74], [1, 3, EYE, -104]],
             place: ['ahead', 'ahead', 'ahead', 'ahead', 'ahead', 'ahead', 'ahead', 'ahead'], lookAt: new THREE.Vector3(FACADE, W.y, W.z), lookMix: 0.35, dist: 12 },
  // the apartment: up to the window for four lines, step in only for "forget to breathe / what I believe", step back out
  Chorus:  { sky: 'moon', keys: [[0, 3, EYE, -104], [0.25, 4.5, EYE, -108.5], [0.46, FACADE - 1.0, 1.65, W.z], [0.53, FACADE + 1.6, 1.65, W.z], [0.77, FACADE + 1.6, 1.65, W.z + 0.05], [0.86, FACADE - 1.6, 1.7, W.z], [1, 3, EYE, -115]],
             place: ['facadeL', 'facadeL', 'facadeL', 'facadeL', 'room', 'room', 'ahead', 'ahead'], dist: 9,
             looks: [[0, FACADE, W.y, W.z, 0.8], [0.46, FACADE, W.y, W.z, 0.8], [0.53, ROOM.x1, ROOM.y0 + 2.4, W.z, 1], [0.9, ROOM.x1, ROOM.y0 + 2.4, W.z, 1], [1, 0, 2.5, -128, 0.9]] },
  'Verse 2': { sky: 'drizzle', keys: [[0, 3, EYE, -115], [0.5, 1.2, EYE, -117], [1, 0, EYE, -119]],
             place: ['ahead', 'banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead', 'banner'], dist: 12 },
  'Rap 2': { sky: 'storm', keys: [[0, 0, EYE, -119], [0.5, 0, EYE, -146], [1, 0, EYE, -172]], stride: 1,
             place: ['banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead'], dist: 12 },
  // under the overpass: stop, and turn to look back up the avenue at the lit window far behind
  Bridge:  { sky: 'fog', keys: [[0, 0, EYE, -172], [0.3, 0, EYE, -177], [1, 0.3, EYE, -178.5]],
             place: ['ahead', 'banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead', 'banner'], dist: 11,
             looks: [[0, 0, 3, -200, 0.9], [0.22, 0, 3, -200, 0.9], [0.45, 2.5, 2.8, -118, 1], [1, 2.5, 2.8, -118, 1]] },
  // on toward the church, the R ahead the whole way
  'Final Chorus': { sky: 'breaking', keys: [[0, 0.3, EYE, -178.5], [0.15, 0, EYE, -184], [1, 0, EYE, -235]],
             place: ['banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead'], dist: 12, lookAt: new THREE.Vector3(0, 30, CHURCH.z), lookMix: 0.25 },
  Outro:   { sky: 'moon', keys: [[0, 0, EYE, -235], [0.5, 0, EYE, -255], [1, 0, EYE, -270]],
             place: ['banner', 'banner', 'banner', 'banner', 'banner', 'banner', 'banner', 'banner'], lookAt: new THREE.Vector3(0, 20, CHURCH.z), lookMix: 0.3, dist: 12 },
  // "set me free": the camera leaves the street and climbs until the city is tiny below, the R never leaving the frame
  End:     { sky: 'night', keys: [[0, 0, EYE, -270], [0.3, 0, 60, -268], [0.65, 14, 160, -272], [1, 0, 240, -290]], place: ['ahead'], lookAt: new THREE.Vector3(0, 54, CHURCH.z - 2), lookMix: 0.92 },
};
const ORDER = ['Pre', 'Intro', 'Verse 1', 'Rap 1', 'Pre-Chorus', 'Chorus', 'Verse 2', 'Rap 2', 'Bridge', 'Final Chorus', 'Outro', 'End'];
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };

export function createRoute(timing) {
  const sec = Object.fromEntries(timing.sections.map(s => [s.name, s.t]));
  const lines = timing.lines;
  const beats = [];
  ORDER.forEach((name, k) => {
    const b = { name, ...BEATS[name] };
    b.t0 = name === 'Pre' ? -0.5 : (sec[name] ?? 0) - 0.6;
    const next = ORDER[k + 1];
    b.t1 = next ? (sec[next] ?? 1e9) - 0.6 : b.t0 + 34;
    b.lines = lines.map((L, i) => ({ L, i })).filter(x => x.L.t >= b.t0 && x.L.t < b.t1).map(x => x.i);
    const pts = b.keys.map(kk => new THREE.Vector3(kk[1], kk[2], kk[3]));
    for (let i = 1; i < pts.length; i++) if (pts[i].distanceTo(pts[i - 1]) < 0.02) pts[i].z += 0.03 * i;   // the spline needs distinct points
    b.curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
    const lens = b.curve.getLengths(400), total = lens[lens.length - 1] || 1;
    b.uAt = pts.map((p, i) => {                                            // arc-length fraction at every key
      if (i === 0) return 0; if (i === pts.length - 1) return 1;
      let best = 0, bd = 1e9; for (let s = 0; s <= 400; s++) { const d = b.curve.getPoint(s / 400).distanceToSquared(p); if (d < bd) { bd = d; best = s; } }
      return lens[best] / total;
    });
    beats.push(b);
  });
  const beatAt = t => { let b = beats[0]; for (const x of beats) if (x.t0 <= t) b = x; return b; };
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), lastDir = new THREE.Vector3(0, 0, -1);

  function uOf(b, t) {
    const f = clamp((t - b.t0) / (b.t1 - b.t0)), K = b.keys;
    let k = 0; for (let i = 0; i < K.length - 1; i++) if (f >= K[i][0]) k = i;
    const f0 = K[k][0], f1 = K[k + 1][0];
    return b.uAt[k] + (b.uAt[k + 1] - b.uAt[k]) * (f1 > f0 ? smooth((f - f0) / (f1 - f0)) : 1);
  }

  // camera pose at song time t: position + where it looks (before the slow easing in song.js)
  function pose(t, out = { pos: new THREE.Vector3(), look: new THREE.Vector3(), beat: null, u: 0 }) {
    const b = beatAt(t); out.beat = b;
    const u = uOf(b, t); out.u = u;
    b.curve.getPointAt(u, out.pos);
    if (out.pos.y < 3) out.pos.y += Math.abs(Math.sin(t * (b.stride ? 7.6 : 5.2))) * (b.stride ? 0.05 : 0.03);   // footsteps; a harder stride in the raps
    b.curve.getPointAt(Math.min(1, u + 0.03), tmp).sub(out.pos);
    if (tmp.lengthSq() < 0.0004) { b.curve.getPointAt(Math.max(0, u - 0.03), tmp2); tmp.subVectors(out.pos, tmp2); }
    if (tmp.lengthSq() > 0.0004) lastDir.copy(tmp).normalize();
    out.look.copy(out.pos).addScaledVector(lastDir, 8);
    if (b.looks) {
      const f = clamp((t - b.t0) / (b.t1 - b.t0)), K = b.looks; let k = 0; for (let i = 0; i < K.length - 1; i++) if (f >= K[i][0]) k = i;
      const a0 = K[k], a1 = K[k + 1], g = a1[0] > a0[0] ? smooth((f - a0[0]) / (a1[0] - a0[0])) : 1;
      tmp2.set(a0[1] + (a1[1] - a0[1]) * g, a0[2] + (a1[2] - a0[2]) * g, a0[3] + (a1[3] - a0[3]) * g);
      out.look.lerp(tmp2, a0[4] + (a1[4] - a0[4]) * g);
    } else if (b.lookAt) out.look.lerp(b.lookAt, b.lookMix ?? 1);
    return out;
  }

  // where line i lives: upright, squarely facing the camera, inside the street (or its alley). Occlusion and
  // fit-to-frame are resolved by the lyric engine when it builds the line (it knows the line's width).
  const anchors = new Map();
  function anchorFor(i) {
    if (anchors.has(i)) return anchors.get(i);
    const L = lines[i], b = beatAt(L.t), idx = Math.max(0, b.lines.indexOf(i));
    const kind = b.place[idx % b.place.length];
    const cam = pose(L.t + 0.9);
    const camPos = cam.pos.clone();
    const fwd = tmp.copy(cam.look).sub(cam.pos); fwd.y = 0; if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1); fwd.normalize();
    const yawTo = (from, to) => Math.atan2(from.x - to.x, from.z - to.z);
    const pos = new THREE.Vector3(), q = new THREE.Quaternion(), E = new THREE.Euler(); let scale = 1;
    switch (kind) {
      case 'banner': pos.copy(cam.pos).addScaledVector(fwd, b.dist ?? 9); pos.y = cam.pos.y + (b.alley ? 1.8 : 0.9); break;   // in the alley: above the figures' heads       // same height every time: no hopping between lines
      case 'ahead':  pos.copy(cam.pos).addScaledVector(fwd, (b.dist ?? 9) - 0.5); pos.y = cam.pos.y + (b.alley ? 1.7 : 0.8); break;
      case 'sky':    pos.copy(cam.pos).addScaledVector(fwd, 22); pos.y = cam.pos.y + 1.5; scale = 2.6; break;
      case 'facadeL': case 'facadeR':                           // written on the wall beside the apartment window
        pos.set(FACADE - 0.12, 2.3, W.z + (kind === 'facadeL' ? 3.6 : -3.6)); q.setFromEuler(E.set(0, -Math.PI / 2, 0)); scale = 0.6; break;
      case 'room':                                              // every line on the back wall, high, above the man: the camera never turns
        pos.set(ROOM.x1 - 0.12, ROOM.y0 + 2.5, (ROOM.z0 + ROOM.z1) / 2); q.setFromEuler(E.set(0, -Math.PI / 2, 0)); scale = 0.5; break;
    }
    if (kind !== 'room' && kind !== 'facadeL' && kind !== 'facadeR') {
      pos.y += b.lift ?? 0;
      if (b.lateral) pos.addScaledVector(new THREE.Vector3(fwd.z, 0, -fwd.x), (idx % 2 ? 1 : -1) * b.lateral);   // beside the walk, not in it
      const al = b.alley;
      if (al && Math.abs(pos.x) > FACADE - 1) {                              // inside the alley: between its walls, short of its end
        pos.z = Math.min(al.z + al.w / 2 - 0.5, Math.max(al.z - al.w / 2 + 0.5, pos.z));
        if (Math.abs(pos.x) > ROW2 - 1.5) pos.x = Math.sign(pos.x) * (ROW2 - 1.5);
      } else if (Math.abs(pos.x) > FACADE - 1.3 && pos.y < 40 && Math.abs(cam.pos.x) < FACADE - 1.3) pos.x = Math.sign(pos.x) * (FACADE - 1.3);   // (not when the camera itself is inside a building)
      q.setFromEuler(E.set(0, yawTo(cam.pos, pos), 0));
    }
    const a = { pos, q, scale, kind, beat: b, camPos };
    anchors.set(i, a); return a;
  }

  const T_FADE = lines.find(l => /light begins to fade/i.test(l.text))?.t ?? -1;
  const T_LIGHT = lines.find(l => /find my light/i.test(l.text))?.t ?? -1;
  const T_HEARS = lines.find(l => /no one hears/i.test(l.text))?.t ?? -1;
  const T_DROWN = lines.find(l => /watched me drown/i.test(l.text))?.t ?? -1;
  const T_ALONE = lines.find(l => /wonder why you're left alone/i.test(l.text))?.t ?? -1;
  const T_CALL = lines.find(l => /i heard you call/i.test(l.text))?.t ?? -1;
  return {
    beats, pose, anchorFor, beatAt,
    skyAt(t) { return beatAt(t).sky; },
    // how far the hands have pushed the viewer under the water (metres below the path), gasping back up after the line
    dive(t) { if (T_DROWN < 0) return 0; const down = smooth((t - T_DROWN - 0.5) / 1.7), up = smooth((t - T_DROWN - 3.3) / 1.4); return -0.72 * down * (1 - up); },
    cue(t, city) {
      if (T_FADE > 0) { const k = clamp((t - T_FADE - 0.3) / 2.6); const i = city.lampAt(-46, -1); city.dimLamp(i, 1 - 0.97 * k * (1 - clamp((t - T_LIGHT) / 1.5))); }
      // "no one hears": the windows go dark in a wave; "left alone": the lamps go out, one stays at the alley mouth; back on at "I heard You call"
      if (T_HEARS > 0) {
        const on = 1 - clamp((t - T_CALL) / 3);
        const w = clamp((t - T_HEARS - 0.4) / 9);
        city.setDark(Math.min(1, w * 1.4) * on, -40 - w * 330);
        const la = clamp((t - T_ALONE - 0.2) / 4) * on;
        city.lampPos.forEach(([x, z], i) => { if (z > -120 && z < -20) { const keep = Math.abs(z - (-53)) < 4 && x < 0; const order = clamp((la * 5 - Math.abs(z + 46) / 12)); city.dimLamp(i, keep ? 1 : 1 - 0.98 * order); } });
      }
    },
  };
}
