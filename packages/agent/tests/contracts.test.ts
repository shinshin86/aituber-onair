import {
  AgentCapabilityError,
  AgentConfigurationError,
  AgentError,
} from '../src/errors.js';
import {
  assertAgentDefinition,
  snapshotBackendCapabilities,
} from '../src/internal/contracts.js';
import type { AgentBackendCapabilities } from '../src/types.js';

const validAgentDefinition = {
  id: 'stream-operations-staff',
  brief: `
    You are Mika, calm and observant live-stream operations staff.
    Protect viewer safety and separate observations from suggestions.
  `,
};

const capabilities: AgentBackendCapabilities = {
  text: true,
  streaming: true,
  tools: true,
  interruption: false,
  sessionResume: false,
  approvals: false,
  detailedEvents: false,
};

describe('Phase 1 contracts', () => {
  it('accepts a natural-language Agent definition', () => {
    expect(() => assertAgentDefinition(validAgentDefinition)).not.toThrow();
  });

  it('rejects invalid Agent definitions with actionable issues', () => {
    expect(() =>
      assertAgentDefinition({
        id: ' ',
        brief: '',
      })
    ).toThrow(AgentConfigurationError);

    try {
      assertAgentDefinition({
        id: ' ',
        brief: 42,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(AgentConfigurationError);
      expect((error as AgentConfigurationError).issues).toEqual(
        expect.arrayContaining([
          'agent.id must be a non-empty string',
          'agent.brief must be a non-empty string',
        ])
      );
    }
  });

  it('takes an immutable copy of backend capabilities', () => {
    const mutableCapabilities = { ...capabilities };
    const snapshot = snapshotBackendCapabilities(mutableCapabilities);

    mutableCapabilities.tools = false;

    expect(snapshot.tools).toBe(true);
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it('reports unsupported capabilities with a typed error', () => {
    const error = new AgentCapabilityError('tools', 'mock-backend');

    expect(error).toBeInstanceOf(AgentError);
    expect(error.code).toBe('AGENT_CAPABILITY_UNSUPPORTED');
    expect(error.capability).toBe('tools');
    expect(error.message).toContain('mock-backend');
  });

  it('preserves the cause when wrapping an error', () => {
    const cause = new Error('provider failure');
    const error = new AgentError('backend failed', { cause });

    expect(error.cause).toBe(cause);
  });
});
