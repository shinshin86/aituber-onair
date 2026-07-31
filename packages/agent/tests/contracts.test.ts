import {
  AgentCapabilityError,
  AgentConfigurationError,
  AgentError,
} from '../src/errors.js';
import {
  assertCharacterProfile,
  snapshotBackendCapabilities,
} from '../src/internal/contracts.js';
import type {
  AgentBackendCapabilities,
  CharacterProfile,
} from '../src/types.js';

const validCharacter: CharacterProfile = {
  id: 'stream-operations-staff',
  name: 'Mika',
  role: 'Live-stream operations staff',
  persona: {
    traits: ['calm', 'observant'],
    values: ['viewer safety'],
  },
  instructions: ['Separate observations from suggestions.'],
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
  it('accepts a valid CharacterProfile', () => {
    expect(() => assertCharacterProfile(validCharacter)).not.toThrow();
  });

  it('rejects invalid CharacterProfile fields with actionable issues', () => {
    expect(() =>
      assertCharacterProfile({
        id: ' ',
        name: '',
        role: 42,
        persona: {
          traits: ['valid', ''],
          speakingStyle: '',
        },
        instructions: ['valid', ''],
      })
    ).toThrow(AgentConfigurationError);

    try {
      assertCharacterProfile({
        id: ' ',
        name: '',
        role: 42,
        persona: {
          traits: ['valid', ''],
        },
      });
    } catch (error) {
      expect(error).toBeInstanceOf(AgentConfigurationError);
      expect((error as AgentConfigurationError).issues).toEqual(
        expect.arrayContaining([
          'character.id must be a non-empty string',
          'character.name must be a non-empty string',
          'character.role must be a non-empty string',
          'character.persona.traits must contain only non-empty strings',
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
