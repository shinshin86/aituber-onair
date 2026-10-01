# Mesh Avatar Chat

[日本語 README](./README.ja.md)

A chat example built on `@aituber-onair/core` whose avatar is a single illustration animated
Live2D-style with WebGL2 mesh deformation. LLM, TTS, live comments and the broadcast layout are
the same as in `react-single-image-avatar-app`; only the avatar is replaced.

## Features

- The illustration is split into layers (body, hand, tassels, eye parts) that are deformed as meshes
- Head turn / tilt, breathing, blinking, gaze, brows, per-strand hair sway, tassel pendulums
- 11 idle motions and 9 reaction motions played at random while waiting
- Lip sync from the TTS audio level; while speaking, idle motions pause and the head nods along
- Emotion tags (`[happy]` `[sad]` `[angry]` `[surprised]` `[relaxed]` `[neutral]`) switch the face and play a motion
- Settings → Avatar: sway strength, motion buttons, and a speech preview that needs no API key

## Setup

For `openai-compatible`, choose a local-server preset or enter an origin, a
`/v1` base URL, or a full `/chat/completions` URL. Fetch the model list, select
a model, and run **Test connection** before chatting. See the
[Local LLM setup guide](https://github.com/shinshin86/aituber-onair/blob/main/docs/local-llm.md).

```bash
# at the repository root, build the local packages first
npm install
npm run build

cd packages/core/examples/react-mesh-avatar-app
npm install
npm run dev
```

For `OpenAI-Compatible TTS`, enter an origin, a `/v1` base URL, or a full
`/audio/speech` URL. **Detect server** fills in the model and voice lists when
the server provides them, and **Test speech** plays a short sample. See the
[Local TTS setup guide](https://github.com/shinshin86/aituber-onair/blob/main/docs/local-tts.md).

## Avatar API

`src/meshAvatar/createMeshAvatar.js` is a framework-free engine:

```ts
const avatar = await createMeshAvatar(canvas, { assetsBase: '/avatar/qipao/' });
avatar.setSpeaking(true);
avatar.setVoiceLevel(0.6);     // 0..1 loudness
avatar.setEmotion('happy');
avatar.play('nod');
avatar.destroy();
```

In React use `src/meshAvatar/MeshAvatarCanvas.tsx`.

## Bundled image and asset terms

`public/avatar/qipao/` contains the layers cut from a single illustration of
Miko in a qipao (body, hand, tassels, eye parts, hair mask), drawn closed-eye
and mouth variants, and `layers.json`. The illustration was generated with
ChatGPT from a Miko image; the eye and mouth variants were painted to match it
with image generation.

The bundled Miko-derived avatar images are © Yuki Shindo (AITuber OnAir) and
are not covered by the repository's MIT License. They may be redistributed as
an integral part of a work or other content, but standalone redistribution and
asset collections are prohibited. See [Miko Asset Terms](./MIKO_ASSET_TERMS.md),
which links to the authoritative Japanese guidelines.

## Limitations

- The rig (hand outline, eye shapes, hair strands) is authored for the bundled image in
  `public/avatar/qipao/`; other images need new layers and rig tuning.
- The inside of the mouth and closed eyes are synthesised, so wide-open mouths can look off.
- Web Speech API TTS exposes no audio buffer, so it cannot drive lip sync (the preview still works).
- Emotion effect anchors are not yet tuned for the bundled image.

## Updated Chat and Voice options

This example uses published Chat 0.61.0 and Voice 0.25.0 through Core.
New Chat models are available in the model selector, including GPT-6.1 Sol,
GLM-5.3 FlashX, Mistral GLM-5.3, and the new OpenRouter options. Models use
Chat's capability checks and model-specific reasoning defaults. The avatar
examples keep their existing reasoning UI; OpenAI's casual preset selects
`low` for GPT-6.1 Sol. Mistral GLM-5.3 and OpenRouter Nemotron are text-only;
the new OpenRouter Qwen models support images. Mistral GLM-5.3 requires an
eligible subscription tier, and native Z.ai browser calls may fail on CORS.

Select **Deepgram Flux** for English-only, one-shot MP3 speech. Enter a
Deepgram API key and select a named voice from the public v2 catalog.
Haley is always available; refreshes preserve the selected voice and keep
the previous list on empty or failed responses. Optional Speed is 0.5–1.5
in 0.05 steps. Vite development and preview proxy `/api/deepgram/v2/speak`
and `/api/deepgram/v2/models` to Deepgram. Production needs equivalent
authenticated backend routes with API keys kept server-side.

ElevenLabs `eleven_v4` retains Stability and Similarity but disables Style,
Speed, and Speaker Boost. Cartesia offers `sonic-3.6` and
`sonic-3.6-2026-08-27` while keeping `sonic-3.5` as the default. Gradium's
model selector defaults to production; `gradium-tts-beta` is an explicit
opt-in, and switching back to Gradium resets the model to production.
See the [Core model update notes](../../README.md#chat-and-voice-model-updates)
for endpoint details and limitations.
