import { ChatServiceFactory, type ChatProviderName } from '@aituber-onair/chat';
import {
  InMemoryNoiseMemoryStore,
  createContaminator,
  resolveRelationshipTier,
  type ContaminateGates,
  type ContaminateOutput,
  type InterventionKind,
  type NoiseMemory,
  type NoiseMemoryStore,
  type NoiseEvent,
  type NoiseMode,
  type NoiseQualityReport,
  type NoiseReactionSignal,
  type NoiseSkipReason,
  type EvaluatedCandidate,
  type InterventionPlan,
  type PredictabilityDiagnosis,
  type PredictabilityIssue,
  type PredictabilityIssueKind,
  type RelationshipTier,
  type RhythmPhase,
  type StreamContext,
} from '../../../src/index';
import { LocalStorageNoiseMemoryStore } from '../../../src/web';
import './styles.css';

type StoreKind = 'localStorage' | 'memory';
type PresetKey = 'repeatedQuestion' | 'streamTrouble' | 'flatMood';
type UiProviderName = ChatProviderName | 'local';

interface AppState {
  activePreset: PresetKey;
  storeKind: StoreKind;
  mode: NoiseMode;
  intensity: number;
  seed: string;
  apiKey: string;
  provider: UiProviderName;
  model: string;
  endpoint: string;
  connectionDialogOpen: boolean;
  isRunning: boolean;
  systemPrompt: string;
  messagesText: string;
  draft: string;
  output: string;
  error: string;
  memory?: NoiseMemory;
  quality?: NoiseQualityReport;
  diagnosis?: PredictabilityDiagnosis;
  plan?: InterventionPlan;
  candidates: EvaluatedCandidate[];
  selectedIndex: number;
  applied: string[];
  predictability: number;
  contamination: number;
  relationshipCapital: number;
  respectRhythm: boolean;
  gates?: ContaminateGates;
  skipped?: ContaminateOutput['skipped'];
  noiseEvents: string[];
  isReacting: boolean;
  history: Array<{ before: number; after: number; skipped: boolean }>;
}

const SCOPE_ID = 'noise-sample';
const localStore = new LocalStorageNoiseMemoryStore({
  keyPrefix: 'aituber-onair:noise-sample',
});
const memoryStore = new InMemoryNoiseMemoryStore();

const PRESETS: Record<
  PresetKey,
  {
    label: string;
    description: string;
    systemPrompt: string;
    messagesText: string;
    draft: string;
    streamContext: StreamContext;
  }
> = {
  repeatedQuestion: {
    label: '同じ質問が流れる',
    description: '同じ質問に、ただ丁寧に返すだけの流れを避けます。',
    systemPrompt:
      'あなたは、コメント欄の空気を読みながら話すAITuberです。無難にまとめすぎず、配信の温度を残します。',
    messagesText:
      '視聴者A: 今日のゲームなに？\n視聴者B: 今日のゲームなに？\n視聴者C: さっきも聞いたけど今日のゲームなに？',
    draft:
      '同じ質問が何度か流れていますが、みんなが興味を持ってくれている証拠なので嬉しいです。順番に答えていくので、少し待っていてくださいね。',
    streamContext: {
      currentSituation: '同じ質問が複数回流れている',
      audienceMood: '少し繰り返し気味',
    },
  },
  streamTrouble: {
    label: '配信トラブル',
    description: '事務的な謝罪だけで終わらない返答にします。',
    systemPrompt:
      'あなたは、配信中の違和感や失敗も少しだけ言葉にできるAITuberです。',
    messagesText:
      '視聴者A: 音止まった？\n視聴者B: 今ちょっと無音だった\n視聴者C: 大丈夫？',
    draft:
      '音声が一時的に途切れてしまい申し訳ありません。現在確認していますので、少しお待ちください。ご不便をおかけしてすみません。',
    streamContext: {
      currentSituation: '音声トラブルが起きた直後',
      audienceMood: '少し不安',
    },
  },
  flatMood: {
    label: '空気が落ちた',
    description: '盛り上がっているふりで流す返答を避けます。',
    systemPrompt:
      'あなたは、配信の空気が落ちたときに取り繕いすぎないAITuberです。',
    messagesText:
      '視聴者A: ちょっと静かだね\n視聴者B: 今の流れ、少し退屈かも\n視聴者C: 何か変える？',
    draft:
      'コメントありがとうございます。今の流れも楽しんでもらえるように、引き続き明るく進めていきます。みんなで楽しい時間にしていきましょう。',
    streamContext: {
      currentSituation: '配信の空気が少し落ちている',
      audienceMood: '退屈気味',
    },
  },
};

const state: AppState = {
  activePreset: 'repeatedQuestion',
  storeKind: 'localStorage',
  mode: 'performer',
  intensity: 0.75,
  seed: 'noise-sample',
  apiKey: '',
  provider: 'openai',
  model: 'gpt-4o-mini',
  endpoint: 'http://127.0.0.1:11434/v1/chat/completions',
  connectionDialogOpen: false,
  isRunning: false,
  systemPrompt: PRESETS.repeatedQuestion.systemPrompt,
  messagesText: PRESETS.repeatedQuestion.messagesText,
  draft: PRESETS.repeatedQuestion.draft,
  output: '',
  error: '',
  candidates: [],
  selectedIndex: -1,
  applied: [],
  predictability: 0,
  contamination: 0,
  relationshipCapital: 0.5,
  respectRhythm: false,
  noiseEvents: [],
  isReacting: false,
  history: [],
};

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('App root was not found.');
}

render();
void loadInitialMemory();

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && state.connectionDialogOpen) {
    state.connectionDialogOpen = false;
    render();
  }
});

function render(): void {
  app.innerHTML = `
    <section class="app-shell">
      <header class="hero">
        <div class="hero-inner">
          <div class="hero-copy">
            <a class="eyebrow" href="https://github.com/shinshin86/aituber-onair" target="_blank" rel="noreferrer">@aituber-onair/noise</a>
            <h1>Noise Sample</h1>
            <p class="lead">AIの返答を、予定調和で終わらせない。</p>
          </div>
        </div>
      </header>

      <main class="workspace">
        <section class="panel intro-panel">
          <div class="panel-heading">
            <div>
              <h2>書き換える場面を選ぶ</h2>
              <p>AIの返答が丁寧すぎたり、毎回同じ締め方になりやすい場面を選びます。</p>
            </div>
          </div>
          <div class="preset-grid">
            ${Object.entries(PRESETS)
              .map(([key, preset]) =>
                renderPresetButton(key as PresetKey, preset)
              )
              .join('')}
          </div>
        </section>

        ${renderConnectionStrip()}

        <section class="compare-grid">
          <section class="panel compare-panel">
            <div class="panel-heading compact">
              <div>
                <h2>元のAI返答</h2>
                <p>そのままだと、無難にまとまりすぎている返答です。</p>
              </div>
            </div>
            <textarea data-field="draft" class="draft" aria-label="元のAI返答">${escapeHtml(state.draft)}</textarea>
          </section>

          <section class="panel compare-panel result-panel">
            <div class="panel-heading compact">
              <div>
                <h2>書き換え後</h2>
                <p>意味とキャラクターを保ったまま、配信で使いやすく整えます。</p>
              </div>
              ${state.skipped ? `<span class="score-pill skip-pill">スキップ: ${escapeHtml(formatSkipReason(state.skipped.reason))}</span>` : state.quality ? `<span class="score-pill">書き換え後 ${formatScore(state.predictability)}</span>` : ''}
            </div>
            <div class="output${state.error ? ' error-output' : ''}" aria-live="polite" aria-busy="${state.isRunning}">${renderOutput()}</div>
          </section>
        </section>

        <section class="actions">
          <button data-action="run" class="primary"${state.isRunning ? ' disabled' : ''}>${state.isRunning ? '書き換え中…' : '返答を書き換える'}</button>
          <button data-action="reset" class="secondary"${state.isRunning ? ' disabled' : ''}>記録をリセット</button>
        </section>

        ${renderChangePanel()}

        ${renderOrchestrationPanel()}

        ${renderIntentPanel()}

        <section class="panel report-panel">
          <div class="panel-heading compact">
            <div>
              <h2>改善レポート</h2>
              <p>無難さが減り、意味・キャラクター・文脈が保たれているかを確認します。</p>
            </div>
          </div>
          ${renderVerificationReport()}
        </section>

        <details class="panel details-panel">
          <summary>詳細設定</summary>
          <div class="details-body">
            <section class="settings-grid">
              <label>
                <span class="label-row">書き換えの強さ<output class="range-value">${state.intensity.toFixed(2)}</output></span>
                <input data-field="intensity" type="range" min="0" max="1" step="0.05" value="${state.intensity}" />
              </label>
              <label>
                書き換えモード
                <select data-field="mode">
                  <option value="subtle" ${selected(state.mode, 'subtle')}>控えめ</option>
                  <option value="performer" ${selected(state.mode, 'performer')}>キャラクター重視</option>
                  <option value="bold" ${selected(state.mode, 'bold')}>大胆</option>
                  <option value="inversion" ${selected(state.mode, 'inversion')}>逆張り</option>
                  <option value="chaotic" ${selected(state.mode, 'chaotic')}>強めに崩す</option>
                </select>
              </label>
              <label>
                同じ表現を避けるための記録
                <select data-field="storeKind">
                  <option value="localStorage" ${selected(state.storeKind, 'localStorage')}>ブラウザに保存</option>
                  <option value="memory" ${selected(state.storeKind, 'memory')}>この画面だけ</option>
                </select>
              </label>
              <label>
                シード値
                <input data-field="seed" value="${escapeHtml(state.seed)}" />
              </label>
              <label>
                <span class="label-row">視聴者との距離(親密度)<output class="capital-value">${formatCapital(state.relationshipCapital)}</output></span>
                <input data-field="relationshipCapital" type="range" min="0" max="1" step="0.05" value="${state.relationshipCapital}" />
              </label>
              <label class="checkbox-label">
                <input data-field="respectRhythm" type="checkbox" ${state.respectRhythm ? 'checked' : ''} />
                崩すタイミングを自動で判断させる(崩した直後などはそのまま返す)
              </label>
            </section>

            <section class="debug-grid">
              <label>
                キャラクター設定
                <textarea data-field="systemPrompt">${escapeHtml(state.systemPrompt)}</textarea>
              </label>
              <label>
                直近コメント
                <textarea data-field="messagesText">${escapeHtml(state.messagesText)}</textarea>
              </label>
            </section>

            <section class="debug-grid">
              <div>
                <p class="debug-label">調整した返答のクセ</p>
                <ul class="chips">
                  ${state.applied.length > 0 ? state.applied.map((item) => `<li>${escapeHtml(item)}</li>`).join('') : '<li>まだありません</li>'}
                </ul>
              </div>
              <div>
                <p class="debug-label">繰り返し防止の記録</p>
                <pre>${escapeHtml(formatMemory(state.memory))}</pre>
              </div>
            </section>
          </div>
        </details>
        ${state.connectionDialogOpen ? renderConnectionDialog() : ''}
      </main>
    </section>
  `;

  bindEvents();
}

function renderOutput(): string {
  if (state.isRunning) {
    return `<span class="output-loading"><span class="spinner" aria-hidden="true"></span>LLMで書き換えています…</span>`;
  }

  if (state.error) {
    return escapeHtml(state.error);
  }

  if (state.output) {
    return escapeHtml(state.output);
  }

  return `<span class="output-placeholder">書き換えに使うAIを設定し、「返答を書き換える」を押すと結果が表示されます。</span>`;
}

function renderConnectionStrip(): string {
  const configured =
    isLocalProvider() ||
    state.provider === 'gemini-nano' ||
    state.apiKey.trim();
  const modelLabel = state.model.trim() || 'モデル未設定';

  return `
    <section class="connection-strip">
      <div>
        <span>書き換えに使うAI</span>
        <strong>${configured ? `${escapeHtml(getProviderLabel(state.provider))} / ${escapeHtml(modelLabel)}` : '未設定'}</strong>
      </div>
      <button data-action="open-settings" class="secondary" type="button">AIを設定</button>
    </section>
  `;
}

function renderConnectionDialog(): string {
  return `
    <div class="modal-backdrop" role="presentation">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="connection-title">
        <div class="panel-heading">
          <div>
            <h2 id="connection-title">書き換えに使うAI</h2>
            <p>返答の書き換えに使うAIサービスを設定します。</p>
          </div>
        </div>
        <section class="settings-grid">
          <label>
            AIサービス
            <select data-field="provider">${renderProviderOptions()}</select>
          </label>
          ${
            requiresApiKey()
              ? `<label>
            APIキー
            <input data-field="apiKey" type="password" value="${escapeHtml(state.apiKey)}" autocomplete="off" />
          </label>`
              : ''
          }
          <label>
            モデル
            <input data-field="model" value="${escapeHtml(state.model)}" list="modal-model-options" />
            <datalist id="modal-model-options">${renderModelOptions()}</datalist>
          </label>
          ${
            isLocalProvider()
              ? `<label>
            Endpoint
            <input data-field="endpoint" value="${escapeHtml(state.endpoint)}" />
          </label>`
              : ''
          }
        </section>
        <div class="modal-actions">
          <button data-action="close-settings" class="secondary" type="button">閉じる</button>
          <button data-action="save-settings" class="primary" type="button">設定を保存</button>
        </div>
      </section>
    </div>
  `;
}

function renderProviderOptions(): string {
  return getUiProviders()
    .map(
      (provider) =>
        `<option value="${escapeHtml(provider)}" ${selected(state.provider, provider)}>${escapeHtml(getProviderLabel(provider))}</option>`
    )
    .join('');
}

function renderModelOptions(): string {
  return getSupportedModelsForUiProvider(state.provider)
    .map((model) => `<option value="${escapeHtml(model)}"></option>`)
    .join('');
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

function getProviderLabel(provider: UiProviderName): string {
  return provider === 'local' ? 'ローカルLLM' : provider;
}

function getSupportedModelsForUiProvider(provider: UiProviderName): string[] {
  if (provider === 'local') {
    return ['llama3.1', 'qwen2.5', 'gemma3', 'mistral'];
  }

  return ChatServiceFactory.getSupportedModels(provider);
}

function isLocalProvider(): boolean {
  return state.provider === 'local';
}

function requiresApiKey(): boolean {
  return state.provider !== 'local' && state.provider !== 'gemini-nano';
}

function renderPresetButton(
  key: PresetKey,
  preset: (typeof PRESETS)[PresetKey]
): string {
  const active = state.activePreset === key ? ' active' : '';

  return `
    <button data-preset="${key}" class="preset-card${active}">
      <span>${escapeHtml(preset.label)}</span>
      <small>${escapeHtml(preset.description)}</small>
    </button>
  `;
}

function renderVerificationReport(): string {
  if (!state.quality) {
    return `
      <div class="empty-report">
        書き換え後に、無難さの変化と品質チェックが表示されます。
      </div>
    `;
  }

  const checks = state.quality.checks;

  return `
    <div class="report-grid">
      ${renderMetricBar(
        '書き換え前の無難さ',
        checks.predictabilityBefore,
        'metric-before'
      )}
      ${renderMetricBar(
        '書き換え後の無難さ',
        checks.predictabilityAfter,
        'metric-after'
      )}
      ${renderMetricBar('品質スコア', state.quality.score, 'metric-quality')}
    </div>
    <div class="guard-grid">
      ${renderGuard('キャラクター', checks.preservedCharacter)}
      ${renderGuard('変えすぎていないか', checks.avoidedOvercorrection)}
      ${renderGuard('直近コメントとのつながり', checks.groundedInContext)}
    </div>
    <ul class="report-issues">
      ${
        state.quality.issues.length > 0
          ? state.quality.issues
              .map(
                (issue) =>
                  `<li>${escapeHtml(formatQualityIssue(issue.kind))}</li>`
              )
              .join('')
          : '<li>大きな問題は見つかっていません。</li>'
      }
    </ul>
  `;
}

function renderChangePanel(): string {
  if (!state.quality && !state.skipped) {
    return `
      <section class="panel change-panel">
        <div class="panel-heading compact">
          <div>
            <h2>どこをどう崩した?</h2>
            <p>書き換え後に、変わった場所と「お決まり度」の変化がここに表示されます。</p>
          </div>
        </div>
        <div class="empty-report">まだ書き換えていません。「返答を書き換える」を押してみてください。</div>
      </section>
    `;
  }

  if (state.skipped) {
    return `
      <section class="panel change-panel">
        <div class="panel-heading compact">
          <div>
            <h2>どこをどう崩した?</h2>
            <p>今回は崩していません。</p>
          </div>
        </div>
        <div class="skip-explain">
          <strong>今回はそのまま返しました</strong>
          <p>${escapeHtml(formatSkipExplain(state.skipped.reason))}</p>
        </div>
        ${renderHistoryChart()}
      </section>
    `;
  }

  const before = state.quality?.checks.predictabilityBefore ?? 0;
  const after = state.quality?.checks.predictabilityAfter ?? 0;
  const delta = Math.round((before - after) * 100);

  return `
    <section class="panel change-panel">
      <div class="panel-heading compact">
        <div>
          <h2>どこをどう崩した?</h2>
          <p>「お決まりの返し」をどれだけ崩せたかと、実際に変わった場所です。</p>
        </div>
      </div>
      <div class="harmony-meter">
        <div class="harmony-row">
          <span class="harmony-label">書き換え前のお決まり度</span>
          <div class="metric-track"><span class="metric-fill metric-before" style="width: ${Math.round(before * 100)}%"></span></div>
          <strong>${Math.round(before * 100)}%</strong>
        </div>
        <div class="harmony-row">
          <span class="harmony-label">書き換え後のお決まり度</span>
          <div class="metric-track"><span class="metric-fill metric-after" style="width: ${Math.round(after * 100)}%"></span></div>
          <strong>${Math.round(after * 100)}%</strong>
        </div>
        <span class="delta-badge ${delta > 0 ? 'delta-good' : 'delta-flat'}">${delta > 0 ? `お決まり度 −${delta}pt 崩せました` : 'お決まり度はほぼ変わりませんでした'}</span>
      </div>
      <div class="diff-surface">
        <div class="diff-legend">
          <span><del class="diff-removed">取り消し線</del> = 削った「お決まり」の部分</span>
          <span><mark class="diff-added">ハイライト</mark> = 新しく入れた「崩し」</span>
        </div>
        <p class="diff-text">${renderDiffText(state.draft, state.output)}</p>
      </div>
      ${
        state.applied.length > 0
          ? `
      <div class="applied-friendly">
        <p class="debug-label">入れた崩し</p>
        <ul class="chips">
          ${state.applied.map((kind) => `<li>${escapeHtml(formatIntervention(kind as InterventionKind))}</li>`).join('')}
        </ul>
      </div>`
          : ''
      }
      ${renderHistoryChart()}
    </section>
  `;
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

function renderHistoryChart(): string {
  if (state.history.length < 2) {
    return '';
  }

  const recent = state.history.slice(-12);

  return `
    <div class="history-chart">
      <p class="debug-label">この画面でのお決まり度の推移(灰=書き換え前 / 緑=書き換え後)</p>
      <div class="history-bars">
        ${recent
          .map((run, index) => {
            const beforeHeight = Math.max(4, Math.round(run.before * 100));
            const afterHeight = Math.max(4, Math.round(run.after * 100));

            return `
              <div class="history-col" title="${index + 1}回目: ${Math.round(run.before * 100)}% → ${Math.round(run.after * 100)}%${run.skipped ? '(そのまま返した)' : ''}">
                <div class="history-pair">
                  <span class="history-bar history-bar-before" style="height: ${beforeHeight}%"></span>
                  <span class="history-bar ${run.skipped ? 'history-bar-skipped' : 'history-bar-after'}" style="height: ${afterHeight}%"></span>
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    </div>
  `;
}

function formatSkipExplain(reason: NoiseSkipReason): string {
  switch (reason) {
    case 'sincerity':
      return '視聴者が真剣な話をしているので、ふざけずにそのまま受け止めました。';
    case 'repair':
      return '前回の崩しがウケなかったので、しばらく素の返答で信頼を回復しています。';
    case 'cooldown':
      return '崩しの連発はすぐ飽きられるので、一拍おいて次の崩しを際立たせています。';
    case 'platform':
      return '崩しが映えるように、まず「いつものキャラ」のターンを積んでいます。';
    case 'low_predictability':
      return 'この返答は十分自然なので、崩す必要がありませんでした。';
  }
}

function renderOrchestrationPanel(): string {
  const memory = state.memory;
  const rhythm = memory?.rhythm;
  const budget = memory?.violationBudget ?? 1;
  const tier = resolveRelationshipTier(state.relationshipCapital);

  return `
    <section class="panel orchestration-panel">
      <div class="panel-heading compact">
        <div>
          <h2>崩しの司令塔</h2>
          <p>「いま崩していいか」「どこまで攻めていいか」を判断している様子です。崩しは毎回入れず、関係が深いほど強くできます。</p>
        </div>
      </div>
      <div class="gate-grid">
        ${renderGateCard(
          '真剣な場面の検知',
          state.gates
            ? state.gates.sincerity.serious
              ? 'ふざけない'
              : '問題なし'
            : '未実行',
          state.gates?.sincerity.serious
            ? '真剣な相談や弱音には、崩さずそのまま向き合います。'
            : '直近コメントに真剣な相談・弱音はありません。崩してOKです。',
          state.gates ? !state.gates.sincerity.serious : undefined
        )}
        ${renderGateCard(
          '視聴者との距離',
          `${formatTier(state.gates?.relationship.tier ?? tier)} (${formatCapital(state.gates?.relationship.capital ?? state.relationshipCapital)})`,
          state.gates
            ? `今回の攻め方: ${formatMode(state.gates.relationship.effectiveMode)}(設定: ${formatMode(state.mode)})。距離が近いほどイジリやツッコミが解禁されます。`
            : `この距離なら「${formatMode(previewMaxMode(tier))}」まで攻められます。`,
          undefined
        )}
        ${renderGateCard(
          '崩すタイミング',
          state.gates
            ? formatRhythmPhase(state.gates.rhythm.phase)
            : rhythm
              ? `いつも通り ${rhythm.platformTurns} ターン継続中`
              : '未実行',
          state.gates
            ? formatRhythmReason(state.gates.rhythm.reason)
            : rhythm
              ? formatRhythmCounters(rhythm)
              : 'まだターンが記録されていません。',
          state.gates ? state.gates.rhythm.apply : undefined
        )}
      </div>
      ${rhythm ? `<p class="rhythm-counters">${escapeHtml(formatRhythmCounters(rhythm))}</p>` : ''}
      <div class="budget-row">
        <div class="metric-label">
          <span>攻め度メーター(視聴者の反応で増減)</span>
          <strong>${Math.round(budget * 100)}%</strong>
        </div>
        <div class="metric-track">
          <span class="metric-fill metric-quality" style="width: ${Math.round(budget * 100)}%"></span>
        </div>
        <p class="budget-hint">ウケると上がって攻めやすくなり、スベると下がってしばらく大人しくなります。</p>
      </div>
      <div class="reaction-row">
        <span class="reaction-label">いまの返答、視聴者の反応は?:</span>
        ${renderReactionButton('laughter', '草が生えたw')}
        ${renderReactionButton('positive', 'ウケた')}
        ${renderReactionButton('silence', 'スルーされた')}
        ${renderReactionButton('pushback', '反発された')}
        ${renderReactionButton('discomfort', '引かれた')}
      </div>
      <div class="orchestration-grid">
        <div>
          <p class="debug-label">ネタ帳(また使える共有ネタ)</p>
          ${renderGagLedger()}
        </div>
        <div>
          <p class="debug-label">何が起きたかの記録</p>
          ${renderEventLog()}
        </div>
      </div>
    </section>
  `;
}

function renderGateCard(
  title: string,
  status: string,
  detail: string,
  passed: boolean | undefined
): string {
  const statusClass =
    passed === undefined ? 'gate-neutral' : passed ? 'gate-open' : 'gate-hold';

  return `
    <article class="gate-card">
      <header>
        <h3>${escapeHtml(title)}</h3>
        <span class="gate-status ${statusClass}">${escapeHtml(status)}</span>
      </header>
      <p>${escapeHtml(detail)}</p>
    </article>
  `;
}

function renderReactionButton(
  signal: NoiseReactionSignal,
  label: string
): string {
  const disabled = state.isReacting || state.isRunning ? ' disabled' : '';

  return `<button data-action="react" data-signal="${signal}" class="secondary reaction-button"${disabled}>${escapeHtml(label)}</button>`;
}

function renderGagLedger(): string {
  const moments = state.memory?.memorableMoments ?? [];

  if (moments.length === 0) {
    return '<p class="empty-inline">まだありません。崩しがウケると、その瞬間が「また使えるネタ」としてここに残ります。</p>';
  }

  return `
    <ul class="gag-list">
      ${moments
        .slice(-6)
        .reverse()
        .map(
          (moment) =>
            `<li><span class="gag-count">×${moment.callbacks}</span>${escapeHtml(moment.summary)}</li>`
        )
        .join('')}
    </ul>
  `;
}

function renderEventLog(): string {
  if (state.noiseEvents.length === 0) {
    return '<p class="empty-inline">まだありません。書き換えや視聴者の反応に応じて、ここに記録が流れます。</p>';
  }

  return `
    <ul class="event-log">
      ${state.noiseEvents.map((entry) => `<li>${escapeHtml(entry)}</li>`).join('')}
    </ul>
  `;
}

function previewMaxMode(tier: RelationshipTier): NoiseMode {
  switch (tier) {
    case 'stranger':
      return 'subtle';
    case 'acquaintance':
      return 'performer';
    case 'regular':
      return 'inversion';
    case 'companion':
      return 'chaotic';
  }
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

function formatCapital(value: number): string {
  return value.toFixed(2);
}

function formatMode(mode: NoiseMode): string {
  switch (mode) {
    case 'subtle':
      return '控えめ';
    case 'performer':
      return 'キャラクター重視';
    case 'bold':
      return '大胆';
    case 'inversion':
      return '逆張り';
    case 'chaotic':
      return '強めに崩す';
  }
}

function formatRhythmPhase(phase: RhythmPhase): string {
  switch (phase) {
    case 'platform':
      return 'いつも通り';
    case 'tilt':
      return '今回は崩した';
    case 'cooldown':
      return '連発防止のひと休み';
    case 'repair':
      return '信頼回復中';
  }
}

function formatRhythmReason(reason: string): string {
  if (reason.includes('forced by the caller')) {
    return '(ラボ設定)タイミング判断を飛ばして、毎回崩しています。';
  }

  if (reason.includes('landed badly')) {
    return '直前の崩しがスベったので、信頼が戻るまで素の返答にしています。';
  }

  if (reason.includes('Cooling down')) {
    return '崩した直後なので一拍おいています。連発すると「事件」ではなく「芸風」になってしまうためです。';
  }

  if (reason.includes('Building the platform')) {
    return '崩しが映えるように、まず「いつものキャラ」のターンを積んでいます。';
  }

  if (reason.includes('not predictable enough')) {
    return 'この返答は十分自然なので、崩す必要がありませんでした。';
  }

  if (reason.includes('No tilt for')) {
    return 'しばらく平坦が続いたので、飽きられる前にあえて崩しました。';
  }

  return 'タイミング的に問題ないため崩しました。';
}

function formatRhythmCounters(
  rhythm: NonNullable<NoiseMemory['rhythm']>
): string {
  const sinceTilt =
    rhythm.turnsSinceTilt === -1
      ? 'まだ崩していません'
      : `最後に崩してから ${rhythm.turnsSinceTilt} ターン`;

  return `累計 ${rhythm.totalTurns} ターン / いつも通りが連続 ${rhythm.platformTurns} / ${sinceTilt} / ひと休み残り ${rhythm.cooldownRemaining} / 信頼回復残り ${rhythm.repairRemaining}`;
}

function formatSkipReason(reason: NoiseSkipReason): string {
  switch (reason) {
    case 'sincerity':
      return '真剣な場面なのでふざけない';
    case 'repair':
      return 'スベった後の信頼回復中';
    case 'cooldown':
      return '連発防止のひと休み';
    case 'platform':
      return 'まず「いつも通り」を積む';
    case 'low_predictability':
      return '十分自然なので崩す必要なし';
  }
}

function formatReactionSignal(signal: NoiseReactionSignal): string {
  switch (signal) {
    case 'laughter':
      return '草が生えたw';
    case 'positive':
      return 'ウケた';
    case 'neutral':
      return 'ふつう';
    case 'silence':
      return 'スルーされた';
    case 'pushback':
      return '反発された';
    case 'discomfort':
      return '引かれた';
  }
}

function pushNoiseEvent(entry: string): void {
  state.noiseEvents = [entry, ...state.noiseEvents].slice(0, 8);
}

function renderIntentPanel(): string {
  if (!state.diagnosis || !state.plan) {
    return `
      <section class="panel intent-panel">
        <div class="panel-heading compact">
          <div>
            <h2>書き換えの意図</h2>
            <p>どこを見て、どう直そうとしたかを表示します。</p>
          </div>
        </div>
        <div class="empty-report">書き換え後に、検知した箇所と介入方針が表示されます。</div>
      </section>
    `;
  }

  return `
    <section class="panel intent-panel">
      <div class="panel-heading compact">
        <div>
          <h2>書き換えの意図</h2>
          <p>元の返答・直近コメント・配信状況から、変更理由を組み立てます。</p>
        </div>
      </div>
      <div class="intent-grid">
        <section class="annotation-surface">
          <h3>検知した箇所</h3>
          <div class="annotated-text">${renderAnnotatedDraft()}</div>
          <ul class="annotation-list">
            ${state.diagnosis.issues
              .slice(0, 5)
              .map((issue, index) => renderIssueItem(issue, index))
              .join('')}
          </ul>
        </section>
        <section class="annotation-surface">
          <h3>選んだ介入</h3>
          <div class="intent-flow">
            ${state.plan.interventions
              .map((intervention, index) => {
                const percent = Math.round(intervention.strength * 100);
                return `
                  <article class="intent-step">
                    <span class="intent-index">${index + 1}</span>
                    <div>
                      <strong>${escapeHtml(formatIntervention(intervention.kind))}</strong>
                      <p>${escapeHtml(formatInterventionReason(intervention.reason))}</p>
                      <div class="metric-track intent-track">
                        <span class="metric-fill metric-after" style="width: ${percent}%"></span>
                      </div>
                    </div>
                  </article>
                `;
              })
              .join('')}
          </div>
          ${renderCandidateSummary()}
        </section>
      </div>
    </section>
  `;
}

function renderAnnotatedDraft(): string {
  if (!state.diagnosis) {
    return escapeHtml(state.draft);
  }

  const annotations = state.diagnosis.issues
    .map((issue, index) => findAnnotation(issue, index))
    .filter((annotation): annotation is TextAnnotation => Boolean(annotation))
    .sort((left, right) => left.start - right.start);
  const ranges: TextAnnotation[] = [];

  for (const annotation of annotations) {
    const previous = ranges[ranges.length - 1];

    if (!previous || annotation.start >= previous.end) {
      ranges.push(annotation);
    }
  }

  if (ranges.length === 0) {
    return escapeHtml(state.draft);
  }

  let html = '';
  let cursor = 0;

  for (const annotation of ranges) {
    html += escapeHtml(state.draft.slice(cursor, annotation.start));
    html += `<mark class="annotation-mark" title="${escapeHtml(annotation.title)}">${escapeHtml(state.draft.slice(annotation.start, annotation.end))}</mark>`;
    cursor = annotation.end;
  }

  html += escapeHtml(state.draft.slice(cursor));
  return html;
}

interface TextAnnotation {
  start: number;
  end: number;
  title: string;
}

function findAnnotation(
  issue: PredictabilityIssue,
  index: number
): TextAnnotation | undefined {
  const pattern = getIssuePattern(issue.kind);

  if (!pattern) {
    return undefined;
  }

  const match = state.draft.match(pattern);

  if (!match || match.index === undefined) {
    return undefined;
  }

  return {
    start: match.index,
    end: match.index + match[0].length,
    title: `${index + 1}. ${formatIssueKind(issue.kind)}`,
  };
}

function getIssuePattern(kind: PredictabilityIssueKind): RegExp | undefined {
  switch (kind) {
    case 'generic_closing':
      return /次回も楽しみに|また来て|よろしくお願いします|良い一日/;
    case 'over_agreement':
      return /嬉しいです|証拠なので|その通り|いいですね|もちろん/;
    case 'over_apology':
      return /申し訳ありません|すみません|ご不便をおかけ|少しお待ちください/;
    case 'forced_positive':
      return /楽しい時間|明るく進め|楽しんでもらえる|みんなで楽しく/;
    case 'too_complete':
      return /まとめると|結論として|最後に|順番に答えて/;
    case 'low_context_grounding':
      return /引き続き|ご不便をおかけ|順番に|明るく進め/;
    case 'repeated_phrase':
      return /同じ質問|何度か|何回|さっきも/;
    case 'low_specificity':
      return /コメントありがとうございます|引き続き|少し待っていてください/;
    case 'no_streamer_judgment':
      return /少し待っていてください|現在確認しています|引き続き/;
    case 'persona_flattening':
      return /ありがとうございます|申し訳ありません|少しお待ちください|丁寧/;
    default:
      return undefined;
  }
}

function renderIssueItem(issue: PredictabilityIssue, index: number): string {
  return `
    <li>
      <span class="issue-dot">${index + 1}</span>
      <div>
        <strong>${escapeHtml(formatIssueKind(issue.kind))}</strong>
        <p>${escapeHtml(formatIssueSource(issue))}</p>
      </div>
    </li>
  `;
}

function renderCandidateSummary(): string {
  if (state.candidates.length === 0) {
    return '';
  }

  return `
    <div class="candidate-summary">
      <h3>候補の選択</h3>
      <div class="candidate-bars">
        ${state.candidates
          .map((candidate, index) => {
            const percent = Math.round(candidate.evaluation.finalScore * 100);
            const selectedClass =
              index === state.selectedIndex ? ' selected' : '';

            return `
              <div class="candidate-row${selectedClass}">
                <span>候補 ${index + 1}</span>
                <div class="metric-track">
                  <span class="metric-fill metric-quality" style="width: ${percent}%"></span>
                </div>
                <strong>${percent}%</strong>
              </div>
            `;
          })
          .join('')}
      </div>
    </div>
  `;
}

function formatIssueKind(kind: PredictabilityIssueKind): string {
  switch (kind) {
    case 'generic_closing':
      return 'きれいに閉じすぎ';
    case 'over_agreement':
      return '受け止め方が丸い';
    case 'over_apology':
      return '謝罪が事務的';
    case 'forced_positive':
      return '明るくまとめすぎ';
    case 'low_context_grounding':
      return '直近コメントが薄い';
    case 'low_specificity':
      return '具体的な足場が少ない';
    case 'repeated_phrase':
      return '繰り返し圧がある';
    case 'too_complete':
      return '会話を終わらせすぎ';
    case 'no_streamer_judgment':
      return '配信者側の判断が弱い';
    case 'persona_flattening':
      return 'キャラの角が丸まりすぎ';
    default:
      return '確認が必要';
  }
}

function formatIssueSource(issue: PredictabilityIssue): string {
  switch (issue.kind) {
    case 'generic_closing':
      return '締めの形がきれいすぎるため、会話の余白を残します。';
    case 'over_agreement':
      return '全部を肯定して受ける流れを弱め、少しだけ引っかかりを作ります。';
    case 'over_apology':
      return '謝罪文のような温度を下げ、配信中の反応として言い直します。';
    case 'forced_positive':
      return '無理に明るくまとめず、その場の空気を少し残します。';
    case 'low_context_grounding':
      return '直近コメントや配信状況との接点を増やします。';
    case 'low_specificity':
      return '抽象的な返答に、場面が見える具体性を足します。';
    case 'repeated_phrase':
      return '同じ質問が流れている圧を見て、単なる丁寧返答を避けます。';
    case 'too_complete':
      return '結論で閉じず、次の会話に続く余白を残します。';
    case 'no_streamer_judgment':
      return '受け身で流さず、配信者として何をするかを出します。';
    case 'persona_flattening':
      return '丁寧に丸まりすぎた言い方を、キャラクターの温度に戻します。';
    default:
      return `検知強度 ${Math.round(issue.severity * 100)}% の項目です。`;
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
    default:
      return '介入する';
  }
}

function formatInterventionReason(reason: string): string {
  if (reason.includes('clean closing')) {
    return 'きれいに閉じる言い回しがあるため、余白を残します。';
  }

  if (reason.includes('agrees') || reason.includes('over_agreement')) {
    return '受け止め方が丸いため、少しだけ言葉の角度を変えます。';
  }

  if (reason.includes('service apology') || reason.includes('over_apology')) {
    return '謝罪文に寄りすぎているため、配信中の反応に戻します。';
  }

  if (reason.includes('positive landing')) {
    return '明るくまとめすぎているため、場の違和感を残します。';
  }

  if (reason.includes('repetition pressure')) {
    return '同じ流れが続いているため、受け答えの角度を変えます。';
  }

  if (reason.includes('stream context')) {
    return '直近の文脈が薄いため、配信状況に接続します。';
  }

  if (reason.includes('concrete anchor')) {
    return '抽象的に見えるため、具体的な場面を足します。';
  }

  if (reason.includes('streamer-side judgment')) {
    return '受け身な返答を避けるため、配信者側の判断を出します。';
  }

  if (reason.includes('polite prose')) {
    return '丁寧に丸まりすぎているため、キャラクターの温度を戻します。';
  }

  return '検知した違和感に合わせて、返答の着地をずらします。';
}

function renderMetricBar(
  label: string,
  value: number,
  className: string
): string {
  const percent = Math.round(value * 100);

  return `
    <div class="metric-row">
      <div class="metric-label">
        <span>${escapeHtml(label)}</span>
        <strong>${percent}%</strong>
      </div>
      <div class="metric-track">
        <span class="metric-fill ${className}" style="width: ${percent}%"></span>
      </div>
    </div>
  `;
}

function renderGuard(label: string, passed: boolean): string {
  return `
    <div class="guard-pill ${passed ? 'guard-pass' : 'guard-warn'}">
      <span>${passed ? 'OK' : '要確認'}</span>
      ${escapeHtml(label)}
    </div>
  `;
}

function formatQualityIssue(
  kind: NoiseQualityReport['issues'][number]['kind']
): string {
  switch (kind) {
    case 'still_predictable':
      return 'まだ無難な言い回しが強く残っています。';
    case 'persona_drift':
      return 'キャラクターの温度が変わりすぎています。';
    case 'overdone_noise':
      return '言い方を変えすぎている可能性があります。';
    case 'ungrounded_detail':
      return '文脈にない情報が追加されている可能性があります。';
    case 'empty_output':
      return '書き換え結果が空です。';
    case 'unchanged':
      return '元の返答からほとんど変わっていません。';
    case 'missing_play_marker':
      return 'イジリ系の介入に「遊びの合図」が入っていません。';
    default:
      return '品質チェックで確認が必要です。';
  }
}

function bindEvents(): void {
  for (const element of app.querySelectorAll<HTMLElement>('[data-field]')) {
    element.addEventListener('input', () => {
      updateField(element);

      // Provider switch toggles which fields (API key / Endpoint) are shown,
      // so re-render the open dialog and restore focus to the select.
      if (element.dataset.field === 'provider' && state.connectionDialogOpen) {
        render();
        app
          .querySelector<HTMLSelectElement>('.modal [data-field="provider"]')
          ?.focus();
      }
    });
  }

  app.onclick = (event) => {
    if (
      event.target instanceof Element &&
      event.target.classList.contains('modal-backdrop')
    ) {
      state.connectionDialogOpen = false;
      render();
      return;
    }

    const target =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-action], [data-preset]')
        : null;

    if (!target) {
      return;
    }

    event.preventDefault();

    if (target.dataset.preset) {
      applyPreset(target.dataset.preset as PresetKey);
      return;
    }

    switch (target.dataset.action) {
      case 'run':
        syncFields();
        void runNoise();
        break;
      case 'react':
        void reportReaction(target.dataset.signal as NoiseReactionSignal);
        break;
      case 'reset':
        void resetMemory();
        break;
      case 'open-settings':
        state.connectionDialogOpen = true;
        render();
        app.querySelector<HTMLSelectElement>('.modal [data-field]')?.focus();
        break;
      case 'close-settings':
        state.connectionDialogOpen = false;
        render();
        break;
      case 'save-settings':
        syncFields();
        state.connectionDialogOpen = false;
        state.error = '';
        render();
        break;
    }
  };
}

async function runNoise(): Promise<void> {
  if (requiresApiKey() && !state.apiKey.trim()) {
    state.error = '書き換えに使うAIのAPIキーを設定してください。';
    state.output = '';
    state.connectionDialogOpen = true;
    render();
    return;
  }

  if (isLocalProvider() && !state.endpoint.trim()) {
    state.error = 'ローカルLLMのEndpointを設定してください。';
    state.output = '';
    state.connectionDialogOpen = true;
    render();
    return;
  }

  state.error = '';
  state.output = '';
  state.quality = undefined;
  state.diagnosis = undefined;
  state.plan = undefined;
  state.candidates = [];
  state.selectedIndex = -1;
  state.gates = undefined;
  state.skipped = undefined;
  state.isRunning = true;
  render();

  const store = getStore();
  const contaminator = createContaminator({
    intensity: state.intensity,
    mode: state.mode,
    chat: {
      provider: getChatProviderName(state.provider),
      options: buildChatOptions(),
    },
    memory: {
      scopeId: SCOPE_ID,
      store,
      maxRecentEntries: 12,
    },
    onNoiseEvent: handleNoiseEvent,
  });
  try {
    const result = await contaminator.contaminate({
      systemPrompt: state.systemPrompt,
      messages: parseMessages(state.messagesText),
      draft: state.draft,
      streamContext: PRESETS[state.activePreset].streamContext,
      seed: state.seed,
      relationshipCapital: state.relationshipCapital,
      // By default the lab bypasses the rhythm gate so every click shows a
      // rewrite; enable "リズム制御に従う" to observe platform/cooldown skips.
      forceTilt: !state.respectRhythm,
      constraints: {
        preserveCodeBlocks: true,
        preserveUrls: true,
        preserveNumbers: true,
        maxAddedChars: 180,
      },
    });

    state.output = result.text;
    state.applied = result.applied.map((item) => item.kind);
    state.predictability = result.score.predictability;
    state.contamination = result.score.contamination;
    state.quality = result.quality;
    state.diagnosis = result.diagnosis;
    state.plan = result.plan;
    state.candidates = result.candidates;
    state.selectedIndex = result.selectedIndex;
    state.gates = result.gates;
    state.skipped = result.skipped;
    state.history = [
      ...state.history,
      {
        before: result.quality.checks.predictabilityBefore,
        after: result.quality.checks.predictabilityAfter,
        skipped: Boolean(result.skipped),
      },
    ].slice(-24);
    state.memory = await store.load(SCOPE_ID);
  } catch (error) {
    state.error = error instanceof Error ? error.message : String(error);
    state.output = '';
    state.quality = undefined;
    state.diagnosis = undefined;
    state.plan = undefined;
    state.candidates = [];
    state.selectedIndex = -1;
    state.gates = undefined;
    state.skipped = undefined;
  } finally {
    state.isRunning = false;
  }

  render();
}

function handleNoiseEvent(event: NoiseEvent): void {
  switch (event.type) {
    case 'tilt_applied':
      pushNoiseEvent(
        `崩しを入れた: ${event.interventions.map((kind) => formatIntervention(kind)).join('、') || '介入なし'}`
      );
      break;
    case 'noise_skipped':
      pushNoiseEvent(`そのまま返した(${formatSkipReason(event.reason)})`);
      break;
    case 'repair_advised':
      pushNoiseEvent('スベった気配 → しばらく素の返答に戻します');
      break;
    case 'moment_recorded':
      pushNoiseEvent(`ネタ帳に登録: ${event.summary}`);
      break;
    case 'callback_used':
      pushNoiseEvent(`過去ネタを再利用: ${event.summary}`);
      break;
  }
}

async function reportReaction(signal: NoiseReactionSignal): Promise<void> {
  if (state.isReacting) {
    return;
  }

  state.isReacting = true;
  render();

  const store = getStore();
  // reportReaction only touches memory, so no LLM configuration is needed.
  const contaminator = createContaminator({
    memory: {
      scopeId: SCOPE_ID,
      store,
      maxRecentEntries: 12,
    },
    onNoiseEvent: handleNoiseEvent,
  });

  try {
    const result = await contaminator.reportReaction({ signal });
    pushNoiseEvent(
      `反応「${formatReactionSignal(signal)}」→ バジェット ${Math.round(result.violationBudget * 100)}%${result.repairAdvised ? '(リペア突入)' : ''}${result.promotedMoment ? '(ギャグ昇格)' : ''}`
    );
    state.memory = await store.load(SCOPE_ID);
  } catch (error) {
    state.error = error instanceof Error ? error.message : String(error);
  } finally {
    state.isReacting = false;
  }

  render();
}

async function loadInitialMemory(): Promise<void> {
  state.memory = await getStore().load(SCOPE_ID);
  render();
}

async function resetMemory(): Promise<void> {
  const store = getStore();
  await store.clear?.(SCOPE_ID);
  state.memory = undefined;
  state.gates = undefined;
  state.skipped = undefined;
  state.noiseEvents = [];
  render();
}

function applyPreset(key: PresetKey): void {
  const preset = PRESETS[key];
  state.activePreset = key;
  state.systemPrompt = preset.systemPrompt;
  state.messagesText = preset.messagesText;
  state.draft = preset.draft;
  state.output = '';
  state.error = '';
  state.quality = undefined;
  state.diagnosis = undefined;
  state.plan = undefined;
  state.candidates = [];
  state.selectedIndex = -1;
  state.gates = undefined;
  state.skipped = undefined;
  render();
}

function getStore(): NoiseMemoryStore {
  return state.storeKind === 'localStorage' ? localStore : memoryStore;
}

function syncFields(): void {
  for (const element of app.querySelectorAll<HTMLElement>('[data-field]')) {
    updateField(element);
  }
}

function updateField(element: HTMLElement): void {
  const key = element.dataset.field as keyof AppState;
  const value = getElementValue(element);

  if (key === 'intensity') {
    state.intensity = Number(value);
    const display = app.querySelector('.range-value');
    if (display) {
      display.textContent = state.intensity.toFixed(2);
    }
    return;
  }

  if (key === 'relationshipCapital') {
    state.relationshipCapital = Number(value);
    const display = app.querySelector('.capital-value');
    if (display) {
      display.textContent = formatCapital(state.relationshipCapital);
    }
    return;
  }

  if (key === 'respectRhythm') {
    state.respectRhythm =
      element instanceof HTMLInputElement ? element.checked : false;
    return;
  }

  if (key === 'storeKind') {
    state.storeKind = value as StoreKind;
    return;
  }

  if (key === 'mode') {
    state.mode = value as NoiseMode;
    return;
  }

  if (key === 'provider') {
    state.provider = value as UiProviderName;
    state.model = getSupportedModelsForUiProvider(state.provider)[0] || '';
    state.endpoint = getDefaultEndpoint(state.provider);
    return;
  }

  if (
    key === 'seed' ||
    key === 'apiKey' ||
    key === 'model' ||
    key === 'endpoint' ||
    key === 'systemPrompt' ||
    key === 'messagesText' ||
    key === 'draft'
  ) {
    state[key] = value;
  }
}

function buildChatOptions(): Record<string, unknown> {
  if (isLocalProvider()) {
    const options: Record<string, unknown> = {
      model: state.model.trim(),
      endpoint: state.endpoint.trim(),
    };

    if (state.apiKey.trim()) {
      options.apiKey = state.apiKey.trim();
    }

    return options;
  }

  if (state.provider === 'gemini-nano') {
    return {
      model: state.model.trim(),
    };
  }

  const options: Record<string, unknown> = {
    apiKey: state.apiKey.trim(),
    model: state.model.trim(),
  };

  return options;
}

function getChatProviderName(provider: UiProviderName): ChatProviderName {
  if (provider === 'local') {
    return 'openai-compatible';
  }

  return provider;
}

function getDefaultEndpoint(provider: UiProviderName): string {
  if (provider === 'local') {
    return 'http://127.0.0.1:11434/v1/chat/completions';
  }

  return state.endpoint;
}

function getElementValue(element: HTMLElement): string {
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    return element.value;
  }

  return '';
}

function parseMessages(text: string): Array<{ role: 'user'; content: string }> {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((content) => ({ role: 'user', content }));
}

function formatMemory(memory: NoiseMemory | undefined): string {
  if (!memory) {
    return 'まだ記録はありません。';
  }

  return JSON.stringify(
    {
      repeatedClosings: memory.recentClosings.slice(-4),
      repeatedPhrases: memory.repeatedPhrases.slice(0, 6),
      recentStains: memory.usedStains.slice(-8).map((record) => record.kind),
    },
    null,
    2
  );
}

function formatScore(score: number): string {
  if (score >= 0.6) {
    return '無難さ 高め';
  }

  if (score >= 0.3) {
    return '無難さ 中くらい';
  }

  return '無難さ 低め';
}

function selected(current: string, value: string): string {
  return current === value ? 'selected' : '';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
