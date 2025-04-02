/**
 * AITuber OnAir Core type definitions
 * Index file: Export all type definitions from here
 */

// Memory related type definitions
export * from './memory';

// Voice engine related type definitions
export * from './voiceEngine';

// NijiVoice related type definitions
export * from './nijiVoice';

// Chat related type definitions (excluding Screenplay type)
export {
  Message,
  MessageWithVision,
  VisionBlock,
  ChatType,
  SpeakOptions,
} from './chat';

// Voice related type definitions (excluding Screenplay type)
export {
  talkStyles,
  TalkStyle,
  Talk,
  emotions,
  EmotionType,
  EmotionTypeForVoicepeak,
} from './voice';

// Individual exports to avoid name conflicts
import { Screenplay as VoiceScreenplay } from './voice';
import { Screenplay as ChatScreenplay } from './chat';

// Export both Screenplay types with aliases
export { VoiceScreenplay, ChatScreenplay };
