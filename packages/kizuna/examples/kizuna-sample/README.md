# Kizuna viewer relationship simulator

This browser sample shows what changes when an AI character records contact
with a viewer. Choose a viewer, contact kind, and emotion to update that
viewer's points, warmth, relationship stage, continuity, achievements, and
LLM-ready relationship context.

The bond score grows and can decrease after conflict. Warmth reacts quickly to
conflict or repair and cools toward a floor as simulated time passes. Try a
fight → chill → repair arc with the light negative contacts, or create a grave
scar and repair it through kind contact across several simulated days. The
top-right notification and per-viewer intimacy bar animate both increases and
decreases.

Absence never lowers the bond score or stage; it only cools warmth. Gifts are
also less effective while warmth is low, so trust cannot be bought back right
after a fight.

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
