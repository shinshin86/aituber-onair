// Test @aituber-onair/voice compatibility with Deno
// Run with: deno run --allow-net --allow-read examples/deno-test.ts

import { VoiceEngineAdapter } from '../dist/index.js';

console.log('Testing AITuber OnAir Voice in Deno environment...\n');

// Check runtime
console.log(`Runtime: Deno ${Deno.version.deno}`);
console.log(`TypeScript: ${Deno.version.typescript}`);
console.log(`V8: ${Deno.version.v8}\n`);

// Create voice service options
const voiceOptions = {
  speaker: '46',
  engineType: 'voicevox' as const,
  voicevoxApiUrl: 'http://localhost:50021',
  onComplete: () => {
    console.log('✓ Speech playback completed');
  }
};

try {
  // Create voice adapter
  const voiceService = new VoiceEngineAdapter(voiceOptions);
  console.log('✓ VoiceEngineAdapter created successfully');

  // Check if playing (should be false)
  console.log(`✓ isPlaying: ${voiceService.isPlaying()}`);

  // Test environment detection
  console.log(`✓ typeof window: ${typeof window}`);
  console.log(`✓ typeof Deno: ${typeof Deno}`);

  console.log('\n✓ Basic compatibility test passed!');
  console.log('\nNote: Deno has the following characteristics:');
  console.log('- Has global "window" object (browser-like)');
  console.log('- No native audio playback support');
  console.log('- Requires --allow-net flag for network requests');
  console.log('- Can use fetch() natively');
  
} catch (error) {
  console.error('❌ Error:', error);
}