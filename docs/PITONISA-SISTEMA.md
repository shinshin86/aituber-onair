# Pitonisa — Arquitectura del Sistema

> AITuber VTuber lectora de tarot para lives de TikTok/Twitch/YouTube, con memoria
> persistente por espectador, tiradas 3D agénticas y priorización de regalos.
>
> Monorepo: `aituber-onair` (fork privado `Meisoftcoltd/aituber-onair-pitonisa`).
> Documento generado: 2026-08-23.

---

## 1. Visión general

```
┌─────────────────────────────────────────────────────────────────────┐
│                          PLATAFORMAS LIVE                           │
│  TikTok (relay v2 SSE)   Twitch (EventSub WS)   YouTube (polling)   │
└──────────────┬──────────────────────┬───────────────────┬──────────┘
               │ chat / gifts / likes / follows                │
               ▼                                                     │
┌─────────────────────────────────────────────────────────────────────┐
│  react-live2d-app (frontend VTuber)                                 │
│  ├── useTikTokComments / useTwitchComments / useYoutubeComments     │
│  ├── comment-intelligence: normaliza → seguridad → ranking → batch  │
│  ├── useViewerMemory: memoria persistente por @handle               │
│  ├── ORQUESTADOR TAROT: detección consulta → tirada → narración     │
│  └── useAituberCore → LLM (Ollama local u otros) → TTS → Live2D     │
└──────┬──────────────────────────────────┬───────────────────────────┘
       │ viewerContext (memoria+lectura)  │ WS broadcast (animación)
       ▼                                  ▼
┌──────────────────────┐        ┌──────────────────────────┐
│  LLM (chat)          │        │  MCP Tarot (server.ts)   │
│  Ollama 192.168.1.10 │        │  12 spreads · 78 cartas  │
└──────────────────────┘        │  WS :3001 · viewer :3002 │
                                └──────────────────────────┘
                                         │
                                ┌────────▼─────────┐
                                │  tarot-viewer 3D │  ← OBS (browser source)
                                │  Three.js, 78    │
                                │  Rider-Waite .webp│
                                └──────────────────┘
```

## 2. Paquetes del monorepo relevantes

| Paquete | Rol |
|---|---|
| `packages/core` | Núcleo AITuberOnAirCore: chat LLM, TTS, motion, processChat |
| `packages/chat` | Abstracción de proveedores LLM (openai/claude/gemini/openai-compatible…) |
| `packages/agent` | Tool-calling agéntico (defineAgentTool, schema validation) |
| `packages/comment-intelligence` | Pipeline de comentarios: normalizers (tiktok/twitch/youtube/web), safety, ranking, summarization |
| `packages/viewer-memory` | Memoria persistente por espectador (TS puro, storage adapter) |
| `packages/mcp-tarot` | Server MCP de tarot: engine de spreads, deck, WS push, viewer estático |
| `packages/tarot-viewer` | Frontend Three.js del visor 3D de tiradas (OBS) |
| `packages/tarot-assets` | 78 imágenes .webp Rider-Waite + metadata.json (mapeo dhash verificado) |
| `packages/core/examples/react-live2d-app` | **La app VTuber** (Live2D + chat + orquestador) |
| `packages/kizuna` | Puntos/gamificación de usuarios |
| `packages/manneri`, `packages/noise` | Detección de monotonía y ruido en conversación |

## 3. Integración de plataformas live

### 3.1 TikTok (principal)

**Cadena**: `tiktok-live-relay.mjs` (Node, puerto 8787) → SSE → `tiktokService.ts` → `useTikTokComments`.

- Librería: **`tiktok-live-connector` v2.4.4** (zerodytrash, ingeniería inversa; firma vía Euler Stream).
- **Lectura anónima**: no requiere `sessionid` ni credenciales — solo el `@uniqueId`. Menor riesgo de bloqueo.
- `EULER_API_KEY` (env, opcional) para firmar con API key si la capa free limita.
- Eventos relay → SSE: `connected`, `comment`, `gift`, `follow`, `share`, `like`, `viewers`, `error`, `disconnected`.
- **Regalos anti doble-conteo**: TikTok dispara eventos repetidos por streak (regalo acumulable `giftType===1`). El relay solo emite el evento FINAL (`repeatEnd:true`), deduplicado por `groupId`.
- Reconexión: el frontend recrea el EventSource; el relay muere limpio con el cliente (SSE).

### 3.2 Twitch

EventSub WebSocket + token del canal (`connectTwitchChat` en `twitchService.ts`). Buffer + polling interval para no inundar al LLM.

### 3.3 YouTube

Comentarios por polling del videoId en directo (`youtubeService.ts`).

## 4. Pipeline de comentarios (comment-intelligence)

1. **Normalización** (`normalizers/tiktok.ts` etc.): cada plataforma → `LiveComment` unificado. Autor: `id` = @handle normalizado, `nickname`, `realName?`, `displayName`.
2. **Seguridad** (`safety/`): categorías de riesgo, bloqueo temporal de viewers de alto riesgo (`blockHighRiskViewers`, `viewerBlockDurationMs`).
3. **Ranking** (`ranking/scoring.ts`): prioriza quién habla. Boosts:
   - **Regalo grande** (≥100 diamantes): `+0.35` (`big_gift`)
   - **Regalo** (>0 diamantes): `+0.20`
   - **Regalo sin diamantes** (acumulación/repetición): `+0.12`
   - Moderador `+0.12`, miembro/sub `+0.06`, superchat `+0.20`, frescura `+0.12`
   - Penalizaciones: duplicado `-0.25`, spam-like `-0.20`, URLs
4. **Batching**: espera `tiktokCommentIntervalMs` (20s por defecto), procesa hasta `maxCommentsPerBatch`, nunca interrumpe si el avatar está hablando (`isSpeaking`).
5. **Decisión** (`agent.ts`): `toAgentCommentDecision` → comentario elegido + instrucción + contexto para el LLM.

**Política de prioridad de regalos** (según diseño): grandes primero → acumulación de pequeños → seguidores/likes/reincidencia. Implementado en scoring + `rankViewersByPriority()` de viewer-memory.

## 5. Memoria persistente por espectador (`viewer-memory`)

### 5.1 Identidad

- **`viewerId`** canónico = `@handle` de la plataforma (TikTok `unique_id`, Twitch login, YouTube channel id), sin `@`, minúsculas.
- **Nick → nombre**: `Andrea425` → "Andrea" (`extractNicknameName`: prefijo alfabético + camelCase + descarte de ruido tipo "x/el/la"). Si el usuario da su **nombre real**, prevalece (`setRealName`).
- El agente NUNCA lee el nick literal: `buildViewerContext` genera la instrucción "Su nick es X; dirígete a esta persona como Andrea".

### 5.2 Qué se guarda por usuario (`ViewerRecord`)

| Campo | Contenido |
|---|---|
| `displayName` / `realName` | Nombre para dirigirse a la persona |
| `consultations[]` | Tiradas: tema (amor/trabajo/…), sujeto ("por Jose"), fecha, plataforma |
| `personalEvents[]` | Hitos: viajes, trabajo, salud, relaciones, aniversarios |
| `gifts` | Diamantes acumulados, nº eventos, mayor regalo, último regalo |
| `relationshipLevel` | 0-10, crece con mensajes y sesiones (≥5 = trato de confianza) |
| `sessions[]` | Resúmenes de sesiones cerradas (máx 20): mensajes, consultas, frase-resumen |
| `tags` | Etiquetas libres (fan, repeat, vip…) |

### 5.3 Cómo lo usa el agente

`buildViewerContext(record)` produce un bloque de texto en español (identidad, nivel de relación, regalos, últimas 5 consultas con fecha relativa "ayer / hace 3 días", hitos personales, última sesión). Ese bloque viaja como `viewerContext` en `processChat` y se inyecta en el input del LLM:

```
Contexto sobre este espectador (memoria persistente…). Úsalo para dar
continuidad, saludar por su nombre y personalizar. No revelas que existe.
[Espectador] Su nick es Andrea425; dirígete a esta persona como Andrea.
Ha enviado regalos (150 diamantes; último: Rose).
Consultas de tarot anteriores:
- ayer: tirada de amor sobre Jose.
…
Mensaje: Comentario de "Andrea425": tirada de amor por Paco
```

→ El agente puede bromear: *"¿Paco? ¿Qué pasó con Jose? jajaja"*, preguntar *"¿qué tal el viaje a la costa?"*, y tratar con más confianza a los habituales.

### 5.4 Extracción automática

- `extractConsultation(text)`: tema + sujeto ("tirada de amor por Jose" → `{topic:'amor', about:'Jose'}`), solo si parece pregunta.
- `extractPersonalEvent(text)`: regex por tipo (viaje/trabajo/salud/relación/aniversario).
- `endSession()`: al cerrar el stream genera `ViewerSessionSummary` por espectador activo.

### 5.5 Almacenamiento

`MemoryStorageAdapter` (interfaz load/save). Por defecto localStorage del navegador (persiste entre streams en la misma máquina OBS). Intercambiable por adaptador de archivo/DB para multi-sala.

## 6. Sistema de tarot agéntico

### 6.1 MCP Tarot (`packages/mcp-tarot`)

- **78 cartas** Rider-Waite con metadata verificada (dhash contra fuente metabismuth/tarot-json). Figuras: 11=Sota, 12=Caballo, 13=Reina, 14=Rey.
- **12 spreads**: una_carta, 3×tres_cartas, herradura, triangulo_9, estrella_6, cruz_celta, tirada_egipcia, arbol_vida, circulo_celta, mandala_8, red_36.
- Tools MCP: `tarot_list_spreads`, `tarot_select_spread` (por tipo o por **nombre de regalo**), `tarot_draw_cards` (baraja+extrae+**broadcast WS**), `tarot_get_reading`, `tarot_complete_reading`, `tarot_reset_session`.
- **Mapeo regalo→tirada** (`parseGiftToSpread`): superchat ≥500 → arbol_vida; ≥100 → cruz_celta; rose → una_carta; lion → cruz_celta; galaxy → arbol_vida…
- **Rate limit** 30s entre tiradas + 1 lectura en curso.
- Puertos: WS `3001` (`TAROT_WS_PORT`), viewer HTTP `3002` (`TAROT_VIEWER_PORT`). Bridge de pruebas HTTP `:3999` (`tarot-mcp-bridge.mjs`).
- `CardDeck.shuffle()` **repone el mazo completo** (fix crítico: antes se drenaba tras ~7 tiradas).

### 6.2 Visor 3D (OBS)

- `tarot-viewer`: Three.js (WebGL2), 1600×900, cartas con marco dorado, etiquetas de posición, título del spread.
- Recibe `READING_START` por WS y anima el reparto; framing calculado (fov 42°, margen superior verificado ~103px).
- Añadir como **browser source** en OBS: `http://<host>:3002/`.

### 6.3 Orquestador (chat → tirada → narración)

En `useLiveCommentIntelligence` + `App.tsx` + `services/tarot/tarotClient.ts`:

1. Comentario pasa ranking; si `isTarotQuery(text)` (menciona tirada/tarot/cartas + tema o "?"):
2. `drawReading({topic})` → `mapTopicToSpread` (amor→3 cartas situación/obstáculo/consejo, futuro→cruz_celta…) → POST al bridge → el server **anima el visor 3D** y devuelve la lectura.
3. `formatReadingForLLM(reading)` (posiciones, cartas, invertidas, significados, keywords) se **combina con el viewerContext** y viaja en `processChat`.
4. El LLM narra la tirada ya visible en pantalla, personalizada con la memoria del espectador.

## 7. Modelo de lenguaje y voz

- LLM por defecto: **Ollama local** `http://192.168.1.10:11434` (modelos: `Qwen3.8-27B-Sharp`, `kat-coder`, `gemma4-turbo`, `Muse-Glimmer-30B`). Contexto 98k, KV cache q4_0.
- TTS: `aituber-tts-server` único backend (GPU RTX 3090 compartida); fallback Edge cloud.
- Avatar: Live2D `mao_pro` (shizuku carece de `.exp3.json`).

## 8. Puesta en marcha (stream)

```bash
# 1. MCP tarot + bridge + viewer
cd packages/mcp-tarot && npm run build
node tarot-mcp-bridge.mjs &        # HTTP :3999 (desde ~/ o donde esté)
#    el server abre WS :3001 y viewer :3002

# 2. Relay TikTok
cd packages/core/examples/react-live2d-app
node scripts/tiktok-live-relay.mjs # SSE :8787

# 3. App VTuber
npm run dev                        # UI + Live2D + chat
#    Settings → TikTok: @handle + enable
#    OBS: browser source → http://localhost:3002/
```

## 9. Estado y pendientes

**Funcional y verificado:**
- Pipeline TikTok→chat→LLM→voz→avatar; Twitch y YouTube con el mismo patrón.
- Memoria por espectador end-to-end (nick→nombre, consultas, hitos, regalos, resúmenes).
- Priorización de regalos en ranking.
- MCP tarot: 78 cartas, 12 spreads, animación 3D, mapeo de regalos, rate limit.
- Orquestador de tiradas desde el chat.
- QA visual del visor (framing correcto; artefactos previos eran del compositor headless).

**Pendiente / siguiente fase:**
- Multi-juego de cartas (baraja española/marsella) en mcp-tarot.
- Adaptador de storage de memoria a archivo/DB (hoy localStorage).
- Instrucciones MD de uso del MCP tarot para el agente (al finalizar multi-juego).
- Pruebas E2E con un live real de TikTok.
