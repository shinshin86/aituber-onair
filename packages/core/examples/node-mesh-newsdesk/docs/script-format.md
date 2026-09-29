# `script.json` format

A script is the JSON object consumed by `npm run gen`. Paths in the document
are resolved relative to the script file.

```json
{
  "voice": {
    "engine": "say",
    "options": { "voice": "Kyoko", "rate": 210 }
  },
  "leadIn": 1.1,
  "leadOut": 1.6,
  "defaultPauseAfter": 0.45,
  "show": {
    "title": "AI NEWS DESK",
    "subtitle": "AITuber OnAir ニュース",
    "clock": "21:00"
  },
  "seed": 7,
  "lines": [
    {
      "text": "こんばんは！AIニュースデスクの時間です。",
      "chapter": "今夜のヘッドライン",
      "emotion": "happy"
    },
    {
      "text": "なんと、たった1枚の絵から作られています。",
      "point": "素材はイラスト1枚だけ",
      "keywords": ["1枚の絵"],
      "emotion": "surprised"
    }
  ]
}
```

## Top-level fields

- `avatar` (optional): mesh avatar folder (`layers.json`, layer PNGs and
  `sprites/`). Defaults to `../react-mesh-avatar-app/public/avatar/qipao/`.
- `output` (optional): MP4 path. The CLI `--output` takes precedence.
- `voice.engine`: `sine`, `say`, or `aituber-voice`.
- `voice.options`: options passed to that engine. The `aituber-voice` engine
  accepts Core `VoiceServiceOptions`.
- `leadIn`, `leadOut`: silence in seconds. The opening title card and the
  greeting play during the lead-in; the closing card during the lead-out.
- `defaultPauseAfter`: default silence after each line. Pauses of 0.3 s or more
  may get a small idle motion (looking at the notes, a glance, a nod).
- `show.title`, `show.subtitle`: program name and label in the header and on
  the title cards.
- `show.clock` (optional): start time of the header clock (`HH:MM`).
- `seed`: seed for every random choice (motions, blinks, background particles).
  The same script and audio render the same video.
- `lines`: ordered narration and subtitle entries.

## Line fields

- `text`: subtitle and narration unless `reading` is set.
- `reading` (optional): pronunciation-only narration text.
- `chapter` (optional): topic headline in the news panel from this line on. A
  new chapter after the first triggers the "NEXT TOPIC" cut-in and a calm
  motion (a breath, a tilt, a look at the notes).
- `point` (optional): short bullet added to the news panel when the line
  starts; highlighted while the line is read. The two newest points of the
  topic are shown.
- `keywords` (optional, up to 3): words popped up beside the avatar. When
  omitted, numbers with units (`6種類`, `3.2倍`, `v1.2.3`) and 「quoted」 terms
  are picked automatically.
- `emotion` (optional): `neutral` (default), `happy`, `surprised`, `sad`,
  `angry`, or `relaxed`. Sets the face, may play a matching motion at the start
  of the line, and picks the screen effect.
- `spoken` (optional): set to `false` for a silent subtitle.
- `duration`: required in seconds when `spoken` is `false`.
- `pauseAfter` (optional): silence after this line.

Scripts produced by `script-gen` contain 3 to 12 lines, with each `text` at
most 35 characters, `point` at most 22 and `chapter` at most 14.
