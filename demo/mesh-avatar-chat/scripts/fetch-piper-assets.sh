#!/usr/bin/env bash
# Prepare public/piper/ for the demo:
#   1. the piper-plus runtime and OpenJTalk dictionary from a GitHub Release
#      tarball (PIPER_ASSETS_URL), and
#   2. the Miko voice model (sample-voice-v2.onnx + .onnx.json) from
#      PIPER_MODEL_BASE_URL, or copied from a local directory PIPER_MODEL_DIR.
# Nothing under public/piper/ is committed.
#
# Usage:
#   PIPER_MODEL_DIR=/path/to/model-dir bash scripts/fetch-piper-assets.sh
#   PIPER_MODEL_BASE_URL=https://example.com/models bash scripts/fetch-piper-assets.sh

set -euo pipefail
cd "$(dirname "$0")/.."

DEFAULT_ASSETS_URL="https://github.com/shinshin86/chrome-on-aituber/releases/download/piper-assets-v2/piper-assets.tar.gz"
ASSETS_URL="${PIPER_ASSETS_URL:-$DEFAULT_ASSETS_URL}"
MODEL_FILES=(sample-voice-v2.onnx sample-voice-v2.onnx.json)
TARBALL="$(mktemp -t piper-assets.XXXXXX)"
trap 'rm -f "$TARBALL"' EXIT

echo "Downloading piper-plus runtime from $ASSETS_URL"
curl -fL --retry 3 -o "$TARBALL" "$ASSETS_URL"

rm -rf public/piper
mkdir -p public
tar -xzf "$TARBALL" -C public/

# The tarball ships the Tsukuyomi-chan model; the demo uses its own voice.
rm -f public/piper/models/tsukuyomi-* public/piper/licenses/tsukuyomi-chan-corpus-NOTICE.txt
mkdir -p public/piper/models public/piper/licenses
cp licenses/* public/piper/licenses/

if [ -n "${PIPER_MODEL_DIR:-}" ]; then
  echo "Copying the voice model from $PIPER_MODEL_DIR"
  for file in "${MODEL_FILES[@]}"; do
    cp "$PIPER_MODEL_DIR/$file" public/piper/models/
  done
elif [ -n "${PIPER_MODEL_BASE_URL:-}" ]; then
  echo "Downloading the voice model from $PIPER_MODEL_BASE_URL"
  for file in "${MODEL_FILES[@]}"; do
    curl -fL --retry 3 -o "public/piper/models/$file" "${PIPER_MODEL_BASE_URL%/}/$file"
  done
else
  echo "Error: set PIPER_MODEL_DIR or PIPER_MODEL_BASE_URL to provide the voice model." >&2
  exit 1
fi

echo "Prepared public/piper/ ($(du -sh public/piper | cut -f1))"
