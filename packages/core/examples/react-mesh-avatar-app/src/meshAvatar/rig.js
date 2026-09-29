// Rig definition: every coordinate is in source-image pixels (1254 x 1254).
// Deformers are plain functions of the rest position, so the same head/body
// transform can be shared by the base layer, the hand and the tassel anchors.

export const IMG = { w: 1254, h: 1254 };

export const PARAMS = [
  { id: 'ParamAngleX', label: '顔の向き 左右', min: -30, max: 30, def: 0, group: '頭と体' },
  { id: 'ParamAngleY', label: '顔の向き 上下', min: -30, max: 30, def: 0, group: '頭と体' },
  { id: 'ParamAngleZ', label: '顔の傾き', min: -30, max: 30, def: 0, group: '頭と体' },
  { id: 'ParamBodyAngleX', label: '体の向き 左右', min: -10, max: 10, def: 0, group: '頭と体' },
  { id: 'ParamBodyAngleZ', label: '体の傾き', min: -10, max: 10, def: 0, group: '頭と体' },
  { id: 'ParamBreath', label: '呼吸', min: 0, max: 1, def: 0, group: '頭と体' },
  { id: 'ParamEyeLOpen', label: '左目の開き', min: 0, max: 1.25, def: 1, group: '目と眉' },
  { id: 'ParamEyeROpen', label: '右目の開き', min: 0, max: 1.25, def: 1, group: '目と眉' },
  { id: 'ParamEyeSmile', label: '目の笑い', min: 0, max: 1, def: 0, group: '目と眉' },
  { id: 'ParamEyeBallX', label: '目玉 左右', min: -1, max: 1, def: 0, group: '目と眉' },
  { id: 'ParamEyeBallY', label: '目玉 上下', min: -1, max: 1, def: 0, group: '目と眉' },
  { id: 'ParamBrowY', label: '眉 上下', min: -1, max: 1, def: 0, group: '目と眉' },
  { id: 'ParamBrowAngle', label: '眉の角度', min: -1, max: 1, def: 0, group: '目と眉' },
  { id: 'ParamMouthOpenY', label: '口の開き', min: 0, max: 1, def: 0, group: '口と頬' },
  { id: 'ParamMouthForm', label: '口の形 (い↔お)', min: -1, max: 1, def: 0, group: '口と頬' },
  { id: 'ParamCheek', label: '照れ', min: 0, max: 1, def: 0, group: '口と頬' },
  { id: 'ParamArmAngle', label: '腕の角度', min: -10, max: 10, def: 0, group: '手' },
  { id: 'ParamHandAngle', label: '手首の角度', min: -10, max: 10, def: 0, group: '手' },
  { id: 'ParamFingerTap', label: '指トントン', min: 0, max: 1, def: 0, group: '手' },
];

// ---- face features ----
// Eye openings come from layers.json ("eyes", written when the layers were cut): the top / bottom edge of
// the visible eye white + iris, sampled at EYE_N evenly spaced columns from corner to corner.
export const EYE_N = 24;
export const EYES = [];
export function setEyes(list) { EYES.length = 0; EYES.push(...list); }

function sampled(arr, u) {
  const f = Math.min(1, Math.max(0, u)) * (EYE_N - 1), i = Math.min(Math.floor(f), EYE_N - 2), t = f - i;
  return arr[i] + (arr[i + 1] - arr[i]) * t;
}

// Raw lid lines at column u for the current state; must match eyeLidsRaw() in the shader.
//   plain closing: the upper lid comes down onto the lower lid
//   smiling (^^):  both lids meet on an upward arc from corner to corner
function eyeLidsRaw(e, u, open, smile) {
  u = Math.min(1, Math.max(0, u));
  const top = sampled(e.top, u), bot = sampled(e.bot, u);
  const b = 1 - open, hump = 4 * u * (1 - u);
  const H = sampled(e.bot, 0.5) - sampled(e.top, 0.5);
  const arc = e.top[0] + (e.top[EYE_N - 1] - e.top[0]) * u - 0.3 * H * hump;
  const closed = Math.max(top, bot + 1 + (arc - bot - 1) * smile);
  // wide-open (open > 1) only lifts the lash a few px: there is no drawn eye white above it
  return [(closed - top) * Math.max(b, -0.07), b > 0 ? (closed - bot) * b * smile : 0];
}

// Lid movement is smoothed across columns: the opening's edge is very steep at the corners,
// and following it exactly bent the lash into a zigzag there.
const LID_TAPS = [[-2, 1], [-1, 2], [0, 3], [1, 2], [2, 1]], LID_STEP = 5;
function eyeLids(e, x, open, smile) {
  let du = 0, db = 0;
  for (const [k, w] of LID_TAPS) {
    const [a, c] = eyeLidsRaw(e, (x + k * LID_STEP - e.x0) / (e.x1 - e.x0), open, smile);
    du += a * w / 9; db += c * w / 9;
  }
  const u = Math.min(1, Math.max(0, (x - e.x0) / (e.x1 - e.x0)));
  const top = sampled(e.top, u), bot = sampled(e.bot, u);
  return { top, bot, b: 1 - open, lid: top + du, bc: bot + db };
}

// Rest-space y of an eye-part vertex for the current eye state. The upper lash slides down
// to the lid line and thins a little; the lower lash rises for smiling eyes; the crease
// follows the lid a little (the lid skin stretches).
export function eyePartY(e, part, x, y, open, smile) {
  const L = eyeLids(e, x, open, smile);
  if (part === 'lash') return L.lid - (L.top - y) * (1 - 0.3 * Math.min(1, Math.max(0, L.b)));
  if (part === 'low') return y + (L.bc - L.bot);
  if (part === 'crease') return y + (L.lid - L.top) * 0.22;
  return y;
}

// The lower lash fades out as smiling eyes close, so the arc reads as one line, not two;
// the crease softens as the lid stretches.
export function eyePartAlpha(part, open, smile) {
  const b = Math.min(1, Math.max(0, 1 - open));
  if (part === 'low') return 1 - Math.min(1, b * smile * 1.2);
  if (part === 'crease') return 1 - 0.45 * b;
  return 1;
}

// Closed mouth line runs from (599,579) to (672,556) and bows down ~5.5px.
export const MOUTH = { cx: 635.5, cy: 567.5, angle: Math.atan2(-23, 73), halfLen: 38.3, bow: 5.5 };
export const CHEEKS = [[488, 532], [748, 468]];

// ---- mesh deformers ----
// The turn field is a smooth bump over the head. It is deliberately larger than the
// face so its rim falls in the background, and its slope is zero at the rim.
const HEAD = { cx: 615, cy: 400, rx: 430, ry: 470, shiftX: 50, shiftY: 40, pivotX: 640, pivotY: 700,
  maxRoll: 9 * Math.PI / 180 };
const BODY = { pivotX: 640, pivotY: 1650, maxRoll: 3 * Math.PI / 180 };

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const band = (a0, a1, b0, b1, x) => sstep(a0, a1, x) * (1 - sstep(b0, b1, x));
const gauss = (x, y, cx, cy, rx, ry) => Math.exp(-(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2));

export function headWeight(x, y) { return 1 - sstep(630, 800, y); }
// The turn bump already fades out towards its rim, so it only needs a gentle cut-off
// (stacking both fades is what sheared the neck).
export function turnWeight(x, y) { return 1 - sstep(640, 900, y); }

// Hair strands: rest polylines root -> tip (4 nodes each), traced from the drawing.
// Each one is a small spring chain in physics.js; vertices follow the strands near them.
export const STRANDS = [
  { name: 'bang1', nodes: [[500, 140], [470, 240], [445, 340], [428, 430]], sigma: 18, k: 1.0, max: 8 },
  { name: 'bang2', nodes: [[530, 130], [505, 240], [485, 340], [468, 438]], sigma: 18, k: 0.92, max: 8 },
  { name: 'bang3', nodes: [[555, 125], [540, 230], [525, 330], [510, 432]], sigma: 18, k: 1.06, max: 8 },
  { name: 'bang4', nodes: [[575, 130], [568, 230], [558, 330], [550, 422]], sigma: 18, k: 0.95, max: 8 },
  { name: 'bang5', nodes: [[590, 140], [590, 230], [590, 320], [590, 405]], sigma: 18, k: 1.03, max: 8 },
  { name: 'bang6', nodes: [[600, 160], [608, 220], [618, 280], [628, 335]], sigma: 16, k: 1.1, max: 7 },
  { name: 'sideL', nodes: [[420, 300], [400, 430], [398, 560], [415, 700]], sigma: 26, k: 0.55, max: 12 },
  { name: 'sideR', nodes: [[770, 260], [782, 380], [792, 480], [800, 580]], sigma: 22, k: 0.65, max: 10 },
];

// distance to a polyline and the normalised position t (0 root .. 1 tip) of the closest point
function onPolyline(x, y, nodes) {
  let best = Infinity, bt = 0;
  const n = nodes.length - 1;
  for (let i = 0; i < n; i++) {
    const [ax, ay] = nodes[i], [bx, by] = nodes[i + 1];
    const vx = bx - ax, vy = by - ay;
    const u = Math.min(1, Math.max(0, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
    const d = Math.hypot(x - ax - vx * u, y - ay - vy * u);
    if (d < best) { best = d; bt = (i + u) / n; }
  }
  return [best, bt];
}

// Sparse list of [strand index, weight, t]. Weights of overlapping strands are shared so
// the region between two strands blends their motions instead of adding them.
function strandWeights(x, y, hair) {
  if (hair < 0.02) return [];
  const hits = [];
  let sum = 0;
  STRANDS.forEach((s, i) => {
    const [d, t] = onPolyline(x, y, s.nodes);
    const g = Math.exp(-((d / s.sigma) ** 2));
    if (g < 0.02) return;
    hits.push([i, g, t]); sum += g;
  });
  const norm = Math.max(1, sum);
  return hits.map(([i, g, t]) => [i, hair * g / norm * sstep(0.04, 0.55, t), t]);
}

// Per-vertex weights of the base layer, computed once from the rest position.
// hair: 0..1 from hairmask.png, so strands only move actual hair.
export function baseWeights(x, y, hair = 1) {
  return {
    head: headWeight(x, y),
    turn: turnWeight(x, y),
    strands: strandWeights(x, y, hair),
    bunL: gauss(x, y, 262, 250, 105, 115),
    bunR: gauss(x, y, 820, 110, 115, 105),
    brow: gauss(x, y, 700, 326, 78, 20) * (1 - sstep(346, 358, y)),
    // chin below the mouth line drops a little when the mouth opens
    jaw: gauss(x, y, 632, 625, 100, 55) * sstep(572, 598, y),
    // per-feature depth for head turns (nose sticks out most, ears sit at the back)
    nose: gauss(x, y, 615, 515, 45, 45),
    mouth: gauss(x, y, 635, 568, 60, 30),
    eyeA: gauss(x, y, 493, 478, 80, 55),
    eyeB: gauss(x, y, 713, 415, 75, 55),
    earR: gauss(x, y, 828, 400, 35, 60),
    earL: gauss(x, y, 418, 520, 30, 55),
    chest: gauss(x, y, 660, 960, 260, 200),
    breath: 1 - sstep(1040, 1254, y),
    shoulder: gauss(x, y, 230, 800, 160, 120) + gauss(x, y, 1040, 870, 160, 120),
  };
}

// Head turn: features near the face centre travel further than the contour.
// (A sphere projection was tried first; its rim has an infinite slope and kinked
// the hair strands and fingers it crossed.)
function turnOffset(x, y, ax, ay) {
  const nx = (x - HEAD.cx) / HEAD.rx, ny = (y - HEAD.cy) / HEAD.ry;
  const t = 1 - nx * nx - ny * ny;
  if (t <= 0) return [0, 0];
  // flat top over eyes/nose/mouth (r < ~0.4) so they move as one piece; all the
  // stretching needed for parallax happens on the cheeks, contour and hair
  const d = sstep(0, 0.84, t);
  return [ax * HEAD.shiftX * d, -ay * HEAD.shiftY * d];
}

function rotateAround(p, cx, cy, a) {
  const c = Math.cos(a), s = Math.sin(a), dx = p[0] - cx, dy = p[1] - cy;
  p[0] = cx + dx * c - dy * s; p[1] = cy + dx * s + dy * c;
}

// Head transform with weight w (0 = body, 1 = fully head). Mutates p.
export function applyHead(p, w, P, wTurn = w) {
  const o = turnOffset(p[0], p[1], P.ParamAngleX / 30, P.ParamAngleY / 30);
  p[0] += o[0] * wTurn; p[1] += o[1] * wTurn;
  if (w <= 0) return;
  rotateAround(p, HEAD.pivotX, HEAD.pivotY, -P.ParamAngleZ / 30 * HEAD.maxRoll * w);
}

export function applyBody(p, restY, P, chest = 0, breathW = 1, shoulder = 0) {
  const b = P.ParamBreath;
  // inhale: everything above the cut-off rises, shoulders lift more, the chest widens a little
  p[1] -= b * (5 * breathW + 4 * shoulder);
  p[0] += (p[0] - 660) * 0.012 * b * chest;
  p[0] += P.ParamBodyAngleX / 10 * (7 + 9 * chest);
  // bottom rows stay put so no gap opens at the cut-off edge of the image
  rotateAround(p, BODY.pivotX, BODY.pivotY, -P.ParamBodyAngleZ / 10 * BODY.maxRoll * (1 - sstep(950, 1254, restY)));
}

// Base layer: hair and face-part offsets are added in rest space, then head, then body.
export function deformBase(x, y, w, P, phys, out) {
  const p = out;
  p[0] = x; p[1] = y;
  const g = phys.gain;
  for (const [i, wi, t] of w.strands) {
    const o = phys.strands?.[i];
    if (!o) continue;
    const f = t * 3, k = Math.min(2, Math.floor(f)), u = f - k;
    p[0] += (o[k][0] + (o[k + 1][0] - o[k][0]) * u) * wi * g;
    p[1] += (o[k][1] + (o[k + 1][1] - o[k][1]) * u) * wi * g;
  }
  p[0] += (phys.bunL[0] * w.bunL + phys.bunR[0] * w.bunR) * g;
  p[1] += (phys.bunL[1] * w.bunL + phys.bunR[1] * w.bunR) * g;
  // brows
  p[1] -= P.ParamBrowY * 7 * w.brow;
  if (w.brow > 0.01) {
    const a = P.ParamBrowAngle * 0.12 * w.brow;
    p[1] += (x - 700) * Math.sin(a);
  }
  p[1] += P.ParamMouthOpenY * 3.5 * w.jaw;
  // head turn, per part: nose and mouth travel further than the eyes, the far eye
  // narrows and the near eye widens, the ears and buns slide the other way
  const ax = P.ParamAngleX / 30, ay = P.ParamAngleY / 30;
  p[0] += ax * (8 * w.nose + 5 * w.mouth) + (x - 493) * 0.12 * ax * w.eyeA - (x - 713) * 0.12 * ax * w.eyeB
    - ax * 9 * w.earR + ax * 4 * w.earL - ax * 10 * (w.bunL + w.bunR);
  p[1] -= ay * (6 * w.nose + 3 * w.mouth);
  p[1] += (y - 478) * -0.06 * Math.abs(ay) * w.eyeA + (y - 415) * -0.06 * Math.abs(ay) * w.eyeB;
  applyHead(p, w.head, P, w.turn);
  applyBody(p, y, P, w.chest, w.breath, w.shoulder);
  return p;
}

// ---- hand / forearm ----
// Two rigid bones (forearm about the elbow, hand about the wrist) instead of letting the
// head's warp field bend them. The forearm takes only part of the swing, because whatever
// it uncovers is inpainted; the wrist does the rest so the fingertips stay on the chin.
const ELBOW = [300, 1390], WRIST = [505, 850], KNUCKLE = [497, 652], CONTACT = [530, 628];
const FOREARM_SHARE = 0.3;

export function handWeights(x, y) {
  return {
    arm: 1 - sstep(1180, 1300, y),
    wrist: 1 - sstep(790, 900, y),
    hand: 1 - sstep(800, 900, y),
    finger: sstep(482, 540, x) * (1 - sstep(678, 722, y)),
    pinBottom: sstep(1180, 1254, y),
  };
}

const rot = (p, o, c, s) => { const dx = p[0] - o[0], dy = p[1] - o[1]; return [o[0] + dx * c - dy * s, o[1] + dx * s + dy * c]; };
const angleOf = v => Math.atan2(v[1], v[0]);

// Per-frame bone transforms of the hand layer.
export function handFrame(P) {
  const c = [...CONTACT];
  applyHead(c, headWeight(...CONTACT), P, turnWeight(...CONTACT));
  applyBody(c, CONTACT[1], P, 0, 1, 0);
  const e = [...ELBOW];
  applyBody(e, ELBOW[1], P, 0, 0, 0);
  const full = angleOf([c[0] - e[0], c[1] - e[1]]) - angleOf([CONTACT[0] - ELBOW[0], CONTACT[1] - ELBOW[1]]);
  const a = full * FOREARM_SHARE;
  const ca = Math.cos(a), sa = Math.sin(a);
  const tr = p => { const q = rot(p, ELBOW, ca, sa); return [q[0] + e[0] - ELBOW[0], q[1] + e[1] - ELBOW[1]]; };
  const w = tr(WRIST), c1 = tr(CONTACT);
  const b = angleOf([c[0] - w[0], c[1] - w[1]]) - angleOf([c1[0] - w[0], c1[1] - w[1]]);
  const k = Math.min(1.03, Math.max(0.97, Math.hypot(c[0] - w[0], c[1] - w[1]) / Math.hypot(c1[0] - w[0], c1[1] - w[1])));
  return { tr, w, b, k };
}

export function deformHand(x, y, w, P, F, out) {
  let p = [x, y];
  // kept small on purpose: anything the hand uncovers is only a blurry inpaint
  p = rot(p, KNUCKLE, Math.cos(P.ParamFingerTap * 0.07 * w.finger), Math.sin(P.ParamFingerTap * 0.07 * w.finger));
  const ha = -P.ParamHandAngle / 10 * 0.045 * w.wrist, aa = -P.ParamArmAngle / 10 * 0.015 * w.arm;
  p = rot(p, WRIST, Math.cos(ha), Math.sin(ha));
  p = rot(p, ELBOW, Math.cos(aa), Math.sin(aa));
  p = F.tr(p);
  // wrist bone, blended in across the wrist so the joint bends smoothly
  const bw = F.b * w.hand, kw = 1 + (F.k - 1) * w.hand;
  p = rot(p, F.w, Math.cos(bw) * kw, Math.sin(bw) * kw);
  // the arm is cut by the image edge: keep that edge on the edge
  p[1] += (y - p[1]) * w.pinBottom;
  out[0] = p[0]; out[1] = p[1];
  return out;
}

// ---- tassels (2-bone chains driven by physics) ----
export const TASSELS = [
  { name: 'tassel_l', pivot: [292, 419], tip: [289, 598], split: 0.4 },
  { name: 'tassel_r', pivot: [868, 282], tip: [903, 462], split: 0.4 },
];

// Where the tassel hangs from, after head/body deformation.
export function tasselAnchor(t, P, phys, out) {
  const w = baseWeights(t.pivot[0], t.pivot[1]);
  return deformBase(t.pivot[0], t.pivot[1], w, P, phys, out);
}
