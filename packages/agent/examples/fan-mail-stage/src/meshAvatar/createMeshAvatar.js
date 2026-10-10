// Mesh avatar engine: turns a pre-split single illustration (see public/avatar/qipao/) into a
// Live2D-like animated avatar on a WebGL2 canvas. No UI and no framework: the app drives it
// through the small API returned by createMeshAvatar().
import {
  IMG,
  EYES,
  setEyes,
  baseWeights,
  deformBase,
  eyePartY,
  eyePartAlpha,
  handWeights,
  handFrame,
  deformHand,
  TASSELS,
} from './rig.js';
import { Renderer, buildGrid } from './renderer.js';
import { Physics } from './physics.js';
import { Motion } from './motion.js';
import { MOTIONS, IDLE_MOTIONS } from './motions.js';
import { createSprites } from './sprites.js';

const EYE_PARTS = ['ball', 'low', 'crease', 'lash']; // back to front

function loadImage(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error(`failed to load ${src}`));
    i.src = src;
  });
}

function channelOf(img, ch) {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  const a = new Uint8Array(c.width * c.height);
  for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + ch];
  return a;
}
const alphaOf = (img) => channelOf(img, 3);

// Two-bone skinning along the tassel: top follows segment 1, lower part segment 2.
function deformTassel(ch, mesh) {
  const [px, py] = ch.t.pivot;
  const d = ch.dir;
  const P = ch.pts;
  const sstep = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const c1 = Math.cos(ch.phi[0]);
  const s1 = Math.sin(ch.phi[0]);
  const c2 = Math.cos(ch.phi[1]);
  const s2 = Math.sin(ch.phi[1]);
  const r = mesh.rest;
  const o = mesh.pos;
  for (let i = 0; i < r.length; i += 2) {
    const vx = r[i] - px;
    const vy = r[i + 1] - py;
    const along = vx * d[0] + vy * d[1];
    const ax = P[0][0] + vx * c1 - vy * s1;
    const ay = P[0][1] + vx * s1 + vy * c1;
    const ux = vx - d[0] * ch.L1;
    const uy = vy - d[1] * ch.L1;
    const bx = P[1][0] + ux * c2 - uy * s2;
    const by = P[1][1] + ux * s2 + uy * c2;
    const w = sstep(ch.L1 * 0.55, ch.L1 * 1.35, along);
    o[i] = ax + (bx - ax) * w;
    o[i + 1] = ay + (by - ay) * w;
  }
}

export async function createMeshAvatar(canvas, options = {}) {
  const base = (options.assetsBase ?? '/avatar/qipao/').replace(/\/?$/, '/');
  const meta = await (
    await fetch(`${base}layers.json`, { cache: 'no-store' })
  ).json();
  setEyes(meta.eyes);
  const names = [
    'base',
    'hand',
    'tassel_l',
    'tassel_r',
    ...[0, 1].flatMap((i) => EYE_PARTS.map((p) => `eye${i}_${p}`)),
    'hairmask',
  ];
  const imgs = Object.fromEntries(
    await Promise.all(
      names.map(async (n) => [
        n,
        await loadImage(`${base}${n}.png?b=${meta.build}`),
      ])
    )
  );
  const hairMask = channelOf(imgs.hairmask, 0);
  const hairAt = (x, y) =>
    hairMask[
      Math.min(IMG.h - 1, Math.max(0, Math.round(y))) * IMG.w +
        Math.min(IMG.w - 1, Math.max(0, Math.round(x)))
    ] / 255;

  // The source image is cut flat at its top edge (crown and right bun). A negative top margin
  // keeps the top ~88px (7%) above the canvas, which the layout puts at the top of the panel:
  // the cut stays off screen even at the deepest head tilt.
  const R = new Renderer(canvas, {
    padTop: options.padTop ?? -0.07,
    padSide: options.padSide ?? 0,
  });
  const rects = { base: [0, 0, IMG.w, IMG.h], ...meta.layers };

  // base layer, denser where hair strands bend and the face parts shift
  const baseMesh = buildGrid(
    rects.base,
    14,
    alphaOf(imgs.base),
    imgs.base.width,
    { x0: 340, x1: 880, y0: 60, y1: 760, cell: 7 }
  );
  const baseW = [];
  for (let i = 0; i < baseMesh.rest.length / 2; i++) {
    const x = baseMesh.rest[i * 2];
    const y = baseMesh.rest[i * 2 + 1];
    baseW.push(baseWeights(x, y, hairAt(x, y)));
  }
  R.addLayer('base', imgs.base, baseMesh, { face: true });

  // eyes: white+iris clipped by the lids, then the line layers on top
  const eyeParts = [];
  EYES.forEach((e, i) => {
    for (const part of EYE_PARTS) {
      const n = `eye${i}_${part}`;
      const mesh = buildGrid(
        rects[n],
        part === 'ball' ? 4 : 3,
        alphaOf(imgs[n]),
        imgs[n].width
      );
      const W = [];
      for (let k = 0; k < mesh.rest.length / 2; k++)
        W.push(baseWeights(mesh.rest[k * 2], mesh.rest[k * 2 + 1], 0));
      const layer = R.addLayer(n, imgs[n], mesh, {
        eyeBall: part === 'ball' ? i : undefined,
      });
      eyeParts.push({ e, eye: i, part, mesh, W, layer });
    }
  });

  // drawn eye / mouth variants (closed / half / smiling eyes, あいうえお mouths) over the face
  let sprites = null;
  try {
    const res = await fetch(`${base}sprites/sprites.json`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const sheet = await res.json();
      const simgs = Object.fromEntries(
        await Promise.all(
          Object.keys(sheet.layers).map(async (n) => [
            n,
            await loadImage(`${base}sprites/${n}.png?b=${sheet.build}`),
          ])
        )
      );
      sprites = createSprites(R, sheet, simgs, buildGrid, alphaOf);
    }
  } catch (err) {
    console.warn('eye / mouth sprites not loaded:', err);
  }

  const tassels = TASSELS.map((t) => {
    const mesh = buildGrid(
      rects[t.name],
      6,
      alphaOf(imgs[t.name]),
      imgs[t.name].width
    );
    return R.addLayer(t.name, imgs[t.name], mesh);
  });

  const handMesh = buildGrid(
    rects.hand,
    9,
    alphaOf(imgs.hand),
    imgs.hand.width
  );
  const handW = [];
  for (let i = 0; i < handMesh.rest.length / 2; i++)
    handW.push(handWeights(handMesh.rest[i * 2], handMesh.rest[i * 2 + 1]));
  R.addLayer('hand', imgs.hand, handMesh);

  const physics = new Physics();
  const motion = new Motion();
  const listeners = new Set();
  motion.onMotion = (id) => {
    for (const fn of listeners) fn(id);
  };

  const tmp = [0, 0];
  function tick(dt) {
    const P = motion.update(dt);
    const phys = physics.step(P, dt);

    const bp = baseMesh.pos;
    const br = baseMesh.rest;
    for (let i = 0; i < baseW.length; i++) {
      deformBase(br[i * 2], br[i * 2 + 1], baseW[i], P, phys, tmp);
      bp[i * 2] = tmp[0];
      bp[i * 2 + 1] = tmp[1];
    }
    // with drawn eye sprites the layered eye is only ever shown exactly as drawn: moving the
    // cut-out lash leaves seams at its edges
    const eyeOpenFor = (v) => (sprites ? 1 : v);
    for (const ep of eyeParts) {
      const open = eyeOpenFor(ep.eye === 0 ? P.ParamEyeROpen : P.ParamEyeLOpen);
      const smile =
        ep.eye === 0 ? P.ParamEyeSmile : (P.eyeSmileL ?? P.ParamEyeSmile);
      ep.layer.alpha = eyePartAlpha(ep.part, open, smile);
      const r = ep.mesh.rest;
      const o = ep.mesh.pos;
      for (let k = 0; k < ep.W.length; k++) {
        const x = r[k * 2];
        const y = r[k * 2 + 1];
        deformBase(
          x,
          eyePartY(ep.e, ep.part, x, y, open, smile),
          ep.W[k],
          P,
          phys,
          tmp
        );
        o[k * 2] = tmp[0];
        o[k * 2 + 1] = tmp[1];
      }
    }
    const cover = sprites?.update(P, phys, dt);
    if (cover)
      for (const ep of eyeParts) if (cover.eyes[ep.eye]) ep.layer.alpha = 0;
    const hp = handMesh.pos;
    const hr = handMesh.rest;
    const HF = handFrame(P);
    for (let i = 0; i < handW.length; i++) {
      deformHand(hr[i * 2], hr[i * 2 + 1], handW[i], P, HF, tmp);
      hp[i * 2] = tmp[0];
      hp[i * 2 + 1] = tmp[1];
    }
    physics.chains.forEach((ch, k) => deformTassel(ch, tassels[k].mesh));

    const ball = 7; // px of iris travel
    R.draw({
      eyes: [
        eyeOpenFor(P.ParamEyeROpen),
        P.ParamEyeSmile,
        P.ParamEyeBallX * ball,
        -P.ParamEyeBallY * ball * 0.6,
        eyeOpenFor(P.ParamEyeLOpen),
        P.eyeSmileL ?? P.ParamEyeSmile,
        P.ParamEyeBallX * ball * 0.85,
        -P.ParamEyeBallY * ball * 0.6,
      ],
      // with sprites the drawn mouths replace the shader-painted one
      mouthOpen: sprites ? 0 : P.ParamMouthOpenY,
      mouthForm: P.ParamMouthForm,
      cheek: P.ParamCheek,
      showMesh: false,
      originalAlpha: 0,
      joints: [],
    });
  }

  // `manual: true` runs no animation loop: the caller advances time with advance()
  // (offline video rendering, one call per frame)
  let raf = 0;
  let last = performance.now();
  let destroyed = false;
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    tick(dt);
    raf = requestAnimationFrame(frame);
  };
  if (!options.manual) raf = requestAnimationFrame(frame);

  const motionList = [
    ...Object.entries(MOTIONS).map(([id, m]) => ({
      id,
      label: m.label,
      idle: false,
    })),
    ...Object.entries(IDLE_MOTIONS).map(([id, m]) => ({
      id,
      label: m.label,
      idle: true,
    })),
  ];

  return {
    motions: motionList,
    /** 0..1 loudness of the voice being played (e.g. normalised RMS). */
    setVoiceLevel(v) {
      motion.setVoiceLevel(v);
    },
    /** true while TTS audio is playing: idle motions pause and the head nods along. */
    setSpeaking(on) {
      motion.setSpeaking(on);
    },
    /** AITuber OnAir emotion tag: happy / sad / angry / surprised / relaxed / neutral (or null). */
    setEmotion(tag, opts) {
      motion.setEmotion(tag, opts);
    },
    /** How much the head moves with the voice while speaking (1 = default, calmer below). */
    setTalkGain(g) {
      motion.talkGain = Math.max(0, Number(g) || 0);
    },
    /** Play a motion or idle motion by id (see `motions`). */
    play(id) {
      if (motion.hasMotion(id)) motion.playMotion(id);
    },
    /** Move the mouth through the vowels of kana text (no audio; for previews). */
    speakKana(text) {
      motion.speakKana(String(text ?? ''));
    },
    setAutoIdle(on) {
      motion.autoIdle = !!on;
    },
    setAutoMotion(on) {
      motion.autoMotion = !!on;
    },
    /** Hair / tassel sway multiplier (1 = default). */
    setSwayGain(g) {
      physics.gain = g;
    },
    /** Called with the motion id when a motion starts and with null when it ends. */
    onMotion(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    /** Advance the simulation by `sec` and draw (for tests / hidden tabs). */
    advance(sec, fps = 60) {
      for (let i = 0; i < Math.round(sec * fps); i++) tick(1 / fps);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(raf);
      listeners.clear();
      // the GL context is not lost on purpose: the canvas may already be reused by a new
      // instance (React StrictMode mounts twice) and a canvas only ever has one context
    },
  };
}
