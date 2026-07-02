import {
  ManneriDetector,
  REVIEW_DRAFT_REPETITION_TOOL,
  type DraftReviewResult,
  type Message,
} from '../../../src/index';
import './styles.css';

type UiLanguage = 'ja' | 'en';
type ScenarioKey = 'repetitive' | 'healthy';
type ActionKey = 'send' | 'rewrite' | 'stop';

interface Scenario {
  label: string;
  description: string;
  contextRole: Message['role'];
  contextMessage: string;
  messages: Message[];
  draft: string;
}

interface Copy {
  htmlLang: string;
  languageLabel: string;
  eyebrow: string;
  title: string;
  lead: string;
  deterministicNote: string;
  repetitiveExample: string;
  healthyExample: string;
  draftTitle: string;
  contextPrefix: string;
  toolCaption: string;
  runReview: string;
  resultTitle: string;
  waitingTitle: string;
  waitingBody: string;
  noRewriteReason: string;
  statusRewrite: string;
  statusOk: string;
  shouldRewrite: string;
  similarity: string;
  reason: string;
  suggestion: string;
  actionTitle: string;
  actionLead: string;
  sendAction: string;
  rewriteAction: string;
  stopAction: string;
  okAction: string;
  sendNote: string;
  rewriteNote: string;
  stopNote: string;
  okNote: string;
  roleUser: string;
  roleAssistant: string;
}

const SCENARIOS: Record<UiLanguage, Record<ScenarioKey, Scenario>> = {
  ja: {
    repetitive: {
      label: '繰り返しがちな例',
      description: '直前と同じリアクションをもう一度送ろうとしています。',
      contextRole: 'assistant',
      contextMessage: 'すごく盛り上がりましたね！',
      messages: [
        { role: 'user', content: '今のボス戦、ギリギリだったね！' },
        { role: 'assistant', content: 'すごく盛り上がりましたね！' },
        { role: 'user', content: '回避が完璧だった！' },
        { role: 'assistant', content: 'すごく盛り上がりましたね！' },
        { role: 'user', content: '逆転が熱かった！' },
      ],
      draft: 'すごく盛り上がりましたね！',
    },
    healthy: {
      label: '自然な例',
      description: '直近の流れを受けて、新しい説明を足しています。',
      contextRole: 'user',
      contextMessage: '先にルールを説明してほしい。',
      messages: [
        { role: 'user', content: '次は何をする？' },
        {
          role: 'assistant',
          content: 'カラオケかパズルゲームのどちらかを選びましょう。',
        },
        { role: 'user', content: 'パズルゲーム楽しそう。' },
        {
          role: 'assistant',
          content: 'いいですね。このあと短いパズル回を準備します。',
        },
        { role: 'user', content: '先にルールを説明してほしい。' },
      ],
      draft: 'もちろんです。始める前に目的、操作方法、勝利条件を説明します。',
    },
  },
  en: {
    repetitive: {
      label: 'Repetitive example',
      description: 'The draft repeats the same reaction from the prior turn.',
      contextRole: 'assistant',
      contextMessage: 'That was so exciting!',
      messages: [
        { role: 'user', content: 'That boss fight was close!' },
        { role: 'assistant', content: 'That was so exciting!' },
        { role: 'user', content: 'Your dodge was perfect!' },
        { role: 'assistant', content: 'That was so exciting!' },
        { role: 'user', content: 'The comeback was amazing!' },
      ],
      draft: 'That was so exciting!',
    },
    healthy: {
      label: 'Natural example',
      description: 'The draft adds a useful next explanation.',
      contextRole: 'user',
      contextMessage: 'Can you explain the rules first?',
      messages: [
        { role: 'user', content: 'What should we do next?' },
        {
          role: 'assistant',
          content: 'Let us choose between karaoke or a puzzle game.',
        },
        { role: 'user', content: 'Puzzle game sounds fun.' },
        {
          role: 'assistant',
          content: 'Good call. I will set up a short puzzle round after this.',
        },
        { role: 'user', content: 'Can you explain the rules first?' },
      ],
      draft:
        'Sure. I will explain the goal, controls, and win condition before we start.',
    },
  },
};

const COPY: Record<UiLanguage, Copy> = {
  ja: {
    htmlLang: 'ja',
    languageLabel: '表示言語',
    eyebrow: 'Manneri draft review',
    title: 'manneri は「送っていい？」を判定するだけ。対応はあなた次第',
    lead: '判定結果を受け取ったあと、送る・書き換える・止めるといった後段の対応をアプリやエージェント側で自由に選べます。',
    deterministicNote: 'LLM不要の決定的判定です。類似度しきい値は0.70です。',
    repetitiveExample: '繰り返しがちな例',
    healthyExample: '自然な例',
    draftTitle: '送信前の下書き',
    contextPrefix: '直前の文脈',
    toolCaption: 'エージェントツールとしても呼べます',
    runReview: 'manneri で判定',
    resultTitle: 'あなたに渡される結果',
    waitingTitle: 'まだ判定していません',
    waitingBody:
      'ボタンを押すと、この下書きを送ってよいかの判定結果だけが返ります。',
    noRewriteReason: '類似度がしきい値0.70未満のため、そのまま送信できます。',
    statusRewrite: '要書き換え',
    statusOk: '送信OK',
    shouldRewrite: 'shouldRewrite',
    similarity: '類似度',
    reason: '理由',
    suggestion: '提案（LLMへ渡す書き換え指示）',
    actionTitle: 'あなたの対応（自由に選べる）',
    actionLead:
      'manneri はここから先を決めません。分岐はアプリ側で実装します。',
    sendAction: 'そのまま送信',
    rewriteAction: '提案で書き換え',
    stopAction: '送信をやめる',
    okAction: 'そのまま送信でOK',
    sendNote: 'そのまま送る分岐です。この判断はアプリ側で自由に実装します。',
    rewriteNote:
      '提案をLLMへ渡して書き換える想定です。この分岐はアプリ側で自由に実装します。',
    stopNote: '送信を止める分岐です。この判断はアプリ側で自由に実装します。',
    okNote: '判定は送信OKです。通常はそのまま送る分岐にできます。',
    roleUser: '視聴者',
    roleAssistant: 'AI配信者',
  },
  en: {
    htmlLang: 'en',
    languageLabel: 'Language',
    eyebrow: 'Manneri draft review',
    title: 'manneri only decides "ready to send?" - the action is yours',
    lead: 'After you receive the review result, your app or agent can decide whether to send, rewrite, or stop the draft.',
    deterministicNote:
      'Deterministic check, no LLM required. Similarity threshold is 0.70.',
    repetitiveExample: 'Repetitive example',
    healthyExample: 'Natural example',
    draftTitle: 'Draft before sending',
    contextPrefix: 'Recent context',
    toolCaption: 'Also callable as an agent tool',
    runReview: 'Review with manneri',
    resultTitle: 'Result handed to you',
    waitingTitle: 'Not reviewed yet',
    waitingBody:
      'Run the check to receive only the decision about whether this draft is ready to send.',
    noRewriteReason:
      'Similarity is below threshold 0.70, so the draft can be sent as-is.',
    statusRewrite: 'Rewrite needed',
    statusOk: 'Ready to send',
    shouldRewrite: 'shouldRewrite',
    similarity: 'Similarity',
    reason: 'Reason',
    suggestion: 'Suggestion (rewrite instruction for the LLM)',
    actionTitle: 'Your action (choose freely)',
    actionLead:
      'manneri does not decide this part. Your application owns the branch.',
    sendAction: 'Send as-is',
    rewriteAction: 'Rewrite with suggestion',
    stopAction: 'Stop sending',
    okAction: 'Send as-is is OK',
    sendNote:
      'This branch sends the draft as-is. Your application can implement the branch however it wants.',
    rewriteNote:
      'This branch would pass the suggestion to the LLM for a rewrite. Your application owns this behavior.',
    stopNote:
      'This branch stops the send. Your application can implement the branch however it wants.',
    okNote:
      'The review says this draft is ready to send. A simple app can send it as-is.',
    roleUser: 'Viewer',
    roleAssistant: 'AI streamer',
  },
};

const detector = new ManneriDetector({
  minMessageLength: 0,
  similarityThreshold: 0.7,
  interventionCooldown: 0,
  language: 'ja',
});

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('App root not found');
}

let activeLanguage: UiLanguage = 'ja';
let activeScenario: ScenarioKey = 'repetitive';
let latestReview: DraftReviewResult | null = null;
let selectedAction: ActionKey | null = null;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getActiveScenario(): Scenario {
  return SCENARIOS[activeLanguage][activeScenario];
}

function getRoleLabel(copy: Copy, role: Message['role']): string {
  if (role === 'assistant') {
    return copy.roleAssistant;
  }

  if (role === 'user') {
    return copy.roleUser;
  }

  return role;
}

function runReview(): void {
  const scenario = getActiveScenario();
  detector.updateConfig({ language: activeLanguage });
  latestReview = detector.reviewDraft(scenario.messages, scenario.draft);
  selectedAction = null;
  render();
}

function getActionNote(copy: Copy, action: ActionKey | null): string {
  if (action === 'send') {
    return copy.sendNote;
  }

  if (action === 'rewrite') {
    return copy.rewriteNote;
  }

  if (action === 'stop') {
    return copy.stopNote;
  }

  return copy.actionLead;
}

function renderResult(copy: Copy): string {
  if (!latestReview) {
    return `
      <div class="empty-result">
        <strong>${copy.waitingTitle}</strong>
        <p>${copy.waitingBody}</p>
      </div>
    `;
  }

  const shouldRewrite = latestReview.shouldRewrite;
  const statusClass = shouldRewrite ? 'rewrite' : 'ok';
  const statusLabel = shouldRewrite ? copy.statusRewrite : copy.statusOk;
  const suggestion = shouldRewrite ? latestReview.suggestion?.content : null;
  const reason = shouldRewrite
    ? latestReview.analysis.interventionReason
    : copy.noRewriteReason;

  return `
    <div class="status ${statusClass}">
      <span>${statusLabel}</span>
      <strong>${copy.shouldRewrite}: ${shouldRewrite ? 'true' : 'false'}</strong>
    </div>
    <dl class="result-list">
      <div>
        <dt>${copy.similarity}</dt>
        <dd>
          ${latestReview.analysis.similarity.score.toFixed(2)}
          <small>/ 0.70</small>
        </dd>
      </div>
      <div>
        <dt>${copy.reason}</dt>
        <dd>${escapeHtml(reason)}</dd>
      </div>
    </dl>
    ${
      suggestion
        ? `
          <div class="suggestion">
            <h3>${copy.suggestion}</h3>
            <p>${escapeHtml(suggestion)}</p>
          </div>
        `
        : ''
    }
    ${renderActions(copy, shouldRewrite)}
  `;
}

function renderActions(copy: Copy, shouldRewrite: boolean): string {
  if (!shouldRewrite) {
    return `
      <section class="actions ok-only">
        <h2>${copy.actionTitle}</h2>
        <button type="button" data-action="send">${copy.okAction}</button>
        <p>${selectedAction ? copy.okNote : copy.actionLead}</p>
      </section>
    `;
  }

  return `
    <section class="actions">
      <h2>${copy.actionTitle}</h2>
      <div class="action-buttons">
        <button type="button" data-action="send">${copy.sendAction}</button>
        <button type="button" data-action="rewrite">${copy.rewriteAction}</button>
        <button type="button" data-action="stop">${copy.stopAction}</button>
      </div>
      <p>${escapeHtml(getActionNote(copy, selectedAction))}</p>
    </section>
  `;
}

function render(): void {
  const copy = COPY[activeLanguage];
  const scenario = getActiveScenario();

  document.documentElement.lang = copy.htmlLang;

  app.innerHTML = `
    <main class="shell">
      <header class="hero">
        <div>
          <p class="eyebrow">${copy.eyebrow}</p>
          <h1>${copy.title}</h1>
          <p class="lead">${copy.lead}</p>
          <p class="note">${copy.deterministicNote}</p>
        </div>
        <label class="language-field" for="language-select">
          <span>${copy.languageLabel}</span>
          <select id="language-select">
            <option value="ja" ${activeLanguage === 'ja' ? 'selected' : ''}>
              日本語
            </option>
            <option value="en" ${activeLanguage === 'en' ? 'selected' : ''}>
              English
            </option>
          </select>
        </label>
      </header>

      <section class="samples" aria-label="Sample selector">
        <button
          class="${activeScenario === 'repetitive' ? 'active' : ''}"
          type="button"
          data-scenario="repetitive"
        >
          ${copy.repetitiveExample}
        </button>
        <button
          class="${activeScenario === 'healthy' ? 'active' : ''}"
          type="button"
          data-scenario="healthy"
        >
          ${copy.healthyExample}
        </button>
      </section>

      <section class="draft-card">
        <div class="draft-heading">
          <div>
            <h2>${copy.draftTitle}</h2>
            <p>${escapeHtml(scenario.description)}</p>
          </div>
          <div class="tool-chip">
            <span>${copy.toolCaption}</span>
            <code>${REVIEW_DRAFT_REPETITION_TOOL.name}</code>
          </div>
        </div>
        <p class="context">
          <span>${copy.contextPrefix}</span>
          ${getRoleLabel(copy, scenario.contextRole)}:
          "${escapeHtml(scenario.contextMessage)}"
        </p>
        <blockquote>${escapeHtml(scenario.draft)}</blockquote>
        <button class="primary" id="run-review" type="button">
          ${copy.runReview}
        </button>
      </section>

      <section class="result-card">
        <h2>${copy.resultTitle}</h2>
        ${renderResult(copy)}
      </section>
    </main>
  `;

  document
    .querySelector<HTMLSelectElement>('#language-select')
    ?.addEventListener('change', (event) => {
      activeLanguage = (event.target as HTMLSelectElement).value as UiLanguage;
      detector.updateConfig({ language: activeLanguage });
      latestReview = null;
      selectedAction = null;
      render();
    });

  for (const button of document.querySelectorAll<HTMLButtonElement>(
    '[data-scenario]'
  )) {
    button.addEventListener('click', () => {
      activeScenario = button.dataset.scenario as ScenarioKey;
      latestReview = null;
      selectedAction = null;
      render();
    });
  }

  document
    .querySelector<HTMLButtonElement>('#run-review')
    ?.addEventListener('click', runReview);

  for (const button of document.querySelectorAll<HTMLButtonElement>(
    '[data-action]'
  )) {
    button.addEventListener('click', () => {
      selectedAction = button.dataset.action as ActionKey;
      render();
    });
  }
}

render();
