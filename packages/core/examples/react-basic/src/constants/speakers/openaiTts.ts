export interface OpenAITTSSpeaker {
  id: string;
  name: string;
  description?: string;
}

export const OPENAI_TTS_SPEAKERS: OpenAITTSSpeaker[] = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral and balanced' },
  { id: 'echo', name: 'Echo', description: 'Warm and engaging' },
  { id: 'fable', name: 'Fable', description: 'Expressive and dynamic' },
  { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative' },
  { id: 'nova', name: 'Nova', description: 'Friendly and conversational' },
  { id: 'shimmer', name: 'Shimmer', description: 'Soft and pleasant' },
];
