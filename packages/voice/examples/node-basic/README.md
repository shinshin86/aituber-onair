# Node.js Basic Example

This example demonstrates how to use `@aituber-onair/voice` package in a Node.js environment.

## Running the Example

```bash
# From the voice package root directory
node examples/node-basic/index.js
```

## Audio Playback in Node.js

The voice package supports audio playback in Node.js through optional dependencies:

1. **speaker** - Direct audio output using native bindings
2. **play-sound** - Uses system audio players (mpg123, afplay, etc.)

To enable audio playback, install one of these:

```bash
# Option 1: speaker (requires build tools)
npm install speaker

# Option 2: play-sound (easier to install)
npm install play-sound
```

If neither is installed, the package will still work but won't play audio.

## Testing with VOICEVOX

To test actual speech synthesis:

1. Install VOICEVOX locally
2. Start VOICEVOX server (default port: 50021)
3. Uncomment the speech test in index.js
4. Run the example

## Environment Detection

The package automatically detects the environment:
- In browsers: Uses HTMLAudioElement
- In Node.js: Uses available audio libraries or silent mode