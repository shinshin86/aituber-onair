/*!
 * Based on Anime2.5DRig (https://github.com/852wa/Anime2.5DRig)
 * by 852wa (hakoniwa), MIT License.
 */
import type { Anime25RigLayer, Anime25RigResult } from './anime25Rig';

interface Point {
  cx: number;
  cy: number;
}

interface BoxAnchor extends Point {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

interface EyeAnchor {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  icx: number;
  icy: number;
  closeY: number;
}

interface RigAnchors {
  face: BoxAnchor;
  eyeL?: EyeAnchor;
  eyeR?: EyeAnchor;
  mouth: BoxAnchor;
  neckPivot: Point;
  neckTop: number;
  neckBottom: number;
  bodyPivot: Point;
  faceScale: number;
}

interface SpringAxis {
  x: number;
  v: number;
  dx: number;
}

interface StrandSpring {
  stiff: SpringAxis;
  soft: SpringAxis;
  phase: number;
}

interface RenderLayer extends Anime25RigLayer {
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  depth: number;
  group: string;
  img: {
    width: number;
    height: number;
    data: Uint8ClampedArray;
  };
  base: Float32Array;
  cur: Float32Array;
  bn: string;
  nIdx: number;
  tex: WebGLTexture;
  vboPos: WebGLBuffer;
  vboUV: WebGLBuffer;
  ibo: WebGLBuffer;
  sw?: Float32Array;
  su?: Float32Array;
  spr?: StrandSpring[];
  bw?: Float32Array;
}

interface MotionParams {
  angleX: number;
  angleY: number;
  angleZ: number;
  eyeOpenL: number;
  eyeOpenR: number;
  eyeX: number;
  eyeY: number;
  brow: number;
  mouthOpen: number;
  mouthForm: number;
  mouthCY: number;
  body: number;
  physAmp: number;
  soft: number;
  browAngL: number;
  browAngR: number;
  browAngSym: number;
  bangL: number;
  bangC: number;
  bangR: number;
  armY: number;
  armPos: number;
  bust: number;
  bustY: number;
  irisScale: number;
  mouthEase: number;
  eyeEase: number;
  fhAmp: number;
  fhSoft: number;
  eyeCY: number;
  eyeCAng: number;
  mouthCAng: number;
  eyeScaleL: number;
  eyeScaleR: number;
  mouthScale: number;
  breath: number;
  breathHead: number;
}

export interface Anime25RigAvatar {
  setMouthOpen: (value: number) => void;
  setIntensity: (value: number) => void;
  setMotionEnabled: (value: boolean) => void;
  getAverageFps: () => number;
  dispose: () => void;
}

const DEFAULT_PARAMS: MotionParams = {
  angleX: 0,
  angleY: 0,
  angleZ: 0,
  eyeOpenL: 1,
  eyeOpenR: 1,
  eyeX: 0,
  eyeY: 0,
  brow: 0,
  mouthOpen: 0,
  mouthForm: 0,
  mouthCY: 0,
  body: 0,
  physAmp: 2,
  soft: 2,
  browAngL: 0,
  browAngR: 0,
  browAngSym: 0,
  bangL: 0,
  bangC: 0,
  bangR: 0,
  armY: 0,
  armPos: 0,
  bust: 2.5,
  bustY: 1,
  irisScale: 1,
  mouthEase: 0.45,
  eyeEase: 0.3,
  fhAmp: 2,
  fhSoft: 0.4,
  eyeCY: 0,
  eyeCAng: 0,
  mouthCAng: 0,
  eyeScaleL: 1,
  eyeScaleR: 1,
  mouthScale: 1,
  breath: 0,
  breathHead: 0,
};

const IDLE_SWAY_SCALE = 2.8;
const BREATH_SCALE = 3.2;
const HAIR_WIND_SCALE = 3.0;
const HAIR_PHYSICS_SCALE = 1.8;

const VERTEX_SHADER =
  'attribute vec2 aPos; attribute vec2 aUV; uniform vec2 uRes; varying vec2 vUV;' +
  'void main(){ vUV=aUV; vec2 c = aPos/uRes*2.0-1.0; gl_Position=vec4(c.x,-c.y,0.0,1.0); }';

const FRAGMENT_SHADER =
  'precision mediump float; varying vec2 vUV; uniform sampler2D uTex; uniform float uCut; uniform float uAlpha;' +
  'void main(){ vec4 c=texture2D(uTex,vUV); if(c.a<uCut) discard; gl_FragColor=c*uAlpha; }';

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function smooth(value: number): number {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Failed to create WebGL shader.');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || 'WebGL shader error.');
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error('Failed to create WebGL program.');
  gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
  gl.attachShader(
    program,
    compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER),
  );
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || 'WebGL link error.');
  }
  return program;
}

function createBuffer(gl: WebGLRenderingContext): WebGLBuffer {
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error('Failed to create WebGL buffer.');
  return buffer;
}

function createTexture(
  gl: WebGLRenderingContext,
  imageData: ImageData,
): WebGLTexture {
  const texture = gl.createTexture();
  if (!texture) throw new Error('Failed to create WebGL texture.');
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    imageData,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

function getAttribLocation(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  name: string,
): number {
  const location = gl.getAttribLocation(program, name);
  if (location < 0) throw new Error(`Missing WebGL attribute: ${name}`);
  return location;
}

function getUniformLocation(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  name: string,
): WebGLUniformLocation {
  const location = gl.getUniformLocation(program, name);
  if (!location) throw new Error(`Missing WebGL uniform: ${name}`);
  return location;
}

function hasRenderableGeometry(layer: Anime25RigLayer): layer is RenderLayer {
  return (
    typeof layer.x === 'number' &&
    typeof layer.y === 'number' &&
    typeof layer.w === 'number' &&
    typeof layer.h === 'number' &&
    typeof layer.z === 'number' &&
    typeof layer.depth === 'number' &&
    Boolean(layer.img)
  );
}

function baseRigName(name: string): string {
  return name.replace(/_(l|r)$/i, '').replace(/_\d+$/, '');
}

function getAnchors(rig: Anime25RigResult): RigAnchors {
  return rig.anchors as unknown as RigAnchors;
}

function fadeAlpha(
  layer: RenderLayer,
  params: MotionParams,
  hasEyeClose: Record<'L' | 'R', boolean>,
): number {
  if (!layer.fade) return 1;
  if (layer.fade === 'eyeOpen') {
    const value = layer.side === 'L' ? params.eyeOpenL : params.eyeOpenR;
    if (
      (layer.side === 'L' || layer.side === 'R') &&
      !hasEyeClose[layer.side] &&
      layer.bn === 'eyelash'
    ) {
      return 1;
    }
    return smooth((value - (0.1 + params.eyeEase * 0.45)) / 0.15);
  }
  if (layer.fade === 'eyeClose') {
    const value = layer.side === 'L' ? params.eyeOpenL : params.eyeOpenR;
    return 1 - smooth((value - (0.1 + params.eyeEase * 0.45)) / 0.15);
  }
  if (layer.fade === 'mouthOpen') {
    return smooth((params.mouthOpen - (0.05 + params.mouthEase * 0.35)) / 0.12);
  }
  if (layer.fade === 'mouthClose') {
    return (
      1 - smooth((params.mouthOpen - (0.05 + params.mouthEase * 0.35)) / 0.12)
    );
  }
  return 1;
}

function createRenderLayer(
  gl: WebGLRenderingContext,
  rigLayer: Anime25RigLayer,
  canvasWidth: number,
  anchors: RigAnchors,
): RenderLayer | null {
  if (!hasRenderableGeometry(rigLayer)) return null;

  const layer = { ...rigLayer } as RenderLayer;
  layer.group = layer.group || 'body';
  layer.bn = baseRigName(layer.name);

  const cell = (layer.phys ? 30 : 42) * Math.max(0.6, canvasWidth / 768);
  const nx = Math.max(2, Math.round(layer.w / cell));
  const ny = Math.max(2, Math.round(layer.h / cell));
  const vertexCount = (nx + 1) * (ny + 1);
  const base = new Float32Array(vertexCount * 2);
  const uv = new Float32Array(vertexCount * 2);
  let offset = 0;

  for (let j = 0; j <= ny; j += 1) {
    for (let i = 0; i <= nx; i += 1) {
      base[offset] = layer.x + (layer.w * i) / nx;
      base[offset + 1] = layer.y + (layer.h * j) / ny;
      uv[offset] = i / nx;
      uv[offset + 1] = j / ny;
      offset += 2;
    }
  }

  const indices: number[] = [];
  for (let j = 0; j < ny; j += 1) {
    for (let i = 0; i < nx; i += 1) {
      const a = j * (nx + 1) + i;
      const b = a + 1;
      const c = a + nx + 1;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }

  layer.base = base;
  layer.cur = new Float32Array(base);
  layer.nIdx = indices.length;

  if (layer.strands?.length) {
    const strands = layer.strands;
    let spacing = 120;
    if (strands.length > 1) {
      const distances = strands
        .slice(1)
        .map((strand, index) => strand.x - strands[index].x)
        .sort((a, b) => a - b);
      spacing = distances[distances.length >> 1];
    }
    const sigma = spacing * 0.6;
    layer.sw = new Float32Array(vertexCount * strands.length);
    layer.su = new Float32Array(vertexCount);
    layer.spr = strands.map((_, index) => ({
      stiff: { x: 0, v: 0, dx: 0 },
      soft: { x: 0, v: 0, dx: 0 },
      phase: index * 1.37 + layer.z,
    }));

    for (let vertex = 0; vertex < vertexCount; vertex += 1) {
      const x = base[vertex * 2];
      const y = base[vertex * 2 + 1];
      let total = 0;
      for (let strand = 0; strand < strands.length; strand += 1) {
        const strandDistance = (x - strands[strand].x) / sigma;
        const weight = Math.exp(-(strandDistance ** 2));
        layer.sw[vertex * strands.length + strand] = weight;
        total += weight;
      }

      let rootY = 0;
      let tipY = 0;
      if (total > 1e-6) {
        for (let strand = 0; strand < strands.length; strand += 1) {
          const index = vertex * strands.length + strand;
          layer.sw[index] /= total;
          rootY += layer.sw[index] * strands[strand].rootY;
          tipY += layer.sw[index] * strands[strand].tipY;
        }
      } else {
        layer.sw[vertex * strands.length] = 1;
        rootY = strands[0].rootY;
        tipY = strands[0].tipY;
      }
      layer.su[vertex] = clamp((y - rootY) / Math.max(1, tipY - rootY), 0, 1);
    }

    if (layer.bn === 'front hair') {
      const faceWidth = anchors.face.x1 - anchors.face.x0;
      const faceCenterX = anchors.face.cx;
      const feather = 36;
      const leftBoundary = faceCenterX - faceWidth * 0.22;
      const rightBoundary = faceCenterX + faceWidth * 0.22;
      layer.bw = new Float32Array(vertexCount * 3);
      for (let vertex = 0; vertex < vertexCount; vertex += 1) {
        const x = base[vertex * 2];
        const s1 = smooth((x - leftBoundary) / feather + 0.5);
        const s2 = smooth((x - rightBoundary) / feather + 0.5);
        layer.bw[vertex * 3] = 1 - s1;
        layer.bw[vertex * 3 + 1] = s1 * (1 - s2);
        layer.bw[vertex * 3 + 2] = s2;
      }
    }
  }

  layer.vboPos = createBuffer(gl);
  layer.vboUV = createBuffer(gl);
  layer.ibo = createBuffer(gl);

  gl.bindBuffer(gl.ARRAY_BUFFER, layer.vboUV);
  gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, layer.ibo);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW,
  );

  layer.tex = createTexture(
    gl,
    new ImageData(
      new Uint8ClampedArray(layer.img.data),
      layer.img.width,
      layer.img.height,
    ),
  );

  return layer;
}

export function createAnime25RigAvatar(
  canvas: HTMLCanvasElement,
  rig: Anime25RigResult,
): Anime25RigAvatar {
  const context = canvas.getContext('webgl', {
    alpha: true,
    stencil: true,
    antialias: true,
    premultipliedAlpha: true,
  });
  if (!context) throw new Error('WebGL is not available.');
  const gl: WebGLRenderingContext = context;

  const program = createProgram(gl);
  gl.useProgram(program);
  const locPos = getAttribLocation(gl, program, 'aPos');
  const locUV = getAttribLocation(gl, program, 'aUV');
  const locRes = getUniformLocation(gl, program, 'uRes');
  const locCut = getUniformLocation(gl, program, 'uCut');
  const locAlpha = getUniformLocation(gl, program, 'uAlpha');

  gl.enableVertexAttribArray(locPos);
  gl.enableVertexAttribArray(locUV);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);

  const anchors = getAnchors(rig);
  const canvasWidth = rig.canvas.w;
  const canvasHeight = rig.canvas.h;
  const faceScale = anchors.faceScale;
  const neckPivot = anchors.neckPivot;
  const bodyPivot = anchors.bodyPivot;
  const faceCenter = { x: anchors.face.cx, y: anchors.face.cy };
  const chest = {
    cx: neckPivot.cx,
    cy: anchors.neckBottom + (anchors.face.y1 - anchors.face.y0) * 0.6,
    rx: (anchors.face.x1 - anchors.face.x0) * 0.6,
    ry: (anchors.face.y1 - anchors.face.y0) * 0.45,
  };
  const layers = rig.layers
    .map((layer) => createRenderLayer(gl, layer, canvasWidth, anchors))
    .filter((layer): layer is RenderLayer => Boolean(layer));
  const hasEyeClose = {
    L: layers.some((layer) => layer.bn === 'eye_close' && layer.side === 'L'),
    R: layers.some((layer) => layer.bn === 'eye_close' && layer.side === 'R'),
  };

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  let disposed = false;
  let animationFrame = 0;
  let last = performance.now();
  let blinkT = -1;
  let nextBlink = last + 1800;
  let nextRandom = 0;
  let intensity = 1;
  let motionEnabled = true;
  let mouthInput = 0;
  let averageFps = 0;
  let fpsFrames = 0;
  let fpsStart = last;
  const randomTarget = { ax: 0, ay: 0, az: 0, bd: 0, ex: 0, ey: 0 };
  const target = { ...DEFAULT_PARAMS };
  const current = { ...DEFAULT_PARAMS };
  const bounce = { x: 0, v: 0, dy: 0 };

  function deform(layer: RenderLayer, params: MotionParams) {
    const base = layer.base;
    const output = layer.cur;
    const isHead = layer.group === 'head';
    const angleZ = params.angleZ * 0.07;
    const cosZ = Math.cos(angleZ);
    const sinZ = Math.sin(angleZ);
    const bodyAngle = params.body * 0.028;
    const cosBody = Math.cos(bodyAngle);
    const sinBody = Math.sin(bodyAngle);
    const eyeAnchor =
      layer.side === 'L'
        ? anchors.eyeL
        : layer.side === 'R'
          ? anchors.eyeR
          : null;
    const eyeOpen = layer.side === 'L' ? params.eyeOpenL : params.eyeOpenR;
    const mouthHalfWidth = (anchors.mouth.x1 - anchors.mouth.x0) / 2;
    const strandCount = layer.strands?.length || 0;
    const centerX = layer.x + layer.w / 2;
    const centerY = layer.y + layer.h / 2;
    const isFrontHair = layer.bn === 'front hair';

    for (let index = 0; index < base.length; index += 2) {
      let x = base[index];
      let y = base[index + 1];
      const vertex = index >> 1;

      if (eyeAnchor && layer.bn === 'eye_close') {
        const scale = layer.side === 'L' ? params.eyeScaleL : params.eyeScaleR;
        if (scale !== 1) {
          const cx = (eyeAnchor.x0 + eyeAnchor.x1) / 2;
          const cy = (eyeAnchor.y0 + eyeAnchor.y1) / 2;
          x = cx + (x - cx) * scale;
          y = cy + (y - cy) * scale;
        }
      }

      if (layer.bn === 'mouth_open' || layer.bn === 'mouth_close') {
        if (params.mouthScale !== 1) {
          x = anchors.mouth.cx + (x - anchors.mouth.cx) * params.mouthScale;
          y = anchors.mouth.cy + (y - anchors.mouth.cy) * params.mouthScale;
        }
      }

      if (layer.fade === 'eyeOpen' && eyeAnchor) {
        if (layer.bn === 'irides') {
          x = eyeAnchor.icx + (x - eyeAnchor.icx) * params.irisScale;
          y = eyeAnchor.icy + (y - eyeAnchor.icy) * params.irisScale;
          x += params.eyeX * 11 * faceScale;
          y += params.eyeY * 6 * faceScale;
          const tuck = smooth((0.32 - eyeOpen) / 0.32);
          y = eyeAnchor.closeY + (y - eyeAnchor.closeY) * (1 - 0.8 * tuck);
        } else {
          y =
            eyeAnchor.closeY +
            (y - eyeAnchor.closeY) * (1 - 0.85 * (1 - eyeOpen));
        }
      }

      if (layer.fade === 'eyeClose' && eyeAnchor) {
        y -= eyeOpen * 3;
        y += params.eyeCY * 14 * faceScale;
      }

      if (layer.bn === 'eyebrow') {
        y += (-params.brow * 9 + (1 - eyeOpen) * 3.5) * faceScale;
      }

      if (layer.fade === 'mouthOpen') {
        y =
          anchors.mouth.y0 +
          (y - anchors.mouth.y0) * (0.5 + 0.5 * params.mouthOpen);
        const q = Math.abs(x - anchors.mouth.cx) / (mouthHalfWidth + 4);
        y -= params.mouthForm * 6 * faceScale * (q ** 1.5 - 0.35);
      }

      if (layer.fade === 'mouthClose') {
        y += params.mouthCY * 14 * faceScale;
        const mouthAngle = params.mouthCAng * 0.35;
        if (mouthAngle) {
          const cosMouth = Math.cos(mouthAngle);
          const sinMouth = Math.sin(mouthAngle);
          const rx = x - anchors.mouth.cx;
          const ry = y - anchors.mouth.cy;
          x = anchors.mouth.cx + rx * cosMouth - ry * sinMouth;
          y = anchors.mouth.cy + rx * sinMouth + ry * cosMouth;
        }
      }

      if (layer.bn === 'face' && y > anchors.mouth.cy) {
        y +=
          params.mouthOpen *
          6 *
          faceScale *
          smooth((y - anchors.mouth.cy) / (anchors.face.y1 - anchors.mouth.cy));
      }

      let headWeight = isHead ? 1 : layer.group === 'body' ? 0.16 : 0;
      if (layer.bn === 'neck') {
        headWeight =
          0.55 *
          smooth(
            (anchors.neckBottom - y) /
              Math.max(1, anchors.neckBottom - anchors.neckTop),
          );
      }

      if (headWeight > 0) {
        const rx = x - neckPivot.cx;
        const ry = y - neckPivot.cy;
        const rotatedX = rx * cosZ - ry * sinZ;
        const rotatedY = rx * sinZ + ry * cosZ;
        x += (rotatedX - rx) * headWeight;
        y += (rotatedY - ry) * headWeight;
        x +=
          headWeight *
          faceScale *
          (params.angleX * (14 + 40 * (layer.depth - 1)) +
            params.angleX * (neckPivot.cy - y) * 0.028);
        y +=
          headWeight *
          faceScale *
          (-params.angleY * (9 + 30 * (layer.depth - 1)) -
            params.angleY * (layer.depth - 1) * (y - faceCenter.y) * 0.05);
      }

      y -=
        (layer.group === 'body'
          ? params.breath * 2 * BREATH_SCALE
          : params.breathHead * 1.6 * BREATH_SCALE) * faceScale;

      if (layer.bn === 'topwear' && y < chest.cy) {
        y -=
          params.breath *
          2.2 *
          BREATH_SCALE *
          faceScale *
          smooth((chest.cy - y) / (chest.ry * 2));
      }
      if (layer.bn === 'topwear') {
        x =
          neckPivot.cx +
          (x - neckPivot.cx) * (1 + params.breath * 0.003 * BREATH_SCALE);
        const gx = (x - chest.cx) / chest.rx;
        const gy = (y - (chest.cy + params.bustY * 70 * faceScale)) / chest.ry;
        y += bounce.dy * params.bust * Math.exp(-gx * gx - gy * gy);
      }

      if (layer.bn === 'handwear') {
        const weight = smooth(((y - layer.y) / layer.h) * 1.15);
        y -= params.armY * 30 * faceScale * weight;
        y += params.armPos * 40 * faceScale;
        x += params.armY * 6 * faceScale * weight * (x < neckPivot.cx ? 1 : -1);
      }

      if (layer.bw && layer.su) {
        const motion = layer.su[vertex] ** 1.4 * 22 * faceScale;
        x +=
          (params.bangL * layer.bw[vertex * 3] +
            params.bangC * layer.bw[vertex * 3 + 1] +
            params.bangR * layer.bw[vertex * 3 + 2]) *
          motion;
      }

      if (strandCount && layer.sw && layer.su && layer.spr) {
        const u = isFrontHair
          ? Math.min(1, layer.su[vertex] * 1.6)
          : layer.su[vertex];
        const amplitude =
          u ** (isFrontHair ? 1.8 : 2.1) *
          (isFrontHair ? params.fhAmp : params.physAmp) *
          HAIR_PHYSICS_SCALE;
        const softMix = u ** 1.2 * (isFrontHair ? params.fhSoft : params.soft);
        let dx = 0;
        for (let strand = 0; strand < strandCount; strand += 1) {
          const weight = layer.sw[vertex * strandCount + strand];
          if (weight < 0.001) continue;
          const spring = layer.spr[strand];
          dx +=
            weight *
            (spring.stiff.dx * (1 - softMix) + spring.soft.dx * softMix);
        }
        x += dx * amplitude;
        y += Math.abs(dx) * amplitude * 0.12;
      }

      output[index] = x;
      output[index + 1] = y;
    }

    if (Math.abs(bodyAngle) > 1e-4) {
      for (let index = 0; index < output.length; index += 2) {
        const rx = output[index] - bodyPivot.cx;
        const ry = output[index + 1] - bodyPivot.cy;
        output[index] = bodyPivot.cx + rx * cosBody - ry * sinBody;
        output[index + 1] = bodyPivot.cy + rx * sinBody + ry * cosBody;
      }
    }

    void centerX;
    void centerY;
  }

  function tick(now: number) {
    if (disposed) return;
    animationFrame = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const time = now / 1000;
    Object.assign(target, DEFAULT_PARAMS);
    const activeIntensity = motionEnabled ? intensity : 0;

    target.angleX +=
      activeIntensity *
      IDLE_SWAY_SCALE *
      (0.13 * Math.sin(time * 0.42) + 0.05 * Math.sin(time * 1.13));
    target.angleY +=
      activeIntensity * IDLE_SWAY_SCALE * 0.08 * Math.sin(time * 0.31 + 1.7);
    target.angleZ +=
      activeIntensity * IDLE_SWAY_SCALE * 0.07 * Math.sin(time * 0.23 + 0.5);
    target.body +=
      activeIntensity * IDLE_SWAY_SCALE * 0.1 * Math.sin(time * 0.19 + 2.1);

    if (motionEnabled && now > nextRandom) {
      nextRandom = now + 1400 + Math.random() * 2600;
      randomTarget.ax = (Math.random() * 2 - 1) * 0.75;
      randomTarget.ay = (Math.random() * 2 - 1) * 0.55;
      randomTarget.az = (Math.random() * 2 - 1) * 0.5;
      randomTarget.bd = (Math.random() * 2 - 1) * 0.45;
      randomTarget.ex = (Math.random() * 2 - 1) * 0.8;
      randomTarget.ey = (Math.random() * 2 - 1) * 0.5;
    }

    target.angleX = clamp(
      target.angleX + randomTarget.ax * activeIntensity,
      -1,
      1,
    );
    target.angleY = clamp(
      target.angleY + randomTarget.ay * activeIntensity,
      -1,
      1,
    );
    target.angleZ = clamp(
      target.angleZ + randomTarget.az * activeIntensity,
      -1,
      1,
    );
    target.body = clamp(target.body + randomTarget.bd * activeIntensity, -1, 1);
    target.eyeX = clamp(randomTarget.ex * activeIntensity, -1, 1);
    target.eyeY = clamp(randomTarget.ey * activeIntensity, -1, 1);
    target.mouthOpen = clamp(mouthInput, 0, 1);

    if (motionEnabled && blinkT < 0 && now > nextBlink) {
      blinkT = 0;
      nextBlink = now + 1600 + Math.random() * 3800;
      if (Math.random() < 0.18) nextBlink = now + 280;
    }
    if (motionEnabled && blinkT >= 0) {
      blinkT += dt;
      let value = 1;
      if (blinkT < 0.08) value = 1 - blinkT / 0.08;
      else if (blinkT < 0.42) value = 0;
      else if (blinkT < 0.58) value = (blinkT - 0.42) / 0.16;
      else blinkT = -1;
      target.eyeOpenL = Math.min(target.eyeOpenL, value);
      target.eyeOpenR = Math.min(target.eyeOpenR, value);
    }

    for (const key of Object.keys(current) as (keyof MotionParams)[]) {
      current[key] += (target[key] - current[key]) * Math.min(1, dt * 14);
    }

    const params = { ...current };
    params.physAmp *= activeIntensity;
    params.soft *= activeIntensity;
    params.fhAmp *= activeIntensity;
    params.fhSoft *= activeIntensity;
    params.breath =
      activeIntensity * (0.5 + 0.5 * Math.sin((time * 2 * Math.PI) / 3.4));
    params.breathHead =
      activeIntensity *
      (0.5 + 0.5 * Math.sin((time * 2 * Math.PI) / 3.4 - 0.6));

    const headDX =
      (params.angleX * 14 +
        params.angleZ * 0.07 * (neckPivot.cy - faceCenter.y)) *
      faceScale;
    for (const layer of layers) {
      if (!layer.spr) continue;
      for (const spring of layer.spr) {
        const wind =
          activeIntensity *
          HAIR_WIND_SCALE *
          (1.8 * Math.sin(time * 0.8 + spring.phase) +
            Math.sin(time * 1.9 + spring.phase * 2.3));
        const targetX = headDX + wind * faceScale;
        let kk = 70;
        let damping = 9;
        let acceleration =
          -kk * (spring.stiff.x - targetX) - damping * spring.stiff.v;
        spring.stiff.v += acceleration * dt;
        spring.stiff.x += spring.stiff.v * dt;
        spring.stiff.dx = -(spring.stiff.x - targetX) * 2.2;
        kk = 16;
        damping = 1.3;
        acceleration =
          -kk * (spring.soft.x - targetX) - damping * spring.soft.v;
        spring.soft.v += acceleration * dt;
        spring.soft.x += spring.soft.v * dt;
        spring.soft.dx = -(spring.soft.x - targetX) * 3;
      }
    }

    const bustTarget =
      (params.breath * 3 - params.angleY * 6 + params.body * 4) * faceScale;
    const bounceAcceleration = -140 * (bounce.x - bustTarget) - 4.2 * bounce.v;
    bounce.v += bounceAcceleration * dt;
    bounce.x += bounce.v * dt;
    bounce.dy = -(bounce.x - bustTarget) * 3;

    gl.viewport(0, 0, canvasWidth, canvasHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clearStencil(0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
    gl.uniform2f(locRes, canvasWidth, canvasHeight);
    for (const layer of layers) {
      const alpha = fadeAlpha(layer, params, hasEyeClose);
      if (
        alpha < 0.004 &&
        !(layer.fade === 'eyeOpen' && layer.name.startsWith('eyewhite'))
      ) {
        continue;
      }
      deform(layer, params);
      gl.uniform1f(locAlpha, alpha);
      gl.bindBuffer(gl.ARRAY_BUFFER, layer.vboPos);
      gl.bufferData(gl.ARRAY_BUFFER, layer.cur, gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, layer.vboUV);
      gl.vertexAttribPointer(locUV, 2, gl.FLOAT, false, 0, 0);
      gl.bindTexture(gl.TEXTURE_2D, layer.tex);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, layer.ibo);

      if (layer.name.startsWith('eyewhite')) {
        gl.enable(gl.STENCIL_TEST);
        gl.stencilFunc(gl.ALWAYS, 1, 0xff);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
        gl.uniform1f(locCut, 0.25);
        gl.drawElements(gl.TRIANGLES, layer.nIdx, gl.UNSIGNED_SHORT, 0);
        gl.disable(gl.STENCIL_TEST);
        gl.uniform1f(locCut, 0);
      } else if (layer.name.startsWith('irides')) {
        gl.enable(gl.STENCIL_TEST);
        gl.stencilFunc(gl.EQUAL, 1, 0xff);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
        gl.drawElements(gl.TRIANGLES, layer.nIdx, gl.UNSIGNED_SHORT, 0);
        gl.disable(gl.STENCIL_TEST);
      } else {
        gl.drawElements(gl.TRIANGLES, layer.nIdx, gl.UNSIGNED_SHORT, 0);
      }
    }

    fpsFrames += 1;
    if (now - fpsStart > 500) {
      averageFps = Math.round((fpsFrames * 1000) / (now - fpsStart));
      fpsFrames = 0;
      fpsStart = now;
    }
  }

  animationFrame = requestAnimationFrame(tick);

  return {
    setMouthOpen(value: number) {
      mouthInput = clamp(value, 0, 1);
    },
    setIntensity(value: number) {
      intensity = clamp(value, 0, 2);
    },
    setMotionEnabled(value: boolean) {
      motionEnabled = value;
      if (!value) {
        blinkT = -1;
        randomTarget.ax = 0;
        randomTarget.ay = 0;
        randomTarget.az = 0;
        randomTarget.bd = 0;
        randomTarget.ex = 0;
        randomTarget.ey = 0;
      }
    },
    getAverageFps() {
      return averageFps;
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      for (const layer of layers) {
        gl.deleteTexture(layer.tex);
        gl.deleteBuffer(layer.vboPos);
        gl.deleteBuffer(layer.vboUV);
        gl.deleteBuffer(layer.ibo);
      }
      gl.deleteProgram(program);
    },
  };
}
