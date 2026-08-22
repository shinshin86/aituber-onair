# Pitonisa — Sistema Agéntico de VTuber (AITuber OnAir)

> Documento de referencia completo del sistema: arquitectura, integración de
> TikTok Live, motor agéntico de chat con **memoria persistente por
> espectador**, priorización de regalos, e integración del MCP de tarot.
>
> Última actualización: 2026-08-22. Estado: build verificado (`tsc -b` +
> `vite build`, limpio) y tests del paquete de memoria pasan (15/15).

---

## 1. Resumen ejecutivo

Pitonisa es una **VTuber de lectura de cartas** que responde en el chat en
vivo de TikTok (y, en paralelo, Twitch/YouTube). No es un simple
pregunta→respuesta: es un **agente con memoria** que

- recuerda **quién es cada espectador** (`@handle` como id canónico),
- llama a cada uno por **nombre humano**, no por nick literal
  (`Andrea425` → "Andrea"),
- guarda sus **consultas de tarot**, **datos personales** y **regalos**,
- y en cada interacción inyecta ese historial en el prompt para dar
  **continuidad** ("Paco? ¿qué pasó con José?", "¿cómo te fue en la
  reunión?").

Tres piezas nuevas componen el sistema en este monorepo:

| Pieza | Qué hace | Ubicación |
|-------|----------|-----------|
| **Relay TikTok** | Consume los eventos de TikTok Live (no-oficial) y los reparte por SSE al navegador | `packages/core/examples/react-live2d-app/scripts/tiktok-live-relay.mjs` |
| **Memoria por espectador** | Almacén persistente (key/value) de identidad, consultas, eventos, regalos y sesiones | `packages/viewer-memory/` (nuevo) |
| **Wiring en la app** | Hook `useViewerMemory` + inyección en el pipeline de chat y scoring de regalos | `packages/core/examples/react-live2d-app/` |

Sobre ello ya existían (y se ampliaron):

- `@aituber-onair/comment-intelligence` — normalización de comentarios por
  plataforma (incluidos **normalizadores nativos de TikTok**: chat y
  regalos), ranking y análisis.
- `@aituber-onair/mcp-tarot` — servidor MCP para tiradas de cartas (en
  desarrollo; se documenta en §7).
- Integrares de Twitch (WebSocket) y YouTube (polling) como referencia del
  patrón que sigue TikTok.

---

## 2. Arquitectura general

```
┌──────────────────────────────────────────────────────────────────────┐
│  NAVEGADOR  (react-live2d-app)                                        │
│                                                                      │
│  useTwitchComments / useYoutubeComments / useTikTokComments          │
│        │ (eventos normalizados)                                       │
│        ▼                                                             │
│  useLiveCommentIntelligence ── enqueueYouTube/Twitch/TikTokComments   │
│        │                        enqueueTikTokGifts                   │
│        │  ▲ emitViewerEvents ───────────────────────────────┐         │
│        │  │                                                 │         │
│        ▼  │                                                 ▼         │
│  createCommentIntelligence                        useViewerMemory     │
│   .analyze({ comments, viewerProfiles })     (ViewerMemoryStore)     │
│        │   (ranking + scoring con regalos)        ▲  │               │
│        ▼                                           │  ▼               │
│  formatCommentIntelligencePrompt               memoria persistente   │
│        │  + buildViewerContext(autor)              │                 │
│        ▼                                           │                 │
│  processChat(prompt, { displayText, viewerContext })◄───────────────┘ │
│        │                                                             │
│        ▼                                                             │
│  @aituber-onair/core → LLM (Ollama local) → TTS → lipsync Live2D      │
└──────────────────────────────────────────────────────────────────────┘
              ▲ SSE (eventos de chat + regalos)
              │
┌─────────────┴──────────────────────────────────────────────────────────┐
│  RELAY TikTok (Node, tiktok-live-connector)  :8787                     │
│   /tiktok/events  →  empuja {type: chat|gift, ...}                     │
└──────────────────────────────────────────────────────────────────────────┘
```

**Flujo de un mensaje de TikTok:**

1. `tiktok-live-relay.mjs` conecta con TikTok Live (`tiktok-live-connector`),
   escucha `chat` y regalos, los serializa y los empuja por **SSE** a
   `:8787/tiktok/events`.
2. `useTikTokComments` hace *polling*/EventSource del SSE, decodifica y llama
   a `onComment` / `onGift`.
3. `App.tsx` pasa cada evento a `enqueueTikTokComments(Gifts)`.
4. Estos normalizan vía `normalizeTikTokChatComment` / `normalizeTikTokGift`
   de `comment-intelligence` y **emiten un `ViewerMemoryEvent`** hacia la
   memoria.
5. El *flush* periódico llama a `comment-intelligence.analyze` con la cola y
   los `viewerProfiles` (nivel de relación). Se elige el comentario con mejor
   scoring (con **boost por regalos**).
6. Se forma el prompt de `comment-intelligence` + el **contexto de memoria**
   del autor elegido (`buildViewerContext`) y se llama a
   `processChat(prompt, { displayText, viewerContext })`.
7. `useAituberCore.processChat` inyecta `viewerContext` como instrucción
   interna de contexto y envía a LLM → TTS → avatar.

---

## 3. Integración de TikTok Live

### 3.1 Por qué un relay (no librería en el navegador)

La API pública de TikTok no expone un chat en vivo accesible desde el
cliente. Se usa el paquete **`tiktok-live-connector`** (Node) que se
conecta al *websocket* no-oficial de TikTok. Como ese módulo no puede
ejecutarse directamente en el navegador, un **proceso Node de relay** lo
consume y reparte los eventos por **SSE** al frontend.

- Dependencia: `tiktok-live-connector@^2.4.3` (resuelta 2.4.4) en
  `react-live2d-app` (y en `react-inochi2d-app`).
- El relay se ejecuta de forma separada:
  `node scripts/tiktok-live-relay.mjs` → escucha en `127.0.0.1:8787`.

### 3.2 Componentes

| Archivo | Responsabilidad |
|---------|-----------------|
| `scripts/tiktok-live-relay.mjs` | Conecta TikTok, normaliza `chat`/regalos, expone SSE `/tiktok/events` |
| `src/services/tiktok/tiktokService.ts` | Tipos `TikTokChatMessage` / `TikTokGiftMessage` + cliente SSE desde el navegador |
| `src/hooks/useTikTokComments.ts` | Hook React: consume el SSE, dedup, llama `onComment`/`onGift` |
| `comment-intelligence/normalizers/tiktok.ts` | `normalizeTikTokChatComment`, `normalizeTikTokGift`, `normalizeTikTokLiveEvent` |
| `comment-intelligence/types/tiktok.ts` | Tipos de plataforma TikTok (gift, live event) |

### 3.3 Configuración (misma forma que Twitch/YouTube)

En `Settings → Streams`, la opción de plataforma ya incluye **`tiktok`**
(conjunto a `youtube`/`twitch`). Los campos guardados en
`settings.stream`:

```ts
{
  tiktokUniqueId: string;          // @usuario de TikTok (canal en vivo)
  tiktokRelayUrl: string;          // p.ej. http://127.0.0.1:8787/tiktok/events
  tiktokEnabled: boolean;
  tiktokCommentIntervalMs: number; // cadencia de análisis
}
```

- `useSettings.ts` añade `tiktokEnabled`, `tiktokCommentIntervalMs` y
  callbacks `updateTikTokUniqueId/RelayUrl/Enabled/CommentIntervalMs`.
- `StreamSettings.tsx` pinta la sección (enabled, uniqueId, relayUrl,
  interval) idéntica en estilo a las de YouTube/Twitch.
- `App.tsx` llama a `useTikTokComments({ tiktokUniqueId, relayUrl,
  isEnabled: platform==='tiktok' && tiktokEnabled, onComment, onGift,
  onError })`.

El patrón es **idéntico** al de Twitch/YouTube: normalizar → enqueue →
scoring → respuesta. Así TikTok es **paralelo** a las otras plataformas y
cualquiera puede estar activa (el `stream.platform` decide cuál usa).

---

## 4. Motor agéntico de chat: memoria por espectador

### 4.1 Paquete `@aituber-onair/viewer-memory`

Nueva dependencia interna del workspace. API pública (`src/index.ts`):

```ts
class ViewerMemoryStore {
  constructor(storage?: MemoryStorageAdapter);
  // lecturas
  get(viewerId): ViewerRecord | undefined;
  getAll(): ViewerRecord[];
  getViewerProfile(viewerId): ViewerProfile | undefined; // para scoring CI
  getDonorTier(viewerId): DonorTier;
  rankViewersByPriority(): ViewerRecord[];
  // escrituras
  recordMessage(viewerId, nickname, platform): void;
  setRealName(viewerId, realName): void;
  recordConsultation(viewerId, { topic, about?, detail?, platform? }): ViewerConsultation;
  recordPersonalEvent(viewerId, { kind, summary, eventDate? }): void;
  recordGift(viewerId, nickname, { name, diamonds? }): void;
  endSession(viewerId, summary, startedAt, platform, messageCount): void;
  reset(): void;
}
normalizeViewerId(handle): string;   // sin @, minúsculas
buildViewerContext(record, opts?): string;   // bloque para el prompt
```

### 4.2 Modelo de datos (qué se guarda por usuario)

`viewerId` canónico = **`@handle` normalizado** (sin `@`, minúsculas). El
*nick* se interpreta y no se lee tal cual.

```ts
type ViewerRecord = {
  viewerId: string;
  nickname: string;            // tal cual llega
  displayName: string;         // interpretado: "Andrea425" -> "Andrea"
  realName?: string;           // si el usuario dice "me llamo X"
  firstSeenAt: number;
  lastSeenAt: number;
  totalMessageCount: number;
  relationshipLevel: number;   // 0-10
  consultations: ViewerConsultation[];   // tiradas previas (topic, about, fecha)
  personalEvents: ViewerPersonalEvent[]; // viaje, reunión, salud, relación...
  gifts: GiftAccumulator;      // totalDiamonds, eventCount, biggestGift, lastGiftAt
  sessions: ViewerSessionSummary[];      // resúmenes al cerrar cada stream
  tags: string[];              // "vip", "has-real-name", ...
};

type ViewerConsultation  = { id, topic, about?, detail?, at, platform };
type ViewerPersonalEvent = { id, kind, summary, at, eventDate? };
type GiftAccumulator     = { totalDiamonds, eventCount, biggestGift?, lastGiftAt?, lastGiftName? };
type ViewerSessionSummary= { startedAt, endedAt, platform, messageCount, consultationTopics, summary };
type DonorTier           = 'vip' | 'regular' | 'small' | 'none';
```

**Persistencia:** `localStorage` en el navegador (key
`aituber.viewerMemory.v1`), con *fallback* a memoria si no existe (tests).
El adaptador es inyectable (`MemoryStorageAdapter`) para cambiar a IndexedDB,
backend, etc. sin tocar el resto.

### 4.3 Interpretación de nicks (`nameInterpreter.ts`)

Regla: el agente **no** debe leer el nick literal. Heurística:

1. Si hay `realName` conocido → se usa.
2. Si el nick tiene sufijo numérico/prefijo de ruido
   (`Andrea425`, `elMati_90`, `user_...`) → se extrae la parte alfabética.
3. Caso contrario, el nick ya es un nombre humano.

Tests que lo cubren: `Andrea425 → Andrea`, `elMati_90 → Mati`,
`Maria_Sofia → Maria Sofia`, nicks ya limpios intactos.

### 4.4 Extracción de datos (MVP reglas, plugable a LLM)

En `useViewerMemory.ts` se aplica sobre cada mensaje un análisis local
(ligero y sin red) que detecta y **guarda**:

- **Nombre real:** `"me llamo X"` / `"mi nombre es X" /"soy X"`.
- **Consultas de tarot:** menciones de `tirada`/`tarot`/`cartas` + tema
  (`amor`, `trabajo`...) + sujeto (`por José`, `sobre María`).
- **Hitos personales:** `viaje a la costa`, `reunión el lunes`,
  `cumpleaños`, `operación`, etc.

> Nota de diseño: en el MVP la detección de consultas/eventos es por reglas
> (palabras clave), deliberadamente sin LLM para no añadir latencia ni coste
> a cada mensaje. Es fácil conectar aquí un passthrough del LLM cuando el
> MCP de tarot esté finalizado (ver §8).

### 4.5 Inyección en la conversación (`buildViewerContext`)

Para el autor del comentario elegido, se genera un bloque de texto que se
inyecta en `processChat` como **instrucción interna de contexto**. Contiene:

- identidad (nombre, "dirígete a esta persona como X"),
- nivel de relación y nº de mensajes (si es habitual, más confianza),
- regalos acumulados (agradecerlos),
- **consultas de tarot anteriores** (fecha relativa: "ayer", "hace 3 días"),
- **datos personales** que comentó (para preguntarle cómo le fue),
- última sesión (resumen).

Ejemplo de contexto inyectado para `@andrea425`:

```
Contexto sobre este espectador (memoria persistente...)
[Espectador] Su nick es Andrea425; dirígete a esta persona como Andrea.
Consultas de tarot anteriores:
- hace 4 días: tirada de amor sobre Jose.
Datos personales que comentó:
- Me fui de viaje a la costa la semana pasada.
Si tiene sentido, pregúntale cómo le fue...
<mensaje actual>
```

Esto es lo que permite al agente hacer continuidad tipo:
*"Paco? ¿qué pasó con José? jajaja"*, o *"¿cómo fue tu viaje a la costa?"*.

### 4.6 Priorización de regalos (TikTok)

Requisito: **prioridad a regalos grandes**; si no, por acumulación de
regalos pequeños, luego seguidores/likes/reincidencia.

- `comment-intelligence/scoring.ts` (`scoreComment`): si el comentario es un
  **regalo** (`metadata.eventKind==='gift'`) se aplica un `priorityBoost`:
  - `diamonds >= 100` → `+0.35` (razón `big_gift`)
  - `diamonds > 0` → `+0.2` (razón `gift`)
  - sin diamantes (solo repeticiones) → `+0.12` (razón `gift`)
  Esto empuja al donante en el ranking sobre la conversación normal.
- `ViewerMemoryStore.getDonorTier()`: `vip` (≥300 diamantes acumulados y
  regalo reciente en ventana de 7 días), `regular` (tiene regalos),
  `small` (sólo reincidencia/mensajes ≥20), `none`.
- `rankViewersByPriority()`: ordena por tier → diamantes → mensajes → nivel,
  para exponer "a quién le toca la atención".

El scoring del ranking (`comment-intelligence`) y el tier de la memoria se
apuntalan: el primero decide *qué comentario elegir ahora*; el segundo,
*quién tiene más crédito acumulado* para personalizar y para las decisiones
del agente.

---

## 5. Almacenamiento y ciclo de vida

| Dato | Dónde | Cuándo se escribe |
|------|-------|-------------------|
| Mensaje (contador, nivel) | `ViewerMemoryStore` (localStorage) | Cada `ViewerMemoryEvent` (chat) |
| Nombre real | `setRealName` | Al detectarse "me llamo X" |
| Consulta de tarot | `recordConsultation` | Al detectar una tirada |
| Evento personal | `recordPersonalEvent` | Al detectar un hito |
| Regalo | `recordGift` | Cada `ViewerMemoryEvent` (gift) |
| Sesión/resumen | `endSession` | Al cerrar el stream (o a interval) |
| Configuración de streams/LLM/TTS | `settings` (localStorage de la app) | Al cambiar en Settings |

**Ciclo de stream:** un `useEffect` observa `stream.platform`. Al pasar de
`none`→plataforma activa llamada `startStream(platform)`; al volver a `none`
llama `endStream(platform)`, que cierra la sesión de cada espectador activo y
guarda su resumen.

> La persistencia actual es **por navegador** (localStorage). Para que la
> memoria sobreviva en producción entre dispositivos/ejemplares, el siguiente
> paso es sustituir `MemoryStorageAdapter` por un backend (ver §8), sin
> cambiar el resto del sistema.

---

## 6. Pipeline de respuesta (no cambia, ahora con memoria)

`useAituberCore.processChat(text, { displayText, viewerContext })`:

1. Inyecta `viewerContext` (memoria) en el input si existe.
2. Pasa el detector **Manneri** (intervención / anti-monotonía).
3. Llamada al LLM (Ollama local) con streaming.
4. TTS por **frases** (pipeline serial: síntesis → suena → siguiente).
5. Eventos `SPEECH_START/END` y `ASSISTANT_*` controlan lipsync y chat.

La firma de `useAudioLipsync` se mantiene: `{ play, stop, audioBinding,
isSpeaking }`.

---

## 7. MCP de tarot (en desarrollo)

`packages/mcp-tarot` ya tiene código base funcional (no vacío):

- `src/server.ts` — servidor MCP (stdio/WS).
- `src/services/SpreadEngine.ts` — motor de tiradas.
- `src/services/CardDeck.ts` — baraja.
- `src/protocols/tarot-schema.ts` — esquema del protocolo.
- `tarot-assets/cards/` — imágenes Rider-Waite; `tarot-viewer/` — vista 3D.

Se integrara como **skill/herramienta** del agente (animaciones + control de
tiradas multi-juego) cuando esté finalizado; este documento se actualizara
con las instrucciones de uso. `tsc --noEmit` pasa en ese paquete.

---

## 8. Cómo ejecutar y verificar

### Build

```bash
# desde la raíz del workspace
npm install
cd packages/core/examples/react-live2d-app
npm run build            # tsc -b && vite build  (limpio)
```

### Tests de la memoria

```bash
cd packages/viewer-memory
npm test                 # vitest  →  15/15
```

### Relay TikTok (proceso separado)

```bash
cd packages/core/examples/react-live2d-app
node scripts/tiktok-live-relay.mjs   # escucha en 127.0.0.1:8787
```

### Arranque típico

1. Levanta Ollama local (LLM) y el TTS server.
2. Arranca el relay TikTok (`node scripts/tiktok-live-relay.mjs`).
3. Sirve la app (`npm run dev` en `react-live2d-app`).
4. En Settings → Streams selecciona **TikTok**, pon el `@uniqueId`, la
   `relayUrl` y activa el toggle.
5. Chatear/es enviar regalos en el live → el avatar responde con memoria.

---

## 9. Decisiones y supuestos

- **Idioma de respuesta:** el agente responde en español (perfil del usuario).
- **Modelo de chat:** Ollama local (runtime configurado). TTS: `aituber-tts-server`
  como backend único (Qwen3-TTS local, Edge fallback cloud).
- **Reglas vs LLM para extracción:** MVP = reglas locales (barato, sin
  latencia). Es plugable a LLM/MCP de tarot sin cambiar la API.
- **Persistencia:** localStorage por navegador en el MVP; backend posterior
  vía `MemoryStorageAdapter`.
- **TikTok no-oficial:** se acepta el uso de `tiktok-live-connector` (API no
  oficial); riesgo de cambios upstream — el relay aísla ese acoplamiento.

## 10. Próximos pasos (fuera de este PR)

- Sustituir `MemoryStorageAdapter` por un backend persistente compartido.
- Conectar la detección de consultas a las tools del MCP de tarot.
- Anclar la priorización a señales extra (seguidores/likes) cuando el relay
  las exponga.
- Pruebas E2E del pipeline con un live real.
