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
      event({ type: 'tool.requested', toolId: 'channel.getOverview' }),
      event({ type: 'tool.completed', toolId: 'channel.getOverview' }),
    ];

    expect(deriveMikoActivity(events, true)).toEqual({
      kind: 'investigating',
      toolId: 'channel.getOverview',
    });
    expect(
      deriveMikoActivity(
        [...events, event({ type: 'message.completed' })],
        true
      )
    ).toEqual({ kind: 'validating' });
    expect(
      deriveMikoActivity([...events, event({ type: 'turn.completed' })], false)
        .kind
    ).toBe('done');
    expect(
      deriveMikoActivity([...events, event({ type: 'turn.failed' })], false)
        .kind
    ).toBe('failed');
  });

  it('keeps a failed Tool call inside the investigation', () => {
    const events = [
      event({ type: 'turn.started' }),
      event({ type: 'tool.requested', toolId: 'channel.listStreams' }),
      event({ type: 'tool.failed', toolId: 'channel.listStreams' }),
    ];

    expect(deriveMikoActivity(events, true).kind).toBe('investigating');
  });

  it('shows the running Tool ID and reacts only to the activity kind', () => {
    const investigating = presentMikoActivity({
      kind: 'investigating',
      toolId: 'strategy.getHistory',
    });

    expect(investigating.detail).toBe('strategy.getHistory');
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
