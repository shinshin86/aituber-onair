# Agent Decision Sample

Small Node.js sample for trying the agent-facing APIs in
`@aituber-onair/comment-intelligence`.

```sh
npm -w @aituber-onair/comment-intelligence run example:agent-decision-sample
```

If you are already in this example directory, you can also run:

```sh
npm run start
```

The sample uses fixed in-memory comment text. It does not connect to YouTube,
Twitch, `@aituber-onair/core`, or any LLM provider.

It prints:

- The sample comments passed to `createCommentIntelligence().analyze()`.
- The default compact `toAgentCommentDecision(result)` output.
- The `detail: 'full'` ranked comment summaries.
- A short summary of `ANALYZE_LIVE_COMMENTS_TOOL`.

The prompt injection sample comment is intentionally treated as untrusted input.
The compact decision does not include the full ranked comment list by default.
