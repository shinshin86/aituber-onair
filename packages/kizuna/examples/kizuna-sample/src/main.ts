import {
  KizunaManager,
  createDefaultKizunaConfig,
  type BondSnapshot,
  type Interaction,
  type InteractionKind,
  type KizunaEventData,
  type Threshold,
} from '../../../src/index';
import './styles.css';

type StreamCommentType = Extract<
  InteractionKind,
  'message' | 'reaction' | 'gift'
>;

interface CommentScript {
  type: StreamCommentType;
  text: string;
  emotion: string;
}

interface ViewerPersona {
  id: string;
  name: string;
  icon: string;
  isOwner: boolean;
  note: string;
  cadenceMs: number;
  accent: string;
  scripts: CommentScript[];
}

interface ChatEntry {
  id: number;
  author: 'character' | 'viewer';
  userId?: string;
  name: string;
  icon: string;
  type: StreamCommentType | 'reply';
  text: string;
  emotion: string;
  time: number;
}

interface EventEntry {
  id: number;
  time: number;
  icon: string;
  text: string;
}

interface BondHistoryPoint {
  time: number;
  capital: number;
}

interface FocusToken {
  action?: string;
  field?: string;
  userId?: string;
  selectionStart?: number | null;
  selectionEnd?: number | null;
}

const MINUTE_MS = 60 * 1_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const INITIAL_TIME = Date.UTC(2026, 0, 12, 19);
const MAX_CHAT_ENTRIES = 36;
const MAX_HISTORY_POINTS = 24;

const viewers: ViewerPersona[] = [
  {
    id: 'aki',
    name: 'Aki',
    icon: '🌱',
    isOwner: false,
    note: '質問好きの新しい視聴者',
    cadenceMs: 4_800,
    accent: '#67c7a1',
    scripts: [
      {
        type: 'message',
        text: '今日のテーマ、すごく気になる！',
        emotion: 'curious',
      },
      { type: 'reaction', text: 'その話もっと聞きたい 👀', emotion: 'curious' },
      { type: 'message', text: '初見だけど雰囲気が好きです', emotion: 'happy' },
      { type: 'message', text: '次は何を見せてくれるの？', emotion: 'excited' },
    ],
  },
  {
    id: 'mio',
    name: 'Mio',
    icon: '🎨',
    isOwner: false,
    note: '絵文字多めのムードメーカー',
    cadenceMs: 7_200,
    accent: '#f18eaa',
    scripts: [
      { type: 'reaction', text: 'かわいい〜！👏✨', emotion: 'excited' },
      { type: 'message', text: '背景の色合い、今日も最高！', emotion: 'happy' },
      { type: 'gift', text: '創作応援ギフトをどうぞ 🎁', emotion: 'excited' },
      {
        type: 'message',
        text: 'その表情、イラストにしたい！',
        emotion: 'happy',
      },
    ],
  },
  {
    id: 'ren',
    name: 'Ren',
    icon: '🎧',
    isOwner: false,
    note: '短文で見守る静かな常連',
    cadenceMs: 10_600,
    accent: '#8097cf',
    scripts: [
      { type: 'message', text: '今日も来たよ', emotion: 'calm' },
      { type: 'reaction', text: 'いいね', emotion: 'calm' },
      { type: 'message', text: 'そのペース、落ち着く', emotion: 'calm' },
      { type: 'message', text: 'また続き聞かせて', emotion: 'happy' },
    ],
  },
  {
    id: 'sora',
    name: 'Sora',
    icon: '✨',
    isOwner: true,
    note: '配信を支える相棒兼モデレーター',
    cadenceMs: 13_400,
    accent: '#a684d6',
    scripts: [
      {
        type: 'message',
        text: 'みんな、今日もゆっくりしていってね',
        emotion: 'calm',
      },
      { type: 'reaction', text: 'ナイスリアクション！', emotion: 'happy' },
      {
        type: 'gift',
        text: '今日の配信準備、おつかれさま ☕',
        emotion: 'happy',
      },
      {
        type: 'message',
        text: '次のコーナーも準備できてるよ',
        emotion: 'excited',
      },
    ],
  },
];

const commentTypeMeta: Record<
  StreamCommentType,
  { icon: string; label: string; points: number }
> = {
  message: { icon: '💬', label: 'コメント', points: 18 },
  reaction: { icon: '💫', label: 'リアクション', points: 8 },
  gift: { icon: '🎁', label: 'ギフト', points: 90 },
};

const eventTypes = [
  'user_created',
  'points_updated',
  'level_up',
  'threshold_reached',
  'achievement_earned',
] as const;

let simulatedNow = INITIAL_TIME;
let selectedViewerId = viewers[0]?.id ?? '';
let manualViewerId = selectedViewerId;
let manualCommentType: StreamCommentType = 'message';
let manualDraft = '';
let pendingSkipHours = 24;
let autoPlaying = true;
let pendingInteractions = 0;
let eventSequence = 0;
let chatSequence = 0;
let replySequence = 0;
let labGeneration = 0;
let workQueue = Promise.resolve();

const scriptPositions = new Map(viewers.map(({ id }) => [id, 0]));
const nextAutoPostAt = new Map<string, number>();
let bondHistory = createEmptyBondHistory();
let eventEntries: EventEntry[] = [
  {
    id: eventSequence++,
    time: simulatedNow,
    icon: '📡',
    text: 'モック配信を開始しました。コメントから絆が育ちます。',
  },
];
let chatEntries: ChatEntry[] = [
  {
    id: chatSequence++,
    author: 'character',
    name: 'Luna',
    icon: '☾',
    type: 'reply',
    text: 'こんばんは！ 今日もコメントを読みながら話していくね。',
    emotion: 'happy',
    time: simulatedNow,
  },
];
let lastReply = chatEntries[0];
let manager = createManager();

const app = getAppRoot();

bindManagerEvents();
scheduleInitialAutoPosts();
render();

const autoTimer = window.setInterval(runAutoPostTick, 400);
window.addEventListener('beforeunload', () => {
  window.clearInterval(autoTimer);
  manager.destroy();
});

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement | null;
  const actionTarget = target?.closest<HTMLElement>('[data-action]');
  if (!actionTarget) return;

  switch (actionTarget.dataset.action) {
    case 'select-viewer':
      selectedViewerId = actionTarget.dataset.userId ?? selectedViewerId;
      manualViewerId = selectedViewerId;
      render();
      break;
    case 'toggle-auto':
      autoPlaying = !autoPlaying;
      if (autoPlaying) scheduleInitialAutoPosts();
      pushEvent(
        autoPlaying ? '▶' : '⏸',
        autoPlaying
          ? '自動コメントを再開しました。'
          : '自動コメントを一時停止しました。',
      );
      render();
      break;
    case 'advance-time':
      if (pendingInteractions === 0) {
        advanceTime(Number(actionTarget.dataset.hours ?? 0));
      }
      break;
    case 'apply-time':
      if (pendingInteractions === 0) advanceTime(pendingSkipHours);
      break;
    case 'post-next-auto':
      postNextAutoComment(actionTarget.dataset.userId);
      break;
    case 'reset':
      if (pendingInteractions === 0) resetSimulator();
      break;
  }
});

document.addEventListener('submit', (event) => {
  const form = event.target as HTMLFormElement | null;
  if (form?.dataset.form !== 'manual-comment') return;
  event.preventDefault();
  postManualComment();
});

document.addEventListener('input', (event) => {
  const target = event.target as HTMLInputElement | HTMLSelectElement | null;
  if (!target) return;
  if (target.dataset.field === 'manual-draft') {
    manualDraft = target.value;
    const submitButton = document.querySelector<HTMLButtonElement>(
      '[data-form="manual-comment"] button[type="submit"]',
    );
    if (submitButton) submitButton.disabled = !manualDraft.trim();
  }
  if (target.dataset.field === 'skip-hours') {
    pendingSkipHours = Number(target.value);
    const output = document.querySelector<HTMLOutputElement>('#skip-output');
    if (output) output.value = formatDuration(pendingSkipHours);
  }
});

document.addEventListener('change', (event) => {
  const target = event.target as HTMLSelectElement | null;
  if (!target) return;
  if (target.dataset.field === 'manual-viewer') {
    manualViewerId = target.value;
    selectedViewerId = target.value;
    render();
  }
  if (target.dataset.field === 'manual-type') {
    manualCommentType = isStreamCommentType(target.value)
      ? target.value
      : 'message';
  }
});

function createManager(): KizunaManager {
  const config = createDefaultKizunaConfig();
  config.now = () => simulatedNow;
  config.basePoints = {
    message: commentTypeMeta.message.points,
    reaction: commentTypeMeta.reaction.points,
    gift: commentTypeMeta.gift.points,
  };
  config.owner = {
    initialPoints: 25,
    pointMultiplier: 1.25,
    exclusiveAchievements: ['character_partner'],
    firstContactBonus: 5,
  };
  config.warmth = { halfLifeMs: DAY_MS, floor: 0.2 };
  config.continuity = { unit: 'day', grace: 0 };
  config.thresholds = createAchievementThresholds();
  return new KizunaManager(config, undefined, 'kizuna-stream-simulator');
}

function createAchievementThresholds(): Threshold[] {
  return [
    createAchievementThreshold(
      'first_bond',
      100,
      '心が通じた',
      'acquaintance ステージに到達しました。',
      '🌸',
    ),
    createAchievementThreshold(
      'trusted_regular',
      500,
      'いつもの安心感',
      'regular ステージに到達しました。',
      '🏡',
    ),
    createAchievementThreshold(
      'lasting_companion',
      1_000,
      'かけがえのない相棒',
      'companion ステージに到達しました。',
      '💎',
    ),
  ];
}

function createAchievementThreshold(
  id: string,
  points: number,
  title: string,
  description: string,
  icon: string,
): Threshold {
  return {
    id,
    points,
    repeatable: false,
    action: {
      type: 'achievement',
      data: { id, title, description, icon },
    },
  };
}

function bindManagerEvents(): void {
  for (const eventType of eventTypes) {
    manager.on(eventType, (payload) => {
      const event = payload as KizunaEventData;
      const viewer = viewers.find(({ id }) => id === event.userId);
      const entry = describeEvent(event, viewer?.name ?? event.userId);
      if (entry) pushEvent(entry.icon, entry.text);
    });
  }
}

function describeEvent(
  event: KizunaEventData,
  viewerName: string,
): Pick<EventEntry, 'icon' | 'text'> | null {
  const data = event.data as Record<string, unknown>;
  switch (event.type) {
    case 'user_created':
      return { icon: '🌱', text: `${viewerName}との絆が生まれました。` };
    case 'points_updated':
      return {
        icon: '✦',
        text: `${viewerName}の絆ポイント +${String(data.pointsAdded ?? 0)}`,
      };
    case 'level_up':
      return {
        icon: '↗',
        text: `${viewerName}がレベル${String(data.newLevel ?? '')}になりました。`,
      };
    case 'threshold_reached': {
      const threshold = data.threshold as { points?: number } | undefined;
      return {
        icon: '◎',
        text: `${viewerName}が${String(threshold?.points ?? '')}ポイントを越えました。`,
      };
    }
    case 'achievement_earned': {
      const achievement = data.achievement as
        | { title?: string; icon?: string }
        | undefined;
      return {
        icon: achievement?.icon ?? '🏅',
        text: `${viewerName}が「${achievement?.title ?? '新しい実績'}」を獲得しました。`,
      };
    }
    default:
      return null;
  }
}

function scheduleInitialAutoPosts(): void {
  const now = Date.now();
  viewers.forEach((viewer, index) => {
    nextAutoPostAt.set(viewer.id, now + 900 + index * 850);
  });
}

function runAutoPostTick(): void {
  if (!autoPlaying || pendingInteractions > 1) return;
  const now = Date.now();
  const dueViewer = viewers.find(
    (viewer) =>
      now >= (nextAutoPostAt.get(viewer.id) ?? Number.POSITIVE_INFINITY),
  );
  if (!dueViewer) return;
  nextAutoPostAt.set(dueViewer.id, now + dueViewer.cadenceMs);
  enqueueViewerComment(dueViewer, nextScriptFor(dueViewer));
}

function postNextAutoComment(userId?: string): void {
  const viewer = viewers.find(({ id }) => id === userId) ?? viewers[0];
  if (!viewer) return;
  enqueueViewerComment(viewer, nextScriptFor(viewer));
}

function nextScriptFor(viewer: ViewerPersona): CommentScript {
  const position = scriptPositions.get(viewer.id) ?? 0;
  const script = viewer.scripts[position % viewer.scripts.length];
  scriptPositions.set(viewer.id, position + 1);
  return script ?? { type: 'message', text: 'こんばんは！', emotion: 'happy' };
}

function postManualComment(): void {
  const viewer = viewers.find(({ id }) => id === manualViewerId);
  const text = manualDraft.trim();
  if (!viewer || !text) return;
  const script: CommentScript = {
    type: manualCommentType,
    text,
    emotion: inferEmotion(text, manualCommentType),
  };
  manualDraft = '';
  selectedViewerId = viewer.id;
  enqueueViewerComment(viewer, script);
}

function enqueueViewerComment(
  viewer: ViewerPersona,
  comment: CommentScript,
): void {
  const generation = labGeneration;
  const activeManager = manager;
  pendingInteractions++;
  render();
  workQueue = workQueue
    .then(async () => {
      if (generation !== labGeneration) return;
      await processViewerComment(activeManager, viewer, comment, generation);
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      pushEvent('⚠️', `コメントを処理できませんでした: ${message}`);
    })
    .finally(() => {
      pendingInteractions = Math.max(0, pendingInteractions - 1);
      if (generation === labGeneration) render();
    });
}

async function processViewerComment(
  activeManager: KizunaManager,
  viewer: ViewerPersona,
  comment: CommentScript,
  generation: number,
): Promise<void> {
  simulatedNow += 2 * MINUTE_MS;
  chatEntries.push({
    id: chatSequence++,
    author: 'viewer',
    userId: viewer.id,
    name: viewer.name,
    icon: viewer.icon,
    type: comment.type,
    text: comment.text,
    emotion: comment.emotion,
    time: simulatedNow,
  });
  trimChatEntries();
  render();

  const interaction: Interaction = {
    userId: viewer.id,
    kind: comment.type,
    message: comment.text,
    emotion: comment.emotion,
    isOwner: viewer.isOwner,
    timestamp: simulatedNow,
    metadata: {
      displayName: viewer.name,
      source: 'mock-live-stream',
      commentType: comment.type,
    },
  };
  await activeManager.processInteraction(interaction);
  if (generation !== labGeneration) return;

  recordBondPoint(viewer.id);
  const reply = createCannedReply(viewer, comment);
  simulatedNow += MINUTE_MS;
  chatEntries.push(reply);
  lastReply = reply;
  trimChatEntries();
  pushEvent(
    commentTypeMeta[comment.type].icon,
    `${viewer.name}の${commentTypeMeta[comment.type].label}を絆へ記録しました。`,
  );
  render();
}

function createCannedReply(
  viewer: ViewerPersona,
  comment: CommentScript,
): ChatEntry {
  const typeReplies: Record<StreamCommentType, string[]> = {
    message: [
      `${viewer.name}、コメントありがとう。ちゃんと読んでるよ！`,
      `${viewer.name}の言葉、次の話題につなげてみるね。`,
      `来てくれてうれしい、${viewer.name}。一緒に楽しもう！`,
    ],
    reaction: [
      `${viewer.name}のリアクション届いたよ、ありがとう！`,
      `その反応うれしい！ ${viewer.name}にも伝わったんだね。`,
    ],
    gift: [
      `${viewer.name}、応援ありがとう！ 大切に受け取ったよ。`,
      `すてきな応援をありがとう、${viewer.name}。無理なく楽しんでね。`,
    ],
  };
  const options = typeReplies[comment.type];
  const text = options[replySequence % options.length] ?? 'ありがとう！';
  replySequence++;
  return {
    id: chatSequence++,
    author: 'character',
    name: 'Luna',
    icon: '☾',
    type: 'reply',
    text,
    emotion: comment.emotion,
    time: simulatedNow,
  };
}

function inferEmotion(text: string, type: StreamCommentType): string {
  if (type === 'gift' || /最高|すごい|応援|！|!/.test(text)) return 'excited';
  if (/\?|？|なぜ|どう/.test(text)) return 'curious';
  if (/落ち着|ゆっくり|静か|安心/.test(text)) return 'calm';
  return 'happy';
}

function advanceTime(hours: number): void {
  if (!Number.isFinite(hours) || hours <= 0) return;
  simulatedNow += hours * HOUR_MS;
  for (const viewer of viewers) {
    if (manager.getBondSnapshot(viewer.id)) recordBondPoint(viewer.id);
  }
  pushEvent(
    hours >= 24 ? '🌙' : '🕰️',
    `時計を${formatDuration(hours)}進め、warmthを再評価しました。`,
  );
  render();
}

function resetSimulator(): void {
  labGeneration++;
  manager.destroy();
  simulatedNow = INITIAL_TIME;
  selectedViewerId = viewers[0]?.id ?? '';
  manualViewerId = selectedViewerId;
  manualCommentType = 'message';
  manualDraft = '';
  pendingSkipHours = 24;
  autoPlaying = true;
  pendingInteractions = 0;
  eventEntries = [];
  chatEntries = [
    {
      id: chatSequence++,
      author: 'character',
      name: 'Luna',
      icon: '☾',
      type: 'reply',
      text: '配信をリセットしました。コメントを待っているね！',
      emotion: 'happy',
      time: simulatedNow,
    },
  ];
  lastReply = chatEntries[0];
  bondHistory = createEmptyBondHistory();
  scriptPositions.clear();
  for (const viewer of viewers) scriptPositions.set(viewer.id, 0);
  manager = createManager();
  bindManagerEvents();
  scheduleInitialAutoPosts();
  pushEvent('↺', 'モック配信を最初の状態に戻しました。');
  render();
}

function createEmptyBondHistory(): Map<string, BondHistoryPoint[]> {
  return new Map(
    viewers.map(({ id }) => [id, [{ time: INITIAL_TIME, capital: 0 }]]),
  );
}

function recordBondPoint(userId: string): void {
  const points = bondHistory.get(userId) ?? [];
  points.push({
    time: simulatedNow,
    capital: manager.toRelationshipCapital(userId),
  });
  bondHistory.set(userId, points.slice(-MAX_HISTORY_POINTS));
}

function trimChatEntries(): void {
  chatEntries = chatEntries.slice(-MAX_CHAT_ENTRIES);
}

function pushEvent(icon: string, text: string): void {
  eventEntries.unshift({ id: eventSequence++, time: simulatedNow, icon, text });
  eventEntries = eventEntries.slice(0, 28);
}

function render(focusToken: FocusToken | null = captureFocus()): void {
  const selectedViewer =
    viewers.find(({ id }) => id === selectedViewerId) ?? viewers[0];
  const selectedSnapshot = selectedViewer
    ? manager.getBondSnapshot(selectedViewer.id)
    : null;
  const context = selectedViewer
    ? manager.getBondContext(selectedViewer.id, { language: 'ja' })
    : '';
  const disabledWhileProcessing = pendingInteractions > 0 ? 'disabled' : '';

  app.innerHTML = `
    <div class="app-shell">
      <header class="hero">
        <div>
          <a class="eyebrow" href="https://github.com/shinshin86/aituber-onair" target="_blank" rel="noreferrer">@aituber-onair/kizuna</a>
          <p class="kicker">MOCK LIVE-STREAM · ONE APPLICATION SCENARIO</p>
          <h1>会話の流れから、<em>絆が育つ。</em></h1>
          <p class="lead">4人の視聴者がそれぞれのペースでコメントする架空配信です。配信UIは一例で、Kizuna本体は接触元に依存しません。</p>
        </div>
        <div class="hero-status">
          <span class="on-air"><i></i> ON AIR</span>
          <strong>${autoPlaying ? 'AUTO PLAYING' : 'PAUSED'}</strong>
          <small>API KEY / LLM不要</small>
        </div>
      </header>

      <section class="clock-bar" aria-label="シミュレーション時計">
        <div class="clock-now"><span>SIMULATED TIME</span><strong>${formatDateTime(simulatedNow)}</strong></div>
        <div class="quick-time">
          <button data-action="advance-time" data-hours="1" ${disabledWhileProcessing}>+1時間</button>
          <button data-action="advance-time" data-hours="24" ${disabledWhileProcessing}>+1日</button>
          <button data-action="advance-time" data-hours="168" ${disabledWhileProcessing}>+1週間</button>
        </div>
        <label class="time-slider">
          <span>まとめて進める <output id="skip-output">${formatDuration(pendingSkipHours)}</output></span>
          <input data-field="skip-hours" type="range" min="1" max="168" step="1" value="${pendingSkipHours}" ${disabledWhileProcessing} />
        </label>
        <button class="secondary" data-action="apply-time" ${disabledWhileProcessing}>適用</button>
        <button class="ghost" data-action="reset" ${disabledWhileProcessing}>リセット</button>
      </section>

      <main class="dashboard">
        <section class="workspace">
          <section class="stream-shell">
            ${renderStreamStage()}
            ${renderLiveChat()}
          </section>
          <section class="panel bond-panel">
            <div class="section-heading">
              <div><span class="section-mark">LIVE</span><h2>視聴者ごとの絆</h2></div>
              <p>コメントのたびにポイント・温度・推移を更新</p>
            </div>
            <div class="bond-grid">
              ${viewers.map(renderBondCard).join('')}
            </div>
          </section>
          ${renderDebugDrawer()}
        </section>

        <aside class="inspector">
          ${renderSelectedBond(selectedViewer, selectedSnapshot)}
          <section class="panel context-panel">
            <div class="panel-title-row">
              <div><span class="mini-label">GETBONDCONTEXT</span><h2>AIが受け取る関係性</h2></div>
              <span class="context-live">LIVE</span>
            </div>
            <pre>${escapeHtml(context || '最初のコメント後に、選択中の視聴者との関係性が表示されます。')}</pre>
          </section>
          <section class="panel event-panel">
            <div class="panel-title-row">
              <div><span class="mini-label">EVENT STREAM</span><h2>Kizunaの変化</h2></div>
              <span class="event-count">${eventEntries.length}</span>
            </div>
            <ol class="event-list">${eventEntries.map(renderEvent).join('')}</ol>
          </section>
        </aside>
      </main>
    </div>
  `;
  restoreFocus(focusToken);
  scrollChatToLatest();
}

function renderStreamStage(): string {
  return `
    <section class="stream-stage" aria-label="モック配信ステージ">
      <div class="stream-topline">
        <span class="live-badge"><i></i> LIVE</span>
        <span class="viewer-count">◉ 1,248</span>
      </div>
      <div class="stage-light light-one"></div>
      <div class="stage-light light-two"></div>
      <div class="character-placeholder" aria-label="AIキャラクターのプレースホルダー">
        <span class="character-halo"></span>
        <span class="character-face">☾</span>
        <small>CHARACTER PLACEHOLDER</small>
      </div>
      <div class="stage-caption">
        <span class="emotion-tag">[${escapeHtml(lastReply?.emotion ?? 'happy')}]</span>
        <p>${escapeHtml(lastReply?.text ?? 'コメントを待っています。')}</p>
      </div>
      <div class="stream-title"><span>NOW STREAMING</span><strong>夜のまったり雑談室</strong></div>
    </section>
  `;
}

function renderLiveChat(): string {
  return `
    <section class="live-chat" aria-label="ライブチャット">
      <div class="chat-header">
        <div><span class="mini-label">LIVE CHAT</span><h2>コメント</h2></div>
        <button class="auto-toggle ${autoPlaying ? 'playing' : ''}" data-action="toggle-auto" aria-pressed="${autoPlaying}">
          ${autoPlaying ? '⏸ 一時停止' : '▶ 自動再生'}
        </button>
      </div>
      <div class="chat-feed" data-chat-feed>
        ${chatEntries.map(renderChatEntry).join('')}
      </div>
      <form class="chat-composer" data-form="manual-comment">
        <div class="composer-options">
          <label><span>投稿者</span><select data-field="manual-viewer">
            ${viewers.map((viewer) => `<option value="${viewer.id}" ${viewer.id === manualViewerId ? 'selected' : ''}>${viewer.icon} ${viewer.name}</option>`).join('')}
          </select></label>
          <label><span>種別</span><select data-field="manual-type">
            ${(['message', 'reaction', 'gift'] as const).map((type) => `<option value="${type}" ${type === manualCommentType ? 'selected' : ''}>${commentTypeMeta[type].icon} ${commentTypeMeta[type].label}</option>`).join('')}
          </select></label>
        </div>
        <div class="composer-row">
          <input data-field="manual-draft" value="${escapeHtml(manualDraft)}" placeholder="選んだ視聴者としてコメント…" maxlength="120" aria-label="手動コメント" />
          <button type="submit" ${manualDraft.trim() ? '' : 'disabled'}>投稿</button>
        </div>
        <p>${pendingInteractions > 0 ? `${pendingInteractions}件を処理中…` : '投稿内容から感情を推定し、Kizunaへ記録します。'}</p>
      </form>
    </section>
  `;
}

function renderChatEntry(entry: ChatEntry): string {
  const viewer = entry.userId
    ? viewers.find(({ id }) => id === entry.userId)
    : undefined;
  const typeLabel =
    entry.type === 'reply' ? 'AI REPLY' : commentTypeMeta[entry.type].label;
  const authorLabel = viewer
    ? `<button class="chat-author" data-action="select-viewer" data-user-id="${viewer.id}">${escapeHtml(entry.name)}</button>`
    : `<strong>${escapeHtml(entry.name)}</strong>`;
  return `
    <article class="chat-message ${entry.author} type-${entry.type}" style="--viewer-accent:${viewer?.accent ?? '#d8576b'}">
      <span class="chat-avatar">${entry.icon}</span>
      <div>
        <div class="chat-meta">${authorLabel}<span>${typeLabel}</span><time>${formatTime(entry.time)}</time></div>
        <p>${escapeHtml(entry.text)}</p>
        <small>[${escapeHtml(entry.emotion)}]</small>
      </div>
    </article>
  `;
}

function renderBondCard(viewer: ViewerPersona): string {
  const snapshot = manager.getBondSnapshot(viewer.id);
  const warmth = snapshot?.warmth ?? 0;
  const selected = viewer.id === selectedViewerId;
  return `
    <button class="bond-card ${selected ? 'selected' : ''}" data-action="select-viewer" data-user-id="${viewer.id}" aria-pressed="${selected}">
      <div class="bond-card-top">
        <span class="viewer-avatar" style="--viewer-accent:${viewer.accent}">${viewer.icon}</span>
        <div><strong>${viewer.name}</strong><small>${viewer.note}</small></div>
        <span class="stage-badge stage-${snapshot?.stage ?? 'waiting'}">${snapshot?.stage ?? 'waiting'}</span>
      </div>
      <div class="bond-numbers"><span><b>${snapshot?.points ?? 0}</b> pt</span><span>WARMTH <b>${Math.round(warmth * 100)}%</b></span></div>
      <div class="warmth-meter"><i style="width:${warmth * 100}%"></i></div>
      <div class="sparkline-row">
        <span>BOND TREND</span>
        ${renderSparkline(viewer)}
      </div>
    </button>
  `;
}

function renderSparkline(viewer: ViewerPersona): string {
  const history = bondHistory.get(viewer.id) ?? [];
  const width = 150;
  const height = 42;
  const points = history.slice(-18).map(({ capital }, index, items) => {
    const x = items.length <= 1 ? width : (index / (items.length - 1)) * width;
    const y = height - Math.max(0, Math.min(1, capital)) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const polyline =
    points.length === 1 ? `${points[0]} ${points[0]}` : points.join(' ');
  return `
    <svg class="sparkline" viewBox="0 0 ${width} ${height}" role="img" aria-label="${viewer.name}の絆推移">
      <line x1="0" y1="${height - 2}" x2="${width}" y2="${height - 2}"></line>
      <polyline points="${polyline}" style="--viewer-accent:${viewer.accent}"></polyline>
    </svg>
  `;
}

function renderSelectedBond(
  viewer: ViewerPersona | undefined,
  snapshot: BondSnapshot | null,
): string {
  if (!viewer || !snapshot) {
    return `
      <section class="panel focus-panel empty-focus">
        <span class="focus-avatar">${viewer?.icon ?? '🌱'}</span>
        <span class="mini-label">SELECTED VIEWER</span>
        <h2>${viewer?.name ?? '視聴者を選択'}</h2>
        <p>コメントが届くと、会話から生まれた絆がここに現れます。</p>
      </section>
    `;
  }

  const capital = manager.toRelationshipCapital(viewer.id);
  const favoriteEmotions = snapshot.favoriteEmotions.length
    ? snapshot.favoriteEmotions
        .slice(0, 3)
        .map(
          ({ emotion, count }) =>
            `<span>${escapeHtml(emotion)} ×${count}</span>`,
        )
        .join('')
    : '<span>まだありません</span>';
  const achievements = snapshot.achievements.length
    ? snapshot.achievements
        .map(
          ({ icon, title }) =>
            `<li><span>${icon ?? '🏅'}</span><strong>${escapeHtml(title)}</strong></li>`,
        )
        .join('')
    : '<li class="muted-achievement">会話を重ねると実績が開きます</li>';

  return `
    <section class="panel focus-panel">
      <div class="focus-head">
        <span class="focus-avatar" style="--viewer-accent:${viewer.accent}">${viewer.icon}</span>
        <div><span class="mini-label">SELECTED VIEWER</span><h2>${viewer.name}</h2><p>${snapshot.role} · Lv.${snapshot.level}</p></div>
        <span class="stage-badge stage-${snapshot.stage}">${snapshot.stage}</span>
      </div>
      <div class="focus-warmth">
        <div><span>WARMTH</span><strong>${Math.round(snapshot.warmth * 100)}%</strong></div>
        <div class="warmth-meter"><i style="width:${snapshot.warmth * 100}%"></i></div>
        <p>最後の接触 ${formatDateTime(snapshot.continuity.lastContactAt.getTime())}</p>
      </div>
      <div class="metric-grid">
        <div><span>POINTS</span><strong>${snapshot.points}</strong></div>
        <div><span>STREAK</span><strong>${snapshot.continuity.streak}</strong><small>${snapshot.continuity.totalActiveBuckets} buckets</small></div>
        <div><span>CAPITAL</span><strong>${capital.toFixed(2)}</strong><small>0.00—1.00</small></div>
      </div>
      <div class="favorite-row"><span>FAVORITE EMOTIONS</span><div>${favoriteEmotions}</div></div>
      <div class="achievement-block"><span>ACHIEVEMENTS</span><ul>${achievements}</ul></div>
    </section>
  `;
}

function renderDebugDrawer(): string {
  return `
    <details class="debug-drawer">
      <summary>DEBUG · コメント種別とポイントの対応を見る</summary>
      <div>
        <p>配信UIは一例です。Kizunaへ渡すのは汎用的な <code>Interaction.kind</code> です。</p>
        <div class="debug-actions">
          ${viewers.map((viewer) => `<button data-action="post-next-auto" data-user-id="${viewer.id}">${viewer.icon} ${viewer.name}の次の投稿</button>`).join('')}
        </div>
        <ul>
          ${(['message', 'reaction', 'gift'] as const).map((type) => `<li><code>${type}</code><span>${commentTypeMeta[type].label}</span><b>+${commentTypeMeta[type].points} pt</b></li>`).join('')}
        </ul>
      </div>
    </details>
  `;
}

function renderEvent(entry: EventEntry): string {
  return `
    <li><span class="event-icon">${entry.icon}</span><div><strong>${escapeHtml(entry.text)}</strong><time>${formatTime(entry.time)}</time></div></li>
  `;
}

function formatDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(timestamp);
}

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(timestamp);
}

function formatDuration(hours: number): string {
  if (hours < 24) return `${hours}時間`;
  if (hours % 168 === 0) return `${hours / 168}週間`;
  if (hours % 24 === 0) return `${hours / 24}日`;
  return `${Math.floor(hours / 24)}日 ${hours % 24}時間`;
}

function isStreamCommentType(value: string): value is StreamCommentType {
  return value === 'message' || value === 'reaction' || value === 'gift';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getAppRoot(): HTMLDivElement {
  const element = document.querySelector<HTMLDivElement>('#app');
  if (!element) throw new Error('App root was not found.');
  return element;
}

function captureFocus(): FocusToken | null {
  const element = document.activeElement as
    | HTMLInputElement
    | HTMLElement
    | null;
  if (!element || !app.contains(element)) return null;
  const { action, field, userId } = element.dataset;
  if (!action && !field) return null;
  return {
    action,
    field,
    userId,
    selectionStart:
      element instanceof HTMLInputElement ? element.selectionStart : undefined,
    selectionEnd:
      element instanceof HTMLInputElement ? element.selectionEnd : undefined,
  };
}

function restoreFocus(token: FocusToken | null): void {
  if (!token) return;
  const candidates = app.querySelectorAll<HTMLElement>(
    '[data-action], [data-field]',
  );
  for (const candidate of Array.from(candidates)) {
    if (
      candidate.dataset.action === token.action &&
      candidate.dataset.field === token.field &&
      candidate.dataset.userId === token.userId
    ) {
      candidate.focus();
      if (
        candidate instanceof HTMLInputElement &&
        token.selectionStart !== undefined &&
        token.selectionEnd !== undefined
      ) {
        candidate.setSelectionRange(token.selectionStart, token.selectionEnd);
      }
      return;
    }
  }
}

function scrollChatToLatest(): void {
  const feed = document.querySelector<HTMLElement>('[data-chat-feed]');
  if (feed) feed.scrollTop = feed.scrollHeight;
}
