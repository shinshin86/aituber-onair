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

## Voice input

Press the microphone button on the left of the chat form to start voice input,
and press it again to stop. The `⌃` button next to it opens the listening mode
and service options. The choices are saved in the browser.

- Listening mode: **一回だけ** (once) sends one utterance and stops.
  **継続して会話** (continuous) listens again after the reply has been generated
  and spoken
- Service: **ブラウザ** (Web Speech API), **OpenAI**, or **Gemini**. The example
  uses `@aituber-onair/transcription` and sends each confirmed utterance as a
  chat message
- OpenAI and Gemini use the same API keys as the LLM settings, and the keys can
  also be entered from the menu. Keys are sent from the browser directly to each
  service, so avoid shared devices. Listening is billed by each service
- OpenAI and Gemini do not accept audio until the connection is ready. Right
  after pressing the microphone the form shows a connecting status, and the
  button changes once you can speak

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

This example uses published Chat 0.63.0 and Voice 0.26.0 through Core.
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
Chat 0.63.0 adds Claude Haiku 5.5 at the end of the Claude model list; the
model selected when switching to Claude is unchanged. Claude requests now use
`low` effort for faster replies.

Chat 0.62.0 adds the OpenRouter options Ling 3.1 Flash, Solar Pro 4, Solar
Mini4, MiMo V2.6 Flash, Apodex 1.1 Mini Free, and Pareto 26.10 Preview. MiMo
and Pareto accept images; the others are text-only. Core now lists Ling 3.1
Flash first, so switching the provider to OpenRouter selects it.

Select **OpenRouter** as the TTS engine for the public-preview
`microsoft/mai-voice-2.1` and `microsoft/mai-voice-2.1-flash` models. No model
is preselected. After you choose one, its voices load and an English voice is
selected; you can pick another. A voice from the previous model is never reused.
The TTS API key field shares the OpenRouter key from the LLM settings, so a key
entered there appears here as well. Both models are previews without an SLA and are not recommended for
production; catalogs checked on October 1, 2026 had no Japanese voices. The
sample calls OpenRouter directly from the browser, so the API key is visible to
the page; deploy shared apps behind your own backend.

See the [Core model update notes](../../README.md#chat-and-voice-model-updates)
for endpoint details and limitations.

## OpenRouter model catalog

The sample reads `GET https://openrouter.ai/api/v1/models` without an API key or
generation probes. Search covers model IDs and names; filters distinguish zero
published price, paid, and unknown pricing. These labels do not guarantee
availability, account access, quotas, routing, or actual charges.

A fresh catalog replaces curated choices. Failed refreshes retain last-good
metadata with a warning; without metadata, curated and legacy IDs are clearly
unverified fallback choices. Refresh never changes the selected model or API
keys. Saved legacy probe results are treated only as IDs. Removed selections
block new generation invocations, and changed pricing requires explicit
acknowledgement. An invocation already inside an SDK retry or rate-limit wait
cannot be cancelled by a later catalog refresh.
Vision and advanced options require both catalog metadata and SDK support.
Unknown dynamic models keep advanced features off. SDK request defaults,
including the 5000-token limit and `reasoning.exclude=true`, still apply and can
exceed a model's limits; this sample does not modify the public SDK registry.
