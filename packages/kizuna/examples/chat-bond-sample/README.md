# Kizuna one-to-one chat sample

This browser sample shows how a one-to-one chat can update a relationship with
`@aituber-onair/kizuna`. Enter a message and the character returns a scripted
reply with an emotion. The exchange records a `message` interaction and an
emotion-bearing `reaction` interaction.

The relationship panel displays points, warmth, stage, and a normalized
intimacy value. Its bar stretches from the previous value to the new value, and
the SVG history graph records each exchange. The sample uses no LLM, TTS, API
key, network service, or runtime dependency.

From the repository root:

```sh
npm -w @aituber-onair/kizuna run example:chat-bond-sample
```

Or from this directory:

```sh
npm run dev
```
