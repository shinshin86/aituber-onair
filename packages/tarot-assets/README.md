# @pitonisa/tarot-assets

Recursos del mazo de tarot: metadatos, layout de spreads e imágenes.

## Estructura
```
cards/
  metadata.json      # 78 cartas Rider-Waite-Smith (22 mayores + 56 menores), con
                     #   significados, palabras clave y rutas de textura (texture_front/back)
  back.webp          # reverso común (plaza dorada generada como prueba)
  front/             # 78 frentes .webp · <card_id>.webp (ids de metadata.json)
spreads/
  spreads.json       # catálogo de los 12 spreads (regenerado desde SpreadEngine.ts)
```

## Imágenes de PRUEBA
Las cartas actuales son escaneos públicos Rider-Waite descargados de
`github.com/mixvlad/TarotCards` / `metabismuth/tarot-json` (dominio público,
atribución: A. E. Waite, Colman & Son). **Solo para testear la web del viewer.**
Se reemplazarán por las cartas propias de Pitonisa; en ese momento:
1. generar las texturas con el mismo esquema `front/<card_id>.webp` y `back.webp`
2. actualizar `metadata.json` si cambian ids
3. `npm -w @pitonisa/tarot-viewer run build` para copiarlas a `dist/cards/`

El mazo puede regenerarse con:
```bash
python3 scripts/download-test-cards.py   # (en packages/mcp-tarot/scripts)
```

## Sincronización con el viewer
`public/cards/` del viewer es una copia servida por Vite en dev y copiada a
`dist/cards/` en build. Tras regenerar imágenes:
```bash
cp -r packages/tarot-assets/cards/* packages/tarot-viewer/public/cards/
npm -w @pitonisa/tarot-viewer run build
```
