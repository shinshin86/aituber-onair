/**
 * Multi-bot factory.
 *
 * `createBots` builds one `Agent` per `BotRoleDescriptor`, all sharing the same
 * host-owned tool pool and backend, but each with its own `id`, `brief`, and a
 * tool/policy subset. Adding a new bot "role" is therefore: add a descriptor
 * to `BOT_ROLES` (or pass your own array) — no tool code changes required.
 *
 * Port mapping vs the old single-agent character-agent example:
 *
 *   old: one createSecretaryAgent({ chat, tools })  -> one chat loop
 *   new: createAgent per role  ->  one Session per conversation context
 *
 * The host keeps one Agent alive per bot and opens separate public/private
 * Sessions for each audience boundary.
 */
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { createAgent } from '@aituber-onair/agent';
import type { Agent, AgentSession, AgentToolSpec } from '@aituber-onair/agent';

import { BOT_ROLES, type BotRoleDescriptor } from './botRoles.js';
import { createChatBackend } from './createProvider.js';
import { createJsonStorage } from './jsonStorage.js';
import type { JsonStorage } from './jsonStorage.js';
import type { SecretaryToolSpec } from './secretaryTools.js';
import { createSecretaryTools } from './secretaryTools.js';
import type { ChatBackendOptions } from './createProvider.js';

export interface BotInstance {
  readonly role: BotRoleDescriptor;
  readonly agent: Agent;
  readonly session: AgentSession | undefined;
}

export interface CreateBotsOptions extends ChatBackendOptions {
  /** Roles to instantiate. Defaults to the bundled `BOT_ROLES`. */
  readonly roles?: readonly BotRoleDescriptor[];
  /** Directory for the JSON workspace each bot reads/writes. */
  readonly workspaceDir?: string;
  /** Pre-built storage (e.g. injected in tests). */
  readonly storage?: JsonStorage;
  /** Whether to open the role's default Session immediately. */
  readonly startDefaultSession?: boolean;
}

export interface BotsContainer {
  readonly byId: Readonly<Record<string, BotInstance>>;
  readonly close: () => Promise<void>;
}

export async function createBots(
  options: CreateBotsOptions,
): Promise<BotsContainer> {
  const {
    roles = BOT_ROLES,
    workspaceDir,
    storage: providedStorage,
    startDefaultSession = false,
  } = options;

  let storage: JsonStorage;
  if (providedStorage) {
    storage = providedStorage;
  } else {
    const baseDir = workspaceDir ?? join(process.cwd(), 'data');
    await mkdir(baseDir, { recursive: true });
    storage = createJsonStorage({ baseDir });
  }

  const backend = createChatBackend(options);

  // The full secretary tool pool, built once and shared by reference.
  const allTools: SecretaryToolSpec[] = createSecretaryTools({ storage });

  const byId: Record<string, BotInstance> = {};
  const agents: Agent[] = [];
  const sessions: AgentSession[] = [];

  for (const role of roles) {
    const roleToolIds = role.availableToolIds as readonly string[];
    // Port: each role narrows the shared tool pool to its `availableToolIds`.
    const tools: AgentToolSpec[] = allTools.filter((tool) =>
      roleToolIds.includes(tool.id),
    );

    const agent = createAgent({
      id: role.id,
      brief: role.brief,
      backend,
      tools,
      policy: role.policy,
    });
    agents.push(agent);

    let session: AgentSession | undefined;
    if (startDefaultSession) {
      session = await agent.startSession({
        purpose: role.session.purpose,
        audience: role.session.audience,
        inputTrust: role.session.inputTrust,
        allowedTools: [...role.session.allowedTools],
      });
      sessions.push(session);
    }

    byId[role.id] = { role, agent, session };
  }

  return {
    byId,
    close: async () => {
      for (const session of sessions) await session.close();
      for (const agent of agents) await agent.close();
    },
  };
}
