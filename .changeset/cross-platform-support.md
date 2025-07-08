---
"@aituber-onair/voice": minor
---

feat: implement comprehensive cross-platform runtime support and dual package compatibility

This update brings significant improvements to the voice package, making it compatible with multiple JavaScript runtimes and module systems:

**Cross-Platform Runtime Support:**
- Full Node.js support with dynamic audio format detection
- Bun runtime compatibility with fast execution
- Deno runtime support (file output with external playback)
- Browser environment with HTMLAudioElement support

**Dual Package Architecture:**
- CommonJS build for Node.js-like environments
- ESModule build for modern browsers and bundlers
- Automatic format selection based on import method
- Maintains full backward compatibility

**Audio Engine Improvements:**
- Dynamic WAV header parsing for sample rate detection
- Support for 24000Hz, 44100Hz, and 48000Hz audio formats
- Fixed audio playback issues across different TTS engines
- Unified audio player interface with runtime-specific implementations

**Developer Experience:**
- Comprehensive examples for each runtime environment
- Optional audio dependency installation (no breaking installs)
- Updated Node.js import protocols for lint compliance
- Improved documentation with runtime-specific guidance

**Technical Details:**
- Removed optionalDependencies to prevent CI failures
- Audio libraries (speaker, play-sound) now require manual installation
- Fixed Transfer-Encoding header issues with Node.js fetch
- Enhanced error handling and format validation