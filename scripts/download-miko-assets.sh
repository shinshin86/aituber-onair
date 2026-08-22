#!/bin/bash
# Script para descargar los assets de Miko (avatar predeterminado de AITuber OnAir)
# Basado en: https://miko.aituberonair.com/en/

set -e

ASSETS_DIR="/home/meisoft/projects/pitonisa/aituber-onair/assets/miko"
mkdir -p "$ASSETS_DIR"

echo "=== Descargando Assets de Miko ==="
echo ""

# URL base para descarga de Miko
MIKO_DOWNLOADS="https://miko.aituberonair.com/downloads/en/"

echo "1. Descargando VRM model..."
curl -L -o "$ASSETS_DIR/miko.vrm" \
    "https://github.com/shinshin86/aituber-onair/raw/main/packages/core/examples/react-vrm-app/public/avatar/miko.vrm" || {
    echo "Intentando desde el repositorio oficial..."
    curl -L -o "$ASSETS_DIR/miko.vrm" \
        "https://raw.githubusercontent.com/shinshin86/aituber-onair/main/packages/core/examples/react-vrm-app/public/avatar/miko.vrm"
}

echo "2. Descargando idle animation (VRMA)..."
curl -L -o "$ASSETS_DIR/idle_loop.vrma" \
    "https://raw.githubusercontent.com/shinshin86/aituber-onair/main/packages/core/examples/react-vrm-app/public/avatar/idle_loop.vrma" || \
    echo "Nota: idle_loop.vrma no encontrado en el repositorio (puede estar en release)"

echo "3. Descargando PuruPuru avatar..."
curl -L -o "$ASSETS_DIR/miko.purupuru" \
    "https://raw.githubusercontent.com/shinshin86/aituber-onair/main/packages/core/examples/react-purupuru-app/public/avatar/miko.purupuru" || \
    echo "Nota: miko.purupuru no encontrado en el repositorio (puede estar en release)"

echo "4. Descargando PNGTuber assets..."
mkdir -p "$ASSETS_DIR/pngtuber"
for expr in mouth_open_eyes_open mouth_open_eyes_closed mouth_close_eyes_open mouth_close_eyes_closed; do
    curl -L -o "$ASSETS_DIR/pngtuber/${expr}.png" \
        "https://raw.githubusercontent.com/shinshin86/aituber-onair/main/packages/core/examples/react-pngtuber-app/public/avatar/${expr}.png" 2>/dev/null || \
        echo "Nota: ${expr}.png no encontrado"
done

echo "5. Descargando Pet assets..."
mkdir -p "$ASSETS_DIR/pet"
curl -L -o "$ASSETS_DIR/pet/pet.json" \
    "https://raw.githubusercontent.com/shinshin86/aituber-onair/main/packages/core/examples/react-pet-app/public/pet/pet.json" || \
    echo "Nota: pet.json no encontrado"
curl -L -o "$ASSETS_DIR/pet/spritesheet.webp" \
    "https://raw.githubusercontent.com/shinshin86/aituber-onair/main/packages/core/examples/react-pet-app/public/pet/spritesheet.webp" || \
    echo "Nota: spritesheet.webp no encontrado"

echo ""
echo "=== Assets descargados en: $ASSETS_DIR ==="
ls -la "$ASSETS_DIR" 2>/dev/null || true

echo ""
echo "=== Assets disponibles en el repositorio local ==="
find /home/meisoft/projects/pitonisa/aituber-onair/packages/core/examples -name "*.vrm" -o -name "*.purupuru" -o -name "miko*.png" 2>/dev/null | head -20
