import { EmotionType, VoiceScreenplay, TalkStyle, emotions } from '../../types';

export const splitSentence = (text: string): string[] => {
  const splitMessages = text.split(/(?<=[。．！？\n])/g);
  return splitMessages.filter((msg) => msg !== '');
};

export const textsToScreenplay = (texts: string[]): VoiceScreenplay[] => {
  const screenplays: VoiceScreenplay[] = [];
  let prevExpression = 'neutral';
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];

    const match = text.match(/\[(.*?)\]/);

    const tag = match?.[1] || prevExpression;

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
    case 'surprised':
      return 'surprised';
    default:
      return 'talk';
  }
};
