# Kizuna Mock Live-Stream Simulator

This browser sample presents a mock live stream as one application scenario
for `@aituber-onair/kizuna`. The Kizuna core remains platform-agnostic: the
sample translates stream-style comments into generic `Interaction` values.

Four fictional viewers post automatically with different rhythms and styles:

- Aki asks frequent, curious questions.
- Mio reacts energetically and occasionally sends a gift.
- Ren posts short, calm comments at a slower pace.
- Sora supports the stream as the character's partner and moderator.

Each comment becomes a `message`, `reaction`, or `gift` interaction. Canned AI
replies carry simulated emotion tags, so the demo requires no LLM, API key, or
network service. You can pause auto-play or choose a viewer and post a manual
comment.

The UI updates each viewer's points, stage, warmth, and bond-capital sparkline
in real time. Use the simulated clock controls to advance one hour, one day, or
one week and observe warmth decay. The selected viewer's `getBondContext()`
output and Kizuna event stream remain visible beside the mock broadcast.

## Run

From the repository root:

```sh
npm -w @aituber-onair/kizuna run example:kizuna-sample
```

Or from this directory:

```sh
npm run dev
```

For a one-to-one chat integration rather than the stream-style scenario, see
[`packages/core/examples/react-basic`](../../../core/examples/react-basic).
