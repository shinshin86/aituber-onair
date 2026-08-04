# Kizuna viewer relationship simulator

This browser sample shows what changes when an AI character records contact
with a viewer. Choose a viewer, contact kind, and emotion to update that
viewer's points, warmth, relationship stage, continuity, achievements, and
LLM-ready relationship context.

Points accumulate and do not decrease. Warmth represents recent contact and
decreases as simulated time passes. The normalized relationship value can be
passed to `@aituber-onair/noise`. Each contact also displays a top-right change
notification and animates the per-viewer intimacy bar, so the cause and effect
are visible immediately.

No LLM or API key is required. The simulated clock makes warmth decay and
continuity gaps visible without waiting in real time.

```sh
npm -w @aituber-onair/kizuna run example:kizuna-sample
```

You can also run it from the sample directory:

```sh
cd packages/kizuna/examples/kizuna-sample
npm run dev
```
