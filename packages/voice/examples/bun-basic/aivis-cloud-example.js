import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
/**
 * Aivis Cloud API example for @aituber-onair/voice in Bun
 * This example demonstrates using Aivis Cloud API for text-to-speech.
 *
 * Requirements:
 * - Aivis Cloud API key (get from https://hub.aivis-project.com/cloud-api/api-keys)
 * - Internet connection
 * - Optional: speaker or play-sound for audio playback
 *
 * Run with: bun run aivis-cloud-example.js
 */
import { VoiceEngineAdapter } from '../../dist/cjs/index.js';

async function main() {
  console.log('=== AITuber OnAir Voice - Aivis Cloud API Bun Example ===\n');

  // Get API key from environment variable
  const apiKey = process.env.AIVIS_CLOUD_API_KEY;
  if (!apiKey) {
    console.error('❌ AIVIS_CLOUD_API_KEY environment variable not set');
    console.log('\n📌 To use Aivis Cloud API:');
    console.log(
      '1. Get API key from https://hub.aivis-project.com/cloud-api/api-keys',
    );
    console.log(
      '2. Set environment variable: export AIVIS_CLOUD_API_KEY="your-api-key"',
    );
    console.log('3. Run with: bun run aivis-cloud-example.js');
    console.log('\n⏭️  Continuing with basic adapter test...\n');
  }

  // Basic Aivis Cloud configuration
  const aivisCloudOptions = {
    engineType: 'aivisCloud',
    speaker: 'a59cb814-0083-4369-8542-f51a29e72af7', // Example model UUID
    apiKey: apiKey || 'demo-key-for-adapter-test',
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
    console.log(`✓ Running on Bun ${Bun.version}`);
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
    console.log('3. Run this example again');
    return;
  }

  // Test 2: High-performance text-to-speech
  console.log('=== Test 2: High-performance text-to-speech ===');
  try {
    const outputPath = join(import.meta.dir, 'aivis-cloud-basic.mp3');
    const startTime = performance.now();

    const voiceService = new VoiceEngineAdapter({
      ...aivisCloudOptions,
      onPlay: async (audioBuffer) => {
        console.log(
          `✓ Received audio buffer (${audioBuffer.byteLength} bytes)`,
        );
        writeFileSync(outputPath, Buffer.from(audioBuffer));
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        console.log(`✓ Audio saved to: ${outputPath} (${duration}ms)`);
      },
    });

    console.log('Generating speech with Aivis Cloud API (Bun optimized)...');
    await voiceService.speakText(
      'こんにちは！Aivis Cloud APIのBunテストです。高速実行をお楽しみください！',
    );
    console.log('✓ Test 2 passed\n');
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
    console.error('Check your API key and internet connection\n');
  }

  // Test 3: Bun's fast I/O with SSML
  console.log('=== Test 3: Fast I/O with SSML ===');
  try {
    const outputPath = join(import.meta.dir, 'aivis-cloud-ssml.mp3');
    const startTime = performance.now();

    const voiceService = new VoiceEngineAdapter({
      ...aivisCloudOptions,
      onPlay: async (audioBuffer) => {
        // Bun's optimized writeFileSync
        writeFileSync(outputPath, Buffer.from(audioBuffer));
        const endTime = performance.now();
        console.log(
          `✓ SSML audio saved (${Math.round(endTime - startTime)}ms): ${outputPath}`,
        );
      },
    });

    const ssmlText = `
      こんにちは！<break time="0.4s"/>
      <prosody rate="115%" pitch="+3%">BunはJavaScriptランタイムの中でも特に高速です。</prosody>
      <break time="0.3s"/>
      <sub alias="エーアイビス">Aivis</sub> Cloud APIとの組み合わせで最高のパフォーマンスを実現します。
    `;

    console.log('Generating SSML-enhanced speech with Bun optimization...');
    await voiceService.speakText(ssmlText);
    console.log('✓ Test 3 passed\n');
  } catch (error) {
    console.error('❌ Test 3 failed:', error.message, '\n');
  }

  // Test 4: Parallel processing demonstration
  console.log('=== Test 4: Parallel processing test ===');
  try {
    const texts = [
      'Bunの並列処理機能をテストします。',
      'これは2番目のテキストです。',
      'そして3番目のテキストです。',
    ];

    console.log(`Processing ${texts.length} texts in parallel...`);
    const startTime = performance.now();

    // Process all texts in parallel (Bun handles this efficiently)
    const promises = texts.map(async (text, index) => {
      const outputPath = join(
        import.meta.dir,
        `aivis-cloud-parallel-${index + 1}.mp3`,
      );

      const voiceService = new VoiceEngineAdapter({
        engineType: 'aivisCloud',
        speaker: 'a59cb814-0083-4369-8542-f51a29e72af7',
        apiKey: apiKey,
        aivisCloudOutputFormat: 'mp3',
        aivisCloudSpeakingRate: 1.0 + index * 0.1,
        onPlay: async (audioBuffer) => {
          writeFileSync(outputPath, Buffer.from(audioBuffer));
          console.log(
            `✓ Parallel ${index + 1}/${texts.length} saved: aivis-cloud-parallel-${index + 1}.mp3`,
          );
        },
      });

      return voiceService.speakText(text);
    });

    await Promise.all(promises);
    const endTime = performance.now();
    const totalDuration = Math.round(endTime - startTime);

    console.log(
      `✓ All ${texts.length} texts processed in parallel (${totalDuration}ms total)`,
    );
    console.log('✓ Test 4 passed\n');
  } catch (error) {
    console.error('❌ Test 4 failed:', error.message, '\n');
  }

  // Test 5: Format and performance comparison
  console.log('=== Test 5: Format performance benchmark ===');
  const formats = [
    { format: 'mp3', description: 'MP3 - Universal compatibility' },
    { format: 'aac', description: 'AAC - Better compression' },
    { format: 'flac', description: 'FLAC - Lossless compression' },
    { format: 'wav', description: 'WAV - Uncompressed quality' },
  ];

  const benchmarkResults = [];

  for (const { format, description } of formats) {
    try {
      const startTime = performance.now();
      const outputPath = join(import.meta.dir, `aivis-cloud-format.${format}`);

      const voiceService = new VoiceEngineAdapter({
        engineType: 'aivisCloud',
        speaker: 'a59cb814-0083-4369-8542-f51a29e72af7',
        apiKey: apiKey,
        aivisCloudOutputFormat: format,
        onPlay: async (audioBuffer) => {
          writeFileSync(outputPath, Buffer.from(audioBuffer));
        },
      });

      await voiceService.speakText(
        `これは${format}形式のBunベンチマークテストです。`,
      );
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      benchmarkResults.push({
        format: format.toUpperCase(),
        duration,
        description,
      });
      console.log(`✓ ${format.toUpperCase()}: ${duration}ms - ${description}`);
    } catch (error) {
      console.error(`❌ Failed for ${format}:`, error.message);
    }
  }

  // Show benchmark summary
  console.log('\n📊 Performance Summary:');
  benchmarkResults
    .sort((a, b) => a.duration - b.duration)
    .forEach((result, index) => {
      const medal =
        index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
      console.log(`${medal} ${result.format}: ${result.duration}ms`);
    });

  console.log('\n=== Summary ===');
  console.log('✅ Aivis Cloud API Bun example completed!');
  console.log('\nℹ️  Bun performance advantages:');
  console.log('- ✅ Faster startup time than Node.js');
  console.log('- ✅ Optimized file I/O operations');
  console.log('- ✅ Built-in bundler and package manager');
  console.log('- ✅ Native fetch() without polyfills');
  console.log('- ✅ Excellent parallel processing');
  console.log('- ✅ TypeScript support out of the box');
  console.log('\nℹ️  Generated files can be played with:');
  console.log('- macOS: afplay filename.mp3');
  console.log('- Linux: aplay filename.wav');
  console.log('- Windows: start filename.mp3');
  console.log('\n🔗 More info: https://aivis-project.com/cloud-api/');
}

// Real-time streaming simulation
async function streamingSimulation() {
  console.log('\n=== Advanced Example: Real-time Streaming Simulation ===');

  const apiKey = process.env.AIVIS_CLOUD_API_KEY;
  if (!apiKey) {
    console.log('⚠️  Skipping streaming simulation (no API key)');
    return;
  }

  try {
    console.log('Simulating real-time streaming with chunk processing...');

    const chunks = [
      'リアルタイムストリーミングの',
      'シミュレーションを実行しています。',
      'Bunの高速処理により',
      'スムーズな音声生成が可能です。',
    ];

    for (let i = 0; i < chunks.length; i++) {
      const chunkStartTime = performance.now();
      const outputPath = join(
        import.meta.dir,
        `aivis-cloud-chunk-${i + 1}.mp3`,
      );

      const voiceService = new VoiceEngineAdapter({
        engineType: 'aivisCloud',
        speaker: 'a59cb814-0083-4369-8542-f51a29e72af7',
        apiKey: apiKey,
        aivisCloudOutputFormat: 'mp3',
        aivisCloudSpeakingRate: 1.1,
        onPlay: async (audioBuffer) => {
          writeFileSync(outputPath, Buffer.from(audioBuffer));
          const chunkEndTime = performance.now();
          const chunkDuration = Math.round(chunkEndTime - chunkStartTime);
          console.log(
            `✓ Chunk ${i + 1}/${chunks.length}: ${chunkDuration}ms - ${outputPath}`,
          );
        },
      });

      await voiceService.speakText(chunks[i]);

      // Small delay to simulate real-time processing
      if (i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log('✅ Streaming simulation completed!');
    console.log(
      'ℹ️  In a real application, these chunks could be played sequentially for continuous audio',
    );
  } catch (error) {
    console.error('❌ Streaming simulation failed:', error.message);
  }
}

// Run examples
async function runAll() {
  await main();
  await streamingSimulation();
}

if (import.meta.main) {
  runAll().catch(console.error);
}
