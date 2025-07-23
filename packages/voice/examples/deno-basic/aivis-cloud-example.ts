/**
 * Aivis Cloud API example for @aituber-onair/voice in Deno
 * This example demonstrates using Aivis Cloud API for text-to-speech.
 *
 * Requirements:
 * - Aivis Cloud API key (get from https://hub.aivis-project.com/cloud-api/api-keys)
 * - Internet connection
 *
 * Run with: deno run --allow-net --allow-write --allow-env aivis-cloud-example.ts
 */
import { VoiceEngineAdapter } from '../../dist/cjs/index.js';

async function main() {
  console.log('=== AITuber OnAir Voice - Aivis Cloud API Deno Example ===\n');

  // Get API key from environment variable
  const apiKey = Deno.env.get('AIVIS_CLOUD_API_KEY');
  if (!apiKey) {
    console.error('❌ AIVIS_CLOUD_API_KEY environment variable not set');
    console.log('\n📌 To use Aivis Cloud API:');
    console.log(
      '1. Get API key from https://hub.aivis-project.com/cloud-api/api-keys',
    );
    console.log(
      '2. Set environment variable: export AIVIS_CLOUD_API_KEY="your-api-key"',
    );
    console.log(
      '3. Run with: deno run --allow-net --allow-write --allow-env aivis-cloud-example.ts',
    );
    console.log('\n⏭️  Continuing with basic adapter test...\n');
  }

  // Basic Aivis Cloud configuration
  const aivisCloudOptions = {
    engineType: 'aivisCloud' as const,
    speaker: 'a59cb814-0083-4369-8542-f51a29e72af7', // Example model UUID
    apiKey: apiKey,
    onComplete: () => {
      console.log('✓ Speech processing completed');
    },
  };

  console.log('=== Test 1: Basic adapter creation ===');
  try {
    const voiceService = new VoiceEngineAdapter(aivisCloudOptions);
    console.log('✓ VoiceEngineAdapter created successfully');
    console.log(`✓ Using model UUID: ${aivisCloudOptions.speaker}`);
    console.log(`✓ API key configured: ${apiKey ? 'Yes' : 'No (demo mode)'}`);
    console.log(`✓ Running on Deno ${Deno.version.deno}`);
    console.log();
  } catch (error) {
    console.error('❌ Failed to create adapter:', error.message);
    return;
  }

  // Skip actual API calls if no API key is provided
  if (!apiKey) {
    console.log('⚠️  Skipping API tests (no API key provided)');
    console.log('✅ Basic adapter test completed!');
    console.log('\nTo test actual speech generation:');
    console.log(
      '1. Get API key from https://hub.aivis-project.com/cloud-api/api-keys',
    );
    console.log('2. Set AIVIS_CLOUD_API_KEY environment variable');
    console.log('3. Run this example again with proper permissions');
    return;
  }

  // Test 2: Basic text-to-speech with file output
  console.log('=== Test 2: Basic text-to-speech ===');
  try {
    const outputPath = './aivis-cloud-basic.mp3';

    const voiceService = new VoiceEngineAdapter({
      ...aivisCloudOptions,
      onPlay: async (audioBuffer: ArrayBuffer) => {
        console.log(
          `✓ Received audio buffer (${audioBuffer.byteLength} bytes)`,
        );
        await Deno.writeFile(outputPath, new Uint8Array(audioBuffer));
        console.log(`✓ Audio saved to: ${outputPath}`);
      },
    });

    console.log('Generating speech with Aivis Cloud API...');
    await voiceService.speakText(
      'こんにちは！Aivis Cloud APIのDenoテストです。',
    );
    console.log('✓ Test 2 passed\n');
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
    console.error('Check your API key and internet connection\n');
  }

  // Test 3: SSML support
  console.log('=== Test 3: SSML support test ===');
  try {
    const outputPath = './aivis-cloud-ssml.mp3';

    const voiceService = new VoiceEngineAdapter({
      ...aivisCloudOptions,
      onPlay: async (audioBuffer: ArrayBuffer) => {
        await Deno.writeFile(outputPath, new Uint8Array(audioBuffer));
        console.log(`✓ SSML audio saved to: ${outputPath}`);
      },
    });

    const ssmlText = `
      こんにちは！<break time="0.5s"/>
      <prosody rate="110%" pitch="+5%">これはDenoとSSMLを組み合わせた例です。</prosody>
      <break time="0.3s"/>
      <sub alias="エーアイビス">Aivis</sub> Cloud APIはDenoでも快適に動作します。
    `;

    console.log('Generating SSML-enhanced speech...');
    await voiceService.speakText(ssmlText);
    console.log('✓ Test 3 passed\n');
  } catch (error) {
    console.error('❌ Test 3 failed:', error.message, '\n');
  }

  // Test 4: Security and permissions demo
  console.log('=== Test 4: Deno security features ===');
  try {
    console.log('✓ Network permission: Accessing Aivis Cloud API');
    console.log('✓ Write permission: Saving audio files');
    console.log('✓ Environment permission: Reading API key');
    console.log('✓ Deno runtime provides secure execution environment');

    // Test with different voice parameters
    const outputPath = './aivis-cloud-secure.mp3';

    const voiceService = new VoiceEngineAdapter({
      engineType: 'aivisCloud',
      speaker: 'a59cb814-0083-4369-8542-f51a29e72af7',
      apiKey: apiKey,
      aivisCloudEmotionalIntensity: 1.1,
      aivisCloudSpeakingRate: 1.05,
      aivisCloudOutputFormat: 'mp3',
      aivisCloudUseSSML: true,
      onPlay: async (audioBuffer: ArrayBuffer) => {
        await Deno.writeFile(outputPath, new Uint8Array(audioBuffer));
      },
    });

    await voiceService.speakText(
      'Denoのセキュアな実行環境でAivis Cloud APIを使用しています。',
    );
    console.log(`✓ Secure synthesis saved to: ${outputPath}`);
    console.log('✓ Test 4 passed\n');
  } catch (error) {
    console.error('❌ Test 4 failed:', error.message, '\n');
  }

  // Test 5: Performance and format comparison
  console.log('=== Test 5: Format performance test ===');
  const formats = [
    { format: 'mp3', description: 'MP3 - 最高の互換性' },
    { format: 'aac', description: 'AAC - 高効率圧縮' },
    { format: 'flac', description: 'FLAC - 可逆圧縮' },
    { format: 'wav', description: 'WAV - 無圧縮最高音質' },
  ];

  for (const { format, description } of formats) {
    try {
      const startTime = performance.now();
      const outputPath = `./aivis-cloud-format.${format}`;

      const voiceService = new VoiceEngineAdapter({
        engineType: 'aivisCloud',
        speaker: 'a59cb814-0083-4369-8542-f51a29e72af7',
        apiKey: apiKey,
        aivisCloudOutputFormat: format as any,
        onPlay: async (audioBuffer: ArrayBuffer) => {
          await Deno.writeFile(outputPath, new Uint8Array(audioBuffer));
        },
      });

      await voiceService.speakText(
        `これは${format}形式のパフォーマンステストです。`,
      );
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      console.log(`✓ ${format.toUpperCase()}: ${duration}ms - ${description}`);
    } catch (error) {
      console.error(`❌ Failed for ${format}:`, error.message);
    }
  }

  console.log('\n=== Summary ===');
  console.log('✅ Aivis Cloud API Deno example completed!');
  console.log('\nℹ️  Deno-specific benefits:');
  console.log('- ✅ Secure by default (permissions system)');
  console.log('- ✅ Built-in TypeScript support');
  console.log('- ✅ Modern JavaScript features');
  console.log('- ✅ No package.json or node_modules');
  console.log('- ✅ Direct HTTP/fetch support');
  console.log('\nℹ️  Generated files can be played with:');
  console.log('- macOS: afplay filename.mp3');
  console.log('- Linux: aplay filename.wav');
  console.log('- Windows: start filename.mp3');
  console.log('\n🔗 More info: https://aivis-project.com/cloud-api/');
}

// Advanced streaming example
async function streamingExample() {
  console.log('\n=== Advanced Example: Streaming Processing ===');

  const apiKey = Deno.env.get('AIVIS_CLOUD_API_KEY');
  if (!apiKey) {
    console.log('⚠️  Skipping streaming example (no API key)');
    return;
  }

  try {
    // Multiple texts for streaming-like processing
    const texts = [
      'Denoでのストリーミング処理の例です。',
      'この方法では複数のテキストを順次処理できます。',
      'それぞれが個別のファイルとして保存されます。',
    ];

    console.log(`Processing ${texts.length} texts in sequence...`);

    for (let i = 0; i < texts.length; i++) {
      const outputPath = `./aivis-cloud-stream-${i + 1}.mp3`;

      const voiceService = new VoiceEngineAdapter({
        engineType: 'aivisCloud',
        speaker: 'a59cb814-0083-4369-8542-f51a29e72af7',
        apiKey: apiKey,
        aivisCloudOutputFormat: 'mp3',
        aivisCloudSpeakingRate: 1.0 + i * 0.1, // Gradually faster
        onPlay: async (audioBuffer: ArrayBuffer) => {
          await Deno.writeFile(outputPath, new Uint8Array(audioBuffer));
          console.log(`✓ Stream ${i + 1}/${texts.length} saved: ${outputPath}`);
        },
      });

      await voiceService.speakText(texts[i]);
    }

    console.log('✅ Streaming example completed!');
  } catch (error) {
    console.error('❌ Streaming example failed:', error.message);
  }
}

// Run examples
async function runAll() {
  await main();
  await streamingExample();
}

if (import.meta.main) {
  runAll().catch(console.error);
}
