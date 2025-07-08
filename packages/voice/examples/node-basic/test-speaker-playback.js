/**
 * Test speaker playback for both VOICEVOX and AivisSpeech
 */
const { VoiceEngineAdapter } = require('../../dist/cjs/index.js');

async function testSpeakerPlayback() {
  console.log('=== Speaker Playback Test ===\n');

  // Test 1: VOICEVOX speaker playback
  console.log('1. Testing VOICEVOX speaker playback...');
  try {
    const voicevoxService = new VoiceEngineAdapter({
      engineType: 'voicevox',
      speaker: '46',
      voicevoxApiUrl: 'http://localhost:50021',
      onComplete: () => {
        console.log('✓ VOICEVOX playback completed');
      }
    });

    await voicevoxService.speakText('VOICEVOXのスピーカーテストです。');
    console.log('✓ VOICEVOX speaker test passed\n');
  } catch (error) {
    console.error('❌ VOICEVOX speaker test failed:', error.message, '\n');
  }

  // Test 2: AivisSpeech speaker playback  
  console.log('2. Testing AivisSpeech speaker playback...');
  try {
    const aivisService = new VoiceEngineAdapter({
      engineType: 'aivisSpeech',
      speaker: '888753760',
      aivisSpeechApiUrl: 'http://localhost:10101',
      onComplete: () => {
        console.log('✓ AivisSpeech playback completed');
      }
    });

    await aivisService.speakText('AivisSpeechのスピーカーテストです。');
    console.log('✓ AivisSpeech speaker test passed\n');
  } catch (error) {
    console.error('❌ AivisSpeech speaker test failed:', error.message, '\n');
  }

  // Test 3: VoicePeak speaker playback
  console.log('3. Testing VoicePeak speaker playback...');
  try {
    const voicepeakService = new VoiceEngineAdapter({
      engineType: 'voicepeak',
      speaker: 'f1',
      voicepeakApiUrl: 'http://localhost:20202',
      onComplete: () => {
        console.log('✓ VoicePeak playback completed');
      }
    });

    await voicepeakService.speakText('VoicePeakのスピーカーテストです。');
    console.log('✓ VoicePeak speaker test passed\n');
  } catch (error) {
    console.error('❌ VoicePeak speaker test failed:', error.message, '\n');
  }

  console.log('=== Test Summary ===');
  console.log('If all tests show "playback completed", the fix is working!');
  console.log('You should hear audio from VOICEVOX, AivisSpeech, and VoicePeak.');
}

testSpeakerPlayback().catch(console.error);