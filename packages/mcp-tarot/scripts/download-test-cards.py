#!/usr/bin/env python3
"""Download public-domain Rider-Waite card fronts (metabismuth/tarot-json) and
convert them to .webp named by the Pitonisa metadata id. Test images only —
we will generate our own cards later with AI."""
import json, os, subprocess, sys, shutil
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageDraw

BASE = '/home/meisoft/projects/pitonisa/aituber-onair'
RAW = 'https://raw.githubusercontent.com/metabismuth/tarot-json/master/cards/{}'
FRONT_DIR = f'{BASE}/packages/tarot-assets/cards/front'
VIEWER_PUBLIC = f'{BASE}/packages/tarot-viewer/public/cards'
os.makedirs(FRONT_DIR, exist_ok=True)
os.makedirs(f'{VIEWER_PUBLIC}/front', exist_ok=True)

meta = json.load(open(f'{BASE}/packages/tarot-assets/cards/metadata.json'))

def file_for(card):
    if card['arcanum'] == 'major':
        return f"m{card['number']:02d}.jpg"
    letter = {'wands': 'w', 'cups': 'c', 'swords': 's', 'pentacles': 'p'}[card['suit']]
    return f"{letter}{card['number']:02d}.jpg"

tasks = []
for c in meta:
    src = file_for(c)
    dst = os.path.join(FRONT_DIR, c['id'] + '.webp')
    tasks.append((src, c['id'], dst))

def download(t):
    src, cid, dst = t
    r = subprocess.run(['curl', '-sL', '--max-time', '60', RAW.format(src), '-o', dst + '.jpg'],
                       capture_output=True)
    if r.returncode != 0:
        return (cid, 'CURL_FAIL', None)
    p = dst + '.jpg'
    if not os.path.exists(p) or os.path.getsize(p) < 5000:
        return (cid, 'BAD_FILE', os.path.getsize(p) if os.path.exists(p) else 0)
    # Resize to width 600 (keep aspect) then save webp quality 82
    im = Image.open(p).convert('RGB')
    w, h = im.size
    if w > 600:
        im = im.resize((600, round(h * 600 / w)), Image.LANCZOS)
    im.save(dst, 'WEBP', quality=82)
    os.remove(p)
    return (cid, 'OK', os.path.getsize(dst))

with ThreadPoolExecutor(max_workers=8) as ex:
    results = list(ex.map(download, tasks))

ok = [r for r in results if r[1] == 'OK']
bad = [r for r in results if r[1] != 'OK']
print(f'downloaded {len(ok)}/78, failed {len(bad)}')
for b in bad:
    print('FAIL:', b)
if bad:
    sys.exit(1)

# Total size
tot = sum(os.path.getsize(os.path.join(FRONT_DIR, f)) for f in os.listdir(FRONT_DIR) if f.endswith('.webp'))
print(f'total webp size: {tot/1024/1024:.1f} MB')

# ---------------------------------------------------------------- back card
W, H = 600, 1035  # ~ same ratio as fronts (600 wide)
im = Image.new('RGB', (W, H), (16, 12, 34))
d = ImageDraw.Draw(im)
# ornamental border
for i, inset in enumerate([14, 26, 40]):
    d.rectangle([inset, inset, W - inset, H - inset], outline=(201, 162, 39), width=max(1, 4 - i))
# inner panel
d.rectangle([60, 60, W - 60, H - 60], outline=(90, 70, 140), width=2)
# crescent moon
cx, cy, r = W // 2, H // 2 - 60, 150
d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(201, 162, 39))
d.ellipse([cx - r + 55, cy - r - 20, cx + r + 55, cy + r - 20], fill=(16, 12, 34))
# stars
import random
random.seed(7)
for _ in range(40):
    x = random.randint(80, W - 80); y = random.randint(80, H - 80)
    if (x - cx) ** 2 + (y - cy) ** 2 < (r + 60) ** 2:
        continue
    s = random.randint(2, 5)
    d.rectangle([x - s, y, x + s, y + s * 2], fill=(230, 210, 140))
im.save(f'{BASE}/packages/tarot-assets/cards/back.webp', 'WEBP', quality=85)
print('back.webp written:', os.path.getsize(f'{BASE}/packages/tarot-assets/cards/back.webp'))

# ---------------------------------------------------------------- sync to viewer public/
shutil.copy2(f'{BASE}/packages/tarot-assets/cards/back.webp', f'{VIEWER_PUBLIC}/back.webp')
for f in os.listdir(FRONT_DIR):
    if f.endswith('.webp'):
        shutil.copy2(os.path.join(FRONT_DIR, f), f'{VIEWER_PUBLIC}/front/' + f)
print('synced to viewer public/:', len(os.listdir(f'{VIEWER_PUBLIC}/front')), 'fronts + back')
