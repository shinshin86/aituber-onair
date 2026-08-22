#!/usr/bin/env bash
# draw.sh SPREAD_ID [SEED] — dispara una tirada al servidor MCP de tarot
# (production, stdin en /tmp/tarot-stdin.fifo) por el transporte stdio real,
# igual que lo hará el LLM/agent. El servidor la reenvía por WS al viewer 3D.
set -euo pipefail

SPREAD="${1:-cruz_celta}"
SEED="${2:-}"
FIFO="/tmp/tarot-stdin.fifo"
OUT="/tmp/tarot-mcp-out.log"

[ -p "$FIFO" ] || { echo "ERROR: el servidor no está corriendo con FIFO de stdin"; exit 1; }

ARGS="{\"spread_type\":\"$SPREAD\"}"
[ -n "$SEED" ] && ARGS="{\"spread_type\":\"$SPREAD\",\"seed\":$SEED}"

{
  printf '%s\n' "{\"jsonrpc\":\"2.0\",\"id\":900,\"method\":\"tools/call\",\"params\":{\"name\":\"tarot_draw_cards\",\"arguments\":$ARGS}}"
  sleep 0.6
} > "$FIFO"

sleep 0.4
tail -1 "$OUT" | python3 -c "
import sys, json
raw = sys.stdin.read()
try:
    m = json.loads(raw)
    c = m.get('result', {}).get('content', [{}])[0].get('text', '')
    d = json.loads(c)
    r = d.get('reading', d)
    print('OK tirada lanzada ->')
    print('  spread :', r.get('spread_name', r.get('spread', '?')))
    for cd in r.get('cards', []):
        rev = ' (invertida)' if cd.get('reversed') else ''
        print(f'   #{cd.get(\"position_id\")} {cd.get(\"position_label\")}: {cd.get(\"card_title\", cd.get(\"card_id\"))}{rev}')
except Exception as e:
    print('  (no se pudo parsear la respuesta:', e, ')')
    print('  crudo:', raw[:300])
" || true
