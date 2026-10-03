# OpenRouter model discovery in React samples

The Chat React basic sample and all ten Core React settings samples use the
public OpenRouter catalog for model discovery. This is sample UI behavior;
it does not extend the SDK's supported-model registry or change its public
APIs, provider defaults, request builders, or dependency versions.

## Discovery and selection

Selecting OpenRouter automatically makes an anonymous GET request to
`https://openrouter.ai/api/v1/models`. No API key, prompt, completion probe,
or TTS request is used for discovery. Search model IDs/names and filter by
published zero price, paid, or unknown pricing. The selected model's pricing,
context length, input modalities and advertised parameters are shown.
These are metadata, not a promise of availability, account access, quotas,
performance, total cost, or suitability for character conversation.

Only entries with text input and exclusively text output are offered. Audio,
music, embedding and other output modalities are excluded. Specialized text
models may remain in the catalog; catalog presence is not a recommendation.
The free router is retained when advertised even if it has no static endpoints.
Zero published price requires valid zero values for all advertised price fields,
including prompt and completion. Missing, empty, null or malformed prices are
unknown. The `:free` suffix is never removed to construct a paid fallback.

Successful snapshots replace previous catalog choices. A missing selected ID
stays visible and blocks sending until a listed model is deliberately selected.
A later pricing change also blocks sending until the displayed current pricing
is acknowledged. Search and price filters never change the selected ID.

## Cache and failure behavior

Each independently runnable sample carries the same sample-local module.
The versioned cache is scoped to the official catalog URL, has a five-minute
freshness period, deduplicates concurrent requests and times out after ten
seconds. Refresh retries explicitly. Failed refreshes retain last-good metadata
and show its timestamp and stale status. Without a valid snapshot, curated and
legacy cached IDs are shown as unverified fallback choices; their old timestamps
are not evidence of current availability. Existing settings, selected IDs and
API keys are preserved. Storage failures retain in-memory behavior.

Pricing acknowledgments are stored separately from API keys. Catalog changes
cannot silently redirect a selected model to a different model or a paid variant.
Guards check the latest available snapshot when each SDK operation is invoked;
they cannot revoke a request already handed to the SDK, including its internal
rate-limit wait. Published metadata is not a real-time billing guarantee.
Custom Base URLs, where already exposed by a sample, are not verified by the
official catalog: the request still follows the existing sample configuration.

## SDK capability boundary

Vision is available only where both the catalog and the existing SDK support
that model. Unknown dynamic vision IDs are not passed as explicit SDK vision
models. Reasoning controls require a known SDK model and the intersection of
catalog-advertised and SDK-supported effort values. Tools require both catalog
`tools` and `tool_choice` support as well as the sample's existing SDK path.
Absent or unverified metadata disables advanced controls conservatively.
Provider-wide capability flags are not per-model evidence.

New text IDs use the existing OpenRouter Chat Completions transport. SDK request
defaults still apply, including `reasoning: { exclude: true }` and a 5,000-token
maximum when no response-length override is supplied. Samples keep their own
existing response-length settings. Model-specific limits or routing may reject
requests; no generation compatibility guarantee is inferred from a catalog row.

The public `refreshOpenRouterFreeModels` utility remains unchanged for existing
SDK consumers. These React samples no longer call it because it performs actual
inference probes. Node samples and the character-support bot are outside this
UI change.

## Verification

Catalog, cache, timeout, pricing, StrictMode, DOM selection, settings wiring and
mocked request-path tests make no live inference or TTS requests. Production
builds cover each affected standalone example. The catalog modules are copied
into each example so generated starters do not depend on files outside their
own directory; keep the copies synchronized when updating this feature.

Official references:

- https://openrouter.ai/docs/guides/overview/models
- https://openrouter.ai/docs/guides/routing/routers/free-router
- https://openrouter.ai/docs/guides/routing/model-variants/overview
