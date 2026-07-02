# Avatar Guide

[日本語版はこちら](./avatar.ja.md)

AITuber OnAir is not only a chat and voice toolkit. It is also a starting
point for building richer AI character presentation with PNG, VRM, Live2D, and
animated pet avatars.

This guide explains which avatar style to start with and where to extend avatar
assets when you want more expressive AI characters.

## Avatar Styles

### PNGTuber

Use PNGTuber assets when you want the shortest path to a lightweight 2D avatar.
The PNGTuber example uses four image states:

- eyes open / mouth closed
- eyes open / mouth open
- eyes closed / mouth closed
- eyes closed / mouth open

Start from
[`packages/core/examples/react-pngtuber-app`](../packages/core/examples/react-pngtuber-app).

### VRM

Use VRM when you want a 3D avatar with camera control, idle motion, lip-sync,
and expression presets. The VRM example renders a local `.vrm` model and can
apply available expressions from reply emotion tags.

Start from
[`packages/core/examples/react-vrm-app`](../packages/core/examples/react-vrm-app).

### Live2D

Use Live2D when you already have a Cubism model folder and want a 2D character
with model-driven motion. The Live2D example loads a local `.model3.json` model
folder. Live2D assets are not bundled.

Start from
[`packages/core/examples/react-live2d-app`](../packages/core/examples/react-live2d-app).

### Pet

Use the pet example when you want a compact animated companion instead of a
human-style avatar. It uses a Codex Pet-compatible spritesheet and changes
animation from chat state, reply mood, and audio volume.

Start from
[`packages/core/examples/react-pet-app`](../packages/core/examples/react-pet-app).

## Extending Avatar Expressions

AITuber OnAir examples are designed so richer avatar assets can improve the
final presentation without changing the core chat or voice pipeline.

For VRM avatars, the bundled example can use expression names such as `happy`,
`sad`, `surprised`, `relaxed`, `mouthSmileLeft`, `mouthSmileRight`,
`browInnerUp`, and eye-related expressions when the loaded VRM provides them.
Unsupported expressions are ignored gracefully, so a basic VRM still works, but
an expression-rich VRM can react more naturally.

## Related Tool: VRM Expression Agent Harness

[VRM Expression Agent Harness](https://github.com/shinshin86/vrm-expression-agent-harness)
is a companion repository for extending VRM expressions model by model with
Codex or Claude Code.

Use it when you have a VRM file and want to inspect the model internals,
identify available morph targets, derive code-addressable expression presets,
verify the result in a local WebUI, and document exactly what changed.

It is useful for preparing VRM models with:

- emotion presets such as `happy`, `angry`, `sad`, `relaxed`, and `surprised`
- visemes such as `aa`, `ih`, `ou`, `ee`, and `oh`
- blink expressions
- ARKit-like expression parts such as `jawOpen`, `mouthSmileLeft`,
  `mouthFrownRight`, `eyeWideLeft`, and `browInnerUp`

The harness is intentionally not a universal batch converter. Expression
quality depends on the actual VRM model: mesh layout, morph target names,
existing expression clips, and license constraints. The workflow is designed to
inspect and verify each model before producing an extended VRM.

After preparing an extended VRM, place it in the VRM example's `public/avatar/`
directory and update the loaded file path if needed.

## License Notes

Generated or modified avatar assets inherit the source model's license terms.
Before sharing an extended VRM, Live2D model, PNG avatar, or spritesheet, check
the original asset license and attribution requirements.
