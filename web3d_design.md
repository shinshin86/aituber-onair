# Diseño Web 3D Tarot Viewer

## Stack técnico
- Three.js r160+
- React + Vite para UI de control
- WebSockets para comunicación MCP
- Canvas renderizado a 60fps para OBS

## Componentes principales
1. **CardModel** : mesh plano con texture de carta
   - Geometría PlaneGeometry 1x1.75 unidades
   - Material MeshStandardMaterial con map texture
   - Animación de flip, reveal, levitation

2. **SpreadLayouts**
   - Line3: posiciones en línea horizontal
   - Cross10: cruz celtic
   - Pyramid: pirámide triangular
   - Circle12: círculo 12 posiciones
   - Tree10: árbol con 10 posiciones

3. **AnimationController**
   - secuencia de aparición por posición
   - easing spring para movimiento natural
   - cámara orbit suave

4. **CardDeck**
   - shuffle visual
   - cut y draw animado

## Estructura de archivos
```
tarot-viewer/
  src/
    components/
      Card.tsx
      SpreadLayout.tsx
      CameraRig.tsx
    layouts/
      LineSpread.ts
      CrossSpread.ts
      PyramidSpread.ts
    animations/
      Reveal.ts
      Flip.ts
    ws/
      client.ts
    App.tsx
  public/
    cards/  # 78 cartas PNG
  server/
    server.py  # FastAPI + WebSocket bridge
```

## API WebSocket mensajes
Client → Server:
- {type: "request_spread", spread_type}
- {type: "set_cards", cards[]}

Server → Client:
- {type: "new_reading", reading_id, spread_type, cards}
- {type: "reveal_card", position, card_id}
- {type: "animation_done", reading_id}

## Optimización OBS
- Resolution 1920x1080 @ 60fps
- Background transparente opcional
- Chrome Browser Source: http://localhost:8080
- Control de zoom y posición vía URL params: ?zoom=1.2&pan=0,0

## Animaciones por tirada
- 3 cartas: aparición secuencial izquierda→derecha con delay 500ms
- Cruz Celta: centro aparece, luego brazos, luego externas
- Pirámide: construcción de abajo hacia arriba
- Estrella: aparición radial desde centro

## Gestión de assets
- Lazy load textures
- Atlas de cartas para reducir draw calls
- Pool de meshes reutilizables

## Config observables
- animation_speed: 0.5-2.0
- card_scale: 0.8-1.5
- camera_distance: 5-15
- show_numbers: boolean
- show_labels: boolean
