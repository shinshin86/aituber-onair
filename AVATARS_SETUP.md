# Avatares Configurados para Pruebas

## Resumen

Todos los avatares están listos para usar en las aplicaciones de ejemplo.

---

## 1. VRM Avatar (Miko)

**Ejemplo:** `packages/core/examples/react-vrm-app`

**Assets:**
- `public/avatar/miko.vrm` (25 MB)
- `public/avatar/idle_loop.vrma` (154 KB)

**Iniciar:**
```bash
cd packages/core/examples/react-vrm-app
npm run dev
```

---

## 2. PuruPuru Avatar (Miko)

**Ejemplo:** `packages/core/examples/react-purupuru-app`

**Assets:**
- `public/avatar/miko.purupuru` (3.6 MB)

**Iniciar:**
```bash
cd packages/core/examples/react-purupuru-app
npm run dev
```

---

## 3. PNGTuber Avatar (Miko)

**Ejemplo:** `packages/core/examples/react-pngtuber-app`

**Assets:**
- `public/avatar/mouth_open_eyes_open.png` (1.3 MB)
- `public/avatar/mouth_close_eyes_open.png` (1.2 MB)
- `public/avatar/mouth_open_eyes_closed.png` (1.2 MB)
- `public/avatar/mouth_close_eyes_closed.png` (1.2 MB)
- `public/avatar/mouth_open_eyes_close.png` (1.2 MB)
- `public/avatar/mouth_close_eyes_close.png` (1.2 MB)

**Iniciar:**
```bash
cd packages/core/examples/react-pngtuber-app
npm run dev
```

---

## 4. Pet Avatar (Miko)

**Ejemplo:** `packages/core/examples/react-pet-app`

**Assets:**
- `public/pet/spritesheet.webp` (1.8 MB)
- `public/pet/pet.json`

**Iniciar:**
```bash
cd packages/core/examples/react-pet-app
npm run dev
```

---

## 5. Inochi2D Avatar (Aka)

**Ejemplo:** `packages/core/examples/react-inochi2d-app`

**Assets:**
- `public/inochi2d/models/Aka.original-rig.inx` (17 MB)
- `public/inochi2d/models/Aka.original.motion.json` (4.9 MB)
- `public/inochi2d/manifest.json` (configurado con Aka como default)

**Iniciar:**
```bash
cd packages/core/examples/react-inochi2d-app
npm run dev
```

---

## 6. Live2D Avatar

**Ejemplo:** `packages/core/examples/react-live2d-app`

**Estado:** No se incluyen modelos licenciados. Agrega tu modelo en:
- `models/` - Para modelos locales
- `public/scripts/` - Para scripts personalizados

**Iniciar:**
```bash
cd packages/core/examples/react-live2d-app
npm run dev
```

---

## Iniciar Todos los Ejemplos

```bash
bash run-avatar-examples.sh
```

O inicia uno específico:
```bash
bash run-avatar-examples.sh react-vrm-app
```

---

## Estructura de Directorios

```
/home/meisoft/projects/pitonisa/aituber-onair/
├── assets/
│   └── miko/              # Assets originales (backup)
│       ├── miko.vrm
│       ├── idle_loop.vrma
│       ├── miko.purupuru
│       ├── pngtuber/
│       └── pet/
│
├── packages/core/examples/
│   ├── react-vrm-app/
│   │   └── public/avatar/
│   │       ├── miko.vrm
│   │       └── idle_loop.vrma
│   ├── react-purupuru-app/
│   │   └── public/avatar/
│   │       └── miko.purupuru
│   ├── react-pngtuber-app/
│   │   └── public/avatar/
│   │       └── *.png (6 expresiones)
│   ├── react-pet-app/
│   │   └── public/pet/
│   │       ├── spritesheet.webp
│   │       └── pet.json
│   └── react-inochi2d-app/
│       └── public/inochi2d/
│           ├── manifest.json
│           └── models/
│               ├── Aka.original-rig.inx
│               └── Aka.original.motion.json
│
├── scripts/
│   ├── download-miko-assets.sh
│   ├── download-inochi2d-aka-model.mjs
│   └── download-live2d-models.sh
│
└── run-avatar-examples.sh   # Script para iniciar ejemplos
```

---

## Para Agregar tu Propio Avatar

1. **VRM:** Coloca tu archivo `.vrm` en `public/avatar/`
2. **PuruPuru:** Coloca tu archivo `.purupuru` en `public/avatar/`
3. **PNGTuber:** Agrega las 4-6 expresiones PNG en `public/avatar/`
4. **Inochi2D:** Agrega tu `.inx` y `.motion.json` en `public/inochi2d/models/` y actualiza `manifest.json`
5. **Live2D:** Coloca tu modelo en `models/`

---

## Notas

- Los assets originales están en `assets/miko/` como backup
- Los scripts de descarga están en `scripts/`
- Para pruebas, todos los avatares están configurados y listos para usar
