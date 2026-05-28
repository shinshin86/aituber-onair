# @aituber-onair/comment-intelligence

## Unreleased

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
