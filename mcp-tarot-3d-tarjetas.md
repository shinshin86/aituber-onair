# Tarjetas de Trabajo - MCP Tarot 3D
## Proyecto Pitonisa - Descomposición en Equipo

**Proyecto base:** `/home/meisoft/projects/pitonisa/aituber-onair`  
**Módulo:** MCP Tarot 3D + Web Viewer OBS  
**Equipo:** architect → coder → reviewer → qa

---

## FASE 1: FUNDACIÓN Y MCP CORE

### [T-001] Configurar estructura monorepo MCP Tarot
**Tipo:** Coder | **Estimación:** 4h | **Prioridad:** Alta

**Descripción:**
Crear estructura de paquetes en `/home/meisoft/projects/pitonisa/aituber-onair/packages/`:
- `@pitonisa/mcp-tarot`
- `@pitonisa/tarot-viewer`
- `@pitonisa/tarot-assets`

**Criterios de aceptación:**
- [ ] `package.json` con dependencias TypeScript, MCP SDK, Zod
- [ ] Estructura src/ con server.ts esqueleto
- [ ] Scripts build/test/lint configurados
- [ ] Integración con workspace root

**Entregables:**
- Estructura de carpetas creada
- `npm init` paquetes con dependencias base
- `tsconfig.json` compartido

**Review points:**
- Cumple con arquitectura aituber-onair
- Naming consistente
- No dependencias innecesarias

---

### [T-002] Definir esquema MCP Tarot
**Tipo:** Coder | **Estimación:** 6h | **Prioridad:** Alta

**Descripción:**
Definir schemas Zod para todas las herramientas MCP:
- `tarot_select_spread`
- `tarot_draw_cards`
- `tarot_get_interpretation`
- `tarot_reset_session`

**Criterios de aceptación:**
- [ ] Schemas validados con Zod
- [ ] Tipos TypeScript exportados
- [ ] Documentación JSDoc completa
- [ ] Tests de validación

**Entregables:**
- `src/protocols/tarot-schema.ts`
- Tests unitarios validación

**Review points:**
- Schemas extensibles
- Compatibilidad MCP estándar
- Mensajes de error claros

---

### [T-003] Implementar CardDeck service
**Tipo:** Coder | **Estimación:** 8h | **Prioridad:** Alta

**Descripción:**
Servicio gestión mazo de 78 cartas Rider-Waite con:
- Carga de 78 cartas desde JSON
- Algoritmo barajado Fisher-Yates
- Inversión aleatoria controlada
- Inyección dependencias

**Criterios de aceptación:**
- [ ] Clase CardDeck con métodos shuffle(), draw(n)
- [ ] Validar distribución uniforme barajado
- [ ] Soporte seed para testing
- [ ] Tests cobertura >90%

**Entregables:**
- `src/services/CardDeck.ts`
- `tests/services/card-deck.test.ts`
- Datos cartas `assets/cards/metadata.json`

**Review points:**
- Aleatoriedad verificada estadísticamente
- Sin fugas memoria
- Performance <1ms por operación

---

### [T-004] Implementar SpreadEngine
**Tipo:** Coder | **Estimación:** 10h | **Prioridad:** Alta

**Descripción:**
Engine cálculo layouts para 12 tiradas:
- Una carta, tres cartas, Cruz Celta, Herradura...
- Cálculo posiciones 3D para cada tirada
- Definiciones positions JSON
- Validación integridad

**Criterios de aceptación:**
- [ ] 12 spreads definidos en `spreads.json`
- [ ] Método calculateLayout(spread_type) implementado
- [ ] Posiciones 3D normalizadas ([-1,1] range)
- [ ] Tests validación posiciones

**Entregables:**
- `src/services/SpreadEngine.ts`
- `assets/spreads/tarot-spreads.json`
- Tests unitarios spreads

**Review points:**
- Layouts consistentes con tradición
- Extensible para nuevas tiradas
- Coordenadas optimizadas cámara

---

## FASE 2: MCP SERVER E INTEGRACIÓN

### [T-005] Servidor MCP principal
**Tipo:** Coder | **Estimación:** 8h | **Prioridad:** Alta

**Descripción:**
Implementar servidor MCP que expone herramientas:
- Registro handlers para cada herramienta
- Validación inputs/outputs
- Logging estructurado
- Manejo errores graceful

**Criterios de aceptación:**
- [ ] Servidor arranca correctamente
- [ ] Todas herramientas registradas
- [ ] Integración con AITuber OnAir core
- [ ] Tests integración MCP

**Entregables:**
- `src/server.ts`
- `src/protocols/mcp-handlers.ts`
- Tests integración

**Review points:**
- Cumple protocolo MCP
- Errores no silencian
- Performance aceptable

---

### [T-006] WebSocket Bridge
**Tipo:** Coder | **Estimación:** 6h | **Prioridad:** Media

**Descripción:**
Bridge comunicación MCP ↔ Viewer:
- Servidor WebSocket en puerto 3001
- Protocolo mensajes definido
- Autenticación por token sesión
- Heartbeat/ping

**Criterios de aceptación:**
- [ ] Conexión WebSocket estable
- [ ] Mensajes de prueba funcionales
- [ ] Reconexión automática cliente
- [ ] Logs debug

**Entregables:**
- `src/services/WebSocketBridge.ts`
- Tests WebSocket básicos

**Review points:**
- Sin bloqueos
- Escalable a múltiples viewers
- Seguridad básica

---

### [T-007] Integración Bushitsu/Kizuna
**Tipo:** Coder | **Estimación:** 5h | **Prioridad:** Media

**Descripción:**
Conectar MCP con sistema existente:
- Escuchar eventos regalos
- Mapear regalos → tipos tirada
- Registrar métricas sesiones
- Hook a sistema puntos

**Criterios de aceptación:**
- [ ] Eventos regalos disparan tarot
- [ ] Métricas registradas en Kizuna
- [ ] Configuración thresholds
- [ ] Tests integración

**Entregables:**
- `src/integrations/bushitsu.ts`
- `src/integrations/kizuna.ts`
- Config YAML

**Review points:**
- No romper integraciones existentes
- Configuración flexible
- Documentación

---

## FASE 3: WEB VIEWER 3D

### [T-008] Setup Three.js base
**Tipo:** Coder | **Estimación:** 8h | **Prioridad:** Alta

**Descripción:**
Inicializar viewer React + Three.js:
- Configurar escena, cámara, renderer
- Iluminación estudio OBS
- Controles orbit limitados
- Optimización rendimiento

**Criterios de aceptación:**
- [ ] Scena renderiza a 60fps
- [ ] Cámara posicionada óptima OBS
- [ ] Iluminación uniforme
- [ ] Sin memory leaks

**Entregables:**
- `@pitonisa/tarot-viewer/src/engine/ThreeSetup.ts`
- Componente TarotViewer base
- Tests visuales

**Review points:**
- Performance perfilado
- Compatibilidad WebGL 2.0
- Taille bundle <500KB

---

### [T-009] Modelo 3D carta
**Tipo:** Coder | **Estimación:** 10h | **Prioridad:** Alta

**Descripción:**
Crear sistema cartas 3D:
- Modelo base carta con grosor
- Materiales PBR para impresión
- Texturas 78 cartas mapeadas UV
- Animaciones: barajar, voltear, revelar

**Criterios de aceptación:**
- [ ] Cartas renderizan correctamente
- [ ] Texturas cargan progresivamente
- [ ] Animación voltear 180° fluida
- [ ] Pool de instancias

**Entregables:**
- `src/components/Card3D.tsx`
- `src/engine/CardAnimation.ts`
- Assets modelos GLB

**Review points:**
- Texturas optimizadas
- Animaciones 60fps
- Efectos visuales controlados

---

### [T-010] Layouts spreads 3D
**Tipo:** Coder | **Estimación:** 12h | **Prioridad:** Media

**Descripción:**
Implementar renderizado layouts:
- Posicionamiento cartas según spread
- Animaciones entrada (fan, cascade, circle)
- Z-order correcto
- Oclusión/occlusion culling

**Criterios de aceptación:**
- [ ] 12 spreads visualizados correctamente
- [ ] Animaciones sincronizadas
- [ ] No overlapping incorrecto
- [ ] Performance mantenido

**Entregables:**
- `src/components/SpreadLayout.tsx`
- Animaciones layout específicos
- Tests visuales

**Review points:**
- Legibilidad en OBS 1080p
- Consistencia visual
- Accessibility

---

### [T-011] WebSocket client viewer
**Tipo:** Coder | **Estimación:** 6h | **Prioridad:** Alta

**Descripción:**
Cliente WebSocket en viewer:
- Conexión a servidor MCP
- Handler mensajes
- Estado sincronizado
- Reintentos conexión

**Criterios de aceptación:**
- [ ] Recibe comandos MCP
- [ ] Renderiza cartas correctamente
- [ ] Logs debug visibles
- [ ] Manejo errores

**Entregables:**
- `src/client/ws-client.ts`
- Hook React useTarotWebSocket

**Review points:**
- No bloquea UI
- Cleanup correcto
- Tests

---

## FASE 4: UI Y OBS INTEGRACIÓN

### [T-012] UI Overlay configuración
**Tipo:** Coder | **Estimación:** 8h | **Prioridad:** Media

**Descripción:**
Panel control no-captura para OBS:
- Configurar WebSocket URL
- Seleccionar spreads disponibles
- Tests animaciones
- Preview modo

**Criterios de aceptación:**
- [ ] Config persiste localStorage
- [ ] Preview funcional
- [ ] No visible en captura OBS
- [ ] Responsive

**Entregables:**
- `src/components/UIOverlay.tsx`
- Panel settings

**Review points:**
- Separación visual captura/no-captura
- UX clara
- Validación inputs

---

### [T-013] Optimización OBS Browser Source
**Tipo:** Coder | **Estimación:** 6h | **Prioridad:** Media

**Descripción:**
Ajustes específicos OBS:
- Preload crítico
- Gestión visibilidad tab
- Config FPS
- Troubleshooting compatibilidad

**Criterios de aceptación:**
- [ ] Carga <3s en OBS
- [ ] Mantiene 60fps
- [ ] Sin flickering
- [ ] Documentación setup

**Entregables:**
- `docs/obs-setup.md`
- Config optimizada

**Review points:**
- Tested en OBS real
- Documentación clara
- Fallbacks

---

## FASE 5: TESTING Y QA

### [T-QA-001] Tests unitarios core
**Tipo:** QA | **Estimación:** 8h | **Prioridad:** Alta

**Descripción:**
Validar lógica negocio:
- SpreadEngine
- CardDeck
- Validaciones schemas

**Criterios de aceptación:**
- [ ] Cobertura >80%
- [ ] Tests paranoid barajado
- [ ] Edge cases cubiertos
- [ ] CI ejecutando

**Entregables:**
- Reporte cobertura
- Tests failing documentados

---

### [T-QA-002] Tests integración MCP
**Tipo:** QA | **Estimación:** 10h | **Prioridad:** Alta

**Descripción:**
Pruebas flujo completo:
- MCP → WebSocket → Viewer
- Eventos regalos
- Sesiones concurrentes

**Criterios de aceptación:**
- [ ] Flujo end-to-end funciona
- [ ] Latencia <500ms
- [ ] No regresiones
- [ ] Logs completos

**Entregables:**
- Reporte pruebas
- Video demo flujo

---

### [T-QA-003] Test visual regresión
**Tipo:** QA | **Estimación:** 6h | **Prioridad:** Media

**Descripción:**
Validar renderizado 3D:
- Screenshots comparados
- Performance FPS
- Memory leaks
- Cross-browser

**Criterios de aceptación:**
- [ ] Capturas 12 spreads
- [ ] FPS >55 promedio
- [ ] Sin memory leaks 10min
- [ ] Chrome/Firefox/Safari

**Entregables:**
- Reporte performance
- Screenshots

---

## FASE 6: REVISIÓN Y DOCUMENTACIÓN

### [T-REV-001] Code review arquitectura
**Tipo:** Reviewer | **Estimación:** 6h | **Prioridad:** Alta

**Descripción:**
Revisión completa arquitectura:
- Diseño patrones
- Seguridad
- Escalabilidad
- Conventions

**Criterios de aceptación:**
- [ ] Todos archivos revisados
- [ ] Issues críticas cerradas
- [ ] ADR documentado
- [ ] Aprobación arquitecto

**Entregables:**
- Reporte review
- Issues GitHub

---

### [T-REV-002] Documentación integración
**Tipo:** Reviewer | **Estimación:** 4h | **Prioridad:** Media

**Descripción:**
Documentar uso:
- Guía integración OBS
- API MCP
- Configuración LLM
- Ejemplos

**Criterios de aceptación:**
- [ ] README completo
- [ ] Ejemplos funcionales
- [ ] API docs
- [ ] Troubleshooting

**Entregables:**
- `docs/integration-guide.md`
- `docs/api-reference.md`

---

## FASE 7: DESPLIEGUE Y CIERRE

### [T-DEP-001] Build y packaging
**Tipo:** Coder | **Estimación:** 4h | **Prioridad:** Media

**Descripción:**
Preparar para release:
- Build producción
- Tests pasan
- Lint clean
- Paquetes npm

**Criterios de aceptación:**
- [ ] `npm run build` exitoso
- [ ] Tests pasan CI
- [ ] Paquetes listos
- [ ] Changelog

**Entregables:**
- Builds en `dist/`
- Paquetes publicados

---

## CRITERIOS DE DEFINICIÓN DE HECHO (DoD)

Todo item debe cumplir:
- [ ] Código implementado + tests
- [ ] Code review aprobado
- [ ] Documentación actualizada
- [ ] Demo funcional
- [ ] Sin issues críticos abiertos
- [ ] Integrado en monorepo

## ESTIMACIÓN TOTAL

- **Coder:** 137h (~34 días)
- **Reviewer:** 10h
- **QA:** 24h
- **Total equipo:** 171h (~43 días)

**Hitos:**
- H1 (Fase 1-2): 2 semanas
- H2 (Fase 3): 3 semanas  
- H3 (Fase 4-5): 2 semanas
- H4 (Fase 6-7): 1 semana

---

## DEPENDENCIAS CRÍTICAS

- T-001 → T-002 → T-003 → T-004 → T-005
- T-003 → T-006
- T-008 → T-009 → T-010
- T-011 depende T-006
- Todos bloquean T-QA-001

**Riesgos:** Integración OBS impredecible, performance Three.js en OBS CEF, sincronización WebSocket latencia.
