# Live Comment Filter Example

[日本語](./README.ja.md)

Browser example for trying `@aituber-onair/comment-intelligence` as a live
comment filter.

```sh
npm -w @aituber-onair/comment-intelligence run example:live-comment-filter-sample
```

If you are already in this example directory, you can also run the sample
directly:

```sh
npm run dev
```

The same direct setup supports `npm run build` and `npm run preview`.

Open the shown local URL, paste comments as `viewer: comment`, and run analysis.
The page shows rules-based comment filtering: selected comments, blocked unsafe
comments, ignored summaries, safety reports, ranking scores, and viewer safety
memory. Rules mode makes no API calls. Optional OpenAI and Jev modes call the
selected analysis provider. This sample does not connect to `@aituber-onair/core`
or generate spoken replies.

The result starts with **Processing flow**, which shows how many comments each
step handled: receive, rule-based safety check, meaning check (Jev or OpenAI;
skipped in rules mode), pick a comment, and what is handed to your app. Comments
excluded by the safety check are never sent to the AI; the incoming list and the
candidate comparison show the rule that excluded them.

Use the topic filter control with a stream topic to compare the three topic
selection modes:

- `off`: ignore topic relevance while ranking comments.
- `prefer`: boost comments related to the stream topic.
- `require`: only select topic-related comments when a topic is set.

Rule-based topic matching uses literal keyword matching. For flexible,
meaning-based topic matching, switch the analysis engine to OpenAI LLM assist
or Jev and provide the corresponding API key.

## Try Jev

1. Select the **Meaning and prior answers** comment pattern. It fills the topic,
   three comments, and a recent AI reply.
2. Choose **Jev** as the analysis engine, then choose **TypeSafe AI** or
   **OpenRouter** under **Jev connection**. Enter the API key for that service.
   Keys are held separately, so switching connections never reuses the other key.
   The defaults are `jev-latest` for TypeSafe AI and `~typesafe/jev-latest` for OpenRouter.
3. Click **Run comment filter**. **Which candidate was selected?** compares every
   candidate's selection status, ranking score, and the three Jev judgments with
   confidence. Retained rule signals and unevaluated fields are labeled separately.
   **Developer output** includes ranking reasons and raw metadata;
   `semanticAssessments` shows the accepted assessments.
4. Switch to **Rules only** and run again to compare. Switching engines preserves
   the topic, comments, and recent reply. Results are displayed one run at a time.

Jev assesses topic relevance, requests for answers, and whether the recent AI
reply already answered a question. The recent reply field is optional; without
it, the last assessment is skipped. You can edit the input to try your own cases.
The example evaluates at most 12 eligible comments per run. Jev times out after
2.5 seconds; failures display a notice and fall back to rules. Low-confidence
assessments keep the rule signals.

Keys stay in page memory and are not saved to browser storage. OpenRouter requests go directly from the browser to OpenRouter.
TypeSafe requests go through `/api/typesafe/systemone` on the local Vite server,
which forwards them only to `https://api.typesafe.ai/v1/systemone`.
Use a temporary key for local testing.
The included dev/preview proxy is not part of the static build: public deployments
need their own authenticated backend and server-managed application keys.
Jev sends eligible comment text, the topic, and the supplied recent reply to the
selected service. API failures do not switch to the other service.
No request runs merely from changing settings; click the filter button to run.
While running, the buttons show a spinner and an analyzing label, with the engine
and elapsed time alongside. Completion shows the engine and selected count;
failures explicitly identify the rules fallback. Missing-key notices appear next
to the buttons before any request is sent.

Automated integration tests use mocked responses. Authenticated Jev inference has not been verified in these checks.

As of 2026-09-20, a CORS preflight for a direct request from localhost to the
TypeSafe AI official API returned `400 Disallowed CORS origin`. This sample
therefore calls the API through its local development server (Vite).
This reflects the behavior observed on that date and may change as the API's
CORS support evolves. See the [official API reference](https://docs.typesafe.ai/api).
Restart an already running Vite server after adding the proxy configuration.

The UI can be switched between English and Japanese.

## Try reply style and moderator alerts

1. Select the **Reply style and alerts** comment pattern. It sets the topic to
   choosing streaming software, fills the recent AI reply with a deliberately
   wrong claim (free, including commercial use), and turns on
   **Also suggest reply style and moderator alerts**.
2. Choose **Jev**, pick a connection, enter its API key, and run the filter.
3. Each assessed candidate shows a response plan: reply style (one line, short
   and casual, or think it through), the suggested reasoning effort for your
   reply model, and the probabilities that the comment is rude, points out a
   mistake, or carries a safety risk. Badges mark **Needs attention**,
   **Points out an error**, and **Moderator alert**. The **Instruction** block
   shows the instruction and suggested effort for the selected comment.
   Developer output includes `responsePlans`.
4. Only two things reach a moderator. The sample only calls a stand-in webhook
   function that logs to the console; nothing is sent.
   - A comment that may lead to real-world harm (here, Viewer F, who says they
     watch the streamer walk home).
   - A run of error reports: when three or more assessed comments, and at least
     30% of them, say the stream got something wrong, it counts as a flare-up.

   A comment that is only rude (Viewer E) gets a **Needs attention** badge and
   no notification. Toasts disappear after a few seconds; the
   **Moderator notifications (demo)** panel keeps the same list.

The plan does not change ranking. Obviously hostile comments (Viewer D) are
excluded by the rules first and are not sent to Jev; Jev assesses only the
comments the rules kept. The extra questions go in the same request as the three
existing judgments.
