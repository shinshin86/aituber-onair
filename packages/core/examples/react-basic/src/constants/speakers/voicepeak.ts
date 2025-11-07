export interface VoicepeakSpeaker {
  id: string;
  name: string;
}

export const VOICEPEAK_SPEAKERS: VoicepeakSpeaker[] = [
  { id: 'f1', name: '日本人女性 1' },
  { id: 'f2', name: '日本人女性 2' },
  { id: 'f3', name: '日本人女性 3' },
  { id: 'm1', name: '日本人男性 1' },
  { id: 'm2', name: '日本人男性 2' },
  { id: 'm3', name: '日本人男性 3' },
  { id: 'c', name: '女の子' },
];

export const VOICEPEAK_API_ENDPOINT = 'http://localhost:20202';
