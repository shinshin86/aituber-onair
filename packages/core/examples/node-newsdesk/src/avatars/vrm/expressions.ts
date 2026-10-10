import type { LineEmotion } from '../../types.js';

/** VRM 1 names first, followed by legacy VRM 0 names. */
export const EMOTION_CANDIDATES: Record<LineEmotion, readonly string[]> = {
  neutral: [],
  happy: ['happy', 'joy'],
  surprised: ['surprised'],
  sad: ['sad', 'sorrow'],
  angry: ['angry'],
  relaxed: ['relaxed', 'fun'],
};
