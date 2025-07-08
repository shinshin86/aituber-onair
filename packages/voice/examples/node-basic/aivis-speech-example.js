/**
 * AivisSpeech example for @aituber-onair/voice in Node.js
 * This example demonstrates using AivisSpeech TTS engine.
 *
 * Requirements:
 * - AivisSpeech server running on http://localhost:10101
 * - Optional: npm install speaker OR npm install play-sound
 */
const { VoiceEngineAdapter } = require('../../dist/cjs/index.js');
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  console.log('=== AITuber OnAir Voice - AivisSpeech Example ===\n');

  // AivisSpeech configuration
  const aivisOptions = {
    engineType: 'aivisSpeech',
    speaker: '888753760', // Default AivisSpeech speaker ID
    aivisSpeechApiUrl: 'http://localhost:10101', // Default AivisSpeech server URL
    onComplete: () => {
      console.log('✓ Speech processing completed');
    },
  };

  // Test 1: Server connectivity check
  console.log('=== Test 1: Server connectivity check ===');
  console.log(
    `Checking AivisSpeech server at: ${aivisOptions.aivisSpeechApiUrl}`,
  );

  let serverAvailable = false;
  try {
    // Test server connectivity first
    const response = await fetch(aivisOptions.aivisSpeechApiUrl);
    console.log('✓ AivisSpeech server is responding');
    serverAvailable = true;
  } catch (error) {
    console.error('❌ Cannot connect to AivisSpeech server');
    console.error(`Error: ${error.cause?.code || error.message}`);
    console.log('\n📌 To use AivisSpeech:');
    console.log('1. Download and install AivisSpeech');
    console.log('2. Start the server on http://localhost:10101');
    console.log('3. Run this example again');
    console.log('\n⏭️  Continuing with adapter creation test...\n');
  }

  try {
    const voiceService = new VoiceEngineAdapter(aivisOptions);
    console.log('✓ VoiceEngineAdapter created successfully');
    console.log(`✓ Using speaker ID: ${aivisOptions.speaker}`);
    console.log(`✓ Configured URL: ${aivisOptions.aivisSpeechApiUrl}`);
    console.log();
  } catch (error) {
    console.error('❌ Failed to create adapter:', error.message);
    return;
  }

  // Skip speech tests if server is not available, but show silent mode
  if (!serverAvailable) {
    console.log(
      '⚠️  AivisSpeech server not available - demonstrating silent mode\n',
    );

    console.log('=== Silent Mode Demo ===');
    try {
      const silentService = new VoiceEngineAdapter({
        engineType: 'none',
        speaker: 'default',
      });

      await silentService.speakText(
        'This would be AivisSpeech output if server was running',
      );
      console.log('✓ Silent mode test passed');
      console.log(
        'ℹ️  This shows the package works, but no audio is generated\n',
      );
    } catch (error) {
      console.error('❌ Silent mode test failed:', error.message);
    }

    console.log('=== Summary ===');
    console.log('✅ Basic adapter test completed!');
    console.log('✅ Silent mode demonstration completed!');
    console.log('❌ AivisSpeech tests skipped (server unavailable)');
    console.log('\nTo test actual speech generation:');
    console.log(
      '1. Install and start AivisSpeech server on http://localhost:10101',
    );
    console.log('2. Run this example again');
    return;
  }

  // Test 2: Save audio to file
  console.log('=== Test 2: Generate and save audio ===');
  try {
    const outputPath = path.join(__dirname, 'aivis-output.wav');

    const voiceService = new VoiceEngineAdapter({
      ...aivisOptions,
      onPlay: async (audioBuffer) => {
        console.log(
          `✓ Received audio buffer (${audioBuffer.byteLength} bytes)`,
        );
        fs.writeFileSync(outputPath, Buffer.from(audioBuffer));
        console.log(`✓ Audio saved to: ${outputPath}`);
      },
    });

    console.log('Generating speech with AivisSpeech...');
    await voiceService.speakText(
      'こんにちは、AivisSpeechの音声合成テストです。',
    );
    console.log('✓ Test 2 passed\n');
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
    console.error(
      'Make sure AivisSpeech server is running on http://localhost:10101\n',
    );
  }

  // Test 3: Test with emotions
  console.log('=== Test 3: Emotion test ===');
  const emotions = [
    {
      emotion: 'happy',
      text: '[happy] 嬉しいです！AivisSpeechで感情表現のテストをしています。',
    },
    { emotion: 'sad', text: '[sad] 悲しい気持ちを表現しています。' },
    { emotion: 'angry', text: '[angry] 怒っている感情を表現しています。' },
  ];

  for (const { emotion, text } of emotions) {
    try {
      const outputPath = path.join(__dirname, `aivis-${emotion}.wav`);

      const voiceService = new VoiceEngineAdapter({
        ...aivisOptions,
        onPlay: async (audioBuffer) => {
          fs.writeFileSync(outputPath, Buffer.from(audioBuffer));
        },
      });

      console.log(`Testing ${emotion} emotion...`);
      await voiceService.speakText(text);
      console.log(`✓ Saved to: aivis-${emotion}.wav`);
    } catch (error) {
      console.error(`❌ Failed for ${emotion}:`, error.message);
    }
  }

  console.log('\n=== Summary ===');
  console.log('✅ AivisSpeech example completed!');
  console.log('\nℹ️  To use AivisSpeech:');
  console.log('1. Install and run AivisSpeech server');
  console.log('2. Default URL: http://localhost:10101');
  console.log('3. Default speaker ID: 888753760');
  console.log('\nℹ️  Generated files can be played with:');
  console.log('- macOS: afplay filename.wav');
  console.log('- Linux: aplay filename.wav');
  console.log('- Windows: start filename.wav');
}

main().catch(console.error);
