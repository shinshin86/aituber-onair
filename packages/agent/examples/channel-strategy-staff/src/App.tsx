import type { AgentEvent, AgentRunResult } from '@aituber-onair/agent';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChannelStrategyProposal, ProposalEvidence } from './proposal';
import type { ResolvedStrategyOutcome } from './data/types';
import type { ChannelStrategyServerState } from './protocol';
import {
  createChannelStrategyRuntime,
  type ChannelStrategyRuntime,
} from './runtime';
import { ActivityLog } from './ui/ActivityLog';
import { formatError, formatFullDate } from './ui/format';
import { MikoStaffCard } from './ui/MikoStaffCard';
import { GameTable, PlatformSummary, StrategyList } from './ui/Panels';
import { ProposalView } from './ui/ProposalView';
import { StreamTable } from './ui/StreamTable';
import { Timeline } from './ui/Timeline';

export function App(): React.JSX.Element {
  const runtime = useMemo<ChannelStrategyRuntime>(
    () => createChannelStrategyRuntime(),
    []
  );
  const [state, setState] = useState<ChannelStrategyServerState>();
  const [events, setEvents] = useState<readonly AgentEvent[]>([]);
  const [result, setResult] = useState<AgentRunResult>();
  const [error, setError] = useState<string>();
  const [selectedStreamId, setSelectedStreamId] = useState<string>();
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>();

  useEffect(() => {
    const unsubscribeState = runtime.subscribeState(setState);
    // A Turn may be started by the host scheduler rather than by this browser,
    // so the dashboard rebuilds its view from the Event stream alone.
    const unsubscribeEvents = runtime.subscribeAgentEvents((event) => {
      if (event.type === 'turn.started') {
        setError(undefined);
        setResult(undefined);
        setEvents([event]);
        return;
      }
      setEvents((current) => [...current, event]);
    });
    const unsubscribeResult = runtime.subscribeTurnResult(setResult);
    const unsubscribeError = runtime.subscribeTurnError(setError);
    void runtime
      .initialize()
      .catch((reason: unknown) => setError(formatError(reason)));
    return () => {
      unsubscribeState();
      unsubscribeEvents();
      unsubscribeResult();
      unsubscribeError();
      runtime.close();
    };
  }, [runtime]);

  const selectStream = useCallback((streamId: string) => {
    setSelectedStreamId(streamId);
    setSelectedStrategyId(undefined);
    revealRow(`stream-${streamId}`);
  }, []);

  const selectEvidence = useCallback(
    (evidence: ProposalEvidence) => {
      if (evidence.sourceType === 'stream') {
        selectStream(evidence.sourceId);
        return;
      }
      setSelectedStrategyId(evidence.sourceId);
      setSelectedStreamId(undefined);
      revealRow(`strategy-${evidence.sourceId}`);
    },
    [selectStream]
  );

  const handleRun = async (): Promise<void> => {
    setError(undefined);
    try {
      await runtime.requestStrategy();
    } catch (reason) {
      setError(formatError(reason));
    }
  };

  const handleInterrupt = async (): Promise<void> => {
    setError(undefined);
    try {
      await runtime.interruptStrategy();
    } catch (reason) {
      setError(formatError(reason));
    }
  };

  const handleRecordOutcome = async (
    id: string,
    outcome: ResolvedStrategyOutcome,
    finding: string
  ): Promise<void> => {
    setError(undefined);
    try {
      await runtime.recordProposalOutcome(id, outcome, finding);
    } catch (reason) {
      setError(formatError(reason));
      throw reason;
    }
  };

  const dashboard = state?.dashboard;
  const running = state?.turnActive ?? false;
  const proposal = getProposal(result);

  return (
    <div className="app">
      <header className="appbar">
        <div className="identity">
          <h1>Channel Strategy Staff</h1>
          <code>channel-strategy-miko</code>
        </div>
        <dl className="context">
          <div>
            <dt>基準日</dt>
            <dd>{formatFullDate(dashboard?.referenceDate)}</dd>
          </div>
          <div>
            <dt>集計期間</dt>
            <dd>{dashboard ? `${dashboard.days}日` : '—'}</dd>
          </div>
          <div>
            <dt>自動実行</dt>
            <dd>{formatSchedule(state)}</dd>
          </div>
          <div>
            <dt>バックエンド</dt>
            <dd>
              {state
                ? state.mode === 'demo'
                  ? 'fixture Codex'
                  : 'Codex'
                : '—'}
              {state ? <small>{state.model}</small> : null}
            </dd>
          </div>
        </dl>
        <div className="turn-controls">
          <button
            className="run"
            type="button"
            disabled={running || !state}
            onClick={() => void handleRun()}
          >
            {running ? '分析中…' : '今すぐ再分析'}
          </button>
          {running ? (
            <button
              className="interrupt"
              type="button"
              onClick={() => void handleInterrupt()}
            >
              中断
            </button>
          ) : null}
        </div>
      </header>

      {error ? <p className="error">{error}</p> : null}

      {dashboard ? (
        <main>
          <section className="block">
            <div className="block-head">
              <h2>プラットフォーム別サマリ</h2>
              <p>
                登録者とフォロワーは別単位のため合算しません。取得できない指標は
                0ではなく「取得不可」として扱います。
              </p>
            </div>
            <div className="summary-grid">
              {dashboard.platforms.map((overview) => (
                <PlatformSummary key={overview.platform} overview={overview} />
              ))}
            </div>
          </section>

          <section className="block">
            <div className="block-head">
              <h2>配信タイムライン</h2>
              <p>
                {formatFullDate(dashboard.since)} 〜{' '}
                {formatFullDate(dashboard.referenceDate)} の{' '}
                {dashboard.streams.length} 配信
              </p>
            </div>
            <Timeline
              streams={dashboard.streams}
              since={dashboard.since}
              until={dashboard.referenceDate}
              selectedStreamId={selectedStreamId}
              onSelect={selectStream}
            />
          </section>

          <section className="block">
            <div className="block-head">
              <h2>ゲーム × プラットフォーム</h2>
              <p>Codexへ渡すJSONと同じ決定的な集計結果です。</p>
            </div>
            <GameTable games={dashboard.games} />
          </section>

          <section className="block">
            <div className="block-head">
              <h2>配信一覧</h2>
              <p>見出しをクリックすると並び替えます。</p>
            </div>
            <StreamTable
              streams={dashboard.streams}
              selectedStreamId={selectedStreamId}
              onSelect={selectStream}
            />
          </section>

          <div className="split">
            <section className="block">
              <div className="block-head">
                <h2>過去の仮説と結果</h2>
                <p>反証済みの仮説を繰り返さないための記録です。</p>
              </div>
              <StrategyList
                strategies={dashboard.strategies}
                selectedId={selectedStrategyId}
                onSelectStream={selectStream}
                onRecordOutcome={handleRecordOutcome}
              />
            </section>

            <section className="block">
              <div className="block-head">
                <h2>実行ログ</h2>
                <p>Turn完了後に届くCodexの調査Artifactです。</p>
              </div>
              <ActivityLog
                events={events}
                turnActive={running}
                threadTurnCount={state?.threadTurnCount ?? 0}
                lastTurnDurationMs={state?.lastTurnDurationMs}
              />
            </section>
          </div>

          <section className="block proposal-block" aria-live="polite">
            <div className="block-head">
              <h2>次回配信の提案</h2>
              <p>
                {proposal
                  ? '根拠IDをクリックすると該当レコードへ移動します。'
                  : '現在のデータセットに存在するIDだけを根拠として受け付けます。'}
              </p>
            </div>
            {proposal ? (
              <ProposalView
                proposal={proposal}
                onSelectEvidence={selectEvidence}
              />
            ) : (
              <p className="empty">
                {running
                  ? 'Agentがデータを調査しています。'
                  : '「次回配信を分析」を実行すると、検証済みのArtifactがここに表示されます。'}
              </p>
            )}
          </section>
        </main>
      ) : (
        <p className="empty">{error ? '' : 'サーバへ接続しています…'}</p>
      )}

      <MikoStaffCard
        events={events}
        turnActive={running}
        nextRunAt={state?.schedule.nextRunAt}
      />
    </div>
  );
}

function formatSchedule(state: ChannelStrategyServerState | undefined): string {
  if (!state) return '—';
  const { intervalMs } = state.schedule;
  if (intervalMs <= 0) return '手動のみ';
  return `${Math.round(intervalMs / 1000)}秒ごと`;
}

/**
 * Runs after the browser has finished scrolling the clicked control into
 * view; otherwise that focus scroll cancels this one.
 */
function revealRow(elementId: string): void {
  requestAnimationFrame(() => {
    document
      .getElementById(elementId)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
}

function getProposal(
  result: AgentRunResult | undefined
): ChannelStrategyProposal | undefined {
  const artifact = result?.artifacts.find(
    (candidate) => candidate.type === 'channel-strategy-proposal'
  );
  return artifact?.data as unknown as ChannelStrategyProposal | undefined;
}
