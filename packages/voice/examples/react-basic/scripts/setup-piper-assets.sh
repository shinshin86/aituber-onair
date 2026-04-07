#!/usr/bin/env bash
# Download piper-plus TTS assets from the chrome-on-aituber GitHub Release
# and extract them into public/piper/ for local development.
#
# Usage: ./scripts/setup-piper-assets.sh
#
# ============================================================================
# THIRD-PARTY LICENSES
#
# The downloaded archive contains assets from the following projects.
# By running this script you agree to their respective license terms.
#
# 1. piper-plus
#    Copyright (c) 2022 Michael Hansen; Copyright (c) 2025 ayutaz
#    License: MIT License
#    Source: https://github.com/ayutaz/piper-plus
#
# 2. Piper TTS
#    Copyright (c) 2022 Michael Hansen
#    License: MIT License
#    Source: https://github.com/rhasspy/piper
#
# 3. ONNX Runtime Web
#    Copyright (c) Microsoft Corporation
#    License: MIT License
#    Source: https://www.npmjs.com/package/onnxruntime-web
#
# 4. Open JTalk
#    License: Modified BSD License (BSD 3-Clause)
#    Source: https://open-jtalk.sourceforge.net/
#
# 5. Tsukuyomi-chan Corpus / piper-plus-tsukuyomi-chan model
#    CV: Rei Yumesaki / Rights holder: Rei Yumesaki
#    Terms of use: https://tyc.rei-yumesaki.net/about/terms/
#    Credit guide: https://tyc.rei-yumesaki.net/about/terms/credit/
#    Model source: https://huggingface.co/ayousanz/piper-plus-tsukuyomi-chan
#    Note: This model is used under conditions compliant with the
#          Tsukuyomi-chan Corpus. If you redistribute or create derivative
#          works, review the conditions on the official pages above.
# ============================================================================

set -euo pipefail
cd "$(dirname "$0")/.."

DEST="public/piper"
TARBALL="piper-assets.tar.gz"
DOWNLOAD_URL="https://github.com/shinshin86/chrome-on-aituber/releases/download/piper-assets-v1/piper-assets.tar.gz"

if [ -f "$DEST/dist/ort.min.js" ]; then
  echo "Assets already present in $DEST/. To re-download, remove the directory first:"
  echo "  rm -rf $DEST && ./scripts/setup-piper-assets.sh"
  exit 0
fi

echo "============================================================"
echo "Piper Plus TTS Asset Setup"
echo "============================================================"
echo ""
echo "This script downloads third-party assets subject to the"
echo "following licenses:"
echo "  - piper-plus / Piper TTS: MIT License"
echo "  - ONNX Runtime Web: MIT License (Microsoft Corporation)"
echo "  - Open JTalk: BSD 3-Clause License"
echo "  - Tsukuyomi-chan voice model: Tsukuyomi-chan Corpus terms"
echo "    (c) Rei Yumesaki — https://tyc.rei-yumesaki.net/"
echo ""
echo "Downloading piper assets from chrome-on-aituber release..."
curl -L -o "$TARBALL" "$DOWNLOAD_URL"

echo "Extracting to $DEST/..."
mkdir -p public
tar -xzf "$TARBALL" -C public/

rm "$TARBALL"

echo ""
echo "Done! Assets installed to $DEST/"
echo "You can now run 'npm run dev' and select Piper Plus engine."
