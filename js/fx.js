// Words that act out what they mean: "fade" fades, "fall" falls, "fly" flies away, "drown" sinks...
// Each effect runs after the word is sung. age = seconds since it was sung.
import * as THREE from 'three';
import { clamp } from './util.js?v=20261010205907';

const RED = new THREE.Color(0.36, 0.015, 0.03), EMBER = new THREE.Color(0.8, 0.12, 0.05), GOLD = new THREE.Color(0.85, 0.88, 1.0);   // 'GOLD' is now a pale cold light: no yellow in this film
const BLUE = new THREE.Color(0.25, 0.4, 0.6), ASH = new THREE.Color(0.2, 0.19, 0.18);
const ease = x => 1 - Math.pow(1 - clamp(x), 3);
const wob = (now, s, f = 1) => Math.sin(now * f + s * 17);

const FX = {
  fade(m, u, a) { m.material.opacity *= 1 - 0.92 * ease(a / 2.4); },
  fall(m, u, a) { const t = Math.max(0, a - 0.25); m.position.y -= Math.min(7, 4.9 * t * t); },
  rise(m, u, a, x) { m.position.y += ease(a / 2.2) * 0.28; x.glow(0.25 * ease(a / 2)); },
  fly(m, u, a, x) { const t = Math.max(0, a - 0.35); m.position.y += t * t * 0.9 + Math.abs(Math.sin(x.now * 9)) * 0.05 * Math.min(1, t * 2); m.position.x += t * 1.4;
    m.material.opacity *= 1 - clamp((t - 1.6) / 1.2); },
  free(m, u, a, x) { FX.fly(m, u, a, x); m.scale.multiplyScalar(1 + ease(a / 1.5) * 0.3); x.glow(0.25); },
  decay(m, u, a, x) { const k = ease(a / 3); m.position.y -= k * 0.8; m.scale.y *= 1 - k * 0.55;
    m.position.x += (Math.random() - 0.5) * 0.03 * k; x.tint(ASH, k); },
  drown(m, u, a, x) { const k = ease(a / 2.8); m.position.y -= k * 2.2 + Math.sin(x.now * 2) * 0.05 * k;
    m.material.opacity *= 1 - k * 0.7; x.tint(BLUE, k); },
  bleed(m, u, a, x) { const k = ease(a / 1.6); x.tint(RED, k); m.scale.y *= 1 + k * 0.35; m.position.y -= k * 0.12; x.glow(0.15 * k, RED); },
  pain(m, u, a, x) { x.tint(RED, ease(a / 1)); x.glow((Math.random() < 0.15 ? 0.4 : 0.1), RED); },
  break(m, u, a, x) { const s = Math.max(0, 1 - a / 0.6); m.position.x += (Math.random() - 0.5) * 0.12 * s;
    m.position.y -= 0.12 * ease((a - 0.3) / 0.6); m.scale.x *= 1 + 0.1 * ease((a - 0.3) / 0.4); },
  burn(m, u, a, x) { x.tint(EMBER, ease(a / 1.2)); x.glow(0.45 + 0.25 * Math.random(), EMBER); m.position.y += ease(a / 3) * 0.25; },
  light(m, u, a, x) { x.tint(GOLD, ease(a / 1.2) * 0.6); x.glow(0.6 * (0.8 + 0.2 * wob(x.now, u.seed.y, 3)), GOLD); },
  silence(m, u, a, x) { m.scale.multiplyScalar(1 - ease(a / 1.5) * 0.25); m.material.opacity *= 1 - ease(a / 1.5) * 0.55; x.glow(-1); },
  away(m, u, a) { m.position.z -= ease(a / 3) * 3.5; m.material.opacity *= 1 - ease(a / 3) * 0.8; },
  turn(m, u, a) { const k = ease((a - 0.2) / 0.9); m.position.z -= k * 1.2; m.material.opacity *= 1 - k * 0.6; },
  slam(m, u, a) { const k = clamp(a / 0.28); m.scale.multiplyScalar(1.3 - 0.3 * k); m.position.x += a < 0.45 && a > 0.28 ? (Math.random() - 0.5) * 0.05 : 0; },
  beat(m, u, a, x) { const b = Math.pow(Math.max(0, Math.sin(x.now * 7.1)), 10) * 0.18 + x.bass * 0.22; m.scale.multiplyScalar(1 + b); x.glow(b * 3, RED); },
  breathe(m, u, a, x) { m.scale.multiplyScalar(1 + 0.12 * (0.5 + 0.5 * Math.sin(a * 1.6 - 1.57))); },
  deep(m, u, a) { m.position.z -= ease(a / 3) * 2.5; m.position.y -= ease(a / 3) * 0.3; },
  long(m, u, a) { m.scale.x *= 1 + ease(a / 2) * 0.6; },
  near(m, u, a) { m.position.z += ease(a / 2.5) * 1.6; },
  tight(m, u, a) {                            // the letters slide into each other until no gap is left
    const k = ease((a - 0.1) / 0.7);
    if (u.sqX != null) m.position.x += (u.sqX - u.home.x) * k; else m.scale.x *= 1 - k * 0.22;
    m.scale.y *= 1 + k * 0.05; },
  tremble(m, u, a) { m.position.x += (Math.random() - 0.5) * 0.04; m.position.y += (Math.random() - 0.5) * 0.03; },
  crawl(m, u, a, x) { m.position.y -= ease(a / 1) * 0.35; m.position.x += a * 0.12 * (0.6 + 0.4 * Math.max(0, Math.sin(x.now * 4))); m.scale.y *= 0.82; },
  lies(m, u, a, x) { m.material.opacity *= Math.sin(x.now * 2.3 + u.seed.x * 9) > 0.6 ? 0.35 : 1; },
  pretend(m, u, a, x) { m.material.opacity *= 0.6 + 0.4 * Math.sin(x.now * 5); },
  rain(m, u, a, x) { m.position.y -= (a * 0.25) % 0.6; m.material.opacity *= 1 - ((a * 0.25) % 0.6) * 0.6; },
  sun(m, u, a, x) { m.position.y += ease(a / 3) * 0.35; x.tint(GOLD, ease(a / 2)); x.glow(0.5 * ease(a / 2), GOLD); },
  echo(m, u, a, x) { const k = (a * 1.2) % 1; m.scale.multiplyScalar(1 + 0.12 * Math.sin(k * Math.PI)); x.glow(0.6 * (1 - k)); },
  pray(m, u, a, x) { m.position.y += ease(a / 3) * 0.2; x.glow(0.3 * ease(a / 2), GOLD); },
  walk(m, u, a) { m.position.x += Math.max(0, a - 0.4) * 0.7; m.position.y += Math.abs(Math.sin(a * 6)) * 0.04; m.material.opacity *= 1 - clamp((a - 2.5) / 1.5); },
  stay() {},                                   // handled by the caller: "stay" does not leave with its line
  alone(m, u, a) { m.scale.multiplyScalar(1 - ease(a / 2) * 0.12); m.position.z -= ease(a / 2) * 0.6; },
  stand(m, u, a) { m.scale.y *= 1 + ease(a / 0.8) * 0.18; },
  weak(m, u, a) { FX.tremble(m, u, a); m.scale.multiplyScalar(0.92); },
  chain(m, u, a, x) { m.position.y += Math.sin(x.now * 1.4 + u.seed.y * 6) * 0.06; },
  heard(m, u, a, x) { FX.echo(m, u, a, x); },
  home(m, u, a, x) {                           // the word breaks: its letters fly to the four sides
    if (u.letter == null) { x.glow(0.3 * ease(a / 1.5), GOLD); return; }
    const k = ease((a - 0.35) / 1.3), d = [[-1, 0], [0, 1], [1, 0], [0, -1]][u.letter % 4];
    m.position.x += d[0] * k * 1.6; m.position.y += d[1] * k * 1.1;
    if (a > 0.3 && a < 0.5) { m.position.x += (Math.random() - 0.5) * 0.05; m.position.y += (Math.random() - 0.5) * 0.05; }
    m.material.opacity *= 1 - k * 0.35; },
  ahead(m, u, a) {                             // far ahead: the word shrinks into the distance
    const k = ease(a / 2.4); m.position.z -= k * 7; m.scale.multiplyScalar(1 - k * 0.72); m.material.opacity *= 1 - k * 0.3; },
  shame(m, u, a, x) {                          // enlarged, and knocked: three hard knocks as it lands
    m.scale.multiplyScalar(u.dup ? 1.0 : 1.55);
    for (const tk of [0, 0.32, 0.64]) { const e = a - tk; if (e > 0 && e < 0.22) { const j = Math.sin(e / 0.22 * Math.PI); m.position.z += 0.3 * j; m.scale.multiplyScalar(1 + 0.22 * j); m.position.x += (Math.random() - 0.5) * 0.04 * j; } }
    x.tint(RED, 1); x.glow(0.2, RED);
  },
};

const MAP = [
  [/^fad(e|es|ed|ing)$/, 'fade'], [/^(fall|falls|fell|fallen|falling)$/, 'fall'], [/^(rise|rises|rising|risen)$/, 'rise'],
  [/^(fly|flies|flying)$/, 'fly'], [/^free$/, 'free'], [/^decay(s|ed)?$/, 'decay'], [/^drown(s|ed|ing)?$/, 'drown'],
  [/^(bleed|bleeding|bled)$/, 'bleed'], [/^(pain|hell|cursed)$/, 'pain'],
  [/^(break|broke|broken|cracks|wounds|scars|shatter)$/, 'break'], [/^(burn|burned|burns|flame)$/, 'burn'],
  [/^light$/, 'light'], [/^(silence|silent|quiet|sleep)$/, 'silence'],
  [/^ahead$/, 'ahead'], [/^(away|lost|nowhere|retreat|gone)$/, 'away'], [/^(turn|turned|backs)$/, 'turn'], [/^(slammed|shut|door)$/, 'slam'],
  [/^(beats|beat|heart)$/, 'beat'], [/^breathe$/, 'breathe'], [/^deep$/, 'deep'], [/^long$/, 'long'], [/^near$/, 'near'],
  [/^(tight|held|holding|hold)$/, 'tight'], [/^(fears|afraid)$/, 'tremble'], [/^weak$/, 'weak'], [/^crawl$/, 'crawl'],
  [/^lies$/, 'lies'], [/^pretend$/, 'pretend'], [/^rain$/, 'rain'], [/^(sun|morning|hope)$/, 'sun'],
  [/^(call|hears|hear|heard|voice|speak|said)$/, 'echo'], [/^(pray|prayer)$/, 'pray'], [/^(walk|walking)$/, 'walk'],
  [/^shame$/, 'shame'], [/^stay$/, 'stay'], [/^alone$/, 'alone'], [/^standing$/, 'stand'], [/^chain$/, 'chain'], [/^home$/, 'home'],
];
export function fxFor(word) {
  const w = word.toLowerCase().replace(/[^a-z']/g, '');
  for (const [re, name] of MAP) if (re.test(w)) return name;
  return null;
}

// apply after the base animation has set position/rotation/scale/opacity/emissive for this frame
export function applyFx(name, m, u, age, ctx) {
  const f = FX[name]; if (!f || age < 0) return;
  const base = m.material.color.clone();
  const x = {
    now: ctx.now, bass: ctx.bass,
    tint(c, k) { m.material.color.copy(base).lerp(c, k); },
    glow(v, c) { if (c) m.material.emissive.copy(c); m.material.emissiveIntensity = Math.max(0, m.material.emissiveIntensity + v); },
  };
  f(m, u, age, x);
}
