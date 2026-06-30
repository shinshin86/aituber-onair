# Manneri Draft Review Basic Example

Browser example that shows `ManneriDetector.reviewDraft()` as an agent
pre-send gate.

Run from the repository root:

```sh
npm -w @aituber-onair/manneri run example:draft-review
```

Run from this example directory:

```sh
npm run dev
```

Open the shown local URL, choose whether the mock agent generated a repetitive
or fresh draft, then run the pre-send review. The page shows:

- where the agent tool call happens before sending
- whether the draft is blocked or allowed
- the minimal tool result: `shouldRewrite`, reason, and optional suggestion
- what product features this enables for users

Build from the repository root:

```sh
npm -w @aituber-onair/manneri run example:draft-review:build
```

Build from this example directory:

```sh
npm run build
```
