export interface OpenAITTSSpeaker {
  id: string;
  name: string;
  description?: string;
}

export const OPENAI_TTS_SPEAKERS: OpenAITTSSpeaker[] = [
  { id: 'alloy', name: 'Alloy' },
  { id: 'ash', name: 'Ash' },
  { id: 'ballad', name: 'Ballad' },
  { id: 'coral', name: 'Coral' },
  { id: 'echo', name: 'Echo' },
  { id: 'fable', name: 'Fable' },
  { id: 'nova', name: 'Nova' },
  { id: 'onyx', name: 'Onyx' },
  { id: 'sage', name: 'Sage' },
  { id: 'shimmer', name: 'Shimmer' },
  { id: 'verse', name: 'Verse' },
  { id: 'marin', name: 'Marin' },
  { id: 'cedar', name: 'Cedar' },
];
