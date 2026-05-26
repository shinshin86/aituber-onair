# Live Comment Filter Example

Browser example for trying `@aituber-onair/comment-intelligence` as a live
comment filter.

```sh
npm -w @aituber-onair/comment-intelligence run example:live-comment-filter-sample
```

If you are already in this example directory, run the package script through the
parent package:

```sh
npm --prefix ../.. run example:live-comment-filter-sample
```

Open the shown local URL, paste comments as `viewer: comment`, and run analysis.
The page shows rules-based comment filtering: selected comments, blocked unsafe
comments, ignored summaries, safety reports, ranking scores, and viewer safety
memory. This sample does not connect to `@aituber-onair/core` or call an LLM.

The UI can be switched between English and Japanese.
