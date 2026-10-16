// Five drops of blood fall through the rain during the descent and run down the glass.
import { rng } from './util.js?v=20261016234717';

export function createDrops(canvas) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const r = rng(31), drops = [];
  const fit = () => { dpr = Math.min(devicePixelRatio, 2); W = canvas.width = innerWidth * dpr; H = canvas.height = innerHeight * dpr; };
  fit(); addEventListener('resize', fit);
  const BLOOD = '#5a060a', DARK = '#2a0205';

  function blob(x, y, s, stretch) {
    ctx.save(); ctx.translate(x, y); ctx.scale(1, stretch);
    ctx.beginPath(); ctx.moveTo(0, -s * 1.6);
    ctx.bezierCurveTo(s * 0.9, -s * 0.2, s, s * 0.5, 0, s); ctx.bezierCurveTo(-s, s * 0.5, -s * 0.9, -s * 0.2, 0, -s * 1.6);
    const g = ctx.createRadialGradient(-s * 0.3, -s * 0.1, s * 0.1, 0, 0, s * 1.2);
    g.addColorStop(0, '#8a1218'); g.addColorStop(0.55, BLOOD); g.addColorStop(1, DARK);
    ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); ctx.ellipse(-s * 0.35, -s * 0.5, s * 0.18, s * 0.32, -0.4, 0, 7); ctx.fillStyle = 'rgba(190,40,48,0.55)'; ctx.fill();
    ctx.restore();
  }
  return {
    drop(n) {
      const x = W * (0.2 + ((n * 37) % 56) / 100 + (r() - 0.5) * 0.06), s = (15 + r() * 6) * dpr;
      drops.push({ x, y: -s * 2, vy: 0, s, t: 0, splash: false, trail: [], spray: [], floor: H * (0.58 + r() * 0.2) });
    },
    update(dt) {
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const d of drops) {
        d.t += dt;
        let y;
        if (!d.splash) {
          d.vy += 2400 * dpr * dt; d.y += d.vy * dt; y = d.y;
          if (d.y > d.floor) { d.splash = true; d.t = 0;
            for (let k = 0; k < 7; k++) d.spray.push({ x: d.x, y: d.y, vx: (r() - 0.5) * 220 * dpr, vy: -r() * 160 * dpr, s: d.s * (0.12 + r() * 0.16), a: 1 }); }
        } else y = d.y + Math.min(d.t * 18 * dpr, H * 0.35);          // runs down the glass, slowing
        d.trail.push({ x: d.x + (r() - 0.5) * 1.5 * dpr, y: y - d.s * 0.8 }); if (d.trail.length > 240) d.trail.shift();
        // the streak: one stroke, thin at the top, wider near the drop
        if (d.trail.length > 1) {
          ctx.strokeStyle = BLOOD; ctx.globalAlpha = 0.8; ctx.lineWidth = d.s * 0.42;
          ctx.beginPath(); ctx.moveTo(d.trail[0].x, d.trail[0].y); for (const p of d.trail) ctx.lineTo(p.x, p.y); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        blob(d.x, y, d.s * (d.splash ? 1.35 : 1), d.splash ? 0.75 : 1.25 + Math.min(0.6, d.vy / (3000 * dpr)));
        for (const p of d.spray) { p.vy += 2000 * dpr * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.a -= dt * 0.5;
          if (p.a > 0) { ctx.globalAlpha = p.a; ctx.fillStyle = BLOOD; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.s, p.s * 1.4, 0, 0, 7); ctx.fill(); } }
        ctx.globalAlpha = 1;
      }
    },
    fade(k) { canvas.style.opacity = String(1 - k); },
  };
}
