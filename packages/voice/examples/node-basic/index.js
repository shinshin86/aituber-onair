/**
 * Basic example of using @aituber-onair/voice in Node.js environment
 * This example demonstrates basic setup and configuration.
 */
const {
  VoiceEngineAdapter,
  AudioPlayerFactory,
} = require('../../dist/cjs/index.js');

async function main() {
  console.log('=== AITuber OnAir Voice - Basic Node.js Example ===\n');

  // Show runtime information
  const runtimeInfo = AudioPlayerFactory.getRuntimeInfo();
  console.log('Runtime information:');
  console.log(`- Environment: ${runtimeInfo.runtime}`);
  console.log(`- Node.js: ${runtimeInfo.isNode}`);
  console.log(`- Has process: ${runtimeInfo.hasProcess}\n`);

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

    // Information about audio dependencies
    console.log('\n📌 Audio Playback Options:');
    console.log(
      '1. Install "speaker" for direct audio output: npm install speaker',
    );
    console.log(
      '2. Install "play-sound" for system player: npm install play-sound',
    );
    console.log(
      '3. Use onPlay callback to save audio files (no dependencies needed)',
    );

    console.log('\n📌 To test with VOICEVOX:');
    console.log(
      '1. Download and run VOICEVOX from https://voicevox.hiroshiba.jp/',
    );
    console.log('2. Run the advanced example: node test-with-speech.js');

    console.log('\n✅ Basic setup verified successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
