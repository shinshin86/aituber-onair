# Kizuna one-to-one chat sample

This browser sample shows how a one-to-one chat can update a relationship with
`@aituber-onair/kizuna`. Enter a message and the character returns a scripted
reply with an emotion. The exchange records a `message` interaction and an
emotion-bearing `reaction` interaction.

The relationship panel displays points, warmth, stage, and a normalized
intimacy value. Its bar stretches from the previous value to the new value, and
the SVG history graph records each exchange. The sample uses no LLM, TTS, API
key, network service, or runtime dependency.

This demo uses a small scored dictionary as a stand-in for sentiment. It
normalizes spelling variants and maps matched language to a scripted reaction
emotion. A real app should normally use the emotion on the LLM's reaction as
the valence signal, as the `react-pngtuber-app` integration does. Moderation
APIs or application rules can still override `valence` and `severity` before
calling Kizuna.

Try `I'm happy to see you` → `shut up` → several kind messages. Negative input
produces an `angry` scripted reply, so the message and reaction visibly lower
the bar and graph before calm exchanges repair warmth and score. Grave terms
also set `severity: 'grave'`. Absence is not punished, and the reply sets a
boundary without guilt-tripping the user.

From the repository root:

```sh
npm -w @aituber-onair/kizuna run example:chat-bond-sample
```

Or from this directory:

```sh
npm run dev
```
