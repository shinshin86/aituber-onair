# Complete script field reference

<!-- Generated from schema/biim-script.schema.json. Run npm run docs:reference; do not edit by hand. -->

JSON script for the Node offline MP4 renderer: one or two fixed avatar sets, sequential narration/captions, timed video/image/color slots, persistent right-side panels, and optional timer/counter. Asset and output paths are relative to this script file; CLI --out is relative to the working directory. Unknown fields are rejected. Defaults below describe renderer behavior; validation does not insert them.

`*` means a speaker key; `[]` means an array element. Conditional requirements depend on the selected speech/content variant; see the description. Inherited or derived defaults are described rather than inserted as literal values.

Voice options are listed separately per engine. sine accepts only its listed keys; aituber-voice accepts additional Core option keys. Provider-specific Core settings are not validated by this schema.

| Path | Type / values | Required | Default | Description, constraints and examples |
| --- | --- | --- | --- | --- |
| `$schema` | string | no | — | Editor schema link; the CLI always uses the bundled schema regardless of this value. Relative to the script file. minLength: 1. Examples: `"../schema/biim-script.schema.json"`. |
| `canvas` | "16:9" / "4:3" | no | `"16:9"` | Output aspect ratio: 16:9 is 1920x1080; 4:3 is 1440x1080. Examples: `"16:9"`, `"4:3"`. |
| `fps` | integer | no | `30` | Output frames per second, an integer from 1 through 60. minimum: 1; maximum: 60. Examples: `30`. |
| `seed` | integer | no | `1` | Nonnegative integer seed for reproducible blinking and body motion. minimum: 0. Examples: `42`. |
| `output` | string | no | `"../work/out.mp4"` | Default MP4 destination relative to the script file. gen --out overrides it. minLength: 1. Examples: `"../work/explainer.mp4"`. |
| `speakers` | object | yes | — | One or two speaker entries in left-to-right insertion order. Keys match line speaker values: start with an ASCII letter, then letters, digits, underscores or hyphens. minProperties: 1; maxProperties: 2. |
| `speakers.*.name` | string | yes | — | Required human-readable speaker name, stored as metadata; no name label is drawn. minLength: 1. Examples: `"だんご"`. |
| `speakers.*.image` | string or object | yes | — | Four-state avatar directory or four-path object, relative to the script file. A string is always a directory, never a single image path. Examples: `"../assets/yukkuri/dango"`. |
| `speakers.*.image.mouth_close_eyes_open` | string | yes | — | Image for closed mouth and open eyes, relative to the script file. Reusing one image for all states creates a static avatar. minLength: 1. Examples: `"../assets/yukkuri/dango/mouth_close_eyes_open.png"`. |
| `speakers.*.image.mouth_open_eyes_open` | string | yes | — | Image for open mouth and open eyes, relative to the script file. Reusing one image for all states creates a static avatar. minLength: 1. Examples: `"../assets/yukkuri/dango/mouth_open_eyes_open.png"`. |
| `speakers.*.image.mouth_close_eyes_close` | string | yes | — | Image for closed mouth and closed eyes, relative to the script file. Reusing one image for all states creates a static avatar. minLength: 1. Examples: `"../assets/yukkuri/dango/mouth_close_eyes_close.png"`. |
| `speakers.*.image.mouth_open_eyes_close` | string | yes | — | Image for open mouth and closed eyes, relative to the script file. Reusing one image for all states creates a static avatar. minLength: 1. Examples: `"../assets/yukkuri/dango/mouth_open_eyes_close.png"`. |
| `speakers.*.mirror` | boolean | no | `false` | Flip this speaker horizontally; does not change bottom-row position. Examples: `true`. |
| `speakers.*.voice` | object | yes | — | Speech engine and its options for this speaker. Silent captions bypass speech synthesis. |
| `speakers.*.voice.engine` | "sine" / "aituber-voice" | yes | — | Speech backend: sine produces gated tones without a server; aituber-voice captures Core VoiceEngineAdapter audio. Examples: `"sine"`, `"aituber-voice"`. |
| `speakers.*.voice.options` | object | conditional | — | Engine-specific settings. Optional for sine; required with engineType for aituber-voice. Core options are passed through, not provider-validated by this schema. |
| `speakers.*.voice.options` (engine="sine") | object | no | — | Options when engine is sine; only the documented numeric tone settings are allowed. |
| `speakers.*.voice.options.secondsPerChar` (engine="sine") | number | no | `0.08` | Tone seconds per Unicode character after removing whitespace. Actual duration is at least minDuration. exclusiveMinimum: 0. Examples: `0.07`. |
| `speakers.*.voice.options.frequency` (engine="sine") | number | no | `440` | Positive sine-wave frequency in hertz, independent of speech duration. exclusiveMinimum: 0. Examples: `660`. |
| `speakers.*.voice.options.minDuration` (engine="sine") | number | no | `0.5` | Minimum tone duration in seconds; must be positive. exclusiveMinimum: 0. Examples: `0.5`. |
| `speakers.*.voice.options.amplitude` (engine="sine") | number | no | `0.22` | Peak tone amplitude before gating/fades, from 0 (silence) to 1. Mixed audio is peak-normalized if needed. minimum: 0; maximum: 1. Examples: `0.18`. |
| `speakers.*.voice.options` (engine="aituber-voice") | object | yes | — | Required options when engine is aituber-voice. Additional keys map directly to Core VoiceServiceOptions; onPlay is supplied by the renderer. |
| `speakers.*.voice.options.engineType` (engine="aituber-voice") | string | yes | — | Required Core voice engine identifier. Schema checks only a nonempty string; Core selects the engine at synthesis time, and invalid provider settings may fail then. minLength: 1. Examples: `"openaiCompatible"`. |
| `speakers.*.textColor` | string | no | `"#ffffff"` | This speaker's subtitle color as six-digit RGB hex; affects subtitle text only. Examples: `"#ffffff"`. |
| `speakers.*.mouthMode` | "flap" / "rms" | no | — | Speaker override. Mouth animation mode: flap alternates open/closed at flapInterval; rms opens above the normalized audio gate. Both close in silence. Omission inherits the top-level mouthMode (fallback flap). Examples: `"flap"`. |
| `speakers.*.flapInterval` | number | no | — | Speaker override. Seconds per mouth state in flap mode; between 1/30 and 1 second. Omission inherits the top-level flapInterval (fallback 0.12). minimum: 0.03333333333333333; maximum: 1. Examples: `0.12`. |
| `speakers.*.mouthThreshold` | number | no | — | Speaker override. Normalized RMS mouth gate, greater than 0 and at most 1. Renderer divides audio RMS by 0.12 and caps it at 1. Omission inherits the top-level mouthThreshold (fallback 0.08). exclusiveMinimum: 0; maximum: 1. Examples: `0.08`. |
| `speakers.*.motion` | "subtle" / "bounce" / "none" | no | — | Speaker override. Body motion: subtle is a small hop/breath, bounce is larger, none disables body movement but keeps mouth/blink animation. Omission inherits the top-level motion (fallback subtle). Examples: `"subtle"`. |
| `defaults` | object | no | — | Optional defaults for silence between lines and source-video audio gain. |
| `defaults.pauseAfter` | number | no | `0.3` | Default silence in seconds after each line, including the final line; a line pauseAfter overrides this value. minimum: 0. Examples: `0.3`. |
| `defaults.mainAudioVolume` | number | no | `0.25` | Linear gain (0 to 1) for a source video with audio=true. Not a separate background-music track. minimum: 0; maximum: 1. Examples: `0.15`. |
| `lines` | array<object> | yes | — | Nonempty narration/caption sequence. Spoken duration comes from audio; silent duration is explicit. Starts are sequential unless at is set. minItems: 1. |
| `lines[].id` | string | no | — | Optional unique anchor ID: ASCII letter first, then letters, digits, underscores or hyphens. pattern: "^[A-Za-z][A-Za-z0-9_-]*$". Examples: `"intro"`. |
| `lines[].speaker` | string | yes | — | Key of an existing speakers entry, not its human-readable name. minLength: 1. Examples: `"dango"`. |
| `lines[].text` | string | yes | — | Nonempty displayed subtitle. Automatically wrapped and paged to at most two rows per page. minLength: 1. Examples: `"操作手順を説明します。"`. |
| `lines[].reading` | string | no | — | Pronunciation text sent to synthesis instead of text. Omission uses text; subtitles still display text. minLength: 1. Examples: `"そうさてじゅんをせつめいします。"`. |
| `lines[].pauseAfter` | number | no | — | Silence in seconds after this line. Omission inherits defaults.pauseAfter, whose fallback is 0.3 seconds. An explicit next at only needs to follow the audio end. minimum: 0. Examples: `0.5`. |
| `lines[].at` | number or string | no | — | Line start in seconds or at a line anchor. Omission starts the first line at 0, otherwise after the previous audio/caption plus its pause. Explicit starts must not precede the previous audio/caption end. Examples: `12.5`, `"@intro"`, `"@intro+1.5"`, `"@intro-0.5"`, `"@intro:end"`, `"@intro:end+0.3"`. |
| `lines[].spoken` | boolean | no | `true` | Whether to synthesize this line. false requires positive duration and keeps the mouth closed; true forbids duration. Examples: `false`. |
| `lines[].duration` | number | conditional | — | Silent-caption duration in seconds. Required only for spoken=false; forbidden for spoken=true or omitted spoken. exclusiveMinimum: 0. Examples: `2`. |
| `lines[].emotion` | "neutral" / "happy" / "surprised" / "sad" / "angry" / "relaxed" | no | `"neutral"` | Body-motion energy hint: happy/surprised use 1.1, sad/relaxed 0.8, neutral/angry 1. Does not change the avatar set or TTS emotion. Examples: `"happy"`. |
| `main` | array<any> | no | — | Chronological nonoverlapping main-area slots. Each chooses exactly one video, image or color. Gaps are black. Omitted array leaves the main area black. |
| `main[].at` | number or string | yes | — | Main slot start in seconds or at a line anchor; slots must be chronological and nonoverlapping. Examples: `12.5`, `"@intro"`, `"@intro+1.5"`, `"@intro-0.5"`, `"@intro:end"`, `"@intro:end+0.3"`. |
| `main[].until` | number or string | no | — | Main slot end in seconds or at an anchor; must exceed its start. Omission uses the next main start or the timeline end. Video holds its last frame if playback ends earlier. Examples: `12.5`, `"@intro"`, `"@intro+1.5"`, `"@intro-0.5"`, `"@intro:end"`, `"@intro:end+0.3"`. |
| `main[].video` | string | conditional | — | Source video path relative to the script file. Must contain a finite-duration video stream readable by ffmpeg/ffprobe. minLength: 1. Examples: `"../work/demo.mp4"`. |
| `main[].image` | string | conditional | — | Main-area still image path relative to the script file, decoded by @napi-rs/canvas. minLength: 1. Examples: `"../work/demo-slide.png"`. |
| `main[].color` | string | conditional | — | Solid main-area background as six-digit RGB hex; mutually exclusive with video and image. Examples: `"#14283d"`. |
| `main[].from` | number | no | `0` | Video-only source range start in source seconds, before speed adjustment; must be inside the source. minimum: 0. Examples: `1`. |
| `main[].to` | number | no | — | Video-only source range end in source seconds; must exceed from and not exceed source duration (0.02s probe tolerance). Omission uses source duration. exclusiveMinimum: 0. Examples: `3`. |
| `main[].speed` | number | no | `1` | Video-only positive playback multiplier. 2 is twice as fast; 0.5 is half speed. Source audio follows this speed with pitch preserved. exclusiveMinimum: 0. Examples: `2`, `0.5`. |
| `main[].audio` | boolean | no | `false` | Video-only switch to mix the source audio under narration using defaults.mainAudioVolume; a source with no audio remains silent. Examples: `true`. |
| `main[].speedBadge` | boolean | no | `true` | Video-only switch showing a small multiplier badge when speed differs from 1. Examples: `false`. |
| `main[].fit` | "contain" / "cover" | no | `"contain"` | Video/image sizing: contain preserves the entire source with black bars; cover fills and crops. Has no effect on a color slot. Examples: `"contain"`, `"cover"`. |
| `panels` | array<any> | no | — | Right-column updates, chronological within each box. Each chooses exactly one text, items, image or clear. Content persists until replaced. |
| `panels[].at` | number or string | yes | — | Panel update time in seconds or at an anchor; updates must be chronological within the selected box. Examples: `12.5`, `"@intro"`, `"@intro+1.5"`, `"@intro-0.5"`, `"@intro:end"`, `"@intro:end+0.3"`. |
| `panels[].box` | "top" / "main" / "bottom" | yes | — | Right-side destination: top header, main information box, or bottom widget box. Updates persist independently per box. Examples: `"top"`, `"main"`, `"bottom"`. |
| `panels[].text` | string | conditional | — | Centered plain text in this right-side box; mutually exclusive with items, image and clear. minLength: 1. Examples: `"操作のポイント"`. |
| `panels[].items` | array<object> | conditional | — | One or more centered text items. Each item wraps as needed and can be white or yellow. minItems: 1. |
| `panels[].items[].text` | string | yes | — | Displayed text of this individual panel item; may wrap onto multiple centered rows. minLength: 1. Examples: `"要点を確認"`. |
| `panels[].items[].color` | "yellow" / "white" | no | `"white"` | Named color of this panel item: yellow (#ffff00) or white (#ffffff), not an arbitrary RGB hex. Examples: `"yellow"`. |
| `panels[].image` | string | conditional | — | Still image for this panel, relative to the script file. Always contained in the box without cropping. minLength: 1. Examples: `"../work/demo-slide.png"`. |
| `panels[].clear` | true | conditional | — | Set true to clear this box content from at until the next update; the white window border remains. Examples: `true`. |
| `timer` | object | no | — | Optional clock widget. Hidden before start, advances until stop, then remains visible and frozen. |
| `timer.start` | number or string | yes | — | Clock visibility and counting start in seconds or at an anchor. Before this time the clock is hidden. Examples: `12.5`, `"@intro"`, `"@intro+1.5"`, `"@intro-0.5"`, `"@intro:end"`, `"@intro:end+0.3"`. |
| `timer.stop` | number or string | no | — | Clock freeze time in seconds or at an anchor; must be at or after start. Omission freezes at the timeline end. Examples: `12.5`, `"@intro"`, `"@intro+1.5"`, `"@intro-0.5"`, `"@intro:end"`, `"@intro:end+0.3"`. |
| `timer.offset` | number | no | `0` | Nonnegative initial displayed clock value in seconds, added to elapsed time since start. minimum: 0. Examples: `60`. |
| `timer.format` | "H:MM:SS.cc" | no | `"H:MM:SS.cc"` | The only supported clock format: hours:minutes:seconds.centiseconds, e.g. 0:01:02.34. Examples: `"H:MM:SS.cc"`. |
| `timer.position` | "main-bottom-right" / "right-bottom" | no | `"main-bottom-right"` | Place the clock over the main area or in the right-bottom box. right-bottom cannot coexist with counter or bottom panels. Examples: `"main-bottom-right"`, `"right-bottom"`. |
| `counter` | object | no | — | Optional numeric widget in the bottom-right box. Cannot coexist with any bottom panel or a right-bottom timer, even at different times. |
| `counter.label` | string | yes | — | Text preceding the current numeric counter value in the right-bottom box. minLength: 1. Examples: `"確認数"`. |
| `counter.events` | array<object> | yes | — | Nonempty chronological counter updates. Hidden before the first event; each value persists until the next event or timeline end. minItems: 1. |
| `counter.events[].at` | number or string | yes | — | Counter value-change time in seconds or at an anchor; events must be chronological. Examples: `12.5`, `"@intro"`, `"@intro+1.5"`, `"@intro-0.5"`, `"@intro:end"`, `"@intro:end+0.3"`. |
| `counter.events[].value` | number | yes | — | Displayed counter number. Negative and fractional values are accepted; it is not restricted to an integer count. Examples: `3`. |
| `mouthMode` | "flap" / "rms" | no | `"flap"` | Global Mouth animation mode: flap alternates open/closed at flapInterval; rms opens above the normalized audio gate. Both close in silence. Examples: `"flap"`. |
| `flapInterval` | number | no | `0.12` | Global Seconds per mouth state in flap mode; between 1/30 and 1 second. minimum: 0.03333333333333333; maximum: 1. Examples: `0.12`. |
| `mouthThreshold` | number | no | `0.08` | Global Normalized RMS mouth gate, greater than 0 and at most 1. Renderer divides audio RMS by 0.12 and caps it at 1. exclusiveMinimum: 0; maximum: 1. Examples: `0.08`. |
| `motion` | "subtle" / "bounce" / "none" | no | `"subtle"` | Global Body motion: subtle is a small hop/breath, bounce is larger, none disables body movement but keeps mouth/blink animation. Examples: `"subtle"`. |

## Shared types

- `time`: Nonnegative absolute seconds or @line-id[:end][+/-seconds]. Exact existing IDs take precedence over interpreting an offset; unknown IDs and negative resolved times are errors. (number or string)
- `color`: Six-digit RGB hex string prefixed by #; alpha and named colors are not accepted here. (string)
