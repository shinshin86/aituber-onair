/**
 * Aivis Cloud API example for @aituber-onair/voice in Node.js
 * This example demonstrates using Aivis Cloud API for text-to-speech.
 *
 * Requirements:
 * - Aivis Cloud API key (get from https://hub.aivis-project.com/cloud-api/api-keys)
 * - Internet connection
 * - Optional: npm install speaker OR npm install play-sound for audio playback
 */
const { VoiceEngineAdapter } = require('../../dist/cjs/index.js');
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  console.log('=== AITuber OnAir Voice - Aivis Cloud API Example ===\n');

  // Get API key from environment variable or prompt user
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
    console.log('3. Run this example again');
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

  // Test 2: Basic text-to-speech with file output
  console.log('=== Test 2: Basic text-to-speech ===');
  try {
    const outputPath = path.join(__dirname, 'aivis-cloud-basic.mp3');

    const voiceService = new VoiceEngineAdapter({
      ...aivisCloudOptions,
      onPlay: async (audioBuffer) => {
        console.log(
          `✓ Received audio buffer (${audioBuffer.byteLength} bytes)`,
        );
        fs.writeFileSync(outputPath, Buffer.from(audioBuffer));
        console.log(`✓ Audio saved to: ${outputPath}`);
      },
    });

    console.log('Generating speech with Aivis Cloud API...');
    await voiceService.speakText(
      'こんにちは！Aivis Cloud APIの音声合成テストです。',
    );
    console.log('✓ Test 2 passed\n');
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
    console.error('Check your API key and internet connection\n');
  }

  // Test 3: SSML example
  console.log('=== Test 3: SSML support test ===');
  try {
    const outputPath = path.join(__dirname, 'aivis-cloud-ssml.mp3');

    const voiceService = new VoiceEngineAdapter({
      ...aivisCloudOptions,
      onPlay: async (audioBuffer) => {
        fs.writeFileSync(outputPath, Buffer.from(audioBuffer));
        console.log(`✓ SSML audio saved to: ${outputPath}`);
      },
    });

    const ssmlText = `
      こんにちは！<break time="0.5s"/>
      <prosody rate="110%" pitch="+5%">これはSSMLタグを使った例です。</prosody>
      <break time="0.3s"/>
      <sub alias="エーアイビス">Aivis</sub> Cloud APIは高品質な音声合成を提供します。
    `;

    console.log('Generating SSML-enhanced speech...');
    await voiceService.speakText(ssmlText);
    console.log('✓ Test 3 passed\n');
  } catch (error) {
    console.error('❌ Test 3 failed:', error.message, '\n');
  }

  // Test 4: Advanced configuration with emotional intensity
  console.log('=== Test 4: Advanced configuration ===');
  try {
    const emotions = [
      {
        emotion: 'happy',
        intensity: 1.2,
        text: '嬉しいです！Aivis Cloud APIで感情豊かに話します！',
      },
      {
        emotion: 'sad',
        intensity: 0.8,
        text: '少し悲しげに、静かに話してみます。',
      },
      {
        emotion: 'normal',
        intensity: 1.0,
        text: '通常の感情で自然に話します。',
      },
    ];

    for (const { emotion, intensity, text } of emotions) {
      const outputPath = path.join(__dirname, `aivis-cloud-${emotion}.mp3`);

      // Create service with advanced options
      const voiceService = new VoiceEngineAdapter({
        engineType: 'aivisCloud',
        speaker: 'a59cb814-0083-4369-8542-f51a29e72af7',
        apiKey: apiKey,
        aivisCloudEmotionalIntensity: intensity,
        aivisCloudOutputFormat: 'mp3',
        aivisCloudOutputSamplingRate: 44100,
        aivisCloudUseSSML: true,
        onPlay: async (audioBuffer) => {
          fs.writeFileSync(outputPath, Buffer.from(audioBuffer));
        },
      });

      console.log(`Testing ${emotion} emotion (intensity: ${intensity})...`);
      await voiceService.speakText(text);
      console.log(`✓ Saved to: aivis-cloud-${emotion}.mp3`);
    }
    console.log('✓ Test 4 passed\n');
  } catch (error) {
    console.error('❌ Test 4 failed:', error.message, '\n');
  }

  // Test 5: Different output formats
  console.log('=== Test 5: Output formats test ===');
  const formats = [
    { format: 'wav', extension: 'wav', description: 'PCM無圧縮' },
    { format: 'flac', extension: 'flac', description: '可逆圧縮' },
    { format: 'mp3', extension: 'mp3', description: 'MP3コーデック' },
    { format: 'aac', extension: 'aac', description: 'AACコーデック' },
  ];

  for (const { format, extension, description } of formats) {
    try {
      const outputPath = path.join(
        __dirname,
        `aivis-cloud-format.${extension}`,
      );

      const voiceService = new VoiceEngineAdapter({
        engineType: 'aivisCloud',
        speaker: 'a59cb814-0083-4369-8542-f51a29e72af7',
        apiKey: apiKey,
        aivisCloudOutputFormat: format,
        onPlay: async (audioBuffer) => {
          fs.writeFileSync(outputPath, Buffer.from(audioBuffer));
        },
      });

      console.log(`Testing ${format.toUpperCase()} format (${description})...`);
      await voiceService.speakText(`これは${format}形式のテストです。`);
      console.log(`✓ Saved to: aivis-cloud-format.${extension}`);
    } catch (error) {
      console.error(`❌ Failed for ${format}:`, error.message);
    }
  }

  console.log('\n=== Summary ===');
  console.log('✅ Aivis Cloud API example completed!');
  console.log('\nℹ️  Generated files can be played with:');
  console.log('- macOS: afplay filename.mp3');
  console.log('- Linux: aplay filename.wav');
  console.log('- Windows: start filename.mp3');
  console.log('\nℹ️  Aivis Cloud API features:');
  console.log('- ✅ High-quality voice synthesis');
  console.log('- ✅ SSML support for rich expression');
  console.log('- ✅ Multiple output formats');
  console.log('- ✅ Emotional intensity control');
  console.log('- ✅ Real-time streaming capability');
  console.log('- ✅ Cloud-based (no local server required)');
  console.log('\n🔗 More info: https://aivis-project.com/cloud-api/');
}

// Custom audio handler example
async function advancedExample() {
  console.log('\n=== Advanced Example: Custom Audio Processing ===');

  const apiKey = process.env.AIVIS_CLOUD_API_KEY;
  if (!apiKey) {
    console.log('⚠️  Skipping advanced example (no API key)');
    return;
  }

  const options = {
    engineType: 'aivisCloud',
    speaker: 'a59cb814-0083-4369-8542-f51a29e72af7',
    apiKey: apiKey,

    // Advanced Aivis Cloud settings
    aivisCloudSpeakingRate: 1.1,
    aivisCloudEmotionalIntensity: 1.2,
    aivisCloudOutputFormat: 'flac', // High quality
    aivisCloudOutputSamplingRate: 48000,
    aivisCloudUseSSML: true,

    // Custom audio handler
    onPlay: async (audioBuffer) => {
      console.log(
        `Received high-quality audio: ${audioBuffer.byteLength} bytes`,
      );

      // Save with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `aivis-cloud-${timestamp}.flac`;
      const outputPath = path.join(__dirname, filename);

      fs.writeFileSync(outputPath, Buffer.from(audioBuffer));
      console.log(`✓ High-quality audio saved: ${filename}`);

      // Could also:
      // - Stream to audio server
      // - Process with audio effects
      // - Convert to different formats
      // - Analyze audio properties
    },

    onComplete: () => {
      console.log('✓ Advanced audio processing completed');
    },
  };

  try {
    const voiceService = new VoiceEngineAdapter(options);

    const advancedText = `
      <prosody rate="105%" pitch="+2%">
      Aivis Cloud APIの高度な設定例です。
      </prosody>
      <break time="0.4s"/>
      <prosody rate="95%" volume="110%">
      感情表現の強さや話速を細かく調整できます。
      </prosody>
    `;

    await voiceService.speakText(advancedText);
    console.log('✅ Advanced example completed!');
  } catch (error) {
    console.error('❌ Advanced example failed:', error.message);
  }
}

// Run examples
async function runAll() {
  await main();
  await advancedExample();
}

if (require.main === module) {
  runAll().catch(console.error);
}
