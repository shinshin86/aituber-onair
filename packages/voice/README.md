# AITuber OnAir Voice

![AITuber OnAir Voice - logo](https://github.com/shinshin86/aituber-onair/raw/main/packages/voice/images/aituber-onair-voice.png)

[@aituber-onair/voice](https://www.npmjs.com/package/@aituber-onair/voice) is an independent voice synthesis library that supports multiple TTS (Text-to-Speech) engines. While originally developed for the [AITuber OnAir](https://aituberonair.com) project, it can be used standalone for any voice synthesis needs.

[日本語版はこちら](https://github.com/shinshin86/aituber-onair/blob/main/packages/voice/README_ja.md)

This project is published as open-source software and is available as an [npm package](https://www.npmjs.com/package/@aituber-onair/voice) under the MIT License.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Main Features](#main-features)
- [Basic Usage](#basic-usage)
- [Supported TTS Engines](#supported-tts-engines)
- [Emotion-Aware Speech](#emotion-aware-speech)
- [Browser Compatibility](#browser-compatibility)
- [Advanced Configuration](#advanced-configuration)
- [Engine-Specific Features](#engine-specific-features)
- [Integration with AITuber OnAir Core](#integration-with-aituber-onair-core)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Testing](#testing)
- [Contributing](#contributing)

## Overview

**@aituber-onair/voice** is a comprehensive voice synthesis library that provides a unified interface for multiple TTS engines. It specializes in emotion-aware speech synthesis, making it ideal for creating expressive virtual characters, AI assistants, and interactive applications.

Key design principles:
- **Engine Independence**: Switch between TTS engines without changing your code
- **Emotion Support**: Built-in emotion detection and synthesis
- **Browser Ready**: Full support for web audio playback
- **TypeScript First**: Complete type safety and excellent IDE support
- **Zero Dependencies**: Minimal external dependencies for maximum compatibility

## Installation

Install using npm:

```bash
npm install @aituber-onair/voice
```

Or using yarn:

```bash
yarn add @aituber-onair/voice
```

Or using pnpm:

```bash
pnpm install @aituber-onair/voice
```

## Main Features

- **Multiple TTS Engine Support**  
  Compatible with VOICEVOX, VoicePeak, OpenAI TTS, xAI TTS, Unreal Speech,
  ElevenLabs, Inworld, Gradium, Gemini TTS, MiniMax, AivisSpeech, Aivis Cloud,
  and more
- **Unified Interface**  
  Single API for all supported TTS engines
- **Emotion-Aware Synthesis**  
  Automatically detects and applies emotions from text tags like `[happy]`, `[sad]`, etc.
- **Screenplay Conversion**  
  Transforms text with emotion tags into structured screenplay format
- **Browser Audio Support**  
  Direct playback in web browsers using HTMLAudioElement
- **Custom Endpoints**  
  Support for self-hosted TTS servers
- **Language Detection**  
  Automatic language recognition for multi-language engines
- **Flexible Configuration**  
  Runtime engine switching and parameter updates

## Basic Usage

### Simple Text-to-Speech

```typescript
import { VoiceService, VoiceServiceOptions } from '@aituber-onair/voice';

// Configure the voice service
const options: VoiceServiceOptions = {
  engineType: 'voicevox',
  speaker: '1',
  // Optional: specify custom endpoint
  voicevoxApiUrl: 'http://localhost:50021'
};

// Create voice service instance
const voiceService = new VoiceService(options);

// Speak text
await voiceService.speak({ text: 'Hello, world!' });
```

### Using VoiceEngineAdapter (Recommended)

```typescript
import { VoiceEngineAdapter, VoiceServiceOptions } from '@aituber-onair/voice';

const options: VoiceServiceOptions = {
  engineType: 'openai',
  speaker: 'alloy',
  apiKey: 'your-openai-api-key',
  onPlay: async (audioBuffer) => {
    // Custom audio playback handler
    console.log('Playing audio...');
  }
};

const voiceAdapter = new VoiceEngineAdapter(options);

// Speak with emotion
await voiceAdapter.speak({ 
  text: '[happy] I am so excited to talk with you!' 
});
```

## Supported TTS Engines

### VOICEVOX
High-quality Japanese speech synthesis engine with multiple character voices.

```typescript
const voiceService = new VoiceService({
  engineType: 'voicevox',
  speaker: '1', // Character ID
  voicevoxApiUrl: 'http://localhost:50021' // Optional custom endpoint
});
```

### VoicePeak
Professional speech synthesis with rich emotional expression.

```typescript
const voiceService = new VoiceService({
  engineType: 'voicepeak',
  speaker: 'f1',
  voicepeakApiUrl: 'http://localhost:20202',
  voicepeakEmotion: 'happy',
  voicepeakSpeed: 140,
  voicepeakPitch: 20
});
```

Single-tag `voicepeakEmotion` remains backward compatible with existing
VoicePeak setups. Weighted emotion maps require `vpeakserver >= v0.2.0`.

```typescript
const weightedVoiceService = new VoiceService({
  engineType: 'voicepeak',
  speaker: 'f1',
  voicepeakApiUrl: 'http://localhost:20202',
  voicepeakEmotion: { happy: 40, fun: 60 },
});
```

- `neutral` is ignored when sending weighted emotions.
- Weight `0` is ignored.
- `{}` means "do not send emotion" and does not fall back to `Talk.style`.
- `undefined` means no override, so `Talk.style` still maps to a single tag.

### OpenAI TTS
OpenAI's text-to-speech API with multiple voice options.

```typescript
const voiceService = new VoiceService({
  engineType: 'openai',
  speaker: 'alloy',
  apiKey: 'your-openai-api-key'
});
```

### xAI TTS
xAI's cloud TTS API with selectable voice IDs, language control, and output
format tuning.

```typescript
const voiceService = new VoiceService({
  engineType: 'xai',
  speaker: 'eve',
  apiKey: 'your-xai-api-key',
  xaiLanguage: 'ja',
  xaiCodec: 'mp3',
  xaiSampleRate: 24000,
  xaiBitRate: 128000,
});
```

### Unreal Speech
Unreal Speech v8 cloud TTS via the `/stream` endpoint. It returns audio bytes
directly, so it works with `VoiceEngineAdapter` playback without an extra
download step.

```typescript
const voiceService = new VoiceService({
  engineType: 'unrealSpeech',
  speaker: 'af_bella',
  apiKey: 'your-unreal-speech-api-key',
  unrealSpeechBitrate: '192k',
  unrealSpeechSpeed: 0,
  unrealSpeechPitch: 1,
  unrealSpeechCodec: 'libmp3lame',
  unrealSpeechTemperature: 0.25,
});
```

Use `unrealSpeechApiUrl` to override the default
`https://api.v8.unrealspeech.com/stream` endpoint.

### ElevenLabs
ElevenLabs Text to Speech API support using direct `fetch` calls. No SDK is
required.

```typescript
const voiceService = new VoiceService({
  engineType: 'elevenLabs',
  speaker: 'JBFqnCBsd6RMkjVDRZzb',
  apiKey: 'your-elevenlabs-api-key',
  elevenLabsModel: 'eleven_multilingual_v2',
  elevenLabsOutputFormat: 'mp3_44100_128',
  elevenLabsStability: 0.5,
  elevenLabsSimilarityBoost: 0.75,
  elevenLabsUseSpeakerBoost: true,
});
```

Use `elevenLabsApiUrl` to override the default
`https://api.elevenlabs.io/v1/text-to-speech` endpoint. The `speaker` value is
sent as the ElevenLabs `voice_id`.

### Inworld
Inworld TTS non-streaming speech synthesis using direct `fetch` calls. This
engine uses the REST endpoint only; WebSocket and HTTP streaming are not
implemented.

```typescript
const voiceService = new VoiceService({
  engineType: 'inworld',
  speaker: 'Ashley',
  apiKey: process.env.INWORLD_API_KEY,
  inworldModel: 'inworld-tts-2',
  inworldAudioEncoding: 'MP3',
  inworldSampleRateHertz: 48000,
});
```

Use `inworldApiUrl` to override the default
`https://api.inworld.ai/tts/v1/voice` endpoint. The `apiKey` value should be
the Inworld Basic Base64 authorization value. Do not expose Basic credentials
in browser-side code; use a backend proxy or Inworld JWT authentication for
browser apps.

Inworld On-Demand starts free and is suitable for development. For cost
savings, use TTS 1.5 Mini when minimizing cost; use TTS-2 or 1.5 Max when
prioritizing quality.

### Gradium
Gradium one-shot REST TTS support using direct `fetch` calls. This engine uses
the raw-audio response mode (`only_audio: true`) and does not add the Gradium
SDK.

```typescript
const voiceService = new VoiceService({
  engineType: 'gradium',
  speaker: 'YTpq7expH9539ERJ',
  apiKey: process.env.GRADIUM_API_KEY,
  gradiumOutputFormat: 'wav',
  gradiumTemperature: 0.7,
  gradiumVoiceSimilarity: 2,
  gradiumPaddingBonus: 0,
  gradiumRewriteRules: 'en',
});
```

Use `gradiumApiUrl` to override the default
`https://api.gradium.ai/api/post/speech/tts` endpoint. The `speaker` value is
sent as Gradium `voice_id`. The React example uses Gradium flagship voice
presets so browser users can select readable names while keeping the voice ID
as the submitted value. Gradium's voice-list endpoint may require a server-side
call in browser apps because its CORS policy can differ from the TTS endpoint.

### OpenAI-Compatible TTS
OpenAI-compatible speech endpoints for self-hosted servers such as Kokoro FastAPI.

```typescript
const voiceService = new VoiceService({
  engineType: 'openaiCompatible',
  openAiCompatibleApiUrl: 'http://localhost:8880/v1/audio/speech',
  openAiCompatibleModel: 'your-model-id'
});
```

`speaker` is optional for compatible endpoints. When omitted, the request body
does not include a `voice` field.
`openAiCompatibleModel` should be set explicitly to a model name accepted by
your endpoint.

### MiniMax
Multi-language TTS supporting 24 languages with HD quality.

```typescript
const voiceService = new VoiceService({
  engineType: 'minimax',
  speaker: 'male-qn-qingse',
  apiKey: 'your-minimax-api-key',
  groupId: 'your-group-id', // Required for MiniMax
  endpoint: 'global' // or 'china'
});
```

**Note**: MiniMax requires both API key and GroupId for authentication. The GroupId is used for user group management, usage tracking, and billing.

### AivisSpeech
AI-powered speech synthesis with natural voice quality.

```typescript
const voiceService = new VoiceService({
  engineType: 'aivisSpeech',
  speaker: '888753760',
  aivisSpeechApiUrl: 'http://localhost:10101'
});
```

### Aivis Cloud

High-quality cloud-based TTS service with advanced SSML support and streaming capabilities.

```typescript
const voiceService = new VoiceService({
  engineType: 'aivisCloud',
  speaker: 'unused', // Not used when model UUID is specified
  apiKey: 'your-aivis-cloud-api-key',
  aivisCloudModelUuid: 'a59cb814-0083-4369-8542-f51a29e72af7', // Required
  
  // Optional advanced settings
  aivisCloudSpeakerUuid: 'speaker-uuid', // For multi-speaker models
  aivisCloudStyleId: 0, // Or use aivisCloudStyleName: 'ノーマル'
  aivisCloudUseSSML: true, // Enable SSML tags
  aivisCloudSpeakingRate: 1.0, // 0.5-2.0
  aivisCloudEmotionalIntensity: 1.0, // 0.0-2.0
  aivisCloudOutputFormat: 'mp3', // wav, flac, mp3, aac, opus
  aivisCloudOutputSamplingRate: 44100, // Hz
});
```

**Key Features**:
- **SSML Support**: Rich markup for prosody, breaks, aliases, and emotions
- **Streaming Audio**: Real-time audio generation and delivery  
- **Multiple Formats**: WAV, FLAC, MP3, AAC, Opus output
- **Emotion Control**: Fine-grained emotional intensity settings
- **High Quality**: Professional-grade voice synthesis

### Gemini TTS
Gemini API text-to-speech with Gemini preview TTS models, including
`gemini-3.1-flash-tts-preview`, and simple API key authentication.

```typescript
const voiceService = new VoiceService({
  engineType: 'geminiTts',
  speaker: 'Zephyr',
  apiKey: 'your-google-api-key',
  geminiTtsModel: 'gemini-3.1-flash-tts-preview',
  geminiTtsLanguageCode: 'ja-JP',
  geminiTtsPrompt: 'Speak in a cheerful tone', // Optional style or audio-tag instruction
  geminiTtsApiUrl:
    'https://generativelanguage.googleapis.com/v1beta', // Optional Gemini API base URL
});
```

**Note**: Use a standard Google API key. `apiKey` is sent as
`x-goog-api-key` to the Gemini API. Available voices include Zephyr, Aoede,
Kore, Puck, Charon, and 25+ more prebuilt voices.

### None (Silent Mode)
No audio output - useful for testing or text-only scenarios.

```typescript
const voiceService = new VoiceService({
  engineType: 'none'
});
```

## Emotion-Aware Speech

The library supports emotion tags in text for more expressive speech:

```typescript
// Emotion tags are automatically detected and processed
await voiceService.speak({ 
  text: '[happy] Great to see you today!' 
});

await voiceService.speak({ 
  text: '[sad] I will miss you...' 
});

await voiceService.speak({ 
  text: '[angry] This is unacceptable!' 
});

// Supported emotions vary by engine
// Common emotions: happy, sad, angry, surprised, neutral
```

The emotion system works by:
1. Extracting emotion tags from the text
2. Converting text to screenplay format with emotion metadata
3. Passing emotion information to engines that support it
4. Falling back gracefully for engines without emotion support

## Browser Compatibility

The library includes built-in browser audio playback support:

```typescript
// Option 1: Default browser playback
const voiceService = new VoiceService({
  engineType: 'openai',
  speaker: 'alloy',
  apiKey: 'your-api-key'
  // Audio will play automatically in the browser
});

// Option 2: Custom audio handling
const voiceService = new VoiceService({
  engineType: 'voicevox',
  speaker: '1',
  onPlay: async (audioBuffer: ArrayBuffer) => {
    // Custom audio playback logic
    const audioContext = new AudioContext();
    const audioBufferSource = audioContext.createBufferSource();
    // ... handle audio playback
  }
});

// Option 3: Specify HTML audio element
const voiceService = new VoiceService({
  engineType: 'voicevox',
  speaker: '1',
  voicevoxApiUrl: 'http://localhost:50021',
  audioElementId: 'my-audio-player' // ID of <audio> element
});
```

## Advanced Configuration

### Dynamic Engine Switching

```typescript
const voiceAdapter = new VoiceEngineAdapter({
  engineType: 'voicevox',
  speaker: '1'
});

// Update options within the same engine
voiceAdapter.updateOptions({
  speaker: '3',
  voicevoxSpeedScale: 1.1,
});

// Switch to a different engine at runtime
voiceAdapter.switchEngine({
  engineType: 'openai',
  speaker: 'nova',
  apiKey: 'your-openai-api-key'
});

// Backward compatibility:
// updateOptions with engineType is still accepted.
voiceAdapter.updateOptions({
  engineType: 'openai',
  speaker: 'nova',
  apiKey: 'your-openai-api-key'
});
```

### Custom Endpoints

```typescript
// For self-hosted or custom TTS servers
const voiceService = new VoiceService({
  engineType: 'voicevox',
  speaker: '1',
  voicevoxApiUrl: 'https://my-custom-voicevox-server.com'
});
```

### Engine Parameter Overrides

`VoiceServiceOptions` (see [API Reference](#voiceserviceoptions)) now covers a consistent set of overrides for each engine. Below is a field-by-field summary to help you discover the right property without scanning the entire interface.

```typescript
const voiceService = new VoiceService({
  engineType: 'voicevox',
  speaker: '1',
  openAiSpeed: 1.15,
  openAiCompatibleModel: 'your-model-id',
  openAiCompatibleSpeed: 1.1,
  unrealSpeechBitrate: '192k',
  unrealSpeechSpeed: 0,
  unrealSpeechPitch: 1,
  elevenLabsModel: 'eleven_multilingual_v2',
  elevenLabsStability: 0.5,
  elevenLabsSimilarityBoost: 0.75,
  inworldModel: 'inworld-tts-2',
  inworldAudioEncoding: 'MP3',
  inworldSampleRateHertz: 48000,
  gradiumOutputFormat: 'wav',
  gradiumTemperature: 0.7,
  gradiumVoiceSimilarity: 2,
  voicevoxSpeedScale: 1.1,
  voicevoxPitchScale: 0.05,
  voicevoxIntonationScale: 1.2,
  voicevoxQueryParameters: { pauseLength: 0.3, outputSamplingRate: 44100 },
  minimaxVoiceSettings: { speed: 1.05, vol: 1.1, pitch: 2 },
  minimaxAudioSettings: { sampleRate: 44100, format: 'mp3' },
  aivisSpeechSpeedScale: 1.05,
  aivisCloudSpeakingRate: 1.1,
  aivisCloudVolume: 1.05,
});
```

> Tip: the React example in `packages/voice/examples/react-basic` exposes the same controls with collapsible cards + sliders, making it easy to try values before applying them in code.

#### Engine parameter reference

- **OpenAI TTS**
  - `openAiModel`
  - `openAiSpeed`

- **OpenAI-Compatible TTS**
  - Endpoint: `openAiCompatibleApiUrl`
  - Optional voice: `speaker`
  - `openAiCompatibleModel`
  - `openAiCompatibleSpeed`

- **xAI TTS**
  - `xaiLanguage`
  - `xaiCodec`
  - `xaiSampleRate`
  - `xaiBitRate`

- **Unreal Speech**
  - Endpoint: `unrealSpeechApiUrl`
  - Output: `unrealSpeechBitrate`, `unrealSpeechCodec`
  - Voice controls: `unrealSpeechSpeed`, `unrealSpeechPitch`, `unrealSpeechTemperature`

- **ElevenLabs**
  - Endpoint: `elevenLabsApiUrl`
  - Identity/output: `speaker`, `elevenLabsModel`, `elevenLabsOutputFormat`, `elevenLabsLanguageCode`
  - Voice settings: `elevenLabsVoiceSettings`, `elevenLabsStability`, `elevenLabsSimilarityBoost`, `elevenLabsStyle`, `elevenLabsUseSpeakerBoost`, `elevenLabsSpeed`
  - Context/normalization: `elevenLabsSeed`, `elevenLabsPreviousText`, `elevenLabsNextText`, `elevenLabsApplyTextNormalization`, `elevenLabsApplyLanguageTextNormalization`, `elevenLabsEnableLogging`

- **Inworld**
  - Endpoint: `inworldApiUrl`
  - Identity/output: `speaker`, `inworldModel`, `inworldAudioEncoding`, `inworldSampleRateHertz`, `inworldBitRate`
  - Voice controls: `inworldSpeakingRate`, `inworldLanguage`, `inworldDeliveryMode`, `inworldTemperature`

- **Gradium**
  - Endpoint: `gradiumApiUrl`
  - Identity/output: `speaker`, `gradiumOutputFormat`
  - Voice controls: `gradiumTemperature`, `gradiumVoiceSimilarity`, `gradiumPaddingBonus`, `gradiumRewriteRules`

- **VOICEVOX**
  - Endpoint: `voicevoxApiUrl`
  - Scalars: `voicevoxSpeedScale`, `voicevoxPitchScale`, `voicevoxIntonationScale`, `voicevoxVolumeScale`
  - Timing: `voicevoxPrePhonemeLength`, `voicevoxPostPhonemeLength`, `voicevoxPauseLength`, `voicevoxPauseLengthScale`
  - Output: `voicevoxOutputSamplingRate`, `voicevoxOutputStereo`
  - Flags: `voicevoxEnableKatakanaEnglish`, `voicevoxEnableInterrogativeUpspeak`
  - Version: `voicevoxCoreVersion`
  - Low-level overrides: `voicevoxQueryParameters`

- **AivisSpeech**
  - Endpoint: `aivisSpeechApiUrl`
  - Scalars: `aivisSpeechSpeedScale`, `aivisSpeechPitchScale`, `aivisSpeechIntonationScale`, `aivisSpeechTempoDynamicsScale`, `aivisSpeechVolumeScale`
  - Timing: `aivisSpeechPrePhonemeLength`, `aivisSpeechPostPhonemeLength`, `aivisSpeechPauseLength`, `aivisSpeechPauseLengthScale`
  - Output: `aivisSpeechOutputSamplingRate`, `aivisSpeechOutputStereo`
  - Low-level overrides: `aivisSpeechQueryParameters`

- **Aivis Cloud**
  - Identity: `aivisCloudModelUuid`, `aivisCloudSpeakerUuid`, `aivisCloudStyleId`, `aivisCloudStyleName`, `aivisCloudUserDictionaryUuid`
  - Behaviour: `aivisCloudUseSSML`, `aivisCloudLanguage`, `aivisCloudSpeakingRate`, `aivisCloudEmotionalIntensity`, `aivisCloudTempoDynamics`, `aivisCloudPitch`, `aivisCloudVolume`
  - Silence: `aivisCloudLeadingSilence`, `aivisCloudTrailingSilence`, `aivisCloudLineBreakSilence`
  - Output: `aivisCloudOutputFormat`, `aivisCloudOutputBitrate`, `aivisCloudOutputSamplingRate`, `aivisCloudOutputChannels`
  - Logging: `aivisCloudEnableBillingLogs`

- **VoicePeak**
  - Endpoint: `voicepeakApiUrl`
  - Emotion: `voicepeakEmotion` (single tag or weighted map)
  - Scalars: `voicepeakSpeed`, `voicepeakPitch`

- **MiniMax**
  - Identity: `groupId`, `endpoint`, `minimaxModel`, `minimaxLanguageBoost`
  - Voice overrides: `minimaxVoiceSettings` or individual `minimaxSpeed`, `minimaxVolume`, `minimaxPitch`
  - Audio overrides: `minimaxAudioSettings` or individual `minimaxSampleRate`, `minimaxBitrate`, `minimaxAudioFormat`, `minimaxAudioChannel`

### Error Handling

```typescript
try {
  await voiceService.speak({ text: 'Hello!' });
} catch (error) {
  if (error.message.includes('API key')) {
    console.error('Invalid API key');
  } else if (error.message.includes('network')) {
    console.error('Network error - check your connection');
  } else {
    console.error('TTS error:', error);
  }
}
```

## Engine-Specific Features

### VOICEVOX Features
- Multiple character voices with unique personalities
- Adjustable speech parameters (speed, pitch, intonation)
- Local server support for privacy

### OpenAI TTS Features
- High-quality multilingual support
- Multiple voice personalities
- Optimized for conversational AI

### xAI TTS Features
- Cloud TTS endpoint with Bearer token authentication
- Passes `speaker` through to `voice_id` as provided
- Configurable codec, sample rate, and MP3 bitrate

### Unreal Speech Features
- Cloud TTS endpoint with Bearer token authentication
- Passes `speaker` through to `VoiceId` as provided
- Configurable bitrate, codec, speed, pitch, and temperature
- Uses the v8 `/stream` API, which returns audio bytes directly

### ElevenLabs Features
- Cloud TTS endpoint with `xi-api-key` authentication
- Passes `speaker` through to `voice_id` as provided
- Configurable model, output format, language code, and voice settings
- Supports optional text context, seed, text normalization, and logging flags

### Inworld Features
- Cloud TTS endpoint with Basic authentication
- Passes `speaker` through to `voiceId` as provided
- Configurable model, audio encoding, sample rate, bit rate, speaking rate, language, delivery mode, and temperature
- Uses the non-streaming REST API and decodes the returned `audioContent`

### Gradium Features
- Cloud TTS endpoint with `x-api-key` authentication
- Passes `speaker` through to `voice_id` as provided
- Configurable output format and `json_config` controls for temperature, voice similarity, speed, and rewrite rules
- Flagship voice presets provide readable names for browser speaker selectors

### MiniMax Features
- 24 language support with automatic detection
- HD quality audio output
- Dual-region endpoints (global/china)
- Advanced emotion synthesis

### Gemini TTS Features
- Gemini API-based high-quality voice synthesis
- 30+ voice options (star/moon themed names)
- Prompt-based style/tone control
- Simple API key authentication with `x-goog-api-key`
- Configurable Gemini API base URL
- 24+ language support including Japanese

## Integration with AITuber OnAir Core

While this package can be used independently, it integrates seamlessly with [@aituber-onair/core](https://www.npmjs.com/package/@aituber-onair/core):

```typescript
import { AITuberOnAirCore } from '@aituber-onair/core';

const core = new AITuberOnAirCore({
  apiKey: 'your-openai-key',
  voiceOptions: {
    engineType: 'voicevox',
    speaker: '1',
    voicevoxApiUrl: 'http://localhost:50021'
  }
});

// Voice synthesis is handled automatically
await core.processChat('Hello!');
```

## API Reference

### VoiceServiceOptions

```typescript
type VoiceServiceOptions =
  | VoiceVoxVoiceServiceOptions
  | VoicePeakVoiceServiceOptions
  | OpenAiVoiceServiceOptions
  | XaiVoiceServiceOptions
  | UnrealSpeechVoiceServiceOptions
  | ElevenLabsVoiceServiceOptions
  | InworldVoiceServiceOptions
  | GradiumVoiceServiceOptions
  | GeminiTtsVoiceServiceOptions
  | OpenAiCompatibleVoiceServiceOptions
  | AivisSpeechVoiceServiceOptions
  | AivisCloudVoiceServiceOptions
  | MinimaxVoiceServiceOptions
  | PiperPlusVoiceServiceOptions
  | NoneVoiceServiceOptions;
```

`VoiceServiceOptions` is a discriminated union keyed by `engineType`.
Use `updateOptions(...)` for same-engine updates and `switchEngine(...)`
for cross-engine changes.
For backward compatibility, cross-engine fields in `updateOptions(...)`
are still accepted.

### VoiceService Methods

```typescript
interface VoiceService {
  speak(screenplay: ChatScreenplay, options?: AudioPlayOptions): Promise<void>;
  speakText(text: string, options?: AudioPlayOptions): Promise<void>;
  isPlaying(): boolean;
  stop(): void;
  updateOptions(
    options: VoiceServiceOptionsUpdate | Partial<VoiceServiceOptions>
  ): void;
  switchEngine?(options: VoiceServiceOptions): void;
}
```

### Screenplay Format

```typescript
interface Screenplay {
  emotion?: string;
  text: string;
  speechText?: string;
}
```

## Examples

### React Integration

See the [React example](./examples/react-basic) for a complete implementation:

```typescript
import { useState } from 'react';
import { VoiceService } from '@aituber-onair/voice';

function VoiceDemo() {
  const [voiceService] = useState(
    () => new VoiceService({
      engineType: 'openai',
      speaker: 'alloy',
      apiKey: 'your-api-key'
    })
  );

  const handleSpeak = async (text: string) => {
    await voiceService.speak({ text });
  };

  return (
    <button onClick={() => handleSpeak('[happy] Hello!')}>
      Speak with emotion
    </button>
  );
}
```

### Node.js Usage

The voice package now fully supports Node.js environments with automatic environment detection:

```typescript
import { VoiceEngineAdapter } from '@aituber-onair/voice';

const voiceService = new VoiceEngineAdapter({
  engineType: 'openai',
  speaker: 'nova',
  apiKey: process.env.OPENAI_API_KEY
});

// Audio will be played using available Node.js audio libraries
await voiceService.speak({ text: 'Hello from Node.js!' });
```

#### Audio Playback in Node.js

For audio playback in Node.js, install one of these optional dependencies:

```bash
# Option 1: speaker (native bindings, better quality)
npm install speaker

# Option 2: play-sound (uses system audio player, easier to install)
npm install play-sound
```

If neither is installed, the package will still work but won't play audio. You can still use the `onPlay` callback to handle audio data:

```typescript
const voiceService = new VoiceEngineAdapter({
  engineType: 'voicevox',
  speaker: '1',
  voicevoxApiUrl: 'http://localhost:50021',
  onPlay: async (audioBuffer) => {
    // Save to file or process audio data
    writeFileSync('output.wav', Buffer.from(audioBuffer));
  }
});
```

The package automatically detects the environment and uses the appropriate audio player:
- **Browser**: Uses HTMLAudioElement
- **Node.js**: Uses speaker or play-sound if available, otherwise silent

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
