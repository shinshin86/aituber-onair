#!/usr/bin/env python3
"""Lanza el servidor MCP tarot como daemon:
- keep-alive: mantiene el write-end del FIFO abierto (fd 9)
- servidor: stdin = FIFO (transporte MCP real), stdout -> /tmp/tarot-mcp-out.log
Persiste en setsid (desconectado del TTY de hermes).
"""
import os, subprocess, time

FIFO = '/tmp/tarot-stdin.fifo'
OUT  = '/tmp/tarot-mcp-out.log'
LOG  = '/tmp/tarot-server.log'
PKGD = '/home/meisoft/projects/pitonisa/aituber-onair/packages/mcp-tarot'

# 1) limpiar restos
out = subprocess.run(['pgrep', '-af', 'tarot-stdin.fifo|tsx src/server'],
                     capture_output=True, text=True).stdout
pids = set()
for line in out.splitlines():
    parts = line.split(None, 1)
    if parts and parts[0].isdigit():
        pids.add(int(parts[0]))
for p in pids:
    try:
        os.kill(p, 9)
    except Exception:
        pass
time.sleep(0.5)

# 2) FIFO nuevo
try:
    os.remove(FIFO)
except FileNotFoundError:
    pass
os.mkfifo(FIFO)

# 3) keep-alive en su propia sesión
ka = subprocess.Popen(['bash', '-c', f'exec 9>{FIFO}; exec sleep infinity'],
                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                      preexec_fn=os.setsid)

# 4) server: stdin FIFO, stdout -> OUT (MCP responses), stderr -> LOG
outf = open(OUT, 'w')
logf = open(LOG, 'w')
svr = subprocess.Popen(['npx', 'tsx', 'src/server.ts'], cwd=PKGD,
                       stdin=open(FIFO, 'rb'), stdout=outf, stderr=logf,
                       preexec_fn=os.setsid)

time.sleep(6)
ss = subprocess.run(['bash', '-lc', "ss -ltn | grep -E ':(3001|3002)\\b' || echo NO_PORTS"],
                    capture_output=True, text=True).stdout.strip()
print('keepalive pid', ka.pid, 'alive', ka.poll() is None)
print('server  pid', svr.pid, 'alive', svr.poll() is None)
print(ss)
print('--- server stderr ---')
print(open(LOG).read()[-800:])
with open('/tmp/tarot-server.pid', 'w') as f:
    f.write(str(svr.pid))
outf.close()
logf.close()
