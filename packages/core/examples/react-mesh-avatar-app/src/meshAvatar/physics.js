// Secondary motion: spring chains for hair strands, spring-mass points for the buns
// and 2-segment verlet chains for tassels.
import { applyHead, applyBody, TASSELS, STRANDS, tasselAnchor } from './rig.js';

// Strand chain tuning: stiffness per node (root .. tip), how much of the parent's lag each
// node inherits (this is what makes a swing travel down the strand), and damping.
const STRAND_K = [0, 300, 200, 140], STRAND_COUPLE = 0.9, STRAND_DAMP = 7;

// Overall hair feel, tuned against measured runs (see README). Once motions made the head
// move ~4x faster, the chains whipped and neighbouring strands split apart by up to 16px,
// which smeared the hair between them.
//   stiff / damp / couple: scale the chain springs, damping and the root-to-tip lag
//   reach:   soft limit of the tip offset, as a share of each strand's `max`
//   bind:    smoothing passes across the fringe strands (more = moves more as one sheet)
export const HAIR_TUNE = { stiff: 1.7, damp: 1.6, couple: 0.85, reach: 0.9, bind: 4 };
const FRINGE = 6;

// Tassel pendulum: swing frequency (Hz), damping ratio, how much head tilt it counters,
// how strongly knot acceleration pushes it, gentle wind (rad), limit (rad), accel smoothing (1/s)
export const TASSEL_TUNE = { freq: 0.7, zeta: 0.22, hang: 0.85, inertia: 0.32, wind: 0.03, max: 0.55, smooth: 6 };
const rotV = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];   // STRANDS[0..5] are the fringe, 6 and 7 the side locks
const softLimit = (v, m) => { const l = Math.hypot(v[0], v[1]); if (l < 1e-6) return v; const k = m * Math.tanh(l / m) / l; return [v[0] * k, v[1] * k]; };

const HAIR = {
  bunL: { at: [262, 250], k: 260, c: 11, hang: 3, max: 4 },
  bunR: { at: [820, 110], k: 260, c: 11, hang: 3, max: 4 },
};

const clampLen = (v, m) => { const l = Math.hypot(v[0], v[1]); if (l > m) { v[0] *= m / l; v[1] *= m / l; } };

export class Physics {
  constructor() {
    this.gain = 1;          // "揺れやすさ"
    this.out = { gain: 1 };
    this.hair = {};
    for (const k of Object.keys(HAIR)) {
      this.hair[k] = { p: null, v: [0, 0] };
      this.out[k] = [0, 0];
    }
    this.strands = STRANDS.map(() => ({ p: null, v: [[0, 0], [0, 0], [0, 0], [0, 0]] }));
    this.out.strands = STRANDS.map(() => [[0, 0], [0, 0], [0, 0], [0, 0]]);
    this.chains = TASSELS.map(t => {
      const dx = t.tip[0] - t.pivot[0], dy = t.tip[1] - t.pivot[1], L = Math.hypot(dx, dy);
      const dir = [dx / L, dy / L];
      return { t, dir, L1: L * t.split, L2: L * (1 - t.split), pts: null, prev: null, phi: [0, 0], anchor: [0, 0] };
    });
    this.time = 0;
  }

  hairAnchor(at, P) {
    const p = [at[0], at[1]];
    applyHead(p, 1, P);
    applyBody(p, at[1], P);
    return p;
  }

  step(P, dt) {
    const sub = Math.max(1, Math.ceil(dt / (1 / 240)));
    const h = Math.min(dt, 0.05) / sub;
    const roll = -P.ParamAngleZ / 30 * 9 * Math.PI / 180 - P.ParamBodyAngleZ / 10 * 3 * Math.PI / 180;
    const g = this.gain;
    const noSway = { gain: 0, bunL: [0, 0], bunR: [0, 0] };

    STRANDS.forEach((cfg, si) => {
      const st = this.strands[si], out = this.out.strands[si];
      const target = cfg.nodes.map(n => this.hairAnchor(n, P));
      if (!st.p) st.p = target.map(t => [...t]);
      const phase = si * 1.7;
      for (let i = 0; i < sub; i++) {
        const t = this.time + i * h;
        for (let j = 1; j < 4; j++) {
          // hanging hair stays vertical when the head rolls (grows with distance from the root)
          const hang = Math.hypot(cfg.nodes[j][0] - cfg.nodes[0][0], cfg.nodes[j][1] - cfg.nodes[0][1]);
          // mostly one shared breeze, with a little per-strand flutter
          const wind = (Math.sin(t * 1.3) * 0.5 + Math.sin(t * 3.1) * 0.3 + Math.sin(t * 4.7 + phase) * 0.2) * cfg.max * 0.1 * j / 3;
          const parent = [st.p[j - 1][0] - target[j - 1][0], st.p[j - 1][1] - target[j - 1][1]];
          const tx = target[j][0] + parent[0] * STRAND_COUPLE * HAIR_TUNE.couple - Math.sin(roll) * hang * 0.12 + wind;
          const ty = target[j][1] + parent[1] * STRAND_COUPLE * HAIR_TUNE.couple;
          const k = STRAND_K[j] * cfg.k * HAIR_TUNE.stiff / Math.max(0.35, g), c = STRAND_DAMP * HAIR_TUNE.damp * Math.sqrt(HAIR_TUNE.stiff) / Math.max(0.5, Math.sqrt(g));
          const v = st.v[j], q = st.p[j];
          v[0] += (k * (tx - q[0]) - c * v[0]) * h;
          v[1] += (k * (ty - q[1]) - c * v[1]) * h;
          q[0] += v[0] * h; q[1] += v[1] * h;
        }
        st.p[0] = [...target[0]];
      }
      for (let j = 0; j < 4; j++) {
        const o = [st.p[j][0] - target[j][0], st.p[j][1] - target[j][1]];
        out[j] = softLimit(o, Math.max(0.5, cfg.max * HAIR_TUNE.reach * Math.max(1, g) * j / 3));
      }
    });

    for (const [k, cfg] of Object.entries(HAIR)) {
      const s = this.hair[k];
      const a = this.hairAnchor(cfg.at, P);
      // hanging hair keeps pointing down when the head rolls; plus a light breeze
      const wind = Math.sin(this.time * 1.3 + cfg.at[0] * 0.01) * 0.6 + Math.sin(this.time * 2.9 + cfg.at[1] * 0.02) * 0.4;
      const tx = a[0] - Math.sin(roll) * cfg.hang + wind * cfg.max * 0.12;
      const ty = a[1];
      if (!s.p) s.p = [tx, ty];
      const k2 = cfg.k / Math.max(0.35, g), c2 = cfg.c / Math.max(0.5, Math.sqrt(g));
      for (let i = 0; i < sub; i++) {
        s.v[0] += (k2 * (tx - s.p[0]) - c2 * s.v[0]) * h;
        s.v[1] += (k2 * (ty - s.p[1]) - c2 * s.v[1]) * h;
        s.p[0] += s.v[0] * h; s.p[1] += s.v[1] * h;
      }
      const o = [s.p[0] - a[0], s.p[1] - a[1]];
      clampLen(o, cfg.max * Math.max(1, g));
      this.out[k] = o;
    }
    this.out.gain = 1;

    // pull each fringe strand towards the average of its neighbours so the fringe moves
    // as one sheet with a little variation, instead of strands splitting apart
    const O = this.out.strands;
    for (let pass = 0; pass < HAIR_TUNE.bind; pass++) for (let j = 1; j < 4; j++) {
      const snap = O.slice(0, FRINGE).map(o => [...o[j]]);
      for (let i = 0; i < FRINGE; i++) {
        const l = snap[Math.max(0, i - 1)], r = snap[Math.min(FRINGE - 1, i + 1)];
        for (const a of [0, 1]) O[i][j][a] = snap[i][a] * 0.5 + (l[a] + r[a]) * 0.25;
      }
    }

    // Tassels: a two-joint angular pendulum. The old verlet chain was pulled back to its
    // drawn shape every substep, which made it buzz (~10 direction changes/s, 1deg swing).
    // Here each joint is a slow damped spring (~0.7 Hz) driven by the smoothed acceleration
    // of the knot, so it swings in long arcs and lags behind the head like the hair does.
    for (const ch of this.chains) {
      const A = tasselAnchor(ch.t, P, this.out, [0, 0]);
      if (!ch.st) ch.st = { th: [0, 0], w: [0, 0], pos: [...A], vel: [0, 0], acc: [0, 0] };
      const st = ch.st, T = TASSEL_TUNE;
      // knot velocity / acceleration, low-passed so spring overshoot of the head doesn't jitter it
      const vel = [(A[0] - st.pos[0]) / Math.max(dt, 1e-3), (A[1] - st.pos[1]) / Math.max(dt, 1e-3)];
      const kf = 1 - Math.exp(-dt * T.smooth);
      const acc = [(vel[0] - st.vel[0]) / Math.max(dt, 1e-3), (vel[1] - st.vel[1]) / Math.max(dt, 1e-3)];
      st.acc = [st.acc[0] + (acc[0] - st.acc[0]) * kf, st.acc[1] + (acc[1] - st.acc[1]) * kf];
      st.vel = [st.vel[0] + (vel[0] - st.vel[0]) * kf, st.vel[1] + (vel[1] - st.vel[1]) * kf];
      st.pos = [...A];
      // perpendicular to the hanging direction: pushes the pendulum sideways
      const nrm = [-ch.dir[1], ch.dir[0]];
      const push = -(st.acc[0] * nrm[0] + st.acc[1] * nrm[1]) / (ch.L1 + ch.L2) * T.inertia;
      const wind = (Math.sin(this.time * 0.9 + ch.t.pivot[0]) * 0.6 + Math.sin(this.time * 0.37 + ch.t.pivot[1]) * 0.4) * T.wind;
      const target = -roll * T.hang + wind;          // keeps hanging down when the head tilts
      const w1 = 2 * Math.PI * T.freq / Math.sqrt(Math.max(0.4, g)), w2 = w1 * 1.35;
      for (let i = 0; i < sub; i++) {
        const a1 = -w1 * w1 * (st.th[0] - target) - 2 * T.zeta * w1 * st.w[0] + push;
        st.w[0] += a1 * h; st.th[0] += st.w[0] * h;
        // the lower half follows the upper one with its own lag (a soft whip at the tip)
        const a2 = -w2 * w2 * (st.th[1] - st.th[0]) - 2 * T.zeta * w2 * st.w[1] + push * 0.4 + a1 * 0.5;
        st.w[1] += a2 * h; st.th[1] += st.w[1] * h;
      }
      st.th[0] = Math.max(-T.max, Math.min(T.max, st.th[0]));
      st.th[1] = Math.max(-T.max * 1.4, Math.min(T.max * 1.4, st.th[1]));
      ch.phi = [st.th[0], st.th[1]];
      // joint positions for skinning and the debug overlay
      const d1 = rotV(ch.dir, st.th[0]), d2 = rotV(ch.dir, st.th[1]);
      const p1 = [A[0] + d1[0] * ch.L1, A[1] + d1[1] * ch.L1];
      ch.pts = [[...A], p1, [p1[0] + d2[0] * ch.L2, p1[1] + d2[1] * ch.L2]];
      ch.anchor = A;
    }
    this.time += dt;
    return this.out;
  }
}

function norm(v) { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; }
function clampA(a, m) {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return Math.max(-m, Math.min(m, a));
}
