/**
 * AivisSpeech example for @aituber-onair/voice in Deno
 *
 * Requirements:
 * - AivisSpeech server running on http://localhost:10101
 *
 * Run with: deno run --allow-net --allow-write aivis-speech-example.ts
 */
import { VoiceEngineAdapter } from '../../dist/cjs/index.js';

async function main() {
  console.log('=== AITuber OnAir Voice - AivisSpeech Deno Example ===\n');

  // AivisSpeech configuration
  const aivisOptions = {
    engineType: 'aivisSpeech' as const,
    speaker: '888753760', // Default AivisSpeech speaker ID
    aivisSpeechApiUrl: 'http://localhost:10101',
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
    const response = await fetch(aivisOptions.aivisSpeechApiUrl);
    console.log('✓ AivisSpeech server is responding');
    serverAvailable = true;
  } catch (error) {
    console.error('❌ Cannot connect to AivisSpeech server');
    console.error(`Error: ${error.cause?.code || error.message}`);
    console.log('\n📌 To use AivisSpeech:');
    console.log('1. Download and install AivisSpeech');
    console.log('2. Start the server on http://localhost:10101');
    console.log('3. Run this example again\n');
  }

  try {
    const voiceService = new VoiceEngineAdapter(aivisOptions);
    console.log('✓ VoiceEngineAdapter created successfully');
    console.log(`✓ Using speaker ID: ${aivisOptions.speaker}`);
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
    const outputPath = './aivis-output.wav';

    const voiceService = new VoiceEngineAdapter({
      ...aivisOptions,
      onPlay: async (audioBuffer: ArrayBuffer) => {
        console.log(
          `✓ Received audio buffer (${audioBuffer.byteLength} bytes)`,
        );
        await Deno.writeFile(outputPath, new Uint8Array(audioBuffer));
        console.log(`✓ Audio saved to: ${outputPath}`);
      },
    });

    console.log('Generating speech with AivisSpeech...');
    await voiceService.speakText('こんにちは、AivisSpeechのDenoテストです。');
    console.log('✓ Test 2 passed\n');
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message, '\n');
  }

  // Test 3: Emotion test
  console.log('=== Test 3: Emotion test ===');
  const emotions = [
    { emotion: 'happy', text: '[happy] AivisSpeechで嬉しい感情を表現！' },
    { emotion: 'sad', text: '[sad] 悲しい気持ちです。' },
    { emotion: 'angry', text: '[angry] 怒っています！' },
  ];

  for (const { emotion, text } of emotions) {
    try {
      const outputPath = `./aivis-${emotion}.wav`;

      const voiceService = new VoiceEngineAdapter({
        ...aivisOptions,
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
  console.log('✅ AivisSpeech Deno example completed!');
  console.log('\nℹ️  Generated files can be played with:');
  console.log('- macOS: afplay filename.wav');
  console.log('- Linux: aplay filename.wav');
  console.log('- Windows: start filename.wav');
}

main().catch(console.error);
