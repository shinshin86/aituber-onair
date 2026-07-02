# Manneri Draft Review Basic Example

Browser example for checking a drafted reply with
`ManneriDetector.reviewDraft()` before it is sent.

The example is intentionally small: manneri only returns the review result for
the draft. The app or agent can then decide whether to send the draft, pass the
returned suggestion to an LLM for rewriting, or stop sending.

Run from the repository root:

```sh
npm -w @aituber-onair/manneri run example:draft-review
```

Run from this example directory:

```sh
npm run dev
```

The page includes repetitive and natural samples, Japanese and English UI, and a
small `review_draft_repetition` tool label to show that the same check can be
called from an agent tool. The similarity threshold is `0.70`, and `suggestion`
is shown only when `shouldRewrite` is true. `suggestion` is a rewrite
instruction for the LLM, not a finished rewritten reply.

Build from the repository root:

```sh
npm -w @aituber-onair/manneri run example:draft-review:build
```

Build from this example directory:

```sh
npm run build
```
