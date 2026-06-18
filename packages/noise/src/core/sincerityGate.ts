import type { ChatMessage, SincerityAssessment } from './types.js';

/**
 * Patterns that mark a sincere bid: vulnerability, distress, or a serious
 * consultation. Failed uptake of a sincere bid is the worst-case violation,
 * so the list is intentionally conservative (strong signals only) to avoid
 * suppressing noise on ordinary banter.
 */
const DISTRESS_PATTERN =
  /死にたい|消えたい|自傷|つらい|辛い|しんどくて|苦しくて|落ち込ん|病んで|うつ病|鬱病|泣きそう|泣いて|いじめられ|suicidal|self[- ]harm|depressed|grieving/i;
const CONSULTATION_PATTERN =
  /相談したい|相談があり|相談なんだけど|真剣な話|真面目な話|本気で困って|マジで困って|助けてほしい|聞いてほしいことが|悩んでい|悩みがあ|need help|i'?m struggling|serious question|can i talk to you about something/i;
const LIFE_EVENT_PATTERN =
  /亡くなっ|お葬式|入院し|手術し|診断され|失業し|リストラされ|別れた|離婚|passed away|lost my job|broke up|divorce|diagnosed/i;

const SCAN_LAST_USER_MESSAGES = 3;

/**
 * Decide whether the latest user turns constitute a sincere bid that must
 * not receive noise. Only user messages are scanned; stream context and the
 * persona prompt are intentionally ignored because they describe the show,
 * not the person speaking.
 */
export function assessSincerity(input: {
  messages: ChatMessage[];
}): SincerityAssessment {
  const recentUserMessages = input.messages
    .filter((message) => message.role === 'user')
    .slice(-SCAN_LAST_USER_MESSAGES);
  const reasons: string[] = [];
  let score = 0;

  for (const message of recentUserMessages) {
    if (DISTRESS_PATTERN.test(message.content)) {
      score = Math.max(score, 0.9);
      reasons.push('A recent user message signals distress or vulnerability.');
    }

    if (CONSULTATION_PATTERN.test(message.content)) {
      score = Math.max(score, 0.75);
      reasons.push('A recent user message asks for a serious consultation.');
    }

    if (LIFE_EVENT_PATTERN.test(message.content)) {
      score = Math.max(score, 0.7);
      reasons.push('A recent user message mentions a heavy life event.');
    }
  }

  return {
    serious: score >= 0.6,
    score,
    reasons: [...new Set(reasons)],
  };
}
