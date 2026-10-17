// The storyboard: one continuous, slow camera path through the city for the whole song, keyed to the sections.
// Each beat is a list of keys [fraction of the section, x, y, z]; the camera eases from key to key and lingers
// where two keys sit at the same place. Every lyric line is placed squarely facing the camera, never tilted.
import * as THREE from 'three';
import { clamp } from './util.js?v=20261017144812';
import { FACADE, ROW2, ALLEYS, ROOM, BRIDGE, CHURCH, TOWER, ZS } from './layout.js?v=20261017144812';

const EYE = 1.7;
const A1 = ALLEYS[0], A2 = ALLEYS[1];
const W = ROOM.win;
const Z = z => z * ZS, CZ = CHURCH.z, TZ = TOWER.z;   // street positions scale with the stretched city; the gateway and tower keep their own distances

// place kinds: banner (across the way, a little high), ahead (eye level), sky (big and far), room (inside the apartment)
const BEATS1 = {
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
const ORDER1 = ['Pre', 'Intro', 'Verse 1', 'Rap 1', 'Pre-Chorus', 'Chorus', 'Verse 2', 'Rap 2', 'Bridge', 'Final Chorus', 'Outro', 'End'];

// ---- "On My Way to You": the same city, a harder walk. Spoken intro down the avenue toward one lit figure; the words
// rain down and bury the road; the LIES wall ahead is torn through; the chorus runs; the hands and the water again, but
// this time you come up; the cold bridge at the alley mouth; the storm run to the gate; the door closes on the last line.
// The back lane: x = LANE behind the left row, from the landing at z -300 down past the overpass' latitude. The third
// alley meets it at z -672, flooded. No street lamps here, only bulbs on wires (props2).
const LANE = -23, A3 = ALLEYS[2];
const BEATS2 = {
  Pre:     { sky: 'night', keys: [[0, LANE, 92, -210], [0.5, LANE, 40, -260], [0.85, LANE, 8, -290], [1, LANE, EYE + 0.3, -300]], place: ['sky'], looks: [[0, LANE, 44, -370, 0.85], [0.7, LANE, 20, -380, 0.85], [1, LANE, 2.2, -340, 0.9]] },   // the eyes come down to the lane before the first line
  Intro:   { sky: 'night', keys: [[0, LANE, EYE, -300], [0.58, LANE, EYE, -318], [1, LANE, EYE, -352]], walk: 1,     // slow and heavy, then the walk picks up on "I'm on my way to you"
             place: ['ahead', 'ahead', 'ahead', 'banner', 'ahead', 'banner', 'ahead', 'ahead'], dist: 16 },
  'Verse 1': { sky: 'verse', keys: [[0, LANE, EYE, -352], [0.5, LANE, EYE, -378], [1, LANE, EYE, -405]], walk: 1,
             place: ['banner', 'ahead', 'banner', 'ahead', 'banner', 'banner', 'ahead', 'banner'], dist: 17 },
  'Pre-Chorus': { sky: 'storm', keys: [[0, LANE, EYE, -405], [1, LANE, EYE, -500]], walk: 1,
             place: ['ahead', 'ahead', 'ahead', 'banner', 'banner', 'ahead', 'ahead'], dist: 20 },   // (no 'sky' in the lane: its 2.6× letters sit 8 m away under the wires)
  Chorus:  { sky: 'storm', keys: [[0, LANE, EYE, -500], [1, LANE, EYE, -640]], stride: 1,
             place: ['ahead', 'ahead', 'banner', 'ahead', 'banner', 'ahead', 'ahead', 'banner', 'ahead', 'banner', 'ahead'], dist: 20 },
  // the flooded crossing: the hands and the water again, and this time you come up
  'Verse 2': { sky: 'storm', keys: [[0, LANE, EYE, -640], [0.14, LANE, EYE, -658], [0.22, LANE + 1, 1.3, A3.z + 8], [0.3, LANE + 2, 0.9, A3.z + 4], [0.62, LANE + 2, 0.8, A3.z], [0.8, LANE + 1.5, 1.1, A3.z - 3.5], [1, LANE, EYE, A3.z - 8]],   // keys ≥3 m apart and monotone in z: near-duplicate keys made the spline loop and lift the eye above the water
             place: ['banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead', 'banner'], dist: 9, walk: 1,
             looks: [[0, LANE, 1.6, -690, 0.9], [0.22, LANE + 2, 0.9, A3.z - 4, 1], [0.8, LANE + 2, 0.9, A3.z - 8, 1], [1, LANE, 1.6, A3.z - 36, 0.9]] },
  // the cold bridge: standing past the water, the lane dark ahead; he comes to you
  Bridge:  { sky: 'fog', keys: [[0, LANE, EYE, A3.z - 8], [0.4, LANE, EYE, A3.z - 11], [1, LANE, EYE, A3.z - 13]],
             place: ['ahead', 'ahead', 'ahead', 'ahead', 'ahead', 'ahead', 'ahead'], dist: 11,
             looks: [[0, LANE, 1.6, A3.z - 30, 0.95], [1, LANE, 1.6, A3.z - 40, 0.95]] },
  // the run down the lane through the storm
  'Final Chorus': { sky: 'storm', keys: [[0, LANE, EYE, A3.z - 13], [1, LANE, EYE, -860]], stride: 1, dist: 22,
             place: ['ahead', 'ahead', 'banner', 'ahead', 'ahead', 'banner', 'ahead', 'banner', 'ahead', 'banner', 'ahead', 'ahead', 'banner'] },
  // whispered: slowing to a stop; the bulbs go out down the lane
  Outro:   { sky: 'night', keys: [[0, LANE, EYE, -860], [0.6, LANE, EYE, -884], [1, LANE, EYE, -892]], walk: 1,
             place: ['banner', 'banner', 'banner', 'banner'], dist: 13 },
  // the drone shot: straight up out of the lane, over the roofs, the eyes on I'M COMING standing over the end of the lane
  // the drone shot: up out of the lane in front of the slammed door, over the roofs, in toward the tower, where I AM COMING
  // stands in place of the R (the tower is at z -1085, straight down the lane's heading)
  End:     { sky: 'night', keys: [[0, LANE, EYE, -892], [0.2, LANE, 7, -891], [0.5, LANE + 4, 34, -920], [1, -5, 58, -1000]], place: ['ahead'],
             looks: [[0, LANE, 8, -896, 0.95], [0.25, LANE, 20, -920, 0.96], [0.55, -4, 60, -1085, 0.97], [1, 0, 62, -1085, 0.98]] },
};
const ORDER2 = ['Pre', 'Intro', 'Verse 1', 'Pre-Chorus', 'Chorus', 'Verse 2', 'Bridge', 'Final Chorus', 'Outro', 'End'];
const STORY = { 'when-god-wants-to-make-you-stronger': [BEATS1, ORDER1], 'on-my-way-to-you': [BEATS2, ORDER2] };
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };

export function createRoute(timing, slug = 'when-god-wants-to-make-you-stronger') {
  const [BEATS, ORDER] = STORY[slug] || STORY['when-god-wants-to-make-you-stronger'];
  const sec = Object.fromEntries(timing.sections.map(s => [s.name, s.t]));
  if (sec.End == null) sec.End = (timing.lines.filter(l => l.t != null).slice(-1)[0]?.t ?? 0) + 5;   // no End section in the lyrics: it begins a few seconds after the last line
  const lines = timing.lines;
  const beats = [];
  ORDER.forEach((name, k) => {
    const b = { name, ...BEATS[name] };
    b.t0 = name === 'Pre' ? -0.5 : (sec[name] ?? 0) - 0.6;
    const next = ORDER[k + 1];
    b.t1 = next ? (sec[next] ?? 1e9) - 0.6 : b.t0 + 34;
    b.lines = lines.map((L, i) => ({ L, i })).filter(x => x.L.t >= b.t0 && x.L.t < b.t1).map(x => x.i);
    const pts = b.keys.map(kk => new THREE.Vector3(kk[1], kk[2], kk[3]));
    const two = pts.length === 2; if (two) pts.splice(1, 0, pts[0].clone().lerp(pts[1], 0.5));   // two keys: a Catmull-Rom through two points bends BACKWARDS at its start (the camera jumped, lines landed behind you); a midpoint on the curve only — the pacing still has two keys, no stop halfway
    for (let i = 1; i < pts.length; i++) if (pts[i].distanceTo(pts[i - 1]) < 0.02) pts[i].z += 0.03 * i;   // the spline needs distinct points
    b.curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
    const lens = b.curve.getLengths(400), total = lens[lens.length - 1] || 1;
    b.uAt = pts.map((p, i) => {                                            // arc-length fraction at every key
      if (i === 0) return 0; if (i === pts.length - 1) return 1;
      let best = 0, bd = 1e9; for (let s = 0; s <= 400; s++) { const d = b.curve.getPoint(s / 400).distanceToSquared(p); if (d < bd) { bd = d; best = s; } }
      return lens[best] / total;
    });
    if (two) b.uAt = [0, 1];
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
  function gaitOf(b, t, run = 0) {
    const w = (b.stride ? 11.0 : b.walk ? 9.4 : 5.2) * (1 + 0.55 * run);           // step rate (rad/s): two steps per 2π; faster when running
    const uneven = 1 + 0.22 * Math.sin(t * 0.9) * Math.sin(t * 1.7 + 1.1);       // steps that are never quite the same
    const amp = (b.stride ? 0.05 : b.walk ? 0.04 : 0.025) * uneven * (1 + 0.9 * run);
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
    const u = uOf(b, t - lingerAt(t)); out.u = u;
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
      const dash = dashAt(t); if (dash > 0) out.pos.x += (dodgeX(t) - out.pos.x) * dash;      // the run for the kerb when a car comes
    }
    const sg = surgeAt(t) + pushAt(t) + stompAt(t); if (sg > 0) out.pos.addScaledVector(lastDir, sg);   // the run forward, the push on "so am I", the stomps on "Enough"
    out.pos.y += shoveAt(t) + (stompAt(t) > 0 ? -0.06 * stompAt(t) : 0) - 0.09 * slamAt(t) * Math.abs(Math.sin((t - T_SLAM) * 38));   // the slam shakes the ground under you                            // shoved down, up for air; the stomp lands heavy
    const pl = pullAt(t); if (pl > 0) {                                                            // "I'm coming for me": back and up, to see the man standing there
      if (!selfSpot) selfSpot = out.pos.clone();
      out.pos.copy(selfSpot).addScaledVector(lastDir, -8.5 * pl); out.pos.y += 4.6 * pl; }
    out.look.copy(out.pos).addScaledVector(lastDir, 8);
    if (b.looks) {
      const f = clamp((t - b.t0) / (b.t1 - b.t0)), K = b.looks; let k = 0; for (let i = 0; i < K.length - 1; i++) if (f >= K[i][0]) k = i;
      const a0 = K[k], a1 = K[k + 1], g = a1[0] > a0[0] ? smooth((f - a0[0]) / (a1[0] - a0[0])) : 1;
      tmp2.set(a0[1] + (a1[1] - a0[1]) * g, a0[2] + (a1[2] - a0[2]) * g, a0[3] + (a1[3] - a0[3]) * g);
      out.look.lerp(tmp2, a0[4] + (a1[4] - a0[4]) * g);
    } else if (b.lookAt) out.look.lerp(b.lookAt, b.lookMix ?? 1);
    for (const c of CARS) { const k = t - c.t, g = smooth((k - 1.2) / 1.0) * (1 - smooth((k - 4.6) / 0.9));   // eyes on the car as it comes, then it is past
      if (g > 0 && carAt(t, tmp2)) { tmp2.y = 1.1; out.look.lerp(tmp2, 0.8 * g); } }
    if (pl > 0 && selfSpot) { tmp2.copy(selfSpot); tmp2.y = 1.2; out.look.lerp(tmp2, 0.95 * pl); }
    const bu = buryAt(t); if (bu > 0 && (graveAt || !graveInit)) { if (!graveAt) { graveInit = true; const p0 = pose(T_BURY); graveAt = p0.pos.clone().addScaledVector(lastDir, 12); graveAt.y = -0.3; }   // (graveInit guards the pose→look→pose loop)
      tmp2.copy(graveAt); if (tmp2.distanceTo(out.pos) < 2.5) { tmp2.copy(out.pos).addScaledVector(lastDir, 2.5); tmp2.y = -0.3; } out.look.lerp(tmp2, 0.9 * bu); }
    const pr = prayAt(t); if (pr > 0) { tmp2.copy(out.pos).addScaledVector(lastDir, 5); tmp2.y += 13; out.look.lerp(tmp2, 0.92 * pr); }   // up to the sky for "pray"
    const fl = floorAt(t); if (fl > 0) {                                                                                   // down to where the letters land
      if (!landing) { landing = anchorFor(I_FALL).pos.clone(); landing.y = 0.1; }
      tmp2.copy(landing); const dz = tmp2.distanceTo(out.pos); if (dz < 2.5) { tmp2.copy(out.pos).addScaledVector(lastDir, 2.5); tmp2.y = -0.3; }   // once over them, just down the road
      out.look.lerp(tmp2, 0.95 * fl); }
    return out;
  }

  // where line i lives: upright, squarely facing the camera, inside the street (or its alley). Occlusion and
  // fit-to-frame are resolved by the lyric engine when it builds the line (it knows the line's width).
  const anchors = new Map();
  function anchorFor(i) {
    if (anchors.has(i)) return anchors.get(i);
    const L = lines[i]; let b = beatAt(L.t); const idx = Math.max(0, b.lines.indexOf(i));
    const kind = b.place[idx % b.place.length];
    const nextT = lines.slice(i + 1).find(x => x.t != null)?.t ?? L.t + 4, mid = Math.max(0.9, Math.min(2.0, 0.45 * (nextT - L.t)));   // the eyes may still be swinging as the line starts: place it where they will be in the middle of it
    const cam = pose(prayAt(L.t + 0.9) > 0 ? T_PRAY : L.t + (L.t < 8 ? 2.2 : mid));   // a line sung with the eyes up is placed where the eyes will be; the first lines where the descent will have landed
    const fb = clamp((L.t - b.t0) / (b.t1 - b.t0)); if (b.dist2 && fb >= b.dist2[0]) b = { ...b, dist: b.dist2[1] };   // a beat may change its distance partway (out of the alley)
    const camPos = cam.pos.clone();
    const fwd = tmp.copy(cam.look).sub(cam.pos); fwd.y = 0; if (fwd.lengthSq() < 1e-4) fwd.set(0, 0, -1); fwd.normalize();
    if (CARS.some(c => { const k = L.t + 0.9 - c.t; return k > 0.8 && k < 5.4; })) {                 // the eyes are on a passing car: place the line down the road, where they come back to
      const p1 = pose(L.t + 1.6).pos.clone(), p0 = pose(L.t + 0.4).pos; p1.sub(p0); p1.y = 0; if (p1.lengthSq() > 0.09) fwd.copy(p1.normalize()); }
    const yawTo = (from, to) => Math.atan2(from.x - to.x, from.z - to.z);
    const pos = new THREE.Vector3(), q = new THREE.Quaternion(), E = new THREE.Euler(); let scale = 1;
    switch (kind) {
      case 'banner': pos.copy(cam.pos).addScaledVector(fwd, b.dist ?? 9); pos.y = cam.pos.y + (b.alley ? 1.8 : 0.9);
        { const up = tmp.copy(cam.look).sub(cam.pos); if (up.y > 0.35 * Math.hypot(up.x, up.z)) { up.normalize(); pos.copy(cam.pos).addScaledVector(up, (b.dist ?? 9) * 0.8); } }   // eyes up: the line hangs in the sky
        break;   // in the alley: above the figures' heads       // same height every time: no hopping between lines
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
      if (cam.pos.x < -18.5 && cam.pos.x > -27.5 && pos.y < 40) { pos.x = Math.max(LANE - 2.3, Math.min(LANE + 2.3, pos.x)); pos.z = Math.min(pos.z, cam.pos.z - Math.max(8, (b.dist ?? 9) - 1)); }   // the back lane: a line never leaves its 8 m, never behind you (a turning look once put one inside the row-0 wall)
      q.setFromEuler(E.set(0, yawTo(cam.pos, pos), 0));
    }
    let noOcc = false;
    if (cam.pos.y < 1.25 && kind !== 'room') {                                                      // sung from the water, inside the ring of hands: small, close, in the clear centre, and the occlusion rule leaves it alone
      pos.copy(cam.pos).addScaledVector(fwd, 3.0); pos.y = cam.pos.y + 0.06; scale = 0.17; q.setFromEuler(E.set(0, yawTo(cam.pos, pos), 0)); noOcc = true; }   // ~22° wide: inside the clear centre the hands leave
    const a = { pos, q, scale, kind, beat: b, camPos, fall: i === I_FALL, noOcc };   // fall: the letters drop to the road after the line
    anchors.set(i, a); return a;
  }

  const T_FADE = lines.find(l => /light begins to fade/i.test(l.text))?.t ?? -1;
  const T_LIGHT = lines.find(l => /find my light/i.test(l.text))?.t ?? -1;
  const T_HEARS = lines.find(l => /no one hears/i.test(l.text))?.t ?? -1;
  const T_DROWN = lines.find(l => /watch(ed)? me drown/i.test(l.text))?.t ?? -1;
  const T_AIR = lines.find(l => /still got air/i.test(l.text))?.t ?? -1;      // (song 2) you come up for air on that line
  const T_ALONE = lines.find(l => /wonder why you're left alone/i.test(l.text))?.t ?? -1;
  // the cars: three times a car comes down the avenue toward you, in its own lane until the last second, then switches
  // lanes straight at you, high beams up; you break into a run for the far kerb and it tears past where you were walking
  const CAR_V = 26, CAR_HIT = 4.2;                                           // speed; seconds after the cue it reaches your line
  const CARS = [['thought i\'d crawl', 4.2, -6.2], ['slammed the door', -4.2, 6.2], ['took so much', 4.2, -6.2]]
    .map(([re, lane, dodge]) => ({ t: lines.find(l => l.text.toLowerCase().includes(re))?.t ?? -1, lane, dodge, z0: null, xHit: 0 }))
    .filter(c => c.t > 0);
  let carInit = false;
  function carAt(t, out) {                                                   // the car on the road at song time t (null = none)
    if (carInit === null) return null;                                       // (initialising: no glance yet)
    if (!carInit) { carInit = null; noDash = true; for (const c of CARS) { const p = pose(c.t + CAR_HIT); c.z0 = p.pos.z - CAR_HIT * CAR_V; c.xHit = p.pos.x; } noDash = false; carInit = true; }   // it aims at where you WOULD have been walking
    for (const c of CARS) { const k = t - c.t; if (k < -0.5 || k > 11) continue;
      const sw = smooth((k - (CAR_HIT - 1.4)) / 1.1);                         // the lane switch: the last 1.4 s, straight at you
      out.set(c.lane + (c.xHit - c.lane) * sw, 0, c.z0 + Math.max(0, k) * CAR_V); out.dodge = c.dodge; return out; }
    return null;
  }
  let noDash = false;
  const dashAt = t => { if (noDash) return 0; let d = 0; for (const c of CARS) d = Math.max(d, smooth((t - (c.t + 2.3)) / 0.8) * (1 - smooth((t - (c.t + 6.0)) / 2.4))); return d; };   // the run for the kerb, and back
  const dodgeX = t => { for (const c of CARS) if (t > c.t && t < c.t + 11) return c.dodge; return 0; };
  // "pray": the eyes go up to the sky just before the word and stay there through it
  const T_PRAY = (() => { const L = lines.find(l => /when i pray/i.test(l.text)); return L?.words?.find(w => /^pray/i.test(w.w || ''))?.t ?? L?.t ?? -1; })();
  const prayAt = t => T_PRAY < 0 ? 0 : smooth((t - (T_PRAY - 1.9)) / 1.3) * (1 - smooth((t - (T_PRAY + 0.8)) / 0.9));
  // "losing all the only way": once the line has been sung its letters drop to the road; the eyes follow them down
  const I_FALL = lines.findIndex(l => /losing all the only way|call me broken/i.test(l.text));
  const T_FALL = I_FALL < 0 ? -1 : ((lines[I_FALL].words?.slice(-1)[0]?.t ?? lines[I_FALL].t) + 0.35);
  const fallAt = t => T_FALL < 0 ? 0 : clamp((t - T_FALL) / 0.85);                                                  // the drop itself
  // the walk slows while the eyes are on the road (the letters must not pass underfoot unseen), then catches up
  const T_BURY = (() => { const L = lines.find(l => /bury you in words/i.test(l.text)); return L?.words?.find(w => /^bury/i.test(w.w || ''))?.t ?? L?.t ?? -1; })();
  const T_SOULL = (() => { const L = lines.find(l => /not my soul/i.test(l.text)); return L?.words?.find(w => /^soul/i.test(w.w || ''))?.t ?? L?.t ?? -1; })();   // (song 1) the walk stands while the soul is sung and swells (keyed to the word)
  const lingerAt = t => { let L = 0;
    if (T_SOULL > 0) { const a = clamp((t - (T_SOULL - 1.2)) / 3.0) * 3.0; L += a * (1 - smooth((t - (T_SOULL + 4.5)) / 8)); }   // a dead stop (the delay grows at 1 s/s, never faster: faster would walk backwards)
    if (T_FALL > 0) { const a = smooth((t - (T_FALL - 0.2)) / 3.2) * 1.9; L += a * (1 - smooth((t - (T_FALL + 3.0)) / 9)); }
    if (T_BURY > 0) { const a = smooth((t - (T_BURY - 0.2)) / 4.5) * 2.6; L += a * (1 - smooth((t - (T_BURY + 5.5)) / 10)); }   // the grave fills while you slow to watch it
    if (T_WAITL > 0) { const a = smooth((t - T_WAITL) / 1.6) * 1.5; L += a * (1 - smooth((t - (T_WAITL + 1.8)) / 6)); }       // "Just wait.": you stand
    if (T_THERE > 0) { const a = smooth((t - T_THERE) / 0.5) * 0.9; L += a * (1 - smooth((t - (T_THERE + 0.9)) / 5)); }       // "I'll still be there": planted
    return L; };
  const floorAt = t => T_FALL < 0 ? 0 : smooth((t - (T_FALL - 0.2)) / 0.9) * (1 - smooth((t - (T_FALL + 3.0)) / 1.0));   // the eyes on the road
  let landing = null;
  // "bury you in words" (song 2): the grave opens 9 m ahead; the eyes drop to it while it fills, then come back up
  const buryAt = t => T_BURY < 0 ? 0 : smooth((t - (T_BURY - 0.3)) / 1.0) * (1 - smooth((t - (T_BURY + 6.0)) / 1.4));
  let graveAt = null, graveInit = false;
  // (song 2) "I'm coming for him": a run forward. "I'm coming for me": the camera pulls back and up to show the man standing
  // where you stood. "I won't abandon me": the head shakes no.
  const T_FORHIM = lines.find(l => /coming for him/i.test(l.text))?.t ?? -1, T_FORME = lines.find(l => /coming for me/i.test(l.text))?.t ?? -1;
  const T_NO = (() => { const L = lines.find(l => /won't abandon me/i.test(l.text)); return L?.words?.find(w => /^abandon/i.test(w.w || ''))?.t ?? L?.t ?? -1; })();
  const surgeAt = t => T_FORHIM < 0 ? 0 : smooth((t - T_FORHIM) / 3.2) * 7.5;                                        // metres gained in the run (stops a step short of him)
  const runAt = t => T_FORHIM < 0 ? 0 : smooth((t - T_FORHIM + 0.2) / 0.6) * (1 - smooth((t - T_FORHIM - 2.6) / 0.8));
  const pullAt = t => T_FORME < 0 ? 0 : smooth((t - T_FORME + 0.1) / 1.6) * (1 - smooth((t - T_FORME - 5.2) / 1.6));
  const noAt = t => { if (T_NO < 0) return 0; const k = t - T_NO; return k < -0.1 || k > 2.6 ? 0 : Math.sin(k * 2 * Math.PI * 1.5) * 0.15 * Math.sin(Math.min(1, k / 2.6) * Math.PI); };
  let selfSpot = null;
  // (song 2) line-level camera gestures. All text-keyed: absent lines = nothing.
  const wT = (lre, wre) => { const L = lines.find(l => lre.test(l.text)); return L ? (L.words?.find(w => wre.test(w.w || ''))?.t ?? L.t) : -1; };
  const T_STOMP = lines.filter(l => /^enough of/i.test(l.text)).map(l => l.t);                               // a hard step on each "Enough"
  const T_WAITL = lines.find(l => /^just wait/i.test(l.text))?.t ?? -1;                                       // stand still
  const T_SOAMI = lines.find(l => /and so am i/i.test(l.text))?.t ?? -1;                                     // push forward
  const T_LOCK = wT(/locked on the truth/i, /^locked/i);                                                      // dead straight, no sway
  const T_SLAM = (lines.find(l => /^maybe you don't/i.test(l.text))?.t ?? -99) + 0.12;   // the door lands (props2 swings it from 0.3 s before the line)
  const slamAt = t => { const k = t - T_SLAM; return k > 0 && k < 1.2 ? Math.exp(-k * 4.5) : 0; };
  const T_SHOVE = lines.find(l => /^push me down/i.test(l.text))?.t ?? -1, T_AIR2 = lines.find(l => /find the air/i.test(l.text))?.t ?? -1;   // shoved down, up for air
  const T_THERE = lines.find(l => /still be there/i.test(l.text))?.t ?? -1;                                   // planted
  const stompAt = t => { let d = 0; for (const T of T_STOMP) { const k = t - T + 0.05; if (k > 0 && k < 0.9) d += Math.sin(Math.min(1, k / 0.9) * Math.PI) * 0.7; } return d; };
  const lockAt = t => T_LOCK < 0 ? 0 : smooth((t - T_LOCK + 0.2) / 0.4) * (1 - smooth((t - T_LOCK - 2.4) / 0.8));
  const shoveAt = t => { let y = 0; if (T_SHOVE > 0) { const k = t - T_SHOVE; if (k > 0 && k < 1.6) y -= 0.55 * Math.sin(Math.min(1, k / 1.6) * Math.PI); } if (T_AIR2 > 0) { const k = t - T_AIR2; if (k > 0 && k < 1.8) y += 0.5 * Math.sin(Math.min(1, k / 1.8) * Math.PI); } return y; };
  const pushAt = t => T_SOAMI < 0 ? 0 : smooth((t - T_SOAMI) / 1.6) * 4;
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
    beats, pose, anchorFor, beatAt, fade, T_DOOR, gait(t) { const g = gaitOf(beatAt(t), t, Math.max(dashAt(t), runAt(t))); const lk = 1 - lockAt(t); g.sway *= lk; g.roll *= lk; g.yaw = g.yaw * lk + noAt(t); g.pitch = g.pitch * lk + Math.sin((t - T_SLAM) * 42) * 0.028 * slamAt(t); g.roll += Math.sin((t - T_SLAM) * 31) * 0.012 * slamAt(t); return g; }, carAt, dashAt, CARS, prayAt, floorAt, fallAt, buryAt, pullAt, get selfSpot() { return selfSpot; }, T_VOID: 1e9, T_TOWER: endBeat.t0 + 0.74 * (endBeat.t1 - endBeat.t0),
    skyAt(t) { return beatAt(t).sky; },
    // how far the hands have pushed the viewer under the water (metres below the path), gasping back up after the line
    dive(t) { if (T_DROWN < 0) return 0; const down = smooth((t - T_DROWN - 1.2) / 1.6), up = T_AIR > 0 ? smooth((t - T_AIR + 0.2) / 1.1) : smooth((t - T_DROWN - 3.4) / 2.8); return -0.72 * down * (1 - up); },
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
