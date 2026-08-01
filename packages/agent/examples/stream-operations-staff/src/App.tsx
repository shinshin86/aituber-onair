import {
  type CommentIntelligenceResult,
  createCommentIntelligence,
} from '@aituber-onair/comment-intelligence';
import { useEffect, useMemo, useState } from 'react';
import AvatarCanvas from './components/AvatarCanvas';
import {
  AGENT_EVENTS,
  COMMENTS,
  REPORTS,
  REPORT_ARTIFACT,
  STREAM_TITLE,
  TOOL_RUNS,
  formatElapsed,
} from './fixtures';
import {
  type AivisConnectionState,
  type MikoVoiceEngine,
  useMikoVoice,
} from './hooks/useMikoVoice';
import {
  type PuruPuruEmotionEffect,
  type PuruPuruReaction,
  createPuruPuruReactionFromEmotion,
  withReactionId,
} from './lib/purupuruReactions';
import {
  type BottomTab,
  type DemoPhase,
  type FixtureComment,
  type FixtureReport,
  MIKO_PROFILE,
  type RulesSnapshot,
  type StaffPhase,
} from './types';

const SPEEDS = [1, 2, 4] as const;

const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  twitch: 'Twitch',
  web: 'Web',
};

const getStaffPhase = (
  phase: DemoPhase,
  analyzing: boolean,
  safetyAttention: boolean
): StaffPhase => {
  if (phase === 'pre') return '配信開始前';
  if (phase === 'paused') return '一時停止中';
  if (phase === 'ending') return '配信終了処理中';
  if (phase === 'complete') return '配信後レポート完成';
  if (phase === 'error') return '分析エラー';
  if (safetyAttention) return '安全性注意発生';
  if (analyzing) return 'コメント分析中';
  return 'コメント監視中';
};

const isSafetyComment = (comment: FixtureComment) =>
  comment.attention === '安全性注意';

const getMikoAvatarState = (
  phase: StaffPhase
): { label: string; reaction: PuruPuruReaction | null } => {
  let effect: PuruPuruEmotionEffect | null = null;
  let label = 'ニュートラル';
  let id = 0;

  if (phase === 'コメント分析中') {
    effect = 'thinking';
    label = '思考中';
    id = 1;
  } else if (phase === '安全性注意発生') {
    effect = 'sad';
    label = '懸念';
    id = 2;
  } else if (phase === '配信終了処理中' || phase === '配信後レポート完成') {
    effect = 'happy';
    label = 'ポジティブ';
    id = 3;
  }

  const draft = effect ? createPuruPuruReactionFromEmotion(effect) : null;
  return {
    label,
    reaction: draft ? withReactionId(draft, id) : null,
  };
};

function App() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [phase, setPhase] = useState<DemoPhase>('pre');
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [runId, setRunId] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [safetyAttention, setSafetyAttention] = useState(false);
  const [bottomTab, setBottomTab] = useState<BottomTab>('events');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(
    null
  );
  const [acknowledgedIds, setAcknowledgedIds] = useState<readonly string[]>([]);
  const [rulesSnapshot, setRulesSnapshot] = useState<RulesSnapshot>({
    result: null,
    pending: false,
    error: null,
  });

  const intelligence = useMemo(() => {
    void runId;
    return createCommentIntelligence({
      analysis: { mode: 'rules' },
      ranking: { strategy: 'chaos-resistant', maxSelectedComments: 8 },
      context: { language: 'ja', style: 'aituber-live' },
      viewerSafety: { enabled: true, blockOnHighRisk: true },
    });
  }, [runId]);

  const visibleComments = useMemo(
    () => COMMENTS.slice(0, visibleCount),
    [visibleCount]
  );
  const visibleReports = useMemo(
    () =>
      [...REPORTS.filter((report) => report.atCount <= visibleCount)].reverse(),
    [visibleCount]
  );
  const mikoVoice = useMikoVoice({
    reports: visibleReports,
    phase,
    runId,
  });
  const elapsedSeconds = visibleComments.at(-1)?.atSeconds ?? 0;
  const questionCount = visibleComments.filter((comment) =>
    comment.labels.includes('質問')
  ).length;
  const answeredQuestionIds = new Set(['c02', 'c05', 'c10']);
  const unansweredCount = visibleComments.filter(
    (comment) =>
      comment.labels.includes('質問') && !answeredQuestionIds.has(comment.id)
  ).length;
  const fixtureFlaggedCount = visibleComments.filter(isSafetyComment).length;
  const flaggedCount = rulesSnapshot.result
    ? rulesSnapshot.result.safetyReports.filter(
        (report) => report.riskLevel === 'medium' || report.riskLevel === 'high'
      ).length
    : fixtureFlaggedCount;
  const commentsPerMinute =
    elapsedSeconds > 0
      ? Math.round((visibleComments.length / elapsedSeconds) * 60)
      : 0;
  const staffPhase = getStaffPhase(phase, analyzing, safetyAttention);
  const mikoAvatarState = useMemo(
    () => getMikoAvatarState(staffPhase),
    [staffPhase]
  );

  const selectedReport = REPORTS.find(
    (report) => report.id === selectedReportId
  );
  const evidenceIds = selectedReport?.evidenceIds ?? [];
  const linkedReportIds = selectedCommentId
    ? REPORTS.filter((report) =>
        report.evidenceIds.includes(selectedCommentId)
      ).map((report) => report.id)
    : [];

  useEffect(() => {
    if (phase !== 'monitoring' || visibleCount >= COMMENTS.length) return;
    const timer = window.setTimeout(() => {
      setVisibleCount((count) => Math.min(count + 1, COMMENTS.length));
    }, 1_200 / speed);
    return () => window.clearTimeout(timer);
  }, [phase, speed, visibleCount]);

  useEffect(() => {
    void runId;
    if (phase !== 'ending') return;
    const timer = window.setTimeout(() => setPhase('complete'), 1_100);
    return () => window.clearTimeout(timer);
  }, [phase, runId]);

  useEffect(() => {
    if (visibleCount === 0 || phase !== 'monitoring') return;
    const latestComment = COMMENTS[visibleCount - 1];
    setAnalyzing(true);
    const analysisTimer = window.setTimeout(
      () => setAnalyzing(false),
      Math.max(120, 360 / speed)
    );

    let safetyTimer = 0;
    if (isSafetyComment(latestComment)) {
      setSafetyAttention(true);
      safetyTimer = window.setTimeout(
        () => setSafetyAttention(false),
        Math.max(400, 1_000 / speed)
      );
    } else {
      setSafetyAttention(false);
    }

    let recoveryTimer = 0;
    if (latestComment.simulateAnalysisError) {
      setPhase('error');
      recoveryTimer = window.setTimeout(() => setPhase('monitoring'), 900);
    }

    return () => {
      window.clearTimeout(analysisTimer);
      window.clearTimeout(safetyTimer);
      window.clearTimeout(recoveryTimer);
    };
  }, [phase, speed, visibleCount]);

  useEffect(() => {
    let active = true;
    if (visibleComments.length === 0) {
      setRulesSnapshot({ result: null, pending: false, error: null });
      return;
    }

    setRulesSnapshot((current) => ({ ...current, pending: true, error: null }));
    intelligence
      .analyze({
        comments: [...visibleComments],
        streamState: {
          platform: 'youtube',
          mode: 'live',
          language: 'ja',
          title: STREAM_TITLE,
          topic: '配信画面制作',
        },
      })
      .then((result: CommentIntelligenceResult) => {
        if (active) setRulesSnapshot({ result, pending: false, error: null });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setRulesSnapshot({
          result: null,
          pending: false,
          error: error instanceof Error ? error.message : 'rules mode error',
        });
      });

    return () => {
      active = false;
    };
  }, [intelligence, visibleComments]);

  const togglePlayback = () => {
    if (phase === 'pre' || phase === 'paused') {
      setPhase('monitoring');
      return;
    }
    if (phase === 'monitoring') setPhase('paused');
  };

  const resetDemo = () => {
    setVisibleCount(0);
    setPhase('pre');
    setRunId((id) => id + 1);
    setAnalyzing(false);
    setSafetyAttention(false);
    setBottomTab('events');
    setSelectedReportId(null);
    setSelectedCommentId(null);
    setAcknowledgedIds([]);
  };

  const endStream = () => {
    if (phase === 'pre' || phase === 'ending' || phase === 'complete') return;
    setPhase('ending');
    setBottomTab('report');
  };

  const showEvidence = (report: FixtureReport) => {
    setSelectedReportId(report.id);
    setSelectedCommentId(null);
    window.requestAnimationFrame(() => {
      document
        .querySelector(`[data-comment-id="${report.evidenceIds[0]}"]`)
        ?.scrollIntoView({ block: 'center' });
    });
  };

  const showLinkedReports = (commentId: string) => {
    setSelectedCommentId(commentId);
    setSelectedReportId(null);
    const linkedReport = REPORTS.find((report) =>
      report.evidenceIds.includes(commentId)
    );
    if (linkedReport) {
      window.requestAnimationFrame(() => {
        document
          .querySelector(`[data-report-id="${linkedReport.id}"]`)
          ?.scrollIntoView({ block: 'center' });
      });
    }
  };

  const clearTrace = () => {
    setSelectedCommentId(null);
    setSelectedReportId(null);
  };

  const toggleAcknowledged = (reportId: string) => {
    setAcknowledgedIds((ids) =>
      ids.includes(reportId)
        ? ids.filter((id) => id !== reportId)
        : [...ids, reportId]
    );
  };

  const safetyLevel =
    flaggedCount >= 2 ? '注意' : flaggedCount === 1 ? '確認' : '安定';

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="stream-identity">
          <div className="eyebrow-row">
            <span className="live-badge" aria-label="ライブ配信中">
              <span aria-hidden="true">●</span> LIVE
            </span>
            <span
              className="elapsed"
              aria-label={`経過時間 ${formatElapsed(elapsedSeconds)}`}
            >
              {formatElapsed(elapsedSeconds)}
            </span>
            <span className="staff-inline">
              <img src="/avatar/thumbnail.png" alt="" aria-hidden="true" />
              Miko · {staffPhase}
            </span>
          </div>
          <h1>{STREAM_TITLE}</h1>
        </div>

        <dl className="stream-stats" aria-label="配信統計">
          <Stat label="コメント" value={visibleComments.length.toString()} />
          <Stat label="件/分" value={commentsPerMinute.toString()} />
          <Stat label="未回答" value={unansweredCount.toString()} tone="warn" />
          <Stat
            label="要注意"
            value={flaggedCount.toString()}
            tone={flaggedCount > 0 ? 'danger' : 'ok'}
          />
          <Stat
            label="安全性"
            value={safetyLevel}
            tone={flaggedCount > 0 ? 'warn' : 'ok'}
          />
        </dl>

        <div className="stream-controls" aria-label="再生コントロール">
          <button
            type="button"
            className="primary-control"
            onClick={togglePlayback}
            disabled={
              phase === 'ending' || phase === 'complete' || phase === 'error'
            }
            aria-label={
              phase === 'monitoring'
                ? 'フィクスチャ再生を一時停止'
                : 'フィクスチャ再生を開始'
            }
          >
            <span aria-hidden="true">{phase === 'monitoring' ? 'Ⅱ' : '▶'}</span>
            {phase === 'monitoring' ? '一時停止' : '再生'}
          </button>
          <div className="speed-group" aria-label="再生速度">
            {SPEEDS.map((item) => (
              <button
                type="button"
                key={item}
                className={speed === item ? 'is-active' : ''}
                onClick={() => setSpeed(item)}
                aria-pressed={speed === item}
              >
                {item}x
              </button>
            ))}
          </div>
          <button type="button" className="quiet-control" onClick={resetDemo}>
            ↺ リセット
          </button>
          <button
            type="button"
            className="end-control"
            onClick={endStream}
            disabled={
              phase === 'pre' || phase === 'ending' || phase === 'complete'
            }
          >
            ◼ 配信を終了してレポート作成
          </button>
        </div>
      </header>

      <output className="connection-strip" aria-live="polite">
        <span className={`state-dot state-${phase}`} aria-hidden="true" />
        <strong>{staffPhase}</strong>
        <span>固定フィクスチャ #{runId + 1}</span>
        <span className="rules-status">
          {rulesSnapshot.pending
            ? 'rules mode 分析中'
            : rulesSnapshot.error
              ? 'rules mode エラー'
              : 'comment-intelligence · rules mode'}
        </span>
        {(selectedCommentId || selectedReportId) && (
          <button type="button" className="trace-clear" onClick={clearTrace}>
            根拠ハイライトを解除
          </button>
        )}
      </output>

      <section className="dashboard-grid" aria-label="配信運営ダッシュボード">
        <section
          className="panel comments-panel"
          aria-labelledby="comments-heading"
        >
          <PanelHeading
            eyebrow="LIVE INPUT"
            title="コメントタイムライン"
            meta={`${visibleComments.length}件`}
            id="comments-heading"
          />
          <div className="panel-scroll comments-list" aria-live="polite">
            {visibleComments.length === 0 ? (
              <EmptyState
                icon="⌁"
                title="コメントを待っています"
                body="再生すると、同じ順序・同じ時刻でフィクスチャが流れます。"
              />
            ) : (
              [...visibleComments]
                .reverse()
                .map((comment) => (
                  <CommentCard
                    key={comment.id}
                    comment={comment}
                    selected={selectedCommentId === comment.id}
                    evidence={evidenceIds.includes(comment.id)}
                    onSelect={() => showLinkedReports(comment.id)}
                  />
                ))
            )}
          </div>
        </section>

        <section
          className="panel briefing-panel"
          aria-labelledby="briefing-heading"
        >
          <div className="staff-card">
            <AvatarCanvas
              reaction={mikoAvatarState.reaction}
              stateLabel={mikoAvatarState.label}
              isSpeaking={mikoVoice.isSpeaking}
            />
            <div className="staff-copy">
              <span className="staff-kicker">AI STAFF BRIEFING</span>
              <h2 id="briefing-heading">{MIKO_PROFILE.name}</h2>
              <p>{MIKO_PROFILE.role}</p>
              <VoiceSpeakingIndicator
                engine={mikoVoice.engine}
                isSpeaking={mikoVoice.isSpeaking}
                reportKind={mikoVoice.speakingReportKind}
                notice={mikoVoice.voiceNotice}
              />
            </div>
            <span
              className={`staff-state state-${phase}`}
              aria-label={`Mikoの状態 ${staffPhase}`}
            >
              <span aria-hidden="true">●</span> {staffPhase}
            </span>
          </div>

          <VoiceControls
            engine={mikoVoice.engine}
            onEngineChange={mikoVoice.setEngine}
            webVoiceLabel={mikoVoice.webVoice?.label ?? null}
            aivisState={mikoVoice.aivisState}
            aivisVoices={mikoVoice.aivisVoices}
            aivisSpeaker={mikoVoice.aivisSpeaker}
            onAivisSpeakerChange={mikoVoice.selectAivisSpeaker}
            onRefreshAivis={mikoVoice.refreshAivis}
            error={mikoVoice.voiceError}
          />

          <div className="briefing-summary">
            <div>
              <span>観測カード</span>
              <strong>{visibleReports.length}</strong>
            </div>
            <div>
              <span>未確認</span>
              <strong>{visibleReports.length - acknowledgedIds.length}</strong>
            </div>
            <p>
              観測はデータ上の事実、提案は Miko の運営案として分けて表示します。
            </p>
          </div>

          <div className="panel-scroll report-list" aria-live="polite">
            {visibleReports.length === 0 ? (
              <EmptyState
                icon="◇"
                title="ブリーフィングはまだありません"
                body="コメントが届くと、根拠を持つ観測カードがここに作成されます。"
              />
            ) : (
              visibleReports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  highlighted={
                    selectedReportId === report.id ||
                    linkedReportIds.includes(report.id)
                  }
                  acknowledged={acknowledgedIds.includes(report.id)}
                  onEvidence={() => showEvidence(report)}
                  onAcknowledge={() => toggleAcknowledged(report.id)}
                />
              ))
            )}
          </div>
        </section>

        <StreamPulse
          visibleComments={visibleComments}
          questionCount={questionCount}
          unansweredCount={unansweredCount}
          flaggedCount={flaggedCount}
        />
      </section>

      <BottomPanel
        tab={bottomTab}
        setTab={setBottomTab}
        phase={phase}
        visibleCount={visibleCount}
        onCommentEvidence={showLinkedReports}
      />
    </main>
  );
}

function VoiceSpeakingIndicator({
  engine,
  isSpeaking,
  reportKind,
  notice,
}: {
  engine: MikoVoiceEngine;
  isSpeaking: boolean;
  reportKind: string | null;
  notice: string | null;
}) {
  const engineLabel =
    engine === 'webSpeech'
      ? 'ブラウザ標準'
      : engine === 'aivisSpeech'
        ? 'AivisSpeech'
        : '';
  const label = isSpeaking
    ? `発話中${reportKind ? ` · ${reportKind}` : ''}`
    : engine === 'off'
      ? '音声 OFF'
      : `音声待機中 · ${engineLabel}`;

  return (
    <div className="voice-status-stack">
      <output
        className={`voice-indicator${isSpeaking ? ' is-speaking' : ''}`}
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="voice-bars" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <strong>{label}</strong>
      </output>
      {notice && (
        <output
          className="voice-timeout-notice"
          aria-live="polite"
          aria-atomic="true"
        >
          <span aria-hidden="true">!</span>
          {notice}
        </output>
      )}
    </div>
  );
}

function VoiceControls({
  engine,
  onEngineChange,
  webVoiceLabel,
  aivisState,
  aivisVoices,
  aivisSpeaker,
  onAivisSpeakerChange,
  onRefreshAivis,
  error,
}: {
  engine: MikoVoiceEngine;
  onEngineChange: (engine: MikoVoiceEngine) => void;
  webVoiceLabel: string | null;
  aivisState: AivisConnectionState;
  aivisVoices: readonly { id: string; label: string }[];
  aivisSpeaker: string;
  onAivisSpeakerChange: (speaker: string) => void;
  onRefreshAivis: () => Promise<void>;
  error: string | null;
}) {
  const aivisStatus =
    aivisState === 'checking'
      ? '確認中…'
      : aivisState === 'available'
        ? '接続済み'
        : '起動していません';

  return (
    <section className="voice-controls" aria-label="Mikoの音声設定">
      <div className="voice-field">
        <label htmlFor="miko-voice-engine">Mikoの音声</label>
        <select
          id="miko-voice-engine"
          value={engine}
          onChange={(event) =>
            onEngineChange(event.target.value as MikoVoiceEngine)
          }
        >
          <option value="off">OFF</option>
          <option value="webSpeech">ブラウザ標準（Web Speech）</option>
          <option value="aivisSpeech" disabled={aivisState !== 'available'}>
            AivisSpeech（ローカル）
          </option>
        </select>
      </div>

      {engine === 'aivisSpeech' && aivisState === 'available' && (
        <div className="voice-field voice-field-speaker">
          <label htmlFor="miko-aivis-speaker">話者</label>
          <select
            id="miko-aivis-speaker"
            value={aivisSpeaker}
            onChange={(event) => onAivisSpeakerChange(event.target.value)}
          >
            {aivisVoices.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <output className={`voice-source-status voice-source-${aivisState}`}>
        <span aria-hidden="true">●</span>
        AivisSpeech: {aivisStatus}
      </output>
      <button
        type="button"
        className="voice-refresh"
        onClick={() => void onRefreshAivis()}
        disabled={aivisState === 'checking'}
      >
        再確認
      </button>

      {engine === 'webSpeech' && (
        <p className="voice-detail">
          {webVoiceLabel
            ? `日本語音声: ${webVoiceLabel}`
            : '日本語（ja-JP）をブラウザに指定'}
        </p>
      )}
      {error && (
        <p className="voice-error" role="alert">
          音声エラー: {error}
        </p>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'ok' | 'warn' | 'danger';
}) {
  return (
    <div className={`stat stat-${tone}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function PanelHeading({
  eyebrow,
  title,
  meta,
  id,
}: {
  eyebrow: string;
  title: string;
  meta: string;
  id: string;
}) {
  return (
    <div className="panel-heading">
      <div>
        <span>{eyebrow}</span>
        <h2 id={id}>{title}</h2>
      </div>
      <span className="count-badge">{meta}</span>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  body,
}: { icon: string; title: string; body: string }) {
  return (
    <div className="empty-state">
      <span aria-hidden="true">{icon}</span>
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function CommentCard({
  comment,
  selected,
  evidence,
  onSelect,
}: {
  comment: FixtureComment;
  selected: boolean;
  evidence: boolean;
  onSelect: () => void;
}) {
  const flagged = isSafetyComment(comment);

  return (
    <button
      type="button"
      className={`comment-card ${flagged ? 'is-flagged' : ''} ${selected ? 'is-selected' : ''} ${evidence ? 'is-evidence' : ''}`}
      onClick={onSelect}
      aria-pressed={selected || evidence}
      aria-label={`${comment.author.name}のコメント。関連する観測カードを表示`}
      data-comment-id={comment.id}
    >
      <span className="comment-meta">
        <strong>{comment.author.name}</strong>
        <span>{formatElapsed(comment.atSeconds)}</span>
        <span className={`platform platform-${comment.platform}`}>
          {PLATFORM_LABELS[comment.platform ?? 'web'] ?? 'Web'}
        </span>
        {comment.repeatCount && (
          <span className="repeat-badge">まとめて {comment.repeatCount}件</span>
        )}
      </span>
      <span className={`comment-body${flagged ? ' muted-body' : ''}`}>
        {comment.displayBody ?? comment.text}
      </span>
      <span className="comment-labels">
        {comment.labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
        <span className={`attention attention-${comment.attention}`}>
          {comment.attention === '安全性注意' ? '⚠ ' : '● '}
          {comment.attention}
        </span>
      </span>
    </button>
  );
}

function ReportCard({
  report,
  highlighted,
  acknowledged,
  onEvidence,
  onAcknowledge,
}: {
  report: FixtureReport;
  highlighted: boolean;
  acknowledged: boolean;
  onEvidence: () => void;
  onAcknowledge: () => void;
}) {
  return (
    <article
      className={`report-card severity-${report.severity} ${highlighted ? 'is-linked' : ''}`}
      data-report-id={report.id}
    >
      <div className="report-card-head">
        <span className="report-kind">{report.kind}</span>
        <span className={`severity-badge severity-${report.severity}`}>
          重要度 {report.severity}
        </span>
        <time>{report.time}</time>
      </div>
      <div className="fact-suggestion fact-block">
        <span>観測 · DATA</span>
        <p>{report.observation}</p>
      </div>
      <div className="fact-suggestion suggestion-block">
        <span>提案 · MIKO</span>
        <p>{report.suggestion}</p>
      </div>
      <div className="report-card-actions">
        <span className="evidence-count">
          根拠 {report.evidenceIds.length}件
        </span>
        <button
          type="button"
          onClick={onEvidence}
          aria-label={`${report.kind}の根拠コメントを表示`}
        >
          ⌁ 根拠を表示
        </button>
        <button
          type="button"
          className={acknowledged ? 'is-acknowledged' : ''}
          onClick={onAcknowledge}
          aria-pressed={acknowledged}
        >
          {acknowledged ? '✓ 確認済み' : '○ 確認済みにする'}
        </button>
      </div>
    </article>
  );
}

function StreamPulse({
  visibleComments,
  questionCount,
  unansweredCount,
  flaggedCount,
}: {
  visibleComments: readonly FixtureComment[];
  questionCount: number;
  unansweredCount: number;
  flaggedCount: number;
}) {
  const total = Math.max(visibleComments.length, 1);
  const positiveCount = visibleComments.filter((comment) =>
    ['c01', 'c08', 'c09', 'c14', 'c15', 'c16'].includes(comment.id)
  ).length;
  const concernCount = visibleComments.filter(
    (comment) =>
      isSafetyComment(comment) ||
      comment.labels.includes('建設的なフィードバック')
  ).length;
  const neutralCount = Math.max(
    visibleComments.length - positiveCount - concernCount,
    0
  );
  const reactions = [
    { label: '好意的', value: positiveCount, className: 'positive' },
    { label: '中立', value: neutralCount, className: 'neutral' },
    { label: '懸念', value: concernCount, className: 'concern' },
  ];
  const safetyBars = [
    { id: 'early-1', height: 8 },
    { id: 'early-2', height: 10 },
    { id: 'attention-1', height: flaggedCount > 0 ? 46 : 12 },
    { id: 'attention-2', height: flaggedCount > 1 ? 72 : 14 },
    { id: 'recovery-1', height: 22 },
    { id: 'recovery-2', height: 16 },
    { id: 'current', height: 12 },
  ];

  return (
    <aside className="panel pulse-panel" aria-labelledby="pulse-heading">
      <PanelHeading
        eyebrow="STREAM PULSE"
        title="視聴者の反応"
        meta="LIVE"
        id="pulse-heading"
      />
      <div className="pulse-content">
        <section className="pulse-section" aria-labelledby="reaction-heading">
          <div className="section-label-row">
            <h3 id="reaction-heading">リアクション分布</h3>
            <span>{visibleComments.length} comments</span>
          </div>
          <div className="reaction-bars">
            {reactions.map((reaction) => (
              <div className="reaction-row" key={reaction.label}>
                <span>{reaction.label}</span>
                <div
                  className="bar-track"
                  aria-label={`${reaction.label} ${reaction.value}件`}
                >
                  <span
                    className={`bar-fill ${reaction.className}`}
                    style={{ width: `${(reaction.value / total) * 100}%` }}
                  />
                </div>
                <strong>{reaction.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section
          className="pulse-section topics-section"
          aria-labelledby="topics-heading"
        >
          <div className="section-label-row">
            <h3 id="topics-heading">話題の動き</h3>
          </div>
          <PulseRow
            label="現在の中心"
            value={
              visibleComments.length >= 8
                ? 'トランジション制作'
                : '待機画面づくり'
            }
          />
          <PulseRow
            label="上昇中"
            value={
              visibleComments.length >= 14
                ? '配色の決め方 ↑'
                : visibleComments.length >= 8
                  ? '手描き演出 ↑'
                  : '—'
            }
            tone="accent"
          />
          <PulseRow
            label="繰り返し質問"
            value={`制作ソフト · ${Math.min(questionCount, 3)}件`}
            badge={Math.min(questionCount, 3)}
          />
          <PulseRow
            label="重要な未回答"
            value={unansweredCount > 0 ? 'ライセンス条件' : '—'}
            badge={unansweredCount}
            tone={unansweredCount > 0 ? 'warn' : 'default'}
          />
          <PulseRow
            label="建設的FB"
            value={
              visibleComments.length >= 11
                ? '音量・話す速さ'
                : visibleComments.length >= 3
                  ? 'BGM音量'
                  : '—'
            }
          />
        </section>

        <section
          className="pulse-section safety-section"
          aria-labelledby="safety-heading"
        >
          <div className="section-label-row">
            <h3 id="safety-heading">安全性トレンド</h3>
            <span className={flaggedCount > 0 ? 'trend-warn' : 'trend-ok'}>
              {flaggedCount > 0 ? `⚠ 注意 ${flaggedCount}件` : '✓ 安定'}
            </span>
          </div>
          <div className="mini-chart" aria-label="安全性注意の推移">
            {safetyBars.map((bar) => (
              <span key={bar.id} style={{ height: `${bar.height}%` }} />
            ))}
          </div>
          <p>攻撃的な本文は増幅せず、件数と傾向だけを運営向けに表示します。</p>
        </section>
      </div>
    </aside>
  );
}

function PulseRow({
  label,
  value,
  badge,
  tone = 'default',
}: {
  label: string;
  value: string;
  badge?: number;
  tone?: 'default' | 'accent' | 'warn';
}) {
  return (
    <div className={`pulse-row pulse-row-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {badge !== undefined && <span className="small-count">{badge}</span>}
    </div>
  );
}

function BottomPanel({
  tab,
  setTab,
  phase,
  visibleCount,
  onCommentEvidence,
}: {
  tab: BottomTab;
  setTab: (tab: BottomTab) => void;
  phase: DemoPhase;
  visibleCount: number;
  onCommentEvidence: (commentId: string) => void;
}) {
  const tabs: readonly { id: BottomTab; label: string }[] = [
    { id: 'events', label: 'Agent Event' },
    { id: 'tools', label: 'Tool Activity' },
    { id: 'report', label: '配信後レポート' },
  ];
  const events = [
    ...AGENT_EVENTS.filter((event) => event.atCount <= visibleCount),
  ].reverse();
  const tools = [
    ...TOOL_RUNS.filter((run) => run.atCount <= visibleCount),
  ].reverse();

  return (
    <section
      className="panel bottom-panel"
      aria-label="運営ログと配信後レポート"
    >
      <div className="tabs" role="tablist" aria-label="下部パネル">
        {tabs.map((item) => (
          <button
            type="button"
            role="tab"
            key={item.id}
            aria-selected={tab === item.id}
            aria-controls={`panel-${item.id}`}
            id={`tab-${item.id}`}
            className={tab === item.id ? 'is-active' : ''}
            onClick={() => setTab(item.id)}
          >
            {item.label}
            {item.id === 'events' && <span>{events.length}</span>}
            {item.id === 'tools' && (
              <span>{tools.length + (phase === 'complete' ? 1 : 0)}</span>
            )}
            {item.id === 'report' && phase === 'complete' && <span>完成</span>}
          </button>
        ))}
      </div>

      <div
        className="tab-content"
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
      >
        {tab === 'events' && (
          <div className="event-grid">
            {events.length === 0 ? (
              <EmptyState
                icon="···"
                title="イベント待機中"
                body="内部思考ではなく、公開可能な実行イベントだけを表示します。"
              />
            ) : (
              events.map((event) => (
                <div className="event-row" key={event.id}>
                  <time>{event.time}</time>
                  <code>{event.type}</code>
                  <span>{event.summary}</span>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'tools' && (
          <div className="tool-grid">
            {tools.length === 0 ? (
              <EmptyState
                icon="◇"
                title="ツール実行待機中"
                body="comments.analyze の実行状態と結果だけを表示します。"
              />
            ) : (
              <>
                {phase === 'complete' && (
                  <ToolActivityRow
                    name="report.submit"
                    time="02:20"
                    state="完了"
                    result={`成果物 ${REPORT_ARTIFACT.id} を作成（外部送信なし）`}
                  />
                )}
                {tools.map((tool) => (
                  <ToolActivityRow key={tool.id} {...tool} />
                ))}
              </>
            )}
          </div>
        )}

        {tab === 'report' && (
          <PostStreamReport
            phase={phase}
            onCommentEvidence={onCommentEvidence}
          />
        )}
      </div>
    </section>
  );
}

function ToolActivityRow({
  name,
  time,
  state,
  result,
}: {
  name: string;
  time: string;
  state: '完了' | '実行中' | 'エラー';
  result: string;
}) {
  return (
    <div className="tool-row">
      <code>{name}</code>
      <time>{time}</time>
      <span className={`tool-state tool-${state}`}>
        {state === 'エラー' ? '⚠' : '✓'} {state}
      </span>
      <p>{result}</p>
    </div>
  );
}

function PostStreamReport({
  phase,
  onCommentEvidence,
}: {
  phase: DemoPhase;
  onCommentEvidence: (commentId: string) => void;
}) {
  if (phase === 'ending') {
    return (
      <output className="report-processing">
        <span className="processing-mark" aria-hidden="true">
          ◇
        </span>
        <div>
          <strong>配信終了処理中</strong>
          <p>固定データを集計し、観測と提案を分離しています。</p>
        </div>
      </output>
    );
  }

  if (phase !== 'complete') {
    return (
      <EmptyState
        icon="□"
        title="配信後レポートはまだありません"
        body="ヘッダーの「配信を終了してレポート作成」から、構造化されたレポートを生成できます。"
      />
    );
  }

  const evidenceIds = REPORT_ARTIFACT.data.evidenceCommentIds;
  return (
    <div className="post-report">
      <div className="post-report-header">
        <div>
          <span>STREAM REPORT · FIXTURE</span>
          <h2>配信後レポート</h2>
        </div>
        <span className="complete-badge">✓ 作成完了 · 外部送信なし</span>
      </div>

      <section className="overall-summary">
        <span>全体サマリー · 観測</span>
        <p>
          固定フィクスチャ16件を分析。制作ソフトへの質問が3件、具体的な改善提案が2件、安全性注意が2件ありました。後半は配色とブラシ設定へ関心が移りました。
        </p>
      </section>

      <div className="report-sections">
        <ReportSection
          title="視聴者の反応"
          items={[
            'トランジションへの肯定的反応が2件連続',
            '落ち着いた画面への好意的反応',
          ]}
        />
        <ReportSection
          title="注目トピック"
          items={[
            '待機画面の制作ソフト',
            '手描きトランジション',
            '配色の決め方',
          ]}
        />
        <ReportSection
          title="安全性メモ"
          items={['攻撃的な表現を2件検出', '本文は抑制し、応答・操作は未実施']}
          tone="danger"
        />
        <ReportSection
          title="頻出質問"
          items={['使用している制作ソフトは何か（3件）']}
        />
        <ReportSection
          title="未回答の質問"
          items={[
            '素材を商用配信で使う場合のライセンス条件',
            'ブラシ設定の詳細',
          ]}
          tone="warn"
        />
        <ReportSection
          title="建設的フィードバック"
          items={[
            'BGMを声より少し下げてほしい',
            '説明をもう少しゆっくりしてほしい',
          ]}
        />
      </div>

      <section className="next-suggestions">
        <span>次回への提案 · MIKO</span>
        <ol>
          <li>配信冒頭に使用ソフトと素材ライセンスの案内を固定表示する。</li>
          <li>次回テーマ候補として「配色の決め方」を扱う。</li>
          <li>開始前チェックにBGMと音声の音量差を追加する。</li>
        </ol>
      </section>

      <section className="evidence-data">
        <div>
          <span>根拠データ</span>
          <p>
            {evidenceIds.length}件 ·
            クリックするとタイムライン側の引用元を追跡できます。
          </p>
        </div>
        <div className="evidence-chips">
          {evidenceIds.map((id) => (
            <button
              type="button"
              key={id}
              onClick={() => onCommentEvidence(id)}
            >
              {id}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function ReportSection({
  title,
  items,
  tone = 'default',
}: {
  title: string;
  items: readonly string[];
  tone?: 'default' | 'warn' | 'danger';
}) {
  return (
    <section className={`report-section report-section-${tone}`}>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export default App;
