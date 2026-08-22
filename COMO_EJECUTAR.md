# Cómo ejecutar MCP Tarot 3D

Estado: **funcional end-to-end** (verificado 2026-08-19):
- 78 cartas Rider-Waite en `packages/tarot-assets/cards/` (metadata + imágenes de prueba `.webp` → `front/` + `back.webp`)
- 12 spreads con layout 3D en `SpreadEngine.ts`
- MCP stdio con 6 tools + bridge WebSocket
- Viewer Three.js (OBS) con animación deal+flip, etiquetas y auto-fit de cámara

## Arquitectura / puertos

| Puerto | Servicio | Env |
|---|---|---|
| — | MCP (stdio, lo lanza el cliente/LLM) | — |
| 3001 | WebSocket `ws://localhost:3001/ws/tarot` (empuje al viewer) | `TAROT_WS_PORT` |
| 3002 | Página del viewer para OBS `http://localhost:3002/` | `TAROT_VIEWER_PORT` |

El mismo proceso `npx tsx src/server.ts` levanta las 3 cosas (MCP stdio + WS + estáticos del viewer).

## 1. Compilar (primera vez o tras cambios)
```bash
cd /home/meisoft/projects/pitonisa/aituber-onair
npm -w @pitonisa/mcp-tarot run build      # tsc → packages/mcp-tarot/dist
npm -w @pitonisa/tarot-viewer run build   # vite → packages/tarot-viewer/dist
```

## 2. Probar el dominio (sin servidor)
```bash
cd packages/mcp-tarot
node test-runtime.mjs
# → Total: 78 (22 mayores + 56 menores) / Drawn cards: 3 / ✓ all assertions pass
```

## 3. Levantar servidor (la pieza para OBS + LLM)
```bash
cd /home/meisoft/projects/pitonisa/aituber-onair/packages/mcp-tarot
npx tsx src/server.ts
# [tarot] WS bridge on ws://localhost:3001/ws/tarot
# [tarot] MCP server ready (stdio). Tools: tarot_list_spreads, tarot_select_spread, ...
# [tarot] VIEWER serving OBS page at http://localhost:3002/  ← este URL va a OBS
```

- Con `npx tsx` el proceso espera JSON-RPC en stdin (stdio real).
- Para probar la página del viewer sin LLM: abrir `http://localhost:3002/` en el navegador
  (o `http://IP-WSL:3002/` desde Windows) y disparar una tirada con el cliente MCP.
- En desarrollo el viewer también corre con Vite: `cd packages/tarot-viewer && npm run dev`
  (vite.config.ts usa el mismo puerto 3002; la página lee `?wsport=3201` si se usa otro puerto).

## 4. Configuración OBS
- Browser Source URL: `http://localhost:3002/`
- Width 1920, Height 1080, FPS 60
- "Shutdown source when not visible": **off**

## 5. Tools MCP (para el LLM / AITuber)
| Tool | Uso |
|---|---|
| `tarot_list_spreads` | Catálogo de los 12 spreads |
| `tarot_select_spread` | `{gift: "super chat 150"}` → elige spread por regalo (o `{spread_type}`) |
| `tarot_draw_cards` | `{spread_type, seed?}` → baraja, reparte y **empuja al viewer por WS** |
| `tarot_get_reading` | Devuelve cartas + significados (para que el LLM narre) |
| `tarot_complete_reading` | Marca lectura terminada (viewer mantiene el resultado) |
| `tarot_reset_session` | Reinicia sesión y baraja de nuevo |

Mapeo regalo→spread (en `parseGiftToSpread`): superchat/donación ≥500 = Árbol de la Vida,
≥100 = Cruz Celta, menor = 3 Cartas; rosa = 1 carta; lila = Situación/Obstáculo/Consejo;
león = Cruz Celta; cohete = Tirada Egipcia; galaxia = Árbol de la Vida; default = 3 Cartas.

## Test de humo WS (script)
```bash
node /tmp/test-mcp-stdio.mjs   # inicializa MCP → lista tools → selecciona → tira → completa
```

## Notas
- Las imágenes actuales son de prueba (escaneos públicos Rider-Waite de `metabismuth/tarot-json`);
  se reemplazarán por las propias de Pitonisa. El mazo se sincroniza con
  `python3 /tmp/download_tarot_cards.py` (o regenerando las cartas en `scripts/`).
- Guard: 2 lecturas públicas mín. 30s de intervalo (etiqueta de directo).
- Si un puerto está ocupado el server emite WARN y sigue sirviendo MCP stdio (no cae).
