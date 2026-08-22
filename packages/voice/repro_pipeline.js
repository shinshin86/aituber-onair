// Reproduce el flujo real del avatar con el paquete de voz real,
// contra el TTS vivo en 127.0.0.1:8000. onPlay simula la reproducción
// del avatar: resuelve tras 2s (como un WAV breve) o tras `durationSecs`.
const path = require('path');
const fs = require('fs');
const { VoiceEngineAdapter } = require('./dist/cjs/services/VoiceEngineAdapter.js');

const BASE = 'http://127.0.0.1:8000/v1/audio/speech';
const MODEL = 'audiocpp-qwen3-tts-0.6b';

const t0 = Date.now();
const log = (m) => console.log(`[+${((Date.now()-t0)/1000).toFixed(2)}s] ${m}`);

function wait(ms){return new Promise(r=>setTimeout(r,ms));}

(async () => {
  // --- Caso 1: un párrafo largo con N frases, como lo hace el core ---
  // El core hace: chunks.map(c => voiceService.speak({...})) ; await Promise.all(...)
  // Replicamos exacto con 5 frases cortas.

  const onPlayLog = [];
  const onPlay = (buf, opts) => {
    const bytes = buf && buf.byteLength || 0;
    onPlayLog.push({ bytes, at: Date.now() - t0 });
    log(`onPlay bytes=${bytes}`);
    // simulate avatar playback ~1.5s
    return new Promise((resolve) => setTimeout(resolve, 1500));
  };

  const adapter = new VoiceEngineAdapter({
    engineType: 'openaiCompatible',
    speaker: 'Elara',
    openAiCompatibleApiUrl: BASE,
    openAiCompatibleModel: MODEL,
    onPlay,
  });

  const sentences = [
    'Primera frase que empieza la lectura.',
    'Segunda frase ya sintetizada al mismo tiempo.',
    'Tercera frase del párrafo para probar el pipeline.',
    'Cuarta frase sigue la secuencia.',
    'Final del párrafo de prueba.',
  ];

  const screenplays = sentences.map((text, i) => ({ text, emotion: 'neutral', _i: i }));

  log('lanzando ' + screenplays.length + ' frases concurrentes (como el core)...');
  const all = screenplays.map((s) => adapter.speak({ text: s.text, emotion: 'neutral' }));

  // timeout global de 90s por si se cuelga
  let resolved = 0; let failed = 0;
  const guard = setTimeout(() => {
    log(`TIMEOUT 90s — resolved=${resolved} failed=${failed}  (COLGUE detectado)`);
    process.exit(3);
  }, 90000);

  await Promise.allSettled(all.map(async (p, i) => {
    try {
      await p;
      resolved++;
      log(`frase ${i} resuelta`);
    } catch (e) {
      failed++;
      log(`frase ${i} RECHAZADA: ${e && e.message}`);
    }
  }));
  clearTimeout(guard);

  log(`FIN: ${onPlayLog.length} audios recibidos en el avatar, resolved=${resolved}, failed=${failed}`);

  // validar orden
  const ordered = onPlayLog.length === screenplays.length;
  if (!ordered) log('AVISO: llegaron menos audios que frases');

  process.exit(resolved === screenplays.length && failed === 0 ? 0 : 1);
})().catch(e => { console.error('EXC', e); process.exit(2); });
