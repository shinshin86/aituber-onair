# Customer Support Bot Example

A realistic customer-support chat widget built with React, Vite, TypeScript,
and `@aituber-onair/chat`. The surrounding page is a small documentation-site
mockup so the widget behaves like an embedded product feature rather than a
standalone chat demo.

## What it demonstrates

- Creating OpenAI, Claude, and Gemini services through `ChatServiceFactory`
- Switching provider and model settings without changing the chat UI
- Rendering partial text as it arrives through streaming callbacks
- Passing the full conversation history and a curated system prompt each turn
- Importing a markdown knowledge file with Vite's `?raw` query
- Persisting demo settings in `localStorage`
- Handling missing credentials and provider errors inside the widget

The bot answers questions about AITuber OnAir packages, with an emphasis on
`@aituber-onair/chat`. Its knowledge is intentionally curated from the package
README; this example does not use RAG or fetch documentation at runtime.

## Run locally

Build `@aituber-onair/chat` from the repository root first:

```bash
npm ci
npm -w @aituber-onair/chat run build
```

Then install and run the example:

```bash
cd packages/chat/examples/customer-support-bot
npm install
npm run dev
```

Open the Vite URL, select the floating avatar, and use the gear button to add
provider settings.

## Settings

- **Provider**: OpenAI, Claude, or Gemini
- **Model**: populated from model constants exported by the package
- **API key**: the credential used by the selected provider
- **Persona**: additional behavior appended to the support system prompt

The default provider is OpenAI and the default model is GPT-5.6 Terra
(`gpt-5.6-terra`).

## Security note

This is a browser-only demo. Its API key is stored in the browser's
`localStorage` and requests are made from the client. That pattern is useful
for a local example, but it does not protect secrets from users or scripts
running on the page.

In production, keep provider credentials on a trusted server or serverless
function and proxy chat requests through that backend. Never commit an API key.

Direct browser requests also depend on each provider's CORS policy. Use a
backend proxy when a provider does not allow requests from your origin.

## Build

```bash
npm run build
```

The output is generated in `dist/` and should not be committed.
