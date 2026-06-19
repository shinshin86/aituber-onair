# create-aituber-onair

![create-aituber-onair logo](./images/create-aituber-onair.png)

Create an AITuber OnAir app from an official starter template.

```bash
npm create aituber-onair@latest
```

The CLI will ask for a project name, template, and whether to install
dependencies.

You can also pass the project name up front:

```bash
npm create aituber-onair@latest my-aituber
cd my-aituber
npm run dev
```

## Templates

- `pngtuber`: 2D PNG avatar app with bundled avatar image assets
- `vrm`: 3D VRM avatar app with bundled `miko.vrm` and idle animation assets
- `live2d`: Live2D avatar app without bundled Live2D model assets
- `pet`: Animated pet app with bundled Miko pet assets

## Usage

Interactive setup:

```bash
npm create aituber-onair@latest
```

With a project name:

```bash
npm create aituber-onair@latest my-aituber
```

Advanced template selection:

```bash
npm create aituber-onair@latest my-aituber -- --template pngtuber
npm create aituber-onair@latest my-vrm-aituber -- --template vrm
npm create aituber-onair@latest my-live2d-aituber -- --template live2d
npm create aituber-onair@latest my-pet-aituber -- --template pet
```

Install dependencies during project creation:

```bash
npm create aituber-onair@latest my-aituber -- --template pngtuber --install
```

Skip the install prompt:

```bash
npm create aituber-onair@latest my-aituber -- --no-install
```

After launch, open Settings in the app and configure your LLM / TTS provider
API keys. The generated app stores sample credentials in browser
`localStorage`, so do not use production-scope keys on a shared or public
origin.

For the `live2d` template, Live2D model files and
`public/scripts/live2dcubismcore.min.js` are not bundled. Place them yourself
after project creation, following the generated app README.
