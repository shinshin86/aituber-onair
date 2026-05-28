import type { CommentPlatform } from './comment';

export type StreamState = {
  platform?: CommentPlatform;
  mode?: 'live' | 'test' | 'replay';
  topic?: string;
  title?: string;
  elapsedMs?: number;
  viewerCount?: number;
  language?: 'ja' | 'en' | 'auto';
};

export type RecentAiMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
};
