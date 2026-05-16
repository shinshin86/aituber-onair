import { describe, expect, it } from 'vitest';
import {
  AIVIS_CLOUD_API_URL,
  ELEVENLABS_TTS_API_URL,
  GEMINI_TTS_API_URL,
  INWORLD_TTS_API_URL,
  OPENAI_COMPATIBLE_TTS_API_URL,
  UNREAL_SPEECH_TTS_API_URL,
  XAI_TTS_API_URL,
  AivisCloudEngine,
  ElevenLabsEngine,
  GeminiTtsEngine,
  InworldEngine,
  OpenAiCompatibleEngine,
  PiperPlusEngine,
  UnrealSpeechEngine,
  type ElevenLabsApplyTextNormalization,
  type ElevenLabsVoiceSettingsOptions,
  type InworldAudioEncoding,
  type InworldDeliveryMode,
  type InworldVoiceServiceOptions,
  type UnrealSpeechCodec,
  type VoicepeakEmotionInput,
  type VoicepeakEmotionWeights,
  XaiEngine,
} from '../src/index';

describe('Core index voice re-exports', () => {
  it('re-exports voice engine classes', () => {
    expect(typeof AivisCloudEngine).toBe('function');
    expect(typeof ElevenLabsEngine).toBe('function');
    expect(typeof GeminiTtsEngine).toBe('function');
    expect(typeof InworldEngine).toBe('function');
    expect(typeof OpenAiCompatibleEngine).toBe('function');
    expect(typeof PiperPlusEngine).toBe('function');
    expect(typeof UnrealSpeechEngine).toBe('function');
    expect(typeof XaiEngine).toBe('function');
  });

  it('re-exports voice endpoint constants', () => {
    expect(AIVIS_CLOUD_API_URL).toBe(
      'https://api.aivis-project.com/v1/tts/synthesize',
    );
    expect(GEMINI_TTS_API_URL).toBe(
      'https://generativelanguage.googleapis.com/v1beta',
    );
    expect(OPENAI_COMPATIBLE_TTS_API_URL).toBe(
      'http://localhost:8880/v1/audio/speech',
    );
    expect(UNREAL_SPEECH_TTS_API_URL).toBe(
      'https://api.v8.unrealspeech.com/stream',
    );
    expect(ELEVENLABS_TTS_API_URL).toBe(
      'https://api.elevenlabs.io/v1/text-to-speech',
    );
    expect(INWORLD_TTS_API_URL).toBe('https://api.inworld.ai/tts/v1/voice');
    expect(XAI_TTS_API_URL).toBe('https://api.x.ai/v1/tts');
  });

  it('re-exports Unreal Speech and ElevenLabs option types', () => {
    const codec: UnrealSpeechCodec = 'libmp3lame';
    const textNormalization: ElevenLabsApplyTextNormalization = 'auto';
    const voiceSettings: ElevenLabsVoiceSettingsOptions = {
      stability: 0.4,
      similarity_boost: 0.8,
    };

    expect(codec).toBe('libmp3lame');
    expect(textNormalization).toBe('auto');
    expect(voiceSettings).toEqual({
      stability: 0.4,
      similarity_boost: 0.8,
    });
  });

  it('re-exports VoicePeak weighted emotion types', () => {
    const weighted: VoicepeakEmotionWeights = { happy: 40, fun: 60 };
    const input: VoicepeakEmotionInput = weighted;

    expect(input).toEqual({ happy: 40, fun: 60 });
  });

  it('re-exports Inworld option types', () => {
    const encoding: InworldAudioEncoding = 'MP3';
    const deliveryMode: InworldDeliveryMode = 'BALANCED';
    const options: InworldVoiceServiceOptions = {
      engineType: 'inworld',
      speaker: 'Ashley',
      apiKey: 'inworld-basic-key',
      inworldModel: 'inworld-tts-2',
      inworldAudioEncoding: encoding,
      inworldDeliveryMode: deliveryMode,
    };

    expect(options.inworldAudioEncoding).toBe('MP3');
    expect(options.inworldDeliveryMode).toBe('BALANCED');
  });
});
