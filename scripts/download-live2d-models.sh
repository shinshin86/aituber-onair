#!/bin/bash
# Script para descargar modelos Live2D de ejemplo
# Nota: Live2D no incluye modelos licenciados por defecto
# Estos son ejemplos de la comunidad

set -e

LIVE2D_DIR="/home/meisoft/projects/pitonisa/aituber-onair/assets/live2d"
mkdir -p "$LIVE2D_DIR"

echo "=== Descargando Modelos Live2D de Ejemplo ==="
echo ""

# Live2D modelo de ejemplo desde el repositorio oficial de Live2D
echo "1. Descargando modelo de ejemplo Live2D..."
mkdir -p "$LIVE2D_DIR/sample"
curl -L -o "$LIVE2D_DIR/sample/model3.cmo" \
    "https://cdn.live2d.com/assets/sample_3d/programe_sample3D.model3.json" 2>/dev/null || \
    echo "Nota: Modelo de muestra Live2D no disponible (requiere cuenta Live2D)"

# Modelos de la comunidad (ejemplos)
echo "2. Descargando modelos de la comunidad..."

# Modelo "Haru" - uno de los más populares para pruebas
curl -L -o "$LIVE2D_DIR/haru.model.json" \
    "https://cdn.live2d.com/assets/haru/01/haru_greeter_t03.model3.json" 2>/dev/null || \
    echo "Nota: Modelo Haru no disponible (requiere licencia Live2D)"

echo ""
echo "=== Nota sobre modelos Live2D ==="
echo "Live2D no incluye activos de modelos licenciados en el repositorio."
echo "Para obtener modelos Live2D:"
echo "  1. Crea una cuenta en https://www.live2d.com/en/"
echo "  2. Descarga el SDK de ejemplo que incluye modelos"
echo "  3. O usa modelos de la comunidad de fuentes como:"
echo "     - https://www.live2d.com/en/learn/sample/"
echo "     - https://modelhub.live2d.com/"
echo ""
echo "=== Directorio: $LIVE2D_DIR ==="
ls -la "$LIVE2D_DIR" 2>/dev/null || true
