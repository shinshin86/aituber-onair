# Pitonisa — VTuber lectora de cartas con chat agéntico y memoria por espectador

> PR de entrega: integración de **TikTok Live**, motor de **chat agéntico con
> memoria persistente por usuario**, priorización de **regalos**, y el paquete
> base de **memoria** sobre el monorepo AITuber OnAir.
>
> Documento técnico completo: [`docs/sistema-agentic-pitonisa.md`](./docs/sistema-agentic-pitonisa.md)

## Qué es

Pitonisa es una **VTuber (Live2D) que lee cartas** y responde en el **chat en
vivo de TikTok** (en paralelo, compatible con Twitch/YouTube). No es un
sistema de pregunta→respuesta: es un **agente con memoria** que

- recuerda **quién es cada espectador** (el `@handle` de TikTok como id
  canónico),
- llama a cada uno por **nombre humano**, no por el nick crudo
  (`Andrea425` → saluda a *Andrea*; `elMati_90` → *Mati*),
- guarda sus **consultas de tarot**, **datos personales** y **regalos**,
- y en cada respuesta **inyecta ese historial** en el prompt para dar
  continuidad natural: *"Paco? ¿qué pasó con José?", "¿cómo te fue en la
  reunión?", "¿cómo fue tu viaje a la costa?"*.

Este PR construye esa capa sobre el toolkit AITuber OnAir ya presente, sin
romper el pipeline existente (LLM Ollama local → TTS → lipsync).

## Estado: verificado

| Check | Resultado |
|-------|-----------|
| `react-live2d-app` → `tsc -b && vite build` | ✅ limpio |
| `packages/viewer-memory` → `vitest` | ✅ 15/15 |
| `packages/comment-intelligence` → `tsc` + `vitest` | ✅ 151/151 |
| `packages/mcp-tarot` → `tsc --noEmit` | ✅ limpio |

La memoria, la priorización de regalos y la interpretación de nicks están
**cubiertas por tests** (no son "confío que funciona").

## Nuevas piezas

### 1. `packages/viewer-memory` (paquete nuevo)
Almacén persistente de memoria por espectador (key/value, inyectable):
- identidad: nick crudo, **nombre interpretado**, **nombre real** si lo dice;
- `consultations`: tiradas previas (tema, sobre quién, fecha);
- `personalEvents`: viaje, reunión, salud, relación, aniversario…
- `gifts`: diamantes acumulados, regalo más grande, último regalo;
- `sessions`: resumen guardado al cerrar cada stream;
- `DonorTier` (`vip`/`regular`/`small`/`none`) y `rankViewersByPriority()`.

Persiste en `localStorage` del navegador (key `aituber.viewerMemory.v1`) con
fallback a memoria para tests. El adaptador es inyectable → cambiar a
IndexedDB/un backend **sin tocar el resto**.

### 2. Integración TikTok Live (paralela a Twitch/YouTube)
Mismo patrón que las otras plataformas: **normalizar → enqueue → scoring →
respuesta**. Como la API pública TikTok no expone el chat en vivo, un **relay
Node** consume `tiktok-live-connector` y reparte eventos por **SSE** al
navegador.

- `scripts/tiktok-live-relay.mjs` — relay SSE en `127.0.0.1:8787`.
- `services/tiktok/tiktokService.ts` + `hooks/useTikTokComments.ts`.
- Normalizadores TikTok ya presentes en `comment-intelligence`
  (chat + **regalos** con `diamondCount`).
- Config en `Settings → Streams` (plataforma `tiktok`, uniqueId, relayUrl,
  intervalo), idéntica en estilo a YouTube/Twitch.

### 3. Wiring agéntico en la app
- `hooks/useViewerMemory.ts`: store singleton + extracción local de
  nombre real / consultas / hitos + perfiles para scoring.
- `App.tsx` / `useLiveCommentIntelligence.ts`: cada evento emite un
  `ViewerMemoryEvent`; el análisis recibe `viewerProfiles`; el comentario
  elegido inyecta su `viewerContext` en `processChat`.
- `useAituberCore.ts`(`ProcessChatOptions.viewerContext`): inyección del
  historial como instrucción interna de contexto.

### 4. Priorización de regalos (TikTok)
- `comment-intelligence/scoring.ts`: el evento de regalo sube el prioridad del
  comentario — **`big_gift`** (≥100 diamantes, +0.35), **`gift`** (>0, +0.2),
  gesto sin diamantes (+0.12). Donantes grandes primero; después acumulación
  de pequeños, luego seguidores/likes/reincidencia vía nivel de relación.
- `ViewerMemoryStore.getDonorTier()` + `rankViewersByPriority()` mantienen el
  crédito acumulado por espectador.

## Cómo ejecutar

```bash
# build de la app
cd packages/core/examples/react-live2d-app
npm run build                      # tsc -b && vite build

# tests de memoria
cd packages/viewer-memory && npm test

# relay TikTok (proceso separado)
cd packages/core/examples/react-live2d-app
node scripts/tiktok-live-relay.mjs     # escucha en 127.0.0.1:8787
```

Arranque: Ollama local + TTS → relay TikTok → `npm run dev` →
`Settings → Streams → TikTok` (uniqueId, relayUrl, enabled).

## Decisiones de diseño
- **MVP de extracción por reglas** (sin red): ligero, sin latencia por
  mensaje; plugable al LLM/MCP tarot después sin cambiar la API.
- **Persistencia localStorage** por navegador en el MVP; backend posterior vía
  adaptador inyectable.
- **TikTok no-oficial** aislado tras el relay (si cambia upstream, se toca un
  solo archivo).

## Fuera de este PR (siguientes pasos)
- Backend persistente compartido (sustituir el adaptador).
- Conectar la detección de consultas a las tools del **MCP tarot**
  (`packages/mcp-tarot`, en desarrollo).
- Señales extra de priorización (seguidores/likes) cuando el relay las exponga.
- E2E contra un live real.
