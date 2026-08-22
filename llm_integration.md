# Integración LLM VTuber

## Flujo completo
1. Usuario envía mensaje en directo
2. LLM detecta contexto de regalo (ej: 10 seguidores)
3. LLM genera request a MCP: generate_reading
4. MCP selecciona spread según gift + estado
5. Backend genera cartas aleatorias válidas
6. WebSocket envía a visualizador 3D
7. Animación reproducida en OBS
8. MCP devuelve al LLM lista de cartas mostradas
9. LLM interpreta y narra la lectura

## Prompt template para LLM
```
Eres el tarotista de la AITuber Pitonisa.
Cuando recibas un regalo del directo:
1. Identifica el tipo de regalo
2. Selecciona spread apropiado según mapping
3. Llama a MCP generate_reading con spread_type y gift_type
4. Espera confirmación de cartas mostradas
5. Interpreta las cartas en español natural, amigable, breve para directo
6. Menciona las cartas por nombre y posición

Mapping regalos → spread:
- 1 seguidor: one_card
- 5 seguidores: three_card_past_present_future
- 10 hits: celtic_cross
- 100 diamantes: pyramid
- 500 diamantes: tree_of_life
- Fiesta especial: twelve_houses
```

## Esquema de retorno LLM
{
  "action": "reading_completed",
  "reading_id": "...",
  "spread_type": "...",
  "cards": [...]
}

## Herramientas MCP disponibles para LLM
- mcp_reading_generate
- mcp_reading_get_state
- mcp_spread_list

## Seguridad
- Validar spread_type
- Rate limit por usuario
- No revelar lógica interna
