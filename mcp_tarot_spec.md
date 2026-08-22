# Especificación MCP Tarot 3D

## Overview
Servicio MCP para visualización 3D de tiradas de tarot en directo VTuber.
Conecta LLM → MCP → web 3D (OBS capture) → retorno LLM con cartas mostradas.

## Arquitectura
```
LLM (Ollama 192.168.1.10:11434)
  ↓ request reading
MCP Server (Python FastAPI + WebSocket)
  ↓
Renderer Web 3D (Three.js)
  ↓
OBS Browser Source
```

## Protocolos
- MCP v1: JSON-RPC over stdio / SSE
- REST/WebSocket para control del renderer
- SSE para eventos de regalos

## Recursos MCP
- tarot/spreads: lista de tipos disponibles
- tarot/cards: deck info

## Herramientas MCP
1. **generate_reading**
   - Input: spread_type (string), gift_type (string), context (object)
   - Output: reading_id, cards[], animation_params
   - Ejemplo: {"spread_type": "three_card", "gift_type": "10_hits"}

2. **show_cards**
   - Input: reading_id, animation_duration (ms)
   - Output: display_status, screenshot_url

3. **get_current_spread**
   - Input: none
   - Output: active_reading, cards_positions

4. **list_spread_types**
   - Output: array de tipos con metadata

## Esquema de tiradas
Cada tirada define:
- id: string único
- name: nombre legible
- cards_count: int
- layout: "line"|"cross"|"pyramid"|"circle"|"tree"
- positions: [{id, label, description}]
- gift_triggers: array de regalos que activan

## Tipos de tiradas soportados
1. one_card
2. three_card_past_present_future
3. three_card_situation_obstacle_advice
4. celtic_cross (10 cartas)
5. pyramid (10 cartas)
6. tree_of_life (10 cartas)
7. seven_card_week
8. twelve_houses
9. love_5_card
10. star_7_card
11. lenormand_36

## API REST del renderer
POST /api/reading
Body: {spread_type, cards: [{id, position, value, reversed}]}
Response: {reading_id, status}

GET /api/reading/{id}/state
Response: {cards_rendered, animation_progress}

WebSocket /ws
Mensajes:
- {type: "start_animation", reading_id}
- {type: "card_reveal", position, card_id}
- {type: "done", reading_id, cards_shown}

## Retorno al LLM
MCP envía al LLM lista de cartas mostradas:
{
  "reading_id": "uuid",
  "spread_type": "three_card",
  "cards": [
    {"position": "past", "card": "The Fool", "reversed": false},
    ...
  ],
  "timestamp": 1234567890
}

## Configuración
- assets/cards/ : imágenes 300x527 PNG
- settings: animation_speed, camera_distance, background
- OBS: Browser Source URL: http://localhost:8080/viewer

## Seguridad
- Validar spread_type contra whitelist
- Sanitizar inputs LLM
- Rate limiting por lectura
