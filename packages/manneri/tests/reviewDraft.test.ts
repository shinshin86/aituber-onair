import { describe, expect, it } from 'vitest';
import { ManneriDetector, type Message } from '../src/index.js';

describe('reviewDraft', () => {
  it('flags repetitive assistant drafts before sending them', () => {
    const detector = new ManneriDetector({
      minMessageLength: 0,
      similarityThreshold: 0.7,
      interventionCooldown: 0,
    });
    const messages: Message[] = [
      { role: 'user', content: 'What should I cook?' },
      { role: 'assistant', content: 'A quick pasta would be good.' },
      { role: 'user', content: 'Any other dinner idea?' },
      { role: 'assistant', content: 'A quick pasta would be good.' },
      { role: 'user', content: 'One more suggestion?' },
    ];

    const review = detector.reviewDraft(
      messages,
      'A quick pasta would be good.'
    );

    expect(review.shouldRewrite).toBe(true);
    expect(review.analysis.shouldIntervene).toBe(true);
    expect(review.suggestion?.content).toContain('Avoid repeating');
  });

  it('allows varied assistant drafts', () => {
    const detector = new ManneriDetector({
      minMessageLength: 0,
      similarityThreshold: 0.9,
    });
    const messages: Message[] = [
      { role: 'user', content: 'What should I cook?' },
      { role: 'assistant', content: 'A quick pasta would be good.' },
      { role: 'user', content: 'Any other dinner idea?' },
    ];

    const review = detector.reviewDraft(
      messages,
      'Try a rice bowl with grilled vegetables and miso soup.'
    );

    expect(review.shouldRewrite).toBe(false);
    expect(review.suggestion).toBeUndefined();
  });
});
