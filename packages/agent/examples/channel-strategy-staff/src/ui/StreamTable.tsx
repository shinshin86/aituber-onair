import { useMemo, useState } from 'react';
import type { StreamRecord } from '../data/types';
import {
  GROWTH_METRIC,
  formatDate,
  formatMetric,
  metricNote,
  metricNumber,
  qualityLabel,
} from './format';

type SortKey = 'date' | 'concurrent' | 'growth' | 'retention';

interface StreamTableProps {
  readonly streams: readonly StreamRecord[];
  readonly selectedStreamId?: string;
  readonly onSelect: (streamId: string) => void;
}

/** The row-level evidence an operator needs to check any cited stream ID. */
export function StreamTable({
  streams,
  selectedStreamId,
  onSelect,
}: StreamTableProps): React.JSX.Element {
  const [sort, setSort] = useState<{ key: SortKey; descending: boolean }>({
    key: 'date',
    descending: true,
  });

  const sorted = useMemo(() => {
    const direction = sort.descending ? -1 : 1;
    return [...streams].sort(
      (left, right) =>
        direction * (sortValue(left, sort.key) - sortValue(right, sort.key))
    );
  }, [streams, sort]);

  const peakConcurrent = Math.max(
    1,
    ...streams.map((stream) =>
      metricNumber(stream.metrics.averageConcurrentViewers)
    )
  );

  const toggle = (key: SortKey): void =>
    setSort((current) =>
      current.key === key
        ? { key, descending: !current.descending }
        : { key, descending: true }
    );

  return (
    <div className="table-scroll">
      <table className="data-table stream-table">
        <thead>
          <tr>
            <SortHeader
              label="配信日"
              sortKey="date"
              sort={sort}
              onToggle={toggle}
            />
            <th scope="col">配信</th>
            <th scope="col">ゲーム</th>
            <th scope="col">形式</th>
            <SortHeader
              label="平均同時"
              sortKey="concurrent"
              sort={sort}
              onToggle={toggle}
              numeric
            />
            <th scope="col" className="numeric">
              ピーク
            </th>
            <SortHeader
              label="平均視聴"
              sortKey="retention"
              sort={sort}
              onToggle={toggle}
              numeric
            />
            <SortHeader
              label="成長"
              sortKey="growth"
              sort={sort}
              onToggle={toggle}
              numeric
            />
            <th scope="col" className="numeric">
              チャット
            </th>
            <th scope="col">ID</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((stream) => {
            const growth = GROWTH_METRIC[stream.platform];
            const concurrent = stream.metrics.averageConcurrentViewers;
            const duration = stream.metrics.averageViewDurationSeconds;
            return (
              <tr
                key={stream.id}
                id={`stream-${stream.id}`}
                className={
                  stream.id === selectedStreamId ? 'row selected' : 'row'
                }
                tabIndex={0}
                onClick={() => onSelect(stream.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(stream.id);
                  }
                }}
              >
                <td className="date">{formatDate(stream.publishedAt)}</td>
                <td className="title">
                  <span className={`platform-dot ${stream.platform}`} />
                  {stream.title}
                </td>
                <td>{stream.game.title}</td>
                <td className="muted">{stream.content.format}</td>
                <td className="numeric bar-cell">
                  <span
                    className={`bar-fill ${stream.platform}`}
                    style={{
                      width: `${(metricNumber(concurrent) / peakConcurrent) * 100}%`,
                    }}
                  />
                  <span className="bar-value">{formatMetric(concurrent)}</span>
                </td>
                <td className="numeric">
                  {formatMetric(stream.metrics.peakConcurrentViewers)}
                </td>
                <td className="numeric" title={metricNote(duration)}>
                  {duration.status === 'available' ? (
                    formatMetric(duration, 'duration')
                  ) : (
                    <span className="no-data">取得不可</span>
                  )}
                </td>
                <td className="numeric">
                  {formatMetric(stream.metrics[growth.key])}
                  <small>{growth.label}</small>
                </td>
                <td className="numeric">
                  {formatMetric(stream.metrics.chatMessages)}
                </td>
                <td className="id">
                  <code>{stream.id}</code>
                  <small>{qualityLabel(concurrent)}</small>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SortHeader({
  label,
  sortKey,
  sort,
  onToggle,
  numeric,
}: {
  readonly label: string;
  readonly sortKey: SortKey;
  readonly sort: { key: SortKey; descending: boolean };
  readonly onToggle: (key: SortKey) => void;
  readonly numeric?: boolean;
}): React.JSX.Element {
  const active = sort.key === sortKey;
  return (
    <th
      scope="col"
      className={numeric ? 'numeric sortable' : 'sortable'}
      aria-sort={
        active ? (sort.descending ? 'descending' : 'ascending') : 'none'
      }
    >
      <button type="button" onClick={() => onToggle(sortKey)}>
        {label}
        <span aria-hidden="true">
          {active ? (sort.descending ? '▾' : '▴') : '·'}
        </span>
      </button>
    </th>
  );
}

function sortValue(stream: StreamRecord, key: SortKey): number {
  switch (key) {
    case 'concurrent':
      return metricNumber(stream.metrics.averageConcurrentViewers);
    case 'retention':
      return metricNumber(stream.metrics.averageViewDurationSeconds);
    case 'growth':
      return metricNumber(stream.metrics[GROWTH_METRIC[stream.platform].key]);
    default:
      return Date.parse(stream.publishedAt);
  }
}
