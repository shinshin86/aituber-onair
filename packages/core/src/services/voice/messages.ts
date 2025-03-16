import { VRMExpressionPresetName } from '@pixiv/three-vrm';

// used for normal comments
export type Message = {
  role: 'assistant' | 'system' | 'user';
  content: string;
  timestamp?: number;
};

// used for comments when watching the broadcast screen
type VisionBlock =
  | { type: 'text'; text: string }
  | {
      type: 'image_url';
      image_url: {
        url: string;
        detail?: 'low' | 'high' | 'auto';
      };
    };

export type MessageWithVision = {
  role: 'assistant' | 'system' | 'user';
  content: string | VisionBlock[];
};

const talkStyles = [
  'talk',
  'happy',
  'sad',
  'angry',
  'fear',
  'surprised',
] as const;
export type TalkStyle = (typeof talkStyles)[number];

export type Talk = {
  style: TalkStyle;
  message: string;
};

const emotions = ['neutral', 'happy', 'angry', 'sad', 'relaxed'] as const;
export type EmotionType = (typeof emotions)[number] & VRMExpressionPresetName;
type EmotionTypeForVoicepeak = 'happy' | 'fun' | 'angry' | 'sad' | 'neutral';

/**
 * Set of talk text and emotion, and model's emotion expression
 */
export type Screenplay = {
  expression: EmotionType;
  talk: Talk;
};

export const splitSentence = (text: string): string[] => {
  const splitMessages = text.split(/(?<=[。．！？\n])/g);
  return splitMessages.filter((msg) => msg !== '');
};

export const textsToScreenplay = (texts: string[]): Screenplay[] => {
  const screenplays: Screenplay[] = [];
  let prevExpression = 'neutral';
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];

    const match = text.match(/\[(.*?)\]/);

    const tag = (match && match[1]) || prevExpression;

    const message = text.replace(/\[(.*?)\]/g, '');

    let expression = prevExpression;
    if (emotions.includes(tag as any)) {
      expression = tag;
      prevExpression = tag;
    }

    screenplays.push({
      expression: expression as EmotionType,
      talk: {
        style: emotionToTalkStyle(expression as EmotionType),
        message: message,
      },
    });
  }

  return screenplays;
};

const emotionToTalkStyle = (emotion: EmotionType): TalkStyle => {
  switch (emotion) {
    case 'angry':
      return 'angry';
    case 'happy':
      return 'happy';
    case 'sad':
      return 'sad';
    default:
      return 'talk';
  }
};
