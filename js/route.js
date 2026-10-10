// The storyboard: one continuous, slow camera path through the city for the whole song, keyed to the sections.
// Each beat is a list of keys [fraction of the section, x, y, z]; the camera eases from key to key and lingers
// where two keys sit at the same place. Every lyric line is placed squarely facing the camera, never tilted.
import * as THREE from 'three';
import { clamp } from './util.js?v=20261010230826';
import { FACADE, ROW2, ALLEYS, ROOM, BRIDGE, CHURCH, TOWER, ZS } from './layout.js?v=20261010230826';

const EYE = 1.7;
const A1 = ALLEYS[0], A2 = ALLEYS[1];
const W = ROOM.win;
const Z = z => z * ZS, CZ = CHURCH.z, TZ = TOWER.z;   // street positions scale with the stretched city; the gateway and tower keep their own distances

// place kinds: banner (across the way, a little high), ahead (eye level), sky (big and far), room (inside the apartment)
const BEATS = {
  Pre:     { sky: 'night', keys: [[0, 0, 92, 120], [0.5, 0, 40, 70], [0.85, 0, 8, 40], [1, 0, EYE + 0.3, 30]], place: ['sky'], lookAt: new THREE.Vector3(0, 44, -40), lookMix: 0.85 },
  Intro:   { sky: 'night', keys: [[0, 0, EYE, 30], [0.5, 0, EYE, Z(-6)], [1, 0, EYE, Z(-41)]], walk: 1,
             place: ['banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead'], dist: 22 },
  // the avenue goes dark around the walker: windows switch off, then the lamps, one lamp left at the alley mouth
  'Verse 1': { sky: 'verse', keys: [[0, 0, EYE, Z(-41)], [0.3, 0, EYE, Z(-48)], [0.55, -1.5, EYE, Z(-55)], [0.75, -6.5, EYE, A1.z + 1], [1, -12.5, EYE, A1.z]], walk: 1,
             place: ['banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead'], dist: 20 },
  // the crowd stands at the end of this alley and turns its back; then the alley floods and the hands come down
  'Rap 1': { sky: 'storm', keys: [[0, -12.5, EYE, A1.z], [0.12, -14.5, EYE, A1.z - 0.1], [0.22, -15.8, 1.5, A1.z], [0.3, -14.5, 0.9, A1.z - 0.2], [0.47, -14.2, 0.75, A1.z - 0.2], [0.6, -13, 1.2, A1.z], [0.72, -9.5, EYE, A1.z - 0.2], [0.78, -6.5, EYE, A1.z - 2.5], [0.84, -4.5, EYE, A1.z - 9], [1, -3, EYE, A1.z - 36]], stride: 1, dist: 9, dist2: [0.7, 20],   // 9 m in the alley; once out, the lines wait further down the avenue
             place: ['ahead', 'banner', 'ahead', 'banner', 'ahead', 'banner', 'banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead'], alley: A1,
             looks: [[0, -(ROW2 - 1.5), 1.0, A1.z, 1], [0.70, -(ROW2 - 1.5), 1.0, A1.z, 1], [0.82, -2, 1.6, A1.z - 40, 0.95], [1, 0, 1.6, A1.z - 80, 0.95]] },   // eyes on the end of the alley (the crowd, the water), then round to the avenue ahead as we leave
  // lights back on; walk out of the alley and down the avenue toward the lit ground-floor window
  'Pre-Chorus': { sky: 'breaking', keys: [[0, -3, EYE, A1.z - 36], [1, 3, EYE, W.z + 18]], walk: 1,
             place: ['ahead', 'ahead', 'ahead', 'ahead', 'ahead', 'ahead', 'ahead', 'ahead'], lookAt: new THREE.Vector3(FACADE, W.y, W.z), lookMix: 0.35, dist: 22 },
  // the apartment: up to the window for four lines, step in only for "forget to breathe / what I believe", step back out
  Chorus:  { sky: 'moon', keys: [[0, 3, EYE, W.z + 18], [0.25, 4.5, EYE, W.z + 4.5], [0.46, FACADE - 1.0, 1.65, W.z], [0.53, FACADE + 1.6, 1.65, W.z], [0.70, FACADE + 1.6, 1.65, W.z + 0.05], [0.78, FACADE - 1.6, 1.7, W.z], [1, 3, EYE, W.z - 15]],
             place: ['facadeL', 'facadeL', 'facadeL', 'facadeL', 'room', 'room', 'ahead', 'ahead'], dist: 9,
             looks: [[0, FACADE, W.y, W.z, 0.8], [0.46, FACADE, W.y, W.z, 0.8], [0.53, ROOM.x1, ROOM.y0 + 2.4, W.z, 1], [0.72, ROOM.x1, ROOM.y0 + 2.4, W.z, 1], [0.86, 0, 2.5, W.z - 54, 0.9], [1, 0, 2.5, W.z - 54, 0.9]] },   // out of the window and facing the street before the last two lines, so they stand clear of the wall
  'Verse 2': { sky: 'drizzle', keys: [[0, 3, EYE, W.z - 15], [0.3, 1, EYE, W.z - 36], [1, 0, EYE, A2.z]], walk: 1,
             place: ['ahead', 'banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead', 'banner'], dist: 21 },
  'Rap 2': { sky: 'storm', keys: [[0, 0, EYE, A2.z], [0.5, 0, EYE, (A2.z + BRIDGE.z + 18) / 2], [1, 0, EYE, BRIDGE.z + 18]], stride: 1,
             place: ['banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead'], dist: 20 },
  // under the overpass: stop, and turn to look back up the avenue at the lit window far behind
  Bridge:  { sky: 'fog', keys: [[0, 0, EYE, BRIDGE.z + 18], [0.3, 0, EYE, BRIDGE.z + 1], [1, 0.3, EYE, BRIDGE.z - 0.5]],
             place: ['ahead', 'banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead', 'banner'], dist: 11,
             looks: [[0, 0, 3, BRIDGE.z - 22, 0.9], [0.22, 0, 3, BRIDGE.z - 22, 0.9], [0.45, 2.5, 2.8, W.z - 30, 1], [1, 2.5, 2.8, W.z - 30, 1]] },
  // on toward the church, the R ahead the whole way
  'Final Chorus': { sky: 'breaking', keys: [[0, 0.3, EYE, BRIDGE.z - 0.5], [0.15, 0, EYE, BRIDGE.z - 7], [1, 0, EYE, Z(-262)]], walk: 1,
             place: ['banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead'], dist: 22, lookAt: new THREE.Vector3(0, 30, CHURCH.z), lookMix: 0.25 },
  Outro:   { sky: 'moon', keys: [[0, 0, EYE, Z(-262)], [0.5, 0, EYE, CZ + 118], [0.84, 0, EYE, CZ + 50], [1, 0, EYE, CZ + 30]], walk: 1,
             place: ['banner', 'banner', 'banner', 'banner', 'banner', 'banner', 'banner', 'banner'], lookAt: new THREE.Vector3(0, 12, CHURCH.z), lookMix: 0.3, dist: 21 },
  // "free": the city parts and the door opens; the walk slows to a stop before it and the eyes drop to the road,
  // where KARMA IS NEAR is painted: that is the last image
  // ...then the camera lifts off backwards into the air, the text staying centred below while the whole city opens up around it
  // "free": the door opens and we rush through it; then up and out to the tower, settling in front of the red R,
  // where the letters K A · M A land either side of it until the spire reads KARMA
  // "free": the door opens and we rush through the gateway; beyond it, a long shallow flight to the tower in the dark,
  // where the letters slide out of the R until it reads KARMA. The whole way stays on screen.
  End:     { sky: 'night', keys: [[0, 0, EYE, CZ + 30], [0.12, 0, EYE, CZ + 8], [0.2, 0, EYE + 0.4, CZ - 12], [0.45, 0, 26, CZ - 42], [0.74, 0, 56, CZ - 52], [1, 0, 56.5, CZ - 48]], place: ['ahead'],
             looks: [[0, 0, 2.3, CZ + 7, 0.95], [0.12, 0, 2.6, CZ - 12, 0.95], [0.2, 0, 30, TZ, 0.9], [0.45, 0, 62, TZ, 1], [1, 0, 62.5, TZ, 1]] },
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

  // the walking cycle at song time t for beat b: step rate, bounce, sway, roll, and a slow unevenness
  function gaitOf(b, t) {
    const w = b.stride ? 11.0 : b.walk ? 9.4 : 5.2;                               // step rate (rad/s): two steps per 2π
    const uneven = 1 + 0.22 * Math.sin(t * 0.9) * Math.sin(t * 1.7 + 1.1);       // steps that are never quite the same
    const amp = (b.stride ? 0.05 : b.walk ? 0.04 : 0.025) * uneven;
    const bob = Math.abs(Math.sin(t * w)) * amp + Math.sin(t * 0.37) * 0.006;      // one bounce per step
    const sway = Math.sin(t * w / 2 + 0.4) * (b.stride ? 0.028 : b.walk ? 0.022 : 0.01) * uneven;   // left foot, right foot
    const roll = Math.sin(t * w / 2 + 1.0) * (b.stride ? 0.0075 : b.walk ? 0.006 : 0.003);          // the head tilts with the sway (≈0.35°)
    const pitch = Math.cos(t * w) * (b.stride ? 0.0035 : b.walk ? 0.003 : 0.0015);                   // a nod at every footfall
    const yaw = (Math.sin(t * 0.61) * Math.sin(t * 1.13 + 0.7)) * (b.walk || b.stride ? 0.004 : 0.0015);   // the heading wanders a little
    // and a slow drift across the road: a walker never holds a dead-straight line (avenue beats only, ±1.6 m, ~30 s period)
    const drift = (b.walk || b.stride) ? (Math.sin(t * 0.21) * Math.sin(t * 0.09 + 1.3) * 1.6 + Math.sin(t * 0.33 + 0.5) * 0.35) : 0;
    return { bob, sway, roll, pitch, yaw, drift };
  }
  // camera pose at song time t: position + where it looks (before the slow easing in song.js)
  function pose(t, out = { pos: new THREE.Vector3(), look: new THREE.Vector3(), beat: null, u: 0 }) {
    const b = beatAt(t); out.beat = b;
    const u = uOf(b, t); out.u = u;
    b.curve.getPointAt(u, out.pos);
    b.curve.getPointAt(Math.min(1, u + 0.03), tmp).sub(out.pos);
    if (tmp.lengthSq() < 0.0004) { b.curve.getPointAt(Math.max(0, u - 0.03), tmp2); tmp.subVectors(out.pos, tmp2); }
    if (tmp.lengthSq() > 0.0004) lastDir.copy(tmp).normalize();
    // the gait: a real walk, not a glide. Each step bounces the eye, the body sways to the stepping foot, the steps are
    // never quite even, and the heading wanders a touch. Nothing large, nothing abrupt: a person walking, not a drone.
    if (out.pos.y < 3) {
      const g = gaitOf(b, t);
      out.pos.y += g.bob;
      const side = g.sway + (Math.abs(out.pos.x) < 6 ? g.drift : 0);        // the drift only on the open avenue, never in an alley or a doorway
      out.pos.x += lastDir.z * side; out.pos.z += -lastDir.x * side;        // along the right-hand vector
      if (Math.abs(out.pos.x) < 6) out.pos.x = Math.max(-3.2, Math.min(3.2, out.pos.x));   // and well inside the road, clear of the traffic lanes
    }
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
    const L = lines[i]; let b = beatAt(L.t); const idx = Math.max(0, b.lines.indexOf(i));
    const kind = b.place[idx % b.place.length];
    const cam = pose(L.t + 0.9);
    const fb = clamp((L.t - b.t0) / (b.t1 - b.t0)); if (b.dist2 && fb >= b.dist2[0]) b = { ...b, dist: b.dist2[1] };   // a beat may change its distance partway (out of the alley)
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
      // the alley the line is headed into, whether or not the beat declares one (a street beat turning into an alley)
      const al = b.alley || ALLEYS.find(A => Math.sign(pos.x) === A.side && Math.abs(pos.z - A.z) < A.w / 2 + 3 && Math.abs(cam.pos.z - A.z) < A.w / 2 + 3);
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
  const endBeat = beats.find(b => b.name === 'End');
  const endDur = endBeat.t1 - endBeat.t0;
  const T_DOOR = endBeat.t0 + 0.12 * endDur;
  // the door: fade to black as the rush reaches the threshold, hold while the camera climbs inside the tower unseen,
  // fade back in with the camera already in the air facing the spire
  function fade(t, out) {
    out.k = 0; return out;                                   // (no fade: the whole way to the tower stays on screen)
    const f = (t - endBeat.t0) / endDur;
    out.r = out.g = out.b = 0;
    if (f < 0.095) out.k = 0;
    else if (f < 0.13) out.k = smooth((f - 0.095) / 0.035);
    else if (f < 0.265) out.k = 1;
    else if (f < 0.315) out.k = 1 - smooth((f - 0.265) / 0.05);
    else out.k = 0;
    return out;
  }
  return {
    beats, pose, anchorFor, beatAt, fade, T_DOOR, gait(t) { return gaitOf(beatAt(t), t); }, T_VOID: 1e9, T_TOWER: endBeat.t0 + 0.74 * (endBeat.t1 - endBeat.t0),
    skyAt(t) { return beatAt(t).sky; },
    // how far the hands have pushed the viewer under the water (metres below the path), gasping back up after the line
    dive(t) { if (T_DROWN < 0) return 0; const down = smooth((t - T_DROWN - 1.2) / 1.6), up = smooth((t - T_DROWN - 3.4) / 2.8); return -0.72 * down * (1 - up); },
    cue(t, city) {
      if (T_FADE > 0) { const k = clamp((t - T_FADE - 0.3) / 2.6); const i = city.lampAt(Z(-46), -1); city.dimLamp(i, 1 - 0.97 * k * (1 - clamp((t - T_LIGHT) / 1.5))); }
      // "no one hears": the windows go dark in a wave; "left alone": the lamps go out, one stays at the alley mouth; back on at "I heard You call"
      if (T_HEARS > 0) {
        const on = 1 - clamp((t - T_CALL) / 3);
        const w = clamp((t - T_HEARS - 0.4) / 9);
        city.setDark(Math.min(1, w * 1.4) * on, Z(-40) - w * Z(330));
        const la = clamp((t - T_ALONE - 0.2) / 4) * on;
        city.lampPos.forEach(([x, z], i) => { if (z > -120 && z < -20) { const keep = Math.abs(z - (-53)) < 4 && x < 0; const order = clamp((la * 5 - Math.abs(z + 46) / 12)); city.dimLamp(i, keep ? 1 : 1 - 0.98 * order); } });
      }
    },
  };
}
