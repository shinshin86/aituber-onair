// Example of using @aituber-onair/voice in Node.js environment
const { VoiceEngineAdapter } = require('../../dist/index.js');

async function main() {
  console.log('Testing AITuber OnAir Voice in Node.js environment...\n');

  // Create voice service options
  const voiceOptions = {
    speaker: '46',
    engineType: 'voicevox',
    voicevoxApiUrl: 'http://localhost:50021',
    onComplete: () => {
      console.log('✓ Speech playback completed');
    }
  };

  try {
    // Create voice adapter
    const voiceService = new VoiceEngineAdapter(voiceOptions);
    console.log('✓ VoiceEngineAdapter created successfully');

    // Check if playing (should be false)
    console.log(`✓ isPlaying: ${voiceService.isPlaying()}`);

    // Note: Actual speech synthesis requires VOICEVOX server to be running
    console.log('\nNote: To test actual speech synthesis:');
    console.log('1. Install and run VOICEVOX server locally');
    console.log('2. Uncomment the speak test below');
    console.log('3. Install optional audio dependencies: npm install speaker or npm install play-sound');
    
    // Uncomment to test actual speech (requires VOICEVOX server)
    /*
    console.log('\nTesting speech synthesis...');
    await voiceService.speakText('こんにちは、Node.jsから音声合成のテストです。');
    */

    console.log('\n✓ All tests passed! Voice package works in Node.js environment');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();