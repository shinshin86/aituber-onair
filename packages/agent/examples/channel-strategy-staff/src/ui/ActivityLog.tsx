import type { AgentEvent } from '@aituber-onair/agent';
import type { ChannelToolBudget } from '../protocol';

interface ToolRow {
  readonly toolCallId: string;
  toolId: string;
  args: string;
  status: 'running' | 'done' | 'failed';
  summary: string;
  startedAt: number;
  elapsedMs?: number;
}

const PHASE_LABELS: Partial<Record<AgentEvent['type'], string>> = {
  'turn.started': 'Turn開始',
  'message.completed': '構造化JSONを検証',
  'artifact.created': 'Artifactを添付',
  'turn.completed': 'Turn完了',
  'turn.failed': 'Turn失敗',
};

/**
 * One row per Tool call with its arguments and result size. This is the part
 * an operator uses to confirm what the Agent actually looked at.
 */
export function ActivityLog({
  events,
  budget,
}: {
  readonly events: readonly AgentEvent[];
  readonly budget: ChannelToolBudget;
}): React.JSX.Element {
  const rows = buildToolRows(events);
  const phases = events.filter((event) => PHASE_LABELS[event.type]);
  const rounds = readToolRounds(events);

  return (
    <div className="activity">
      <div className="budget">
        <span>
          Tool呼び出し <strong>{rows.length}</strong> /{' '}
          {budget.maxToolCallsPerTurn}
        </span>
        <span>
          ラウンド <strong>{rounds ?? '—'}</strong> / {budget.maxToolRounds}
        </span>
        <span className="muted">上限超過はTurn全体の失敗になります</span>
      </div>

      {rows.length === 0 ? (
        <p className="empty">
          分析を実行すると、Agentが呼び出したToolと引数がここに並びます。
        </p>
      ) : (
        <div className="table-scroll">
          <table className="data-table compact">
            <thead>
              <tr>
                <th scope="col" className="numeric">
                  #
                </th>
                <th scope="col">Tool</th>
                <th scope="col">引数</th>
                <th scope="col">結果</th>
                <th scope="col" className="numeric">
                  ms
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.toolCallId} className={`tool-${row.status}`}>
                  <td className="numeric muted">{index + 1}</td>
                  <td>
                    <code>{row.toolId}</code>
                  </td>
                  <td className="muted args">{row.args || '—'}</td>
                  <td>{row.summary}</td>
                  <td className="numeric muted">{row.elapsedMs ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {phases.length > 0 ? (
        <ol className="phases">
          {phases.map((event, index) => (
            <li key={`${event.type}-${index}`} className={event.type}>
              {PHASE_LABELS[event.type]}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

function buildToolRows(events: readonly AgentEvent[]): ToolRow[] {
  const rows = new Map<string, ToolRow>();
  for (const event of events) {
    if (event.type === 'tool.requested') {
      rows.set(event.toolCallId, {
        toolCallId: event.toolCallId,
        toolId: event.toolId,
        args: formatArguments(event.arguments),
        status: 'running',
        summary: '実行中',
        startedAt: Date.parse(event.timestamp),
      });
      continue;
    }
    if (event.type === 'tool.completed') {
      const row = rows.get(event.toolCallId);
      if (!row) continue;
      row.status = 'done';
      row.summary = summarizeOutput(event.output);
      row.elapsedMs = Date.parse(event.timestamp) - row.startedAt;
      continue;
    }
    if (event.type === 'tool.failed') {
      const row = rows.get(event.toolCallId);
      if (!row) continue;
      row.status = 'failed';
      row.summary = event.error.message;
      row.elapsedMs = Date.parse(event.timestamp) - row.startedAt;
    }
  }
  return [...rows.values()];
}

function formatArguments(value: unknown): string {
  if (typeof value !== 'object' || value === null) return '';
  return Object.entries(value as Record<string, unknown>)
    .map(([key, entry]) =>
      Array.isArray(entry)
        ? `${key}=[${entry.length}]`
        : `${key}=${String(entry)}`
    )
    .join(' ');
}

function summarizeOutput(output: unknown): string {
  if (typeof output !== 'object' || output === null) return '完了';
  const record = output as Record<string, unknown>;
  if (Array.isArray(record.streams)) return `配信 ${record.streams.length}件`;
  if (Array.isArray(record.strategies)) {
    return `仮説 ${record.strategies.length}件`;
  }
  if (Array.isArray(record.byPlatformAndGame)) {
    return `ゲーム別 ${record.byPlatformAndGame.length}行`;
  }
  if (record.byPlatform && typeof record.byPlatform === 'object') {
    return `プラットフォーム別 ${Object.keys(record.byPlatform).length}件`;
  }
  return '完了';
}

function readToolRounds(events: readonly AgentEvent[]): number | undefined {
  for (const event of events) {
    if (event.type !== 'turn.completed') continue;
    const rounds = event.result.backendMetadata?.toolRounds;
    if (typeof rounds === 'number') return rounds;
  }
  return undefined;
}
