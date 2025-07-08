/**
 * VOICEVOX example for @aituber-onair/voice in Node.js
 * This example demonstrates:
 * - Silent mode testing (no dependencies required)
 * - Saving audio to file using onPlay callback
 * - Direct audio playback through speakers
 *
 * Requirements:
 * - VOICEVOX server running on http://localhost:50021
 * - Optional: npm install speaker OR npm install play-sound
 */
const {
  VoiceEngineAdapter,
  AudioPlayerFactory,
} = require('../../dist/cjs/index.js');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('=== AITuber OnAir Voice - VOICEVOX Example ===\n');

  // Show runtime info
  const runtimeInfo = AudioPlayerFactory.getRuntimeInfo();
  console.log(`Runtime: ${runtimeInfo.runtime}`);
  console.log();

  // Test 1: Basic usage without audio playback
  console.log('=== Test 1: Basic usage without VOICEVOX ===');
  try {
    const voiceService1 = new VoiceEngineAdapter({
      speaker: '46',
      engineType: 'none', // Silent mode for testing
      onComplete: () => {
        console.log('✓ Silent speech completed');
      },
    });

    await voiceService1.speakText('This is a silent test');
    console.log('✓ Test 1 passed\n');
  } catch (error) {
    console.error('❌ Test 1 failed:', error.message, '\n');
  }

  // Test 2: Save audio to file using onPlay callback
  console.log('=== Test 2: Using onPlay callback ===');
  try {
    const outputPath = path.join(__dirname, 'test-output.wav');

    const voiceService2 = new VoiceEngineAdapter({
      speaker: '46',
      engineType: 'voicevox',
      voicevoxApiUrl: 'http://localhost:50021',
      onPlay: async (audioBuffer) => {
        // Save audio to file instead of playing
        console.log(
          `✓ Received audio buffer (${audioBuffer.byteLength} bytes)`,
        );
        fs.writeFileSync(outputPath, Buffer.from(audioBuffer));
        console.log(`✓ Audio saved to: ${outputPath}`);
      },
      onComplete: () => {
        console.log('✓ Processing completed');
      },
    });

    console.log('Attempting to generate speech with VOICEVOX...');
    console.log(
      '(Make sure VOICEVOX server is running on http://localhost:50021)',
    );

    await voiceService2.speakText(
      '[happy] こんにちは！Node.jsから音声合成のテストです。',
    );
    console.log('✓ Test 2 passed\n');
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
    console.error(
      'Make sure VOICEVOX server is running on http://localhost:50021\n',
    );
  }

  // Test 3: Test with actual audio playback (if audio libraries are installed)
  console.log('=== Test 3: Audio playback test ===');

  // Check if audio libraries are available
  let hasAudioLibrary = false;
  try {
    require('speaker');
    console.log('✓ Found "speaker" library');
    hasAudioLibrary = true;
  } catch (e) {
    try {
      require('play-sound');
      console.log('✓ Found "play-sound" library');
      hasAudioLibrary = true;
    } catch (e2) {
      console.log('ℹ No audio playback library found (speaker or play-sound)');
    }
  }

  if (hasAudioLibrary) {
    try {
      const voiceService3 = new VoiceEngineAdapter({
        speaker: '46',
        engineType: 'voicevox',
        voicevoxApiUrl: 'http://localhost:50021',
        onComplete: () => {
          console.log('✓ Audio playback completed');
        },
      });

      console.log('Attempting to play speech through speakers...');
      await voiceService3.speakText('音声再生のテストです。');
      console.log('✓ Test 3 passed\n');
    } catch (error) {
      console.error('❌ Test 3 failed:', error.message, '\n');
    }
  } else {
    console.log(
      'ℹ Skipping audio playback test (install speaker or play-sound to enable)\n',
    );
  }

  console.log('=== Summary ===');
  console.log('To enable all features:');
  console.log(
    '1. Install and run VOICEVOX server (https://voicevox.hiroshiba.jp/)',
  );
  console.log(
    '2. Install audio libraries: npm install speaker OR npm install play-sound',
  );
  console.log('3. Run this test again');
}

main().catch(console.error);
