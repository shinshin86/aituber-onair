/**
 * Voice related type definitions
 */
import { VRMExpressionPresetName } from '@pixiv/three-vrm';

export const talkStyles = [
  'talk',
  'happy',
  'sad',
  'angry',
  'fear',
  'surprised',
] as const;

/**
 * TalkStyle - Style of speech for voice synthesis
 */
export type TalkStyle = (typeof talkStyles)[number];

/**
 * Talk - Set of message and talk style
 */
export type Talk = {
  style: TalkStyle;
  message: string;
};

/**
 * Types of emotional expressions
 */
export const emotions = ['neutral', 'happy', 'angry', 'sad', 'relaxed'] as const;
export type EmotionType = (typeof emotions)[number] & VRMExpressionPresetName;

/**
 * Emotion types for VoicePeak
 */
export type EmotionTypeForVoicepeak = 'happy' | 'fun' | 'angry' | 'sad' | 'neutral';

/**
 * Screenplay - Text with emotion expression
 * This has a different structure from the Screenplay type in chat.ts.
 * Be careful of name conflicts when importing both types.
 * Example: import { Screenplay as VoiceScreenplay } from '../types/voice';
 */
export type Screenplay = {
  expression: EmotionType;
  talk: Talk;
}; 