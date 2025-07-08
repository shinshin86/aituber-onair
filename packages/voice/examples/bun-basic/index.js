/**
 * Basic example of using @aituber-onair/voice in Bun environment
 * This example demonstrates basic setup and configuration.
 *
 * Run with: bun run index.js
 */
import {
  AudioPlayerFactory,
  VoiceEngineAdapter,
} from '../../dist/cjs/index.js';

async function main() {
  console.log('=== AITuber OnAir Voice - Basic Bun Example ===\n');

  // Show runtime information
  const runtimeInfo = AudioPlayerFactory.getRuntimeInfo();
  console.log('Runtime information:');
  console.log(`- Environment: ${runtimeInfo.runtime}`);
  console.log(`- Bun: ${runtimeInfo.isBun}`);
  console.log(`- Has process: ${runtimeInfo.hasProcess}`);
  console.log(`- Bun version: ${Bun.version}\n`);

  // Create voice service with VOICEVOX
  const voiceOptions = {
    speaker: '46', // VOICEVOX speaker ID
    engineType: 'voicevox',
    voicevoxApiUrl: 'http://localhost:50021',
    onComplete: () => {
      console.log('✓ Speech completed');
    },
  };

  try {
    // Create voice adapter
    const voiceService = new VoiceEngineAdapter(voiceOptions);
    console.log('✓ VoiceEngineAdapter created successfully');

    // Check playing status
    console.log(`✓ isPlaying: ${voiceService.isPlaying()}`);

    // Test silent mode (no VOICEVOX required)
    console.log('\nTesting silent mode...');
    const silentService = new VoiceEngineAdapter({
      engineType: 'none',
      speaker: 'default',
    });
    await silentService.speakText('This is a silent test - no audio output');
    console.log('✓ Silent mode test passed');

    console.log('\n📌 Advantages of Bun:');
    console.log('- Node.js compatible environment');
    console.log('- Uses NodeAudioPlayer with speaker/play-sound support');
    console.log('- Faster execution than Node.js');
    console.log('- Native TypeScript support (can run .ts files directly)');
    console.log('- Built-in SQLite, WebSocket, and more');

    console.log('\n📌 To test with TTS engines:');
    console.log('1. Run VOICEVOX, AivisSpeech, or VoicePeak servers');
    console.log('2. Run the specific example files');
    console.log(
      '3. Optional: Install speaker or play-sound for audio playback',
    );

    console.log('\n✅ Basic setup verified successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
