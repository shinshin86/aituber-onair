#!/bin/bash
# Script para iniciar cada ejemplo de avatar
# Uso: bash run-avatar-examples.sh [nombre-ejemplo]

EXAMPLES=(
    "react-vrm-app"
    "react-purupuru-app"
    "react-pngtuber-app"
    "react-pet-app"
    "react-inochi2d-app"
    "react-live2d-app"
)

if [ $# -eq 1 ]; then
    EXAMPLES=("$1")
fi

echo "=== Iniciando ejemplos de avatar ==="
echo ""

for example in "${EXAMPLES[@]}"; do
    dir="packages/core/examples/$example"
    if [ -d "$dir" ]; then
        echo "▶ $example"
        cd "$dir" && npm run dev &
        cd ../..
    else
        echo "✗ $example no encontrado"
    fi
done

echo ""
echo "Ejemplos iniciados en background."
echo "Abre http://localhost:5173 en el navegador."
