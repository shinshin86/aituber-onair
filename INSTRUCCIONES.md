# INSTRUCCIONES — Integración MCP Tarot 3D con AITuber OnAir

> Documento de handoff para el siguiente agente. Todos los datos fueron verificados
> contra el código de este repo el 2026-08-19. Si un dato aquí contradice el código,
> **el código gana**: verifica antes de asumir.

## 1. Resumen

El MCP de tarot (`@pitonisa/mcp-tarot`) está **funcional end-to-end**: server stdio con
6 tools, session con machine state + rate-limit, WS bridge (3001) que empuja tiradas al
viewer 3D Three.js (3002, servido por el propio server) para OBS.

**Falta la última milla**: que el LLM de la VTuber (Ollama, via `@aituber-onair/core`)
pueda invocar los tools. **El core NO habla MCP-stdio** — hace HTTP REST
(`POST {url}/tools/{tool}`). Hay que construir un **bridge HTTP → stdio** (espec en §6)
y registrar los tools en la app (espec en §7).

## 2. Estado actual verificado

| Paquete | Contenido | Estado |
|---|---|---|
| `packages/mcp-tarot` | `src/server.ts` (MCP stdio + WS 3001 + server estático viewer 3002), `src/services/CardDeck.ts` (78 cartas), `src/services/SpreadEngine.ts` (12 spreads), `dist/` compilada | ✅ funcional |
| `packages/tarot-viewer` | Vite + Three.js **0.160.1** (+ `@types/three@0.160.0`, node_modules propio — NO hereda el 0.151.3 de la raíz), escenas de cartas 3D, `dist/` con `cards/` (78 front + 1 back, `.webp`) | ✅ build + QA visual (SwiftShader/CDP, 0 errores) |
| `packages/tarot-assets` | `cards/metadata.json`, `cards/front/*.webp`, `cards/back.webp`, `spreads/spreads.json` (12), `scripts/download-cards.py` | ✅ 78/78 |

Puertos (defaults, overridables por env):

- **3001** — WS bridge `ws://localhost:3001/ws/tarot` (`TAROT_WS_PORT`).
- **3002** — página OBS estática `http://localhost:3002/` (`TAROT_VIEWER_PORT`).
- **3003** — **bridge REST (A CONSTRUIR, §6)** — aún no existe.
- MCP — **stdio puro** (sin puerto).

Procesos en vivo ahora: `packages/mcp-tarot/scripts/launch-daemon.py` mantiene a
`node dist/server.js` vivo con keep-alive FIFO (`/tmp/tarot-stdin.fifo`, fd 9,
`sleep infinity`). Logs: `/tmp/tarot-mcp-out.log` (stdout MCP), `/tmp/tarot-server.log`
(stderr). Para parar: `kill` el PID del daemon y del server (usar PIDs explícitos —
`pkill -f` con esos patrones mata la propia shell).

⚠️ Las imágenes de cartas son Rider-Waite de prueba (dominio público, tomadas de
metabismuth/tarot-json) **solo para testear la web**. Reemplazar por las propias del
proyecto más adelante (cambiar `tarot-assets/cards/` + rebuild viewer).

## 3. Tools MCP (6, verificados en `src/server.ts`)

Todos devuelven `{ content: [{ type: 'text', text: JSON.stringify(result) }] }` (MCP).

| Tool | Input (Zod) | Salida |
|---|---|---|
| `tarot_list_spreads` | `{}` | catálogo de spreads |
| `tarot_select_spread` | `{ spread_type?: SpreadId, gift?: string, trigger?: 'regalo'\|'comando'\|'temporizador' }` — exige `spread_type` **o** `gift` | layout elegido (con `positions`) |
| `tarot_draw_cards` | `{ spread_type: SpreadId, seed?: int, allow_reversed: bool = true }` | payload completo de la tirada; **emite `READING_START` por WS** |
| `tarot_get_reading` | `{ reading_id?: uuid }` | lectura activa/última con significados para que el LLM interprete |
| `tarot_complete_reading` | `{}` | `{ status: 'complete' }`; emite `READING_DONE`; a los 60 s el session vuelve a `IDLE` y libera la tirada |
| `tarot_reset_session` | `{}` | `{ status: 'reset' }` |

Semántica de session (`TarotSession` en `server.ts`):
- Machine state: `IDLE → SHUFFLING → REVEALING → INTERPRETING → COMPLETE → IDLE`.
- **Rate-limit**: `minIntervalMs = 30_000` (hardcodeado, `server.ts:59`); si hay
  tirada en `REVEALING` y se intenta otra antes de 30 s → error "A reading is already
  in progress. Wait for it to finish."
- Errores de puerto de WS/viewer **NO** killan el server stdio (solo warn por stderr).

## 4. Spreads (12, verificados en `tarot-assets/spreads/spreads.json`)

| ID | Nombre | Cartas |
|---|---|---|
| `una_carta` | Una Carta (Respuesta Directa) | 1 |
| `tres_cartas_pasado_presente_futuro` | Pasado · Presente · Futuro | 3 |
| `tres_cartas_situacion_obstaculo_consejo` | Situación · Obstáculo · Consejo | 3 |
| `estrella_6` | Estrella de 6 | 6 |
| `herradura` | Herradura | 7 |
| `mandala_8` | Mandala de 8 Pétalos | 8 |
| `triangulo_9` | Triángulo | 9 |
| `cruz_celta` | Cruz Celta | 10 |
| `tirada_egipcia` | Pirámide Egipcia | 10 |
| `arbol_vida` | Árbol de la Vida (10 sefirot) | 10 |
| `circulo_celta` | Círculo Celta (12 casas) | 12 |
| `red_36` | Red 6×6 | 36 |

Formato entry en `spreads.json`: `{ id, name, cards, scale, positions: [{id, name,
label, x, y, rot}] }`. `z.enum` en el server usa el cast
`Object.keys(SPREADS) as unknown as [string, ...string[]]` (zod 3.25 exige tuple).

## 5. Protocolo WS (viewer 3D)

- Endpoint: `ws://localhost:3001/ws/tarot`.
- Mensajes (todos `{ type, payload }` JSON):
  - `READING_START` — payload = objeto `Reading` completo (al hacer `tarot_draw_cards`).
  - `READING_DONE` — payload = `{ reading_id }` (al hacer `tarot_complete_reading`).
  - `READING_STATE` — payload = `Reading` activo; **replay automático a cada
    cliente al conectar** (`server.ts:72-76`) para que una pestaña OBS nueva se syncue.
- Shape de `Reading` (`server.ts:26-48`): `{ reading_id, spread_type, spread_name,
  cards: [{ position_id, position_name, position_label, card_id, card_name, arcanum,
  reversed, upright_meaning, reversed_meaning, keywords, x, y, rot }], card_scale,
  created_at, state }` donde `state ∈ IDLE|SHUFFLING|REVEALING|INTERPRETING|COMPLETE`.
- El viewer (`tarot-viewer/src/engine/ws.ts`) anima barajo → revelado posición a
  posición usando `x,y,rot` y muestra la interpretación al recibir `READING_DONE`.

## 6. GAP CRÍTICO — y el bridge que hace falta (A CONSTRUIR)

### 6.1 Evidencia verificada (por qué no funciona `mcpServers` tal cual)

1. `packages/core/src/core/ToolExecutor.ts:52-103` — `executeMCPTool` hace:
   ```ts
   fetch(`${mcpServer.url}/tools/${toolName}`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json', // + Authorization: Bearer si authorization_token
     },
     body: JSON.stringify(block.input || {}),
   });
   // espera response.ok y JSON → tool_result.content = JSON.stringify(result)
   ```
   **NO habla MCP-stdio, ni MCP-STREAMABLE-HTTP.** Habla un REST simplificado:
   `POST {url}/tools/{tool}` con args en body, JSON en respuesta.
2. Convención de nombres: el LLM ve el tool como `mcp_{serverName}_{toolName}`
   (`parseMCPToolName`, `ToolExecutor.ts:30-45`).
3. `packages/chat/.../openaiRequestBuilder.ts:273-288` — `validateMCPCompatibility`
   **lanza** si el provider `openai` usa el endpoint Chat Completions con
   `mcpServers` (solo lo soporta el endpoint Responses API).
4. `packages/core/src/core/AITuberOnAirCore.ts:219-231` — `options.mcpServers` solo se
   activa para providers `claude | openai | gemini`.

**Consecuencia para nuestra VTuber**: el LLM real es **Ollama** (API compatible
OpenAI, endpoint chat completions). Por tanto:

- ❌ `options.mcpServers` con provider `openai`+Ollama → la validación **tira**
  (endpoint chat completions). No usar esta vía mientras el LLM sea Ollama.
- ✅ **Vía correcta hoy: tools LOCALES** (`options.tools`, §7) cuyo handler hace un
  `fetch` al bridge REST (§6.2). Funciona con cualquier provider, incluido Ollama.
- La vía remota `mcpServers` queda como plan B si algún día el LLM pasa a un
  endpoint que soporte Responses API / MCP-remote (claude/gemini). El bridge §6.2,
  tal como se especifica, es **idéntico** en los dos casos.

### 6.2 Especificación del bridge REST → MCP stdio (nuevo: `packages/mcp-tarot/scripts/rest-bridge.mjs`)

El bridge es el **único dueño** del proceso del server en producción:

1. **Arranca `node packages/mcp-tarot/dist/server.js` como child process** con stdio en
   pipes (el child levanta WS 3001 + viewer 3002 + MCP sobre esos pipes).
   - Esto reemplaza al `launch-daemon.py` (FIFO) en producción. Los scripts FIFO
     (`launch-daemon.py`, `draw.sh`) quedan en su sitio **solo para pruebas manuales**.
2. Habla MCP por los pipes del child: `initialize`, `tools/list`, `tools/call`
   (JSON-RPC 2.0 line-delimited). Puede reusar el patrón de `draw.sh`
   (ver §12) o el `@modelcontextprotocol/sdk` client (ya es dependencia del paquete).
3. **REST**: escucha `3003` (env `TAROT_BRIDGE_PORT`) y expone:
   - `POST /tools/:toolName` — body = JSON de argumentos → responde el JSON que
     devuelva `tools/call` (el `ToolExecutor` hace `JSON.stringify(result)` del body
     de respuesta; errores → HTTP 502 con JSON `{error: ...}` para que el core lo
     traduzca a tool_result de error).
   - `GET /health` → `{ ok: true, reading: 'IDLE'|'ACTIVE' }` (handy para OBS/monitor).
   - Sin auth (localhost). Si se expone fuera, añadir `authorization_token`
     (el core ya manda `Authorization: Bearer` — `MCPServerConfig.authorization_token`).
4. `SIGINT/SIGTERM` → cierra child limpiamente. Si muere el child, reintentar
   arranque 1 vez; si falla, el REST devuelve 503.

### 6.3 Contracto exacto esperado por el core (para QA del bridge)

```
POST http://localhost:3003/tools/tarot_draw_cards
Content-Type: application/json
{"spread_type":"cruz_celta"}
→ 200, cuerpo = el objeto Reading JSON (lo que runTool ya serializa dentro de MCP;
   el bridge debe **extraer** el JSON del texto contenido de content[0] y devolverlo
   directo — no el wrap MCP).
```

## 7. Conexión en la app (`packages/core/examples/react-live2d-app`)

Entry point verificado: `src/hooks/useAituberCore.ts` — `new AITuberOnAirCore({...})`
(línea 426). **Hoy NO registra `mcpServers` ni `tools`** (grep limpio). Añadir:

```ts
// constants/tarotTools.ts (nuevo)
const BRIDGE = process.env.NEXT_PUBLIC_TAROT_BRIDGE ?? 'http://localhost:3003';
const callBridge = (tool: string, input: unknown) =>
  fetch(`${BRIDGE}/tools/${tool}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input ?? {}),
  }).then(async (r) => { if (!r.ok) throw new Error(`bridge ${r.status}`); return r.json(); });

const T = (name: string, desc: string) => ({
  definition: { type: 'function' as const, name, description: desc,
                inputSchema: { type: 'object', properties: {}, required: [] } },
  handler: callBridge.bind(null, name),
});
// 6 tools: tarot_list_spreads, tarot_select_spread, tarot_draw_cards,
// tarot_get_reading, tarot_complete_reading, tarot_reset_session
// (refinar inputSchema por tool según §3; ToolDefinition: packages/chat/src/types/toolChat.ts)
```

Y en el constructor: `tools: [ ...6 tools... ]` (signature exacta: `tools?:
{ definition: ToolDefinition; handler: (input: any) => Promise<any> }[]`,
`AITuberOnAirCore.ts:111-114`). Los handlers son async-fetch, así que el dispatch ya
es `await` (core: `this.toolExecutor.run(blocks)`, línea 716).

Sistema prompt: añadir instrucciones de flujo a `DEFAULT_SYSTEM_PROMPT`
(`src/constants/prompts.ts`) — cuando un regalo/comando pida tarot:
1. `tarot_select_spread` (con `gift` o `spread_type`) → 2. `tarot_draw_cards`
   (con el `spread_type` devuelto) → **narrar la tirada carta a carta** usando
   `tarot_get_reading` → al terminar de narrar, `tarot_complete_reading`.

## 8. Flujo completo en vivo

```
Regalo YouTube / SuperChat (youtubeService.ts, src/services/youtube/)
        │  (mapeo → mensaje al chat; la app hace core.processChat(...), useAituberCore.ts:626)
        ▼
LLM (Ollama 192.168.1.10:11434) → tool_call tarot_select_spread{gift|spread_type}
        ▼ tarot_draw_cards{spread_type, allow_reversed}
bridge 3003 → MCP stdio → TarotSession: SHUFFLING→REVEALING
        │  WS 3001: READING_START (payload Reading)
        ▼
viewer 3D (pestaña OBS :3002) anima barajo + revelado (cartas con x,y,rot)
        ▼
OBS captura :3002 (browser source 1600×900) → TikTok live
        ▼
LLM llama tarot_get_reading (significados upright/reversed + keywords) y narra
        ▼
LLM llama tarot_complete_reading → WS READING_DONE → viewer muestra resultado;
session a IDLE tras 60 s (rate-limit 30 s activo mientras dura REVEALING)
```

## 9. Variables de entorno (las que realmente existen en el código)

| Var | Default | Dónde |
|---|---|---|
| `TAROT_WS_PORT` | `3001` | `mcp-tarot/src/server.ts:17` |
| `TAROT_VIEWER_PORT` | `3002` | `mcp-tarot/src/server.ts:18` |
| `TAROT_BRIDGE_PORT` | `3003` | **a crear con el bridge** (§6.2) |
| `OLLAMA_CONTEXT_LENGTH=98304`, `OLLAMA_KV_CACHE_TYPE=q4_0` | — | entorno Ollama (ya activo) |

No existen `TAROT_ASSETS_DIR` ni `TAROT_MIN_INTERVAL_MS` — los assets se resuelven
relativos al repo (3 niveles arriba desde `dist/server.js`) y el rate-limit está
hardcodeado a 30 s.

## 10. Builds y ejecución

Order de build (workspaces npm, desde la raíz):

```bash
cd /home/meisoft/projects/pitonisa/aituber-onair
npm -w @pitonisa/mcp-tarot run build      # tsc → dist/
npm -w @pitonisa/tarot-viewer run build   # vite → dist/ con cards/
```

Procesos:

- **Producción (con integración, tras construir el bridge):**
  `node packages/mcp-tarot/scripts/rest-bridge.mjs`
  → sub-proceso server (WS 3001 + viewer 3002) + REST 3003. Un solo comando.
- **Pruebas manuales sin LLM (actual, sin bridge):**
  ```bash
  python3 packages/mcp-tarot/scripts/launch-daemon.py   # daemon + FIFO keep-alive
  bash  packages/mcp-tarot/scripts/draw.sh cruz_celta   # tirada vía JSON-RPC por FIFO
  bash  packages/mcp-tarot/scripts/draw.sh <spread> [SEED]
  ```
- App: `npm -w @aituber-onair/react-live2d-app run build` (o dev server habitual).

## 11. OBS

- Fuente **Browser**: `http://localhost:3002/`, tamaño **1600×900**.
- El viewer se conecta solo a `ws://localhost:3001/ws/tarot` (hardcodeado en
  `tarot-viewer/src/engine/ws.ts`); sin conexión, muestra pantalla de espera
  (las cartas se ven al recibir `READING_START` o `READING_STATE` de replay).
- Verificación rápida: `curl -sI http://localhost:3002/` → 200;
  `curl -s http://localhost:3002/cards/back.webp -o /dev/null -w '%{http_code}'` → 200.

## 12. Tests / QA disponibles

| Script | Qué hace |
|---|---|
| `packages/mcp-tarot/test-runtime.mjs` | test de mazos/spreads (node) |
| `packages/mcp-tarot/scripts/draw.sh <spread> [SEED]` | MCP stdio real por FIFO → JSON `Reading` (ver §8 sin LLM) |
| `packages/tarot-viewer/scripts/shot-cdp.mjs` | QA visual: chrome-headless-shell + SwiftShader → screenshot de la escena 3D (ver flags en ese script: SIN `--headless=new`, con `--use-gl=angle --use-angle=swiftshader-webgl`) |
| `curl` a :3002 | health del viewer estático |

Último estado verificado (este mismo commit de trabajo): Cruz Celta de 10 cartas
renderizada por SwiftShader con three 0.160.1, **0 warnings** (API correcta:
`colorSpace` / `outputColorSpace`, NO `encoding`/`sRGBEncoding` — no reintroducir).

## 13. Limitaciones conocidas

1. **MCP-stdio = 1 dueño de los pipes**. En producción el bridge lo es; los scripts
   FIFO (`launch-daemon.py`/`draw.sh`) compiten por el mismo server. NO corran ambos
   a la vez.
2. Rate-limit 30 s + lock de `REVEALING`: una tirada a la vez (etiqueta live).
3. `mcpServers` (vía remota) inoperante con Ollama (chat completions) — usar tools
   locales (§7). Si el LLM cambia de provider, re-evaluar.
4. Las cartas son Rider-Waite de prueba — reemplazar assets y re-build viewer cuando
   estén las de Pitonisa.
5. three 0.160.1 SOLO en `tarot-viewer` (own node_modules). Si alguien "arregla"
   versiones para alinear root (0.151.3), rompe la API `colorSpace`. No tocar.
6. El viewer no reenvía nada al LLM (one-way: WS out). Las cartas llegan al LLM por
   `tarot_get_reading` (tool call), no por el WS.

## 14. Checklist para el siguiente agente

- [ ] **Construir `packages/mcp-tarot/scripts/rest-bridge.mjs`** según §6.2
      (child process + MCP client + REST 3003; extraer JSON de `content[0].text`).
- [ ] **Smoke test del bridge**:
      `curl -X POST localhost:3003/tools/tarot_list_spreads -d '{}'` → JSON de catálogo;
      `curl -X POST localhost:3003/tools/tarot_draw_cards -d '{"spread_type":"una_carta"}'` → `Reading`.
- [ ] **Registrar los 6 tools locales** en `useAituberCore.ts` (§7) + `constants/tarotTools.ts`.
- [ ] **Añadir al system prompt** el flujo select→draw→narrate→complete (§7).
- [ ] **Build + test de la app** (`npm run ...` de react-live2d-app) — verificar que el
      LLM (Ollama) resuelve las tool calls contra el bridge en un chat de prueba.
- [ ] **E2E completo** con regalo real (o comando simulado en el chat): regalo →
      tirada → OBS → narración → `READING_DONE`.
- [ ] (Ops) decidir si el bridge sustituye al daemon FIFO en el systemd/manual de
      arranque — actualizar `COMO_EJECUTAR.md` al terminar.

## 15. Mapa de archivos (verificados)

- Core (no tocar salvo §7): `packages/core/src/core/ToolExecutor.ts`,
  `packages/core/src/core/AITuberOnAirCore.ts` (options en 109-117, MCP wiring 219-231,
  dispatch 716), `packages/chat/src/types/mcp.ts` (`MCPServerConfig`),
  `packages/chat/src/types/toolChat.ts` (`ToolDefinition`),
  `packages/chat/src/services/providers/openai/openaiRequestBuilder.ts:273`
  (`validateMCPCompatibility`), `.../openaiToolBuilder.ts:33-45`
  (declaración `{type:'mcp', server_url, server_label}`).
- App: `packages/core/examples/react-live2d-app/src/hooks/useAituberCore.ts`
  (constructor 426, `processChat` 626), `src/constants/prompts.ts`,
  `src/services/youtube/youtubeService.ts` (live chat / superChatDetails) — aquí va el
  hook del regalo.
- Referencia de ejemplo `mcpServers` remoto: `packages/core/examples/react-basic/src/constants/mcp.ts`.
- Tarot: `packages/mcp-tarot/src/{server.ts,services/CardDeck.ts,services/SpreadEngine.ts}`,
  `scripts/{draw.sh,launch-daemon.py}`, `test-runtime.mjs`;
  `packages/tarot-viewer/src/engine/{ws.ts,ThreeSetup.ts,CardPlane.ts}`,
  `scripts/shot-cdp.mjs`; `packages/tarot-assets/**`.
