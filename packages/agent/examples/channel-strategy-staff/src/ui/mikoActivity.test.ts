import type { AgentEvent } from '@aituber-onair/agent';
import { describe, expect, it } from 'vitest';
import { deriveMikoActivity, presentMikoActivity } from './mikoActivity';

const base = {
  id: 'event-1',
  timestamp: '2026-08-01T00:00:00.000Z',
  agentId: 'channel-strategy-miko',
  sessionId: 'session-1',
  turnId: 'turn-1',
};

function event(partial: Record<string, unknown>): AgentEvent {
  return { ...base, ...partial } as unknown as AgentEvent;
}

describe('Miko staff card activity', () => {
  it('stays idle until a Turn starts', () => {
    expect(deriveMikoActivity([], false)).toEqual({ kind: 'idle' });
    expect(deriveMikoActivity([], true)).toEqual({ kind: 'investigating' });
  });

  it('follows the Agent Event stream through one Turn', () => {
    const events = [
      event({ type: 'turn.started' }),
      event({ type: 'message.delta', text: 'Reading data/' }),
      event({ type: 'message.completed', text: 'Inspection complete.' }),
    ];

    expect(deriveMikoActivity(events, true)).toEqual({ kind: 'investigating' });
    expect(
      deriveMikoActivity(
        [
          ...events,
          event({
            type: 'artifact.created',
            artifact: { type: 'codex.plan' },
          }),
          event({ type: 'turn.completed' }),
        ],
        false
      ).kind
    ).toBe('done');
    expect(
      deriveMikoActivity([...events, event({ type: 'turn.failed' })], false)
        .kind
    ).toBe('failed');
  });

  it('shows Codex investigation detail and reacts only to the activity kind', () => {
    const investigating = presentMikoActivity({ kind: 'investigating' });

    expect(investigating.detail).toContain('ワークスペース');
    expect(investigating.reaction?.effect).toBe('thinking');
    expect(presentMikoActivity({ kind: 'idle' }).reaction).toBeNull();
    expect(presentMikoActivity({ kind: 'done' }).reaction?.effect).toBe(
      'happy'
    );
    expect(presentMikoActivity({ kind: 'failed' }).reaction?.effect).toBe(
      'sad'
    );
  });
});
