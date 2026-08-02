import { readFileSync } from 'node:fs';

const browserEntrySources = [
  '../src/index.ts',
  '../src/errors.ts',
  '../src/types.ts',
  '../src/chat.ts',
  '../src/backends/chat/buildMessages.ts',
  '../src/backends/chat/ChatServiceBackend.ts',
  '../src/backends/chat/types.ts',
  '../src/bootstrap/bootstrapAgent.ts',
  '../src/core/AgentRuntime.ts',
  '../src/core/AgentSession.ts',
  '../src/core/AsyncEventQueue.ts',
  '../src/core/ids.ts',
  '../src/core/runHooks.ts',
  '../src/policy/DefaultAgentPolicy.ts',
  '../src/tools/defineAgentTool.ts',
  '../src/tools/sanitize.ts',
  '../src/tools/schemaValidation.ts',
] as const;

describe('browser entry boundary', () => {
  it.each(browserEntrySources)(
    '%s has no Node.js built-in imports',
    (relativePath) => {
      const source = readFileSync(
        new URL(relativePath, import.meta.url),
        'utf8'
      );

      expect(source).not.toMatch(
        /(?:from\s+|import\s*\(|require\s*\()\s*['"]node:/
      );
    }
  );
});
