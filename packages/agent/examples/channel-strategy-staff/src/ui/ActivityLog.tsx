import type { AgentArtifact, AgentEvent } from '@aituber-onair/agent';

const CODEX_ARTIFACT_TYPES = new Set([
  'codex.plan',
  'codex.command-execution',
  'codex.file-change',
]);

export function ActivityLog({
  events,
  turnActive,
  threadTurnCount,
  lastTurnDurationMs,
}: {
  readonly events: readonly AgentEvent[];
  readonly turnActive: boolean;
  readonly threadTurnCount: number;
  readonly lastTurnDurationMs?: number;
}): React.JSX.Element {
  const artifacts = events
    .filter((event) => event.type === 'artifact.created')
    .map((event) => event.artifact)
    .filter((artifact) => CODEX_ARTIFACT_TYPES.has(artifact.type));

  return (
    <div className="activity">
      <dl className="turn-stats">
        <div>
          <dt>Turn所要時間</dt>
          <dd>{formatDuration(lastTurnDurationMs)}</dd>
        </div>
        <div>
          <dt>現在のスレッド</dt>
          <dd>{threadTurnCount} Turn</dd>
        </div>
      </dl>

      {turnActive ? (
        <p className="activity-running">
          <span className="staff-dot" /> Codexがワークスペースを調査中です
        </p>
      ) : null}

      {artifacts.length === 0 ? (
        <p className="empty">
          {turnActive
            ? 'plan・command・file-changeはTurn完了後に一括表示されます。'
            : '分析を実行すると、Codexが完了した調査内容がここに並びます。'}
        </p>
      ) : (
        <ol className="codex-artifacts">
          {artifacts.map((artifact) => (
            <CodexArtifactRow key={artifact.id} artifact={artifact} />
          ))}
        </ol>
      )}
    </div>
  );
}

function CodexArtifactRow({
  artifact,
}: {
  readonly artifact: AgentArtifact;
}): React.JSX.Element {
  const data = asRecord(artifact.data);
  const presentation = presentArtifact(artifact.type, data);
  return (
    <li>
      <span className={`artifact-kind ${presentation.kind}`}>
        {presentation.label}
      </span>
      <div>
        <strong>{artifact.title ?? presentation.title}</strong>
        <p>{presentation.detail}</p>
      </div>
    </li>
  );
}

function presentArtifact(
  type: string,
  data: Record<string, unknown>
): {
  readonly kind: string;
  readonly label: string;
  readonly title: string;
  readonly detail: string;
} {
  if (type === 'codex.plan') {
    return {
      kind: 'plan',
      label: 'PLAN',
      title: '調査計画',
      detail: readText(data.text) ?? '調査計画を完了しました。',
    };
  }
  if (type === 'codex.command-execution') {
    const duration =
      typeof data.durationMs === 'number' ? ` · ${data.durationMs}ms` : '';
    return {
      kind: 'command',
      label: 'COMMAND',
      title: 'コマンド実行',
      detail: `${readText(data.command) ?? 'command'} · ${readText(data.status) ?? 'completed'}${duration}`,
    };
  }
  const changes = Array.isArray(data.changes) ? data.changes.length : 0;
  return {
    kind: 'file',
    label: 'FILE',
    title: 'ファイル変更',
    detail: `${changes}件 · ${readText(data.status) ?? 'completed'}`,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function formatDuration(value: number | undefined): string {
  if (value === undefined) return '—';
  if (value < 1_000) return `${value}ms`;
  return `${(value / 1_000).toFixed(1)}秒`;
}
