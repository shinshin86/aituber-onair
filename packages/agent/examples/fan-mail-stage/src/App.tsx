import { useEffect, useMemo, useState } from 'react';
import { useMikoVoice, type VoiceEntry } from './hooks/useMikoVoice';
import { MeshAvatarCanvas } from './meshAvatar/MeshAvatarCanvas';
import type {
  Draft,
  MailRecord,
  OperatorState,
  Reaction,
  StageState,
} from './protocol';

const labels = {
  received: '受信',
  generating: '生成中',
  ready_for_review: '確認待ち',
  approved: '承認済み',
  rejected: '拒否',
  invalid: '形式エラー',
  quarantined: '隔離・要確認',
  generation_failed: '生成エラー',
};
function useStateFeed<T>(path: string) {
  const [state, setState] = useState<T | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    let timeout: number;
    const abort = new AbortController();
    const poll = async () => {
      try {
        const response = await fetch(path, {
          signal: abort.signal,
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('サーバーに接続できません');
        const data = await response.json();
        if (active) {
          setState(data);
          setError('');
        }
      } catch {
        if (active) setError('接続が途切れました。再接続しています。');
      } finally {
        if (active) timeout = window.setTimeout(poll, 700);
      }
    };
    void poll();
    return () => {
      active = false;
      abort.abort();
      clearTimeout(timeout);
    };
  }, [path]);
  return { state, error };
}

function Miko({
  entries,
  stage = false,
  reactions = [],
}: { entries: VoiceEntry[]; stage?: boolean; reactions?: Reaction[] }) {
  const voice = useMikoVoice({
    reports: entries,
    phase: 'monitoring',
    runId: 0,
  });
  const [controls, setControls] = useState(!stage);
  const latest = entries[0];
  const speakingEntry = entries.find(
    (entry) => entry.id === voice.speakingReportKind
  );
  const text = voice.isSpeaking ? voice.activeText : latest?.speechText;
  const reaction =
    reactions.find((item) => item.eventId === speakingEntry?.id) ??
    reactions.at(-1);
  const emotion = useMemo(
    () => ({ tag: 'happy', seq: entries.length }),
    [entries.length]
  );
  return (
    <section
      className={stage ? 'miko-panel stage-panel' : 'miko-panel'}
      aria-label={stage ? '配信中のミコ' : 'ミコのプレビュー'}
    >
      <div className="panel-heading">
        <span className="eyebrow">
          {stage ? 'ON STAGE' : 'PRIVATE PREVIEW'}
        </span>
        <span className="status-dot">
          {voice.isSpeaking ? '発話中' : '待機中'}
        </span>
      </div>
      <div className="avatar-space">
        <MeshAvatarCanvas
          voiceLevel={voice.voiceLevel}
          isSpeaking={voice.isSpeaking}
          emotion={emotion}
        />
        <span className="avatar-name">
          <span>MIKO</span>
          <small>ミコ</small>
        </span>
      </div>
      {stage && reaction && (
        <article className="mail-card">
          <span className="eyebrow">NEW LETTER · 承認済み</span>
          <h2>{reaction.publicSubject}</h2>
          <p>{reaction.publicExcerpt}</p>
        </article>
      )}
      <div className="subtitle" aria-live="polite">
        {text ??
          (stage
            ? 'おたより、待ってるね。'
            : 'おたよりが届くと、ここでミコが反応します。')}
      </div>
      <button
        className="voice-toggle"
        type="button"
        onClick={() => setControls(!controls)}
      >
        音声設定 {controls ? 'を閉じる' : 'を開く'}
      </button>
      {controls && (
        <div className="voice-controls">
          <label>
            音声
            <select
              aria-label="音声エンジン"
              value={voice.engine}
              onChange={(event) =>
                voice.setEngine(
                  event.target.value as 'off' | 'webSpeech' | 'aivisSpeech'
                )
              }
            >
              <option value="off">オフ（字幕のみ）</option>
              <option value="webSpeech">Browser Speech</option>
              <option value="aivisSpeech">AivisSpeech</option>
            </select>
          </label>
          {voice.engine === 'aivisSpeech' && (
            <>
              <button
                type="button"
                onClick={() => void voice.refreshAivis()}
                disabled={voice.aivisState === 'checking'}
              >
                接続確認
              </button>
              <select
                aria-label="AivisSpeech の話者"
                value={voice.aivisSpeaker}
                onChange={(event) =>
                  voice.selectAivisSpeaker(event.target.value)
                }
              >
                {voice.aivisVoices.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </>
          )}
          <p>音声を有効にしてから、次のおたよりを受信・承認してください。</p>
        </div>
      )}
      {(voice.voiceError || voice.voiceNotice) && (
        <p className="error" role="alert">
          {voice.voiceError ?? voice.voiceNotice}
        </p>
      )}
    </section>
  );
}

function Review({
  record,
  onAction,
}: {
  record: MailRecord;
  onAction: (action: string, draft?: Draft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Draft>(
    record.draft ?? { publicSubject: '', publicExcerpt: '', speechText: '' }
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (action: string) => {
    setBusy(true);
    setError('');
    try {
      await onAction(action, draft);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '操作に失敗しました');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="review-panel">
      <div className="panel-heading">
        <span className="eyebrow">
          LETTER / {String(record.sequence).padStart(2, '0')}
        </span>
        <span className={`badge ${record.status}`}>
          {labels[record.status]}
        </span>
      </div>
      {record.mail && (
        <>
          <h2>{record.mail.subject}</h2>
          <p className="metadata">
            {record.mail.source} · {record.mail.aliasTag}
            <br />
            入力側の申告情報です。本人確認には使いません。
          </p>
          <p className="raw-mail">{record.mail.bodyText}</p>
        </>
      )}
      {record.notice && <p className="notice">{record.notice}</p>}
      {record.status === 'quarantined' && (
        <div className="quarantine">
          <h3>機微情報の可能性があります</h3>
          <p>
            内容を確認してください。解除すると、選択したバックエンドへメールが送られ、返答案が生成されます。
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run('release')}
          >
            確認して隔離を解除・生成
          </button>
        </div>
      )}
      {record.status === 'generating' && (
        <p className="notice">ミコが返答案を考えています…</p>
      )}
      {record.status === 'ready_for_review' && (
        <>
          <hr />
          <h3>配信に出す内容</h3>
          <p className="metadata">
            個人情報や認証情報が含まれていないか、すべての欄を確認してください。
          </p>
          <label>
            公開用の件名
            <input
              maxLength={120}
              value={draft.publicSubject}
              onChange={(event) =>
                setDraft({ ...draft, publicSubject: event.target.value })
              }
            />
          </label>
          <label>
            公開用の本文抜粋
            <textarea
              rows={2}
              maxLength={300}
              value={draft.publicExcerpt}
              onChange={(event) =>
                setDraft({ ...draft, publicExcerpt: event.target.value })
              }
            />
          </label>
          <label>
            ミコの発話
            <textarea
              rows={4}
              maxLength={500}
              value={draft.speechText}
              onChange={(event) =>
                setDraft({ ...draft, speechText: event.target.value })
              }
            />
          </label>
          <div className="actions">
            <button
              className="primary"
              type="button"
              disabled={
                busy || Object.values(draft).some((value) => !value.trim())
              }
              onClick={() => void run('approve')}
            >
              承認して配信へ
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run('regenerate')}
            >
              再生成
            </button>
          </div>
        </>
      )}
      {record.status === 'generation_failed' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void run('regenerate')}
        >
          再生成
        </button>
      )}
      {['ready_for_review', 'generation_failed', 'quarantined'].includes(
        record.status
      ) && (
        <button
          className="reject"
          type="button"
          disabled={busy}
          onClick={() => void run('reject')}
        >
          このおたよりを拒否
        </button>
      )}
      {record.reaction && (
        <div className="approved-copy">
          <h3>{record.reaction.publicSubject}</h3>
          <p>{record.reaction.publicExcerpt}</p>
          <blockquote>{record.reaction.speechText}</blockquote>
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {record.agentEvents.length > 0 && (
        <details>
          <summary>Agent の処理履歴</summary>
          <p className="metadata">{record.agentEvents.join(' → ')}</p>
        </details>
      )}
    </section>
  );
}

function Operator() {
  const { state, error } = useStateFeed<OperatorState>('/api/operator');
  const [selected, setSelected] = useState<string | null>(null);
  const [actionState, setActionState] = useState<OperatorState | null>(null);
  useEffect(() => {
    if (state) setActionState(null);
  }, [state]);
  const current = actionState ?? state;
  const records = current?.records ?? [];
  const record = records.find((item) => item.id === selected) ?? records.at(-1);
  const entries = useMemo(
    () =>
      records
        .filter((item) => item.draft)
        .map((item) => ({
          id: `${item.id}:${item.revision}`,
          speechText: item.draft?.speechText ?? '',
        }))
        .reverse(),
    [records]
  );
  const onAction = async (action: string, draft?: Draft) => {
    if (!record) return;
    const response = await fetch('/api/action', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: record.id, action, draft }),
    });
    if (!response.ok) throw new Error((await response.json()).error);
    const next = await fetch('/api/operator');
    if (next.ok) setActionState(await next.json());
  };
  return (
    <div className="operator-shell">
      <header>
        <div>
          <p className="eyebrow">AITUBER ONAIR / LOCAL LETTER STUDIO</p>
          <h1>
            Fan Mail Stage<span>おたよりから、会話へ。</span>
          </h1>
        </div>
        <div className="header-right">
          <span className="backend">
            {current?.backend === 'cursor-acp'
              ? 'Cursor ACP · 実モデル'
              : 'MOCK · モック応答'}
          </span>
          <a href="/stage" target="_blank" rel="noreferrer">
            配信画面を開く ↗
          </a>
        </div>
      </header>
      <div className="flow">
        <span>01 受信</span>
        <b>→</b>
        <span>02 ミコが返答</span>
        <b>→</b>
        <span>03 内容を確認・承認</span>
        <b>→</b>
        <span>04 配信へ</span>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <main className="workspace">
        <aside className="inbox">
          <div className="panel-heading">
            <h2>受信箱</h2>
            <span>{records.length} 通</span>
          </div>
          {records.length === 0 && (
            <p className="empty">
              まだおたよりはありません。
              <br />
              CLI からテストメールを送ってみましょう。
            </p>
          )}
          {[...records].reverse().map((item) => (
            <button
              type="button"
              key={item.id}
              className={`inbox-item ${item.id === record?.id ? 'selected' : ''}`}
              onClick={() => setSelected(item.id)}
            >
              <span className={`badge ${item.status}`}>
                {labels[item.status]}
              </span>
              <strong>{item.mail?.subject ?? '読み込めないファイル'}</strong>
              <small>
                #{String(item.sequence).padStart(2, '0')} ·{' '}
                {item.mail?.aliasTag ?? '入力を確認してください'}
              </small>
            </button>
          ))}
        </aside>
        {record ? (
          <Review
            key={`${record.id}:${record.revision}:${record.status}`}
            record={record}
            onAction={onAction}
          />
        ) : (
          <section className="review-panel empty-state">
            <span className="letter-icon">✉</span>
            <h2>ミコにおたよりを届けよう</h2>
            <p>
              受信すると自動で返答案が届きます。
              <br />
              公開する内容を確認して、配信へ送りましょう。
            </p>
            <code>npm run send-test-mail</code>
            <p className="metadata">承認するまで配信画面には表示されません。</p>
          </section>
        )}
        <Miko entries={entries} />
      </main>
      <footer>Local only · 人が承認したおたよりだけを配信します。</footer>
    </div>
  );
}

function Stage() {
  const { state, error } = useStateFeed<StageState>('/api/stage');
  const entries = useMemo(
    () =>
      (state?.reactions ?? [])
        .map((item) => ({ id: item.eventId, speechText: item.speechText }))
        .reverse(),
    [state]
  );
  return (
    <main className="stage-shell">
      <div className="stage-title">
        <span>FAN MAIL STAGE</span>
      </div>
      <Miko entries={entries} stage reactions={state?.reactions} />
      {error && <p className="error">{error}</p>}
    </main>
  );
}

export function App() {
  return window.location.pathname === '/stage' ? <Stage /> : <Operator />;
}
