---
name: research-chat-models
description: Research recently released or newly API-available models for existing @aituber-onair/chat providers. Use when asked to find new models or audit provider catalogs; use add-chat-model separately to implement selected models.
---

# Research Chat Models

## Purpose

Find recent models that are publicly usable through providers already
implemented by `@aituber-onair/chat`, and distinguish confirmed additions from
restricted, incompatible, or not-yet-available candidates. This skill is for
discovery and recommendation; it does not change code.

## Workflow

1. Read `docs/agent-model-provider-guidelines.md` and identify the existing
   providers in scope. If the user says "all existing providers," inspect every
   provider in `packages/chat`; otherwise stay within the providers they name.
2. Browse the internet for recent provider announcements. Start with the last
   90 days unless the user gives another period. Search each in-scope provider's
   official API release notes/changelog and API documentation for new model
   releases, API availability, exact model IDs, deprecations, and endpoint
   details. Do not rely on a general model catalog alone; recent releases may
   appear first in release notes, help-center articles, or official cloud/API
   partner documentation.
3. Treat search snippets, marketing pages, and third-party reports as leads.
   Confirm each candidate using official sources. When official sources
   conflict or a catalog appears stale, seek a second official source such as an
   API changelog, help center, API reference, or cloud/API partner document.
   Record release/availability dates and link sources directly.
4. For each candidate, check:
   - Exact public API model ID and whether users can access it generally or only
     through invite, waitlist, private preview, or a specific platform/account.
   - API family, endpoint, request/response shape, streaming behavior, tool
     calling, vision, and other capabilities relevant to the package's current
     implementation.
   - Whether `packages/chat` already has the model in constants, supported
     lists, provider routing, tests, docs, or selectors. Search the source, not
     just package release notes.
5. Classify each candidate using the support levels in
   `docs/agent-model-provider-guidelines.md`: recommended/default,
   supported/explicit, exported deprecated compatibility, or candidate-only.
   Do not call a model "newly available" unless official evidence supports API
   availability. Do not classify restricted models as generally available.
6. Return a concise table with provider, model ID, release/availability date,
   official sources, endpoint family, current repository status, decision, and
   any access limitation. Include recent candidates that were excluded and the
   reason. If no additions are warranted, say which official sources and
   provider families were checked; do not infer completeness from the local
   repository alone.
7. If the user also requested implementation, use `$add-chat-model` for each
   selected candidate after research. Carry the official source links and
   endpoint/capability findings into that implementation workflow. Keep
   unsupported or uncertain candidates out of supported lists and sample
   selectors.

## Boundaries

- Do not edit provider code, docs, examples, package metadata, or release files
  during the research-only phase.
- Do not broaden beyond existing providers unless the user asks to consider new
  providers.
- Do not treat a model's presence on a provider website or a third-party
  aggregator as proof that it works with this package's API path.
- Cite official sources in the report whenever web research was used.
