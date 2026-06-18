import { ChatServiceFactory, type ChatProviderName } from '@aituber-onair/chat';
import type { Message } from '@aituber-onair/chat';
import {
  InMemoryNoiseMemoryStore,
  createContaminator,
  resolveRelationshipTier,
  type ChatMessage,
  type ContaminateOutput,
  type Contaminator,
  type InterventionKind,
  type NoiseEvent,
  type NoiseMemory,
  type NoiseMode,
  type NoiseReactionSignal,
  type NoiseSkipReason,
  type RelationshipTier,
  type RewriteModel,
  type RhythmPhase,
} from '../../../src/index';
import { SESSION_SCENARIO, type ScenarioTurn } from './scenarios';
import './styles.css';

type SessionMode = 'demo' | 'live';
type UiProviderName = ChatProviderName | 'local';

interface SessionTurn {
  index: number;
  viewerComments: string[];
  draft: string;
  finalText: string;
  tilted: boolean;
  skippedReason?: NoiseSkipReason;
  appliedKinds: InterventionKind[];
  predictabilityBefore: number;
  predictabilityAfter: number;
  budgetAtTurn: number;
  reaction?: NoiseReactionSignal;
  callbackSourceIndex?: number;
  expanded: boolean;
  events: string[];
  rhythmPhase: RhythmPhase;
  rhythmReason: string;
  tier: RelationshipTier;
  output: ContaminateOutput;
}

interface AppState {
  sessionMode: SessionMode;
  mode: NoiseMode;
  relationshipCapital: number;
  apiKey: string;
  provider: UiProviderName;
  model: string;
  endpoint: string;
  freeComment: string;
  autoPlay: boolean;
  simulateAudience: boolean;
  isRunning: boolean;
  connectionDialogOpen: boolean;
  error: string;
  turns: SessionTurn[];
  messages: ChatMessage[];
  memory?: NoiseMemory;
  pendingEvents: string[];
  activeHighlight?: number;
}

const SCOPE_ID = 'noise-session-sample';
const AUTO_PLAY_INTERVAL_MS = 1800;
const DEFAULT_RELATIONSHIP_CAPITAL = 0.7;
const memoryStore = new InMemoryNoiseMemoryStore();

let activeScriptedTurn: ScenarioTurn | undefined;
let contaminator: Contaminator;
let autoPlayTimer: number | undefined;

const state: AppState = {
  sessionMode: 'demo',
  mode: 'bold',
  relationshipCapital: DEFAULT_RELATIONSHIP_CAPITAL,
  apiKey: '',
  provider: 'openai',
  model: 'gpt-4o-mini',
  endpoint: 'http://127.0.0.1:11434/v1/chat/completions',
  freeComment: '',
  autoPlay: false,
  simulateAudience: false,
  isRunning: false,
  connectionDialogOpen: false,
  error: '',
  turns: [],
  messages: [],
  pendingEvents: [],
};

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('App root was not found.');
}

contaminator = createSessionContaminator();
render();
void refreshMemory();

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement | null;
  const actionTarget = target?.closest<HTMLElement>('[data-action]');

  if (!actionTarget) {
    return;
  }

  const action = actionTarget.dataset.action;

  switch (action) {
    case 'next-turn':
      void runNextTurn();
      break;
    case 'reset-session':
      void resetSession();
      break;
    case 'open-settings':
      state.connectionDialogOpen = true;
      render();
      break;
    case 'close-settings':
      state.connectionDialogOpen = false;
      render();
      break;
    case 'save-settings':
      state.connectionDialogOpen = false;
      recreateContaminator();
      render();
      break;
    case 'toggle-expanded':
      toggleExpanded(Number(actionTarget.dataset.turnIndex));
      break;
    case 'callback-source':
      scrollToTurn(Number(actionTarget.dataset.turnIndex));
      break;
    case 'reaction':
      void reactToTurn(
        Number(actionTarget.dataset.turnIndex),
        actionTarget.dataset.signal as NoiseReactionSignal
      );
      break;
  }
});

document.addEventListener('input', (event) => {
  const target = event.target as HTMLInputElement | HTMLSelectElement | null;
  const field = target?.dataset.field;

  if (!target || !field) {
    return;
  }

  switch (field) {
    case 'sessionMode':
      state.sessionMode = target.value as SessionMode;
      recreateContaminator();
      break;
    case 'mode':
      state.mode = target.value as NoiseMode;
      recreateContaminator();
      break;
    case 'relationshipCapital':
      state.relationshipCapital = Number(target.value);
      break;
    case 'autoPlay':
      state.autoPlay = (target as HTMLInputElement).checked;
      // Auto-play needs audience reactions to drive the story beats
      // (gag ledger, repair), so it implies the simulated audience.
      if (state.autoPlay) {
        state.simulateAudience = true;
      }
      syncAutoPlay();
      break;
    case 'simulateAudience':
      state.simulateAudience = (target as HTMLInputElement).checked;
      break;
    case 'provider':
      state.provider = target.value as UiProviderName;
      if (
        !getSupportedModelsForUiProvider(state.provider).includes(state.model)
      ) {
        state.model = getSupportedModelsForUiProvider(state.provider)[0] ?? '';
      }
      recreateContaminator();
      break;
    case 'model':
      state.model = target.value;
      recreateContaminator();
      break;
    case 'apiKey':
      state.apiKey = target.value;
      recreateContaminator();
      break;
    case 'endpoint':
      state.endpoint = target.value;
      recreateContaminator();
      break;
    case 'freeComment':
      state.freeComment = target.value;
      return;
  }

  render();
});

function render(): void {
  app.innerHTML = `
    <section class="app-shell">
      <header class="hero">
        <div class="hero-inner">
          <a class="eyebrow" href="https://github.com/shinshin86/aituber-onair" target="_blank" rel="noreferrer">@aituber-onair/noise</a>
          <h1>AIの返答を、たまに崩す。</h1>
          <p class="lead">ワンパターンになりがちなAITuberの返答を崩す様子を、1本の配信で体験できます。</p>
          <ol class="step-list">
            <li>① ターンを進める</li>
            <li>② 崩れた返答を見る</li>
            <li>③ 反応を返す</li>
          </ol>
        </div>
      </header>

      ${renderActionBar()}
      ${renderGuide()}
      ${state.error ? `<div class="error-box">${escapeHtml(state.error)}</div>` : ''}

      <main class="session-layout">
        <section class="timeline-panel">
          ${renderTimeline()}
          ${renderIntegrationCode()}
        </section>

        <aside class="side-panel">
          ${renderConditionCard()}
          ${renderLedger()}
          ${renderFlowChart()}
        </aside>
      </main>

      ${state.connectionDialogOpen ? renderSettingsDialog() : ''}
    </section>
  `;

  if (state.activeHighlight !== undefined) {
    window.setTimeout(() => {
      state.activeHighlight = undefined;
      render();
    }, 900);
  }
}

function renderActionBar(): string {
  const total = SESSION_SCENARIO.turns.length;
  const current = state.turns.length;

  return `
    <section class="control-bar">
      <button data-action="next-turn" class="primary next-button" type="button" ${state.isRunning || isFinished() ? 'disabled' : ''}>
        ${state.isRunning ? '処理中…' : isFinished() ? '配信終了(リセットでもう一周)' : `▶ 次のターンへ (${current}/${total})`}
      </button>
      <label class="check-field">
        <input data-field="autoPlay" type="checkbox" ${state.autoPlay ? 'checked' : ''} />
        <span>自動再生</span>
      </label>
      <label class="range-field">
        <span>視聴者との距離: <strong>${formatTier(resolveRelationshipTier(state.relationshipCapital))}</strong></span>
        <input data-field="relationshipCapital" type="range" min="0" max="1" step="0.05" value="${state.relationshipCapital}" />
      </label>
      <span class="control-spacer"></span>
      <button data-action="reset-session" class="secondary" type="button">最初から</button>
      <button data-action="open-settings" class="secondary" type="button">⚙ 設定</button>
    </section>
    ${
      state.sessionMode === 'live'
        ? `<section class="live-input">
            <label>
              <span>視聴者コメント</span>
              <input data-field="freeComment" type="text" value="${escapeHtml(state.freeComment)}" placeholder="コメントを入力して次のターンへ" />
            </label>
            <p>実演モードは返答の下書きと書き換えで、1ターンにつきLLM呼び出しが2回あります。</p>
          </section>`
        : ''
    }
  `;
}

/**
 * The narrator: one sentence telling the user what just happened and what to
 * do next. This carries the demo's story so the user never has to interpret
 * raw state.
 */
function renderGuide(): string {
  const { tone, text } = buildGuideMessage();

  return `
    <section class="guide guide-${tone}">
      <span class="guide-icon">${tone === 'act' ? '👉' : tone === 'event' ? '✨' : 'ℹ️'}</span>
      <p>${text}</p>
    </section>
  `;
}

function buildGuideMessage(): { tone: 'info' | 'act' | 'event'; text: string } {
  if (state.turns.length === 0) {
    return {
      tone: 'act',
      text: '<strong>▶ 次のターンへ</strong>を押して配信を始めましょう。',
    };
  }

  const last = state.turns[state.turns.length - 1];

  if (isFinished()) {
    return {
      tone: 'info',
      text: '台本は終了。「最初から」でもう一周できます。',
    };
  }

  if (last.skippedReason === 'sincerity') {
    return {
      tone: 'event',
      text: '真剣な相談を検知。こういう時はふざけません。',
    };
  }

  if (last.skippedReason === 'repair') {
    return {
      tone: 'info',
      text: 'スベったので、しばらく真面目に返します。',
    };
  }

  if (last.skippedReason === 'cooldown') {
    return {
      tone: 'info',
      text: '崩した直後なので、今回はあえて普通に返しました。',
    };
  }

  if (last.skippedReason === 'platform') {
    return {
      tone: 'info',
      text: 'まずは「いつもの調子」を見せる準備期間です。',
    };
  }

  if (last.skippedReason === 'low_predictability') {
    return {
      tone: 'info',
      text: 'もともと自然な返答だったので、崩しませんでした。',
    };
  }

  if (last.callbackSourceIndex !== undefined) {
    return {
      tone: 'event',
      text: '前にウケたネタが再登場!↩リンクで元の場面へ飛べます。',
    };
  }

  if (last.tilted && !last.reaction) {
    return {
      tone: 'act',
      text: '<strong>返答を崩しました!</strong>グレーが元の返答、色つきが実際の返答です。下のボタンで反応を教えてください。',
    };
  }

  if (last.reaction === 'laughter' || last.reaction === 'positive') {
    return {
      tone: 'event',
      text: 'ウケを学習。この瞬間はネタ帳に記録されました。',
    };
  }

  if (last.reaction === 'discomfort' || last.reaction === 'pushback') {
    return {
      tone: 'event',
      text: 'スベりを学習。攻め度が下がり、しばらく控えめになります。',
    };
  }

  return {
    tone: 'act',
    text: '<strong>▶ 次のターンへ</strong>を押して配信を進めてください。',
  };
}

function renderConditionCard(): string {
  const budget = state.memory?.violationBudget ?? 1;
  const rhythm = state.memory?.rhythm;
  const moments = state.memory?.memorableMoments ?? [];
  const condition =
    rhythm && rhythm.repairRemaining > 0
      ? { label: '反省中', detail: 'スベったので、しばらく真面目に返します' }
      : rhythm && rhythm.cooldownRemaining > 0
        ? { label: 'ひと休み', detail: '崩した直後なので一拍おいています' }
        : budget >= 0.9
          ? { label: '攻めてOK', detail: '反応が良いので、強めに崩せます' }
          : budget >= 0.6
            ? { label: 'ふつう', detail: '様子を見ながら崩します' }
            : {
                label: 'ひかえめ',
                detail: '最近の反応がいまいちなので慎重です',
              };

  return `
    <section class="panel side-card">
      <h2>いまのAIの調子</h2>
      <div class="condition-line">
        <strong class="condition-label">${condition.label}</strong>
        <span class="condition-detail">${condition.detail}</span>
      </div>
      <div class="budget-meter">
        <div class="metric-label-row">
          <span>攻め度</span>
          <strong>${Math.round(budget * 100)}%</strong>
        </div>
        <div class="metric-track">
          <span class="metric-fill" style="width:${Math.round(budget * 100)}%"></span>
        </div>
        <p class="side-hint">ウケると上がり、引かれると下がります。</p>
      </div>
    </section>
  `;
}

function renderFlowChart(): string {
  if (state.turns.length < 2) {
    return '';
  }

  return `
    <section class="panel side-card">
      <h2>配信の流れ</h2>
      <div class="flow-dots">
        ${state.turns
          .map((turn) => {
            const kind = turn.skippedReason
              ? turn.skippedReason === 'sincerity'
                ? 'serious'
                : 'rest'
              : turn.tilted
                ? 'tilt'
                : 'plain';
            const label = turn.skippedReason
              ? formatSkipReason(turn.skippedReason)
              : turn.tilted
                ? '崩した'
                : 'いつも通り';

            return `<span class="flow-dot flow-${kind}" title="ターン${turn.index + 1}: ${label}"></span>`;
          })
          .join('')}
      </div>
      <ul class="flow-legend">
        <li><span class="flow-dot flow-tilt"></span>崩した</li>
        <li><span class="flow-dot flow-plain"></span>いつも通り</li>
        <li><span class="flow-dot flow-rest"></span>あえて休み</li>
        <li><span class="flow-dot flow-serious"></span>真剣モード</li>
      </ul>
    </section>
  `;
}

function renderTimeline(): string {
  if (state.turns.length === 0) {
    return `
      <div class="empty-state">
        <h2>${escapeHtml(SESSION_SCENARIO.title)}</h2>
        <p>APIキーは不要です。上の<strong>「▶ 次のターンへ」</strong>を押して始めてください。</p>
      </div>
    `;
  }

  return `
    <div class="timeline">
      ${state.turns.map((turn) => renderTurn(turn)).join('')}
    </div>
  `;
}

function renderIntegrationCode(): string {
  const code = `import { createContaminator } from '@aituber-onair/noise';

const noise = createContaminator({
  mode: 'bold',
  chat: { provider: 'openai', options: { apiKey, model: 'gpt-4o-mini' } },
  memory: { scopeId: 'stream-1', store },
});

// 毎ターン: LLMが作った返答(draft)を通すだけ
const result = await noise.contaminate({
  systemPrompt,
  messages,
  draft,
  relationshipCapital: 0.7, // 絆システムの値など(0-1)
});
say(result.text); // 崩す必要がなければ draft がそのまま返る

// 視聴者の反応を返すと、次からの崩し方が変わる
await noise.reportReaction({ signal: 'laughter' });`;

  return `
    <details class="panel code-panel">
      <summary>このデモを自分のアプリに組み込むには</summary>
      <p class="code-intro">このデモがやっていることは、実質この十数行です。</p>
      <pre class="code-block"><code>${escapeHtml(code)}</code></pre>
    </details>
  `;
}

function renderTurn(turn: SessionTurn): string {
  const highlight = state.activeHighlight === turn.index ? ' highlight' : '';
  const statusClass = turn.skippedReason
    ? turn.skippedReason === 'sincerity'
      ? ' turn-serious'
      : ' turn-rest'
    : turn.tilted
      ? ' turn-tilted'
      : ' turn-plain';

  return `
    <article id="turn-${turn.index}" class="turn${statusClass}${highlight}">
      <div class="viewer-stack">
        ${turn.viewerComments
          .map(
            (comment) => `
              <div class="bubble viewer-bubble">
                <span>視聴者</span>
                <p>${escapeHtml(comment)}</p>
              </div>
            `
          )
          .join('')}
      </div>
      <div class="ai-stack">
        <div class="bubble ai-bubble">
          <div class="turn-meta">
            <span class="turn-number">ターン ${turn.index + 1}</span>
            ${renderStatusBadge(turn)}
          </div>
          ${renderTurnBody(turn)}
          ${renderCallbackLink(turn)}
          ${renderTurnNote(turn)}
          ${renderReactionPrompt(turn)}
          <div class="turn-actions">
            <button data-action="toggle-expanded" data-turn-index="${turn.index}" class="detail-toggle" type="button">${turn.expanded ? '判断を閉じる' : 'ノイズの判断を見る'}</button>
          </div>
          ${turn.expanded ? renderTurnDetails(turn) : ''}
        </div>
      </div>
    </article>
  `;
}

/**
 * The core visual: for a tilted turn, show the boring draft (with removals
 * struck) and the actual reply (with additions highlighted) side by side, so
 * "what the library did" is visible without any clicks.
 */
function renderTurnBody(turn: SessionTurn): string {
  const changed = turn.tilted && turn.finalText.trim() !== turn.draft.trim();

  if (!changed) {
    return `<p class="final-text">${escapeHtml(turn.finalText)}</p>`;
  }

  const segments = diffSegments(turn.draft, turn.finalText);
  const beforeHtml = segments
    .filter((segment) => segment.type !== 'added')
    .map((segment) =>
      segment.type === 'removed'
        ? `<del class="diff-removed">${escapeHtml(segment.text)}</del>`
        : escapeHtml(segment.text)
    )
    .join('');
  const afterHtml = segments
    .filter((segment) => segment.type !== 'removed')
    .map((segment) =>
      segment.type === 'added'
        ? `<mark class="diff-added">${escapeHtml(segment.text)}</mark>`
        : escapeHtml(segment.text)
    )
    .join('');

  return `
    <div class="before-after">
      <div class="ba-row ba-before">
        <span class="ba-label">元の返答</span>
        <p>${beforeHtml}</p>
      </div>
      <div class="ba-row ba-after">
        <span class="ba-label">崩した返答</span>
        <p>${afterHtml}</p>
      </div>
    </div>
    ${renderAppliedChips(turn)}
  `;
}

function renderStatusBadge(turn: SessionTurn): string {
  if (turn.skippedReason === 'sincerity') {
    return '<span class="badge badge-serious">🤝 真剣モード</span>';
  }

  if (turn.skippedReason === 'platform') {
    return `<span class="badge badge-skip">🌱 ${escapeHtml(formatSkipReason(turn.skippedReason))}</span>`;
  }

  if (turn.skippedReason) {
    return `<span class="badge badge-skip">💤 ${escapeHtml(formatSkipReason(turn.skippedReason))}</span>`;
  }

  return turn.tilted
    ? '<span class="badge badge-tilted">✨ 崩した!</span>'
    : '<span class="badge badge-plain">いつも通り</span>';
}

function renderTurnNote(turn: SessionTurn): string {
  if (!turn.skippedReason) {
    return '';
  }

  return `<p class="turn-note">${escapeHtml(formatRhythmReason(turn.rhythmReason))}</p>`;
}

function renderAppliedChips(turn: SessionTurn): string {
  if (turn.appliedKinds.length === 0) {
    return '';
  }

  return `
    <div class="applied-row">
      <ul class="chips">
        ${turn.appliedKinds
          .map((kind) => `<li>${escapeHtml(formatIntervention(kind))}</li>`)
          .join('')}
      </ul>
    </div>
  `;
}

function renderCallbackLink(turn: SessionTurn): string {
  if (turn.callbackSourceIndex === undefined) {
    return '';
  }

  const distance = turn.index - turn.callbackSourceIndex;

  return `
    <button data-action="callback-source" data-turn-index="${turn.callbackSourceIndex}" class="callback-link" type="button">
      ↩ ${distance}ターン前のネタが再登場
    </button>
  `;
}

/**
 * Reactions only make sense right after a tilt, so the prompt appears only on
 * the latest tilted turn — phrased as a question so the user knows it is
 * their move.
 */
function renderReactionPrompt(turn: SessionTurn): string {
  const latest = turn.index === state.turns.length - 1;

  if (turn.reaction) {
    return `
      <div class="reaction-result">
        視聴者の反応: <strong>${escapeHtml(formatReactionSignal(turn.reaction))}</strong>
        ${turn.events.length > 0 ? `<span>${escapeHtml(turn.events[turn.events.length - 1])}</span>` : ''}
      </div>
    `;
  }

  if (!latest || !turn.tilted || state.isRunning) {
    return '';
  }

  const reactions: Array<{ signal: NoiseReactionSignal; label: string }> = [
    { signal: 'laughter', label: '😂 草w' },
    { signal: 'positive', label: '👍 ウケた' },
    { signal: 'silence', label: '😐 スルー' },
    { signal: 'discomfort', label: '😬 引かれた' },
  ];

  return `
    <div class="reaction-prompt">
      <span class="reaction-question">この返し、どうだった?</span>
      <div class="reaction-row">
        ${reactions
          .map(
            (reaction) => `
              <button data-action="reaction" data-turn-index="${turn.index}" data-signal="${reaction.signal}" type="button">
                ${escapeHtml(reaction.label)}
              </button>
            `
          )
          .join('')}
      </div>
    </div>
  `;
}

function renderTurnDetails(turn: SessionTurn): string {
  const out = turn.output;
  const diag = out.diagnosis;
  const gates = out.gates;
  const skipped = !!turn.skippedReason;

  // Step 1: diagnosis
  const scorePercent = Math.round(diag.score * 100);
  const issueChips =
    diag.issues.length > 0
      ? `<div class="pipe-chips">${diag.issues
          .map(
            (issue) =>
              `<span class="pipe-chip">${escapeHtml(formatIssueKind(issue.kind))}<em>${Math.round(issue.severity * 100)}%</em></span>`
          )
          .join('')}</div>`
      : '<span class="pipe-none">気になる点なし</span>';

  const step1 = `
    <div class="pipe-step">
      <div class="pipe-step-head"><span class="pipe-num">①</span><span class="pipe-heading">診断「この返答、お決まりすぎないか?」</span></div>
      <div class="pipe-body">
        <div class="metric-label-row"><span>お決まり度</span><strong>${scorePercent}%</strong></div>
        <div class="metric-track"><span class="metric-fill" style="width:${scorePercent}%"></span></div>
        ${issueChips}
      </div>
    </div>`;

  // Step 2: gates
  const sincPill = gates.sincerity.serious
    ? '<span class="pill pill-stop">停止</span>'
    : '<span class="pill pill-ok">OK</span>';
  const relPill = `<span class="pill pill-neutral">${escapeHtml(formatTier(gates.relationship.tier))}</span>`;
  const relNote = `この距離の上限: ${escapeHtml(formatMode(gates.relationship.effectiveMode))}`;
  const rhythmPill = gates.rhythm.apply
    ? '<span class="pill pill-ok">崩してOK</span>'
    : '<span class="pill pill-neutral">見送り</span>';
  const rhythmNote = escapeHtml(formatRhythmReason(gates.rhythm.reason));

  const stopLine = skipped
    ? '<div class="pipe-stop-note">→ ここで停止。書き換えは行われませんでした。</div>'
    : '';

  const step2 = `
    <div class="pipe-step">
      <div class="pipe-step-head"><span class="pipe-num">②</span><span class="pipe-heading">3つのゲート「いま崩していいか?」</span></div>
      <div class="pipe-body">
        <div class="gate-row"><span class="gate-label">真剣な場面</span>${sincPill}</div>
        <div class="gate-row"><span class="gate-label">視聴者との距離</span>${relPill}<span class="gate-note">${escapeHtml(relNote)}</span></div>
        <div class="gate-row"><span class="gate-label">タイミング</span>${rhythmPill}<span class="gate-note">${rhythmNote}</span></div>
        ${stopLine}
      </div>
    </div>`;

  if (skipped) {
    return `<div class="turn-details"><div class="pipeline">${step1}${step2}</div></div>`;
  }

  // Step 3: plan
  const plan = out.plan;
  const planRows =
    plan.interventions.length > 0
      ? plan.interventions
          .map((inv) => {
            const strengthPct = Math.round(inv.strength * 100);
            const materialNote =
              inv.material != null && inv.material.length > 0
                ? `<span class="gate-note">ネタ: ${escapeHtml(inv.material.slice(0, 30))}</span>`
                : '';

            return `<div class="gate-row"><span class="gate-label">${escapeHtml(formatIntervention(inv.kind))}</span>
              <div class="cand-bar-wrap"><div class="metric-track cand-bar"><span class="metric-fill" style="width:${strengthPct}%"></span></div></div>
              ${materialNote}</div>`;
          })
          .join('')
      : '<span class="pipe-none">作戦なし</span>';

  const step3 = `
    <div class="pipe-step">
      <div class="pipe-step-head"><span class="pipe-num">③</span><span class="pipe-heading">作戦「どう崩すか」</span></div>
      <div class="pipe-body">${planRows}</div>
    </div>`;

  // Step 4: candidates
  const candRows = out.candidates
    .map((cand, idx) => {
      const scorePct = Math.round(cand.evaluation.finalScore * 100);
      const isSelected = idx === out.selectedIndex;
      const selectedPill = isSelected
        ? '<span class="pill pill-ok">採用</span>'
        : '';
      const noteText =
        !isSelected && cand.evaluation.issues.length > 0
          ? `<span class="cand-note">${escapeHtml(formatEvalIssue(cand.evaluation.issues[0]))}</span>`
          : '';
      const truncated =
        cand.text.length > 64 ? `${cand.text.slice(0, 64)}…` : cand.text;

      return `<div class="cand-row">
        <span class="cand-text">${escapeHtml(truncated)}</span>
        <div class="cand-bar-wrap"><div class="metric-track cand-bar"><span class="metric-fill" style="width:${scorePct}%"></span></div><span class="cand-score">${scorePct}%</span></div>
        ${selectedPill}${noteText}
      </div>`;
    })
    .join('');

  const step4 = `
    <div class="pipe-step">
      <div class="pipe-step-head"><span class="pipe-num">④</span><span class="pipe-heading">候補と採点「複数案を作って選ぶ」</span></div>
      <div class="pipe-body">${candRows || '<span class="pipe-none">候補なし</span>'}</div>
    </div>`;

  // Step 5: quality checks
  const qc = out.quality.checks;
  const charPill = qc.preservedCharacter
    ? '<span class="pill pill-ok">OK</span>'
    : '<span class="pill pill-stop">NG</span>';
  const overcorrPill = qc.avoidedOvercorrection
    ? '<span class="pill pill-ok">OK</span>'
    : '<span class="pill pill-stop">NG</span>';
  const groundPill = qc.groundedInContext
    ? '<span class="pill pill-ok">OK</span>'
    : '<span class="pill pill-stop">NG</span>';
  const predBefore = Math.round(qc.predictabilityBefore * 100);
  const predAfter = Math.round(qc.predictabilityAfter * 100);

  const step5 = `
    <div class="pipe-step">
      <div class="pipe-step-head"><span class="pipe-num">⑤</span><span class="pipe-heading">安全チェック「崩しすぎていないか」</span></div>
      <div class="pipe-body">
        <div class="gate-row"><span class="gate-label">キャラ維持</span>${charPill}</div>
        <div class="gate-row"><span class="gate-label">変えすぎ防止</span>${overcorrPill}</div>
        <div class="gate-row"><span class="gate-label">文脈との整合</span>${groundPill}</div>
        <div class="pipe-pred-delta">お決まり度 ${predBefore}% → ${predAfter}%</div>
      </div>
    </div>`;

  return `<div class="turn-details"><div class="pipeline">${step1}${step2}${step3}${step4}${step5}</div></div>`;
}

function formatIssueKind(kind: string): string {
  const map: Record<string, string> = {
    generic_closing: 'きれいに閉じすぎ',
    over_agreement: '受け止めが丸い',
    over_apology: '謝罪が事務的',
    forced_positive: '明るくまとめすぎ',
    low_context_grounding: '直近コメントが薄い',
    low_specificity: '具体性が低い',
    repeated_phrase: '繰り返し圧',
    too_complete: '会話を終わらせすぎ',
    no_streamer_judgment: '配信者の判断がない',
    persona_flattening: 'キャラが丸まりすぎ',
  };

  return map[kind] ?? kind;
}

function formatMode(mode: string): string {
  const map: Record<string, string> = {
    subtle: '控えめ',
    performer: 'キャラ重視',
    bold: '大胆',
    inversion: '逆張り',
    chaotic: '強め',
  };

  return map[mode] ?? mode;
}

function formatEvalIssue(issue: string): string {
  const map: Record<string, string> = {
    meta_word: 'メタ発言',
    aggression_risk: '攻撃的すぎ',
    ungrounded_detail_risk: '文脈にない情報',
    unchanged: '変わっていない',
    generic_reply: 'ありきたり',
    missing_play_marker: '遊びの合図がない',
  };

  return map[issue] ?? issue;
}

function renderLedger(): string {
  const moments = state.memory?.memorableMoments ?? [];

  return `
    <section class="panel side-card">
      <h2>ネタ帳 <span class="ledger-count">${moments.length}件</span></h2>
      <p class="side-hint">ウケた瞬間が記録され、後で再登場します。</p>
      ${
        moments.length === 0
          ? '<div class="empty-report">まだ空です。</div>'
          : `<ul class="ledger-list">
              ${moments
                .map(
                  (moment) => `
                    <li>
                      <strong>${escapeHtml(moment.summary)}</strong>
                      <span>${moment.callbacks > 0 ? `再登場 ${moment.callbacks} 回` : '出番待ち'}</span>
                    </li>
                  `
                )
                .join('')}
            </ul>`
      }
    </section>
  `;
}

function renderSettingsDialog(): string {
  return `
    <div class="modal-backdrop">
      <section class="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div class="panel-heading">
          <div>
            <h2 id="settings-title">設定</h2>
            <p>通常はそのままで大丈夫です。実演モードでは下の接続設定を使います。</p>
          </div>
        </div>
        <div class="settings-grid">
          <label>
            <span>動かし方</span>
            <select data-field="sessionMode">
              <option value="demo" ${selected(state.sessionMode, 'demo')}>デモ(台本・APIキー不要)</option>
              <option value="live" ${selected(state.sessionMode, 'live')}>実演(実際のLLMで動かす)</option>
            </select>
          </label>
          <label>
            <span>崩し方の強さ</span>
            <select data-field="mode">
              <option value="subtle" ${selected(state.mode, 'subtle')}>控えめ</option>
              <option value="performer" ${selected(state.mode, 'performer')}>キャラクター重視</option>
              <option value="bold" ${selected(state.mode, 'bold')}>大胆</option>
              <option value="inversion" ${selected(state.mode, 'inversion')}>逆張り</option>
              <option value="chaotic" ${selected(state.mode, 'chaotic')}>強めに崩す</option>
            </select>
          </label>
          <label class="check-field">
            <input data-field="simulateAudience" type="checkbox" ${state.simulateAudience ? 'checked' : ''} />
            <span>視聴者の反応を自動で入れる(自動再生時は常にON)</span>
          </label>
          <label>
            <span>Provider</span>
            <select data-field="provider">${renderProviderOptions()}</select>
          </label>
          <label>
            <span>Model</span>
            <input data-field="model" list="model-options" value="${escapeHtml(state.model)}" />
            <datalist id="model-options">${renderModelOptions()}</datalist>
          </label>
          <label>
            <span>API Key</span>
            <input data-field="apiKey" type="password" value="${escapeHtml(state.apiKey)}" placeholder="${requiresApiKey() ? '必要です' : '不要'}" />
          </label>
          ${
            state.provider === 'local'
              ? `<label>
                  <span>Local endpoint</span>
                  <input data-field="endpoint" value="${escapeHtml(state.endpoint)}" />
                </label>`
              : ''
          }
        </div>
        <div class="modal-actions">
          <button data-action="close-settings" type="button">閉じる</button>
          <button data-action="save-settings" class="primary" type="button">設定を保存</button>
        </div>
      </section>
    </div>
  `;
}

async function runNextTurn(): Promise<void> {
  if (state.isRunning || isFinished()) {
    return;
  }

  state.isRunning = true;
  state.error = '';
  render();

  try {
    const index = state.turns.length;
    const scripted = SESSION_SCENARIO.turns[index];
    const viewerComments =
      state.sessionMode === 'demo'
        ? scripted.viewerComments
        : [state.freeComment.trim() || scripted.viewerComments[0]];

    for (const comment of viewerComments) {
      state.messages.push({ role: 'user', content: comment });
    }

    const draft =
      state.sessionMode === 'demo'
        ? scripted.draft
        : await generateLiveDraft(viewerComments);

    activeScriptedTurn = scripted;
    state.pendingEvents = [];

    const output = await contaminator.contaminate({
      systemPrompt: SESSION_SCENARIO.systemPrompt,
      messages: state.messages,
      draft,
      relationshipCapital: state.relationshipCapital,
      streamContext: scripted.streamContext,
      intensity: 0.85,
    });

    const memory = await loadMemory();
    const turn = createSessionTurn({
      index,
      viewerComments,
      draft,
      output,
      memory,
      events: [...state.pendingEvents],
    });

    state.turns.push(turn);
    state.messages.push({ role: 'assistant', content: output.text });
    state.memory = memory;
    state.freeComment = '';

    if (state.simulateAudience) {
      await maybeSimulateReaction(turn, scripted);
    }
  } catch (error) {
    state.error = error instanceof Error ? error.message : String(error);
  } finally {
    activeScriptedTurn = undefined;
    state.pendingEvents = [];
    state.isRunning = false;
    render();
    scrollToLatestTurn();
    syncAutoPlay();
  }
}

function scrollToLatestTurn(): void {
  const latest = state.turns.length - 1;

  if (latest < 0) {
    return;
  }

  window.setTimeout(() => {
    document
      .querySelector(`#turn-${latest}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 0);
}

function createSessionTurn(input: {
  index: number;
  viewerComments: string[];
  draft: string;
  output: ContaminateOutput;
  memory: NoiseMemory | undefined;
  events: string[];
}): SessionTurn {
  const callbackSourceIndex = input.output.applied.some(
    (applied) => applied.kind === 'callback'
  )
    ? findCallbackSourceIndex(input.memory, input.index)
    : undefined;

  return {
    index: input.index,
    viewerComments: input.viewerComments,
    draft: input.draft,
    finalText: input.output.text,
    tilted: !input.output.skipped,
    skippedReason: input.output.skipped?.reason,
    appliedKinds: input.output.applied.map((applied) => applied.kind),
    predictabilityBefore: input.output.score.predictability,
    predictabilityAfter: input.output.score.rewrittenPredictability,
    budgetAtTurn: input.memory?.violationBudget ?? 1,
    callbackSourceIndex,
    expanded: false,
    events: input.events,
    rhythmPhase: input.output.gates.rhythm.phase,
    rhythmReason: input.output.gates.rhythm.reason,
    tier: input.output.gates.relationship.tier,
    output: input.output,
  };
}

async function generateLiveDraft(viewerComments: string[]): Promise<string> {
  if (requiresApiKey() && !state.apiKey.trim()) {
    throw new Error(
      '実演モードにはAPIキーが必要です。接続設定を入力してください。'
    );
  }

  const service = ChatServiceFactory.createChatService(
    toChatProvider(state.provider),
    createChatOptions()
  );
  const messages: Message[] = [
    { role: 'system', content: SESSION_SCENARIO.systemPrompt },
    ...state.messages.slice(-8).map((message) => ({
      role: message.role,
      content: message.content,
    })),
    {
      role: 'user',
      content: `直近コメント: ${viewerComments.join(' / ')}\n普通に丁寧なAITuber返答を1段落で作ってください。`,
    },
  ];
  let draft = '';

  await service.processChat(
    messages,
    (partial) => {
      draft += partial;
    },
    async (complete) => {
      draft = complete;
    }
  );

  return draft.trim();
}

async function reactToTurn(
  turnIndex: number,
  signal: NoiseReactionSignal
): Promise<void> {
  const turn = state.turns[turnIndex];

  if (!turn || turn.reaction || turnIndex !== state.turns.length - 1) {
    return;
  }

  state.isRunning = true;
  render();

  try {
    const eventStart = state.pendingEvents.length;
    const result = await contaminator.reportReaction({
      signal,
      detail:
        signal === 'laughter' || signal === 'positive'
          ? createMomentSummary(turn)
          : undefined,
    });
    const reactionEvents = state.pendingEvents.slice(eventStart);
    turn.reaction = signal;
    turn.events.push(...reactionEvents);
    turn.events.push(formatReactionResult(signal, result.repairAdvised));
    state.memory = await loadMemory();
  } finally {
    state.isRunning = false;
    render();
  }
}

async function maybeSimulateReaction(
  turn: SessionTurn,
  scripted: ScenarioTurn
): Promise<void> {
  if (turn.skippedReason || turn.reaction) {
    return;
  }

  let signal: NoiseReactionSignal | undefined;

  if (scripted.suggestedReaction === 'laughter') {
    signal = Math.random() < 0.6 ? 'laughter' : 'silence';
  } else if (scripted.suggestedReaction === 'discomfort') {
    signal = Math.random() < 0.7 ? 'discomfort' : 'silence';
  } else if (turn.tilted) {
    const roll = Math.random();
    signal = roll < 0.25 ? 'positive' : roll < 0.35 ? 'discomfort' : undefined;
  }

  if (signal) {
    await reactToTurn(turn.index, signal);
  }
}

async function resetSession(): Promise<void> {
  stopAutoPlay();
  state.turns = [];
  state.messages = [];
  state.error = '';
  state.freeComment = '';
  state.pendingEvents = [];
  await memoryStore.clear?.(SCOPE_ID);
  recreateContaminator();
  await refreshMemory();
  render();
}

function recreateContaminator(): void {
  contaminator = createSessionContaminator();
}

function createSessionContaminator(): Contaminator {
  return createContaminator({
    mode: state.mode,
    intensity: 0.85,
    model:
      state.sessionMode === 'live' ? undefined : createScriptedRewriteModel(),
    chat:
      state.sessionMode === 'live'
        ? {
            provider: toChatProvider(state.provider),
            options: createChatOptions(),
            maxTokens: 220,
          }
        : undefined,
    memory: {
      scopeId: SCOPE_ID,
      store: memoryStore,
    },
    rhythm: {
      minPlatformTurns: 2,
      cooldownTurns: 1,
      tiltThreshold: 0.1,
      forcedTiltAfter: 5,
    },
    onNoiseEvent: (event) => {
      state.pendingEvents.push(formatNoiseEvent(event));
    },
  });
}

function createScriptedRewriteModel(): RewriteModel {
  return {
    async generate({ prompt }) {
      const turn = activeScriptedTurn;

      if (!turn) {
        return JSON.stringify({ candidates: [] });
      }

      const plannedKinds = extractPlannedInterventions(prompt);
      const filtered = turn.candidates.filter((candidate) =>
        candidate.applied.some((kind) => plannedKinds.has(kind))
      );
      const candidates = filtered.length > 0 ? filtered : turn.candidates;

      return JSON.stringify({ candidates });
    },
  };
}

function extractPlannedInterventions(prompt: string): Set<InterventionKind> {
  try {
    const parsed = JSON.parse(prompt) as {
      interventions?: Array<{ kind?: InterventionKind }>;
    };

    return new Set(
      parsed.interventions
        ?.map((intervention) => intervention.kind)
        .filter((kind): kind is InterventionKind => Boolean(kind)) ?? []
    );
  } catch {
    return new Set();
  }
}

async function refreshMemory(): Promise<void> {
  state.memory = await loadMemory();
  render();
}

async function loadMemory(): Promise<NoiseMemory | undefined> {
  return memoryStore.load(SCOPE_ID);
}

function toChatProvider(provider: UiProviderName): ChatProviderName {
  return provider === 'local' ? 'openai-compatible' : provider;
}

function createChatOptions(): Record<string, unknown> {
  if (state.provider === 'local') {
    return {
      apiKey: state.apiKey || 'local',
      model: state.model,
      endpoint: state.endpoint,
    };
  }

  return {
    apiKey: state.apiKey,
    model: state.model,
  };
}

function getUiProviders(): UiProviderName[] {
  return [
    ...ChatServiceFactory.getAvailableProviders().filter(
      (provider): provider is ChatProviderName =>
        provider !== 'openai-compatible'
    ),
    'local',
  ];
}

function renderProviderOptions(): string {
  return getUiProviders()
    .map(
      (provider) =>
        `<option value="${escapeHtml(provider)}" ${selected(state.provider, provider)}>${escapeHtml(provider === 'local' ? 'ローカルLLM' : provider)}</option>`
    )
    .join('');
}

function renderModelOptions(): string {
  return getSupportedModelsForUiProvider(state.provider)
    .map((model) => `<option value="${escapeHtml(model)}"></option>`)
    .join('');
}

function getSupportedModelsForUiProvider(provider: UiProviderName): string[] {
  if (provider === 'local') {
    return ['llama3.1', 'qwen2.5', 'gemma3', 'mistral'];
  }

  return ChatServiceFactory.getSupportedModels(provider);
}

function requiresApiKey(): boolean {
  return state.provider !== 'local' && state.provider !== 'gemini-nano';
}

function isFinished(): boolean {
  return state.turns.length >= SESSION_SCENARIO.turns.length;
}

function syncAutoPlay(): void {
  stopAutoPlay();

  if (!state.autoPlay || isFinished()) {
    return;
  }

  autoPlayTimer = window.setTimeout(() => {
    void runNextTurn();
  }, AUTO_PLAY_INTERVAL_MS);
}

function stopAutoPlay(): void {
  if (autoPlayTimer !== undefined) {
    window.clearTimeout(autoPlayTimer);
    autoPlayTimer = undefined;
  }
}

function toggleExpanded(turnIndex: number): void {
  const turn = state.turns[turnIndex];

  if (!turn) {
    return;
  }

  turn.expanded = !turn.expanded;
  render();
}

function scrollToTurn(turnIndex: number): void {
  state.activeHighlight = turnIndex;
  render();
  window.setTimeout(() => {
    document
      .querySelector(`#turn-${turnIndex}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 0);
}

function findCallbackSourceIndex(
  memory: NoiseMemory | undefined,
  currentIndex: number
): number | undefined {
  const used = memory?.memorableMoments
    .filter((moment) => moment.lastUsedTurn >= 0)
    .sort((left, right) => right.lastUsedTurn - left.lastUsedTurn)[0];

  if (!used) {
    return undefined;
  }

  return Math.max(0, Math.min(currentIndex - 1, used.createdTurn));
}

function createMomentSummary(turn: SessionTurn): string {
  const callbackText =
    turn.appliedKinds.includes('callback') &&
    turn.callbackSourceIndex !== undefined
      ? '過去ネタの再登場'
      : turn.finalText;

  return callbackText.slice(0, 80);
}

function formatNoiseEvent(event: NoiseEvent): string {
  switch (event.type) {
    case 'tilt_applied':
      return `崩した: ${event.interventions.map(formatIntervention).join(' / ')}`;
    case 'noise_skipped':
      return `そのまま返した: ${formatSkipReason(event.reason)}`;
    case 'repair_advised':
      return 'スベった気配を検知。しばらく素の返答に戻します。';
    case 'moment_recorded':
      return `ネタ帳に登録: ${event.summary}`;
    case 'callback_used':
      return `過去ネタを再利用: ${event.summary}`;
  }
}

function formatReactionResult(
  signal: NoiseReactionSignal,
  repairAdvised: boolean
): string {
  if (repairAdvised) {
    return `${formatReactionSignal(signal)}。攻め度を下げ、信頼回復に入ります。`;
  }

  if (signal === 'laughter' || signal === 'positive') {
    return `${formatReactionSignal(signal)}。攻め度が上がり、ネタ帳に残る可能性があります。`;
  }

  return `${formatReactionSignal(signal)}。攻め度は大きく変えません。`;
}

function formatTier(tier: RelationshipTier): string {
  switch (tier) {
    case 'stranger':
      return '初見';
    case 'acquaintance':
      return '顔見知り';
    case 'regular':
      return '常連';
    case 'companion':
      return '相棒';
  }
}

function formatRhythmReason(reason: string): string {
  if (reason.includes('landed badly')) {
    return '直前の崩しが引かれたので、信頼回復中です。';
  }

  if (reason.includes('Cooling down')) {
    return '崩した直後なので、一拍おいています。';
  }

  if (reason.includes('Building the platform')) {
    return '「いつものキャラ」を先に積んでいます。';
  }

  if (reason.includes('not predictable enough')) {
    return '返答が十分自然なので、崩す必要なし。';
  }

  if (reason.includes('sincere bid')) {
    return '真剣な相談なので、そのまま受け止めています。';
  }

  if (reason.includes('No tilt for')) {
    return '平坦が続いたので、あえて崩しました。';
  }

  return 'タイミングが良いので崩しました。';
}

function formatSkipReason(reason: NoiseSkipReason): string {
  switch (reason) {
    case 'sincerity':
      return '真剣モード';
    case 'repair':
      return '反省中';
    case 'cooldown':
      return 'ひと休み';
    case 'platform':
      return '準備中';
    case 'low_predictability':
      return '崩す必要なし';
  }
}

function formatReactionSignal(signal: NoiseReactionSignal): string {
  switch (signal) {
    case 'laughter':
      return '草w';
    case 'positive':
      return 'ウケた';
    case 'neutral':
      return 'ふつう';
    case 'silence':
      return 'スルー';
    case 'pushback':
      return '反発';
    case 'discomfort':
      return '引かれた';
  }
}

function formatIntervention(kind: InterventionKind): string {
  switch (kind) {
    case 'ground_in_recent_comment':
      return '直近コメントに寄せる';
    case 'add_streamer_judgment':
      return '配信者の判断を入れる';
    case 'soft_disagreement':
      return '少しだけ否定を混ぜる';
    case 'contrarian_reframe':
      return '逆の着地に振る';
    case 'self_repair':
      return '言い直しの揺れを足す';
    case 'unfinished_margin':
      return '余白を残して終える';
    case 'reduce_over_apology':
      return '謝罪の温度を下げる';
    case 'reduce_over_agreement':
      return '肯定しすぎを抑える';
    case 'increase_specificity':
      return '具体的な足場を足す';
    case 'acknowledge_tension':
      return '場の緊張を拾う';
    case 'break_clean_closing':
      return 'きれいな締めを崩す';
    case 'callback':
      return '過去ネタを再登場させる';
    case 'dispreferred_shape':
      return '同意の形を人間らしく崩す';
    case 'boke_bait':
      return 'ツッコミ待ちのボケを仕込む';
    case 'tsukkomi':
      return '鋭く(でも遊びで)ツッコむ';
    case 'withheld_uptake':
      return 'あえて乗らない';
    case 'status_seesaw':
      return '一瞬上から→すぐ自虐';
    case 'response_length_violation':
      return 'あえて短く返す';
  }
}

interface DiffSegment {
  type: 'same' | 'removed' | 'added';
  text: string;
}

function renderDiffText(before: string, after: string): string {
  return diffSegments(before, after)
    .map((segment) => {
      const text = escapeHtml(segment.text);

      switch (segment.type) {
        case 'removed':
          return `<del class="diff-removed">${text}</del>`;
        case 'added':
          return `<mark class="diff-added">${text}</mark>`;
        default:
          return text;
      }
    })
    .join('');
}

function diffSegments(before: string, after: string): DiffSegment[] {
  const a = tokenizeForDiff(before);
  const b = tokenizeForDiff(after);
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0)
  );

  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      dp[i][j] =
        a[i] === b[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const segments: DiffSegment[] = [];
  const push = (type: DiffSegment['type'], text: string): void => {
    const last = segments[segments.length - 1];

    if (last && last.type === type) {
      last.text += text;
    } else {
      segments.push({ type, text });
    }
  };
  let i = 0;
  let j = 0;

  while (i < m && j < n) {
    if (a[i] === b[j]) {
      push('same', a[i]);
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      push('removed', a[i]);
      i += 1;
    } else {
      push('added', b[j]);
      j += 1;
    }
  }

  while (i < m) {
    push('removed', a[i]);
    i += 1;
  }

  while (j < n) {
    push('added', b[j]);
    j += 1;
  }

  return segments;
}

function tokenizeForDiff(text: string): string[] {
  return (
    text.match(/[A-Za-z0-9]+|[ぁ-んー]+|[ァ-ヶー]+|[一-龯々]+|\s+|[^\s]/g) ?? []
  );
}

function selected(current: string, expected: string): string {
  return current === expected ? 'selected' : '';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
