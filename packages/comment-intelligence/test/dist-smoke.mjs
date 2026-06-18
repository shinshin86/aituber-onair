import assert from 'node:assert/strict';
import {
  createCommentIntelligence,
  normalizeWebComment,
} from '../dist/index.js';

assert.equal(typeof createCommentIntelligence, 'function');
assert.equal(typeof normalizeWebComment, 'function');

const intelligence = createCommentIntelligence({
  analysis: { mode: 'rules' },
});

const result = await intelligence.analyze({
  comments: [
    normalizeWebComment({
      id: '1',
      userId: 'viewer-1',
      userName: 'viewer-1',
      text: '今日なにするの？',
      timestamp: Date.now(),
    }),
  ],
  streamState: { platform: 'youtube', mode: 'live', language: 'ja' },
});

assert.ok(result.selectedComments.length > 0);
