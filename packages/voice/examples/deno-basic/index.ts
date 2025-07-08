/**
 * Basic example of using @aituber-onair/voice in Deno environment
 * This example demonstrates basic setup and configuration.
 *
 * Run with: deno run --allow-net --allow-read index.ts
 */
// @ts-ignore
const { VoiceEngineAdapter } = await import('../../dist/cjs/index.js');

async function main() {
  console.log('=== AITuber OnAir Voice - Basic Deno Example ===\n');

  // Show runtime information
  console.log('Runtime information:');
  console.log(`- Environment: Deno`);
  console.log(`- Has window: ${typeof window !== 'undefined'}`);
  console.log(`- Deno version: ${Deno.version.deno}\n`);

  // Create voice service with VOICEVOX
  const voiceOptions = {
    speaker: '46', // VOICEVOX speaker ID
    engineType: 'voicevox' as const,
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

    console.log('\n📌 Important Notes for Deno:');
    console.log('- Deno has a browser-like environment with window object');
    console.log('- Uses BrowserAudioPlayer for audio playback');
    console.log('- Audio playback may require browser context or be limited');
    console.log('- File operations require --allow-write permission');

    console.log('\n📌 To test with TTS engines:');
    console.log('1. Run VOICEVOX, AivisSpeech, or VoicePeak servers');
    console.log('2. Run the specific example files');

    console.log('\n✅ Basic setup verified successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
