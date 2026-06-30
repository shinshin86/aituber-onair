# @aituber-onair/comment-intelligence

## Unreleased

### Patch Changes

- Adds `toAgentCommentDecision()` for compact agent-facing decisions that avoid
  returning the full ranked comment list by default.
- Adds SDK-independent agent tool definitions through
  `ANALYZE_LIVE_COMMENTS_TOOL` and `COMMENT_INTELLIGENCE_AGENT_TOOLS`.
- Exports `DEFAULT_COMMENT_INTELLIGENCE_CONFIG` for agent and UI introspection.
- Adds a small Node.js agent decision sample that demonstrates compact output,
  full detail output, and the tool definition summary.

## 0.0.4

### Patch Changes

- Adds `topicFilter` ranking options (`off`, `prefer`, and `require`) for
  prioritizing or requiring comments related to the current stream topic.
- Adds the `topic_unrelated` ranking reason for comments that do not match a
  configured stream topic.
- Passes stream topic and title context into LLM analysis prompts and supports
  `topicRelatedCommentIds` so LLM-assisted analysis can mark semantically
  related comments as topic-related.
- Strengthens the LLM topic-matching prompt to include synonyms, paraphrases,
  and related subtopics.
- Reflects LLM-provided `topicRelatedCommentIds` in selected comments for
  `prefer` and `require` topic filtering.
- Fixes LLM-mode selection to honor `maxSelectedComments`.
- Exposes unmatched LLM-returned comment IDs in debug metadata.
- Improves OpenAI sample diagnostics and uses short comment IDs that LLMs can
  echo reliably.
- Adds stream topic, stream title, and topic priority settings to the React
  examples and starter pet template.

## 0.0.3

### Patch Changes

- Fixes the published ESM package so it can be imported directly by Node.js by
  emitting Node-compatible relative module specifiers.
- Adds a package exports map and a built package smoke test that imports
  `dist/index.js` with plain Node.js.

## 0.0.2

### Patch Changes

- Adds `hostile_feedback` safety classification for non-constructive negative
  comments about the stream, speaker, voice, or content. Constructive feedback
  and issue reports remain usable comments.
- Adds `baiting` and `demoralizing` safety categories for comments that are
  likely to stir conflict or only discourage the streamer.
- Aligns LLM-assisted analysis prompts and the live comment filter sample with
  the expanded hostile feedback categories.

## 0.0.1

### Patch Changes

- Initial experimental release of the live comment intelligence package.
  - Adds rule-based safety checks for prompt injection, URLs, spam-like input,
    repetition, harassment, sexual content, violence, and personal information
    requests.
  - Adds comment ranking, ignored-comment summarization, and LLM context
    formatting for AI VTuber live streams.
  - Adds optional LLM-assisted analysis through an injected provider, with
    rules-mode fallback.
  - Adds YouTube, Twitch, and web comment normalizers.
  - Adds viewer safety memory so unsafe viewers can be temporarily skipped
    across batches.
  - Adds a live comment filter sample for trying the package in a browser.

### Experimental Notes

- This package is still experimental and its public API may be refined before a
  stable release.
- Some generated messages and built-in instructions are currently Japanese-first
  or hardcoded. More flexible localization and message override hooks are still
  under consideration.
- The rule-based moderation logic is intentionally lightweight. Production
  streams should combine it with platform moderation tools and human moderators.
