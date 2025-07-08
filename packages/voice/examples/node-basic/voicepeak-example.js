/**
 * VoicePeak example for @aituber-onair/voice in Node.js
 * This example demonstrates using VoicePeak TTS engine.
 * 
 * Requirements:
 * - VoicePeak server running on http://localhost:20202
 * - Optional: npm install speaker OR npm install play-sound
 */
const { VoiceEngineAdapter } = require('../../dist/cjs/index.js');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('=== AITuber OnAir Voice - VoicePeak Example ===\n');

  // VoicePeak configuration
  const voicepeakOptions = {
    engineType: 'voicepeak',
    speaker: 'f1', // VoicePeak speaker ID
    voicepeakApiUrl: 'http://localhost:20202', // Default VoicePeak server URL
    onComplete: () => {
      console.log('✓ Speech processing completed');
    }
  };

  // Test 1: Server connectivity check
  console.log('=== Test 1: Server connectivity check ===');
  console.log(`Checking VoicePeak server at: ${voicepeakOptions.voicepeakApiUrl}`);
  
  let serverAvailable = false;
  try {
    // Test server connectivity first
    const response = await fetch(voicepeakOptions.voicepeakApiUrl);
    console.log('✓ VoicePeak server is responding');
    serverAvailable = true;
  } catch (error) {
    console.error('❌ Cannot connect to VoicePeak server');
    console.error(`Error: ${error.cause?.code || error.message}`);
    console.log('\n📌 To use VoicePeak:');
    console.log('1. Download and install VoicePeak');
    console.log('2. Start the server on http://localhost:20202');
    console.log('3. Run this example again');
    console.log('\n⏭️  Continuing with adapter creation test...\n');
  }

  try {
    const voiceService = new VoiceEngineAdapter(voicepeakOptions);
    console.log('✓ VoiceEngineAdapter created successfully');
    console.log(`✓ Using speaker ID: ${voicepeakOptions.speaker}`);
    console.log(`✓ Configured URL: ${voicepeakOptions.voicepeakApiUrl}`);
    console.log();
  } catch (error) {
    console.error('❌ Failed to create adapter:', error.message);
    return;
  }

  // Skip speech tests if server is not available, but show silent mode
  if (!serverAvailable) {
    console.log('⚠️  VoicePeak server not available - demonstrating silent mode\n');
    
    console.log('=== Silent Mode Demo ===');
    try {
      const silentService = new VoiceEngineAdapter({
        engineType: 'none',
        speaker: 'default'
      });
      
      await silentService.speakText('This would be VoicePeak output if server was running');
      console.log('✓ Silent mode test passed');
      console.log('ℹ️  This shows the package works, but no audio is generated\n');
    } catch (error) {
      console.error('❌ Silent mode test failed:', error.message);
    }
    
    console.log('=== Summary ===');
    console.log('✅ Basic adapter test completed!');
    console.log('✅ Silent mode demonstration completed!');
    console.log('❌ VoicePeak tests skipped (server unavailable)');
    console.log('\nTo test actual speech generation:');
    console.log('1. Install and start VoicePeak server on http://localhost:20202');
    console.log('2. Run this example again');
    return;
  }

  // Test 2: Save audio to file
  console.log('=== Test 2: Generate and save audio ===');
  try {
    const outputPath = path.join(__dirname, 'voicepeak-output.wav');
    
    const voiceService = new VoiceEngineAdapter({
      ...voicepeakOptions,
      onPlay: async (audioBuffer) => {
        console.log(`✓ Received audio buffer (${audioBuffer.byteLength} bytes)`);
        fs.writeFileSync(outputPath, Buffer.from(audioBuffer));
        console.log(`✓ Audio saved to: ${outputPath}`);
      }
    });

    console.log('Generating speech with VoicePeak...');
    await voiceService.speakText('こんにちは、VoicePeakの音声合成テストです。');
    console.log('✓ Test 2 passed\n');
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
    console.error('Make sure VoicePeak server is running on http://localhost:20202\n');
  }

  // Test 3: Speaker playback test
  console.log('=== Test 3: Speaker playback test ===');
  try {
    const voiceService = new VoiceEngineAdapter(voicepeakOptions);

    console.log('Testing speaker playback...');
    await voiceService.speakText('[happy] VoicePeakのスピーカー再生テストです。');
    console.log('✓ Test 3 passed\n');
  } catch (error) {
    console.error('❌ Test 3 failed:', error.message, '\n');
  }

  // Test 4: Test with emotions
  console.log('=== Test 4: Emotion test ===');
  const emotions = [
    { emotion: 'happy', text: '[happy] 嬉しいです！VoicePeakで感情表現のテストをしています。' },
    { emotion: 'sad', text: '[sad] 悲しい気持ちを表現しています。' },
    { emotion: 'angry', text: '[angry] 怒っている感情を表現しています。' }
  ];

  for (const { emotion, text } of emotions) {
    try {
      const outputPath = path.join(__dirname, `voicepeak-${emotion}.wav`);
      
      const voiceService = new VoiceEngineAdapter({
        ...voicepeakOptions,
        onPlay: async (audioBuffer) => {
          fs.writeFileSync(outputPath, Buffer.from(audioBuffer));
        }
      });

      console.log(`Testing ${emotion} emotion...`);
      await voiceService.speakText(text);
      console.log(`✓ Saved to: voicepeak-${emotion}.wav`);
    } catch (error) {
      console.error(`❌ Failed for ${emotion}:`, error.message);
    }
  }

  console.log('\n=== Summary ===');
  console.log('✅ VoicePeak example completed!');
  console.log('\nℹ️  To use VoicePeak:');
  console.log('1. Install and run VoicePeak server');
  console.log('2. Default URL: http://localhost:20202');
  console.log('3. Default speaker ID: f1');
  console.log('\nℹ️  Generated files can be played with:');
  console.log('- macOS: afplay filename.wav');
  console.log('- Linux: aplay filename.wav');
  console.log('- Windows: start filename.wav');
}

main().catch(console.error);