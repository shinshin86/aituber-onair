# Plan arquitectónico: MCP Tarot 3D + VTuber LLM

## Contexto
- Proyecto Pitonisa / AITuber OnAir en `/home/meisoft/projects/pitonisa/aituber-onair`
- Necesidad: servicio MCP para conectar asistente LLM VTuber con visualización 3D de tiradas de tarot según regalos del directo.
- Integración OBS: captura del servicio web 3D.
- Flujo: LLM solicita lectura → MCP selecciona tipo de tirada según regalo → genera animación 3D → presenta cartas → devuelve al LLM qué cartas se muestran.

## Roles y flujo multi-agente
- architect: descomponer en tarjetas, definir interfaces.
- coder: implementar MCP, web 3D, API.
- reviewer: revisar seguridad, schemas, consistencia.
- qa: pruebas de renderizado, integración LLM, regresiones.

## Tarjetas de trabajo
1. Investigación: 10+ tipos de tiradas (fuentes actuales)
2. Especificación MCP: recursos, herramientas, schemas JSON.
3. Diseño web 3D: Three.js + animaciones de cartas, layout por tirada.
4. Backend Python: generador de tiradas, mapping regalo→tipo, API REST/WebSocket.
5. Integración LLM: ciclo request-response, prompt templates.
6. Assets: imágenes de cartas para tests (sin licencia).
7. Documentación MD y pruebas QA.

## Constraints
- No versionar pesos de modelos. Imágenes de cartas para pruebas solo, licencia libre.
- Usar Three.js para render 3D, optimizado para OBS captura.
- Strict JSON schemas, auditoría automática.
- Código pequeño y parches dirigidos.
