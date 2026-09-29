// Keyframed motions. Each track is [[time(s), value], ...] and is interpolated with a
// smooth cubic curve. Head/body/eye-direction tracks are ADDED on top of whatever the
// current mode is doing (idle, mouse follow); face tracks REPLACE the expression.
// The result still goes through the parameter springs, which adds follow-through.

export const ADDITIVE = new Set([
  'ParamAngleX', 'ParamAngleY', 'ParamAngleZ', 'ParamBodyAngleX', 'ParamBodyAngleZ',
  'ParamArmAngle', 'ParamHandAngle', 'ParamEyeBallX', 'ParamEyeBallY',
]);

export const MOTIONS = {
  nod: {
    label: 'うなずき', dur: 1.7,
    tracks: {
      ParamAngleY: [[0, 0], [0.32, -13], [0.62, 2], [0.95, -9], [1.3, 1], [1.7, 0]],
      ParamAngleZ: [[0, 0], [0.4, -2], [1.0, -1], [1.7, 0]],
      ParamBodyAngleX: [[0, 0], [0.5, -1.5], [1.7, 0]],
      ParamEyeSmile: [[0, 0], [0.3, 0.45], [1.3, 0.45], [1.7, 0]],
      eyeOpen: [[0, 1], [0.3, 0.72], [1.3, 0.72], [1.7, 1]],
      ParamMouthOpenY: [[0, 0], [0.3, 0.12], [1.3, 0.12], [1.7, 0]],
      ParamMouthForm: [[0, 0], [0.3, -0.6], [1.7, -0.3]],
    },
  },
  tilt: {
    label: '首かしげ', dur: 2.6,
    tracks: {
      ParamAngleZ: [[0, 0], [0.55, 17], [2.0, 15], [2.6, 0]],
      ParamAngleX: [[0, 0], [0.6, 8], [2.0, 7], [2.6, 0]],
      ParamAngleY: [[0, 0], [0.6, 4], [2.6, 0]],
      ParamBodyAngleZ: [[0, 0], [0.8, 3], [2.0, 3], [2.6, 0]],
      ParamEyeBallX: [[0, 0], [0.4, 0.5], [2.1, 0.4], [2.6, 0]],
      ParamEyeBallY: [[0, 0], [0.4, 0.35], [2.1, 0.3], [2.6, 0]],
      ParamBrowAngle: [[0, 0], [0.5, -0.7], [2.1, -0.6], [2.6, 0]],
      ParamBrowY: [[0, 0], [0.5, 0.35], [2.1, 0.3], [2.6, 0]],
      // closed mouth: a barely open round mouth read as a squashed blob
    },
  },
  think: {
    label: '考えごと', dur: 3.6,
    tracks: {
      ParamAngleX: [[0, 0], [0.7, -11], [3.0, -9], [3.6, 0]],
      ParamAngleY: [[0, 0], [0.7, 9], [3.0, 8], [3.6, 0]],
      ParamAngleZ: [[0, 0], [0.8, 6], [3.0, 5], [3.6, 0]],
      ParamEyeBallX: [[0, 0], [0.35, -0.8], [3.1, -0.7], [3.6, 0]],
      ParamEyeBallY: [[0, 0], [0.35, 0.7], [3.1, 0.6], [3.6, 0]],
      ParamHandAngle: [[0, 0], [0.6, 3], [3.0, 3], [3.6, 0]],
      ParamFingerTap: [[0, 0], [0.9, 0], [1.05, 1], [1.2, 0], [1.4, 1], [1.55, 0], [1.75, 1], [1.9, 0],
        [2.3, 0], [2.45, 1], [2.6, 0], [3.6, 0]],
      ParamBrowY: [[0, 0], [0.6, 0.25], [3.0, 0.2], [3.6, 0]],
      ParamBrowAngle: [[0, 0], [0.6, -0.3], [3.0, -0.3], [3.6, 0]],
      ParamMouthForm: [[0, 0], [0.6, 0.4], [3.6, 0]],
    },
  },
  giggle: {
    label: 'くすっと笑う', dur: 2.2,
    tracks: {
      eyeOpen: [[0, 1], [0.2, 0], [1.8, 0], [2.2, 1]],
      ParamEyeSmile: [[0, 0], [0.2, 1], [1.8, 1], [2.2, 0]],
      ParamMouthOpenY: [[0, 0], [0.2, 0.5], [0.45, 0.32], [0.7, 0.55], [0.95, 0.34], [1.2, 0.5], [1.8, 0.3], [2.1, 0]],
      ParamMouthForm: [[0, 0], [0.2, -0.8], [2.2, -0.2]],
      ParamCheek: [[0, 0], [0.3, 0.7], [1.8, 0.7], [2.2, 0.1]],
      ParamAngleY: [[0, 0], [0.2, -5], [0.45, -1], [0.7, -6], [0.95, -2], [1.2, -5], [1.6, -2], [2.2, 0]],
      ParamAngleZ: [[0, 0], [0.3, -6], [1.8, -5], [2.2, 0]],
      ParamBodyAngleZ: [[0, 0], [0.25, 2], [0.5, -1], [0.75, 2], [1.0, -1], [1.3, 1.5], [2.2, 0]],
      ParamBrowY: [[0, 0], [0.3, 0.3], [1.8, 0.3], [2.2, 0]],
    },
  },
  surprise: {
    label: 'びっくり', dur: 2.0,
    tracks: {
      ParamAngleY: [[0, 0], [0.12, 10], [0.5, 6], [1.5, 5], [2.0, 0]],
      ParamAngleX: [[0, 0], [0.12, -4], [2.0, 0]],
      ParamBodyAngleX: [[0, 0], [0.15, -4], [1.5, -3], [2.0, 0]],
      eyeOpen: [[0, 1], [0.1, 1.25], [1.5, 1.2], [2.0, 1]],
      ParamBrowY: [[0, 0], [0.1, 1], [1.5, 0.9], [2.0, 0]],
      ParamMouthOpenY: [[0, 0], [0.12, 0.6], [1.4, 0.45], [2.0, 0]],
      ParamMouthForm: [[0, 0], [0.12, 0.6], [1.5, 0.55], [2.0, 0]],   // お
      ParamArmAngle: [[0, 0], [0.15, -4], [1.5, -3], [2.0, 0]],
    },
  },
  shy: {
    label: '照れる', dur: 3.2,
    tracks: {
      ParamAngleX: [[0, 0], [0.6, 14], [2.6, 12], [3.2, 0]],
      ParamAngleY: [[0, 0], [0.6, -9], [2.6, -8], [3.2, 0]],
      ParamAngleZ: [[0, 0], [0.7, -8], [2.6, -7], [3.2, 0]],
      ParamEyeBallX: [[0, 0], [0.3, 0.8], [1.6, 0.8], [1.9, -0.3], [2.2, 0.8], [2.8, 0.6], [3.2, 0]],
      ParamEyeBallY: [[0, 0], [0.3, -0.5], [2.8, -0.4], [3.2, 0]],
      eyeOpen: [[0, 1], [0.5, 0.75], [2.7, 0.75], [3.2, 1]],
      ParamEyeSmile: [[0, 0], [0.5, 0.5], [2.7, 0.5], [3.2, 0]],
      ParamCheek: [[0, 0], [0.8, 1], [2.7, 1], [3.2, 0]],
      ParamBrowAngle: [[0, 0], [0.5, -0.6], [2.7, -0.5], [3.2, 0]],
      ParamMouthForm: [[0, 0], [0.5, -0.4], [3.2, 0]],
      ParamHandAngle: [[0, 0], [0.8, 4], [2.6, 4], [3.2, 0]],
    },
  },
  no: {
    label: 'いやいや', dur: 1.9,
    tracks: {
      ParamAngleX: [[0, 0], [0.2, 13], [0.45, -13], [0.7, 12], [0.95, -10], [1.2, 5], [1.5, 0]],
      ParamAngleY: [[0, 0], [0.2, -3], [1.3, -3], [1.9, 0]],
      ParamBodyAngleX: [[0, 0], [0.3, 1.5], [0.6, -1.5], [0.9, 1], [1.3, 0]],
      eyeOpen: [[0, 1], [0.15, 0], [1.4, 0], [1.9, 1]],
      ParamEyeSmile: [[0, 0], [0.15, 1], [1.4, 1], [1.9, 0]],
      // closed mouth while shaking the head
      ParamBrowAngle: [[0, 0], [0.2, -0.5], [1.4, -0.5], [1.9, 0]],
    },
  },
  wink: {
    label: 'ウインク', dur: 2.0,
    tracks: {
      ParamAngleZ: [[0, 0], [0.35, -13], [1.5, -12], [2.0, 0]],
      ParamAngleX: [[0, 0], [0.35, 9], [1.5, 8], [2.0, 0]],
      ParamBodyAngleZ: [[0, 0], [0.5, -2], [1.5, -2], [2.0, 0]],
      eyeOpenL: [[0, 1], [0.25, 1], [0.4, 0], [1.4, 0], [1.6, 1]],
      eyeSmileL: [[0, 0], [0.3, 1], [1.5, 1], [1.7, 0]],
      ParamMouthOpenY: [[0, 0], [2.0, 0]],   // wink with a closed smile
      ParamMouthForm: [[0, 0], [0.35, -0.8], [2.0, 0]],
      ParamCheek: [[0, 0], [0.4, 0.5], [1.6, 0.5], [2.0, 0]],
    },
  },
  greet: {
    label: 'ごあいさつ', dur: 2.6,
    tracks: {
      ParamAngleY: [[0, 0], [0.7, -18], [1.2, -17], [1.9, 2], [2.6, 0]],
      ParamBodyAngleX: [[0, 0], [0.8, 2], [1.8, 0]],
      ParamBodyAngleZ: [[0, 0], [0.8, 1.5], [2.0, 0]],
      ParamArmAngle: [[0, 0], [0.8, 3], [2.0, 0]],
      eyeOpen: [[0, 1], [0.5, 0], [1.4, 0], [1.8, 1]],
      ParamEyeSmile: [[0, 0], [0.5, 1], [1.6, 1], [2.3, 0.4], [2.6, 0]],
      ParamMouthOpenY: [[0, 0], [1.6, 0], [1.8, 0.3], [2.3, 0.2], [2.6, 0]],
      ParamMouthForm: [[0, 0], [1.6, -0.8], [2.6, -0.3]],
      ParamCheek: [[0, 0], [1.6, 0.3], [2.6, 0]],
    },
  },
};

// Idle motions: every one moves several parameters at once (breath, head, body, arm,
// gaze, lids, brows) so the whole figure takes part, like a Live2D idle.
// Eyes only go down to ~0.55 open and the mouth stays shut (a single image fakes those worst).
// ParamBreath tracks replace the automatic breathing while the motion plays.
export const IDLE_MOTIONS = {
  lookAround: {
    label: 'きょろきょろ', dur: 5.2, idle: true,
    tracks: {
      ParamEyeBallX: [[0, 0], [0.25, -0.85], [1.5, -0.8], [1.8, 0.1], [2.1, 0.85], [3.4, 0.8], [3.7, 0], [5.2, 0]],
      ParamEyeBallY: [[0, 0], [0.25, 0.15], [1.8, 0.25], [2.1, 0.1], [3.7, 0], [5.2, 0]],
      ParamAngleX: [[0, 0], [0.7, -20], [1.6, -18], [2.5, 19], [3.5, 17], [4.4, 0], [5.2, 0]],
      ParamAngleY: [[0, 0], [0.7, 3], [1.8, 5], [2.5, 3], [4.4, 0]],
      ParamAngleZ: [[0, 0], [0.8, 4], [1.8, 0], [2.6, -4], [4.4, 0]],
      ParamBodyAngleX: [[0, 0], [1.0, -4], [2.8, 4], [4.6, 0]],
      ParamBodyAngleZ: [[0, 0], [1.0, 1.5], [2.8, -1.5], [4.6, 0]],
      ParamHandAngle: [[0, 0], [1.0, -2], [2.8, 2], [4.6, 0]],
      ParamBrowY: [[0, 0], [0.5, 0.35], [3.6, 0.3], [4.4, 0]],
      // curious: a quick inhale, held while looking, let out at the end
      ParamBreath: [[0, 0.2], [0.6, 0.85], [3.6, 0.7], [4.6, 0], [5.2, 0.1]],
    },
  },
  glance: {
    label: 'ふと横を見る', dur: 4.6, idle: true,
    tracks: {
      ParamEyeBallX: [[0, 0], [0.18, 0.9], [2.6, 0.85], [2.9, 0.15], [3.2, 0], [4.6, 0]],
      ParamEyeBallY: [[0, 0], [0.18, 0.4], [2.6, 0.35], [3.2, 0]],
      ParamAngleX: [[0, 0], [0.6, 13], [2.6, 11], [3.6, 0]],
      ParamAngleY: [[0, 0], [0.6, 6], [2.6, 5], [3.6, 0]],
      ParamAngleZ: [[0, 0], [0.7, -5], [2.6, -4], [3.6, 0]],
      ParamBodyAngleX: [[0, 0], [1.0, 2.5], [2.8, 2], [4.0, 0]],
      eyeOpen: [[0, 1], [0.3, 1.06], [2.5, 1.05], [2.8, 0.85], [3.4, 1]],
      ParamBrowY: [[0, 0], [0.4, 0.4], [2.5, 0.35], [3.4, 0]],
      ParamBrowAngle: [[0, 0], [0.4, -0.2], [2.5, -0.2], [3.4, 0]],
      ParamBreath: [[0, 0], [0.5, 0.6], [2.6, 0.55], [3.8, 0], [4.6, 0.3]],
    },
  },
  sway: {
    label: 'ゆらゆら', dur: 7.0, idle: true,
    tracks: {
      ParamBodyAngleZ: [[0, 0], [1.6, 6], [3.4, -6], [5.2, 5], [7.0, 0]],
      ParamBodyAngleX: [[0, 0], [1.6, 3], [3.4, -3], [5.2, 2.5], [7.0, 0]],
      ParamAngleZ: [[0, 0], [1.8, -10], [3.6, 10], [5.4, -8], [7.0, 0]],
      ParamAngleX: [[0, 0], [1.8, 6], [3.6, -6], [5.4, 5], [7.0, 0]],
      ParamAngleY: [[0, 0], [0.9, 3], [1.8, 0], [2.7, 3], [3.6, 0], [4.5, 3], [5.4, 0], [7.0, 0]],
      ParamArmAngle: [[0, 0], [1.6, 3], [3.4, -3], [5.2, 2], [7.0, 0]],
      ParamHandAngle: [[0, 0], [1.8, -4], [3.6, 4], [5.4, -3], [7.0, 0]],
      ParamEyeBallX: [[0, 0], [1.8, -0.3], [3.6, 0.3], [5.4, -0.2], [7.0, 0]],
      eyeOpen: [[0, 1], [0.8, 0.82], [6.2, 0.82], [7.0, 1]],
      ParamEyeSmile: [[0, 0], [0.8, 0.35], [6.2, 0.35], [7.0, 0]],
      // slow, even breaths in time with the sway
      ParamBreath: [[0, 0], [0.9, 1], [1.8, 0], [2.7, 1], [3.6, 0], [4.5, 1], [5.4, 0], [6.3, 0.8], [7.0, 0]],
    },
  },
  sigh: {
    label: 'ひと息', dur: 5.6, idle: true,
    tracks: {
      ParamBreath: [[0, 0], [1.3, 1.25], [1.9, 1.25], [3.6, 0], [5.6, 0]],
      ParamAngleY: [[0, 0], [1.3, 9], [1.9, 9], [3.3, -9], [4.6, -6], [5.6, 0]],
      ParamAngleZ: [[0, 0], [1.3, -3], [3.3, 5], [5.6, 0]],
      ParamBodyAngleX: [[0, 0], [1.3, -2.5], [3.3, 2.5], [5.6, 0]],
      ParamBodyAngleZ: [[0, 0], [1.9, 1], [3.3, -1.5], [5.6, 0]],
      ParamArmAngle: [[0, 0], [1.3, -2.5], [3.3, 2], [5.6, 0]],
      ParamEyeBallY: [[0, 0], [1.2, 0.4], [2.0, 0.3], [3.2, -0.4], [4.8, -0.2], [5.6, 0]],
      eyeOpen: [[0, 1], [1.0, 0.95], [1.9, 0.6], [3.4, 0.6], [4.6, 0.78], [5.6, 1]],
      ParamBrowY: [[0, 0], [1.3, 0.35], [3.2, -0.2], [5.6, 0]],
      ParamBrowAngle: [[0, 0], [1.9, -0.4], [4.6, -0.35], [5.6, 0]],
    },
  },
  doze: {
    label: 'うとうと', dur: 7.2, idle: true,
    tracks: {
      eyeOpen: [[0, 1], [1.8, 0.78], [3.2, 0.62], [4.5, 0.55], [4.75, 1.1], [5.6, 1.05], [7.2, 1]],
      ParamAngleY: [[0, 0], [1.8, -6], [3.2, -9], [4.5, -17], [4.75, 5], [5.6, 2], [7.2, 0]],
      ParamAngleZ: [[0, 0], [2.0, 4], [4.5, 10], [4.75, -2], [7.2, 0]],
      ParamAngleX: [[0, 0], [4.5, -4], [4.75, 3], [5.4, -6], [6.2, 5], [7.2, 0]],
      ParamBodyAngleZ: [[0, 0], [4.5, 3], [4.8, -2], [7.2, 0]],
      ParamBodyAngleX: [[0, 0], [4.5, 2], [4.8, -1.5], [7.2, 0]],
      ParamArmAngle: [[0, 0], [4.5, 3], [4.8, -2], [7.2, 0]],
      ParamHandAngle: [[0, 0], [4.5, 5], [4.8, -1], [7.2, 0]],
      ParamEyeBallY: [[0, 0], [4.5, -0.4], [4.75, 0.2], [7.2, 0]],
      ParamEyeBallX: [[0, 0], [4.8, 0], [5.3, -0.6], [6.1, 0.6], [6.8, 0]],
      ParamBrowY: [[0, 0], [4.5, -0.35], [4.75, 0.8], [5.8, 0.3], [7.2, 0]],
      // long, slow, deepening breaths; a sharp inhale on waking
      ParamBreath: [[0, 0], [1.1, 0.7], [2.6, 0], [3.8, 0.6], [4.5, 0.2], [4.8, 1.1], [6.0, 0.2], [7.2, 0]],
    },
  },
  stretch: {
    label: '首をのばす', dur: 6.2, idle: true,
    tracks: {
      ParamAngleZ: [[0, 0], [1.3, -22], [2.3, -21], [3.8, 20], [4.8, 19], [6.2, 0]],
      ParamAngleY: [[0, 0], [1.3, 5], [2.3, 7], [3.1, -3], [3.8, 5], [4.8, 6], [6.2, 0]],
      ParamAngleX: [[0, 0], [1.3, -5], [3.8, 5], [6.2, 0]],
      ParamBodyAngleZ: [[0, 0], [1.3, 4], [3.8, -4], [6.2, 0]],
      ParamBodyAngleX: [[0, 0], [1.3, -2], [3.8, 2], [6.2, 0]],
      ParamArmAngle: [[0, 0], [1.3, 2], [3.8, -2], [6.2, 0]],
      eyeOpen: [[0, 1], [0.8, 0.62], [4.9, 0.62], [5.6, 1]],
      ParamBrowAngle: [[0, 0], [1.0, -0.3], [4.9, -0.3], [5.8, 0]],
      ParamBreath: [[0, 0], [1.3, 1.1], [2.3, 0.9], [3.1, 0.2], [3.8, 1.1], [4.8, 0.9], [6.2, 0]],
    },
  },
  lean: {
    label: 'のぞきこむ', dur: 4.8, idle: true,
    tracks: {
      ParamBodyAngleX: [[0, 0], [0.9, 6], [3.4, 6], [4.4, 0]],
      ParamBodyAngleZ: [[0, 0], [0.9, -3], [3.4, -3], [4.4, 0]],
      ParamAngleX: [[0, 0], [0.9, 9], [2.0, 7], [2.6, 10], [3.4, 8], [4.4, 0]],
      ParamAngleY: [[0, 0], [0.9, -6], [3.4, -5], [4.4, 0]],
      ParamAngleZ: [[0, 0], [0.9, 10], [2.2, 12], [3.4, 9], [4.4, 0]],
      ParamArmAngle: [[0, 0], [0.9, -3], [3.4, -3], [4.4, 0]],
      ParamHandAngle: [[0, 0], [0.9, 3], [3.4, 3], [4.4, 0]],
      ParamEyeBallY: [[0, 0], [0.6, 0.45], [3.4, 0.4], [4.2, 0]],
      ParamEyeBallX: [[0, 0], [1.5, 0], [1.8, -0.3], [2.3, 0.2], [2.8, 0], [4.2, 0]],
      eyeOpen: [[0, 1], [0.6, 1.1], [3.4, 1.08], [4.2, 1]],
      ParamBrowY: [[0, 0], [0.6, 0.45], [3.4, 0.4], [4.2, 0]],
      ParamBrowAngle: [[0, 0], [0.6, -0.3], [3.4, -0.3], [4.2, 0]],
      ParamCheek: [[0, 0], [1.2, 0.25], [3.4, 0.25], [4.4, 0]],
      ParamBreath: [[0, 0], [0.8, 0.8], [3.4, 0.6], [4.4, 0], [4.8, 0.2]],
    },
  },
  hum: {
    label: 'ふんふん', dur: 5.6, idle: true,
    tracks: {
      ParamAngleY: [[0, 0], [0.45, -5], [0.9, 2], [1.35, -5], [1.8, 2], [2.25, -5], [2.7, 2], [3.15, -5], [3.6, 2], [4.05, -4], [4.8, 0]],
      ParamAngleZ: [[0, 0], [0.9, 8], [1.8, -8], [2.7, 8], [3.6, -8], [4.6, 0]],
      ParamAngleX: [[0, 0], [0.9, 4], [1.8, -4], [2.7, 4], [3.6, -4], [4.6, 0]],
      ParamBodyAngleZ: [[0, 0], [0.9, -3], [1.8, 3], [2.7, -3], [3.6, 3], [4.6, 0]],
      ParamBodyAngleX: [[0, 0], [1.8, 2], [3.6, -2], [4.8, 0]],
      ParamHandAngle: [[0, 0], [0.9, 3], [1.8, -3], [2.7, 3], [3.6, -3], [4.6, 0]],
      ParamFingerTap: [[0, 0], [0.45, 1], [0.9, 0], [1.35, 1], [1.8, 0], [2.25, 1], [2.7, 0], [3.15, 1], [3.6, 0], [5.6, 0]],
      ParamEyeBallX: [[0, 0], [0.9, 0.3], [1.8, -0.3], [2.7, 0.3], [3.6, -0.3], [4.6, 0]],
      eyeOpen: [[0, 1], [0.4, 0.72], [4.6, 0.72], [5.3, 1]],
      ParamEyeSmile: [[0, 0], [0.4, 0.55], [4.6, 0.55], [5.3, 0]],
      ParamCheek: [[0, 0], [0.8, 0.3], [4.6, 0.3], [5.6, 0]],
      ParamBrowY: [[0, 0], [0.5, 0.25], [4.6, 0.25], [5.4, 0]],
      ParamBreath: [[0, 0], [0.9, 0.9], [1.8, 0.2], [2.7, 0.9], [3.6, 0.2], [4.6, 0.8], [5.6, 0]],
    },
  },
  tap: {
    label: 'とんとん', dur: 5.0, idle: true,
    tracks: {
      ParamEyeBallX: [[0, 0], [0.3, -0.6], [2.2, -0.5], [2.5, -0.1], [2.8, -0.6], [4.2, -0.5], [4.7, 0]],
      ParamEyeBallY: [[0, 0], [0.3, 0.55], [4.2, 0.5], [4.7, 0]],
      ParamAngleX: [[0, 0], [0.8, -11], [2.4, -9], [3.0, -12], [4.2, -10], [5.0, 0]],
      ParamAngleY: [[0, 0], [0.8, 8], [4.2, 7], [5.0, 0]],
      ParamAngleZ: [[0, 0], [0.8, 6], [2.4, 4], [3.0, 7], [4.2, 5], [5.0, 0]],
      ParamBodyAngleX: [[0, 0], [1.0, -2], [4.2, -2], [5.0, 0]],
      ParamHandAngle: [[0, 0], [0.8, 3], [4.2, 3], [5.0, 0]],
      ParamFingerTap: [[0, 0], [0.9, 0], [1.05, 1], [1.2, 0], [1.4, 1], [1.55, 0], [1.75, 1], [1.9, 0],
        [2.6, 0], [2.75, 1], [2.9, 0], [3.1, 1], [3.25, 0], [5.0, 0]],
      ParamBrowY: [[0, 0], [0.6, 0.3], [4.2, 0.25], [5.0, 0]],
      ParamBrowAngle: [[0, 0], [0.6, -0.35], [4.2, -0.3], [5.0, 0]],
      eyeOpen: [[0, 1], [0.6, 0.9], [4.2, 0.9], [5.0, 1]],
      ParamBreath: [[0, 0], [0.8, 0.7], [2.2, 0.4], [3.2, 0.8], [4.4, 0], [5.0, 0.2]],
    },
  },
  readNote: {
    label: '原稿を見る', dur: 2.6, idle: true,
    tracks: {
      // a quick look down at the notes on the desk and back to the camera
      ParamEyeBallY: [[0, 0], [0.2, -0.85], [1.5, -0.8], [1.75, 0], [2.6, 0]],
      ParamEyeBallX: [[0, 0], [0.2, -0.15], [1.5, -0.1], [1.75, 0]],
      ParamAngleY: [[0, 0], [0.45, -9], [1.5, -8], [2.0, 1], [2.6, 0]],
      ParamAngleZ: [[0, 0], [0.5, 2], [1.6, 2], [2.6, 0]],
      eyeOpen: [[0, 1], [0.3, 0.78], [1.5, 0.78], [1.75, 1]],
      ParamBreath: [[0, 0.3], [0.8, 0.5], [1.8, 0.2], [2.6, 0.4]],
    },
  },
  waiting: {
    label: 'そわそわ', dur: 6.4, idle: true,
    tracks: {
      // shifts her weight, checks the viewer, looks away, shifts back
      ParamBodyAngleZ: [[0, 0], [0.9, 5], [2.4, 4], [3.3, -5], [5.2, -4], [6.4, 0]],
      ParamBodyAngleX: [[0, 0], [0.9, 3], [3.3, -3], [5.2, -2], [6.4, 0]],
      ParamAngleZ: [[0, 0], [1.0, -6], [2.4, -4], [3.4, 6], [5.2, 5], [6.4, 0]],
      ParamAngleX: [[0, 0], [1.2, -8], [2.2, 2], [3.6, 12], [5.0, 10], [6.2, 0]],
      ParamAngleY: [[0, 0], [1.2, -3], [2.2, 2], [3.6, -2], [6.2, 0]],
      ParamArmAngle: [[0, 0], [0.9, 3], [3.3, -3], [5.2, -2], [6.4, 0]],
      ParamHandAngle: [[0, 0], [1.2, 3], [3.4, -3], [6.4, 0]],
      ParamFingerTap: [[0, 0], [4.2, 0], [4.35, 1], [4.5, 0], [4.7, 1], [4.85, 0], [6.4, 0]],
      ParamEyeBallX: [[0, 0], [0.9, -0.7], [1.9, -0.6], [2.1, 0], [2.7, 0], [2.9, 0.8], [5.0, 0.7], [5.4, 0], [6.4, 0]],
      ParamEyeBallY: [[0, 0], [0.9, -0.2], [2.1, 0], [2.9, 0.3], [5.4, 0]],
      eyeOpen: [[0, 1], [2.0, 1], [2.2, 1.06], [2.8, 1.05], [3.1, 0.85], [5.4, 0.85], [6.2, 1]],
      ParamBrowAngle: [[0, 0], [0.9, -0.35], [2.0, -0.35], [2.3, 0], [3.1, -0.4], [5.4, -0.35], [6.4, 0]],
      ParamBrowY: [[0, 0], [2.2, 0.4], [2.8, 0.35], [3.2, 0], [6.4, 0]],
      ParamBreath: [[0, 0.3], [0.9, 0.8], [2.0, 0.3], [2.6, 0.9], [3.4, 0.2], [4.4, 0.8], [5.6, 0], [6.4, 0.2]],
    },
  },
  spaceOut: {
    label: 'ぼんやり', dur: 7.4, idle: true,
    tracks: {
      // gaze drifts up and away, breaths get slow and long, one slow blink
      ParamEyeBallX: [[0, 0], [1.4, -0.55], [4.8, -0.6], [5.6, 0.1], [7.0, 0]],
      ParamEyeBallY: [[0, 0], [1.4, 0.6], [4.8, 0.55], [5.6, 0], [7.0, 0]],
      ParamAngleX: [[0, 0], [2.0, -9], [4.8, -10], [6.0, 2], [7.4, 0]],
      ParamAngleY: [[0, 0], [2.0, 7], [4.8, 8], [6.0, -2], [7.4, 0]],
      ParamAngleZ: [[0, 0], [2.0, 9], [4.8, 11], [6.0, 2], [7.4, 0]],
      ParamBodyAngleZ: [[0, 0], [2.2, 3], [4.8, 3.5], [6.4, 0]],
      ParamBodyAngleX: [[0, 0], [2.2, -2], [4.8, -2], [6.4, 0]],
      ParamHandAngle: [[0, 0], [2.2, 4], [4.8, 5], [6.4, 0]],
      ParamArmAngle: [[0, 0], [2.2, 2], [4.8, 2], [6.4, 0]],
      eyeOpen: [[0, 1], [1.4, 0.8], [3.0, 0.8], [3.35, 0.56], [3.8, 0.8], [4.8, 0.8], [5.6, 1.04], [6.4, 1]],
      ParamBrowY: [[0, 0], [1.6, 0.15], [4.8, 0.15], [5.6, 0.35], [6.6, 0]],
      ParamBreath: [[0, 0], [1.6, 0.9], [3.4, 0], [5.0, 0.9], [6.2, 0.1], [7.4, 0]],
    },
  },
};

// Cubic Hermite through the keys (tangents from neighbours, flat at both ends).
export function sampleTrack(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  const n = keys.length - 1;
  if (t >= keys[n][0]) return keys[n][1];
  let i = 0;
  while (t > keys[i + 1][0]) i++;
  const [t0, v0] = keys[i], [t1, v1] = keys[i + 1];
  const tan = j => (j <= 0 || j >= n) ? 0 : (keys[j + 1][1] - keys[j - 1][1]) / (keys[j + 1][0] - keys[j - 1][0]);
  const h = t1 - t0, u = (t - t0) / h;
  const m0 = tan(i) * h, m1 = tan(i + 1) * h;
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * m1;
}
