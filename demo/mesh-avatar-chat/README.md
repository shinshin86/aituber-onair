# Mesh Avatar Chat (demo)

[日本語 README](./README.ja.md)

A browser-only demo of AITuber OnAir: Miko, the official character, is rendered
as a [mesh avatar](https://github.com/shinshin86/mesh-avatar-studio) and talks
back with voice, lip sync and expressions. Nothing runs on a server; the page is
published to GitHub Pages.

- Chat: Chrome's built-in Gemini Nano (no key), or OpenAI / Gemini / Claude with
  your own API key entered in **Settings**. Keys stay in the browser.
- Voice: the Web Speech API plays immediately. In the background the page
  prepares [piper-plus](https://github.com/ayutaz/piper-plus) with Miko's own
  voice model (about 160 MB including the OpenJTalk dictionary, synthesised in
  the browser) and offers it as a switch once it is ready. Phones and metered
  connections are not downloaded to automatically; a link starts the download
  instead.
- Avatar: `@aituber-onair/core` handles the conversation and emotion tags, and
  the `mesh-avatar` runtime animates the `.mavatar` file.

## Run locally

Build the workspace packages first, then install and start the demo.

```bash
# at the repository root
npm install
npm run build

cd demo/mesh-avatar-chat
npm install
PIPER_MODEL_DIR=/path/to/miko-piper-plus-model npm run fetch-piper-assets   # optional
npm run dev
```

`fetch-piper-assets` downloads the piper-plus runtime and dictionary from a
GitHub Release tarball and takes the Miko voice model (`sample-voice-v1.onnx`
and its `.onnx.json`) from `PIPER_MODEL_DIR`, or from `PIPER_MODEL_BASE_URL`
when the model is hosted online. Without it the demo still works with the Web
Speech voice and hides the Miko voice option.

## Deploy

`.github/workflows/pages.yml` builds this directory and publishes it to GitHub
Pages under `/mesh-avatar-chat/`. At build time the workflow downloads the
piper-plus runtime from a GitHub Release tarball (`PIPER_ASSETS_URL`, optional)
and the Miko voice model from the repository variable `PIPER_MODEL_BASE_URL`,
which must be set to a URL that serves the two model files.

## Credits and licenses

- Miko © Yuki Shindo (AITuber OnAir). The avatar is provided under the
  [Miko Character Usage Guidelines](https://miko.aituberonair.com/#terms); see
  [MIKO_ASSET_TERMS.md](./MIKO_ASSET_TERMS.md).
- Miko's voice is a synthetic voice: a piper-plus model fine-tuned from the
  piper-plus `zs-v1` base model (MIT) on audio generated with Irodori-TTS. See
  [licenses/miko-voice-NOTICE.md](./licenses/miko-voice-NOTICE.md) and the base
  model notice next to it. The runtime tarball brings the licenses of
  piper-plus, OpenJTalk, MeCab and ONNX Runtime Web; all of them are served
  under `public/piper/licenses/`.
