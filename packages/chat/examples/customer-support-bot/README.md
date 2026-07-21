# Customer Support Bot Example

A production-shaped customer-support example built with React, Vite,
TypeScript, a zero-dependency Node.js server, and `@aituber-onair/chat`.
The floating customer widget sends only conversation messages to the server.
Provider credentials, model selection, persona, and curated package knowledge
stay on the server.

## Architecture

```text
Customer widget (/)
  │  GET /api/support/status
  │  POST /api/support/chat (SSE)
  ▼
Node.js support server (:8787)
  ├─ @aituber-onair/chat → selected provider
  ├─ server/chat-package-knowledge.md
  └─ server/data/settings.json (gitignored)
        ▲
        │  /api/admin/*
Admin dashboard (/admin)
```

The browser never receives the stored API key. `GET /api/admin/settings`
returns only a masked value and a `hasApiKey` flag.

## What it demonstrates

- Streaming a server-proxied `@aituber-onair/chat` response to a customer
  widget with SSE
- Discovering providers, models, and default models dynamically on the server
- Keeping provider credentials and curated knowledge out of the customer bundle
- Serving a bilingual EN/JA admin dashboard at `/admin` without a router
- Persisting operator settings in a gitignored server-side JSON file
- Serving the built SPA and `/admin` fallback from a plain Node.js `http` server
- Keeping only the language preference in browser `localStorage`

## Run in development

Build `@aituber-onair/chat` from the repository root first:

```bash
npm ci
npm -w @aituber-onair/chat run build
```

Install the example dependencies:

```bash
cd packages/chat/examples/customer-support-bot
npm install
```

Use two terminals from the example directory.

Terminal 1 — start the API server on `127.0.0.1:8787`:

```bash
npm run server
```

Terminal 2 — start Vite. Development `/api` requests are proxied to the Node
server:

```bash
npm run dev
```

Open the Vite URL for the customer site. Open `/admin` on the same origin to
configure the server-side provider.

Set `SUPPORT_BOT_PORT` to override the API server's default port. Update the
Vite proxy target too when using a different development port.

## Run the built app

Build the frontend, then start the Node server:

```bash
npm run build
npm run server
```

Open `http://127.0.0.1:8787/`. The Node server serves `dist/` and falls back to
`index.html` for `/admin`.

## Admin dashboard

The `/admin` page loads its provider and model options from
`ChatServiceFactory` on the server. New package models therefore appear without
maintaining a second frontend list.

- **Provider**: all normal server providers; Agent SDK providers and the
  Chrome-only Gemini Nano provider are excluded. Sakana AI is available because
  the request is server-side and is not blocked by browser CORS.
- **Model**: validated against the provider registry. OpenAI-compatible servers
  accept a free-form model identifier.
- **API key**: stored only in `server/data/settings.json`. Leave the field blank
  to retain the current key.
- **Chat completions endpoint**: required for OpenAI-compatible servers.
- **Persona**: appended to the server-owned support system prompt.
- **Language**: the EN/JA choice is the only setting stored in browser
  `localStorage`.

## Security warning: protect the admin routes

> **The demo `/admin` page and `/api/admin/*` routes are intentionally
> unauthenticated. Do not expose them publicly. Add real authentication and
> authorization before using this architecture in production.**

The API key is kept out of customer-facing responses and the browser bundle,
and `server/data/` is ignored by Git. Those protections do not replace admin
authentication, HTTPS, access controls, secret management, rate limiting, or
request abuse protection in a real deployment.

Never commit `server/data/settings.json`.

## HTTP API

Customer-facing routes:

- `GET /api/support/status` returns only `{ configured }`.
- `POST /api/support/chat` accepts user/assistant message history and streams
  `delta`, `done`, or safe `error` SSE events. The server prepends its own
  system prompt and knowledge.

Demo admin routes:

- `GET /api/admin/providers`
- `GET /api/admin/settings`
- `PUT /api/admin/settings`

## Test with the mock OpenAI-compatible server

Start the repository mock in a third terminal:

```bash
node ../mock-openai-server/server.js
```

In `/admin`, select OpenAI-Compatible and use:

- Endpoint: `http://127.0.0.1:18080/v1/chat/completions`
- Model: `mock-chat-model`
- API key: `test-key`

After saving, the customer widget streams mock replies through the Node server.
