import type { GamePerformance, PlatformOverview } from '../data/aggregate';
import type { MetricKey, StrategyRecord } from '../data/types';
import {
  GROWTH_METRIC,
  PLATFORM_LABELS,
  formatMetric,
  metricNote,
  metricNumber,
  qualityLabel,
  type MetricFormat,
} from './format';

const OVERVIEW_ROWS: readonly {
  readonly key: MetricKey;
  readonly label: string;
  readonly format?: MetricFormat;
}[] = [
  { key: 'averageConcurrentViewers', label: '平均同時視聴' },
  { key: 'peakConcurrentViewers', label: '平均ピーク' },
  {
    key: 'averageViewDurationSeconds',
    label: '平均視聴時間',
    format: 'duration',
  },
  { key: 'averageViewPercentage', label: '平均視聴率', format: 'percent' },
  { key: 'views', label: '総再生数' },
  { key: 'chatMessages', label: 'チャット総数' },
];

const STRATEGY_RESULTS = {
  supported: '支持',
  refuted: '反証',
  mixed: '混在',
} as const;

/** Per-platform summary. Growth rows keep their platform-specific unit. */
export function PlatformSummary({
  overview,
}: { readonly overview: PlatformOverview }): React.JSX.Element {
  const growth = GROWTH_METRIC[overview.platform];
  return (
    <section className={`summary ${overview.platform}`}>
      <header>
        <h3>
          <span className={`platform-dot ${overview.platform}`} />
          {PLATFORM_LABELS[overview.platform]}
        </h3>
        <span className="count">{overview.streamCount} 配信</span>
      </header>
      <dl>
        <div className="growth-row">
          <dt>{growth.label}増加</dt>
          <dd>
            {formatMetric(overview.metrics[growth.key])}
            <small>{qualityLabel(overview.metrics[growth.key])}</small>
          </dd>
        </div>
        {OVERVIEW_ROWS.map((row) => {
          const metric = overview.metrics[row.key];
          return (
            <div key={row.key}>
              <dt>{row.label}</dt>
              <dd title={metricNote(metric)}>
                {metric.status === 'available' ? (
                  <>
                    {formatMetric(metric, row.format)}
                    <small>{qualityLabel(metric)}</small>
                  </>
                ) : (
                  <span className="no-data">取得不可</span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

/** Game aggregates stay grouped per platform; rows are never merged. */
export function GameTable({
  games,
}: { readonly games: readonly GamePerformance[] }): React.JSX.Element {
  const peak = Math.max(
    1,
    ...games.map((game) => metricNumber(game.metrics.averageConcurrentViewers))
  );
  const sorted = [...games].sort(
    (left, right) =>
      metricNumber(right.metrics.averageConcurrentViewers) -
      metricNumber(left.metrics.averageConcurrentViewers)
  );
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">ゲーム</th>
            <th scope="col">配信</th>
            <th scope="col" className="numeric">
              本数
            </th>
            <th scope="col" className="numeric">
              平均同時
            </th>
            <th scope="col" className="numeric">
              平均視聴
            </th>
            <th scope="col" className="numeric">
              成長
            </th>
            <th scope="col">形式</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((game) => {
            const growth = GROWTH_METRIC[game.platform];
            const duration = game.metrics.averageViewDurationSeconds;
            return (
              <tr key={`${game.platform}:${game.gameId}`}>
                <td className="title">
                  <span className={`platform-dot ${game.platform}`} />
                  {game.gameTitle}
                </td>
                <td className="muted">{PLATFORM_LABELS[game.platform]}</td>
                <td className="numeric">{game.streamCount}</td>
                <td className="numeric bar-cell">
                  <span
                    className={`bar-fill ${game.platform}`}
                    style={{
                      width: `${(metricNumber(game.metrics.averageConcurrentViewers) / peak) * 100}%`,
                    }}
                  />
                  <span className="bar-value">
                    {formatMetric(game.metrics.averageConcurrentViewers)}
                  </span>
                </td>
                <td className="numeric">
                  {duration.status === 'available' ? (
                    formatMetric(duration, 'duration')
                  ) : (
                    <span className="no-data">取得不可</span>
                  )}
                </td>
                <td className="numeric">
                  {formatMetric(game.metrics[growth.key])}
                  <small>{growth.label}</small>
                </td>
                <td className="muted">{game.formats.join(', ')}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Prior hypotheses, including the refuted one the Agent must not repeat. */
export function StrategyList({
  strategies,
  selectedId,
  onSelectStream,
}: {
  readonly strategies: readonly StrategyRecord[];
  readonly selectedId?: string;
  readonly onSelectStream: (streamId: string) => void;
}): React.JSX.Element {
  return (
    <ul className="strategy-list">
      {strategies.map((strategy) => (
        <li
          key={strategy.id}
          id={`strategy-${strategy.id}`}
          className={`${strategy.result}${
            strategy.id === selectedId ? ' selected' : ''
          }`}
        >
          <div className="strategy-head">
            <span className={`result ${strategy.result}`}>
              {STRATEGY_RESULTS[strategy.result]}
            </span>
            <code>{strategy.id}</code>
            <span className="muted">{PLATFORM_LABELS[strategy.platform]}</span>
          </div>
          <p className="hypothesis">{strategy.hypothesis}</p>
          <p className="finding">{strategy.finding}</p>
          <div className="chip-row">
            {strategy.targetStreamIds.map((streamId) => (
              <button
                key={streamId}
                type="button"
                className="chip"
                onClick={() => onSelectStream(streamId)}
              >
                {streamId}
              </button>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
