# AITuber OnAir Noise Sample

This sample lets you try `@aituber-onair/noise` in a browser.

You can enter an AI reply that feels too safe or too neatly wrapped up, then
see how Noise rewrites it into a response that works better in a live stream
while preserving the meaning and character. After rewriting, the sample shows
whether predictability went down and whether the character or context drifted.

```sh
npm -w @aituber-onair/noise run example:noise-sample
```

You can also run it from the sample directory:

```sh
cd packages/noise/examples/noise-sample
npm run dev
```

Configure the rewrite AI from the `AIを設定` button at the top of the page. For
external API providers, set the API key and model. For a local LLM, set the
Endpoint.

In `詳細設定`, the rewrite mode can widen the response range in this order:
`控えめ`, `キャラクター重視`, `大胆`, `逆張り`, and `強めに崩す`.

The memory used to avoid repeated phrasing can be stored in the browser or kept
only for the current page session. You can choose this in `詳細設定`.
