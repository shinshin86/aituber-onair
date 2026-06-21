# Model and Provider Update Guidelines for AI Agents

This document defines how AI agents should decide whether and how to add or
reorganize LLM and TTS models/providers in `@aituber-onair/chat` and
`@aituber-onair/voice`.

The implementation procedures are defined in the relevant skills:

- Chat model additions: `skills/add-chat-model/SKILL.md`
- TTS provider additions: `skills/add-tts-provider/SKILL.md`
- Chat upgrades propagated into core:
  `skills/sync-core-after-chat-upgrade/SKILL.md`

Read this document before editing code. Its purpose is to decide whether a
model/API belongs in this project, which support level it should receive, and
what verification depth is required.

This guide is normative for model/provider updates. If a skill procedure and
this document appear to conflict, follow this document for eligibility,
verification, and user-facing support classification before making code
changes.

## Project Context

AITuber OnAir is a TypeScript monorepo for AI VTubers and AI character
streaming. It is not a raw model-id catalog. The `chat`, `voice`, `core`, and
example packages combine live comment responses, character conversation, speech
synthesis, avatar rendering, screen understanding, and tool usage into one
usable product experience.

Agents must not treat model additions as simply appending an official id to an
array. The quality bar includes:

- The model/provider is usable from package APIs and example UIs.
- Claims about streaming, tool calling, vision, emotion, voice lists, and
  related capabilities are accurate.
- Browser, Node.js, Bun, and Deno usage are not broken accidentally.
- Public APIs, types, exports, README content, and tests remain consistent.
- Defaults and docs fit real-time AI VTuber use cases.
- Version bumps and changesets are not created unless the user explicitly asks
  for release work.

## User Intent

When a user asks which recent LLM/TTS models should be added, they are not
asking for a broad news digest. They need a selection of candidates that are
valuable for this project and usable by downstream users after the change.

Agents should reason in this order:

1. Can the model/API be confirmed in official documentation or an official API?
2. Can it be used through the current `chat` or `voice` provider path?
3. Should it be a default, an explicit option, or a candidate-only note for AI
   VTuber use cases?
4. Which docs, examples, tests, and core propagation points are affected?
5. If the user did not request a release, can the change avoid version bumps?

Models that officially exist but do not fit the current provider path, are not
generally available, or are weakly aligned with the project should stay as
candidate notes instead of being implemented.

The user-facing goal is not "make the id selectable." The goal is "make a model
that users can actually configure and use successfully through this package."
If that cannot be demonstrated through official endpoint documentation, a live
API check, or existing provider behavior that clearly covers the same endpoint
family, do not add it as supported.

## Source Verification

Model and API availability changes quickly. For requests involving recent,
latest, or current support, verify against official sources before deciding.
Do not implement from memory or from secondary sources alone.

Preferred sources:

- Official provider documentation
- Official model-list endpoints or OpenAPI schemas
- Official SDK or REST API references
- Endpoint-specific examples for the exact API family the package uses
- Existing provider implementations and tests in this repository

Avoid:

- Adding model ids based only on blogs, social posts, or unofficial lists
- Treating preview, beta, or limited-access models like stable models
- Assuming SDK-only APIs work through existing fetch-based providers
- Assuming a model listed on a provider's models page works with every text,
  chat, responses, completion, batch, or agent endpoint
- Claiming vision, tool calling, streaming, or emotion support without checking

Classify research and verification status explicitly:

- `docs-verified`: confirmed in official docs or API references
- `api-verified`: confirmed through a light live API call or model-list lookup
- `implemented-and-tested`: covered by package tests and relevant example builds
- `candidate-only`: officially documented, but not implemented

`docs-verified` is valid verification. If no live generation or chat-completion
call was run, report that separately instead of calling the finding unverified.

### Candidate Notes and Temporary Documents

Agents may create temporary candidate notes while researching recent models, but
these notes are not authoritative and must not be treated as approval to
implement.

When a candidate note exists:

- Read it before implementation planning.
- Re-check each candidate against current official provider docs.
- Confirm the package's exact endpoint family and request/response shape.
- Reclassify stale, speculative, or endpoint-mismatched candidates as
  `candidate-only`.
- Do not commit temporary notes unless the user explicitly asks for them.

Candidate notes should record enough information for a later agent to audit the
decision:

- Provider and model/provider id
- Intended package and provider path
- Official source URL and date checked
- Exact endpoint family expected to be used
- Capability claims: streaming, tools, vision, emotion, voice list, formats
- Availability status: public, beta, limited access, deprecated, unknown
- Proposed support level and reason
- Required follow-up before implementation

### API Family and Endpoint Compatibility

Before adding a model to a package's supported list, verify the exact API family
used by the current implementation. A provider may document a model for one
API, while the package uses another.

Examples of different API families that must not be treated as interchangeable:

- Chat Completions: `/v1/chat/completions`
- Responses-style text generation: `/v1/responses`
- Legacy completions: `/v1/completions`
- Realtime, voice-agent, batch, or deferred APIs
- Provider SDK abstractions that do not expose the same REST shape

Required checks:

- Identify the package endpoint constant or request builder that will send the
  model id.
- Find official documentation or an official example for that same endpoint
  family, not only the global model page.
- Confirm request fields, response shape, streaming format, tool-call format,
  image input format, and error behavior match the existing parser.
- If the provider's current docs recommend a different API family than the
  package implements, keep the model as candidate-only until the package gains
  that API path.
- If only a live API key can confirm compatibility, do not mark the model as
  supported unless the user asks for that live verification or provides enough
  information to run it.

### Supported-Model Hard Gates

A model or provider may be added to public supported lists only when every
applicable gate below is satisfied.

1. Official availability:
   The model/provider id is present in official docs, an official model-list
   endpoint, an OpenAPI schema, or an official SDK/API reference.
2. Endpoint-family compatibility:
   The official source confirms the same API family used by the package, or a
   live smoke test confirms it.
3. Request compatibility:
   Required request fields, headers, API versions, and option names can be sent
   by the existing or newly implemented provider without undocumented guessing.
4. Response compatibility:
   Streaming events, one-shot responses, tool calls, audio payloads, or
   voice-list responses match the parser/decoder that will consume them.
5. Capability accuracy:
   Vision, tools, reasoning, emotion, voice cloning, voice list, and output
   formats are enabled only when specifically supported for that model/API.
6. User configuration path:
   A user can select or configure the model/provider through the package API and
   relevant example UI without hidden setup beyond documented API keys,
   endpoints, or local services.
7. Test coverage:
   Unit tests or transport tests cover the request path, option wiring, and
   parser/decoder behavior that makes the support claim true.
8. Documentation:
   README/example docs explain setup, limitations, and support level without
   overstating the model.

If any gate fails, the candidate is not supported. Keep it as candidate-only,
export-only compatibility, or implement the missing API path first.

### Model Decision Record

Before editing supported lists, write a short decision record in the PR notes,
task notes, or final report. Do not hide the reasoning in code comments.

Use this structure:

```text
Provider:
Model/provider id:
Package:
Support level:
Default: yes/no
Official source:
Endpoint family used by package:
Endpoint compatibility evidence:
Capabilities enabled:
Capabilities intentionally not enabled:
Live API smoke test: run/not run, reason
Example/UI impact:
Version bump: yes/no, reason
```

If the endpoint compatibility evidence is weak, stop before implementation or
keep the model out of public supported lists.

## Support Levels

Do not give every model/API the same treatment. Assign one of these levels.

### Recommended / Default

Stable general-purpose models that can be used as example defaults or README
recommendations.

Requirements:

- Generally available in official provider docs
- Stable for streaming chat or speech generation
- Suitable for AI VTuber conversation or spoken responses
- Reasonable balance of cost, latency, and quality
- Fits the existing provider implementation without special-case fragility
- Can be covered naturally by tests and examples

### Supported / Explicit

Models users can select explicitly, but that should not be defaults.

Examples:

- Coding-oriented or agent-oriented LLMs
- High-quality but high-cost or high-latency TTS models
- Models that are stable but require users to understand the use case
- Models with limitations around vision, tool calling, or other capabilities

These models may appear in supported lists and selectors. Document the
limitations clearly and do not mark them as defaults.

`Supported / Explicit` still requires all supported-model hard gates. A
specialized model is allowed here only when it is actually usable through the
package's implemented API path.

### Exported Deprecated / Compatibility

Models kept as exported constants for compatibility, but removed from new-user
recommendations and selectors.

Use this level when:

- The provider marks the model as deprecated or legacy
- A clear replacement model exists
- Existing imports should continue to compile

Keep compatibility exports, but move the model out of recommended lists and
selection UIs. Mention it in deprecated or compatibility documentation when
useful.

### Candidate Only

Models or APIs that can remain in research notes but should not be implemented
in packages yet.

Use this level when:

- Official information exists, but the current provider path does not fit
- The model is documented for a different API family than the package currently
  implements
- General availability is blocked by region, account, invite, or access limits
- Required behavior such as streaming, audio output, or response format is
  unclear
- The model has weak relevance to AI VTuber use cases
- Supporting it would require adding a provider SDK dependency

Do not confuse candidate-only entries with supported models.

## Chat Package Quality Bar

`@aituber-onair/chat` is a unified chat layer across providers such as OpenAI,
Claude, Gemini, Mistral, and xAI. Model additions must preserve a consistent
public API while respecting provider differences.

### Check Before Adding

- Whether the provider already exists
- Whether the existing provider endpoint matches the new model endpoint
- Whether official docs show the model working with the exact endpoint family
  used by the provider implementation
- Whether the model requires special request fields, API versions, or headers
- Whether streaming response format matches the current parser
- Whether tool calling and MCP tool-schema conversion work
- Whether vision input is officially supported and handled by the message
  converter
- Whether provider-specific options such as response length, reasoning, or
  verbosity apply

### Implementation Principles

- Do not stop at adding a constant.
- Update `getSupportedModels()` and tests.
- Only add a model to `getSupportedModels()` after endpoint-family
  compatibility is documented or live-verified.
- Add or update a transport-level test that proves the model id is sent through
  the intended endpoint and that the response parser still matches the endpoint
  family.
- Treat vision support separately from normal model support.
- Do not add non-vision models to vision lists.
- Do not make coding-only, agent-only, or preview-leaning models defaults.
- Keep deprecated models as compatibility exports instead of selector options.
- Add routing tests when a model requires a different endpoint or API version.
- Keep public exports and README model lists consistent.

### Default Model Criteria

Defaults should be reliable for normal AI VTuber conversation.

Prefer:

- Natural conversation quality
- Stable streaming
- Strong Japanese and multilingual responses
- Adequate context handling
- Good interaction with tool calling and vision when relevant
- Balanced cost and latency

Avoid:

- Coding-only models
- Batch or long-running-job models
- Presenting non-vision models as screen-understanding choices
- Models strongly positioned by the provider as preview
- Expensive models as defaults without a clear reason

### Typical Chat Touchpoints

- `packages/chat/src/constants/<provider>.ts`
- `packages/chat/src/services/providers/<provider>/`
- `packages/chat/tests/providers/`
- `packages/chat/tests/ChatServiceFactory.test.ts`
- `packages/chat/examples/react-basic/src/components/ProviderSelector.tsx`
- `packages/chat/README.md`
- `packages/chat/README.ja.md`
- `@aituber-onair/core` and core examples when propagation is required

## Voice Package Quality Bar

`@aituber-onair/voice` is a unified TTS engine package. Provider additions must
return playable audio, support runtime option updates safely, and remain usable
from both browser and Node.js-style runtimes where possible.

### Check Before Adding

- Whether the upstream is direct REST, OpenAI-compatible, local-server based, or
  SDK-only
- Whether an API key is required or a local endpoint is enough
- Whether responses are binary audio or JSON/base64
- Whether formats such as `mp3`, `wav`, `pcm`, or `opus` are selectable
- Whether a voice-list API exists
- Whether emotion, style, speed, language, or speaker controls are official
- Whether browsers can call the API directly or need CORS/proxy handling
- Whether latency is suitable for real-time spoken responses

### Implementation Principles

- Preserve the existing top-level `VoiceServiceOptions` style.
- Do not introduce nested configuration shapes.
- Do not broaden the meaning of the existing `openai` provider too far.
- Add a dedicated engine for OpenAI-compatible providers that need
  provider-specific behavior.
- Never hardcode API keys.
- Cover response decoding in tests.
- Add an internal handler for runtime `updateOptions()`.
- Keep engine factory registration, exports, and public types aligned.
- When a voice-list API exists, prefer selectable voices over opaque voice-id
  text entry in examples.
- Do not add a TTS model/provider as first-class support when only a marketing
  page exists. Confirm the speech endpoint, request body, audio response shape,
  and browser/Node playback path.

### TTS Default Criteria

Default voices and models should work well for immediate AI VTuber speech.

Prefer:

- Fast short-form responses
- Stable audio quality
- Voice ids confirmed in official docs
- Clear Japanese or target-language quality
- API key and endpoint setup that is easy to explain in README

Avoid:

- Demo-only voices
- Voices with strict public-streaming or commercial-use limitations
- Output formats that are awkward for browser playback
- Presenting emotion controls when the provider does not support them

### Typical Voice Touchpoints

- `packages/voice/src/engines/<Engine>.ts`
- `packages/voice/src/constants/voiceEngine.ts`
- `packages/voice/src/types/voiceEngine.ts`
- `packages/voice/src/services/VoiceService.ts`
- `packages/voice/src/services/internal/engineHandlers/`
- `packages/voice/src/engines/VoiceEngineFactory.ts`
- `packages/voice/src/engines/index.ts`
- `packages/voice/src/index.ts`
- `packages/voice/tests/`
- `packages/voice/examples/react-basic/`
- `packages/voice/README.md`
- `packages/voice/README_ja.md`
- Core React examples when propagation is required

## Core and Example Propagation

Updating only `chat` or `voice` can be insufficient if users configure models
through example UIs.

Consider core/example propagation when:

- The user asks for end-to-end chat and voice support
- Example selectors or defaults become stale
- New `VoiceServiceOptions` fields cannot be passed by examples
- Voice-list fetching or custom API URL entry is needed
- README changes imply a user-facing starter/example workflow change

When TTS settings are involved, check these core React examples as needed:

- `packages/core/examples/react-basic`
- `packages/core/examples/react-pngtuber-app`
- `packages/core/examples/react-pet-app`
- `packages/core/examples/react-vrm-app`
- `packages/core/examples/react-live2d-app`

Do not bump versions unless the user asks for release work.

## Pre-Implementation Checklist

Ask these questions before editing:

- Is this more than officially present: does it work through the current package
  API path?
- Is there endpoint-family evidence for the exact implementation path, not just
  a global model listing?
- Will a normal user get expected behavior when selecting it in an example UI?
- Are capabilities such as vision, tools, emotion, or voice lists overstated?
- Can the default choice be justified for AI VTuber use cases?
- Are deprecated, preview, or limited-access models separated from normal
  supported models?
- Are existing exports preserved?
- Do README, tests, and example UI share the same assumptions?
- Did the user explicitly ask for a version bump?

If uncertainty remains, lower the support level instead of blocking all
progress. Some models are useful as `Supported / Explicit` even when they are
not suitable as `Recommended / Default`. Existence alone is not enough for
`Supported`.

## Review Requirements

Model/provider update PRs need a review stance that treats false support as a
bug. A reviewer should block or request changes when any of the following are
true:

- A model is added to a supported list based only on a global model page.
- The provider docs now recommend a different API family than the package uses,
  and no compatibility evidence is shown.
- A model appears in an example selector before it is proven usable through the
  package endpoint.
- Vision, tool calling, reasoning, emotion, voice cloning, voice list, or
  output format support is inferred rather than documented or tested.
- A coding-only, agent-only, preview, high-latency, or high-cost model becomes a
  default without a user-facing justification.
- Tests only assert arrays/constants and do not cover the request path or
  parser/decoder behavior needed for the support claim.
- README or example docs tell users to use something that cannot be configured
  from the package API.
- Temporary candidate notes are committed as if they were finalized docs.

Reviewers should look for repeatability. A different agent reading the same
documents should reach the same support level and know exactly which endpoint,
request shape, response shape, capabilities, and user-facing setup were
validated.

## Verification

After code changes, verify the affected scope.

Chat package:

```bash
npm -w @aituber-onair/chat run fmt
npm -w @aituber-onair/chat run build
npm -w @aituber-onair/chat run test
npm -w @aituber-onair/chat run lint
```

Voice package:

```bash
npm -w @aituber-onair/voice run fmt
npm -w @aituber-onair/voice run build
npm -w @aituber-onair/voice run test
npm -w @aituber-onair/voice run lint
```

When React examples change, build the changed examples:

```bash
npm --prefix packages/chat/examples/react-basic run build
npm --prefix packages/voice/examples/react-basic run build
npm --prefix packages/core/examples/<changed-example> run build
```

Repository-wide DoD before push or PR:

```bash
npm run fmt
npm run lint
npm run test
npm run build
```

Report anything that could not be verified.

## Final Report Checklist

At completion, report:

- Added or reorganized models/providers
- Support level
- Model decision record summary for each supported model/provider
- What became default and what did not
- Constraints around vision, tools, emotion, voice lists, or similar features
- Updated packages, docs, and examples
- Verification commands that were run
- Whether live API smoke tests were not run
- Whether version bumps were intentionally not made

Do not commit scratch notes or candidate-only working documents unless the user
explicitly asks for them.
