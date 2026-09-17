import { createRequire } from 'node:module';
import { mkdtemp, rm, mkdir, copyFile, chmod } from 'node:fs/promises';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Example runtime only. The library itself has no SDK or authentication access.
export async function withCodexService(options, run) {
  const sdk = options.sdkPath
    ? await import(pathToFileURL(options.sdkPath).href)
    : await import('@openai/codex-sdk');
  const { createAgentChatService, registerAgentChatProviders } = createRequire(
    import.meta.url
  )('@aituber-onair/chat/agent');
  const work = await mkdtemp(join(tmpdir(), 'noise-memory-'));
  try {
    const authDir = join(work, 'auth');
    await mkdir(authDir, { mode: 0o700 });
    await copyFile(
      join(process.env.CODEX_HOME ?? join(homedir(), '.codex'), 'auth.json'),
      join(authDir, 'auth.json')
    );
    await chmod(join(authDir, 'auth.json'), 0o600);
    registerAgentChatProviders({
      codexSDKLoader: async () => ({
        Codex: class extends sdk.Codex {
          constructor(config) {
            super({
              ...config,
              env: { ...process.env, HOME: work, CODEX_HOME: authDir },
            });
          }
        },
      }),
    });
    const service = createAgentChatService('codex-sdk', {
      ...(options.model ? { model: options.model } : {}),
      workingDirectory: work,
      skipGitRepoCheck: true,
      config: {
        sandbox_mode: 'read-only',
        approval_policy: 'never',
        web_search: 'disabled',
        model_reasoning_effort: 'low',
        project_doc_max_bytes: 0,
        features: {
          shell_tool: false,
          shell_snapshot: false,
          multi_agent: false,
          memories: false,
          hooks: false,
          remote_plugin: false,
        },
        tools: { view_image: false },
        apps: { _default: { enabled: false } },
      },
    });
    return await run(service);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

export async function reply(service, messages) {
  const completion = await service.chatOnce(messages, false, () => undefined);
  const text = completion.blocks
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();
  if (!text) throw new Error('Empty conversation response');
  return text;
}
