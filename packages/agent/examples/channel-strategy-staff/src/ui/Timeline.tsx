import type { StreamRecord, StreamingPlatform } from '../data/types';
import {
  PLATFORM_LABELS,
  formatDate,
  formatNumber,
  isAvailable,
  metricNumber,
} from './format';

const WIDTH = 980;
const HEIGHT = 210;
const PAD = { top: 12, right: 64, bottom: 24, left: 44 };
const BAR_WIDTH = 8;

interface TimelineProps {
  readonly streams: readonly StreamRecord[];
  readonly since: string;
  readonly until: string;
  readonly selectedStreamId?: string;
  readonly onSelect: (streamId: string) => void;
}

/**
 * Average concurrent viewers over the window. This is the one metric both
 * platforms report, so it is the only series drawn on a shared axis.
 */
export function Timeline({
  streams,
  since,
  until,
  selectedStreamId,
  onSelect,
}: TimelineProps): React.JSX.Element {
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const start = Date.parse(since);
  const end = Date.parse(until);
  const peak = Math.max(
    1,
    ...streams.map((stream) =>
      metricNumber(stream.metrics.averageConcurrentViewers)
    )
  );
  const axisMax = Math.ceil(peak / 100) * 100;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ratio * axisMax);

  const xOf = (iso: string): number =>
    PAD.left + ((Date.parse(iso) - start) / (end - start)) * plotWidth;
  const yOf = (value: number): number =>
    PAD.top + plotHeight - (value / axisMax) * plotHeight;

  const means = (['youtube', 'twitch'] as const)
    .map((platform) => ({ platform, value: meanFor(streams, platform) }))
    .filter((entry) => entry.value > 0);

  return (
    <figure className="chart">
      <figcaption>
        <span>配信ごとの平均同時視聴者数</span>
        <span className="legend">
          <span className="swatch youtube" />
          YouTube
          <span className="swatch twitch" />
          Twitch
          <span className="swatch mean" />
          平均
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`${streams.length}件の配信の平均同時視聴者数。最大${formatNumber(axisMax)}人。`}
      >
        <title>配信ごとの平均同時視聴者数</title>
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              className="grid"
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={yOf(tick)}
              y2={yOf(tick)}
            />
            <text className="axis" x={PAD.left - 8} y={yOf(tick) + 4}>
              {formatNumber(tick)}
            </text>
          </g>
        ))}

        {monthTicks(start, end).map((tick) => (
          <text
            key={tick}
            className="axis month"
            x={xOf(new Date(tick).toISOString())}
            y={HEIGHT - 8}
          >
            {new Date(tick).getUTCMonth() + 1}月
          </text>
        ))}

        {means.map((entry) => (
          <g key={entry.platform}>
            <line
              className={`mean ${entry.platform}`}
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={yOf(entry.value)}
              y2={yOf(entry.value)}
            />
            <text
              className={`mean-label ${entry.platform}`}
              x={WIDTH - PAD.right + 6}
              y={yOf(entry.value) + 4}
            >
              {formatNumber(Math.round(entry.value))}
            </text>
          </g>
        ))}

        {streams.map((stream) => {
          const value = metricNumber(stream.metrics.averageConcurrentViewers);
          const x = xOf(stream.publishedAt) - BAR_WIDTH / 2;
          const y = yOf(value);
          const selected = stream.id === selectedStreamId;
          return (
            <g
              key={stream.id}
              className={`bar ${stream.platform}${selected ? ' selected' : ''}`}
              tabIndex={0}
              onClick={() => onSelect(stream.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(stream.id);
                }
              }}
            >
              <title>
                {`${formatDate(stream.publishedAt)} ${PLATFORM_LABELS[stream.platform]} ${stream.title} — 平均${formatNumber(value)}人`}
              </title>
              <rect
                x={x}
                y={y}
                width={BAR_WIDTH}
                height={Math.max(1, PAD.top + plotHeight - y)}
              />
              {selected ? (
                <rect
                  className="marker"
                  x={x - 2}
                  y={PAD.top}
                  width={BAR_WIDTH + 4}
                  height={plotHeight}
                />
              ) : null}
            </g>
          );
        })}

        <line
          className="axis-line"
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={PAD.top + plotHeight}
          y2={PAD.top + plotHeight}
        />
      </svg>
      <p className="chart-note">
        棒をクリックすると下の一覧で該当配信を選択します。Twitchの平均同時視聴者数はサンプリング値を含みます。
      </p>
    </figure>
  );
}

function meanFor(
  streams: readonly StreamRecord[],
  platform: StreamingPlatform
): number {
  const values = streams
    .filter(
      (stream) =>
        stream.platform === platform &&
        isAvailable(stream.metrics.averageConcurrentViewers)
    )
    .map((stream) => metricNumber(stream.metrics.averageConcurrentViewers));
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function monthTicks(start: number, end: number): number[] {
  const ticks: number[] = [];
  const cursor = new Date(start);
  cursor.setUTCDate(1);
  cursor.setUTCHours(0, 0, 0, 0);
  cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  while (cursor.getTime() <= end) {
    ticks.push(cursor.getTime());
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return ticks;
}
