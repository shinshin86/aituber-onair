/**
 * VoicePeak example for @aituber-onair/voice in Deno
 * 
 * Requirements:
 * - VoicePeak server running on http://localhost:20202
 * 
 * Run with: deno run --allow-net --allow-write voicepeak-example.ts
 */
import { VoiceEngineAdapter } from '../../dist/cjs/index.js';

async function main() {
  console.log('=== AITuber OnAir Voice - VoicePeak Deno Example ===\n');

  // VoicePeak configuration
  const voicepeakOptions = {
    engineType: 'voicepeak' as const,
    speaker: 'f1', // VoicePeak speaker ID
    voicepeakApiUrl: 'http://localhost:20202',
    onComplete: () => {
      console.log('✓ Speech processing completed');
    }
  };

  // Test 1: Server connectivity check
  console.log('=== Test 1: Server connectivity check ===');
  console.log(`Checking VoicePeak server at: ${voicepeakOptions.voicepeakApiUrl}`);
  
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
    const outputPath = './voicepeak-output.wav';
    
    const voiceService = new VoiceEngineAdapter({
      ...voicepeakOptions,
      onPlay: async (audioBuffer: ArrayBuffer) => {
        console.log(`✓ Received audio buffer (${audioBuffer.byteLength} bytes)`);
        await Deno.writeFile(outputPath, new Uint8Array(audioBuffer));
        console.log(`✓ Audio saved to: ${outputPath}`);
      }
    });

    console.log('Generating speech with VoicePeak...');
    await voiceService.speakText('こんにちは、VoicePeakのDenoテストです。');
    console.log('✓ Test 2 passed\n');
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message, '\n');
  }

  // Test 3: Emotion test
  console.log('=== Test 3: Emotion test ===');
  const emotions = [
    { emotion: 'happy', text: '[happy] VoicePeakで楽しい気持ちを表現！' },
    { emotion: 'sad', text: '[sad] 悲しい感情です。' },
    { emotion: 'angry', text: '[angry] 怒りの感情を表現！' }
  ];

  for (const { emotion, text } of emotions) {
    try {
      const outputPath = `./voicepeak-${emotion}.wav`;
      
      const voiceService = new VoiceEngineAdapter({
        ...voicepeakOptions,
        onPlay: async (audioBuffer: ArrayBuffer) => {
          await Deno.writeFile(outputPath, new Uint8Array(audioBuffer));
        }
      });

      console.log(`Testing ${emotion} emotion...`);
      await voiceService.speakText(text);
      console.log(`✓ Saved to: ${outputPath}`);
    } catch (error) {
      console.error(`❌ Failed for ${emotion}:`, error.message);
    }
  }

  console.log('\n=== Summary ===');
  console.log('✅ VoicePeak Deno example completed!');
  console.log('\nℹ️  Generated files can be played with:');
  console.log('- macOS: afplay filename.wav');
  console.log('- Linux: aplay filename.wav');
  console.log('- Windows: start filename.wav');
}

main().catch(console.error);