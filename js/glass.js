// Cracking glass over the screen: a spider-web crack grows on every count, then the pane shatters
// into shards (cut from a snapshot of the last frame) that fall away and reveal the song.
import { rng } from './util.js?v=20261017094556';

export function createGlass(canvas) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, P = [], R = [], N = 0, rings = [], jag = [], len = [], branches = [], cx = 0, cy = 0;
  const r = rng(1984);

  function build() {
    dpr = Math.min(devicePixelRatio, 2);
    W = canvas.width = innerWidth * dpr; H = canvas.height = innerHeight * dpr;
    cx = W * 0.5 + (r() - 0.5) * W * 0.08; cy = H * 0.47 + (r() - 0.5) * H * 0.08;
    const far = Math.hypot(W, H);
    R = [0, 0.02, 0.05, 0.1, 0.17, 0.27, 0.4, 0.58, 0.8, 1.3].map(k => k * far);
    N = 13;
    let acc = 0; const gaps = [...Array(N)].map(() => 0.4 + r() * 1.2), tot = gaps.reduce((a, b) => a + b, 0);
    const base = gaps.map(g => (acc += g) / tot * Math.PI * 2);           // uneven spacing, like real impact cracks
    P = base.map(a => { let w = 0; return R.map((rad, k) => { w += (r() - 0.5) * 0.22;
      return [cx + Math.cos(a + w) * rad * (0.85 + r() * 0.3), cy + Math.sin(a + w) * rad * (0.85 + r() * 0.3)]; }); });
    len = P.map(() => (r() < 0.3 ? 0.45 + r() * 0.4 : 1));               // some cracks die out early
    // rings: only near the impact, broken, jagged
    rings = R.map((_, k) => [...Array(N)].map(() => k > 0 && k < 6 && r() < (k < 3 ? 0.85 : 0.45)));
    jag = R.map(() => [...Array(N)].map(() => [(r() - 0.5) * 0.25, (r() - 0.5) * 0.25]));
    // short branches off the main cracks
    branches = [];
    for (let j = 0; j < N; j++) for (let k = 2; k < R.length - 2; k++) if (r() < 0.45) {
      const a = P[j][k], b = P[j][k + 1], t = r(), o = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + (r() < 0.5 ? -1 : 1) * (0.4 + r() * 0.6), l = (R[k + 1] - R[k]) * (0.3 + r() * 0.6);
      const m = [o[0] + Math.cos(ang) * l * 0.5 + (r() - 0.5) * l * 0.2, o[1] + Math.sin(ang) * l * 0.5 + (r() - 0.5) * l * 0.2];
      branches.push({ r: Math.hypot(o[0] - cx, o[1] - cy), pts: [o, m, [o[0] + Math.cos(ang) * l, o[1] + Math.sin(ang) * l]] });
    }
  }

  // reach: 0..1 of the screen radius the crack has spread to
  function draw(reach, flash = 0) {
    ctx.clearRect(0, 0, W, H);
    if (reach <= 0) return;
    const lim = reach * R[R.length - 2];
    const seg = (a, b, w, col) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
    const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const pass of [0, 1]) {                      // 0: dark refraction edge, 1: bright fracture line
      const col = pass ? `rgba(240,238,232,${0.75 + flash * 0.25})` : 'rgba(0,0,0,0.55)';
      const w = (pass ? 1.1 : 2.6) * dpr;
      for (let j = 0; j < N; j++) for (let k = 0; k < R.length - 1; k++) {
        const L = lim * len[j];
        if (R[k] >= L) break;
        const t = Math.min(1, (L - R[k]) / (R[k + 1] - R[k]));
        seg(P[j][k], lerp(P[j][k], P[j][k + 1], t), w * Math.max(0.35, 1 - k * 0.09), col);
      }
      for (let k = 1; k < R.length - 1; k++) {
        if (R[k] * 1.3 > lim) break;
        for (let j = 0; j < N; j++) if (rings[k][j]) {
          const a = P[j][k], b = P[(j + 1) % N][k], [u, v] = jag[k][j];
          const m1 = lerp(a, b, 0.33 + u), m2 = lerp(a, b, 0.66 + v);
          const pull = (p, f) => lerp(p, [cx, cy], f);
          ctx.strokeStyle = col; ctx.lineWidth = w * 0.7; ctx.beginPath(); ctx.moveTo(a[0], a[1]);
          for (const p of [pull(m1, 0.06 + u * 0.2), pull(m2, 0.04 - v * 0.2), b]) ctx.lineTo(p[0], p[1]); ctx.stroke();
        }
      }
      for (const br of branches) if (br.r < lim) {
        ctx.strokeStyle = col; ctx.lineWidth = w * 0.55; ctx.beginPath(); ctx.moveTo(br.pts[0][0], br.pts[0][1]);
        for (const p of br.pts.slice(1)) ctx.lineTo(p[0], p[1]); ctx.stroke();
      }
    }
    // impact point: crushed glass
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R[2] * 1.4);
    g.addColorStop(0, `rgba(255,255,255,${0.35 + flash * 0.4})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R[2] * 1.4, 0, Math.PI * 2); ctx.fill();
  }

  // shatter: snapshot = canvas with the last rendered frame. Resolves when the shards are gone.
  function shatter(snapshot) {
    const shards = [];
    for (let j = 0; j < N; j++) for (let k = 0; k < R.length - 1; k++) {
      const poly = [P[j][k], P[(j + 1) % N][k], P[(j + 1) % N][k + 1], P[j][k + 1]];
      const mx = poly.reduce((a, p) => a + p[0], 0) / 4, my = poly.reduce((a, p) => a + p[1], 0) / 4;
      const dx = mx - cx, dy = my - cy, d = Math.hypot(dx, dy) || 1;
      shards.push({ poly, mx, my, vx: dx / d * (0.4 + r()) * 380 * dpr, vy: dy / d * (0.3 + r()) * 260 * dpr - 120 * dpr * r(),
        vr: (r() - 0.5) * 5, delay: (k / R.length) * 0.18 + r() * 0.08 });
    }
    const t0 = performance.now();
    return new Promise(done => {
      const step = () => {
        const t = (performance.now() - t0) / 1000;
        ctx.clearRect(0, 0, W, H);
        let alive = 0;
        for (const s of shards) {
          const tt = Math.max(0, t - s.delay);
          const y = s.vy * tt + 0.5 * 2400 * dpr * tt * tt, x = s.vx * tt;
          if (s.my + y - 400 * dpr > H) continue;
          alive++;
          ctx.save();
          ctx.translate(s.mx + x, s.my + y); ctx.rotate(s.vr * tt); ctx.translate(-s.mx, -s.my);
          ctx.beginPath(); s.poly.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
          ctx.save(); ctx.clip(); ctx.globalAlpha = Math.max(0, 1 - tt * 0.9);
          ctx.drawImage(snapshot, 0, 0, W, H);
          ctx.fillStyle = `rgba(255,255,255,${0.06 + 0.1 * Math.max(0, 1 - tt * 3)})`; ctx.fill();
          ctx.restore();
          ctx.strokeStyle = `rgba(240,238,232,${Math.max(0, 0.8 - tt)})`; ctx.lineWidth = 1 * dpr; ctx.stroke();
          ctx.restore();
        }
        if (alive && t < 3) requestAnimationFrame(step); else { ctx.clearRect(0, 0, W, H); done(); }
      };
      requestAnimationFrame(step);
    });
  }

  build();
  addEventListener('resize', build);
  return { draw, shatter, clear: () => ctx.clearRect(0, 0, W, H) };
}

// a glass crack sound, synthesized (only audible once the page has been touched)
export function crackSound(actx, big = false) {
  if (!actx || actx.state !== 'running') return;
  const t = actx.currentTime, len = big ? 1.2 : 0.35;
  const buf = actx.createBuffer(1, actx.sampleRate * len, actx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    const e = Math.exp(-i / (actx.sampleRate * (big ? 0.18 : 0.04)));
    d[i] = (Math.random() * 2 - 1) * e * (Math.random() < (big ? 0.5 : 0.25) ? 1 : 0.2);
  }
  const src = actx.createBufferSource(); src.buffer = buf;
  const hp = actx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = big ? 1800 : 2600;
  const g = actx.createGain(); g.gain.value = big ? 0.5 : 0.28;
  src.connect(hp).connect(g).connect(actx.destination); src.start(t);
}
