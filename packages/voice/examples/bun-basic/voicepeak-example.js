import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
/**
 * VoicePeak example for @aituber-onair/voice in Bun
 *
 * Requirements:
 * - VoicePeak server running on http://localhost:20202
 * - Optional: speaker or play-sound for audio playback
 *
 * Run with: bun run voicepeak-example.js
 */
import { VoiceEngineAdapter } from '../../dist/cjs/index.js';

async function main() {
  console.log('=== AITuber OnAir Voice - VoicePeak Bun Example ===\n');

  // VoicePeak configuration
  const voicepeakOptions = {
    engineType: 'voicepeak',
    speaker: 'f1', // VoicePeak speaker ID
    voicepeakApiUrl: 'http://localhost:20202',
    onComplete: () => {
      console.log('✓ Speech processing completed');
    },
  };

  // Test 1: Server connectivity check
  console.log('=== Test 1: Server connectivity check ===');
  console.log(
    `Checking VoicePeak server at: ${voicepeakOptions.voicepeakApiUrl}`,
  );

  let serverAvailable = false;
  try {
    const response = await fetch(voicepeakOptions.voicepeakApiUrl);
    console.log('✓ VoicePeak server is responding');
    serverAvailable = true;
  } catch (error) {
    console.error('❌ Cannot connect to VoicePeak server');
    console.error(`Error: ${error.cause?.code || error.message}`);
    console.log('\n📌 To use VoicePeak:');
    console.log('1. Download and install VoicePeak');
    console.log('2. Start the server on http://localhost:20202');
    console.log('3. Run this example again\n');
  }

  try {
    const voiceService = new VoiceEngineAdapter(voicepeakOptions);
    console.log('✓ VoiceEngineAdapter created successfully');
    console.log(`✓ Using speaker ID: ${voicepeakOptions.speaker}`);
    console.log();
  } catch (error) {
    console.error('❌ Failed to create adapter:', error.message);
    return;
  }

  if (!serverAvailable) {
    console.log('⚠️  Skipping speech tests (server unavailable)');
    return;
  }

  // Test 2: Generate and save audio
  console.log('=== Test 2: Generate and save audio ===');
  try {
    const outputPath = join(import.meta.dir, 'voicepeak-output.wav');

    const voiceService = new VoiceEngineAdapter({
      ...voicepeakOptions,
      onPlay: async (audioBuffer) => {
        console.log(
          `✓ Received audio buffer (${audioBuffer.byteLength} bytes)`,
        );
        writeFileSync(outputPath, Buffer.from(audioBuffer));
        console.log(`✓ Audio saved to: ${outputPath}`);
      },
    });

    console.log('Generating speech with VoicePeak...');
    await voiceService.speakText('こんにちは、VoicePeakのBunテストです。');
    console.log('✓ Test 2 passed\n');
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message, '\n');
  }

  // Test 3: Speaker playback test
  console.log('=== Test 3: Speaker playback test ===');
  try {
    const voiceService = new VoiceEngineAdapter(voicepeakOptions);

    console.log('Testing speaker playback...');
    await voiceService.speakText('[happy] VoicePeakのBunスピーカーテスト！');
    console.log('✓ Test 3 passed\n');
  } catch (error) {
    console.error('❌ Test 3 failed:', error.message);
    console.error('Install speaker or play-sound for audio playback\n');
  }

  // Test 4: Emotion test with dynamic format detection
  console.log('=== Test 4: Emotion test ===');
  const emotions = [
    { emotion: 'happy', text: '[happy] VoicePeakで楽しい気持ちを表現！' },
    { emotion: 'sad', text: '[sad] 悲しい感情です。' },
    { emotion: 'angry', text: '[angry] 怒りの感情を表現！' },
  ];

  for (const { emotion, text } of emotions) {
    try {
      const outputPath = join(import.meta.dir, `voicepeak-${emotion}.wav`);

      const voiceService = new VoiceEngineAdapter({
        ...voicepeakOptions,
        onPlay: async (audioBuffer) => {
          writeFileSync(outputPath, Buffer.from(audioBuffer));
        },
      });

      console.log(`Testing ${emotion} emotion...`);
      await voiceService.speakText(text);
      console.log(`✓ Saved to: voicepeak-${emotion}.wav`);
    } catch (error) {
      console.error(`❌ Failed for ${emotion}:`, error.message);
    }
  }

  console.log('\n=== Summary ===');
  console.log('✅ VoicePeak Bun example completed!');
  console.log('\n📌 VoicePeak notes:');
  console.log('- Generates 48000Hz audio (detected automatically)');
  console.log('- Professional quality voice synthesis');
  console.log("- Works seamlessly with Bun's fast runtime");
}

main().catch(console.error);
