/* E2E: paquete @aituber-onair/voice REAL (dist) -> TTS server vivo (:8000).
 * Simula el pipeline por frases: el core chunka el texto y VoiceEngineAdapter
 * debe procesar cada frase de forma serial (fetchAudio -> onPlay -> siguiente).
 * El onPlay valida que cada buffer sea un WAV válido y registra tiempos,
 * igual que lo haría useAudioLipsync.play() en el navegador.
 */
const { VoiceEngineAdapter } = require('./packages/voice/dist/cjs/index.js');

const TTS_URL = 'http://127.0.0.1:8000/v1/audio/speech';
const MODEL = 'audiocpp-qwen3-tts-0.6b';
const TEXT =
  '¡Hola! Esta es la primera frase de la prueba. Segunda frase para verificar la cola serial. Tercera frase con un punto y coma; y cuarta con signo… ¿Funciona todo?';

function splitSentencesEs(text) {
  const parts = text.split(/(?<=[.!?;…])\s+|\?/g);
  return parts.map((p) => p.trim()).filter(Boolean);
}

async function main() {
  const events = [];
  let t0 = Date.now();
  const ts = () => `+${((Date.now() - t0) / 1000).toFixed(2)}s`;

  const adapter = new VoiceEngineAdapter({
    engineType: 'openaiCompatible',
    speaker: 'Elara',
    apiKey: '',
    openAiCompatibleApiUrl: TTS_URL,
    openAiCompatibleModel: MODEL,
    onPlay: async (buffer) => {
      const b = Buffer.from(buffer);
      const isWav = b.length > 44 && b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WAVE';
      events.push({ t: ts(), type: 'play', bytes: b.length, isWav });
      if (!isWav) throw new Error('onPlay recibió un buffer que no es WAV');
      // En el navegador esto resolvería al terminar de sonar; aquí "suena" al instante
    },
  });

  const sentences = splitSentencesEs(TEXT);
  console.log(`Frases detectadas (${sentences.length}):`);
  sentences.forEach((s, i) => console.log(`  [${i}] ${s}`));
  console.log('');

  const tSpeak = Date.now();
  await Promise.all(
    sentences.map((s) => adapter.speak({ text: s }, { enableAnimation: true })),
  );
  const total = ((Date.now() - tSpeak) / 1000).toFixed(2);

  const plays = events.filter((e) => e.type === 'play');
  console.log('\n=== RESULTADO E2E ===');
  console.log(`Frases enviadas:  ${sentences.length}`);
  console.log(`Frases reproducidas: ${plays.length}`);
  console.log(`Todas WAV válidas: ${plays.every((p) => p.isWav)}`);
  console.log(`Tiempo total:      ${total}s`);
  console.log('\nLínea de tiempo:');
  events.forEach((e) => console.log(`  ${e.t} ${e.type} ${e.bytes} bytes wav=${e.isWav}`));

  const ok = plays.length === sentences.length && plays.every((p) => p.isWav);
  console.log(`\nVEREDICTO: ${ok ? 'OK — pipeline serial entregó audio por cada frase' : 'FAIL — falta audio'}`);
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error('E2E error:', err.message);
  process.exit(1);
});
