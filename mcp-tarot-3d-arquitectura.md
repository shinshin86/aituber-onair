# Arquitectura MCP Tarot 3D - Pitonisa

## 1. Visión General

MCP (Model Context Protocol) para tiradas de tarot 3D con web viewer integrado a OBS para VTuber. Permite al LLM VTuber seleccionar tiradas según interacciones del directo (regalos), visualizar cartas en 3D interactivo capturable por OBS, y recibir feedback de cartas seleccionadas para continuar conversación.

**Stack técnico:**
- MCP Server: Node.js/TypeScript (compatibilidad AITuber OnAir)
- Web Viewer: Three.js + React + WebSocket
- Persistencia: Base de datos de cartas (78 cartas Rider-Waite)
- Integración: Bushitsu client, Kizuna para métricas, Core para eventos

---

## 2. Arquitectura de Componentes

### 2.1 MCP Server Tarot
**Paquete:** `@pitonisa/mcp-tarot`

```
src/
├── server.ts              # Servidor MCP principal
├── tools/
│   ├── spread-select.ts    # Selección de tirada por tipo/regalo
│   ├── cards-draw.ts      # Barajar y elegir cartas
│   ├── spread-layout.ts    # Calcular posiciones 3D
│   └── spread-interpret.ts # Generar texto para LLM
├── protocols/
│   ├── tarot-schema.ts    # Definiciones Zod/MCP
│   └── mcp-handlers.ts    # Handlers MCP
└── services/
    ├── CardDeck.ts        # Mazo 78 cartas
    ├── SpreadEngine.ts     # Lógica de tiradas
    └── WebSocketBridge.ts # Comunicación con viewer
```

**Interfaces MCP:**
```typescript
// Herramientas expuestas al LLM
{
  "tarot_select_spread": {
    "spread_type": "tres_cartas" | "cruz_celta" | ...,
    "trigger": "regalo" | "comando" | "temporizador",
    "viewer_context": boolean
  },
  "tarot_draw_cards": {
    "spread_id": string,
    "reveal_mode": "simultaneo" | "secuencial"
  },
  "tarot_get_interpretation": {
    "spread_id": string,
    "llm_context": string
  },
  "tarot_reset_session": {}
}
```

### 2.2 Web Viewer 3D
**Paquete:** `@pitonisa/tarot-viewer`

**Tecnologías:**
- Three.js r185 para renderizado 3D
- React 18 para UI overlay
- WebSocket para comunicación en tiempo real
- Canvas WebGL optimizado para OBS Browser Source

**Componentes:**
```
src/
├── components/
│   ├── TarotViewer.tsx     # Componente principal
│   ├── Card3D.tsx          # Modelo 3D carta con materiales
│   ├── SpreadLayout.tsx   # Disposición según tirada
│   └── UIOverlay.tsx       # Controles overlay no-captura
├── engine/
│   ├── ThreeSetup.ts      # Inicialización Three.js
│   ├── CardAnimation.ts    # Animaciones barajar/voltear
│   └── Lighting.ts       # Iluminación estudio OBS
├── assets/
│   ├── cards/             # Texturas 78 cartas PNG/WebP
│   └── models/            # Modelos 3D genéricos cartas
└── server/
    └── ws-server.ts       # Servidor WebSocket
```

**Características 3D:**
- Cartas con grosor físico, bordes iluminados
- Animación de barajado realista (physics-based)
- Transición giro 180° para revelar
- Efectos: partículas al seleccionar, brillo metálico
- Optimizado para 60fps en OBS Browser Source
- Modo "performance" para móviles

### 2.3 Integración OBS
**Browser Source Configuration:**
```json
{
  "url": "http://localhost:3001/tarot-viewer",
  "width": 1920,
  "height": 1080,
  "fps": 60,
  "shutdown_source_when_not_visible": false
}
```

**Comandos WebSocket desde MCP:**
```typescript
// Mensaje a viewer
{
  type: "SPREAD_START",
  payload: {
    spread_type: "tres_cartas",
    positions: 3,
    animation: "fan_out",
    duration_ms: 2000
  }
}

{
  type: "CARD_REVEAL",
  payload: {
    position_id: 1,
    card_id: "el_sacerdote",
    is_reversed: false,
    delay_ms: 500
  }
}
```

### 2.4 Integración VTuber LLM
Flujo de datos:
1. **Evento directo** → Trigger (regalo, chat, comando)
2. **MCP Tool Call** → `tarot_select_spread` 
3. **Selección tirada** → SpreadEngine calcula layout
4. **WebSocket** → Viewer 3D anima cartas
5. **Confirmación** → LLM recibe estado cartas
6. **Respuesta** → LLM genera interpretación contextual
7. **TTS/Manneri** → VTuber habla interpretación

---

## 3. Tipos de Tiradas Soportadas (12+)

### 3.1 Básicas
1. **Una carta** - Sí/No rápido, 1 carta
2. **Tres cartas** - Pasado/Presente/Futuro
3. **Tres cartas ampliada** - Situación/Obstáculo/Consejo
4. **Caballo de 3** - Variante con movimiento

### 3.2 Clásicas
5. **Cruz Celta** - 10 cartas, destino profundo
6. **Herradura** - 7 cartas en forma de U
7. **Triángulo** - 9 cartas amor/trabajo

### 3.3 Avanzadas
8. **Círculo Celta** - 12 cartas anuales
9. **Tirada Egipcia** - 12 cartas en pirámide
10. **Estrella de 6** - 6 cartas puntos cardinales
11. **El Árbol de la Vida** - 10 cartas con Kabbalah
12. **Mandalas** - patrones circulares variables

### 3.4 Contextuales por Regalos
- **Super Chats tier 1:** Tres cartas
- **Super Chats tier 2:** Cruz Celta reducida (6 cartas)
- **Super Chats tier 3:** Tirada completa custom
- **Regalo de 500 coins:** Mínima una carta
- **Regalo de 1000 coins:** Tres cartas + interpretación profunda

**Definición de cada tirada:**
```typescript
interface SpreadDefinition {
  id: string;
  name: string;
  cards_count: number;
  layout_type: "linear" | "circular" | "grid" | "custom";
  positions: PositionDefinition[];
  duration_estimate_ms: number;
  complexity: "basic" | "intermediate" | "advanced";
}
```

---

## 4. Base de Datos de Cartas

### 4.1 Mazo Rider-Waite Smith
- 22 Arcanos Mayores
- 56 Arcanos Menores (4 palos × 14)

**Estructura carta:**
```typescript
{
  id: "el_mago",
  name: "El Mago",
  arcanum: "major",
  number: 1,
  upright_meaning: "...",
  reversed_meaning: "...",
  keywords: ["habilidad", "iniciativa"],
  element: "aire",
  texture_front: "/cards/major/01_el_mago_front.webp",
  texture_back: "/cards/back.webp",
  model_3d: "/models/card.glb"
}
```

### 4.2 Sistema de Barajado
- Algoritmo Fisher-Yates para aleatoriedad
- Semilla basada en timestamp + ID usuario
- Modo determinista para testing
- Persistencia de sesiones en Redis/Memory

---

## 5. Protocolos y Contratos

### 5.1 MCP Schema
```typescript
import { z } from 'zod';

export const TarotSpreadSchema = z.object({
  spread_id: z.string().uuid(),
  spread_type: z.enum([
    'una_carta', 'tres_cartas', 'tres_cartas_ampliada',
    'cruz_celta', 'herradura', 'circulo_celta',
    'tirada_egipcia', 'estrella_6', 'arbol_vida', 'mandala'
  ]),
  cards: z.array(z.object({
    position_id: z.number(),
    position_name: z.string(),
    card_id: z.string(),
    is_reversed: z.boolean(),
    reveal_order: z.number()
  })),
  layout_config: z.object({
    type: z.string(),
    positions_3d: z.array(z.object({
      x: z.number(),
      y: z.number(),
      z: z.number(),
      rotation: z.object({ x: z.number(), y: z.number(), z: z.number() })
    }))
  }),
  timestamp: z.string().datetime(),
  viewer_session_id: z.string()
});
```

### 5.2 WebSocket Protocol
- **Conexión:** `ws://localhost:3001/ws/tarot`
- **Auth:** Token de sesión desde MCP
- **Mensajes:** JSON con `type`, `payload`, `timestamp`
- **Heartbeat:** Ping/Pong cada 30s

---

## 6. Gestión de Estado

### 6.1 Estados de Sesión
- `IDLE` - Listo para nueva tirada
- `SHUFFLING` - Barajando cartas
- `REVEALING` - Mostrando cartas secuencialmente
- `INTERPRETING` - LLM procesa resultado
- `COMPLETE` - Tirada finalizada

### 6.2 Persistencia
- Sesiones activas: Memory + Redis
- Historial tiradas: SQLite/Postgres ligero
- Configuración spreads: JSON en disco
- Métricas: Kizuna integration

---

## 7. Seguridad y Rendimiento

### 7.1 Seguridad
- Validación esquemas Zod en todas las entradas
- Rate limiting: 1 tirada/30s por usuario
- Sanitización texto interpretación LLM
- CORS restringido a localhost/OBS

### 7.2 Rendimiento
- WebGL 2.0 con instancing para cartas
- Texturas comprimidas WebP/AVIF
- Pool de objetos 3D reusables
- Lazy loading de modelos
- Pre-warm de assets en startup

**Benchmark objetivo:**
- < 100ms latencia comando → render
- 60fps estable en OBS 1080p
- < 200MB RAM viewer
- < 50MB bundle inicial

---

## 8. Testing Strategy

- **Unit tests:** SpreadEngine, CardDeck, layout calculations
- **Integration tests:** WebSocket bridge, MCP handlers
- **Visual regression:** Screenshots 3D renders comparados
- **Performance tests:** FPS bajo carga, memoria
- **E2E:** Flujo completo OBS → MCP → Viewer → LLM

---

## 9. Roadmap Fase 1

**MVP (4 semanas):**
1. MCP básico con 3 tiradas (1, 3 cartas, Cruz Celta)
2. Viewer 3D básico con Three.js
3. Integración WebSocket
4. Pruebas OBS local

**Fase 2 (3 semanas):**
5. 12 tiradas completas
6. Animaciones avanzadas
7. UI overlay configuración
8. Persistencia sesiones

**Fase 3 (3 semanas):**
9. Integración eventos regalos
10. Métricas Kizuna
11. Optimización rendimiento
12. Documentación y ejemplos

---

## 10. Archivos de Entrega

- `/packages/mcp-tarot/` - Servidor MCP
- `/packages/tarot-viewer/` - Web viewer 3D
- `/packages/tarot-assets/` - Cartas y modelos
- `/docs/tarot-spreads.json` - Definiciones tiradas
- `/docs/integration-guide.md` - Guía integración OBS/LLM
- `/examples/` - Ejemplos uso MCP tools

---

**Nota:** Arquitectura diseñada para AITuber OnAir monorepo con compatibilidad MCP estándar y extensible a otros VTubers/LLM providers.
