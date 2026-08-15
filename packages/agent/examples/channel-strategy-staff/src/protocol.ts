import type { AgentEvent, AgentRunResult } from '@aituber-onair/agent';
import type { GamePerformance, PlatformOverview } from './data/aggregate.js';
import type { StrategyRecord, StreamRecord } from './data/types.js';

/**
 * The deterministic view of the fixture data. The dashboard renders exactly
 * what the host writes into the Codex data workspace.
 */
export interface ChannelDashboard {
  readonly referenceDate: string;
  readonly since: string;
  readonly days: number;
  readonly platforms: readonly PlatformOverview[];
  readonly streams: readonly StreamRecord[];
  readonly games: readonly GamePerformance[];
  readonly strategies: readonly StrategyRecord[];
}

/**
 * Host-owned scheduling state. The Agent package has no scheduler of its own,
 * so the example server decides when to wake Miko up.
 */
export interface ChannelStrategyScheduleState {
  readonly intervalMs: number;
  readonly nextRunAt?: string;
}

export interface ChannelStrategyServerState {
  readonly turnActive: boolean;
  readonly mode: 'demo' | 'codex';
  readonly model: string;
  readonly threadTurnCount: number;
  readonly lastTurnDurationMs?: number;
  readonly schedule: ChannelStrategyScheduleState;
  readonly dashboard: ChannelDashboard;
}

export type ChannelStrategySseEnvelope =
  | {
      readonly kind: 'state';
      readonly state: ChannelStrategyServerState;
    }
  | {
      readonly kind: 'agent-event';
      readonly operationId: string;
      readonly event: AgentEvent;
    }
  | {
      readonly kind: 'operation-completed';
      readonly operationId: string;
      readonly result: AgentRunResult;
    }
  | {
      readonly kind: 'turn-error';
      readonly operationId: string;
      readonly message: string;
    };

export interface ChannelStrategyTurn {
  readonly events: readonly AgentEvent[];
  readonly result: AgentRunResult;
}
