// Drives parameters: idle ("おまかせ"), mouse follow, blinking, expressions, motions.
import { PARAMS } from './rig.js';
import { MOTIONS, IDLE_MOTIONS, ADDITIVE, sampleTrack } from './motions.js';
import { VOWELS, kanaToMoras, sampleMoras } from './kana.js';

const ALL_MOTIONS = { ...MOTIONS, ...IDLE_MOTIONS };
// scales the head / body / arm tracks of idle motions (they are authored at full size, so 1)
// (gaze, eyes and brows are left alone)
export const IDLE_GAIN = { amp: 1, stiff: 1.8 };
const IDLE_SCALED = /^Param(Angle|BodyAngle|ArmAngle|HandAngle)/;

// motion tracks that replace the expression (the rest are additive or body targets)
const FACE_TRACKS = new Set(['eyeOpen', 'eyeOpenL', 'eyeSmileL', 'ParamEyeSmile', 'ParamMouthOpenY',
  'ParamMouthForm', 'ParamCheek', 'ParamBrowY', 'ParamBrowAngle']);
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// smooth 1D value noise
function noise(t, seed) {
  const i = Math.floor(t), f = t - i;
  const h = n => { const x = Math.sin((n + seed * 57.3) * 127.1) * 43758.5453; return x - Math.floor(x); };
  const u = f * f * (3 - 2 * f);
  return (h(i) * (1 - u) + h(i + 1) * u) * 2 - 1;
}
const fbm = (t, s) => noise(t, s) * 0.7 + noise(t * 2.3, s + 9) * 0.3;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const EXPRESSIONS = {
  normal: { label: 'ふつう', p: {} },
  smile: { label: 'にっこり', p: { eyeOpen: 0, ParamEyeSmile: 1, ParamCheek: 0.35, ParamBrowY: 0.2 } },
  shy: { label: '照れ', p: { eyeOpen: 0.78, ParamEyeSmile: 0.5, ParamCheek: 1, ParamBrowAngle: -0.5, ParamBrowY: -0.1, glance: [0.7, 0.35] } },
  jito: { label: 'ジト目', p: { eyeOpen: 0.5, ParamBrowY: -0.5, ParamBrowAngle: 0.6 } },
  surprise: { label: 'びっくり', p: { eyeOpen: 1.22, ParamBrowY: 1, ParamMouthOpenY: 0.6, ParamMouthForm: 0.6 } },
  wink: { label: 'ウインク', p: { eyeOpenL: 0, eyeSmileL: 1, ParamCheek: 0.3 } },
  // talking faces for AITuber OnAir emotion tags: eyes stay mostly open (closed / ^^ eyes are
  // what a single image fakes worst, and they would stay shut for a whole sentence)
  happyTalk: { label: 'happy', p: { eyeOpen: 0.8, ParamEyeSmile: 0.45, ParamCheek: 0.35, ParamBrowY: 0.25, ParamMouthForm: -0.5 } },
  sadTalk: { label: 'sad', p: { eyeOpen: 0.78, ParamBrowAngle: -0.8, ParamBrowY: -0.2, ParamMouthForm: 0.3, glance: [0, -0.35] } },
  angryTalk: { label: 'angry', p: { eyeOpen: 0.72, ParamBrowAngle: 0.85, ParamBrowY: -0.55, ParamMouthForm: 0.2 } },
  surprisedTalk: { label: 'surprised', p: { eyeOpen: 1.18, ParamBrowY: 0.9, ParamMouthForm: 0.9 } },
  relaxedTalk: { label: 'relaxed', p: { eyeOpen: 0.82, ParamEyeSmile: 0.35, ParamCheek: 0.15, ParamBrowY: 0.1 } },
};

// emotion tag -> [expression, motion played when the line starts]
const EMOTIONS = {
  happy: ['happyTalk', 'nod'],
  sad: ['sadTalk', 'sigh'],
  angry: ['angryTalk', 'no'],
  surprised: ['surprisedTalk', 'surprise'],
  relaxed: ['relaxedTalk', 'sway'],
  neutral: ['normal', null],
};

// [stiffness, damping ratio] of the parameter smoothing; unlisted params use [120, 0.95]
const SPRINGS = {
  ParamEyeBallX: [260, 0.9], ParamEyeBallY: [260, 0.9],
  ParamAngleX: [55, 0.72], ParamAngleY: [55, 0.72], ParamAngleZ: [45, 0.75],
  ParamBodyAngleX: [14, 0.9], ParamBodyAngleZ: [12, 0.9],
  ParamArmAngle: [20, 0.85], ParamHandAngle: [30, 0.8],
};

export class Motion {
  constructor() {
    this.mode = 'auto';           // auto | mouse | manual
    this.P = Object.fromEntries(PARAMS.map(p => [p.id, p.def]));
    this.manual = { ...this.P };
    this.cur = { ...this.P };      // smoothed values
    this.vel = Object.fromEntries(PARAMS.map(p => [p.id, 0]));
    this.expr = 'normal';
    this.exprMix = {};             // smoothed expression values
    this.t = 0;
    this.blink = { t: 0, start: 1.5, double: false };
    this.gaze = { x: 0, y: 0, next: 0 };
    this.tap = { next: 4, until: -1 };
    this.pointer = null;           // image px
    this.faceCenter = [615, 470];
    this.lipOpen = null;           // external mouth value from lip sync
    this.lipForm = 0;
    this.speaking = false;         // TTS audio playing (setSpeaking)
    this.voice = 0;                // 0..1 loudness (setVoiceLevel)
    this.mouth = 0;
    this.vowel = 'a';
    this.vowelForm = 0;
    this.syllableArmed = true;
    this.voicePeak = 0;
    this.voiceTrough = 0;
    this.kana = null;
    this.emotionUntil = 0;         // when the emotion face goes back to normal
    this.talkGain = 1;             // how much the head moves along with the voice
    this.play = null;              // { id, t } of the motion being played
    this.autoMotion = true;        // "おまかせ" plays a reaction motion now and then
    this.nextAuto = 14;
    this.autoIdle = true;          // ...and small idle motions more often
    this.nextIdle = 3;
    this.lastAuto = null;
    this.onMotion = null;          // UI callback (id or null)
  }

  setExpression(k) { this.expr = k; }

  hasMotion(id) { return id in ALL_MOTIONS; }

  // ---- speech (driven from outside, e.g. by the TTS audio analyser) ----
  setVoiceLevel(v) { this.voice = Math.min(1, Math.max(0, Number(v) || 0)); }

  setSpeaking(on) {
    if (on === this.speaking) return;
    this.speaking = !!on;
    if (!on) {
      // hold the emotion a moment after the line, then go back to the plain face
      this.emotionUntil = this.t + 1.2;
      this.voice = 0;
    }
  }

  /** `playMotion: false` changes only the face (a caller that picks motions itself). */
  setEmotion(tag, { playMotion = true } = {}) {
    const e = EMOTIONS[tag] ?? EMOTIONS.neutral;
    this.expr = e[0];
    this.emotionUntil = Infinity;
    if (e[1] && playMotion) this.playMotion(e[1]);
  }

  /** Mouth shapes from kana text, without audio (preview / tuning). */
  speakKana(text) {
    this.kana = { moras: kanaToMoras(text), t: 0 };
  }

  // Mouth from the TTS loudness. A volume signal has no vowel information, so each syllable
  // (the voice dipping and rising again) gets one vowel at random, weighted towards あ, and
  // keeps it until the next syllable: the drawn mouths must not change shape mid-syllable.
  // Syllables are found relative to the recent peak (not an absolute level), and the mouth
  // is scaled by where the voice sits between the recent trough and peak, so it closes in
  // the dip before each mora even when a loud voice never gets quiet.
  speechMouth(dt) {
    if (this.kana) {
      this.kana.t += dt;
      const m = sampleMoras(this.kana.moras, this.kana.t);
      if (!m) { this.kana = null; return this.mouth > 0.01 ? [this.mouth *= 0.6, this.vowelForm] : null; }
      const k = m.open > this.mouth ? 1 - Math.exp(-dt * 30) : 1 - Math.exp(-dt * 22);
      this.mouth += (m.open - this.mouth) * k;
      if (m.form !== null) this.vowelForm = m.form;
      return [this.mouth, this.vowelForm];
    }
    const v = this.speaking ? this.voice : 0;
    // recent peak / trough: follow at once, then relax over ~0.2 s
    const relax = 1 - Math.exp(-dt * 5);
    this.voicePeak = v > this.voicePeak ? v : this.voicePeak + (v - this.voicePeak) * relax;
    this.voiceTrough = v < this.voiceTrough ? v : this.voiceTrough + (v - this.voiceTrough) * relax;
    const peak = Math.max(this.voicePeak, 0.05);
    if (v < peak * 0.6) this.syllableArmed = true;
    else if (this.syllableArmed && v > peak * 0.8 && v > 0.1) {
      this.syllableArmed = false;
      const r = Math.random();
      this.vowel = r < 0.4 ? 'a' : r < 0.58 ? 'o' : r < 0.74 ? 'e' : r < 0.88 ? 'i' : 'u';
    }
    const range = this.voicePeak - this.voiceTrough;
    const rise = range < peak * 0.3 ? 1 : Math.max(0, (v - this.voiceTrough) / range);
    const shape = VOWELS[this.vowel ?? 'a'];
    const level = Math.min(1, Math.pow(v, 0.7) * 1.15) * Math.pow(rise, 0.3);
    const target = this.speaking ? Math.min(0.95, level) * (0.45 + 0.55 * shape.open / 0.9) : 0;
    // quick attack, quick release: the mouth has to shut between morae (~7 per second)
    const k = target > this.mouth ? 1 - Math.exp(-dt * 40) : 1 - Math.exp(-dt * 32);
    this.mouth += (target - this.mouth) * k;
    if (this.speaking) this.vowelForm = shape.form;   // after the line: close in the last shape
    return this.speaking || this.mouth > 0.01 ? [this.mouth, this.vowelForm] : null;
  }

  // Breathing: inhale ~40% of the cycle, a slower exhale, a short pause at the bottom,
  // and a period that drifts between ~3.2 and 4.6 s so it never looks metronomic.
  breathValue(dt) {
    this.breathPhase = (this.breathPhase ?? 0) + dt / (this.breathPeriod ?? 3.8);
    if (this.breathPhase >= 1) { this.breathPhase -= 1; this.breathPeriod = 3.2 + Math.random() * 1.4; }
    const x = this.breathPhase;
    if (x < 0.4) return sstep(0, 0.4, x);
    if (x < 0.88) return 1 - sstep(0.4, 0.88, x);
    return 0;
  }

  // pick one at random, never the one that just played
  playRandom(ids) {
    const pool = ids.filter(k => k !== this.lastAuto);
    this.playMotion(pool[Math.floor(Math.random() * pool.length)]);
  }

  playMotion(id) {
    this.lastAuto = id;
    this.play = { id, t: 0 };
    this.onMotion?.(id);
  }

  blinkValue(dt) {
    const b = this.blink;
    b.t += dt;
    if (b.t < b.start) return 1;
    const x = (b.t - b.start) / 0.17;
    if (x >= 1) {
      if (b.double) { b.double = false; b.start = b.t + 0.07; }
      else { b.start = b.t + 1.8 + Math.random() * 4.2; b.double = Math.random() < 0.18; }
      return 1;
    }
    return x < 0.45 ? 1 - x / 0.45 : (x - 0.45) / 0.55;
  }

  update(dt) {
    this.t += dt;
    const t = this.t;
    const T = {};                  // targets
    for (const p of PARAMS) T[p.id] = p.def;

    if (this.mode === 'manual') {
      Object.assign(T, this.manual);
    } else if (this.mode === 'auto') {
      // wandering plus following the gaze: the eyes jump first, the head turns after them
      T.ParamAngleX = fbm(t * 0.18, 1) * 10 + this.gaze.x * 11;
      T.ParamAngleY = fbm(t * 0.15, 2) * 6 - 1 + this.gaze.y * 7;
      T.ParamAngleZ = fbm(t * 0.12, 3) * 10;
      T.ParamBodyAngleX = fbm(t * 0.1, 4) * 5;
      T.ParamBodyAngleZ = fbm(t * 0.09, 5) * 4;
      T.ParamArmAngle = fbm(t * 0.14, 6) * 5;
      T.ParamHandAngle = fbm(t * 0.21, 7) * 5;
      // glances
      if (t > this.gaze.next) {
        const r = Math.random();
        this.gaze.x = r < 0.45 ? 0 : (Math.random() * 2 - 1) * 0.8;
        this.gaze.y = r < 0.45 ? 0 : (Math.random() * 2 - 1) * 0.5;
        this.gaze.next = t + 0.8 + Math.random() * 2.5;
      }
      T.ParamEyeBallX = this.gaze.x + T.ParamAngleX / 60;
      T.ParamEyeBallY = this.gaze.y + T.ParamAngleY / 60;
      // occasional finger tapping on the chin
      if (t > this.tap.next) { this.tap.until = t + 1.1; this.tap.next = t + 5 + Math.random() * 6; }
      // random playback: reactions every ~15-25 s, small idle motions every few seconds in between
      // while talking: no random motions, just nod along with the voice
      if (this.speaking) {
        this.nextIdle = Math.max(this.nextIdle, t + 2.5);
        this.nextAuto = Math.max(this.nextAuto, t + 6);
        const g = this.talkGain;
        this.talkNod = (this.talkNod ?? 0) + (this.voice * 7 * g - (this.talkNod ?? 0)) * Math.min(1, dt * 6);
        T.ParamAngleY -= this.talkNod;
        T.ParamAngleX += fbm(t * 0.6, 11) * 5 * g;
        T.ParamAngleZ += fbm(t * 0.5, 12) * 4 * g;
      }
      if (!this.speaking && t > this.emotionUntil) { this.expr = 'normal'; this.emotionUntil = Infinity; }
      if (this.speaking) { /* no random playback */ }
      else if (!this.play && this.autoMotion && t > this.nextAuto) {
        this.playRandom(Object.keys(MOTIONS).filter(k => k !== 'surprise'));
        this.nextAuto = t + 15 + Math.random() * 10;
        this.nextIdle = Math.max(this.nextIdle, t + 5);
      } else if (!this.play && this.autoIdle && t > this.nextIdle) {
        this.playRandom(Object.keys(IDLE_MOTIONS));
        this.nextIdle = t + 5 + Math.random() * 5;   // counted from the start, so 1-5 s of plain idling after it
      }
    } else if (this.mode === 'mouse' && this.pointer) {
      const dx = (this.pointer[0] - this.faceCenter[0]) / 500, dy = (this.pointer[1] - this.faceCenter[1]) / 500;
      T.ParamAngleX = clamp(dx * 30, -30, 30);
      T.ParamAngleY = clamp(-dy * 30, -30, 30);
      T.ParamAngleZ = clamp(-dx * dy * 25, -12, 12);
      T.ParamBodyAngleX = clamp(dx * 10, -10, 10) * 0.6;
      T.ParamEyeBallX = clamp(dx * 1.4, -1, 1);
      T.ParamEyeBallY = clamp(-dy * 1.4, -1, 1);
      T.ParamHandAngle = clamp(dx * 4, -5, 5);
    }
    if (this.mode !== 'manual') {
      T.ParamBreath = this.breathValue(dt);
      if (t < this.tap.until) T.ParamFingerTap = Math.max(0, Math.sin((this.tap.until - t) * Math.PI * 3.6)) ** 2;
    }

    // motion: body/head tracks go into the targets, so the springs smooth them too
    let M = null, mw = 0;
    if (this.play) {
      const def = ALL_MOTIONS[this.play.id];
      this.play.t += dt;
      if (this.play.t >= def.dur) { this.play = null; this.onMotion?.(null); }
      else {
        M = {};
        for (const [id, keys] of Object.entries(def.tracks))
          M[id] = sampleTrack(keys, this.play.t) * (def.idle && IDLE_SCALED.test(id) ? IDLE_GAIN.amp : 1);
        mw = sstep(0, 0.15, this.play.t) * (1 - sstep(def.dur - 0.25, def.dur, this.play.t));
        for (const [id, v] of Object.entries(M)) {
          if (ADDITIVE.has(id)) T[id] += v;
          else if (id === 'ParamBreath') T[id] += (v - T[id]) * mw;   // a motion sets its own breathing
          else if (!FACE_TRACKS.has(id)) T[id] = Math.max(T[id], Math.max(0, v));
        }
      }
    }

    if (this.mode !== 'manual') T.ParamAngleY += T.ParamBreath * 1.6;

    // expression layer (smoothed so switching is not a jump)
    const E = EXPRESSIONS[this.expr].p;
    const keys = ['eyeOpen', 'eyeOpenL', 'eyeSmileL', 'ParamEyeSmile', 'ParamMouthOpenY', 'ParamMouthForm', 'ParamCheek', 'ParamBrowY', 'ParamBrowAngle', 'gx', 'gy'];
    const target = { eyeOpen: E.eyeOpen ?? 1, eyeOpenL: E.eyeOpenL ?? E.eyeOpen ?? 1, eyeSmileL: E.eyeSmileL ?? E.ParamEyeSmile ?? 0,
      ParamEyeSmile: E.ParamEyeSmile ?? 0, ParamMouthOpenY: E.ParamMouthOpenY ?? 0, ParamMouthForm: E.ParamMouthForm ?? 0,
      ParamCheek: E.ParamCheek ?? 0, ParamBrowY: E.ParamBrowY ?? 0, ParamBrowAngle: E.ParamBrowAngle ?? 0,
      gx: E.glance?.[0] ?? 0, gy: E.glance?.[1] ?? 0 };
    const k = 1 - Math.exp(-dt * 9);
    for (const key of keys) {
      if (this.exprMix[key] === undefined) this.exprMix[key] = target[key];
      this.exprMix[key] += (target[key] - this.exprMix[key]) * k;
    }
    const X = this.exprMix;

    // spring-damper towards the targets for body params
    const out = {};
    for (const p of PARAMS) {
      const id = p.id;
      if (this.mode === 'manual' && !M) { out[id] = T[id]; this.cur[id] = T[id]; this.vel[id] = 0; continue; }
      // eyes lead, the head follows with a slight overshoot, the body trails behind
      let [stiff, zeta] = SPRINGS[id] ?? [120, 0.95];
      // keyframed motions are already smooth; follow them more tightly than idle wandering
      // keyframed motions are followed more tightly than the idle wandering; idle motions a
      // bit less so they stay soft but still reach their poses
      if (M && /^ParamAngle|^ParamBody/.test(id)) {
        if (ALL_MOTIONS[this.play?.id ?? '']?.idle) { stiff *= IDLE_GAIN.stiff; zeta = 0.8; }
        else if (/^ParamAngle/.test(id)) { stiff *= 4.5; zeta = 0.75; }
      }
      const damp = 2 * Math.sqrt(stiff) * zeta;
      this.vel[id] += (stiff * (T[id] - this.cur[id]) - damp * this.vel[id]) * dt;
      this.cur[id] += this.vel[id] * dt;
      out[id] = this.cur[id];
    }
    let blink = 1;
    if (this.mode !== 'manual') {
      blink = this.blinkValue(dt);
      out.ParamEyeROpen = X.eyeOpen * blink;
      out.ParamEyeLOpen = X.eyeOpenL * blink;
      out.ParamEyeSmile = X.ParamEyeSmile;
      out.eyeSmileL = X.eyeSmileL;
      out.ParamMouthOpenY = X.ParamMouthOpenY;
      out.ParamMouthForm = X.ParamMouthForm;
      out.ParamCheek = X.ParamCheek;
      // brows dip a little with each blink and lift when looking up
      out.ParamBrowY = X.ParamBrowY + (out.ParamAngleY > 0 ? out.ParamAngleY / 60 : 0) - (1 - blink) * 0.18;
      out.ParamBrowAngle = X.ParamBrowAngle;
      out.ParamEyeBallX = clamp(out.ParamEyeBallX + X.gx, -1, 1);
      out.ParamEyeBallY = clamp(out.ParamEyeBallY + X.gy, -1, 1);
    } else {
      out.eyeSmileL = out.ParamEyeSmile;
    }
    if (M) {
      const mix = (key, v) => { out[key] += (v - out[key]) * mw; };
      const clampEye = v => Math.min(1.3, Math.max(0, v));
      if ('eyeOpen' in M) { mix('ParamEyeROpen', clampEye(M.eyeOpen) * blink); if (!('eyeOpenL' in M)) mix('ParamEyeLOpen', clampEye(M.eyeOpen) * blink); }
      if ('eyeOpenL' in M) mix('ParamEyeLOpen', clampEye(M.eyeOpenL) * blink);
      if ('ParamEyeSmile' in M) { mix('ParamEyeSmile', M.ParamEyeSmile); if (!('eyeSmileL' in M)) mix('eyeSmileL', M.ParamEyeSmile); }
      if ('eyeSmileL' in M) mix('eyeSmileL', M.eyeSmileL);
      for (const id of ['ParamMouthOpenY', 'ParamMouthForm', 'ParamCheek', 'ParamBrowY', 'ParamBrowAngle'])
        if (id in M) mix(id, id === 'ParamMouthOpenY' || id === 'ParamCheek' ? Math.max(0, M[id]) : M[id]);
    }
    const sm = this.speechMouth(dt);
    if (sm) { this.lipOpen = sm[0]; this.lipForm = sm[1]; }
    else if (this.lipOpen !== null && !this.speaking && !this.kana) this.lipOpen = null;
    if (this.lipOpen !== null) {
      out.ParamMouthOpenY = Math.max(out.ParamMouthOpenY * 0.3, this.lipOpen);
      // while talking the voice decides the vowel; the expression's form would shift it
      out.ParamMouthForm = clamp(this.lipForm, -1, 1);
    }
    this.P = out;
    return out;
  }
}
