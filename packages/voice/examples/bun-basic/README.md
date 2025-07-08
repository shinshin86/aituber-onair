# Bun Examples

This directory contains examples demonstrating how to use `@aituber-onair/voice` package in Bun environments.

## Files Overview

- **`index.js`** - Basic setup and configuration example
- **`voicevox-example.js`** - VOICEVOX TTS engine example
- **`aivis-speech-example.js`** - AivisSpeech TTS engine example
- **`voicepeak-example.js`** - VoicePeak TTS engine example
- **`.gitignore`** - Ignores generated audio files

## Prerequisites

### 1. Build the Voice Package

From the voice package root directory:

```bash
npm run build
```

### 2. Bun Installation

Install Bun from: https://bun.sh/

### 3. Audio Playback (Optional)

For speaker playback support, install one of these audio libraries:

```bash
# Install speaker package for real-time audio playback
bun install speaker

# Or install play-sound as an alternative
bun install play-sound
```

**Important**: Audio playback libraries are only needed when running in Node.js-like environments (Node.js, Bun). When using this package in web browsers, audio playback is handled automatically through the browser's Web Audio API.

## Running Examples

### Basic Example

Tests basic setup and configuration:

```bash
bun run index.js
```

### VOICEVOX Example

```bash
# 1. Start VOICEVOX server on http://localhost:50021
# 2. Run the example
bun run voicevox-example.js
```

### AivisSpeech Example

```bash
# 1. Start AivisSpeech server on http://localhost:10101
# 2. Run the example
bun run aivis-speech-example.js
```

### VoicePeak Example

```bash
# 1. Start VoicePeak server on http://localhost:20202
# 2. Run the example
bun run voicepeak-example.js
```

## Bun Environment Features

### Performance Benefits

- **Fast Startup**: Bun starts significantly faster than Node.js
- **Native APIs**: Built-in support for many Node.js APIs
- **TypeScript Support**: Can run `.ts` files directly without compilation
- **Optimized I/O**: Faster file operations

### Runtime Detection

```javascript
// Bun is detected as:
{
  runtime: "bun",
  isBun: true,
  hasProcess: true,
  hasWindow: false
}
```

### Audio Playback

Bun uses the `NodeAudioPlayer` with full support for:
- `speaker` module for real-time audio playback
- `play-sound` module as an alternative
- Dynamic audio format detection (24000Hz, 44100Hz, 48000Hz)

## Generated Files

Examples will generate audio files in the current directory:
- `voicevox-output.wav`, `voicevox-happy.wav`, etc.
- `aivis-output.wav`, `aivis-happy.wav`, etc.
- `voicepeak-output.wav`, `voicepeak-happy.wav`, etc.

## Playing Generated Audio

### Direct Playback (with speaker/play-sound installed)
The examples automatically play audio if speaker or play-sound is installed.

### Manual Playback
Use system tools if audio libraries are not installed:

#### macOS
```bash
afplay filename.wav
```

#### Linux
```bash
aplay filename.wav
```

#### Windows
```bash
start filename.wav
```

## Bun-Specific Features

### Native File APIs
```javascript
import { writeFileSync } from 'fs';
// Works exactly like Node.js
writeFileSync(path, Buffer.from(audioBuffer));
```

### Native Fetch
```javascript
// No polyfills needed
const response = await fetch(url);
```

### Import Meta
```javascript
// Get current directory
import.meta.dir  // Similar to __dirname
```

## Troubleshooting

### Audio Not Playing
1. Install speaker or play-sound module:
   ```bash
   bun install speaker
   # or
   bun install play-sound
   ```
2. Check if TTS server is running
3. Verify audio files are generated correctly

### Module Resolution
If you encounter import errors:
```bash
cd ../../ && npm run build
```

### Performance Comparison
Run the same example in Node.js and Bun to see performance differences:
```bash
# Node.js
node ../node-basic/index.js

# Bun
bun run index.js
```