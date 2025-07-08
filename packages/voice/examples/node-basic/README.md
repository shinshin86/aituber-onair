# Node.js Examples

This directory contains examples demonstrating how to use `@aituber-onair/voice` package in Node.js environments.

## Files Overview

- **`index.js`** - Basic setup and configuration example
- **`voicevox-example.js`** - VOICEVOX TTS engine example
- **`aivis-speech-example.js`** - AivisSpeech TTS engine example
- **`voicepeak-example.js`** - VoicePeak TTS engine example
- **`test-speaker-playback.js`** - Cross-engine speaker playback test
- **`.gitignore`** - Ignores generated audio files

## Prerequisites

### 1. Build the Voice Package

From the voice package root directory:

```bash
npm run build
```

### 2. Optional Audio Dependencies

For audio playback in Node.js, install one of these optional dependencies:

```bash
# Option 1: speaker (direct audio output, requires build tools)
npm install speaker

# Option 2: play-sound (uses system audio player, easier to install)
npm install play-sound
```

**Note**: If neither is installed, examples will still work but won't play audio through speakers. Audio files can still be saved using the `onPlay` callback.

## Running Examples

### Basic Example

Tests basic setup and configuration without requiring external services:

```bash
node examples/node-basic/index.js
```

**Output**: Runtime detection, silent mode test, and setup instructions.

### VOICEVOX Example

Tests with VOICEVOX TTS engine:

```bash
# 1. First, install and start VOICEVOX server
# Download from: https://voicevox.hiroshiba.jp/
# Start the server (default: http://localhost:50021)

# 2. Run the example
node examples/node-basic/voicevox-example.js
```

**Features**:
- Silent mode test (no dependencies)
- Audio file generation and saving
- Direct speaker playback (if audio libraries installed)
- Emotion support (`[happy]`, `[sad]`, etc.)

### AivisSpeech Example

Tests with AivisSpeech TTS engine:

```bash
# 1. First, install and start AivisSpeech server
# Default URL: http://localhost:10101

# 2. Run the example
node examples/node-basic/aivis-speech-example.js
```

**Features**:
- Basic connectivity test
- Audio file generation with default speaker (888753760)
- Multiple emotion tests

### VoicePeak Example

Tests with VoicePeak TTS engine:

```bash
# 1. First, install and start VoicePeak server
# Default URL: http://localhost:20202

# 2. Run the example
node examples/node-basic/voicepeak-example.js
```

**Features**:
- Server connectivity verification
- Audio file generation with speaker f1
- Speaker playback testing
- Emotion expression tests

### Cross-Engine Speaker Test

Tests speaker playback across all engines:

```bash
# Requires all servers to be running
node examples/node-basic/test-speaker-playback.js
```

**Features**:
- Tests VOICEVOX, AivisSpeech, and VoicePeak
- Verifies dynamic audio format detection
- Confirms speaker playback functionality

## Generated Files

Examples will generate audio files in this directory:
- `test-output.wav` (VOICEVOX example)
- `aivis-output.wav` (AivisSpeech example)
- `aivis-happy.wav`, `aivis-sad.wav`, `aivis-angry.wav` (AivisSpeech emotion tests)
- `voicepeak-output.wav` (VoicePeak example)
- `voicepeak-happy.wav`, `voicepeak-sad.wav`, `voicepeak-angry.wav` (VoicePeak emotion tests)

These files are automatically ignored by git.

## Playing Generated Audio

### macOS
```bash
afplay filename.wav
```

### Linux
```bash
aplay filename.wav      # For WAV files
mpg123 filename.mp3     # For MP3 files
```

### Windows
```bash
start filename.wav
```

## Troubleshooting

### "fetch failed" errors
- Make sure the TTS server is running on the correct port
- Check firewall settings
- Verify the API endpoint URL

### "No audio output"
- Install speaker or play-sound dependencies
- Check system audio settings
- Use `onPlay` callback to save files instead

### "Module not found" errors
- Make sure to build the package first: `npm run build`
- Run examples from the voice package root directory

## Environment Detection

The package automatically detects the runtime environment:
- **Browser**: Uses HTMLAudioElement
- **Node.js**: Uses speaker/play-sound libraries or silent mode
- **Deno**: Uses browser-like APIs
- **Bun**: Uses Node.js-compatible APIs