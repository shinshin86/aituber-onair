# Quickstart

[日本語版はこちら](./quickstart.ja.md)

![Miko, the official AITuber OnAir character, working at a computer](./images/aituber-onair-quickstart-miko.png)

This guide gets you from zero to a local AI VTuber app in about 10 minutes.
Use it when you want the fastest working setup before reading package-level
documentation.

## 1. Create a New App

```bash
npm create aituber-onair@latest my-aituber
cd my-aituber
npm run dev
```

The CLI asks for a project name, starter template, and whether to install
dependencies during setup.

## 2. Choose a Template

Choose the template that matches the kind of avatar you want to build first.

- `pngtuber`: 2D PNG avatar app with bundled starter image assets.
- `vrm`: 3D VRM avatar app with bundled `miko.vrm` and idle animation assets.
- `live2d`: Live2D avatar app for users who already have their own Live2D
  model assets.

If this is your first time, start with `pngtuber`. It has the smallest asset
surface and is the quickest way to confirm that chat, voice, and lip sync are
working.

You can also select a template directly:

```bash
npm create aituber-onair@latest my-pngtuber -- --template pngtuber
npm create aituber-onair@latest my-vrm-aituber -- --template vrm
npm create aituber-onair@latest my-live2d-aituber -- --template live2d
```

## 3. Configure Providers

Open the generated app and use **Settings** to configure the services you want
to use.

At minimum, set:

- LLM provider and API key, such as OpenAI, Claude, Gemini, or OpenRouter.
- TTS provider and voice settings, such as VOICEVOX, AIVIS Speech, OpenAI TTS,
  or MiniMax.
- Character prompt and avatar settings.

The starter app stores sample credentials in browser `localStorage`. Do not use
production-scope keys on a shared or public origin.

## 4. Run Your AI VTuber

Open the local URL printed by the dev server, usually:

```txt
http://localhost:5173
```

Type a message in the app and confirm that the character responds. If voice is
enabled, confirm that speech playback and lip sync work with your selected
avatar template.

## Next Steps

- Customize the character prompt and speaking style.
- Replace the avatar assets with your own PNG, VRM, or Live2D model.
- Connect stream comments from YouTube, Twitch, or a WebSocket source.
- Try a different voice provider.
- Use `@aituber-onair/core` directly when you need deeper integration.

For more starting points, see [Examples](./examples.md).
