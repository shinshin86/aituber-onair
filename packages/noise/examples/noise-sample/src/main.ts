import { ChatServiceFactory, type ChatProviderName } from '@aituber-onair/chat';
import {
  InMemoryNoiseMemoryStore,
  createContaminator,
  type InterventionKind,
  type NoiseMemory,
  type NoiseMemoryStore,
  type NoiseMode,
  type NoiseQualityReport,
  type EvaluatedCandidate,
  type InterventionPlan,
  type PredictabilityDiagnosis,
  type PredictabilityIssue,
  type PredictabilityIssueKind,
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
};

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('App root was not found.');
}

render();

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
              ${state.quality ? `<span class="score-pill">書き換え後 ${formatScore(state.predictability)}</span>` : ''}
            </div>
            <div class="output${state.error ? ' error-output' : ''}" aria-live="polite" aria-busy="${state.isRunning}">${renderOutput()}</div>
          </section>
        </section>

        <section class="actions">
          <button data-action="run" class="primary"${state.isRunning ? ' disabled' : ''}>${state.isRunning ? '書き換え中…' : '返答を書き換える'}</button>
          <button data-action="reset" class="secondary"${state.isRunning ? ' disabled' : ''}>記録をリセット</button>
        </section>

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
  });
  try {
    const result = await contaminator.contaminate({
      systemPrompt: state.systemPrompt,
      messages: parseMessages(state.messagesText),
      draft: state.draft,
      streamContext: PRESETS[state.activePreset].streamContext,
      seed: state.seed,
      // The lab always wants to see a rewrite, so bypass the rhythm gate
      // that would otherwise skip turns right after a tilt.
      forceTilt: true,
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
    state.memory = await store.load(SCOPE_ID);
  } catch (error) {
    state.error = error instanceof Error ? error.message : String(error);
    state.output = '';
    state.quality = undefined;
    state.diagnosis = undefined;
    state.plan = undefined;
    state.candidates = [];
    state.selectedIndex = -1;
  } finally {
    state.isRunning = false;
  }

  render();
}

async function resetMemory(): Promise<void> {
  const store = getStore();
  await store.clear?.(SCOPE_ID);
  state.memory = undefined;
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
