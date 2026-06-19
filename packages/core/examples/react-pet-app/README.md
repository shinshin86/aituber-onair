# Pet Chat

An AITuber chat sample that renders a Codex-style animated pet instead of a
static PNGTuber avatar.

The app keeps the same basic structure as the other React core samples:

- LLM chat through `@aituber-onair/core`
- TTS playback and real-time audio analysis
- Speech input through Web Speech API
- YouTube Live / Twitch comment ingestion
- Comment intelligence and manneri detection

## Pet animation

The pet is loaded from:

```text
public/pet/pet.json
public/pet/spritesheet.webp
```

The included sample uses an 8x9 Codex Pet spritesheet with 192x208 cells.
Rows are interpreted as:

| Row | State |
| --- | --- |
| 0 | idle |
| 1 | running-right |
| 2 | running-left |
| 3 | waving |
| 4 | jumping |
| 5 | failed |
| 6 | waiting |
| 7 | running |
| 8 | review |

During chat, the pet reacts to app state:

- Processing: review animation
- Speaking: waving / jumping based on audio volume
- Happy replies: runs around the stage
- Failed or apologetic replies: failed animation

## Setup

```bash
cd packages/core/examples/react-pet-app
npm install
npm run dev
```

Open Settings and configure LLM / TTS providers.
Settings are saved in `localStorage` under `react-pet-app-settings`.

## Replacing the pet

Replace `public/pet/pet.json` and `public/pet/spritesheet.webp` with another
Codex Pet-compatible package. The manifest should point to the spritesheet:

```json
{
  "id": "miko",
  "displayName": "Miko",
  "description": "A tiny animated pet.",
  "spritesheetPath": "spritesheet.webp"
}
```

Keep generated or local-only pet assets out of commits unless you have the
right to redistribute them.
