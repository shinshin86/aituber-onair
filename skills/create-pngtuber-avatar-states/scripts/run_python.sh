#!/bin/sh
set -eu

if [ "$#" -lt 1 ]; then
  echo "usage: sh run_python.sh <script.py> [args...]" >&2
  exit 2
fi

if command -v uv >/dev/null 2>&1; then
  exec uv --cache-dir "${UV_CACHE_DIR:-/tmp/uv-cache}" run python "$@"
fi

if command -v python3 >/dev/null 2>&1; then
  exec python3 "$@"
fi

if command -v python >/dev/null 2>&1; then
  exec python "$@"
fi

echo "error: neither uv nor python was found on PATH" >&2
exit 127
