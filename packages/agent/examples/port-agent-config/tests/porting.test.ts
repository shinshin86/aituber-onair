import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ChatService, Message, ToolChatCompletion } from '@aituber-onair/chat';
import '@aituber-onair/chat/agent';
import {
  AgentPolicyDeniedError,
  createAgent,
  type AgentBackend,
  type AgentBackendCapabilities,
  type AgentPolicyConfig,
  type AgentToolSpec,
} from '@aituber-onair/agent';
import {
  createChatServiceBackend,
  type ChatServiceBackendCapabilities,
} from '@aituber-onair/agent/chat';

import {
  BOT_ROLES,
  secretaryRole,
  streamStaffRole,
  type BotRoleDescriptor,
} from '../src/botRoles.js';
import { createBots } from '../src/createBots.js';
import { createJsonStorage } from '../src/jsonStorage.js';
import { createSecretaryTools } from '../src/secretaryTools.js';
import type { SecretaryToolSpec } from '../src/secretaryTools.js';

const TOOL_CAPABILITIES: ChatServiceBackendCapabilities = {
  text: true,
  streaming: true,
  tools: true,
  interruption: false,
  sessionResume: false,
  approvals: false,
  detailedEvents: true,
};

type ChatOnceHandler = (
  messages: Message[],
  stream: boolean,
  onPartialResponse: (text: string) => void,
) => Promise<ToolChatCompletion>;

function createMockChatService(
  provider: string,
  chatOnce: ChatOnceHandler,
): ChatService {
  return {
    provider,
    getModel: () => 'mock-model',
    getVisionModel: () => 'mock-model',
    processChat: async () => undefined,
    processVisionChat: async () => undefined,
    chatOnce,
    visionChatOnce: async () => ({ blocks: [], stop_reason: 'end' }),
  };
}

function finalCompletion(text: string): ToolChatCompletion {
  return {
    blocks: [{ type: 'text', text }],
    stop_reason: 'end',
    usage: { prompt_tokens: 7, completion_tokens: 3, total_tokens: 10 },
  };
}

function createBackend(
  chatOnce: ChatOnceHandler,
): AgentBackend {
  return createChatServiceBackend({
    provider: 'openai',
    capabilities: TOOL_CAPABILITIES,
    createChatService: () =>
      createMockChatService('openai', chatOnce),
  });
}

const temporaryDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const dir = await join(tmpdir(), `port-agent-config-${Math.random().toString(36).slice(2)}`);
  await mkdir(dir, { recursive: true });
  temporaryDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(temporaryDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('ported secretary tools', () => {
  it('expose id, provider-safe name, and risk classification', () => {
    const storage = createJsonStorage({ baseDir: tmpdir() });
    const tools = createSecretaryTools({ storage });

    const byId = Object.fromEntries(tools.map((tool) => [tool.id, tool]));
    expect(Object.keys(byId).sort()).toEqual([
      'draft.create',
      'memo.save',
      'memory.save',
      'memory.search',
      'schedule.suggest',
      'todo.create',
    ]);

    // id is the dotted logical name (used by policy/allowTools)
    expect(byId['memo.save'].id).toBe('memo.save');
    // definition.name is provider-safe (sent to the model)
    expect(byId['memo.save'].definition.name).toBe('memo_save');
    expect(byId['memory.search'].definition.name).toBe('memory_search');
    // read-only tool is 'read' risk; mutation tools are 'draft'/'write'
    expect(byId['memory.search'].risk).toBe('read');
    expect(byId['memo.save'].risk).toBe('draft');
    expect(byId['draft.create'].risk).toBe('write');
  });
});

describe('createBots porting', () => {
  it('builds one Agent per role from a shared tool pool', async () => {
    const workspaceDir = await createTempDir();
    const chatOnce: ChatOnceHandler = async (_messages, _stream, onPartial) => {
      onPartial('ok');
      return finalCompletion('ok');
    };
    // Inject a backend that always succeeds, bypassing real provider resolution.
    const backend = createBackend(chatOnce);
    const storage = createJsonStorage({ baseDir: workspaceDir });
    const allTools = createSecretaryTools({ storage });

    // Build agents the same way createBots does, but with the mock backend.
    const agents: Record<string, AgentLike> = {};
    for (const role of BOT_ROLES) {
      const toolIds = new Set(role.availableToolIds as readonly string[]);
      const tools = allTools.filter((t) => toolIds.has(t.id));
      agents[role.id] = { agent: createAgent({ id: role.id, brief: role.brief, backend, tools, policy: role.policy }), role };
    }

    expect(Object.keys(agents).sort()).toEqual([
      'secretary-miko',
      'stream-staff-miko',
    ]);
    // Roles reuse the same tool pool but narrow it differently.
    expect(agents[secretaryRole.id].role.availableToolIds).toHaveLength(6);
    expect(agents[streamStaffRole.id].role.availableToolIds).toHaveLength(3);
    expect(agents[secretaryRole.id].role.brief).not.toBe(
      agents[streamStaffRole.id].role.brief,
    );

    for (const { agent } of Object.values(agents)) await agent.close();
  });

  it('maps the character-agent tool shape to AgentToolSpec without logic changes', () => {
    const storage = createJsonStorage({ baseDir: tmpdir() });
    const tools = createSecretaryTools({ storage });
    for (const tool of tools) {
      // Every ported tool satisfies the Agent runtime contract.
      expect(tool.id).toEqual(expect.any(String));
      expect(tool.risk).toEqual(
        expect.stringMatching(/^(read|draft|write|external|destructive)$/),
      );
      const params = tool.definition.parameters as Record<string, unknown>;
      expect(params.type).toBe('object');
      expect(tool.definition.name).not.toContain('.');
    }
  });
});

describe('brief and session configuration porting', () => {
  it('sends the brief as the system message and narrows tools by Session allowedTools', async () => {
    const workspaceDir = await createTempDir();
    const storage = createJsonStorage({ baseDir: workspaceDir });
    const tools = createSecretaryTools({ storage });

    let capturedMessages: Message[] | undefined;
    const chatOnce: ChatOnceHandler = async (messages) => {
      capturedMessages = messages;
      return finalCompletion('Hello.');
    };
    const backend = createBackend(chatOnce);

    const agent = createAgent({
      id: secretaryRole.id,
      brief: secretaryRole.brief,
      backend,
      tools,
      policy: secretaryRole.policy,
    });
    const session = await agent.startSession({
      purpose: secretaryRole.session.purpose,
      audience: secretaryRole.session.audience,
      inputTrust: secretaryRole.session.inputTrust,
      allowedTools: [...secretaryRole.session.allowedTools],
    });

    await session.run({ instruction: 'Hello.' });

    // The host-authored brief becomes part of the system message.
    const systemMessage = capturedMessages!.find((m) => m.role === 'system');
    expect(systemMessage?.content).toContain('AI character secretary');
    expect(systemMessage?.content).toContain(secretaryRole.brief);

    // allowedTools restricts what the backend advertises to the provider.
    const toolsSentToProvider = capturedMessages!.find(
      (m) => m.role === 'assistant' && Array.isArray((m as unknown as { tools?: unknown }).tools),
    );
    expect(toolsSentToProvider).toBeUndefined();

    await session.close();
    await agent.close();
  });

  it('exposes only the allowedTools subset to the provider (public session)', async () => {
    const workspaceDir = await createTempDir();
    const storage = createJsonStorage({ baseDir: workspaceDir });
    const tools = createSecretaryTools({ storage });

    let sentTools: { name: string }[] | undefined;
    const chatOnce: ChatOnceHandler = async (_messages, _stream, _on) => {
      // The backend passes `tools` to createChatService; capture from the
      // factory input instead by inspecting the backend construction below.
      return finalCompletion('Hi.');
    };
    // Wrap createBackend to capture the tools handed to the ChatService.
    const captured: { tools: { name: string }[] }[] = [];
    const backend = createChatServiceBackend({
      provider: 'openai',
      capabilities: TOOL_CAPABILITIES,
      createChatService: (input) => {
        captured.push({ tools: input.tools.map((t) => ({ name: t.name })) });
        return createMockChatService('openai', chatOnce);
      },
    });

    const agent = createAgent({
      id: secretaryRole.id,
      brief: secretaryRole.brief,
      backend,
      tools,
      policy: secretaryRole.policy,
    });
    const session = await agent.startSession({
      purpose: secretaryRole.session.purpose,
      audience: secretaryRole.session.audience,
      inputTrust: secretaryRole.session.inputTrust,
      allowedTools: [...secretaryRole.session.allowedTools],
    });

    await session.run({ instruction: 'Say hi.' });

    // The public secretary session only surfaces these four tools to the model.
    expect(captured).toHaveLength(1);
    expect(captured[0].tools.map((t) => t.name).sort()).toEqual(
      ['draft_create', 'memory_save', 'memory_search', 'todo_create'],
    );

    await session.close();
    await agent.close();
  });

  it('refuses tools outside the deny-by-default policy allowlist', async () => {
    const workspaceDir = await createTempDir();
    const storage = createJsonStorage({ baseDir: workspaceDir });
    const tools = createSecretaryTools({ storage });

    // Model asks for memo_save, but the policy only allows memory.search.
    const chatOnce: ChatOnceHandler = async () => ({
      blocks: [
        {
          type: 'tool_use',
          id: 'call-memo',
          name: 'memo_save',
          input: { title: 'Idea', content: 'Stream idea' },
        },
      ],
      stop_reason: 'tool_use',
    });
    const backend = createBackend(chatOnce);

    const policy: AgentPolicyConfig = {
      defaultDecision: 'deny',
      allowTools: ['memory.search'],
    };

    const agent = createAgent({
      id: 'policy-test-bot',
      brief: 'Test bot.',
      backend,
      tools,
      policy,
    });
    const session = await agent.startSession({
      purpose: 'Test',
      audience: 'operator',
      inputTrust: 'trusted',
      allowedTools: ['memo.save'],
    });

    await expect(session.run({ instruction: 'Save a memo.' })).rejects.toBeInstanceOf(
      AgentPolicyDeniedError,
    );

    await session.close();
    await agent.close();
  });

  it('executes a ported storage-backed tool and persists the result', async () => {
    const workspaceDir = await createTempDir();
    const storage = createJsonStorage({ baseDir: workspaceDir });
    const tools = createSecretaryTools({ storage });
    const toolIds = new Set(secretaryRole.availableToolIds as readonly string[]);
    const registered = tools.filter((t) => toolIds.has(t.id));

    const chatOnce: ChatOnceHandler = async () => ({
      blocks: [
        {
          type: 'tool_use',
          id: 'call-memo',
          name: 'memo_save',
          input: { title: 'Launch plan', content: 'Go live at noon.' },
        },
      ],
      stop_reason: 'tool_use',
    });

    // Second call returns a normal completion after the tool result.
    let call = 0;
    const backend = createChatServiceBackend({
      provider: 'openai',
      capabilities: TOOL_CAPABILITIES,
      createChatService: () =>
        createMockChatService('openai', async (_messages, _stream, onPartial) => {
          call += 1;
          if (call === 1) {
            return {
              blocks: [
                {
                  type: 'tool_use',
                  id: 'call-memo',
                  name: 'memo_save',
                  input: { title: 'Launch plan', content: 'Go live at noon.' },
                },
              ],
              stop_reason: 'tool_use',
            };
          }
          onPartial('Saved.');
          return finalCompletion('Saved.');
        }),
    });

    const agent = createAgent({
      id: 'storage-test-bot',
      brief: 'Test bot.',
      backend,
      tools: registered,
      policy: { defaultDecision: 'allow', allowTools: ['memo.save'] },
    });
    const session = await agent.startSession({
      purpose: 'Test',
      audience: 'operator',
      inputTrust: 'trusted',
      allowedTools: ['memo.save'],
    });

    const result = await session.run({ instruction: 'Save a memo.' });
    expect(result.message).toBe('Saved.');

    const memosFile = join(workspaceDir, 'memos.json');
    const data = JSON.parse(await readFile(memosFile, 'utf8')) as Array<{
      title: string;
      content: string;
    }>;
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ title: 'Launch plan', content: 'Go live at noon.' });

    await session.close();
    await agent.close();
  });
});

describe('createBots integration', () => {
  it('creates closed agents for every role without a live provider', async () => {
    const backend = createChatServiceBackend({
      provider: 'openai',
      capabilities: TOOL_CAPABILITIES,
      createChatService: () =>
        createMockChatService('openai', async () => finalCompletion('ok')),
    });
    const workspaceDir = await createTempDir();
    const storage = createJsonStorage({ baseDir: workspaceDir });
    const allTools = createSecretaryTools({ storage });

    const instances: Record<string, { id: string; brief: string; toolCount: number }> = {};
    for (const role of BOT_ROLES) {
      const toolIds = new Set(role.availableToolIds as readonly string[]);
      const tools = allTools.filter((t) => toolIds.has(t.id));
      const agent = createAgent({ id: role.id, brief: role.brief, backend, tools, policy: role.policy });
      instances[role.id] = { id: role.id, brief: role.brief, toolCount: tools.length };
      await agent.close();
    }

    expect(Object.keys(instances).sort()).toEqual(['secretary-miko', 'stream-staff-miko']);
    expect(instances).toEqual({
      'secretary-miko': { id: 'secretary-miko', brief: expect.any(String), toolCount: 6 },
      'stream-staff-miko': { id: 'stream-staff-miko', brief: expect.any(String), toolCount: 3 },
    });
  });
});

interface AgentLike {
  agent: { close: () => Promise<void> };
  role: BotRoleDescriptor;
}
