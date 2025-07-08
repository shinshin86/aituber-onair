# Deno Examples

This directory contains examples demonstrating how to use `@aituber-onair/voice` package in Deno environments.

## Files Overview

- **`index.ts`** - Basic setup and configuration example
- **`voicevox-example.ts`** - VOICEVOX TTS engine example
- **`aivis-speech-example.ts`** - AivisSpeech TTS engine example
- **`voicepeak-example.ts`** - VoicePeak TTS engine example
- **`.gitignore`** - Ignores generated audio files

## Prerequisites

### 1. Build the Voice Package

From the voice package root directory:

```bash
npm run build
```

### 2. Deno Installation

Install Deno from: https://deno.land/

## Running Examples

### Basic Example

Tests basic setup and configuration:

```bash
deno run --allow-net --allow-read index.ts
```

**Permissions**:
- `--allow-net`: Required for fetch API
- `--allow-read`: Required for reading dist files

### VOICEVOX Example

```bash
# 1. Start VOICEVOX server on http://localhost:50021
# 2. Run the example
deno run --allow-net --allow-write voicevox-example.ts
```

### AivisSpeech Example

```bash
# 1. Start AivisSpeech server on http://localhost:10101
# 2. Run the example
deno run --allow-net --allow-write aivis-speech-example.ts
```

### VoicePeak Example

```bash
# 1. Start VoicePeak server on http://localhost:20202
# 2. Run the example
deno run --allow-net --allow-write voicepeak-example.ts
```

**Additional permission**:
- `--allow-write`: Required for saving audio files

## Deno Environment Notes

### Audio Playback Limitations

**Important**: Deno currently has limitations with Node.js native audio libraries.

- Audio files are generated correctly ✅
- Direct speaker playback is not supported ❌
- Limitation caused by:
  - Native binary compatibility issues with `speaker`/`play-sound` packages
  - Deno's security model restrictions  
  - Different module resolution system compared to Node.js
- **Workaround**: Use external audio players to play generated files (see "Playing Generated Audio" section below)

### Runtime Detection

```typescript
// Deno is detected as:
{
  runtime: "deno",
  isDeno: true,
  hasWindow: true,
  hasDocument: false
}
```

### File Operations

Deno uses different APIs for file operations:

```typescript
// Node.js
fs.writeFileSync(path, Buffer.from(audioBuffer));

// Deno
await Deno.writeFile(path, new Uint8Array(audioBuffer));
```

## Generated Files

Examples will generate audio files in the current directory:
- `voicevox-output.wav`, `voicevox-happy.wav`, etc.
- `aivis-output.wav`, `aivis-happy.wav`, etc.
- `voicepeak-output.wav`, `voicepeak-happy.wav`, etc.

## Playing Generated Audio

Since Deno has limited audio playback support, use system tools:

### macOS
```bash
afplay filename.wav
```

### Linux
```bash
aplay filename.wav
```

### Windows
```bash
start filename.wav
```

## Troubleshooting

### Permission Errors
Make sure to include all required permissions:
- `--allow-net` for API calls
- `--allow-read` for reading package files
- `--allow-write` for saving audio files

### Module Resolution
If you encounter import errors, ensure the package is built:
```bash
cd ../../ && npm run build
```