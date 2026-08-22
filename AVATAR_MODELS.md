# Modelos de Avatares VTuber Descargados

## Resumen de Descargas

Se han descargado los siguientes modelos de avatares para el proyecto AITuber OnAir:

### 1. Miko - Avatar Predeterminado ✓

**Ubicación:** `/home/meisoft/projects/pitonisa/aituber-onair/assets/miko/`

| Archivo | Tamaño | Formato | Descripción |
|---------|--------|---------|-------------|
| `miko.vrm` | 24.0 MB | VRM 1.0 | Modelo 3D completo de Miko |
| `idle_loop.vrma` | 153 KB | VRMA | Animación idle (bucle) |
| `miko.purupuru` | 3.6 MB | PuruPuru | Avatar PNGTuber con física |
| `pet/pet.json` | 181 B | JSON | Configuración del pet |
| `pet/spritesheet.webp` | 1.7 MB | WebP | Spritesheet del pet |
| `pngtuber/*.png` | - | PNG | Expresiones PNGTuber (4 estados) |

**Licencia:** Ver `MIKO_ASSET_TERMS.md` en el repositorio

---

### 2. Aka - Modelo Inochi2D ✓

**Ubicación:** `/home/meisoft/projects/pitonisa/aituber-onair/packages/core/examples/react-inochi2d-app/public/inochi2d/models/`

| Archivo | Formato | Descripción |
|---------|---------|-------------|
| `Aka.original-rig.inx` | INX | Modelo rigged para Inochi2D |
| `Aka.original.motion.json` | JSON | Motion profile con idle y reacciones |

**Licencia:** Creative Commons Attribution 4.0 International
**Autor:** seagetch
**Fuente:** https://github.com/Inochi2D/example-models

**Características:**
- Animación idle: `original_idle_calm_breath`, `original_idle_soft_sway`, `original_idle_sad_sway`
- Reacciones: tap, flick, flickDown, flickUp, small_nod, look_left, speaking, emphasis
- Emociones: neutral, happy, sad, relaxed, thinking, surprised, speaking, listening

---

### 3. Live2D - No Disponible ✗

**Nota:** Live2D no incluye modelos licenciados en el repositorio.

**Opciones para obtener modelos Live2D:**
1. **SDK Oficial:** Crear cuenta en https://www.live2d.com/en/ y descargar el SDK
2. **Model Hub:** https://modelhub.live2d.com/
3. **Ejemplos Gratuitos:** https://www.live2d.com/en/learn/sample/

---

## Scripts de Descarga

Los siguientes scripts fueron creados en `/home/meisoft/projects/pitonisa/aituber-onair/scripts/`:

1. **`download-miko-assets.sh`** - Descarga todos los assets de Miko
2. **`download-inochi2d-aka-model.mjs`** - Descarga el modelo Aka de Inochi2D
3. **`download-live2d-models.sh`** - Script para modelos Live2D (requiere licencia)

---

## Uso

### Descargar todos los assets:
```bash
cd /home/meisoft/projects/pitonisa/aituber-onair
bash scripts/download-miko-assets.sh
node scripts/download-inochi2d-aka-model.mjs
```

### Ejecutar con los modelos descargados:

**VRM:**
```bash
cd packages/core/examples/react-vrm-app
npm run dev
```

**PuruPuru:**
```bash
cd packages/core/examples/react-purupuru-app
npm run dev
```

**Inochi2D:**
```bash
cd packages/core/examples/react-inochi2d-app
npm run dev
```

---

## Estructura de Directorios

```
/home/meisoft/projects/pitonisa/aituber-onair/
├── assets/
│   ├── miko/
│   │   ├── miko.vrm              # 24.0 MB
│   │   ├── idle_loop.vrma        # 153 KB
│   │   ├── miko.purupuru         # 3.6 MB
│   │   ├── pet/
│   │   │   ├── pet.json
│   │   │   └── spritesheet.webp
│   │   └── pngtuber/
│   │       ├── mouth_open_eyes_open.png
│   │       ├── mouth_open_eyes_closed.png
│   │       ├── mouth_close_eyes_open.png
│   │       └── mouth_close_eyes_closed.png
│   └── live2d/
│       └── sample/              # (vacío - requiere licencia)
│
├── packages/core/examples/
│   └── react-inochi2d-app/
│       └── public/inochi2d/
│           ├── manifest.json    # Actualizado con modelo Aka
│           └── models/
│               ├── Aka.original-rig.inx
│               └── Aka.original.motion.json
│
└── scripts/
    ├── download-miko-assets.sh
    ├── download-inochi2d-aka-model.mjs
    └── download-live2d-models.sh
```

---

## Notas

- **Miko** es el avatar predeterminado del proyecto y está disponible en múltiples formatos (VRM, PuruPuru, PNGTuber, Pet)
- **Aka** es un modelo de muestra Inochi2D con licencia CC-BY-4.0, ideal para probar la integración de Inochi2D
- **Live2D** requiere licencia propia; los scripts están preparados para cuando el usuario tenga acceso a modelos Live2D
