import {
  KizunaManager,
  createDefaultKizunaConfig,
  type BondSnapshot,
  type Interaction,
} from '../../../src/index';
import {
  classifyInput,
  formatPoints,
  formatSignedPoints,
  selectScriptedReply,
} from './demoLogic';
import './styles.css';

interface ChatMessage {
  id: number;
  role: 'assistant' | 'user';
  text: string;
  emotion?: string;
}

interface HistoryPoint {
  intimacy: number;
}

const USER_ID = 'one-to-one-owner';
const DISPLAY_NAME = 'あなた';
const MAX_HISTORY = 24;
const VISIBLE_INTIMACY_CHANGE = 0.0005;
const stageLabels: Record<string, string> = {
  stranger: '知り合ったばかり',
  acquaintance: '知り合い',
  regular: '常連',
  companion: '相棒',
};
let manager = createManager();
let messages: ChatMessage[] = [
  {
    id: 0,
    role: 'assistant',
    text: 'こんにちは。今日はどんなことがあった？',
    emotion: 'happy',
  },
];
let messageSequence = 1;
let replySequence = 0;
let renderedMessageCount = 0;
let history: HistoryPoint[] = [{ intimacy: 0 }];
let displayedIntimacy = 0;
let displayedPoints = 0;
let isProcessing = false;

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('App root was not found.');

app.innerHTML = renderShell();

const form = requireElement<HTMLFormElement>('#chat-form');
const input = requireElement<HTMLInputElement>('#chat-input');
const submitButton = requireElement<HTMLButtonElement>('#send-button');
const resetButton = requireElement<HTMLButtonElement>('#reset-button');

form.addEventListener('submit', (event) => {
  event.preventDefault();
  void sendMessage();
});

input.addEventListener('input', updateSubmitState);
resetButton.addEventListener('click', () => {
  void resetChat();
});

input.disabled = true;
void initializeRelationship()
  .then(() => renderState())
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    showChange(`初期化できませんでした: ${message}`, 'error');
  })
  .finally(() => {
    input.disabled = false;
    updateSubmitState();
  });

function createManager(): KizunaManager {
  const config = createDefaultKizunaConfig();
  config.basePoints = {
    ...config.basePoints,
    message: 28,
    reaction: 12,
  };
  config.owner = {
    ...config.owner,
    initialPoints: 100,
    firstContactBonus: 0,
    pointMultiplier: 1,
  };
  return new KizunaManager(config, undefined, 'chat-bond-sample');
}

async function sendMessage(): Promise<void> {
  const text = input.value.trim();
  if (!text || isProcessing) return;

  isProcessing = true;
  input.value = '';
  updateSubmitState();
  input.disabled = true;
  messages.push({ id: messageSequence++, role: 'user', text });
  renderMessages();

  try {
    const classification = classifyInput(text);
    await recordInteraction({
      userId: USER_ID,
      kind: 'message',
      message: text,
      valence: classification.valence,
      ...(classification.severity && {
        severity: classification.severity,
      }),
      isOwner: true,
      timestamp: Date.now(),
      metadata: { displayName: DISPLAY_NAME, source: 'one-to-one-chat' },
    });

    await delay(360);
    const reply = selectScriptedReply(classification.tone, replySequence++);
    messages.push({
      id: messageSequence++,
      role: 'assistant',
      text: reply.text,
      emotion: reply.emotion,
    });
    await recordInteraction({
      userId: USER_ID,
      kind: 'reaction',
      message: reply.text,
      emotion: reply.emotion,
      isOwner: true,
      timestamp: Date.now(),
      metadata: { displayName: DISPLAY_NAME, source: 'scripted-reply' },
    });

    history.push({ intimacy: manager.toRelationshipCapital(USER_ID) });
    history = history.slice(-MAX_HISTORY);
    renderState();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showChange(`更新できませんでした: ${message}`, 'error');
  } finally {
    isProcessing = false;
    input.disabled = false;
    updateSubmitState();
    input.focus();
  }
}

async function recordInteraction(interaction: Interaction): Promise<void> {
  await manager.processInteraction(interaction);
}

function renderState(): void {
  renderMessages();
  const snapshot = manager.getBondSnapshot(USER_ID);
  const nextIntimacy = manager.toRelationshipCapital(USER_ID);
  const previousPoints = displayedPoints;
  renderRelationship(snapshot, displayedIntimacy, nextIntimacy);
  renderGraph();
  renderContext();
  if (nextIntimacy - displayedIntimacy > VISIBLE_INTIMACY_CHANGE) {
    const added = snapshot ? snapshot.points - previousPoints : 0;
    showChange(
      `親密度が上がりました · ${added > 0 ? `${formatSignedPoints(added)}ポイント` : '会話を記録'}`,
    );
  } else if (displayedIntimacy - nextIntimacy > VISIBLE_INTIMACY_CHANGE) {
    const added = snapshot ? snapshot.points - previousPoints : 0;
    showChange(
      `親密度が下がりました · ${formatSignedPoints(added)}ポイント · 穏やかな会話で少しずつ修復できます`,
      'decrease',
    );
  }
  displayedIntimacy = nextIntimacy;
  displayedPoints = snapshot?.points ?? 0;
}

function renderRelationship(
  snapshot: BondSnapshot | null,
  from: number,
  to: number,
): void {
  setText('#points-value', formatPoints(snapshot?.points ?? 0));
  setText('#warmth-value', `${Math.round((snapshot?.warmth ?? 0) * 100)}%`);
  setText(
    '#stage-value',
    snapshot ? formatStage(snapshot.stage) : 'まだ会話していません',
  );
  setText('#intimacy-value', `${Math.round(to * 100)}%`);

  const fill = requireElement<HTMLDivElement>('#intimacy-fill');
  fill.style.transition = 'none';
  fill.style.width = `${from * 100}%`;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fill.style.transition = '';
      fill.style.width = `${to * 100}%`;
    });
  });
}

function renderMessages(): void {
  const log = requireElement<HTMLDivElement>('#chat-log');
  const newMarkup = messages
    .slice(renderedMessageCount)
    .map(
      (message) => `
        <article class="message ${message.role}">
          <div class="message-meta"><strong>${message.role === 'user' ? DISPLAY_NAME : 'Luna'}</strong>${message.emotion ? `<span>${escapeHtml(message.emotion)}</span>` : ''}</div>
          <p>${escapeHtml(message.text)}</p>
        </article>`,
    )
    .join('');
  log.insertAdjacentHTML('beforeend', newMarkup);
  renderedMessageCount = messages.length;
  log.scrollTop = log.scrollHeight;
}

function renderGraph(): void {
  const width = 420;
  const height = 112;
  const points = history.map(({ intimacy }, index) => {
    const x = history.length <= 1 ? 0 : (index / (history.length - 1)) * width;
    const y = height - Math.min(1, Math.max(0, intimacy)) * (height - 12) - 6;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const polyline =
    points.length === 1 ? `${points[0]} ${points[0]}` : points.join(' ');
  requireElement<SVGPolylineElement>('#history-line').setAttribute(
    'points',
    polyline,
  );
}

function renderContext(): void {
  const context = manager.getBondContext(USER_ID, { language: 'ja' });
  requireElement<HTMLElement>('#bond-context').textContent =
    context || '最初の会話後に、LLMへ渡せる関係性の文脈が表示されます。';
}

function showChange(
  text: string,
  tone: 'normal' | 'decrease' | 'error' = 'normal',
): void {
  const note = requireElement<HTMLDivElement>('#change-note');
  note.textContent = text;
  note.classList.toggle('error', tone === 'error');
  note.classList.toggle('decrease', tone === 'decrease');
  note.classList.remove('visible');
  void note.offsetWidth;
  note.classList.add('visible');
}

async function resetChat(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;
  manager.destroy();
  manager = createManager();
  messages = [
    {
      id: messageSequence++,
      role: 'assistant',
      text: '最初の状態に戻しました。何か話しかけてみてね。',
      emotion: 'happy',
    },
  ];
  await initializeRelationship();
  renderedMessageCount = 0;
  requireElement<HTMLDivElement>('#chat-log').innerHTML = '';
  renderState();
  showChange('関係性をリセットしました。');
  isProcessing = false;
  updateSubmitState();
  input.focus();
}

async function initializeRelationship(): Promise<void> {
  await manager.processInteraction({
    userId: USER_ID,
    kind: 'presence',
    valence: 'neutral',
    isOwner: true,
    timestamp: Date.now(),
    metadata: { displayName: DISPLAY_NAME, source: 'sample-baseline' },
  });
  const intimacy = manager.toRelationshipCapital(USER_ID);
  history = [{ intimacy }];
  displayedIntimacy = intimacy;
  displayedPoints = manager.getBondSnapshot(USER_ID)?.points ?? 0;
}

function updateSubmitState(): void {
  submitButton.disabled = isProcessing || !input.value.trim();
}

function setText(selector: string, value: string): void {
  requireElement<HTMLElement>(selector).textContent = value;
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Element was not found: ${selector}`);
  return element;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function formatStage(stage: string): string {
  return stageLabels[stage] ?? stage;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderShell(): string {
  return `
    <main class="page-shell">
      <header class="intro">
        <div>
          <p class="package-name">@aituber-onair/kizuna</p>
          <h1>Kizuna 1対1チャットデモ</h1>
          <p>入力したメッセージとキャラクターの感情付き定型応答を、1人分の関係性として記録します。「今日も会えてうれしい」→「ヤダ」→穏やかな言葉を数回、の順で、不和による低下と修復を試せます。</p>
          <p class="classifier-note">このデモの感情判定は辞書による代用品です。実際のアプリでは、LLMが返したキャラクターの感情を絆の変化へ使います。</p>
        </div>
        <button id="reset-button" type="button">リセット</button>
      </header>

      <section class="demo-grid">
        <section class="chat-card" aria-label="1対1チャット">
          <div class="chat-card-heading">
            <div><span class="avatar">☾</span><div><strong>Luna</strong><small>感情付きの定型文で返答</small></div></div>
            <span class="local-badge">LLM / TTS 不要</span>
          </div>
          <div id="chat-log" class="chat-log" role="log" aria-live="polite" aria-relevant="additions" aria-label="会話履歴"></div>
          <form id="chat-form" class="chat-form">
            <label for="chat-input">あなたのメッセージ</label>
            <div>
              <input id="chat-input" maxlength="160" autocomplete="off" placeholder="例: 今日も会えてうれしい！" />
              <button id="send-button" type="submit" disabled>送信</button>
            </div>
          </form>
        </section>

        <aside class="relationship-card" aria-label="あなたとの関係性">
          <div class="relationship-heading"><div><span class="avatar owner">あ</span><div><small>あなたとの関係性</small><h2 id="stage-value">まだ会話していません</h2></div></div><span id="intimacy-value">0%</span></div>
          <div class="intimacy-block">
            <div><strong>親密度</strong><small>ポイントと温かさを0〜100%へ正規化した値</small></div>
            <div class="intimacy-track"><div id="intimacy-fill"></div></div>
            <div id="change-note" class="change-note" role="status"></div>
          </div>
          <dl class="metrics">
            <div><dt>絆スコア</dt><dd id="points-value">0</dd><small>親切で増え、不和で下がります</small></div>
            <div><dt>温かさ</dt><dd id="warmth-value">0%</dd><small>不和で冷え、穏やかな会話で戻ります</small></div>
          </dl>
          <div class="graph-block">
            <div><strong>親密度の推移</strong><small>会話1往復ごとの変化</small></div>
            <svg viewBox="0 0 420 112" role="img" aria-label="親密度の推移グラフ">
              <line x1="0" y1="106" x2="420" y2="106"></line>
              <polyline id="history-line" points="0,106 0,106"></polyline>
            </svg>
          </div>
          <details>
            <summary>LLMへ渡せる関係性の文脈</summary>
            <pre id="bond-context"></pre>
          </details>
        </aside>
      </section>
    </main>`;
}

window.addEventListener('beforeunload', () => manager.destroy());
