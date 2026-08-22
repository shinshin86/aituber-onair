# Porting Existing Agent Configuration to New Bot Roles

Concise report on how to port an existing AITuber/Pitonisa agent configuration
(character, tools, model/provider) to new bot instances/roles using the
`@aituber-onair/agent` runtime. Backed by a working, tested example in
`packages/agent/examples/port-agent-config/`.

## 1. Where bots/agents are configured today

The repo has **two** agent systems. To port config you map from the old one to
the new one.

### System A — `@aituber-onair/chat` standalone loop (the `character-agent` example)

`packages/chat/examples/character-agent/src/agent.ts`:

```ts
export function createSecretaryAgent({ chat, tools }): SecretaryAgent {
  return {
    async respond(userInput) {
      const messages = [
        { role: 'system', content: SECRETARY_CHARACTER_PROMPT },
        ...history,
        { role: 'user', content: userInput },
      ];
      const completion = await chat.chatOnce(messages, true, onDelta);
      // hand-rolled loop: detect tool_use -> execute -> push result -> repeat
      return completion.blocks[0].text;
    },
  };
}
```

Config surface:
- **Character/identity** → `SECRETARY_CHARACTER_PROMPT` string (system message).
- **Tools** → `SecretaryTool` shape `{ name, description, parameters, execute(input) }`.
- **Model/provider** → `ChatServiceFactory.createChatService(provider, { apiKey, model, tools })`
  with the key read from env by `core`'s `getApiKeyForProvider`
  (`packages/create-aituber-onair/templates/*/src/hooks/useAituberCore.ts`).
- **Storage** → host-JSON-file storage (`JsonStorage`, `data/*.json`).
- **Policy** → none (every registered tool is usable); visibility is all-or-nothing.

### System B — `@aituber-onair/agent` runtime (the new way)

`packages/agent/src/core/AgentRuntime.ts` + `createAgent`:

```ts
const agent = createAgent({
  id: 'secretary-miko',
  brief: SECRETARY_CHARACTER_PROMPT,        // identity + assignment
  backend: createChatServiceBackend({        // wraps a ChatService as an AgentBackend
    provider: 'openai',
    createChatService: ({ tools }) =>
      ChatServiceFactory.createChatService('openai', { apiKey, model, tools }),
  }),
  tools,                                      // AgentToolSpec[]
  policy: { defaultDecision: 'deny', allowTools: [...] },
  limits: { approvalTimeoutMs, maxToolCallsPerTurn },
});
const session = await agent.startSession({
  purpose, audience: 'public' | 'owner', inputTrust: 'trusted' | 'untrusted',
  allowedTools, allowedCapabilities, limits,
});
for await (const event of session.runStream({ instruction, input, context })) { ... }
// approvals: await session.resolveApproval(requestId, 'allow-once' | 'deny')
```

## 2. Port mapping (the recipe)

| Existing (`character-agent`) | `@aituber-onair/agent` equivalent | Notes |
| --- | --- | --- |
| `createSecretaryAgent({ chat, tools })` | `createAgent({ id, brief, backend, tools, policy, limits })` | One `Agent` **per bot role**; no separate loop code. |
| `SECRETARY_CHARACTER_PROMPT` | `brief` | Becomes the single system message (`Character brief: ...`). |
| `ChatServiceFactory.createChatService({ apiKey, model, tools })` | wrap in `createChatServiceBackend({ provider, createChatService })` | Same factory, one wrapper. Provider/model/key resolution is **identical**. |
| `provider` / `model` env resolution | unchanged | `createProvider.ts` in the example mirrors `useAituberCore`'s env map. |
| tool `.name` (`memo.save`, sent to model) | `definition.name` = `memo_save` (provider-safe) **+** `id: 'memo.save'` (logical) | The backend maps `memo_save` → `memo.save` for host dispatch. Policy/`allowedTools` use the dotted `id`, never the model name. |
| tool `.description` / `.parameters` | `definition.description` / `definition.parameters` | Structurally unchanged. |
| tool `.execute(input)` | `execute(input, context)` | `input` is schema-validated; `context` adds `agentId/sessionId/turnId/signal` + risk/audit hooks. |
| no risk classification | `risk: 'read' \| 'draft' \| 'write' \| 'external' \| 'destructive'` | Drives `policy.requireApproval` and approval flow. |
| no policy | `policy: { defaultDecision:'deny', allowTools:[...], requireApproval:{...} }` | Defense in depth: policy + per-Session `allowedTools`. |
| single loop, single identity | one `Agent` per role **+** separate public/private `Session`s | `startSession({ audience, inputTrust, allowedTools })`. Public = untrusted input + narrow tools; owner = trusted input + wider tools. |
| hand-rolled tool round-trip | `session.runStream` yields typed `AgentEvent`s | `tool.requested/started/completed`, `approval.requested/resolved`, `artifact.created`, `turn.completed`, etc. |
| no resume | `agent.resumeSession({ backendSessionId })` | For Codex app-server backend (cold resume of a thread). |
| no timeouts/approvals | `limits.approvalTimeoutMs`, `limits.maxToolCallsPerTurn`, `AbortSignal` | Turn + approval timeouts and interruption. |

## 3. How a "new bot instance / role" is created

All bots live in the same host/profile. A role is **identity + assignment +
permissions + session shape** — everything else (tools, backend) is shared:

```ts
// botRoles.ts — add a role, no tool code changes
export const BOT_ROLES: BotRoleDescriptor[] = [
  {
    id: 'secretary-miko',
    brief: SECRETARY_BRIEF,
    availableToolIds: ['memo.save','todo.create','schedule.suggest','draft.create','memory.save','memory.search'],
    policy: { defaultDecision: 'deny', allowTools: [/* same 6 */] },
    session: { purpose:'...', audience:'public', inputTrust:'untrusted',
               allowedTools: ['todo.create','draft.create','memory.save','memory.search'] },
  },
  {
    id: 'stream-staff-miko',
    brief: STREAM_STAFF_BRIEF,
    availableToolIds: ['draft.create','memory.save','memory.search'],
    policy: { defaultDecision: 'deny', allowTools: [/* those 3 */], requireApproval: { tools:['draft.create'] } },
    session: { purpose:'...', audience:'owner', inputTrust:'trusted',
               allowedTools: ['draft.create','memory.save','memory.search'] },
  },
];

// createBots.ts
const tools = createSecretaryTools({ storage });            // build the shared pool once
for (const role of roles) {
  const agent = createAgent({
    id: role.id, brief: role.brief, backend,
    tools: tools.filter(t => role.availableToolIds.includes(t.id)),
    policy: role.policy,
  });
  byId[role.id] = { agent, session: await agent.startSession(role.session) };
}
```

Key porting points for a **new role**:
1. Reuse `createSecretaryTools({ storage })` (same storage, same logic).
2. Pick an `id` (host-owned, stable) and a `brief` (personality + boundaries).
3. Narrow `availableToolIds` to what that role needs.
4. Set `policy` (`deny`-by-default + allowlist; `requireApproval` by `risk`).
5. Declare the default `Session` (public/untrusted vs private/trusted audience,
   `allowedTools` subset). Public sessions never get `draft.create`/`memory.save`
   if those could leak data; the owner session gets the full safe set.

## 4. Capabilities gained by porting (why it matters)

- **Risk-classified tools** → approvals flow (`approval.requested` →
  `session.resolveApproval`) instead of an all-or-nothing tool set.
- **Per-Session `allowedTools`** → a single agent can drive both a public
  commenter-safe session and a private owner session with different tool
  visibility. Viewer text is `input` (`trust: untrusted`) never the system
  message.
- **Typed event stream** → the host dashboard/subscription layer can consume
  `turn.*`, `tool.*`, `approval.*`, `artifact.*` events for state, SSE, alerts.
- **Cold resume** (`resumeSession`) for the Codex app-server backend.
- **Workspace bootstrap** (`agent.bootstrap({ workspace, version, context })`)
  for a character to self-organize its notes/procedures in a bounded turn.

## 5. Files in this example (`packages/agent/examples/port-agent-config/`)

| File | Purpose |
| --- | --- |
| `src/validation.ts` | Shared input helpers + `toProviderToolName` (dot→underscore mapping). |
| `src/jsonStorage.ts` | Host-owned JSON file storage (mirrors `character-agent`). |
| `src/secretaryTools.ts` | 6 secretary tools ported to `AgentToolSpec` with `risk`. |
| `src/botRoles.ts` | `SECRETARY_BRIEF`, `STREAM_STAFF_BRIEF`, two `BotRoleDescriptor`s. |
| `src/createProvider.ts` | `createChatBackend` — env-backed provider/model/key → `createChatServiceBackend`. |
| `src/createBots.ts` | `createBots` — builds one `Agent` per role from the shared tool pool. |
| `src/server.ts` | Minimal loopback HTTP server hosting both bot roles (`POST /api/bots/:id/run`). |
| `tests/porting.test.ts` | 8 passing tests proving each mapping (tool shape, brief→system msg, deny-by-default policy, `allowedTools` visibility filtering, storage-backed execution, multi-role construction). |

## 6. Verification

From the example directory:

```sh
# typecheck (strict, src + tests)
npx tsc --noEmit --project tsconfig.test.json

# tests (mock ChatService, no network, no Codex login required)
npx vitest run
```

Results in this environment:

```
Test Files  1 passed (1)
Tests       8 passed (8)
tsc         0 errors
```

Run the full agent-suite typecheck/tests to confirm the example is discovered:

```sh
cd packages/agent && npx vitest run   # auto-discovers tests/** and examples/*/tests/**
```

## 7. Issues encountered & notes

- **Tool name shape**: the old tools used dotted names (`memo.save`) directly as
  the model-facing `name`. The agent runtime requires a provider-safe
  `definition.name` (`memo_save`) **plus** a logical dotted `id`. The
  `toProviderToolName` helper (dot→underscore) makes the port mechanical.
- **Provider tool list**: `ChatServiceFactoryInput.tools` is `ToolDefinition[]`
  (`{ name, description, parameters }`) — no `definition` wrapper — so tests that
  inspect it use `t.name`, not `t.definition.name`.
- **`defineAgentTool` is optional**: factory functions returning
  `AgentToolSpec<Input, Output>` keep the original `createXxxTool({ storage })`
  structure and give typed `input` without changing call sites.
- **Example deps are not workspace-linked**: like the sibling
  `codex-workspace-server`/`stream-operations-staff` examples, this package has
  its own `package.json` with `file:` deps. Tests run via the agent package's
  vitest runner (which hoists `@aituber-onair/*` to the root `node_modules`
  symlinks) — no `npm install` in the example is required to run the tests.
- **Secrets kept out**: no API keys/tokens are stored in source; `createProvider`
  reads them from env and throws if missing.
