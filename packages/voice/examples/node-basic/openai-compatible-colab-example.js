/**
 * OpenAI-compatible Colab TTS example for @aituber-onair/voice.
 *
 * This is intended for short-lived Google Colab TTS servers such as
 * local-tts-on-google-colab exposed through a trycloudflare URL.
 */
const fs = require('node:fs');
const path = require('node:path');
const {
  AudioPlayerFactory,
  VoiceEngineAdapter,
} = require('../../dist/cjs/index.js');

const env = process.env;

const apiUrl = (env.OPENAI_COMPATIBLE_TTS_URL || '').trim();
const model = (env.OPENAI_COMPATIBLE_TTS_MODEL || '').trim();
const voice = (env.OPENAI_COMPATIBLE_TTS_VOICE || '').trim();
const text =
  env.OPENAI_COMPATIBLE_TTS_TEXT ||
  'こんにちは。AITuber OnAir Voice から再生しています。';
const apiKey = (env.OPENAI_COMPATIBLE_TTS_API_KEY || '').trim();
const speed = Number(env.OPENAI_COMPATIBLE_TTS_SPEED || '1');
const outputPath = path.resolve(
  __dirname,
  env.OPENAI_COMPATIBLE_TTS_OUTPUT || 'openai-compatible-colab-output.wav',
);
const shouldPlay = env.OPENAI_COMPATIBLE_TTS_PLAY !== '0';

function requireValue(value, name) {
  if (!value) {
    throw new Error(`${name} is required.`);
  }
}

async function main() {
  requireValue(apiUrl, 'OPENAI_COMPATIBLE_TTS_URL');
  requireValue(model, 'OPENAI_COMPATIBLE_TTS_MODEL');

  console.log('=== OpenAI-Compatible Colab TTS Example ===');
  console.log(`Endpoint: ${apiUrl}`);
  console.log(`Model   : ${model}`);
  console.log(`Voice   : ${voice || '(omitted)'}`);
  console.log(`Speed   : ${Number.isFinite(speed) ? speed : 1}`);
  console.log(`Output  : ${outputPath}`);

  const audioPlayer = AudioPlayerFactory.createAudioPlayer();
  const voiceService = new VoiceEngineAdapter({
    engineType: 'openaiCompatible',
    speaker: voice,
    apiKey: apiKey || undefined,
    openAiCompatibleApiUrl: apiUrl,
    openAiCompatibleModel: model,
    openAiCompatibleSpeed: Number.isFinite(speed) ? speed : 1,
    onPlay: async (audioBuffer) => {
      fs.writeFileSync(outputPath, Buffer.from(audioBuffer));
      console.log(`Saved audio: ${outputPath}`);

      if (shouldPlay) {
        await audioPlayer.play(audioBuffer);
      }
    },
    onComplete: () => {
      console.log('Speech completed');
    },
  });

  await voiceService.speakText(text);
}

main().catch((error) => {
  console.error('OpenAI-compatible Colab TTS example failed.');
  console.error(error);
  console.error('\nRequired environment variables:');
  console.error('- OPENAI_COMPATIBLE_TTS_URL');
  console.error('- OPENAI_COMPATIBLE_TTS_MODEL');
  console.error('\nOptional environment variables:');
  console.error('- OPENAI_COMPATIBLE_TTS_VOICE');
  console.error('- OPENAI_COMPATIBLE_TTS_TEXT');
  console.error('- OPENAI_COMPATIBLE_TTS_SPEED');
  console.error('- OPENAI_COMPATIBLE_TTS_API_KEY');
  console.error('- OPENAI_COMPATIBLE_TTS_OUTPUT');
  console.error('- OPENAI_COMPATIBLE_TTS_PLAY=0');
  process.exitCode = 1;
});
