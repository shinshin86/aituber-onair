import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { BondToast } from '../lib/kizunaBond';
import { BondToastStack } from './BondToastStack';

const baseToast: BondToast = {
  id: 1,
  userId: 'youtube:Aki',
  displayName: 'Aki',
  pointsAdded: 20,
  previousIntimacy: 0.1,
  nextIntimacy: 0.25,
  previousStage: '新しい視聴者',
  nextStage: '顔なじみ',
  leveledUp: false,
};

describe('BondToastStack', () => {
  it('shows the viewer, intimacy change, and changed stage', () => {
    const html = renderToStaticMarkup(
      createElement(BondToastStack, {
        toasts: [baseToast],
        onDismiss: () => undefined,
      }),
    );

    expect(html).toContain('Aki');
    expect(html).toContain('親密度 10% → 25%');
    expect(html).toContain('新しい視聴者 → 顔なじみ');
    expect(html).toContain('bond-toast-highlight');
  });

  it('highlights a level change without a stage change', () => {
    const html = renderToStaticMarkup(
      createElement(BondToastStack, {
        toasts: [
          {
            ...baseToast,
            previousStage: '顔なじみ',
            nextStage: '顔なじみ',
            leveledUp: true,
            newLevel: 3,
          },
        ],
        onDismiss: () => undefined,
      }),
    );

    expect(html).toContain('レベル3に上がりました');
    expect(html).toContain('bond-toast-highlight');
  });
});
