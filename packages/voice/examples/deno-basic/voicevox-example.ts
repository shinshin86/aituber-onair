/**
 * VOICEVOX example for @aituber-onair/voice in Deno
 *
 * Requirements:
 * - VOICEVOX server running on http://localhost:50021
 *
 * Run with: deno run --allow-net --allow-write voicevox-example.ts
 */
import {
  AudioPlayerFactory,
  VoiceEngineAdapter,
} from '../../dist/cjs/index.js';

async function main() {
  console.log('=== AITuber OnAir Voice - VOICEVOX Deno Example ===\n');

  // Show runtime info
  console.log(`Runtime: ${AudioPlayerFactory.getRuntimeInfo().runtime}`);
  console.log(`Deno version: ${Deno.version.deno}\n`);

  // Test 1: Silent mode test
  console.log('=== Test 1: Silent mode (no VOICEVOX required) ===');
  try {
    const silentService = new VoiceEngineAdapter({
      engineType: 'none',
      speaker: 'default',
    });
    await silentService.speakText('Silent test in Deno');
    console.log('✓ Silent mode test passed\n');
  } catch (error) {
    console.error('❌ Silent mode test failed:', error.message, '\n');
  }

  // Test 2: Save audio to file using onPlay callback
  console.log('=== Test 2: VOICEVOX with file output ===');
  try {
    const outputPath = './voicevox-output.wav';

    const voiceService = new VoiceEngineAdapter({
      speaker: '46',
      engineType: 'voicevox' as const,
      voicevoxApiUrl: 'http://localhost:50021',
      onPlay: async (audioBuffer: ArrayBuffer) => {
        console.log(
          `✓ Received audio buffer (${audioBuffer.byteLength} bytes)`,
        );
        await Deno.writeFile(outputPath, new Uint8Array(audioBuffer));
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
      '[happy] こんにちは！Denoから音声合成のテストです。',
    );
    console.log('✓ Test 2 passed\n');
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
    console.error(
      'Make sure VOICEVOX server is running on http://localhost:50021\n',
    );
  }

  // Test 3: Multiple emotions
  console.log('=== Test 3: Emotion test ===');
  const emotions = [
    { emotion: 'happy', text: '[happy] 嬉しいです！' },
    { emotion: 'sad', text: '[sad] 悲しいです。' },
    { emotion: 'angry', text: '[angry] 怒っています！' },
  ];

  for (const { emotion, text } of emotions) {
    try {
      const outputPath = `./voicevox-${emotion}.wav`;

      const voiceService = new VoiceEngineAdapter({
        speaker: '46',
        engineType: 'voicevox' as const,
        voicevoxApiUrl: 'http://localhost:50021',
        onPlay: async (audioBuffer: ArrayBuffer) => {
          await Deno.writeFile(outputPath, new Uint8Array(audioBuffer));
        },
      });

      console.log(`Testing ${emotion} emotion...`);
      await voiceService.speakText(text);
      console.log(`✓ Saved to: ${outputPath}`);
    } catch (error) {
      console.error(`❌ Failed for ${emotion}:`, error.message);
    }
  }

  console.log('\n=== Summary ===');
  console.log('✅ VOICEVOX Deno example completed!');
  console.log('\n📌 Note about Deno audio playback:');
  console.log(
    '- Deno uses browser-like APIs but may have limited audio support',
  );
  console.log('- Files are saved for playback in external applications');
  console.log('- Use system audio player to play generated WAV files');
}

main().catch(console.error);
