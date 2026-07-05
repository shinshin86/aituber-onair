import initInochi2d, { Inochi2dRuntime } from './inochi2d.js';
import { createSecondaryMotionEngine } from './secondary_motion.js';

const GL_TEXTURE_WRAP_S = 0x2802;
const GL_TEXTURE_WRAP_T = 0x2803;
const GL_CLAMP_TO_BORDER = 0x812d;
const GL_CLAMP_TO_EDGE = 0x812f;
const AUTO_BLINK_PARAMETER_IDS = [
  'Eye:: Left:: Blink',
  'Eye:: Right:: Blink',
  'Blink',
];
const AUTO_GAZE_PARAMETER_IDS = {
  leftX: 'Eye:: Left:: Move',
  rightX: 'Eye:: Right:: Move',
  leftY: 'Eye:: Left:: Move Y',
  rightY: 'Eye:: Right:: Move Y',
};
const MOUTH_SHAPE_PARAMETER_ID = 'Mouth:: Shape';
const MOUTH_PARAMETER_ID_RE = /mouth/i;
const LIP_SYNC_ATTACK_MS = 45;
const LIP_SYNC_RELEASE_MS = 110;
const LIP_SYNC_CLOSE_EPSILON = 0.001;
const SPEECH_SECONDARY_MOTION_MIN_DELTA = 0.008;
const SPEECH_SECONDARY_MOTION_IMPULSE_X = 5.2;
const SPEECH_SECONDARY_MOTION_IMPULSE_Y = 2.8;
const SPEECH_SECONDARY_MOTION_RELEASE_RATE = 0.18;
const MOUTH_VISEME_POSES = {
  neutral: [1, 0],
  a: [0.5, 1],
  i: [1, 0.25],
  u: [0, 0.45],
  e: [0.75, 0.55],
  o: [0, 0.85],
};
const EXPRESSION_PRESETS = {
  neutral: {
    faceValues: {},
    mouthValues: {},
  },
  happy: {
    faceValues: {
      'Brow:: Left:: Lift': 0.3,
      'Brow:: Right:: Lift': 0.3,
      'Eye:: Left:: Move Y': -0.1,
      'Eye:: Right:: Move Y': -0.1,
    },
    mouthValues: {
      [MOUTH_SHAPE_PARAMETER_ID]: [1, 0.22],
    },
  },
  smile: {
    faceValues: {
      'Brow:: Left:: Lift': 0.32,
      'Brow:: Right:: Lift': 0.32,
      'Eye:: Left:: Move Y': -0.12,
      'Eye:: Right:: Move Y': -0.12,
    },
    mouthValues: {
      [MOUTH_SHAPE_PARAMETER_ID]: [1, 0.25],
    },
  },
  relaxed: {
    faceValues: {
      'Brow:: Left:: Lift': 0.12,
      'Brow:: Right:: Lift': 0.12,
      'Eye:: Left:: Move Y': -0.05,
      'Eye:: Right:: Move Y': -0.05,
    },
    mouthValues: {
      [MOUTH_SHAPE_PARAMETER_ID]: [1, 0.12],
    },
  },
  surprised: {
    faceValues: {
      'Brow:: Left:: Lift': 0.9,
      'Brow:: Right:: Lift': 0.9,
      'Eye:: Left:: Move Y': 0.18,
      'Eye:: Right:: Move Y': 0.18,
    },
    mouthValues: {
      [MOUTH_SHAPE_PARAMETER_ID]: [0, 0.85],
    },
  },
  angry: {
    faceValues: {
      'Brow:: Left:: Lift': -0.34,
      'Brow:: Right:: Lift': -0.3,
      'Eye:: Left:: Move Y': 0.08,
      'Eye:: Right:: Move Y': 0.08,
    },
    mouthValues: {
      [MOUTH_SHAPE_PARAMETER_ID]: [0.42, 0.18],
    },
  },
  thinking: {
    faceValues: {
      'Brow:: Left:: Lift': -0.16,
      'Brow:: Right:: Lift': 0.18,
      'Eye:: Left:: Move': -0.08,
      'Eye:: Right:: Move': -0.08,
    },
    mouthValues: {
      [MOUTH_SHAPE_PARAMETER_ID]: [0.75, 0.25],
    },
  },
  listening: {
    faceValues: {
      'Brow:: Left:: Lift': 0.14,
      'Brow:: Right:: Lift': 0.1,
      'Eye:: Left:: Move': -0.06,
      'Eye:: Right:: Move': -0.06,
      'Eye:: Left:: Move Y': 0.04,
      'Eye:: Right:: Move Y': 0.04,
    },
  },
  speaking: {
    faceValues: {
      'Brow:: Left:: Lift': 0.24,
      'Brow:: Right:: Lift': 0.24,
      'Eye:: Left:: Move Y': -0.06,
      'Eye:: Right:: Move Y': -0.06,
    },
  },
  sad: {
    faceValues: {
      'Brow:: Left:: Lift': -0.28,
      'Brow:: Right:: Lift': -0.28,
      'Eye:: Left:: Move Y': -0.2,
      'Eye:: Right:: Move Y': -0.2,
    },
    mouthValues: {
      [MOUTH_SHAPE_PARAMETER_ID]: [0, 0.25],
    },
  },
  error: {
    faceValues: {
      'Brow:: Left:: Lift': -0.32,
      'Brow:: Right:: Lift': -0.24,
      'Eye:: Left:: Move Y': -0.16,
      'Eye:: Right:: Move Y': -0.16,
    },
    mouthValues: {
      [MOUTH_SHAPE_PARAMETER_ID]: [0.25, 0.22],
    },
  },
};
const IDLE_BLINK_PERIOD_MS = 4200;
const IDLE_BLINK_CLOSE_MS = 90;
const IDLE_BLINK_HOLD_MS = 45;
const IDLE_BLINK_OPEN_MS = 120;
const BLINK_LAYER_MANUAL_DURATION_MS = 240;
const AUTO_GAZE_AMPLITUDE_X = 0.065;
const AUTO_GAZE_AMPLITUDE_Y = 0.035;
const AUTO_GAZE_SECONDARY_AMPLITUDE_X = 0.025;
const PERFORMANCE_PROFILER_ALPHA = 0.08;
const PERFORMANCE_PROFILER_FRAME_BUDGET_MS = 16.67;
const PERFORMANCE_PROFILER_SLOW_FRAME_MS = 24;
const PERFORMANCE_PROFILER_DATASET_INTERVAL = 30;
const PARAMETER_WRITE_EPSILON = 0.0005;
const DEFAULT_IDLE_ANIMATION_TRANSITION_MS = 520;
const DEFAULT_REACTION_ANIMATION_TRANSITION_MS = 70;
const DEFAULT_RARE_IDLE_GESTURE_COOLDOWN_MS = 45000;
const SECONDARY_MOTION_DRIVER_FOLLOW_RATE = 9.5;
const SECONDARY_MOTION_MAX_DRIVER_IMPULSE_X = 16;
const SECONDARY_MOTION_MAX_DRIVER_IMPULSE_Y = 10;
const MOTION_DEBUG_HISTORY_LIMIT = 12;
const DEBUG_DATASET_UPDATE_INTERVAL_MS = 1000;
const FRAME_CADENCE_DATASET_UPDATE_INTERVAL_MS = 1000;
// Soft-cap very high refresh displays without dropping 60-75Hz displays to
// half rate because rAF cadence cannot be scheduled exactly.
const RUNTIME_TICK_MIN_INTERVAL_MS = (1000 / 60) * 0.8;
const MOTION_LAYER_PRIORITIES = {
  base: 5,
  idle: 10,
  secondary: 15,
  manual: 30,
  reaction: 30,
  emotion: 35,
  expression: 40,
  gaze: 45,
  blink: 50,
  'lip-sync': 60,
  camera: 70,
  reset: 90,
};
const DEFAULT_CAMERA_SCALE = 0.15;
const MIN_CAMERA_SCALE = 0.05;
const MAX_CAMERA_SCALE = 2.0;
const CAMERA_MOTION_EFFECTS = new Set(['camera.x', 'camera.y', 'camera.scale']);
const NODE_MOTION_EFFECT_PREFIX = 'node|';
const PART_OPACITY_EFFECT_PREFIX = 'partOpacity|';
const DISABLED_PART_OPACITY_NODE_NAMES = new Set([
  'Arm:: Left',
  'Hand:: Left',
  'Arm:: Right',
  'Hand:: Right',
  'Arm:: Left:: B',
  'Hand:: Left:: B',
  'Arm:: Right:: B',
  'Hand:: Right:: B',
]);
const SECONDARY_MOTION_PARAMETER_IDS = {
  ahoge: 'Hair:: Ahoge:: Swing',
  leftSleeve: 'Arm:: Left:: Sleeve:: Physics',
  rightSleeve: 'Arm:: Right:: Sleeve:: Physics',
  ribbon: 'Ribbon:: Physics',
  skirt: 'Skirt:: Physics',
  tail: 'Tail:: Move',
  bodyXMove: 'Body:: X:: Move',
  hipSway: 'Hip:: Sway',
  leftLegMove: 'Leg:: Left:: Move',
  rightLegMove: 'Leg:: Right:: Move',
  leftFootMove: 'Foot:: Left:: Move',
  rightFootMove: 'Foot:: Right:: Move',
};
const LOWER_BODY_PARAMETER_IDS = [
  SECONDARY_MOTION_PARAMETER_IDS.bodyXMove,
  SECONDARY_MOTION_PARAMETER_IDS.hipSway,
  SECONDARY_MOTION_PARAMETER_IDS.leftLegMove,
  SECONDARY_MOTION_PARAMETER_IDS.rightLegMove,
  SECONDARY_MOTION_PARAMETER_IDS.leftFootMove,
  SECONDARY_MOTION_PARAMETER_IDS.rightFootMove,
];
const LOWER_BODY_NODE_NAMES = {
  body: 'Body',
  skirt: 'Skirt',
  leftLeg: 'Leg:: Left',
  rightLeg: 'Leg:: Right',
  leftLegShadow: 'Leg:: Left:: Shadow',
  rightLegShadow: 'Leg:: Right:: Shadow',
};
const HAIR_PHYSICS_PARAMETER_GROUPS = [
  {
    stateId: 'hairFront',
    maxAbs: 0.34,
    scaleX: 28,
    scaleY: 28,
    parameterIds: [
      'Front Hair:: Right2:: Physics',
      'Front Hair:: Left2:: Physics',
      'Front Hair:: Right1:: Physics',
      'Front Hair:: Left1:: Physics',
      'Front Hair:: Center:: Physics',
    ],
  },
  {
    stateId: 'hairSideLeft',
    maxAbs: 0.42,
    scaleX: 30,
    scaleY: 28,
    parameterIds: ['Side Hair:: Left:: Physics'],
  },
  {
    stateId: 'hairSideRight',
    maxAbs: 0.42,
    scaleX: 30,
    scaleY: 28,
    parameterIds: ['Side Hair:: Right:: Physics'],
  },
  {
    stateId: 'hairBackLeft',
    maxAbs: 0.46,
    scaleX: 32,
    scaleY: 30,
    parameterIds: [
      'Back Side:: Hair:: Left1:: Physics',
      'Back Side:: Hair:: Left2:: Physics',
      'Back Side:: Hair:: Left3:: Physics',
    ],
  },
  {
    stateId: 'hairBackRight',
    maxAbs: 0.46,
    scaleX: 32,
    scaleY: 30,
    parameterIds: [
      'Back Side:: Hair:: Right1:: Physics',
      'Back Side:: Hair:: Right2:: Physics',
      'Back Side:: Hair:: Right3:: Physics',
    ],
  },
];
const SECONDARY_MOTION_DRIVER_PARAMETERS = {
  headYawPitch: 'Head:: Yaw-Pitch',
  headRoll: 'Head:: Roll',
  bodyYawPitch: 'Body:: Yaw-Pitch',
  bodyRoll: 'Body:: Roll',
};
const MOTION_PROFILES = [
  {
    id: 'physics',
    maxX: 64,
    maxY: 30,
    stiffness: 18,
    damping: 6.4,
    idle: {
      x: [
        { amplitude: 10, frequency: 0.052, phase: 0.6 },
        { amplitude: 4.2, frequency: 0.113, phase: 2.1 },
      ],
      y: [
        { amplitude: 2.8, frequency: 0.067, phase: 1.2 },
        { amplitude: 1.3, frequency: 0.141, phase: 2.8 },
      ],
    },
    interaction: {
      maxX: 64,
      maxY: 30,
      offsetScaleX: 0.28,
      offsetScaleY: 0.14,
      impulseScaleX: 0.31,
      impulseScaleY: 0.18,
      crossAxisRatio: 0.18,
    },
    loadImpulse: { x: 11, y: -3 },
  },
  {
    id: 'hair',
    maxX: 52,
    maxY: 24,
    stiffness: 12.5,
    damping: 5.3,
    followId: 'physics',
    followScaleX: 0.94,
    followScaleY: 0.72,
    idle: {
      x: [{ amplitude: 2.1, frequency: 0.089, phase: 3.4 }],
      y: [{ amplitude: 0.8, frequency: 0.121, phase: 0.9 }],
    },
    loadImpulse: { x: -4, y: 1.2 },
  },
  {
    id: 'hairFront',
    maxX: 22,
    maxY: 16,
    stiffness: 14.5,
    damping: 6.5,
    followId: 'physics',
    followScaleX: 0.24,
    followScaleY: 0.28,
    idle: {
      x: [{ amplitude: 0.9, frequency: 0.092, phase: 2.8 }],
      y: [{ amplitude: 0.35, frequency: 0.133, phase: 1.6 }],
    },
    loadImpulse: { x: -1.4, y: 0.4 },
  },
  {
    id: 'hairSideLeft',
    maxX: 30,
    maxY: 20,
    stiffness: 11.8,
    damping: 5.3,
    followId: 'physics',
    followScaleX: 0.45,
    followScaleY: 0.42,
    idle: {
      x: [{ amplitude: 1.3, frequency: 0.073, phase: 3.9 }],
      y: [{ amplitude: 0.55, frequency: 0.118, phase: 0.7 }],
    },
    loadImpulse: { x: -2.8, y: 0.9 },
  },
  {
    id: 'hairSideRight',
    maxX: 30,
    maxY: 20,
    stiffness: 11.2,
    damping: 5.1,
    followId: 'physics',
    followScaleX: 0.42,
    followScaleY: 0.4,
    idle: {
      x: [{ amplitude: 1.2, frequency: 0.078, phase: 4.6 }],
      y: [{ amplitude: 0.5, frequency: 0.125, phase: 1.1 }],
    },
    loadImpulse: { x: -2.4, y: 0.7 },
  },
  {
    id: 'hairBackLeft',
    maxX: 34,
    maxY: 22,
    stiffness: 9.3,
    damping: 4.6,
    followId: 'physics',
    followScaleX: 0.56,
    followScaleY: 0.48,
    idle: {
      x: [{ amplitude: 1.6, frequency: 0.063, phase: 4.1 }],
      y: [{ amplitude: 0.65, frequency: 0.097, phase: 1.8 }],
    },
    loadImpulse: { x: -3.1, y: 1.1 },
  },
  {
    id: 'hairBackRight',
    maxX: 34,
    maxY: 22,
    stiffness: 9.0,
    damping: 4.5,
    followId: 'physics',
    followScaleX: 0.53,
    followScaleY: 0.46,
    idle: {
      x: [{ amplitude: 1.5, frequency: 0.067, phase: 4.9 }],
      y: [{ amplitude: 0.6, frequency: 0.101, phase: 2.2 }],
    },
    loadImpulse: { x: -2.9, y: 1.0 },
  },
  {
    id: 'cloth',
    maxX: 26,
    maxY: 22,
    stiffness: 8.8,
    damping: 4.7,
    followId: 'physics',
    followScaleX: 0.34,
    followScaleY: 0.76,
    idle: {
      x: [{ amplitude: 0.9, frequency: 0.044, phase: 2.6 }],
      y: [{ amplitude: 1.1, frequency: 0.073, phase: 1.5 }],
    },
    loadImpulse: { x: 2.4, y: 1.8 },
  },
  {
    id: 'hip',
    maxX: 18,
    maxY: 10,
    stiffness: 7.4,
    damping: 4.4,
    followId: 'physics',
    followScaleX: 0.16,
    followScaleY: 0.18,
    idle: {
      x: [
        { amplitude: 0.85, frequency: 0.039, phase: 1.1 },
        { amplitude: 0.32, frequency: 0.083, phase: 4.4 },
      ],
      y: [{ amplitude: 0.45, frequency: 0.052, phase: 2.7 }],
    },
    loadImpulse: { x: 1.2, y: 0.4 },
  },
  {
    id: 'leg',
    maxX: 12,
    maxY: 8,
    stiffness: 6.8,
    damping: 4.2,
    followId: 'hip',
    followScaleX: 0.62,
    followScaleY: 0.54,
    idle: {
      x: [{ amplitude: 0.35, frequency: 0.047, phase: 3.8 }],
      y: [{ amplitude: 0.24, frequency: 0.071, phase: 0.6 }],
    },
    loadImpulse: { x: -0.6, y: 0.2 },
  },
  {
    id: 'foot',
    maxX: 8,
    maxY: 6,
    stiffness: 9.8,
    damping: 5.4,
    followId: 'leg',
    followScaleX: 0.72,
    followScaleY: 0.5,
    idle: {
      x: [{ amplitude: 0.18, frequency: 0.083, phase: 2.4 }],
      y: [{ amplitude: 0.12, frequency: 0.109, phase: 1.7 }],
    },
    loadImpulse: { x: 0.35, y: -0.1 },
  },
  {
    id: 'accessory',
    maxX: 24,
    maxY: 18,
    stiffness: 10.8,
    damping: 5.8,
    followId: 'physics',
    followScaleX: 0.66,
    followScaleY: 0.58,
    idle: {
      x: [{ amplitude: 1.4, frequency: 0.097, phase: 4.2 }],
      y: [{ amplitude: 0.6, frequency: 0.153, phase: 1.1 }],
    },
    loadImpulse: { x: 5.8, y: -1.4 },
  },
  {
    id: 'tail',
    maxX: 24,
    maxY: 14,
    stiffness: 7.4,
    damping: 4.1,
    followId: 'physics',
    followScaleX: 0.36,
    followScaleY: 0.32,
    idle: {
      x: [
        { amplitude: 2.6, frequency: 0.061, phase: 5.1 },
        { amplitude: 1.2, frequency: 0.127, phase: 0.4 },
      ],
      y: [{ amplitude: 0.5, frequency: 0.084, phase: 2.4 }],
    },
    loadImpulse: { x: -4.8, y: 0.9 },
  },
];

let webglCompatPatchApplied = false;

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const smoothStep = (value) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const clampRange = (value, min, max) => Math.min(max, Math.max(min, value));
const clampSigned = (value, maxAbs = 1) =>
  Math.min(maxAbs, Math.max(-maxAbs, value));
const clampScale = (value) =>
  Math.min(MAX_CAMERA_SCALE, Math.max(MIN_CAMERA_SCALE, value));
const createPerformanceProfilerState = (enabled = false) => ({
  enabled,
  frames: 0,
  slowFrames: 0,
  lastFrameMs: 0,
  avgFrameMs: 0,
  maxFrameMs: 0,
  lastDeltaMs: 0,
  avgDeltaMs: 0,
  maxDeltaMs: 0,
  lastParameterWrites: 0,
  avgParameterWrites: 0,
  maxParameterWrites: 0,
  lastParameterWriteSkips: 0,
  avgParameterWriteSkips: 0,
  maxParameterWriteSkips: 0,
  targetFrameMs: PERFORMANCE_PROFILER_FRAME_BUDGET_MS,
  budgetOverrunFrames: 0,
  lastFrameBudgetUsage: 0,
  avgFrameBudgetUsage: 0,
  maxFrameBudgetUsage: 0,
  lastMeasuredSectionMs: 0,
  avgMeasuredSectionMs: 0,
  maxMeasuredSectionMs: 0,
  lastUnmeasuredFrameMs: 0,
  avgUnmeasuredFrameMs: 0,
  maxUnmeasuredFrameMs: 0,
  bottleneckSectionName: null,
  topSections: [],
  runtimeProfile: null,
  runtimeTopSections: [],
  runtimeBottleneckSectionName: null,
  avgRuntimeTotalMs: 0,
  maxRuntimeTotalMs: 0,
  sections: {},
});
const recordPerformanceAverage = (previous, value) =>
  previous === 0
    ? value
    : previous + (value - previous) * PERFORMANCE_PROFILER_ALPHA;
const textDecoder = new TextDecoder();

const createMotionLayerDebugState = () => ({
  activeLayers: [],
  touchedParameterIds: [],
  parameterSources: {},
  parameterOwners: {},
  transition: null,
  lastSwitch: null,
  lastReset: null,
  lastCompletedAnimation: null,
});

const getMotionLayerPriority = (type) =>
  MOTION_LAYER_PRIORITIES[type] ?? MOTION_LAYER_PRIORITIES.manual;

const createMotionLayerDebugEntry = ({
  id,
  name,
  type,
  owner = id,
  weight = 1,
  targetWeight = weight,
  transitionMs = 0,
  fadeInMs = transitionMs,
  fadeOutMs = transitionMs,
  interruptible = true,
  ownsParameters = [],
  extra = {},
}) => {
  const uniqueParameters = [
    ...new Set(
      ownsParameters.filter((parameterId) => typeof parameterId === 'string'),
    ),
  ];

  return {
    id,
    name,
    type,
    owner,
    priority: getMotionLayerPriority(type),
    weight,
    targetWeight,
    fadeInMs,
    fadeOutMs,
    transitionMs,
    interruptible,
    ownsParameters: uniqueParameters,
    parameterCount: uniqueParameters.length,
    ...extra,
  };
};

const resolveParameterOwner = (parameterId, source) => {
  if (!parameterId || !source) {
    return null;
  }

  if (source === 'base') {
    return {
      source,
      layerId: 'base:user-parameters',
      layerType: 'base',
      priority: getMotionLayerPriority('base'),
    };
  }
  if (source === 'secondary') {
    return {
      source,
      layerId: 'secondary:procedural',
      layerType: 'secondary',
      priority: getMotionLayerPriority('secondary'),
    };
  }
  if (source.startsWith('animation:')) {
    const parts = source.slice('animation:'.length).split(':');
    const [kindOrName, ...nameParts] = parts;
    const kind = nameParts.length > 0 ? kindOrName : 'manual';
    const name = nameParts.length > 0 ? nameParts.join(':') : kindOrName;
    const isReset = name === 'reset';
    return {
      source,
      layerId: isReset ? 'animation:reset' : `animation:${name}`,
      layerType: isReset ? 'reset' : kind,
      priority: getMotionLayerPriority(isReset ? 'reset' : kind),
    };
  }
  if (source.startsWith('expression:')) {
    const name = source.slice('expression:'.length);
    const isReset = name === 'reset';
    return {
      source,
      layerId: isReset ? 'expression:reset' : `expression:${name}`,
      layerType: isReset ? 'reset' : 'expression',
      priority: getMotionLayerPriority(isReset ? 'reset' : 'expression'),
    };
  }
  if (source.startsWith('blink:')) {
    return {
      source,
      layerId: `blink:${source.slice('blink:'.length)}`,
      layerType: 'blink',
      priority: getMotionLayerPriority('blink'),
    };
  }
  if (source.startsWith('gaze:')) {
    return {
      source,
      layerId: `gaze:${source.slice('gaze:'.length)}`,
      layerType: 'gaze',
      priority: getMotionLayerPriority('gaze'),
    };
  }
  if (source.startsWith('lip-sync:')) {
    return {
      source,
      layerId: `lip-sync:${source.slice('lip-sync:'.length)}`,
      layerType: 'lip-sync',
      priority: getMotionLayerPriority('lip-sync'),
    };
  }

  return {
    source,
    layerId: `unknown:${source}`,
    layerType: 'unknown',
    priority: getMotionLayerPriority('manual'),
  };
};

const resolveBlinkValue = (timestampMs) => {
  const phaseMs = timestampMs % IDLE_BLINK_PERIOD_MS;

  if (phaseMs < IDLE_BLINK_CLOSE_MS) {
    return clamp01(phaseMs / IDLE_BLINK_CLOSE_MS);
  }

  if (phaseMs < IDLE_BLINK_CLOSE_MS + IDLE_BLINK_HOLD_MS) {
    return 1;
  }

  const openPhaseMs = phaseMs - IDLE_BLINK_CLOSE_MS - IDLE_BLINK_HOLD_MS;
  if (openPhaseMs < IDLE_BLINK_OPEN_MS) {
    return clamp01(1 - openPhaseMs / IDLE_BLINK_OPEN_MS);
  }

  return 0;
};

const decodePuppetPayload = (modelBytes) => {
  if (modelBytes.length < 12) {
    return null;
  }

  const view = new DataView(
    modelBytes.buffer,
    modelBytes.byteOffset,
    modelBytes.byteLength,
  );
  const jsonLength = view.getUint32(8, false);
  const jsonStart = 12;
  const jsonEnd = jsonStart + jsonLength;

  if (jsonEnd > modelBytes.length) {
    return null;
  }

  try {
    return JSON.parse(
      textDecoder.decode(modelBytes.subarray(jsonStart, jsonEnd)),
    );
  } catch {
    return null;
  }
};

const loadMotionPayload = async (motionUrl) => {
  if (!motionUrl) {
    return null;
  }

  const response = await fetch(motionUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch Inochi2D motion (${response.status} ${response.statusText}).`,
    );
  }

  return await response.json();
};

const lerp = (from, to, t) => from + (to - from) * t;

const cubic = (p0, p1, p2, p3, t) => {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
};

const evaluateLane = (lane, frame) => {
  const frames = lane.keyframes ?? [];
  if (frames.length === 0) {
    return undefined;
  }
  if (frames.length === 1) {
    return frames[0].value;
  }

  if (frame <= frames[0].frame) {
    return frames[0].value;
  }

  const lastFrame = frames[frames.length - 1];
  if (frame >= lastFrame.frame) {
    return lastFrame.value;
  }

  let lower = 0;
  let upper = frames.length - 1;
  while (lower < upper) {
    const middle = Math.floor((lower + upper) / 2);
    if (frames[middle].frame < frame) {
      lower = middle + 1;
    } else {
      upper = middle;
    }
  }

  const index = lower;
  const next = frames[index];
  const previous = frames[index - 1];
  const span = Math.max(1, next.frame - previous.frame);
  const t = Math.min(1, Math.max(0, (frame - previous.frame) / span));

  switch (lane.interpolation) {
    case 'Nearest':
      return t > 0.5 ? next.value : previous.value;
    case 'Stepped':
      return previous.value;
    case 'Cubic': {
      const p0 = frames[Math.max(index - 2, 0)].value;
      const p1 = previous.value;
      const p2 = next.value;
      const p3 = frames[Math.min(index + 1, frames.length - 1)].value;
      return cubic(p0, p1, p2, p3, t);
    }
    case 'Linear':
    default:
      return lerp(previous.value, next.value, t);
  }
};

const normalizeAnimation = (animation) => {
  const length =
    typeof animation?.length === 'number' && Number.isFinite(animation.length)
      ? Math.max(1, animation.length)
      : 1;
  const leadIn =
    typeof animation?.leadIn === 'number' && Number.isFinite(animation.leadIn)
      ? clampRange(animation.leadIn, 0, length)
      : 0;
  const leadOut =
    typeof animation?.leadOut === 'number' && Number.isFinite(animation.leadOut)
      ? clampRange(animation.leadOut, 0, length)
      : 0;
  const animationWeight =
    typeof animation?.animationWeight === 'number' &&
    Number.isFinite(animation.animationWeight)
      ? clampRange(animation.animationWeight, 0, 1)
      : 1;

  return {
    timestep:
      typeof animation?.timestep === 'number' &&
      Number.isFinite(animation.timestep)
        ? animation.timestep
        : 1 / 60,
    length,
    leadIn,
    leadOut,
    animationWeight,
    lanes: Array.isArray(animation?.lanes)
      ? animation.lanes.map((lane) => ({
          ...lane,
          effect:
            typeof lane.effect === 'string' &&
            (CAMERA_MOTION_EFFECTS.has(lane.effect) ||
              lane.effect.startsWith(NODE_MOTION_EFFECT_PREFIX) ||
              lane.effect.startsWith(PART_OPACITY_EFFECT_PREFIX))
              ? lane.effect
              : null,
          uuid: Number(lane.uuid),
          target: lane.target === 1 ? 1 : 0,
          keyframes: Array.isArray(lane.keyframes)
            ? [...lane.keyframes]
                .filter(
                  (keyframe) =>
                    Number.isFinite(keyframe.frame) &&
                    Number.isFinite(keyframe.value),
                )
                .sort((a, b) => a.frame - b.frame)
            : [],
        }))
      : [],
  };
};

const resolveCameraMotionChannel = (effect) => {
  if (effect === 'camera.x') {
    return 'x';
  }
  if (effect === 'camera.y') {
    return 'y';
  }
  if (effect === 'camera.scale') {
    return 'scale';
  }
  return null;
};

const parseNodeMotionEffect = (effect) => {
  if (
    typeof effect !== 'string' ||
    !effect.startsWith(NODE_MOTION_EFFECT_PREFIX)
  ) {
    return null;
  }

  const [, nodeName, channel] = effect.split('|');
  if (!nodeName || !channel) {
    return null;
  }

  if (!['x', 'y', 'rz'].includes(channel)) {
    return null;
  }

  return { nodeName, channel };
};

const parsePartOpacityEffect = (effect) => {
  if (
    typeof effect !== 'string' ||
    !effect.startsWith(PART_OPACITY_EFFECT_PREFIX)
  ) {
    return null;
  }

  const [, nodeName, defaultOpacityRaw] = effect.split('|');
  if (!nodeName) {
    return null;
  }
  if (DISABLED_PART_OPACITY_NODE_NAMES.has(nodeName)) {
    return null;
  }

  const normalizedDefault =
    typeof defaultOpacityRaw === 'string' &&
    defaultOpacityRaw.startsWith('default=')
      ? defaultOpacityRaw.slice('default='.length)
      : defaultOpacityRaw;
  const defaultOpacity = Number(normalizedDefault);

  return {
    nodeName,
    defaultOpacity: Number.isFinite(defaultOpacity)
      ? clamp01(defaultOpacity)
      : 1,
  };
};

const compileAnimation = (animation, parameterByUuid) => ({
  ...animation,
  lanes: animation.lanes.map((lane) => ({
    ...lane,
    cameraMotionChannel: resolveCameraMotionChannel(lane.effect),
    nodeMotion: parseNodeMotionEffect(lane.effect),
    partOpacity: parsePartOpacityEffect(lane.effect),
    parameter: parameterByUuid.get(lane.uuid) ?? null,
  })),
});

const getAnimationPlaybackWeight = (animation, frame) => {
  const baseWeight = Number.isFinite(animation.animationWeight)
    ? animation.animationWeight
    : 1;
  const fadeInWeight =
    animation.leadIn > 0 ? smoothStep(frame / animation.leadIn) : 1;
  const remainingFrames = Math.max(0, animation.length - 1 - frame);
  const fadeOutWeight =
    animation.leadOut > 0 ? smoothStep(remainingFrames / animation.leadOut) : 1;

  return clamp01(baseWeight * Math.min(fadeInWeight, fadeOutWeight));
};

const patchWebGlClampToBorder = () => {
  if (
    webglCompatPatchApplied ||
    typeof WebGL2RenderingContext === 'undefined'
  ) {
    return;
  }

  const originalTexParameteri = WebGL2RenderingContext.prototype.texParameteri;

  WebGL2RenderingContext.prototype.texParameteri =
    function patchedTexParameteri(target, pname, param) {
      if (
        (pname === GL_TEXTURE_WRAP_S || pname === GL_TEXTURE_WRAP_T) &&
        param === GL_CLAMP_TO_BORDER
      ) {
        return originalTexParameteri.call(
          this,
          target,
          pname,
          GL_CLAMP_TO_EDGE,
        );
      }

      return originalTexParameteri.call(this, target, pname, param);
    };

  webglCompatPatchApplied = true;
};

export const createInochi2DController = async ({ wasmUrl, debug }) => {
  patchWebGlClampToBorder();
  await initInochi2d({ module_or_path: wasmUrl });

  const debugEnabled = debug === true;
  let canvas = null;
  let runtime = null;
  let mounted = false;
  let rafId = 0;
  let width = 1;
  let height = 1;
  let devicePixelRatio = 1;
  let lastTickTimestamp = null;
  const parameterValues = new Map();
  const vectorParameterValues = new Map();
  const cameraTransform = {
    x: 0,
    y: 0,
    scale: DEFAULT_CAMERA_SCALE,
  };
  let cameraMotionOffset = {
    x: 0,
    y: 0,
    scale: 0,
  };
  let nodeHandleByName = new Map();
  let parameterHandleById = new Map();
  let nodeMotionOffsets = new Map();
  let secondaryNodeMotionOffsets = new Map();
  let appliedNodeMotionOffsets = new Map();
  let partOpacityValues = new Map();
  let partOpacityDefaults = new Map();
  let idleAnimationNames = [];
  let idleAnimationProfiles = new Map();
  let idleAnimationQueue = [];
  let reactionAnimationGroups = new Map();
  let emotionAnimationGroups = new Map();
  let lastIdleAnimationName = null;
  let lastReactionAnimationName = null;
  let lastEmotionAnimationName = null;
  let lastReactionTimestampMs = 0;
  let lastEmotionTimestampMs = 0;
  let lastRareIdleGestureTimestampMs = 0;
  let parameterByUuid = new Map();
  let parameterById = new Map();
  let animationLibrary = new Map();
  let activeAnimation = null;
  let activeAnimationParameterIds = new Set();
  let motionLayerDebugState = createMotionLayerDebugState();
  let motionDebugHistory = [];
  let parameterSourceById = new Map();
  let parameterOwnerById = new Map();
  let secondaryMotionDriver = null;
  let secondaryMotionDriverTimestamp = null;
  let speechSecondaryMotionDriver = {
    open: 0,
    impulseX: 0,
    impulseY: 0,
    active: false,
  };
  let performanceProfiler = createPerformanceProfilerState(false);
  let parameterWritesThisFrame = 0;
  let parameterWriteSkipsThisFrame = 0;
  let performanceSectionsThisFrame = new Map();
  let lastRuntimeParameterValues = new Map();
  let unresolvedParameterHandleIds = new Set();
  let lastVerboseDebugDatasetUpdateMs = Number.NEGATIVE_INFINITY;
  let frameCount = 0;
  let lastFrameCadenceDatasetUpdateMs = Number.NEGATIVE_INFINITY;
  let blinkLayer = {
    mode: 'auto',
    valueLeft: 0,
    valueRight: 0,
    manualUntilMs: 0,
    activeParameterIds: [],
  };
  let gazeLayer = {
    mode: 'auto',
    x: 0,
    y: 0,
    activeParameterIds: [],
  };
  let lipSyncLayer = {
    targetOpen: 0,
    currentOpen: 0,
    viseme: 'neutral',
    active: false,
    pose: [...MOUTH_VISEME_POSES.neutral],
  };
  let expressionLayer = {
    name: null,
    weight: 0,
    values: {},
    active: false,
    allowMouth: false,
    appliedParameterIds: [],
    blockedParameterIds: [],
  };
  const secondaryMotion = createSecondaryMotionEngine({
    profiles: MOTION_PROFILES,
  });

  const isVerboseDebugActive = () =>
    debugEnabled || performanceProfiler.enabled;

  const clearVerboseDebugDataset = () => {
    if (!canvas) {
      return;
    }

    delete canvas.dataset.inochi2dPerfFrameMs;
    delete canvas.dataset.inochi2dPerfDeltaMs;
    delete canvas.dataset.inochi2dPerfParameterWrites;
    delete canvas.dataset.inochi2dPerfParameterWriteSkips;
    delete canvas.dataset.inochi2dPerfBudgetUsage;
    delete canvas.dataset.inochi2dPerfBottleneck;
    delete canvas.dataset.inochi2dPerfRuntimeBottleneck;
    delete canvas.dataset.inochi2dPerfRuntimeMs;
    delete canvas.dataset.inochi2dActiveLayers;
    delete canvas.dataset.inochi2dTouchedParameters;
    delete canvas.dataset.inochi2dAnimationTouchedParameterIds;
    delete canvas.dataset.inochi2dUnresolvedParameterHandles;
  };

  const resetFrameCadenceDataset = () => {
    frameCount = 0;
    lastFrameCadenceDatasetUpdateMs = Number.NEGATIVE_INFINITY;
    if (!canvas) {
      return;
    }

    canvas.dataset.inochi2dFrameCount = '0';
    delete canvas.dataset.inochi2dLastFrameTs;
  };

  const recordFrameCadence = (timestamp) => {
    frameCount += 1;
    if (
      !canvas ||
      timestamp - lastFrameCadenceDatasetUpdateMs <
        FRAME_CADENCE_DATASET_UPDATE_INTERVAL_MS
    ) {
      return;
    }

    canvas.dataset.inochi2dFrameCount = String(frameCount);
    canvas.dataset.inochi2dLastFrameTs = timestamp.toFixed(1);
    lastFrameCadenceDatasetUpdateMs = timestamp;
  };

  const pushMotionDebugHistory = (entry) => {
    if (!debugEnabled) {
      return;
    }

    motionDebugHistory = [
      {
        atMs:
          typeof performance !== 'undefined' ? performance.now() : Date.now(),
        ...entry,
      },
      ...motionDebugHistory,
    ].slice(0, MOTION_DEBUG_HISTORY_LIMIT);
  };

  const markParameterSource = (parameterId, source) => {
    if (!parameterId || !source) {
      return;
    }
    parameterSourceById.set(parameterId, source);
    const owner = resolveParameterOwner(parameterId, source);
    if (owner) {
      parameterOwnerById.set(parameterId, owner);
    }
  };

  const getActiveLayerDebugEntries = () => {
    const layers = [];
    const getOwnedParameterIds = (layerId) =>
      [...parameterOwnerById.entries()]
        .filter(([, owner]) => owner.layerId === layerId)
        .map(([parameterId]) => parameterId);

    const baseParameterIds = getOwnedParameterIds('base:user-parameters');
    if (baseParameterIds.length > 0) {
      layers.push(
        createMotionLayerDebugEntry({
          id: 'base:user-parameters',
          name: 'user-parameters',
          type: 'base',
          owner: 'base',
          interruptible: false,
          ownsParameters: baseParameterIds,
        }),
      );
    }

    if (activeAnimation) {
      layers.push(
        createMotionLayerDebugEntry({
          id: `animation:${activeAnimation.name}`,
          name: activeAnimation.name,
          type: activeAnimation.kind,
          owner: 'animation',
          loop: activeAnimation.loop,
          weight: activeAnimation.playbackWeight ?? activeAnimation.weight,
          targetWeight: 1,
          transitionMs: activeAnimation.transition?.durationMs ?? 0,
          interruptible: activeAnimation.kind !== 'idle',
          ownsParameters: [...activeAnimationParameterIds],
        }),
      );
    }
    if (expressionLayer.active) {
      layers.push(
        createMotionLayerDebugEntry({
          id: `expression:${expressionLayer.name ?? 'active'}`,
          name: expressionLayer.name ?? 'expression',
          type: 'expression',
          owner: 'expression',
          weight: expressionLayer.weight,
          targetWeight: expressionLayer.active ? 1 : 0,
          transitionMs: 180,
          interruptible: true,
          ownsParameters: expressionLayer.appliedParameterIds,
          extra: {
            blockedParameterCount: expressionLayer.blockedParameterIds.length,
          },
        }),
      );
    }
    if (gazeLayer.activeParameterIds.length > 0) {
      layers.push(
        createMotionLayerDebugEntry({
          id: `gaze:${gazeLayer.mode}`,
          name: gazeLayer.mode,
          type: 'gaze',
          owner: 'gaze',
          transitionMs: 220,
          interruptible: true,
          ownsParameters: gazeLayer.activeParameterIds,
          extra: {
            x: gazeLayer.x,
            y: gazeLayer.y,
          },
        }),
      );
    }
    if (blinkLayer.activeParameterIds.length > 0) {
      layers.push(
        createMotionLayerDebugEntry({
          id: `blink:${blinkLayer.mode}`,
          name: blinkLayer.mode,
          type: 'blink',
          owner: 'blink',
          transitionMs: BLINK_LAYER_MANUAL_DURATION_MS,
          interruptible: false,
          ownsParameters: blinkLayer.activeParameterIds,
        }),
      );
    }
    if (
      lipSyncLayer.active ||
      lipSyncLayer.currentOpen > LIP_SYNC_CLOSE_EPSILON
    ) {
      layers.push(
        createMotionLayerDebugEntry({
          id: `lip-sync:${lipSyncLayer.viseme}`,
          name: lipSyncLayer.viseme,
          type: 'lip-sync',
          owner: 'lip-sync',
          weight: lipSyncLayer.currentOpen,
          targetWeight: lipSyncLayer.targetOpen,
          fadeInMs: LIP_SYNC_ATTACK_MS,
          fadeOutMs: LIP_SYNC_RELEASE_MS,
          interruptible: false,
          ownsParameters: parameterById.has(MOUTH_SHAPE_PARAMETER_ID)
            ? [MOUTH_SHAPE_PARAMETER_ID]
            : [],
        }),
      );
    }
    layers.push(
      createMotionLayerDebugEntry({
        id: 'secondary:procedural',
        name: 'secondary-motion',
        type: 'secondary',
        owner: 'secondary',
        interruptible: false,
        ownsParameters: HAIR_PHYSICS_PARAMETER_GROUPS.flatMap(
          (group) => group.parameterIds,
        ),
      }),
    );

    return layers.sort((a, b) => a.priority - b.priority);
  };

  const cancelLoop = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  };

  const getPerformanceNow = () =>
    typeof performance !== 'undefined' ? performance.now() : Date.now();

  const measurePerformanceSection = (sectionName, callback) => {
    if (!performanceProfiler.enabled) {
      return callback();
    }

    const start = getPerformanceNow();
    try {
      return callback();
    } finally {
      const elapsedMs = getPerformanceNow() - start;
      const previousSection = performanceProfiler.sections[sectionName] ?? {
        lastMs: 0,
        avgMs: 0,
        maxMs: 0,
        calls: 0,
        lastFrameShare: 0,
        avgFrameShare: 0,
        maxFrameShare: 0,
      };
      performanceProfiler.sections[sectionName] = {
        ...previousSection,
        lastMs: elapsedMs,
        avgMs: recordPerformanceAverage(previousSection.avgMs, elapsedMs),
        maxMs: Math.max(previousSection.maxMs, elapsedMs),
        calls: previousSection.calls + 1,
      };
      performanceSectionsThisFrame.set(
        sectionName,
        (performanceSectionsThisFrame.get(sectionName) ?? 0) + elapsedMs,
      );
    }
  };

  const recordPerformanceFrame = (frameMs, deltaTimeMs) => {
    if (!performanceProfiler.enabled) {
      return;
    }

    const measuredSectionMs = [...performanceSectionsThisFrame.values()].reduce(
      (totalMs, sectionMs) => totalMs + sectionMs,
      0,
    );
    const unmeasuredFrameMs = Math.max(0, frameMs - measuredSectionMs);
    const frameBudgetUsage = frameMs / PERFORMANCE_PROFILER_FRAME_BUDGET_MS;
    const sectionEntries = Object.entries(performanceProfiler.sections).map(
      ([name, section]) => {
        const lastFrameMs = performanceSectionsThisFrame.get(name) ?? 0;
        const lastFrameShare = frameMs > 0 ? lastFrameMs / frameMs : 0;
        const nextSection = {
          ...section,
          lastFrameMs,
          lastFrameShare,
          avgFrameShare: recordPerformanceAverage(
            section.avgFrameShare ?? 0,
            lastFrameShare,
          ),
          maxFrameShare: Math.max(section.maxFrameShare ?? 0, lastFrameShare),
        };
        performanceProfiler.sections[name] = nextSection;
        return [name, nextSection];
      },
    );
    const topSections = sectionEntries
      .map(([name, section]) => ({
        name,
        lastMs: section.lastMs,
        avgMs: section.avgMs,
        maxMs: section.maxMs,
        lastFrameMs: section.lastFrameMs,
        lastFrameShare: section.lastFrameShare,
        avgFrameShare: section.avgFrameShare,
        maxFrameShare: section.maxFrameShare,
        calls: section.calls,
      }))
      .sort((left, right) => right.avgMs - left.avgMs)
      .slice(0, 6);

    performanceProfiler = {
      ...performanceProfiler,
      frames: performanceProfiler.frames + 1,
      slowFrames:
        performanceProfiler.slowFrames +
        (frameMs > PERFORMANCE_PROFILER_SLOW_FRAME_MS ? 1 : 0),
      budgetOverrunFrames:
        performanceProfiler.budgetOverrunFrames +
        (frameMs > PERFORMANCE_PROFILER_FRAME_BUDGET_MS ? 1 : 0),
      lastFrameMs: frameMs,
      avgFrameMs: recordPerformanceAverage(
        performanceProfiler.avgFrameMs,
        frameMs,
      ),
      maxFrameMs: Math.max(performanceProfiler.maxFrameMs, frameMs),
      lastDeltaMs: deltaTimeMs,
      avgDeltaMs: recordPerformanceAverage(
        performanceProfiler.avgDeltaMs,
        deltaTimeMs,
      ),
      maxDeltaMs: Math.max(performanceProfiler.maxDeltaMs, deltaTimeMs),
      lastParameterWrites: parameterWritesThisFrame,
      avgParameterWrites: recordPerformanceAverage(
        performanceProfiler.avgParameterWrites,
        parameterWritesThisFrame,
      ),
      maxParameterWrites: Math.max(
        performanceProfiler.maxParameterWrites,
        parameterWritesThisFrame,
      ),
      lastParameterWriteSkips: parameterWriteSkipsThisFrame,
      avgParameterWriteSkips: recordPerformanceAverage(
        performanceProfiler.avgParameterWriteSkips,
        parameterWriteSkipsThisFrame,
      ),
      maxParameterWriteSkips: Math.max(
        performanceProfiler.maxParameterWriteSkips,
        parameterWriteSkipsThisFrame,
      ),
      lastFrameBudgetUsage: frameBudgetUsage,
      avgFrameBudgetUsage: recordPerformanceAverage(
        performanceProfiler.avgFrameBudgetUsage,
        frameBudgetUsage,
      ),
      maxFrameBudgetUsage: Math.max(
        performanceProfiler.maxFrameBudgetUsage,
        frameBudgetUsage,
      ),
      lastMeasuredSectionMs: measuredSectionMs,
      avgMeasuredSectionMs: recordPerformanceAverage(
        performanceProfiler.avgMeasuredSectionMs,
        measuredSectionMs,
      ),
      maxMeasuredSectionMs: Math.max(
        performanceProfiler.maxMeasuredSectionMs,
        measuredSectionMs,
      ),
      lastUnmeasuredFrameMs: unmeasuredFrameMs,
      avgUnmeasuredFrameMs: recordPerformanceAverage(
        performanceProfiler.avgUnmeasuredFrameMs,
        unmeasuredFrameMs,
      ),
      maxUnmeasuredFrameMs: Math.max(
        performanceProfiler.maxUnmeasuredFrameMs,
        unmeasuredFrameMs,
      ),
      bottleneckSectionName: topSections[0]?.name ?? null,
      topSections,
    };

    if (
      canvas &&
      performanceProfiler.frames % PERFORMANCE_PROFILER_DATASET_INTERVAL === 0
    ) {
      canvas.dataset.inochi2dPerfFrameMs =
        performanceProfiler.avgFrameMs.toFixed(2);
      canvas.dataset.inochi2dPerfDeltaMs =
        performanceProfiler.avgDeltaMs.toFixed(2);
      canvas.dataset.inochi2dPerfParameterWrites =
        performanceProfiler.avgParameterWrites.toFixed(1);
      canvas.dataset.inochi2dPerfParameterWriteSkips =
        performanceProfiler.avgParameterWriteSkips.toFixed(1);
      canvas.dataset.inochi2dPerfBudgetUsage =
        performanceProfiler.avgFrameBudgetUsage.toFixed(2);
      canvas.dataset.inochi2dPerfBottleneck =
        performanceProfiler.bottleneckSectionName ?? '';
    }
  };

  const setPerformanceProfilerEnabled = (enabled) => {
    performanceProfiler = createPerformanceProfilerState(
      debugEnabled && Boolean(enabled),
    );
    if (canvas) {
      canvas.dataset.inochi2dProfiler = performanceProfiler.enabled
        ? 'enabled'
        : 'disabled';
      if (!performanceProfiler.enabled) {
        clearVerboseDebugDataset();
      }
    }
  };

  const recordRuntimeProfileSummary = () => {
    if (
      !performanceProfiler.enabled ||
      !runtime ||
      typeof runtime.get_runtime_profile_summary !== 'function'
    ) {
      return;
    }

    const runtimeProfile = runtime.get_runtime_profile_summary();
    if (!runtimeProfile || typeof runtimeProfile !== 'object') {
      return;
    }

    const runtimeSections = { ...(runtimeProfile.sections ?? {}) };
    const runtimeTopSections = Object.entries(runtimeSections)
      .map(([name, section]) => ({
        name,
        lastMs: Number(section?.lastMs ?? 0),
        avgMs: Number(section?.avgMs ?? 0),
        maxMs: Number(section?.maxMs ?? 0),
        calls: Number(section?.calls ?? 0),
      }))
      .sort((left, right) => right.avgMs - left.avgMs)
      .slice(0, 8);

    performanceProfiler = {
      ...performanceProfiler,
      runtimeProfile: {
        ...runtimeProfile,
        sections: runtimeSections,
        topSections: runtimeTopSections,
      },
      runtimeTopSections,
      runtimeBottleneckSectionName:
        runtimeProfile.bottleneckSectionName ??
        runtimeTopSections[0]?.name ??
        null,
      avgRuntimeTotalMs: Number(runtimeProfile.avgTotalMs ?? 0),
      maxRuntimeTotalMs: Number(runtimeProfile.maxTotalMs ?? 0),
    };

    if (canvas) {
      canvas.dataset.inochi2dPerfRuntimeBottleneck =
        performanceProfiler.runtimeBottleneckSectionName ?? '';
      canvas.dataset.inochi2dPerfRuntimeMs =
        performanceProfiler.avgRuntimeTotalMs.toFixed(2);
    }
  };

  const shouldSkipParameterWrite = (parameterId, valueX, valueY) => {
    const previousValue = lastRuntimeParameterValues.get(parameterId);
    if (!previousValue) {
      return false;
    }

    return (
      Math.abs(previousValue[0] - valueX) <= PARAMETER_WRITE_EPSILON &&
      Math.abs(previousValue[1] - valueY) <= PARAMETER_WRITE_EPSILON
    );
  };

  const buildLowerBodyNodeMotionOffsets = (hipState, legState) => {
    const hipX = clampSigned(hipState.x, 18);
    const hipY = clampSigned(hipState.y, 10);
    const legX = clampSigned(legState.x, 12);
    const legY = clampSigned(legState.y, 8);
    const sway = hipX / 18;
    const stride = legX / 12;
    const bob = Math.abs(sway) * 0.22 + hipY / 28 + legY / 42;

    return new Map([
      [
        LOWER_BODY_NODE_NAMES.leftLeg,
        {
          x: stride * 0.95 - sway * 0.55,
          y: bob * 0.7,
          rz: -stride * 0.004 - sway * 0.003,
        },
      ],
      [
        LOWER_BODY_NODE_NAMES.rightLeg,
        {
          x: -stride * 0.95 - sway * 0.55,
          y: -bob * 0.45,
          rz: stride * 0.004 - sway * 0.003,
        },
      ],
      [
        LOWER_BODY_NODE_NAMES.leftLegShadow,
        {
          x: stride * 0.22,
          y: bob * 0.2,
          rz: 0,
        },
      ],
      [
        LOWER_BODY_NODE_NAMES.rightLegShadow,
        {
          x: -stride * 0.22,
          y: -bob * 0.15,
          rz: 0,
        },
      ],
    ]);
  };

  const applyMotionState = () => {
    if (!runtime) {
      return;
    }

    const physicsState = secondaryMotion.getState('physics');
    const hairState = secondaryMotion.getState('hair');
    const clothState = secondaryMotion.getState('cloth');
    const hipState = secondaryMotion.getState('hip');
    const legState = secondaryMotion.getState('leg');
    const footState = secondaryMotion.getState('foot');
    const accessoryState = secondaryMotion.getState('accessory');
    const tailState = secondaryMotion.getState('tail');
    const hairPhysicsStates = new Map(
      HAIR_PHYSICS_PARAMETER_GROUPS.map((group) => [
        group.stateId,
        secondaryMotion.getState(group.stateId),
      ]),
    );

    const setSecondaryScalarParameterValue = (
      parameterId,
      value,
      maxAbs = 0.6,
    ) => {
      if (
        !parameterById.has(parameterId) ||
        parameterValues.has(parameterId) ||
        activeAnimationParameterIds.has(parameterId)
      ) {
        return;
      }
      markParameterSource(parameterId, 'secondary');
      setScalarParameterValue(parameterId, clampSigned(value, maxAbs));
    };

    const setSecondaryVectorParameterValue = (
      parameterId,
      valueX,
      valueY,
      maxAbs = 0.55,
    ) => {
      if (
        !parameterById.has(parameterId) ||
        vectorParameterValues.has(parameterId) ||
        activeAnimationParameterIds.has(parameterId)
      ) {
        return;
      }
      markParameterSource(parameterId, 'secondary');
      setParameterVectorValue(
        parameterId,
        clampSigned(valueX, maxAbs),
        clampSigned(valueY, maxAbs),
      );
    };

    runtime.set_head_sway_offset(physicsState.x, physicsState.y);
    for (const group of HAIR_PHYSICS_PARAMETER_GROUPS) {
      const groupState = hairPhysicsStates.get(group.stateId);
      if (!groupState) {
        continue;
      }
      for (const parameterId of group.parameterIds) {
        setSecondaryVectorParameterValue(
          parameterId,
          groupState.x / group.scaleX,
          groupState.y / group.scaleY,
          group.maxAbs,
        );
      }
    }
    setSecondaryScalarParameterValue(
      SECONDARY_MOTION_PARAMETER_IDS.ahoge,
      hairState.x / 52,
      0.32,
    );
    setSecondaryVectorParameterValue(
      SECONDARY_MOTION_PARAMETER_IDS.leftSleeve,
      clothState.x / 30,
      clothState.y / 30,
      0.42,
    );
    setSecondaryVectorParameterValue(
      SECONDARY_MOTION_PARAMETER_IDS.rightSleeve,
      clothState.x / 30,
      clothState.y / 30,
      0.42,
    );
    setSecondaryVectorParameterValue(
      SECONDARY_MOTION_PARAMETER_IDS.ribbon,
      accessoryState.x / 28,
      accessoryState.y / 24,
      0.45,
    );
    setSecondaryVectorParameterValue(
      SECONDARY_MOTION_PARAMETER_IDS.skirt,
      clothState.x / 30,
      clothState.y / 30,
      0.45,
    );
    setSecondaryScalarParameterValue(
      SECONDARY_MOTION_PARAMETER_IDS.tail,
      tailState.x / 32,
      0.65,
    );
    const activeAnimationOwnsLowerBody = LOWER_BODY_PARAMETER_IDS.some(
      (parameterId) => activeAnimationParameterIds.has(parameterId),
    );
    if (!activeAnimationOwnsLowerBody) {
      setSecondaryScalarParameterValue(
        SECONDARY_MOTION_PARAMETER_IDS.bodyXMove,
        hipState.x / 360 + legState.x / 900,
        0.055,
      );
      setSecondaryScalarParameterValue(
        SECONDARY_MOTION_PARAMETER_IDS.hipSway,
        hipState.x / 62,
        0.32,
      );
      setSecondaryScalarParameterValue(
        SECONDARY_MOTION_PARAMETER_IDS.leftLegMove,
        legState.x / 36 - hipState.x / 92,
        0.42,
      );
      setSecondaryScalarParameterValue(
        SECONDARY_MOTION_PARAMETER_IDS.rightLegMove,
        -legState.x / 36 - hipState.x / 92,
        0.42,
      );
      setSecondaryScalarParameterValue(
        SECONDARY_MOTION_PARAMETER_IDS.leftFootMove,
        footState.x / 24 + legState.x / 84,
        0.35,
      );
      setSecondaryScalarParameterValue(
        SECONDARY_MOTION_PARAMETER_IDS.rightFootMove,
        -footState.x / 24 - legState.x / 84,
        0.35,
      );
      const hasDedicatedLowerBodyParameters =
        parameterById.has(SECONDARY_MOTION_PARAMETER_IDS.hipSway) &&
        parameterById.has(SECONDARY_MOTION_PARAMETER_IDS.leftLegMove) &&
        parameterById.has(SECONDARY_MOTION_PARAMETER_IDS.rightLegMove);
      if (hasDedicatedLowerBodyParameters) {
        resetSecondaryNodeMotionOffsets();
      } else {
        applySecondaryNodeMotionOffsets(
          buildLowerBodyNodeMotionOffsets(hipState, legState),
        );
      }
      if (canvas) {
        canvas.dataset.inochi2dLowerBodyMotion = 'secondary';
      }
    } else {
      resetSecondaryNodeMotionOffsets();
      if (canvas) {
        canvas.dataset.inochi2dLowerBodyMotion = 'animation';
      }
    }
    runtime.set_visible_hair_sway_offset(hairState.x, hairState.y);
    runtime.set_visible_cloth_sway_offset(clothState.x, clothState.y);
    runtime.set_visible_accessory_sway_offset(
      accessoryState.x,
      accessoryState.y,
    );
    runtime.set_visible_tail_sway_offset(
      tailState.x * 0.35,
      tailState.y * 0.35,
    );
  };

  const getVectorValue = (parameterId, nextVectorValues = new Map()) => {
    const nextValue = nextVectorValues.get(parameterId);
    if (nextValue) {
      return nextValue;
    }

    const currentValue = vectorParameterValues.get(parameterId);
    if (currentValue) {
      return currentValue;
    }

    const defaultValue = parameterById.get(parameterId)?.defaultValue;
    return Array.isArray(defaultValue) ? defaultValue : [0, 0];
  };

  const getScalarValue = (parameterId, nextScalarValues = new Map()) => {
    const nextValue = nextScalarValues.get(parameterId);
    if (Number.isFinite(nextValue)) {
      return nextValue;
    }

    const currentValue = parameterValues.get(parameterId);
    if (Number.isFinite(currentValue)) {
      return currentValue;
    }

    const defaultValue = parameterById.get(parameterId)?.defaultValue;
    return Number.isFinite(defaultValue?.[0]) ? defaultValue[0] : 0;
  };

  const sampleAnimationMotionDriver = (
    nextVectorValues = new Map(),
    nextScalarValues = new Map(),
    nextCameraMotionOffset = cameraMotionOffset,
  ) => {
    const headYawPitch = getVectorValue(
      SECONDARY_MOTION_DRIVER_PARAMETERS.headYawPitch,
      nextVectorValues,
    );
    const bodyYawPitch = getVectorValue(
      SECONDARY_MOTION_DRIVER_PARAMETERS.bodyYawPitch,
      nextVectorValues,
    );
    const headRoll = getScalarValue(
      SECONDARY_MOTION_DRIVER_PARAMETERS.headRoll,
      nextScalarValues,
    );
    const bodyRoll = getScalarValue(
      SECONDARY_MOTION_DRIVER_PARAMETERS.bodyRoll,
      nextScalarValues,
    );

    return {
      x:
        headYawPitch[0] * 78 +
        headRoll * 42 +
        bodyYawPitch[0] * 260 +
        bodyRoll * 125 +
        nextCameraMotionOffset.x * 9,
      y:
        headYawPitch[1] * 46 +
        bodyYawPitch[1] * 230 +
        nextCameraMotionOffset.y * 10,
    };
  };

  const applyAnimationMotionDriver = (
    nextVectorValues,
    nextScalarValues,
    nextCameraMotionOffset,
    timestamp,
  ) => {
    const nextDriver = sampleAnimationMotionDriver(
      nextVectorValues,
      nextScalarValues,
      nextCameraMotionOffset,
    );

    if (!secondaryMotionDriver) {
      secondaryMotionDriver = nextDriver;
      secondaryMotionDriverTimestamp = Number.isFinite(timestamp)
        ? timestamp
        : null;
      return;
    }

    const deltaTimeSeconds =
      Number.isFinite(timestamp) &&
      Number.isFinite(secondaryMotionDriverTimestamp)
        ? Math.min(
            0.05,
            Math.max(
              0.001,
              (timestamp - secondaryMotionDriverTimestamp) / 1000,
            ),
          )
        : 1 / 60;
    const followWeight =
      1 - Math.exp(-SECONDARY_MOTION_DRIVER_FOLLOW_RATE * deltaTimeSeconds);
    const smoothedDriver = {
      x: lerp(secondaryMotionDriver.x, nextDriver.x, followWeight),
      y: lerp(secondaryMotionDriver.y, nextDriver.y, followWeight),
    };
    const deltaX = clampSigned(
      smoothedDriver.x - secondaryMotionDriver.x,
      SECONDARY_MOTION_MAX_DRIVER_IMPULSE_X,
    );
    const deltaY = clampSigned(
      smoothedDriver.y - secondaryMotionDriver.y,
      SECONDARY_MOTION_MAX_DRIVER_IMPULSE_Y,
    );

    if (Number.isFinite(deltaX) && Number.isFinite(deltaY)) {
      secondaryMotion.inject(deltaX, deltaY);
    }

    secondaryMotionDriver = smoothedDriver;
    secondaryMotionDriverTimestamp = Number.isFinite(timestamp)
      ? timestamp
      : secondaryMotionDriverTimestamp;
  };

  const applySpeechSecondaryMotionDriver = () => {
    const nextOpen = lipSyncLayer.currentOpen;
    const deltaOpen = nextOpen - speechSecondaryMotionDriver.open;
    const shouldInject =
      lipSyncLayer.active &&
      Math.abs(deltaOpen) >= SPEECH_SECONDARY_MOTION_MIN_DELTA;
    const impulseX = shouldInject
      ? deltaOpen * SPEECH_SECONDARY_MOTION_IMPULSE_X
      : speechSecondaryMotionDriver.impulseX *
        SPEECH_SECONDARY_MOTION_RELEASE_RATE;
    const impulseY = shouldInject
      ? -Math.abs(deltaOpen) * SPEECH_SECONDARY_MOTION_IMPULSE_Y
      : speechSecondaryMotionDriver.impulseY *
        SPEECH_SECONDARY_MOTION_RELEASE_RATE;

    if (shouldInject) {
      secondaryMotion.inject(impulseX, impulseY);
    }

    speechSecondaryMotionDriver = {
      open: nextOpen,
      impulseX,
      impulseY,
      active: shouldInject,
    };
  };

  const applyMouthSafetyProfile = () => {
    if (!runtime) {
      return;
    }

    const mouthShape =
      lipSyncLayer.active || lipSyncLayer.currentOpen > LIP_SYNC_CLOSE_EPSILON
        ? lipSyncLayer.pose
        : vectorParameterValues.get(MOUTH_SHAPE_PARAMETER_ID);
    const isIdleMouth =
      !mouthShape ||
      (Math.abs(mouthShape[0] - 1) < 0.001 &&
        Math.abs(mouthShape[1]) < 0.001) ||
      (Math.abs(mouthShape[0]) < 0.001 && Math.abs(mouthShape[1]) < 0.001) ||
      (Math.abs(mouthShape[0]) < 0.001 &&
        Math.abs(mouthShape[1] - 0.25) < 0.001) ||
      (Math.abs(mouthShape[0] - 0.5) < 0.001 &&
        Math.abs(mouthShape[1] - 0.25) < 0.001);

    if (canvas) {
      canvas.dataset.inochi2dMouthSafety = isIdleMouth
        ? 'idle-parameter-only'
        : 'open';
    }
  };

  const isMouthParameter = (parameterId) =>
    parameterId === MOUTH_SHAPE_PARAMETER_ID ||
    MOUTH_PARAMETER_ID_RE.test(parameterId);

  const isLipSyncOwningMouth = () =>
    lipSyncLayer.active || lipSyncLayer.currentOpen > LIP_SYNC_CLOSE_EPSILON;

  const normalizeExpressionValue = (parameter, value, weight) => {
    const defaultValue = parameter.defaultValue;
    const targetX = Array.isArray(value) ? value[0] : value;
    const targetY = Array.isArray(value) ? value[1] : defaultValue[1];

    if (!Number.isFinite(targetX)) {
      return null;
    }

    if (!parameter.isVec2) {
      return {
        kind: 'scalar',
        value: defaultValue[0] + (targetX - defaultValue[0]) * weight,
      };
    }

    return {
      kind: 'vec2',
      value: [
        defaultValue[0] + (targetX - defaultValue[0]) * weight,
        defaultValue[1] +
          ((Number.isFinite(targetY) ? targetY : defaultValue[1]) -
            defaultValue[1]) *
            weight,
      ],
    };
  };

  const resetExpressionParameters = (parameterIds) => {
    if (!runtime) {
      return;
    }

    for (const parameterId of parameterIds) {
      if (
        parameterValues.has(parameterId) ||
        vectorParameterValues.has(parameterId)
      ) {
        continue;
      }

      const parameter = parameterById.get(parameterId);
      if (!parameter) {
        continue;
      }

      if (parameter.isVec2) {
        markParameterSource(parameterId, 'expression:reset');
        setParameterVectorValue(
          parameterId,
          parameter.defaultValue[0],
          parameter.defaultValue[1],
        );
      } else {
        markParameterSource(parameterId, 'expression:reset');
        setScalarParameterValue(parameterId, parameter.defaultValue[0]);
      }
    }
  };

  const applyExpressionLayer = () => {
    if (!runtime) {
      return;
    }

    const appliedParameterIds = [];
    const blockedParameterIds = [];
    const weight = clamp01(expressionLayer.weight);

    if (!expressionLayer.active || weight <= 0) {
      resetExpressionParameters(expressionLayer.appliedParameterIds);
      expressionLayer = {
        ...expressionLayer,
        active: false,
        appliedParameterIds,
        blockedParameterIds,
      };
      if (canvas) {
        canvas.dataset.inochi2dExpressionLayer = 'none';
        canvas.dataset.inochi2dExpressionMouthOwnership = 'none';
      }
      return;
    }

    for (const [parameterId, value] of Object.entries(expressionLayer.values)) {
      const parameter = parameterById.get(parameterId);
      if (!parameter) {
        blockedParameterIds.push(parameterId);
        continue;
      }

      if (
        isMouthParameter(parameterId) &&
        (!expressionLayer.allowMouth || isLipSyncOwningMouth())
      ) {
        blockedParameterIds.push(parameterId);
        continue;
      }

      const normalized = normalizeExpressionValue(parameter, value, weight);
      if (!normalized) {
        blockedParameterIds.push(parameterId);
        continue;
      }

      if (normalized.kind === 'vec2') {
        markParameterSource(
          parameterId,
          `expression:${expressionLayer.name ?? 'active'}`,
        );
        setParameterVectorValue(
          parameterId,
          normalized.value[0],
          normalized.value[1],
        );
      } else {
        markParameterSource(
          parameterId,
          `expression:${expressionLayer.name ?? 'active'}`,
        );
        setScalarParameterValue(parameterId, normalized.value);
      }
      appliedParameterIds.push(parameterId);
    }

    const staleParameterIds = expressionLayer.appliedParameterIds.filter(
      (parameterId) => !appliedParameterIds.includes(parameterId),
    );
    resetExpressionParameters(staleParameterIds);

    expressionLayer = {
      ...expressionLayer,
      weight,
      appliedParameterIds,
      blockedParameterIds,
    };

    if (canvas) {
      canvas.dataset.inochi2dExpressionLayer =
        appliedParameterIds.length > 0
          ? (expressionLayer.name ?? 'active')
          : 'none';
      canvas.dataset.inochi2dExpressionMouthOwnership =
        blockedParameterIds.some((parameterId) => isMouthParameter(parameterId))
          ? 'blocked'
          : expressionLayer.allowMouth
            ? 'allowed'
            : 'face-only';
    }
  };

  const getBlinkParameterIds = () =>
    AUTO_BLINK_PARAMETER_IDS.filter((parameterId) =>
      parameterById.has(parameterId),
    );

  const getGazeParameterIds = () =>
    Object.values(AUTO_GAZE_PARAMETER_IDS).filter((parameterId) =>
      parameterById.has(parameterId),
    );

  const isGazeParameterWritable = (parameterId) =>
    !parameterValues.has(parameterId);

  const resolveAutoGaze = (timestamp) => {
    const seconds = timestamp / 1000;
    return {
      x:
        Math.sin(seconds * 0.72) * AUTO_GAZE_AMPLITUDE_X +
        Math.sin(seconds * 0.19 + 1.1) * AUTO_GAZE_SECONDARY_AMPLITUDE_X,
      y: Math.sin(seconds * 0.47 + 0.7) * AUTO_GAZE_AMPLITUDE_Y,
    };
  };

  const applyGazeLayer = (timestamp) => {
    if (!runtime) {
      return;
    }

    const gazeParameterIds = getGazeParameterIds().filter(
      isGazeParameterWritable,
    );
    if (gazeParameterIds.length === 0) {
      gazeLayer = {
        ...gazeLayer,
        activeParameterIds: [],
      };
      return;
    }

    const nextGaze = resolveAutoGaze(timestamp);
    for (const parameterId of gazeParameterIds) {
      markParameterSource(parameterId, 'gaze:auto');
      const value =
        parameterId === AUTO_GAZE_PARAMETER_IDS.leftY ||
        parameterId === AUTO_GAZE_PARAMETER_IDS.rightY
          ? nextGaze.y
          : nextGaze.x;
      setScalarParameterValue(parameterId, value);
    }

    gazeLayer = {
      ...gazeLayer,
      mode: 'auto',
      x: nextGaze.x,
      y: nextGaze.y,
      activeParameterIds: gazeParameterIds,
    };

    if (canvas) {
      canvas.dataset.inochi2dGazeLayer = `auto:${nextGaze.x.toFixed(3)},${nextGaze.y.toFixed(3)}`;
    }
  };

  const isBlinkParameterWritable = (parameterId) =>
    !parameterValues.has(parameterId);

  const setBlinkParameterValue = (parameterId, valueLeft, valueRight) => {
    const nextValue =
      parameterId.toLowerCase().includes('right') &&
      !parameterId.toLowerCase().includes('left')
        ? valueRight
        : valueLeft;
    setScalarParameterValue(parameterId, clamp01(nextValue));
  };

  const setEyeBlinkLayerValue = (leftValue, rightValue, options = {}) => {
    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    const durationMs = Number.isFinite(options.durationMs)
      ? Math.max(0, options.durationMs)
      : BLINK_LAYER_MANUAL_DURATION_MS;
    blinkLayer = {
      ...blinkLayer,
      mode: 'manual',
      valueLeft: clamp01(leftValue),
      valueRight: clamp01(rightValue),
      manualUntilMs: now + durationMs,
    };
    ensureLoop();
  };

  const applyBlinkLayer = (timestamp) => {
    if (!runtime) {
      return;
    }

    const blinkParameterIds = getBlinkParameterIds().filter(
      isBlinkParameterWritable,
    );
    if (blinkParameterIds.length === 0) {
      blinkLayer = {
        ...blinkLayer,
        activeParameterIds: [],
      };
      return;
    }

    const useManual =
      blinkLayer.mode === 'manual' && timestamp <= blinkLayer.manualUntilMs;
    const nextLeft = useManual
      ? blinkLayer.valueLeft
      : resolveBlinkValue(timestamp);
    const nextRight = useManual
      ? blinkLayer.valueRight
      : resolveBlinkValue(timestamp);

    for (const parameterId of blinkParameterIds) {
      markParameterSource(
        parameterId,
        `blink:${useManual ? 'manual' : 'auto'}`,
      );
      setBlinkParameterValue(parameterId, nextLeft, nextRight);
    }

    blinkLayer = {
      ...blinkLayer,
      mode: useManual ? 'manual' : 'auto',
      valueLeft: nextLeft,
      valueRight: nextRight,
      activeParameterIds: blinkParameterIds,
    };

    if (canvas) {
      canvas.dataset.inochi2dBlinkLayer = `${blinkLayer.mode}:${nextLeft.toFixed(3)},${nextRight.toFixed(3)}`;
    }
  };

  const getVisemePose = (viseme) =>
    MOUTH_VISEME_POSES[viseme] ?? MOUTH_VISEME_POSES.a;

  const resolveLipSyncPose = (openAmount, viseme) => {
    const open = clamp01(openAmount);
    const restPose = MOUTH_VISEME_POSES.neutral;
    const targetPose = getVisemePose(viseme);
    return [
      restPose[0] + (targetPose[0] - restPose[0]) * open,
      restPose[1] + (targetPose[1] - restPose[1]) * open,
    ];
  };

  const setLipSyncLayerValue = (value, options = {}) => {
    const nextOpen = clamp01(value);
    const nextViseme =
      typeof options.viseme === 'string' &&
      Object.prototype.hasOwnProperty.call(MOUTH_VISEME_POSES, options.viseme)
        ? options.viseme
        : lipSyncLayer.viseme;

    lipSyncLayer = {
      ...lipSyncLayer,
      targetOpen: nextOpen,
      currentOpen: options.immediate ? nextOpen : lipSyncLayer.currentOpen,
      viseme: nextOpen > LIP_SYNC_CLOSE_EPSILON ? nextViseme : 'neutral',
      active: nextOpen > LIP_SYNC_CLOSE_EPSILON || !options.immediate,
    };

    if (options.immediate) {
      lipSyncLayer.pose = resolveLipSyncPose(
        lipSyncLayer.currentOpen,
        lipSyncLayer.viseme,
      );
      if (runtime && parameterById.has(MOUTH_SHAPE_PARAMETER_ID)) {
        markParameterSource(
          MOUTH_SHAPE_PARAMETER_ID,
          `lip-sync:${lipSyncLayer.viseme}`,
        );
        setParameterVectorValue(
          MOUTH_SHAPE_PARAMETER_ID,
          lipSyncLayer.pose[0],
          lipSyncLayer.pose[1],
        );
      }
      if (canvas) {
        canvas.dataset.inochi2dMouthShape = `${lipSyncLayer.pose[0].toFixed(3)},${lipSyncLayer.pose[1].toFixed(3)}`;
        canvas.dataset.inochi2dLipSyncLayer = lipSyncLayer.active
          ? lipSyncLayer.viseme
          : 'idle';
      }
    }
    ensureLoop();
  };

  const normalizeExpressionValues = (values) => {
    if (!values || typeof values !== 'object') {
      return {};
    }

    return Object.fromEntries(
      Object.entries(values).filter(([, value]) => {
        if (Number.isFinite(value)) {
          return true;
        }
        return (
          Array.isArray(value) &&
          Number.isFinite(value[0]) &&
          (value.length < 2 || Number.isFinite(value[1]))
        );
      }),
    );
  };

  const setExpressionLayerValue = (name, values, options = {}) => {
    resetExpressionParameters(expressionLayer.appliedParameterIds);
    const normalizedValues = normalizeExpressionValues(values);
    const weight = clamp01(
      Number.isFinite(options.weight) ? options.weight : 1,
    );
    expressionLayer = {
      name:
        typeof name === 'string' && name.trim() ? name.trim() : 'expression',
      weight,
      values: normalizedValues,
      active: weight > 0 && Object.keys(normalizedValues).length > 0,
      allowMouth: options.allowMouth === true,
      appliedParameterIds: [],
      blockedParameterIds: [],
    };
    applyExpressionLayer();
    ensureLoop();
  };

  const listExpressionPresetNames = () => Object.keys(EXPRESSION_PRESETS);

  const getExpressionPresetValues = (preset) => ({
    ...(preset.values ?? {}),
    ...(preset.faceValues ?? {}),
    ...(preset.mouthValues ?? {}),
  });

  const setExpressionPresetValue = (presetName, options = {}) => {
    const preset =
      typeof presetName === 'string' ? EXPRESSION_PRESETS[presetName] : null;
    if (!preset) {
      throw new Error(`Unknown Inochi2D expression preset: ${presetName}`);
    }

    if (presetName === 'neutral') {
      clearExpressionLayerValue();
      return;
    }

    setExpressionLayerValue(
      `preset:${presetName}`,
      getExpressionPresetValues(preset),
      options,
    );
  };

  const clearExpressionLayerValue = (name) => {
    if (name && expressionLayer.name && name !== expressionLayer.name) {
      return;
    }
    resetExpressionParameters(expressionLayer.appliedParameterIds);
    expressionLayer = {
      name: null,
      weight: 0,
      values: {},
      active: false,
      allowMouth: false,
      appliedParameterIds: [],
      blockedParameterIds: [],
    };
    if (canvas) {
      canvas.dataset.inochi2dExpressionLayer = 'none';
      canvas.dataset.inochi2dExpressionMouthOwnership = 'none';
    }
    ensureLoop();
  };

  const applyLipSyncLayer = (deltaTimeMs) => {
    if (!runtime || !parameterById.has(MOUTH_SHAPE_PARAMETER_ID)) {
      return;
    }

    const targetOpen = lipSyncLayer.targetOpen;
    const currentOpen = lipSyncLayer.currentOpen;
    const smoothingMs =
      targetOpen > currentOpen ? LIP_SYNC_ATTACK_MS : LIP_SYNC_RELEASE_MS;
    const mix =
      smoothingMs <= 0
        ? 1
        : Math.min(1, Math.max(0, deltaTimeMs / smoothingMs));
    const nextOpen = currentOpen + (targetOpen - currentOpen) * mix;
    const shouldRemainActive =
      targetOpen > LIP_SYNC_CLOSE_EPSILON ||
      nextOpen > LIP_SYNC_CLOSE_EPSILON ||
      lipSyncLayer.active;

    if (!shouldRemainActive) {
      return;
    }

    const pose = resolveLipSyncPose(nextOpen, lipSyncLayer.viseme);
    lipSyncLayer = {
      ...lipSyncLayer,
      currentOpen: nextOpen,
      active:
        targetOpen > LIP_SYNC_CLOSE_EPSILON ||
        nextOpen > LIP_SYNC_CLOSE_EPSILON,
      pose,
    };
    setParameterVectorValue(MOUTH_SHAPE_PARAMETER_ID, pose[0], pose[1]);
    markParameterSource(
      MOUTH_SHAPE_PARAMETER_ID,
      `lip-sync:${lipSyncLayer.viseme}`,
    );

    if (canvas) {
      canvas.dataset.inochi2dMouthShape = `${pose[0].toFixed(3)},${pose[1].toFixed(3)}`;
      canvas.dataset.inochi2dLipSyncLayer = lipSyncLayer.active
        ? lipSyncLayer.viseme
        : 'idle';
    }
  };

  const rebuildAnimationLibrary = (payload, motionPayload = null) => {
    const parameters = Array.isArray(payload?.param) ? payload.param : [];
    parameterByUuid = new Map();
    parameterById = new Map();

    for (const parameter of parameters) {
      if (!parameter || typeof parameter.name !== 'string') {
        continue;
      }

      const defaults = Array.isArray(parameter.defaults)
        ? parameter.defaults
        : [0, 0];
      const definition = {
        id: parameter.name,
        isVec2: Boolean(parameter.is_vec2),
        defaultValue: [
          Number.isFinite(defaults[0]) ? defaults[0] : 0,
          Number.isFinite(defaults[1]) ? defaults[1] : 0,
        ],
      };

      parameterByUuid.set(Number(parameter.uuid), definition);
      parameterById.set(definition.id, definition);
    }

    const animations =
      motionPayload?.animations ?? motionPayload ?? payload?.animations ?? {};

    animationLibrary = new Map(
      Object.entries(animations).map(([name, animation]) => [
        name,
        compileAnimation(normalizeAnimation(animation), parameterByUuid),
      ]),
    );
    partOpacityDefaults = new Map();
    for (const animation of animationLibrary.values()) {
      for (const lane of animation.lanes ?? []) {
        if (!lane.partOpacity) {
          continue;
        }
        partOpacityDefaults.set(
          lane.partOpacity.nodeName,
          lane.partOpacity.defaultOpacity,
        );
      }
    }
    activeAnimation = null;
    activeAnimationParameterIds = new Set();
    motionLayerDebugState = createMotionLayerDebugState();
    motionDebugHistory = [];
    parameterSourceById = new Map();
    parameterOwnerById = new Map();
  };

  const getAnimationParameterIds = (animation) => {
    const parameterIds = new Set();
    for (const lane of animation?.lanes ?? []) {
      if (lane.parameter) {
        parameterIds.add(lane.parameter.id);
      }
    }
    return parameterIds;
  };

  const resetAnimationParameters = (parameterIds) => {
    if (!runtime) {
      return [];
    }

    const resetParameterIds = [];
    for (const parameterId of parameterIds) {
      if (parameterValues.has(parameterId)) {
        continue;
      }

      const parameter = parameterById.get(parameterId);
      if (!parameter) {
        continue;
      }

      if (parameter.isVec2) {
        markParameterSource(parameterId, 'animation:reset');
        setParameterVectorValue(
          parameterId,
          parameter.defaultValue[0],
          parameter.defaultValue[1],
        );
      } else {
        markParameterSource(parameterId, 'animation:reset');
        setScalarParameterValue(parameterId, parameter.defaultValue[0]);
      }
      resetParameterIds.push(parameterId);
    }
    return resetParameterIds;
  };

  const getParameterTransitionValue = (parameterId) => {
    const parameter = parameterById.get(parameterId);
    if (!parameter) {
      return null;
    }

    const runtimeValue = lastRuntimeParameterValues.get(parameterId);
    if (parameter.isVec2) {
      return {
        isVec2: true,
        value: runtimeValue
          ? [...runtimeValue]
          : (vectorParameterValues.get(parameterId) ?? [
              parameter.defaultValue[0],
              parameter.defaultValue[1],
            ]),
      };
    }

    return {
      isVec2: false,
      value:
        runtimeValue?.[0] ??
        parameterValues.get(parameterId) ??
        parameter.defaultValue[0],
    };
  };

  const createAnimationTransition = (nextAnimationParameterIds, durationMs) => {
    const normalizedDurationMs = Math.max(0, durationMs);
    if (normalizedDurationMs <= 0) {
      return null;
    }

    const scalarValues = new Map();
    const vectorValues = new Map();
    const transitionParameterIds = new Set([
      ...activeAnimationParameterIds,
      ...nextAnimationParameterIds,
    ]);

    for (const parameterId of transitionParameterIds) {
      if (MOUTH_PARAMETER_ID_RE.test(parameterId)) {
        continue;
      }

      const transitionValue = getParameterTransitionValue(parameterId);
      if (!transitionValue) {
        continue;
      }

      if (transitionValue.isVec2) {
        vectorValues.set(parameterId, [...transitionValue.value]);
      } else {
        scalarValues.set(parameterId, transitionValue.value);
      }
    }

    return {
      durationMs: normalizedDurationMs,
      scalarValues,
      vectorValues,
      cameraMotionOffset: { ...cameraMotionOffset },
      nodeMotionOffsets: new Map(
        [...nodeMotionOffsets.entries()].map(([nodeName, offset]) => [
          nodeName,
          { ...offset },
        ]),
      ),
      partOpacityValues: new Map(partOpacityValues),
      parameterIds: transitionParameterIds,
    };
  };

  const applyAnimationTransition = (
    transition,
    progress,
    scalarValues,
    vectorValues,
    nextCameraMotionOffset,
    nextNodeMotionOffsets,
    nextPartOpacityValues,
  ) => {
    if (!transition) {
      return;
    }

    for (const [parameterId, fromValue] of transition.scalarValues.entries()) {
      const parameter = parameterById.get(parameterId);
      const toValue = scalarValues.has(parameterId)
        ? scalarValues.get(parameterId)
        : (parameter?.defaultValue?.[0] ?? 0);
      scalarValues.set(parameterId, lerp(fromValue, toValue, progress));
    }

    for (const [parameterId, fromValue] of transition.vectorValues.entries()) {
      const parameter = parameterById.get(parameterId);
      const toValue = vectorValues.get(parameterId) ?? [
        parameter?.defaultValue?.[0] ?? 0,
        parameter?.defaultValue?.[1] ?? 0,
      ];
      vectorValues.set(parameterId, [
        lerp(fromValue[0], toValue[0], progress),
        lerp(fromValue[1], toValue[1], progress),
      ]);
    }

    nextCameraMotionOffset.x = lerp(
      transition.cameraMotionOffset.x,
      nextCameraMotionOffset.x,
      progress,
    );
    nextCameraMotionOffset.y = lerp(
      transition.cameraMotionOffset.y,
      nextCameraMotionOffset.y,
      progress,
    );
    nextCameraMotionOffset.scale = lerp(
      transition.cameraMotionOffset.scale,
      nextCameraMotionOffset.scale,
      progress,
    );

    for (const [
      nodeName,
      fromOffset,
    ] of transition.nodeMotionOffsets.entries()) {
      const toOffset = nextNodeMotionOffsets.get(nodeName) ?? {
        x: 0,
        y: 0,
        rz: 0,
      };
      nextNodeMotionOffsets.set(nodeName, {
        x: lerp(fromOffset.x, toOffset.x, progress),
        y: lerp(fromOffset.y, toOffset.y, progress),
        rz: lerp(fromOffset.rz, toOffset.rz, progress),
      });
    }

    for (const [
      nodeName,
      fromOpacity,
    ] of transition.partOpacityValues.entries()) {
      const fallbackOpacity = partOpacityDefaults.get(nodeName) ?? 1;
      const toOpacity = nextPartOpacityValues.has(nodeName)
        ? nextPartOpacityValues.get(nodeName)
        : fallbackOpacity;
      nextPartOpacityValues.set(
        nodeName,
        clamp01(lerp(fromOpacity, toOpacity, progress)),
      );
    }
  };

  const resetCameraMotionOffset = () => {
    cameraMotionOffset = {
      x: 0,
      y: 0,
      scale: 0,
    };
    applyCameraTransform();
  };

  const resolveNodeHandle = (nodeName) => {
    if (!runtime || typeof runtime.resolve_node_handle_by_name !== 'function') {
      return null;
    }

    if (nodeHandleByName.has(nodeName)) {
      return nodeHandleByName.get(nodeName);
    }

    try {
      const handle = runtime.resolve_node_handle_by_name(nodeName);
      nodeHandleByName.set(nodeName, handle);
      return handle;
    } catch {
      nodeHandleByName.set(nodeName, null);
      return null;
    }
  };

  const resolveParameterHandle = (parameterId) => {
    if (
      !runtime ||
      typeof runtime.resolve_parameter_handle_by_name !== 'function'
    ) {
      return null;
    }

    if (parameterHandleById.has(parameterId)) {
      return parameterHandleById.get(parameterId);
    }

    try {
      const handle = runtime.resolve_parameter_handle_by_name(parameterId);
      parameterHandleById.set(parameterId, handle);
      return handle;
    } catch {
      unresolvedParameterHandleIds.add(parameterId);
      parameterHandleById.set(parameterId, null);
      return null;
    }
  };

  const setParameterVectorValue = (parameterId, valueX, valueY) => {
    if (!runtime) {
      return;
    }

    if (shouldSkipParameterWrite(parameterId, valueX, valueY)) {
      if (performanceProfiler.enabled) {
        parameterWriteSkipsThisFrame += 1;
      }
      return;
    }

    lastRuntimeParameterValues.set(parameterId, [valueX, valueY]);

    if (performanceProfiler.enabled) {
      parameterWritesThisFrame += 1;
    }

    const parameterHandle = resolveParameterHandle(parameterId);
    if (
      parameterHandle !== null &&
      typeof runtime.set_parameter_vec2_by_handle === 'function'
    ) {
      runtime.set_parameter_vec2_by_handle(parameterHandle, valueX, valueY);
    } else {
      runtime.set_parameter_vec2(parameterId, valueX, valueY);
    }
  };

  const setPostPhysicsParameterVectorValue = (parameterId, valueX, valueY) => {
    if (!runtime) {
      return;
    }

    const parameterHandle = resolveParameterHandle(parameterId);
    if (
      parameterHandle !== null &&
      typeof runtime.set_post_physics_parameter_vec2_by_handle === 'function'
    ) {
      runtime.set_post_physics_parameter_vec2_by_handle(
        parameterHandle,
        valueX,
        valueY,
      );
    } else {
      runtime.set_post_physics_parameter_vec2(parameterId, valueX, valueY);
    }
  };

  const mergeNodeMotionOffsets = () => {
    const mergedNodeMotionOffsets = new Map(nodeMotionOffsets);
    for (const [
      nodeName,
      secondaryOffset,
    ] of secondaryNodeMotionOffsets.entries()) {
      if (!mergedNodeMotionOffsets.has(nodeName)) {
        mergedNodeMotionOffsets.set(nodeName, secondaryOffset);
      }
    }
    return mergedNodeMotionOffsets;
  };

  const writeNodeMotionOffsets = (nextAppliedNodeMotionOffsets) => {
    if (!runtime) {
      appliedNodeMotionOffsets = nextAppliedNodeMotionOffsets;
      return;
    }

    const nodeNames = new Set([
      ...appliedNodeMotionOffsets.keys(),
      ...nextAppliedNodeMotionOffsets.keys(),
    ]);

    for (const nodeName of nodeNames) {
      const offset = nextAppliedNodeMotionOffsets.get(nodeName) ?? {
        x: 0,
        y: 0,
        rz: 0,
      };
      const nodeHandle = resolveNodeHandle(nodeName);
      if (
        nodeHandle !== null &&
        typeof runtime.set_post_physics_transform_offset_by_handle ===
          'function'
      ) {
        runtime.set_post_physics_transform_offset_by_handle(
          nodeHandle,
          offset.x,
          offset.y,
          offset.rz,
          1,
          1,
        );
      } else {
        runtime.set_post_physics_transform_offset_by_name(
          nodeName,
          offset.x,
          offset.y,
          offset.rz,
          1,
          1,
        );
      }
    }

    appliedNodeMotionOffsets = nextAppliedNodeMotionOffsets;
  };

  const flushNodeMotionOffsets = () => {
    writeNodeMotionOffsets(mergeNodeMotionOffsets());
  };

  const applyNodeMotionOffsets = (nextNodeMotionOffsets) => {
    nodeMotionOffsets = nextNodeMotionOffsets;
    flushNodeMotionOffsets();
  };

  const applySecondaryNodeMotionOffsets = (nextSecondaryNodeMotionOffsets) => {
    secondaryNodeMotionOffsets = nextSecondaryNodeMotionOffsets;
    flushNodeMotionOffsets();
  };

  const resetNodeMotionOffsets = () => {
    applyNodeMotionOffsets(new Map());
  };

  const resetSecondaryNodeMotionOffsets = () => {
    applySecondaryNodeMotionOffsets(new Map());
  };

  const applyPartOpacityValues = (nextPartOpacityValues) => {
    if (!runtime) {
      partOpacityValues = nextPartOpacityValues;
      return;
    }

    const nodeNames = new Set([
      ...partOpacityValues.keys(),
      ...nextPartOpacityValues.keys(),
    ]);

    for (const nodeName of nodeNames) {
      const fallbackOpacity = partOpacityDefaults.get(nodeName) ?? 1;
      const opacity = clamp01(
        nextPartOpacityValues.get(nodeName) ?? fallbackOpacity,
      );
      const nodeHandle = resolveNodeHandle(nodeName);
      if (
        nodeHandle !== null &&
        typeof runtime.set_part_opacity_by_handle === 'function'
      ) {
        runtime.set_part_opacity_by_handle(nodeHandle, opacity);
      } else {
        runtime.set_part_opacity_by_name(nodeName, opacity);
      }
    }

    partOpacityValues = nextPartOpacityValues;
  };

  const resetPartOpacityValues = () => {
    applyPartOpacityValues(new Map(partOpacityDefaults));
  };

  const normalizeAnimationNames = (animationNames) =>
    Array.isArray(animationNames)
      ? [
          ...new Set(
            animationNames
              .filter((name) => typeof name === 'string')
              .map((name) => name.trim())
              .filter((name) => animationLibrary.has(name)),
          ),
        ]
      : [];

  const pickAnimationName = (animationNames, previousAnimationName = null) => {
    const names = normalizeAnimationNames(animationNames);
    if (names.length === 0) {
      return null;
    }
    if (names.length === 1) {
      return names[0];
    }

    const candidates = names.filter((name) => name !== previousAnimationName);
    return candidates[Math.floor(Math.random() * candidates.length)];
  };

  const shuffleAnimationNames = (animationNames) => {
    const names = normalizeAnimationNames(animationNames);
    for (let index = names.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [names[index], names[swapIndex]] = [names[swapIndex], names[index]];
    }
    return names;
  };

  const getIdleAnimationProfile = (animationName) =>
    idleAnimationProfiles.get(animationName) ?? { type: 'base', weight: 1 };

  const getIdleAnimationCooldownMs = (animationName) => {
    const profile = getIdleAnimationProfile(animationName);
    return Number.isFinite(profile.cooldownMs)
      ? profile.cooldownMs
      : profile.type === 'rareGesture'
        ? DEFAULT_RARE_IDLE_GESTURE_COOLDOWN_MS
        : 0;
  };

  const canPlayIdleAnimationName = (animationName, now) => {
    const profile = getIdleAnimationProfile(animationName);
    if (profile.type !== 'rareGesture') {
      return true;
    }
    return (
      now - lastRareIdleGestureTimestampMs >=
      getIdleAnimationCooldownMs(animationName)
    );
  };

  const expandWeightedIdleAnimationNames = (animationNames, now) => {
    const names = normalizeAnimationNames(animationNames).filter((name) =>
      canPlayIdleAnimationName(name, now),
    );
    const expanded = [];
    for (const name of names) {
      const profile = getIdleAnimationProfile(name);
      const weight = Math.max(
        1,
        Math.min(
          6,
          Math.round(Number.isFinite(profile.weight) ? profile.weight : 1),
        ),
      );
      for (let index = 0; index < weight; index += 1) {
        expanded.push(name);
      }
    }
    return expanded.length > 0
      ? expanded
      : normalizeAnimationNames(animationNames);
  };

  const pickQueuedIdleAnimationName = () => {
    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    const names = expandWeightedIdleAnimationNames(idleAnimationNames, now);
    if (names.length === 0) {
      idleAnimationQueue = [];
      return null;
    }

    if (idleAnimationQueue.length === 0) {
      idleAnimationQueue = shuffleAnimationNames(names);
      if (
        idleAnimationQueue.length > 1 &&
        idleAnimationQueue[0] === lastIdleAnimationName
      ) {
        idleAnimationQueue.push(idleAnimationQueue.shift());
      }
    }

    const nextName = idleAnimationQueue.shift();
    if (!nextName || !animationLibrary.has(nextName)) {
      idleAnimationQueue = [];
      return pickAnimationName(names, lastIdleAnimationName);
    }
    return nextName;
  };

  const startAnimation = (animationName, options = {}) => {
    const animation = animationLibrary.get(animationName);
    if (!animation) {
      throw new Error(`Unknown Inochi2D animation: ${animationName}`);
    }

    if (activeAnimation && options.restart === false) {
      return;
    }

    const nextAnimationParameterIds = getAnimationParameterIds(animation);
    const kind = options.kind ?? 'manual';
    const transitionDurationMs =
      typeof options.transitionMs === 'number' &&
      Number.isFinite(options.transitionMs)
        ? options.transitionMs
        : kind === 'idle'
          ? DEFAULT_IDLE_ANIMATION_TRANSITION_MS
          : kind === 'reaction'
            ? DEFAULT_REACTION_ANIMATION_TRANSITION_MS
            : 0;
    const transition = createAnimationTransition(
      nextAnimationParameterIds,
      transitionDurationMs,
    );

    const previousAnimation = activeAnimation
      ? {
          name: activeAnimation.name,
          kind: activeAnimation.kind,
          parameterIds: [...activeAnimationParameterIds],
        }
      : null;
    const sharedParameterIds = previousAnimation
      ? [...nextAnimationParameterIds].filter((parameterId) =>
          activeAnimationParameterIds.has(parameterId),
        )
      : [];
    let resetParameterIds = [];

    if (!transition) {
      resetParameterIds = resetAnimationParameters(activeAnimationParameterIds);
      resetCameraMotionOffset();
      resetNodeMotionOffsets();
      resetPartOpacityValues();
    }

    activeAnimation = {
      name: animationName,
      kind,
      loop: options.loop === true,
      startedAtMs:
        typeof performance !== 'undefined' ? performance.now() : Date.now(),
      weight: Number.isFinite(options.weight) ? options.weight : 1,
      transition,
      playbackWeight: 0,
    };
    activeAnimationParameterIds = transition
      ? new Set([...nextAnimationParameterIds, ...transition.parameterIds])
      : nextAnimationParameterIds;
    if (canvas) {
      canvas.dataset.inochi2dAnimation = animationName;
      canvas.dataset.inochi2dAnimationKind = activeAnimation.kind;
      canvas.dataset.inochi2dAnimationTransition = transition
        ? String(Math.round(transition.durationMs))
        : '0';
      canvas.dataset.inochi2dAnimationTouchedParameters = String(
        activeAnimationParameterIds.size,
      );
    }
    motionLayerDebugState = {
      ...motionLayerDebugState,
      lastSwitch: {
        from: previousAnimation
          ? {
              name: previousAnimation.name,
              kind: previousAnimation.kind,
              parameterCount: previousAnimation.parameterIds.length,
            }
          : null,
        to: {
          name: animationName,
          kind,
          parameterCount: nextAnimationParameterIds.size,
        },
        transitionMs: transition?.durationMs ?? 0,
        sharedParameterIds,
        resetParameterIds,
      },
      lastReset: resetParameterIds.length
        ? {
            reason: 'animation-switch-without-transition',
            parameterIds: resetParameterIds,
          }
        : motionLayerDebugState.lastReset,
    };
    pushMotionDebugHistory({
      type: 'switch',
      ...motionLayerDebugState.lastSwitch,
    });
    ensureLoop();
  };

  const playNextIdleAnimation = () => {
    const nextAnimationName = pickQueuedIdleAnimationName();
    if (!nextAnimationName) {
      return false;
    }

    lastIdleAnimationName = nextAnimationName;
    const idleProfile = getIdleAnimationProfile(nextAnimationName);
    if (idleProfile.type === 'rareGesture') {
      lastRareIdleGestureTimestampMs =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
    }
    startAnimation(nextAnimationName, {
      kind: 'idle',
      loop: false,
      restart: true,
    });
    if (canvas) {
      canvas.dataset.inochi2dIdleAnimationType = idleProfile.type ?? 'base';
    }
    return true;
  };

  const applyActiveAnimation = (timestamp) => {
    if (!runtime || !activeAnimation) {
      return new Set();
    }

    const animation = animationLibrary.get(activeAnimation.name);
    if (!animation) {
      const resetParameterIds = resetAnimationParameters(
        activeAnimationParameterIds,
      );
      motionLayerDebugState = {
        ...motionLayerDebugState,
        lastReset: {
          reason: 'missing-animation',
          parameterIds: resetParameterIds,
        },
      };
      activeAnimation = null;
      activeAnimationParameterIds = new Set();
      resetCameraMotionOffset();
      resetNodeMotionOffsets();
      resetPartOpacityValues();
      return new Set();
    }

    const timestepMs = Math.max(1, animation.timestep * 1000);
    const frameCount = Math.max(1, animation.length);
    const elapsedMs = Math.max(0, timestamp - activeAnimation.startedAtMs);
    const elapsedFrames = elapsedMs / timestepMs;

    const reachedEnd = !activeAnimation.loop && elapsedFrames >= frameCount - 1;

    const frame = activeAnimation.loop
      ? elapsedFrames % frameCount
      : Math.min(elapsedFrames, frameCount - 1);
    const playbackWeight = clamp01(
      activeAnimation.weight * getAnimationPlaybackWeight(animation, frame),
    );
    activeAnimation.playbackWeight = playbackWeight;
    const scalarValues = new Map();
    const vectorValues = new Map();
    const nextCameraMotionOffset = {
      x: 0,
      y: 0,
      scale: 0,
    };
    let hasCameraMotion = false;
    const nextNodeMotionOffsets = new Map();
    let hasNodeMotion = false;
    const nextPartOpacityValues = new Map();
    let hasPartOpacity = false;
    const touchedParameterIds = new Set();

    for (const lane of animation.lanes) {
      const rawValue = evaluateLane(lane, frame);
      if (rawValue === undefined) {
        continue;
      }

      if (lane.cameraMotionChannel) {
        hasCameraMotion = true;
        nextCameraMotionOffset[lane.cameraMotionChannel] =
          rawValue * playbackWeight;
        continue;
      }

      if (lane.nodeMotion) {
        hasNodeMotion = true;
        const offset = nextNodeMotionOffsets.get(lane.nodeMotion.nodeName) ?? {
          x: 0,
          y: 0,
          rz: 0,
        };
        offset[lane.nodeMotion.channel] = rawValue * playbackWeight;
        nextNodeMotionOffsets.set(lane.nodeMotion.nodeName, offset);
        continue;
      }

      if (lane.partOpacity) {
        hasPartOpacity = true;
        nextPartOpacityValues.set(lane.partOpacity.nodeName, clamp01(rawValue));
        continue;
      }

      if (lane.effect) {
        continue;
      }

      const parameter = lane.parameter;
      if (!parameter) {
        continue;
      }

      touchedParameterIds.add(parameter.id);
      const value = rawValue * playbackWeight;
      if (parameter.isVec2) {
        const vectorValue = vectorValues.get(parameter.id) ?? [
          ...parameter.defaultValue,
        ];
        vectorValue[lane.target === 1 ? 1 : 0] = value;
        vectorValues.set(parameter.id, vectorValue);
      } else {
        scalarValues.set(parameter.id, value);
      }
    }

    const transition = activeAnimation.transition;
    if (transition) {
      const transitionProgress = smoothStep(
        transition.durationMs > 0 ? elapsedMs / transition.durationMs : 1,
      );
      motionLayerDebugState = {
        ...motionLayerDebugState,
        transition: {
          animation: activeAnimation.name,
          kind: activeAnimation.kind,
          progress: transitionProgress,
          durationMs: transition.durationMs,
          parameterIds: [...transition.parameterIds],
        },
      };
      applyAnimationTransition(
        transition,
        transitionProgress,
        scalarValues,
        vectorValues,
        nextCameraMotionOffset,
        nextNodeMotionOffsets,
        nextPartOpacityValues,
      );
      hasCameraMotion =
        hasCameraMotion ||
        transition.cameraMotionOffset.x !== 0 ||
        transition.cameraMotionOffset.y !== 0 ||
        transition.cameraMotionOffset.scale !== 0;
      hasNodeMotion = hasNodeMotion || transition.nodeMotionOffsets.size > 0;
      hasPartOpacity = hasPartOpacity || transition.partOpacityValues.size > 0;
      if (transitionProgress >= 1) {
        activeAnimation.transition = null;
        activeAnimationParameterIds = getAnimationParameterIds(animation);
        motionLayerDebugState = {
          ...motionLayerDebugState,
          transition: null,
        };
        if (canvas) {
          canvas.dataset.inochi2dAnimationTransition = '0';
        }
      }
    }

    const animationSource = `animation:${activeAnimation.kind}:${activeAnimation.name}`;
    for (const [parameterId, value] of scalarValues.entries()) {
      markParameterSource(parameterId, animationSource);
      setScalarParameterValue(parameterId, value);
    }
    for (const [parameterId, value] of vectorValues.entries()) {
      markParameterSource(parameterId, animationSource);
      setParameterVectorValue(parameterId, value[0], value[1]);
    }

    if (
      hasCameraMotion ||
      cameraMotionOffset.x !== 0 ||
      cameraMotionOffset.y !== 0 ||
      cameraMotionOffset.scale !== 0
    ) {
      cameraMotionOffset = nextCameraMotionOffset;
      applyCameraTransform();
    }

    applyAnimationMotionDriver(
      vectorValues,
      scalarValues,
      nextCameraMotionOffset,
      timestamp,
    );

    if (hasNodeMotion || nodeMotionOffsets.size > 0) {
      applyNodeMotionOffsets(nextNodeMotionOffsets);
    }

    if (hasPartOpacity || partOpacityValues.size > 0) {
      applyPartOpacityValues(nextPartOpacityValues);
    }

    if (reachedEnd) {
      const completedAnimation = {
        name: activeAnimation.name,
        kind: activeAnimation.kind,
        touchedParameterIds: [...touchedParameterIds],
      };
      const completedAnimationKind = activeAnimation?.kind;
      const completedAnimationParameterIds = new Set(
        activeAnimationParameterIds,
      );
      const shouldBlendToNextIdle =
        completedAnimationKind === 'idle' ||
        completedAnimationKind === 'reaction';
      const continuedToIdle = shouldBlendToNextIdle
        ? playNextIdleAnimation()
        : false;
      const resetParameterIds = continuedToIdle
        ? []
        : resetAnimationParameters(completedAnimationParameterIds);

      if (!continuedToIdle) {
        activeAnimation = null;
        activeAnimationParameterIds = new Set();
        resetCameraMotionOffset();
        resetNodeMotionOffsets();
        resetPartOpacityValues();
        if (canvas) {
          delete canvas.dataset.inochi2dAnimation;
          delete canvas.dataset.inochi2dAnimationKind;
          delete canvas.dataset.inochi2dAnimationTransition;
          delete canvas.dataset.inochi2dAnimationTouchedParameters;
        }
      }
      motionLayerDebugState = {
        ...motionLayerDebugState,
        transition: continuedToIdle ? motionLayerDebugState.transition : null,
        lastCompletedAnimation: completedAnimation,
        lastReset: continuedToIdle
          ? motionLayerDebugState.lastReset
          : {
              reason: 'animation-completed',
              parameterIds: resetParameterIds,
            },
      };
      pushMotionDebugHistory({
        type: 'complete',
        ...completedAnimation,
        resetParameterIds,
        continuedToIdle,
      });
      secondaryMotionDriver = sampleAnimationMotionDriver();
      secondaryMotionDriverTimestamp = timestamp;
    }

    motionLayerDebugState = {
      ...motionLayerDebugState,
      touchedParameterIds: [...touchedParameterIds],
    };
    return touchedParameterIds;
  };

  const tick = (timestamp) => {
    rafId = 0;
    if (!mounted || !runtime) {
      return;
    }
    if (
      typeof lastTickTimestamp === 'number' &&
      timestamp - lastTickTimestamp < RUNTIME_TICK_MIN_INTERVAL_MS
    ) {
      rafId = requestAnimationFrame(tick);
      return;
    }

    const frameStart = performanceProfiler.enabled ? getPerformanceNow() : 0;
    parameterWritesThisFrame = 0;
    parameterWriteSkipsThisFrame = 0;
    performanceSectionsThisFrame = new Map();
    parameterSourceById = new Map();
    parameterOwnerById = new Map();
    try {
      const deltaTimeMs =
        typeof lastTickTimestamp === 'number'
          ? Math.max(0, timestamp - lastTickTimestamp)
          : 16.67;
      const deltaTimeSeconds = Math.min(0.05, deltaTimeMs / 1000);
      lastTickTimestamp = timestamp;
      measurePerformanceSection('activeAnimation', () =>
        applyActiveAnimation(timestamp),
      );
      measurePerformanceSection('baseParameters', () =>
        applyParameters(activeAnimationParameterIds),
      );
      measurePerformanceSection('expressionLayer', () =>
        applyExpressionLayer(),
      );
      measurePerformanceSection('gazeLayer', () => applyGazeLayer(timestamp));
      measurePerformanceSection('blinkLayer', () => applyBlinkLayer(timestamp));
      measurePerformanceSection('lipSyncLayer', () =>
        applyLipSyncLayer(deltaTimeMs),
      );
      measurePerformanceSection('speechSecondaryDriver', () =>
        applySpeechSecondaryMotionDriver(),
      );
      measurePerformanceSection('mouthSafety', () => applyMouthSafetyProfile());
      measurePerformanceSection('secondaryStep', () =>
        secondaryMotion.step(deltaTimeSeconds),
      );
      measurePerformanceSection('secondaryWrites', () => applyMotionState());
      measurePerformanceSection('runtimeTick', () => {
        runtime.tick(timestamp);
        recordRuntimeProfileSummary();
      });
      recordFrameCadence(timestamp);
      if (isVerboseDebugActive()) {
        const shouldUpdateVerboseDebugDataset =
          timestamp - lastVerboseDebugDatasetUpdateMs >=
          DEBUG_DATASET_UPDATE_INTERVAL_MS;
        const nextActiveLayers = getActiveLayerDebugEntries();
        motionLayerDebugState = {
          ...motionLayerDebugState,
          activeLayers: nextActiveLayers,
          parameterSources: shouldUpdateVerboseDebugDataset
            ? Object.fromEntries(parameterSourceById.entries())
            : motionLayerDebugState.parameterSources,
          parameterOwners: shouldUpdateVerboseDebugDataset
            ? Object.fromEntries(parameterOwnerById.entries())
            : motionLayerDebugState.parameterOwners,
        };
        if (canvas) {
          canvas.dataset.inochi2dActiveLayers = String(nextActiveLayers.length);
          canvas.dataset.inochi2dTouchedParameters = String(
            motionLayerDebugState.touchedParameterIds.length,
          );
          if (shouldUpdateVerboseDebugDataset) {
            canvas.dataset.inochi2dAnimationTouchedParameterIds =
              motionLayerDebugState.touchedParameterIds.join(',');
            canvas.dataset.inochi2dUnresolvedParameterHandles = [
              ...unresolvedParameterHandleIds,
            ].join(',');
            lastVerboseDebugDatasetUpdateMs = timestamp;
          }
        }
      } else {
        motionLayerDebugState = {
          ...motionLayerDebugState,
          activeLayers: [],
          parameterSources: {},
          parameterOwners: {},
        };
      }
      if (performanceProfiler.enabled) {
        recordPerformanceFrame(getPerformanceNow() - frameStart, deltaTimeMs);
      }
      if (canvas) {
        delete canvas.dataset.inochi2dTickError;
      }
    } catch (error) {
      console.error('[Inochi2D bridge] animation tick failed', error);
      if (canvas) {
        canvas.dataset.inochi2dTickError =
          error instanceof Error ? error.message : String(error);
      }
    } finally {
      if (mounted && runtime) {
        rafId = requestAnimationFrame(tick);
      }
    }
  };

  const ensureLoop = () => {
    if (!mounted || !runtime || rafId) {
      return;
    }
    rafId = requestAnimationFrame(tick);
  };

  const applyResize = () => {
    if (!runtime) {
      return;
    }
    runtime.resize(width, height, devicePixelRatio);
  };

  const applyParameters = (excludedParameterIds = new Set()) => {
    if (!runtime) {
      return;
    }

    for (const [parameterId, value] of parameterValues.entries()) {
      if (excludedParameterIds.has(parameterId)) {
        continue;
      }
      markParameterSource(parameterId, 'base');
      setScalarParameterValue(parameterId, value);
    }
    for (const [parameterId, value] of vectorParameterValues.entries()) {
      if (excludedParameterIds.has(parameterId)) {
        continue;
      }
      markParameterSource(parameterId, 'base');
      setParameterVectorValue(parameterId, value[0], value[1]);
    }
  };

  const updateCanvasCameraDataset = (
    actualCameraTransform = cameraTransform,
  ) => {
    if (!canvas) {
      return;
    }

    canvas.dataset.inochi2dCameraScale = actualCameraTransform.scale.toFixed(4);
    canvas.dataset.inochi2dCameraX = actualCameraTransform.x.toFixed(2);
    canvas.dataset.inochi2dCameraY = actualCameraTransform.y.toFixed(2);
  };

  const applyCameraTransform = () => {
    const actualCameraTransform = {
      x: cameraTransform.x + cameraMotionOffset.x,
      y: cameraTransform.y + cameraMotionOffset.y,
      scale: clampScale(cameraTransform.scale + cameraMotionOffset.scale),
    };

    if (!runtime) {
      updateCanvasCameraDataset(actualCameraTransform);
      return;
    }

    runtime.set_camera_transform(
      actualCameraTransform.x,
      actualCameraTransform.y,
      actualCameraTransform.scale,
    );
    updateCanvasCameraDataset(actualCameraTransform);
  };

  if (debugEnabled) {
    console.info('[Inochi2D bridge] loading wasm runtime', { wasmUrl });
  }

  const resetMotion = ({ kickOnLoad = false } = {}) => {
    lastTickTimestamp = null;
    secondaryMotion.reset({ kickOnLoad });
    secondaryMotionDriver = sampleAnimationMotionDriver();
    secondaryMotionDriverTimestamp =
      typeof performance !== 'undefined' ? performance.now() : Date.now();
    speechSecondaryMotionDriver = {
      open: lipSyncLayer.currentOpen,
      impulseX: 0,
      impulseY: 0,
      active: false,
    };
    applyMotionState();
  };

  const setScalarParameterValue = (parameterId, value) => {
    if (!runtime) {
      return;
    }

    const parameter = parameterById.get(parameterId);
    setParameterVectorValue(
      parameterId,
      value,
      parameter?.defaultValue?.[1] ?? 0,
    );
  };

  const pushInteractionImpulse = (deltaX, deltaY) => {
    const horizontalDelta = Math.abs(deltaX) >= Math.abs(deltaY) ? deltaX : 0;
    const verticalDelta = Math.abs(deltaX) >= Math.abs(deltaY) ? deltaY : 0;
    secondaryMotion.inject(horizontalDelta, verticalDelta);
    ensureLoop();
  };

  return {
    async mount(nextCanvas) {
      canvas = nextCanvas;
      mounted = true;
      runtime = new Inochi2dRuntime(nextCanvas);
      resetMotion();
      canvas.dataset.inochi2dRuntime = 'inox2d-wasm-webgl2';
      canvas.dataset.inochi2dIdleMode = 'procedural-blink-secondary-motion';
      canvas.dataset.inochi2dProfiler = performanceProfiler.enabled
        ? 'enabled'
        : 'disabled';
      resetFrameCadenceDataset();
      applyResize();
      applyParameters();
      applyCameraTransform();
      ensureLoop();
    },
    async unmount() {
      mounted = false;
      cancelLoop();
      activeAnimation = null;
      activeAnimationParameterIds = new Set();
      motionLayerDebugState = createMotionLayerDebugState();
      motionDebugHistory = [];
      parameterSourceById = new Map();
      parameterOwnerById = new Map();
      resetMotion();
      clearExpressionLayerValue();
      runtime?.clear();
      blinkLayer = {
        mode: 'auto',
        valueLeft: 0,
        valueRight: 0,
        manualUntilMs: 0,
        activeParameterIds: [],
      };
      gazeLayer = {
        mode: 'auto',
        x: 0,
        y: 0,
        activeParameterIds: [],
      };
      lipSyncLayer = {
        targetOpen: 0,
        currentOpen: 0,
        viseme: 'neutral',
        active: false,
        pose: [...MOUTH_VISEME_POSES.neutral],
      };
      nodeHandleByName = new Map();
      parameterHandleById = new Map();
      unresolvedParameterHandleIds = new Set();
      lastRuntimeParameterValues = new Map();
      if (canvas) {
        clearVerboseDebugDataset();
        delete canvas.dataset.inochi2dRuntime;
        delete canvas.dataset.inochi2dIdleMode;
        delete canvas.dataset.inochi2dAnimation;
        delete canvas.dataset.inochi2dAnimationTransition;
        delete canvas.dataset.inochi2dModelStatus;
        delete canvas.dataset.inochi2dCameraScale;
        delete canvas.dataset.inochi2dCameraX;
        delete canvas.dataset.inochi2dCameraY;
        delete canvas.dataset.inochi2dDevicePixelRatio;
        delete canvas.dataset.inochi2dExpressionLayer;
        delete canvas.dataset.inochi2dProfiler;
        delete canvas.dataset.inochi2dFrameCount;
        delete canvas.dataset.inochi2dLastFrameTs;
        delete canvas.dataset.inochi2dPerfFrameMs;
        delete canvas.dataset.inochi2dPerfDeltaMs;
        delete canvas.dataset.inochi2dPerfParameterWrites;
        delete canvas.dataset.inochi2dPerfParameterWriteSkips;
        delete canvas.dataset.inochi2dActiveLayers;
        delete canvas.dataset.inochi2dTouchedParameters;
        delete canvas.dataset.inochi2dAnimationTouchedParameters;
        delete canvas.dataset.inochi2dAnimationTouchedParameterIds;
        delete canvas.dataset.inochi2dUnresolvedParameterHandles;
      }
      runtime = null;
      canvas = null;
    },
    async loadModel(modelUrl, motionUrl) {
      if (!runtime) {
        throw new Error('Inochi2D runtime is not mounted.');
      }

      const response = await fetch(modelUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch Inochi2D model (${response.status} ${response.statusText}).`,
        );
      }

      const modelBytes = new Uint8Array(await response.arrayBuffer());
      const puppetPayload = decodePuppetPayload(modelBytes);
      const motionPayload = await loadMotionPayload(motionUrl);
      rebuildAnimationLibrary(puppetPayload, motionPayload);
      nodeHandleByName = new Map();
      parameterHandleById = new Map();
      unresolvedParameterHandleIds = new Set();
      nodeMotionOffsets = new Map();
      secondaryNodeMotionOffsets = new Map();
      appliedNodeMotionOffsets = new Map();
      partOpacityValues = new Map();
      lastRuntimeParameterValues = new Map();
      motionLayerDebugState = createMotionLayerDebugState();
      motionDebugHistory = [];
      parameterSourceById = new Map();
      parameterOwnerById = new Map();
      gazeLayer = {
        mode: 'auto',
        x: 0,
        y: 0,
        activeParameterIds: [],
      };
      clearExpressionLayerValue();
      performanceProfiler = createPerformanceProfilerState(
        performanceProfiler.enabled,
      );
      resetMotion();
      try {
        runtime.load_model(modelBytes);
      } catch (error) {
        if (canvas) {
          canvas.dataset.inochi2dModelStatus = 'error';
        }
        if (modelUrl.toLowerCase().endsWith('.inx')) {
          throw new Error(
            `${error instanceof Error ? error.message : String(error)} Exporting the model as .inp from Inochi Creator is recommended for browser use.`,
          );
        }
        throw error;
      }

      if (canvas) {
        canvas.dataset.inochi2dModelStatus = 'loaded';
      }
      resetFrameCadenceDataset();
      setLipSyncLayerValue(0, {
        viseme: 'neutral',
        immediate: true,
      });
      resetPartOpacityValues();
      resetMotion({ kickOnLoad: true });
      applyCameraTransform();
      applyParameters();
      ensureLoop();
    },
    getAnimationNames() {
      return [...animationLibrary.keys()];
    },
    getDebugState() {
      const activeAnimationSummary = activeAnimation
        ? {
            name: activeAnimation.name,
            kind: activeAnimation.kind,
            loop: activeAnimation.loop,
            weight: activeAnimation.playbackWeight ?? activeAnimation.weight,
            transitionMs: activeAnimation.transition?.durationMs ?? 0,
          }
        : null;
      const baseDebugState = {
        debugEnabled,
        profilerEnabled: performanceProfiler.enabled,
        mounted,
        hasRuntime: Boolean(runtime),
        canvasSize: {
          width,
          height,
          devicePixelRatio,
        },
        activeAnimation: activeAnimationSummary,
        cameraTransform: { ...cameraTransform },
        blinkLayer: { ...blinkLayer },
        gazeLayer: { ...gazeLayer },
        lipSyncLayer: { ...lipSyncLayer },
        expressionLayer: { ...expressionLayer },
        performanceProfiler: {
          enabled: performanceProfiler.enabled,
          frames: performanceProfiler.frames,
          avgFrameMs: performanceProfiler.avgFrameMs,
          maxFrameMs: performanceProfiler.maxFrameMs,
          avgDeltaMs: performanceProfiler.avgDeltaMs,
          maxDeltaMs: performanceProfiler.maxDeltaMs,
        },
        canvasDataset: canvas ? { ...canvas.dataset } : {},
      };

      if (!isVerboseDebugActive()) {
        return baseDebugState;
      }

      return {
        ...baseDebugState,
        activeAnimationParameterIds: [...activeAnimationParameterIds],
        scalarParameterValues: Object.fromEntries(parameterValues.entries()),
        vectorParameterValues: Object.fromEntries(
          vectorParameterValues.entries(),
        ),
        cameraMotionOffset: { ...cameraMotionOffset },
        nodeMotionOffsets: Object.fromEntries(nodeMotionOffsets.entries()),
        secondaryNodeMotionOffsets: Object.fromEntries(
          secondaryNodeMotionOffsets.entries(),
        ),
        appliedNodeMotionOffsets: Object.fromEntries(
          appliedNodeMotionOffsets.entries(),
        ),
        partOpacityValues: Object.fromEntries(partOpacityValues.entries()),
        speechSecondaryMotionDriver: { ...speechSecondaryMotionDriver },
        motionLayers: {
          ...motionLayerDebugState,
          activeLayers: [...motionLayerDebugState.activeLayers],
          touchedParameterIds: [...motionLayerDebugState.touchedParameterIds],
          parameterSources: { ...motionLayerDebugState.parameterSources },
          parameterOwners: { ...motionLayerDebugState.parameterOwners },
          history: [...motionDebugHistory],
        },
        performanceProfiler: {
          ...performanceProfiler,
          sections: { ...performanceProfiler.sections },
        },
        frameSnapshot:
          typeof runtime?.get_frame_snapshot_summary === 'function'
            ? runtime.get_frame_snapshot_summary()
            : null,
        secondaryMotion: {
          physics: secondaryMotion.getState('physics'),
          hair: secondaryMotion.getState('hair'),
          hairFront: secondaryMotion.getState('hairFront'),
          hairSideLeft: secondaryMotion.getState('hairSideLeft'),
          hairSideRight: secondaryMotion.getState('hairSideRight'),
          hairBackLeft: secondaryMotion.getState('hairBackLeft'),
          hairBackRight: secondaryMotion.getState('hairBackRight'),
          cloth: secondaryMotion.getState('cloth'),
          hip: secondaryMotion.getState('hip'),
          leg: secondaryMotion.getState('leg'),
          foot: secondaryMotion.getState('foot'),
          accessory: secondaryMotion.getState('accessory'),
          tail: secondaryMotion.getState('tail'),
          driver: secondaryMotionDriver ? { ...secondaryMotionDriver } : null,
        },
        idleAnimationNames: [...idleAnimationNames],
        idleAnimationProfiles: Object.fromEntries(
          idleAnimationProfiles.entries(),
        ),
        lastRareIdleGestureTimestampMs,
        reactionAnimationGroups: Object.fromEntries(
          reactionAnimationGroups.entries(),
        ),
        emotionAnimationGroups: Object.fromEntries(
          emotionAnimationGroups.entries(),
        ),
        canvasDataset: canvas ? { ...canvas.dataset } : {},
      };
    },
    playAnimation(animationName, options = {}) {
      startAnimation(animationName, {
        ...options,
        kind: options.kind ?? 'manual',
        loop: options.loop !== false,
      });
    },
    configureAnimationGroups(groups = {}) {
      idleAnimationNames = normalizeAnimationNames(groups.idleAnimations);
      idleAnimationProfiles = new Map(
        Object.entries(groups.idleAnimationProfiles ?? {})
          .map(([animationName, profile]) => [
            animationName.trim(),
            {
              type:
                profile?.type === 'attention' ||
                profile?.type === 'emotion' ||
                profile?.type === 'rareGesture'
                  ? profile.type
                  : 'base',
              cooldownMs:
                typeof profile?.cooldownMs === 'number' &&
                Number.isFinite(profile.cooldownMs) &&
                profile.cooldownMs >= 0
                  ? profile.cooldownMs
                  : undefined,
              weight:
                typeof profile?.weight === 'number' &&
                Number.isFinite(profile.weight) &&
                profile.weight > 0
                  ? profile.weight
                  : 1,
            },
          ])
          .filter(([animationName]) => animationName.length > 0),
      );
      idleAnimationQueue = [];
      lastReactionAnimationName = null;
      lastEmotionAnimationName = null;
      reactionAnimationGroups = new Map(
        Object.entries(groups.reactionAnimations ?? {})
          .map(([reactionName, animationNames]) => [
            reactionName,
            normalizeAnimationNames(animationNames),
          ])
          .filter(([, animationNames]) => animationNames.length > 0),
      );
      emotionAnimationGroups = new Map(
        Object.entries(groups.emotionAnimations ?? {})
          .map(([emotionName, animationNames]) => [
            emotionName,
            normalizeAnimationNames(animationNames),
          ])
          .filter(([, animationNames]) => animationNames.length > 0),
      );
    },
    playIdleAnimations(animationNames, options = {}) {
      idleAnimationNames = normalizeAnimationNames(animationNames);
      idleAnimationQueue = [];
      lastIdleAnimationName = null;
      if (options.shuffle === false && idleAnimationNames.length > 0) {
        startAnimation(idleAnimationNames[0], {
          kind: 'idle',
          loop: false,
          restart: true,
        });
        lastIdleAnimationName = idleAnimationNames[0];
        return;
      }
      playNextIdleAnimation();
    },
    playReactionAnimation(reactionName) {
      const now =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (now - lastReactionTimestampMs < 1200) {
        return;
      }

      const animationName = pickAnimationName(
        reactionAnimationGroups.get(reactionName) ?? [],
        lastReactionAnimationName,
      );
      if (!animationName) {
        return;
      }

      lastReactionTimestampMs = now;
      lastReactionAnimationName = animationName;
      startAnimation(animationName, {
        kind: 'reaction',
        loop: false,
        restart: true,
      });
    },
    playEmotionAnimation(emotionName) {
      const now =
        typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (now - lastEmotionTimestampMs < 900) {
        return;
      }

      const animationName = pickAnimationName(
        emotionAnimationGroups.get(emotionName) ??
          emotionAnimationGroups.get('neutral') ??
          [],
        lastEmotionAnimationName,
      );
      if (!animationName) {
        return;
      }

      lastEmotionTimestampMs = now;
      lastEmotionAnimationName = animationName;
      startAnimation(animationName, {
        kind: 'emotion',
        loop: false,
        restart: true,
      });
    },
    stopAnimation(animationName) {
      if (animationName && activeAnimation?.name !== animationName) {
        return;
      }

      const resetParameterIds = resetAnimationParameters(
        activeAnimationParameterIds,
      );
      resetCameraMotionOffset();
      resetNodeMotionOffsets();
      resetPartOpacityValues();
      activeAnimation = null;
      activeAnimationParameterIds = new Set();
      motionLayerDebugState = {
        ...motionLayerDebugState,
        transition: null,
        lastReset: {
          reason: 'stop-animation',
          parameterIds: resetParameterIds,
        },
      };
      pushMotionDebugHistory({
        type: 'stop',
        animationName,
        resetParameterIds,
      });
      if (canvas) {
        delete canvas.dataset.inochi2dAnimation;
        delete canvas.dataset.inochi2dAnimationKind;
        delete canvas.dataset.inochi2dAnimationTransition;
      }
    },
    async setParameter(parameterId, value) {
      parameterValues.set(parameterId, value);
      vectorParameterValues.delete(parameterId);
      setScalarParameterValue(parameterId, value);
    },
    async setParameterVector(parameterId, valueX, valueY) {
      parameterValues.delete(parameterId);
      vectorParameterValues.set(parameterId, [valueX, valueY]);
      if (canvas && parameterId === 'Mouth:: Shape') {
        canvas.dataset.inochi2dMouthShape = `${valueX.toFixed(3)},${valueY.toFixed(3)}`;
      }
      setParameterVectorValue(parameterId, valueX, valueY);
    },
    async setPostPhysicsParameterVector(parameterId, valueX, valueY) {
      setPostPhysicsParameterVectorValue(parameterId, valueX, valueY);
    },
    async setEyeBlinkValue(valueLeft, valueRight = valueLeft, options = {}) {
      setEyeBlinkLayerValue(valueLeft, valueRight, options);
    },
    async setLipSyncValue(value, options = {}) {
      setLipSyncLayerValue(value, options);
    },
    async setExpressionLayer(name, values, options = {}) {
      setExpressionLayerValue(name, values, options);
    },
    async setExpressionPreset(name, options = {}) {
      setExpressionPresetValue(name, options);
    },
    getExpressionPresetNames() {
      return listExpressionPresetNames();
    },
    async setPerformanceProfilerEnabled(enabled) {
      setPerformanceProfilerEnabled(enabled);
    },
    getPerformanceProfilerState() {
      return {
        ...performanceProfiler,
        sections: { ...performanceProfiler.sections },
      };
    },
    async clearExpressionLayer(name) {
      clearExpressionLayerValue(name);
    },
    async applyInteractionImpulse(deltaX, deltaY) {
      pushInteractionImpulse(deltaX, deltaY);
    },
    async nudgeInteraction(deltaX, deltaY) {
      pushInteractionImpulse(deltaX, deltaY);
    },
    async setCameraTransform(x, y, scale) {
      cameraTransform.x = Number.isFinite(x) ? x : 0;
      cameraTransform.y = Number.isFinite(y) ? y : 0;
      cameraTransform.scale = clampScale(
        Number.isFinite(scale) ? scale : DEFAULT_CAMERA_SCALE,
      );
      applyCameraTransform();
    },
    async resize(nextWidth, nextHeight, nextDevicePixelRatio) {
      width = Math.max(1, nextWidth);
      height = Math.max(1, nextHeight);
      devicePixelRatio = Math.max(1, nextDevicePixelRatio || 1);

      if (canvas) {
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        canvas.dataset.inochi2dDevicePixelRatio = devicePixelRatio.toFixed(3);
      }

      applyResize();
      applyCameraTransform();
    },
  };
};
