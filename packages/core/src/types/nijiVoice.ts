export interface VoiceActor {
  id: string;
  name: string;
  nameReading?: string;
  age?: number;
  gender: string;
  birthMonth?: number;
  birthDay?: number;
  smallImageUrl: string;
  mediumImageUrl: string;
  largeImageUrl: string;
  sampleVoiceUrl: string;
  sampleScript: string;
  recommendedVoiceSpeed: number;
  recommendedEmotionalLevel: number;
  recommendedSoundDuration: number;
  voiceStyles: Array<{
    id: number;
    style: string;
  }>;
}

export interface VoiceActorResponse {
  voice_actors: VoiceActor[];
}

export interface GeneratedVoiceResponse {
  audio_base64: string;
}
