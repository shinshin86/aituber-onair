import { EmotionType, Screenplay } from '../types/voice';
import { EmotionParser, emotionToTalkStyle } from '../utils/emotionParser';

export const splitSentence = (text: string): string[] => {
  const splitMessages = text.split(/(?<=[。．！？\n])/g);
  return splitMessages.filter((msg) => msg !== '');
};

export const textsToScreenplay = (texts: string[]): Screenplay[] => {
  const screenplays: Screenplay[] = [];
  let prevExpression = 'neutral';
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];

    const { emotion, cleanText } = EmotionParser.extractEmotion(text);
    const tag = emotion || prevExpression;

    let expression = prevExpression;
    if (EmotionParser.isValidEmotion(tag)) {
      expression = tag;
      prevExpression = tag;
    }

    screenplays.push({
      expression: expression as EmotionType,
      talk: {
        style: emotionToTalkStyle(expression as EmotionType, 'talk'),
        message: cleanText,
      },
    });
  }

  return screenplays;
};
