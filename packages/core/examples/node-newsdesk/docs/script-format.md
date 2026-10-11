# Script format

A script describes the program and its lines, independently of the avatar.
Select the avatar with `--avatar`; supply model paths and avatar settings in
`--avatar-config`. Legacy fields `avatar`, `background`, `telop`,
`avatarLayout`, `motion`, and `blinkSeed` are rejected.

| Field | Meaning |
| --- | --- |
| `output` | Optional MP4 path relative to the script. CLI `--output` takes precedence. |
| `voice` | Optional `{ "engine": "sine\|say\|aituber-voice", "options": {} }`; defaults to `sine`. |
| `leadIn`, `leadOut` | Optional non-negative seconds of silence before/after narration. |
| `defaultPauseAfter` | Optional non-negative pause between lines, defaults to 0.35 seconds. |
| `show` | Optional program `title` (24 characters), `subtitle` (32 characters), `clock` (`HH:MM`). |
| `seed` | Optional finite numeric seed for blinks, motion choices, and effects; defaults to 42. |
| `lines` | 3–12 line objects. |

Each line requires `text` (1–35 Unicode characters). Optional fields are:

| Field | Meaning |
| --- | --- |
| `reading` | Narration override for pronunciation. |
| `chapter` | Topic headline, up to 30 characters. Starts a new panel chapter. |
| `point` | Bullet added to the panel, up to 22 characters. |
| `keywords` | Up to three pop-ups, each up to 12 characters. Omitted: detect numbers/quoted terms. Empty: disable pop-ups. |
| `emotion` | `neutral`, `happy`, `surprised`, `sad`, `angry`, or `relaxed`. Defaults to `neutral`. |
| `spoken` | Defaults to `true`. Set to `false` for a silent line. |
| `duration` | Non-negative duration required for a silent line. |
| `pauseAfter` | Non-negative silence after the line; overrides `defaultPauseAfter`. |

Unknown fields, unsupported emotions/engines, and non-finite or negative timing
values fail validation before audio synthesis. See
[`samples/hello-sine.json`](../samples/hello-sine.json) for a complete example.
