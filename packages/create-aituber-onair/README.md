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

Choose from ten avatar templates. `pngtuber` is the default.

- `pngtuber`: 2D PNG avatar app with bundled avatar image assets
- `vrm`: 3D VRM avatar app with bundled `miko.vrm` and idle animation assets
- `live2d`: Live2D avatar app without bundled Live2D model assets
- `pet`: Animated pet app with bundled Miko pet assets
- `purupuru`: Physics-driven PuruPuru PNGTuber app with a bundled avatar
- `psd`: PSD Tachie app with a bundled Miko motion avatar
- `inochi2d`: Inochi2D app with an optional Aka sample-model download
- `media-avatar`: Image, GIF, and video avatar app with four bundled emotion GIFs
- `mesh-avatar`: WebGL2 mesh avatar app with a bundled Miko `.mavatar` file
- `single-image-avatar`: Single-image avatar app with illustration and puppet Miko images

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
npm create aituber-onair@latest my-purupuru -- --template purupuru
npm create aituber-onair@latest my-psd-aituber -- --template psd
npm create aituber-onair@latest my-inochi2d-aituber -- --template inochi2d
npm create aituber-onair@latest my-media-avatar -- --template media-avatar
npm create aituber-onair@latest my-mesh-avatar -- --template mesh-avatar
npm create aituber-onair@latest my-single-image-avatar -- --template single-image-avatar
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

The `inochi2d` template does not bundle the large Aka model files in this npm
package. Interactive setup asks whether to download them from a commit-pinned
URL and verifies their SHA-256 checksums. Use `--no-download-assets` to skip
the download, or run `npm run setup:sample-model` in the generated app later.
The runtime and required third-party notices remain bundled.

Bundled asset terms are documented in each generated app. `media-avatar`
includes four AI-generated GIFs and documents them in its README. The
`mesh-avatar` and `single-image-avatar` templates include `MIKO_ASSET_TERMS.md`
for their bundled Miko assets.

## Template maintenance

The checked-in Core React examples are the only source of template application
code. `npm run generate:templates` copies Git-tracked files only, converts local
workspace dependencies to published version ranges, renames `.gitignore` to
`_gitignore` for safe npm packaging, and applies the documented per-template
asset policy. Generated `templates/` files are ignored by Git but included by
`npm pack`.

Run these checks after changing a Core example or template policy:

```bash
npm run generate:templates
npm run verify:templates
npm test
npm pack --dry-run
```
