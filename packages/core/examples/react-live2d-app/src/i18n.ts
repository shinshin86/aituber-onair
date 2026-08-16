/**
 * Sistema de internacionalización - Español
 */

export const i18n = {
  // Navegación principal
  settings: 'Configuración',
  general: 'General',
  visual: 'Visual',
  tts: 'Voz/TTS',
  llmChat: 'LLM/Chat',
  stream: 'Stream',
  about: 'Acerca de',

  // Botones y acciones comunes
  load: 'Cargar',
  open: 'Abrir',
  close: 'Cerrar',
  save: 'Guardar',
  send: 'Enviar',
  start: 'Iniciar',
  stop: 'Detener',
  clear: 'Limpiar',
  delete: 'Eliminar',
  add: 'Añadir',
  update: 'Actualizar',

  // Términos técnicos
  chat: 'Chat',
  input: 'Entrada de texto',
  audio: 'Audio',
  voice: 'Voz',
  emotion: 'Emoción',
  comment: 'Comentario',
  model: 'Modelo',
  provider: 'Proveedor',
  endpoint: 'Endpoint',
  apiKey: 'Clave API',
  systemPrompt: 'Prompt del sistema',

  // Visual y avatar
  background: 'Fondo',
  greenScreen: 'Pantalla verde',
  avatar: 'Avatar',
  live2dModel: 'Modelo Live2D',
  model3: 'Modelo 3D',

  // Stream y comentarios
  youtubeApiKey: 'Clave API YouTube',
  twitchClientId: 'Client ID Twitch',
  connectToTwitch: 'Conectar a Twitch',
  channel: 'Canal',
  enabled: 'Activado',
  disabled: 'Desactivado',

  // Screen vision
  screenVision: 'Visión de pantalla',
  viewScreen: 'Ver pantalla',
  preview: 'Vista previa',

  // Emotion effects
  emotionEffect: 'Efecto de emoción',
  emotionEffects: 'Efectos de emoción',
  effectMap: 'Mapa de efectos',

  // Status messages
  configured: 'Configurado',
  notConfigured: 'No configurado',

  // Emotion labels (traducción directa)
  happy: 'Alegría',
  surprised: 'Sorpresa',
  sad: 'Tristeza',
  angry: 'Enfado',
  relaxed: 'Relajación',
  thinking: 'Pensando',
  neutral: 'Neutral',

  // Effects labels
  sparkles: 'Brillos',
  rays: 'Rayos',
  tears: 'Lágrimas',
  angerMark: 'Marcas de enfado',
  bubbles: 'Burbujas',
  thoughtBubble: 'Burbuja de pensamiento',

  // Stream settings
  streamTopic: 'Tema del stream',
  streamTitle: 'Título del stream',
  maxCommentsPerBatch: 'Máx. comentarios por lote',
  analysisIntervalMs: 'Intervalo análisis (ms)',
  minCommentsForLLMAnalysis: 'Mín. comentarios para análisis LLM',

  // Manneri settings
  similarityThreshold: 'Umbral de similitud',
  lookbackWindow: 'Ventana de retroceso',
  interventionCooldownMs: 'Tiempo espera intervención (ms)',
  minMessageLength: 'Longitud mínima mensaje',

  // Comment intelligence
  rulesMode: 'Modo reglas',
  hybridMode: 'Modo híbrido',
  llmAssistedMode: 'Modo asistido LLM',
  useSameLLMSettings: 'Usar mismos settings LLM',
};

export function t(key: string): string {
  return i18n[key as keyof typeof i18n] || key;
}
