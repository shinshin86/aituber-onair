import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
/**
 * VOICEVOX example for @aituber-onair/voice in Bun
 *
 * Requirements:
 * - VOICEVOX server running on http://localhost:50021
 * - Optional: speaker or play-sound for audio playback
 *
 * Run with: bun run voicevox-example.js
 */
import {
  AudioPlayerFactory,
  VoiceEngineAdapter,
} from '../../dist/cjs/index.js';

async function main() {
  console.log('=== AITuber OnAir Voice - VOICEVOX Bun Example ===\n');

  // Show runtime info
  console.log(`Runtime: ${AudioPlayerFactory.getRuntimeInfo().runtime}`);
  console.log(`Bun version: ${Bun.version}\n`);

  // Test 1: Silent mode test
  console.log('=== Test 1: Silent mode (no VOICEVOX required) ===');
  try {
    const silentService = new VoiceEngineAdapter({
      engineType: 'none',
      speaker: 'default',
    });
    await silentService.speakText('Silent test in Bun');
    console.log('✓ Silent mode test passed\n');
  } catch (error) {
    console.error('❌ Silent mode test failed:', error.message, '\n');
  }

  // Test 2: Save audio to file using onPlay callback
  console.log('=== Test 2: VOICEVOX with file output ===');
  try {
    const outputPath = join(import.meta.dir, 'voicevox-output.wav');

    const voiceService = new VoiceEngineAdapter({
      speaker: '46',
      engineType: 'voicevox',
      voicevoxApiUrl: 'http://localhost:50021',
      onPlay: async (audioBuffer) => {
        console.log(
          `✓ Received audio buffer (${audioBuffer.byteLength} bytes)`,
        );
        writeFileSync(outputPath, Buffer.from(audioBuffer));
        console.log(`✓ Audio saved to: ${outputPath}`);
      },
      onComplete: () => {
        console.log('✓ Processing completed');
      },
    });

    console.log('Generating speech with VOICEVOX...');
    console.log(
      '(Make sure VOICEVOX server is running on http://localhost:50021)',
    );

    await voiceService.speakText(
      '[happy] こんにちは！Bunから音声合成のテストです。',
    );
    console.log('✓ Test 2 passed\n');
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
    console.error(
      'Make sure VOICEVOX server is running on http://localhost:50021\n',
    );
  }

  // Test 3: Speaker playback test
  console.log('=== Test 3: Speaker playback test ===');
  try {
    const voiceService = new VoiceEngineAdapter({
      speaker: '46',
      engineType: 'voicevox',
      voicevoxApiUrl: 'http://localhost:50021',
      onComplete: () => {
        console.log('✓ VOICEVOX playback completed');
      },
    });

    console.log('Testing speaker playback...');
    await voiceService.speakText('Bunでのスピーカー再生テストです。');
    console.log('✓ Test 3 passed\n');
  } catch (error) {
    console.error('❌ Test 3 failed:', error.message);
    console.error('Install speaker or play-sound for audio playback\n');
  }

  // Test 4: Multiple emotions
  console.log('=== Test 4: Emotion test ===');
  const emotions = [
    { emotion: 'happy', text: '[happy] 嬉しいです！' },
    { emotion: 'sad', text: '[sad] 悲しいです。' },
    { emotion: 'angry', text: '[angry] 怒っています！' },
  ];

  for (const { emotion, text } of emotions) {
    try {
      const outputPath = join(import.meta.dir, `voicevox-${emotion}.wav`);

      const voiceService = new VoiceEngineAdapter({
        speaker: '46',
        engineType: 'voicevox',
        voicevoxApiUrl: 'http://localhost:50021',
        onPlay: async (audioBuffer) => {
          writeFileSync(outputPath, Buffer.from(audioBuffer));
        },
      });

      console.log(`Testing ${emotion} emotion...`);
      await voiceService.speakText(text);
      console.log(`✓ Saved to: voicevox-${emotion}.wav`);
    } catch (error) {
      console.error(`❌ Failed for ${emotion}:`, error.message);
    }
  }

  console.log('\n=== Summary ===');
  console.log('✅ VOICEVOX Bun example completed!');
  console.log('\n📌 Bun advantages:');
  console.log('- Native file system APIs (fs module compatible)');
  console.log('- Fast execution speed');
  console.log('- Can use Node.js audio libraries (speaker/play-sound)');
}

main().catch(console.error);
