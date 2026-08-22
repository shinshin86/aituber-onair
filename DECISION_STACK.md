# DECISIÓN DE STACK - MCP Tarot 3D PITONISA

## Decisión tomada: TypeScript/Node.js

**Motivo:** AITuber OnAir es monorepo TypeScript con packages en npm workspaces. Consistencia con codebase existente.

## Consolidación de entregas

### Arquitectura final adoptada:
- **MCP Server**: Node.js/TypeScript en `@pitonisa/mcp-tarot`
- **Web Viewer**: Three.js r185 + React para OBS Browser Source
- **Protocolos**: WebSocket + MCP JSON-RPC
- **Assets**: Rider-Waite CC0, 78 cartas PNG/WebP

### 12 tipos de tiradas consolidados:
1. Una carta
2. Tres cartas Pasado/Presente/Futuro
3. Tres cartas Situación/Obstáculo/Consejo
4. Cruz Celta (10)
5. Herradura (7)
6. Tríangulo amor/trabajo (9)
7. Círculo Celta (12)
8. Tirada Egipcia (12)
9. Estrella de 6
10. Árbol de Vida (10)
11. Mandalas variables
12. Lenormand 36 (opcional)

### Mapping regalos → spread:
- 1 seguidor: Una carta
- 5 seguidores: Tres cartas
- 10 hits: Cruz Celta
- 100 diamantes: Pirámide/Egipcia
- 500 diamantes: Árbol de Vida
- Fiesta especial: Círculo Celta

### Estructura de paquetes:
```
packages/
├── @pitonisa/mcp-tarot/        # MCP Server
├── @pitonisa/tarot-viewer/     # Three.js viewer
└── @pitonisa/tarot-assets/     # Cartas + spreads
```

### Próximos pasos priorizados:
1. Configurar estructura monorepo
2. Definir schemas Zod
3. CardDeck service
4. SpreadEngine con 12 layouts
5. WebSocket bridge
6. Viewer Three.js con animaciones
7. Integración Bushitsu/Kizuna

**Estado**: Arquitectura consolidada, lista para implementación.
