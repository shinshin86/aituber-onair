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

interface DemoUser {
  id: string;
  name: string;
  icon: string;
  isOwner: boolean;
  note: string;
}

interface ContactOption {
  kind: InteractionKind;
  label: string;
  icon: string;
  points: number;
  message: string;
}

interface EventEntry {
  id: number;
  time: number;
  icon: string;
  text: string;
}

interface RelationshipChange {
  userName: string;
  icon: string;
  pointsAdded: number;
  previousCapital: number;
  nextCapital: number;
  previousStage: string;
  nextStage: string;
}

const stageLabels: Record<string, string> = {
  stranger: '知り合ったばかり',
  acquaintance: '知り合い',
  regular: '常連',
  companion: '相棒',
};

interface FocusToken {
  action?: string;
  field?: string;
  userId?: string;
  kind?: string;
  hours?: string;
}

const HOUR_MS = 60 * 60 * 1_000;
const DAY_MS = 24 * HOUR_MS;
const INITIAL_TIME = Date.UTC(2026, 0, 12, 10);
const users: DemoUser[] = [
  {
    id: 'aki',
    name: 'Aki',
    icon: '🌱',
    isOwner: false,
    note: 'はじめまして',
  },
  {
    id: 'mio',
    name: 'Mio',
    icon: '🎨',
    isOwner: false,
    note: 'よく話す人',
  },
  {
    id: 'ren',
    name: 'Ren',
    icon: '🎧',
    isOwner: false,
    note: '静かな常連',
  },
  {
    id: 'sora',
    name: 'Sora',
    icon: '✨',
    isOwner: true,
    note: 'キャラクターの相棒',
  },
];

const contacts: ContactOption[] = [
  { kind: 'message', label: '話す', icon: '💬', points: 24, message: 'やあ！' },
  {
    kind: 'reaction',
    label: '反応する',
    icon: '💫',
    points: 14,
    message: '👏',
  },
  { kind: 'gift', label: '贈る', icon: '🎁', points: 120, message: 'どうぞ！' },
  {
    kind: 'presence',
    label: 'そばにいる',
    icon: '🫧',
    points: 8,
    message: '…',
  },
  {
    kind: 'touch',
    label: 'ふれる',
    icon: '🤍',
    points: 18,
    message: 'なでなで',
  },
];

const emotions = [
  { id: 'happy', label: 'うれしい', icon: '😊' },
  { id: 'curious', label: '気になる', icon: '🧐' },
  { id: 'calm', label: 'おだやか', icon: '😌' },
  { id: 'excited', label: 'わくわく', icon: '🤩' },
];

const eventTypes = [
  'user_created',
  'points_updated',
  'level_up',
  'threshold_reached',
  'achievement_earned',
] as const;

let simulatedNow = INITIAL_TIME;
let selectedUserId = users[0]?.id ?? '';
let selectedEmotion = emotions[0]?.id ?? '';
let pendingSkipHours = 24;
let eventSequence = 0;
let isProcessing = false;
let relationshipChange: RelationshipChange | null = null;
let relationshipChangeTimer: number | null = null;
let eventEntries: EventEntry[] = [
  {
    id: eventSequence++,
    time: simulatedNow,
    icon: '🧭',
    text: '人物と接触を選んで、最初の絆を作ってみましょう。',
  },
];
let manager = createManager();

const app = getAppRoot();

bindManagerEvents();
render();

window.addEventListener('beforeunload', () => {
  if (relationshipChangeTimer !== null) {
    window.clearTimeout(relationshipChangeTimer);
  }
  manager.destroy();
});

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement | null;
  const actionTarget = target?.closest<HTMLElement>('[data-action]');
  if (!actionTarget) return;

  switch (actionTarget.dataset.action) {
    case 'select-user':
      selectedUserId = actionTarget.dataset.userId ?? selectedUserId;
      render();
      break;
    case 'contact':
      void processContact(actionTarget.dataset.kind ?? 'message');
      break;
    case 'advance-time':
      if (!isProcessing) advanceTime(Number(actionTarget.dataset.hours ?? 0));
      break;
    case 'apply-time':
      if (!isProcessing) advanceTime(pendingSkipHours);
      break;
    case 'reset':
      resetLab();
      break;
  }
});

document.addEventListener('input', (event) => {
  const target = event.target as HTMLInputElement | HTMLSelectElement | null;
  if (!target) return;
  if (target.dataset.field === 'emotion') {
    selectedEmotion = target.value;
    render();
  }
  if (target.dataset.field === 'skip-hours') {
    pendingSkipHours = Number(target.value);
    const output = document.querySelector<HTMLOutputElement>('#skip-output');
    if (output) output.value = formatDuration(pendingSkipHours);
  }
});

function createManager(): KizunaManager {
  const config = createDefaultKizunaConfig();
  config.now = () => simulatedNow;
  config.basePoints = Object.fromEntries(
    contacts.map(({ kind, points }) => [kind, points]),
  );
  config.owner = {
    initialPoints: 25,
    pointMultiplier: 1.25,
    exclusiveAchievements: ['character_partner'],
    firstContactBonus: 5,
  };
  config.warmth = { halfLifeMs: DAY_MS, floor: 0.2 };
  config.continuity = { unit: 'day', grace: 0 };
  config.thresholds = createAchievementThresholds();
  return new KizunaManager(config, undefined, 'kizuna-browser-lab');
}

function createAchievementThresholds(): Threshold[] {
  return [
    createAchievementThreshold(
      'first_bond',
      100,
      '心が通じた',
      '「知り合い」ステージに到達しました。',
      '🌸',
    ),
    createAchievementThreshold(
      'trusted_regular',
      500,
      'いつもの安心感',
      '「常連」ステージに到達しました。',
      '🏡',
    ),
    createAchievementThreshold(
      'lasting_companion',
      1_000,
      'かけがえのない相棒',
      '「相棒」ステージに到達しました。',
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
      const user = users.find(({ id }) => id === event.userId);
      const label = user?.name ?? event.userId;
      const entry = describeEvent(event, label);
      if (entry) pushEvent(entry.icon, entry.text);
    });
  }
}

function describeEvent(
  event: KizunaEventData,
  userName: string,
): Pick<EventEntry, 'icon' | 'text'> | null {
  const data = event.data as Record<string, unknown>;
  switch (event.type) {
    case 'user_created':
      return { icon: '🌱', text: `${userName}との絆が生まれました。` };
    case 'points_updated':
      return {
        icon: '✦',
        text: `${userName}の絆ポイント +${String(data.pointsAdded ?? 0)}`,
      };
    case 'level_up':
      return {
        icon: '↗',
        text: `${userName}がレベル${String(data.newLevel ?? '')}になりました。`,
      };
    case 'achievement_earned': {
      const achievement = data.achievement as
        | { title?: string; icon?: string }
        | undefined;
      return {
        icon: achievement?.icon ?? '🏅',
        text: `${userName}が「${achievement?.title ?? '新しい実績'}」を獲得しました。`,
      };
    }
    default:
      return null;
  }
}

async function processContact(kind: string): Promise<void> {
  if (isProcessing) return;
  const user = users.find(({ id }) => id === selectedUserId);
  const contact = contacts.find((option) => option.kind === kind);
  if (!user || !contact) return;

  isProcessing = true;
  const previousSnapshot = manager.getBondSnapshot(user.id);
  const previousCapital = manager.toRelationshipCapital(user.id);
  const focusToken: FocusToken = { action: 'contact', kind };
  render(focusToken);
  try {
    const interaction: Interaction = {
      userId: user.id,
      kind: contact.kind,
      message: contact.message,
      emotion: selectedEmotion,
      isOwner: user.isOwner,
      timestamp: simulatedNow,
      metadata: { displayName: user.name },
    };
    const result = await manager.processInteraction(interaction);
    const nextSnapshot = manager.getBondSnapshot(user.id);
    if (nextSnapshot) {
      showRelationshipChange({
        userName: user.name,
        icon: user.icon,
        pointsAdded: result.pointsAdded,
        previousCapital,
        nextCapital: manager.toRelationshipCapital(user.id),
        previousStage: previousSnapshot?.stage ?? '未接触',
        nextStage: nextSnapshot.stage,
      });
    }
    pushEvent(contact.icon, `${user.name}: ${contact.label}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    pushEvent('⚠️', `接触を処理できませんでした: ${message}`);
  } finally {
    isProcessing = false;
    render(focusToken);
  }
}

function advanceTime(hours: number): void {
  if (!Number.isFinite(hours) || hours <= 0) return;
  simulatedNow += hours * HOUR_MS;
  pushEvent(
    hours >= 24 ? '🌙' : '🕰️',
    `時計を${formatDuration(hours)}進めました。`,
  );
  render();
}

function resetLab(): void {
  manager.destroy();
  simulatedNow = INITIAL_TIME;
  selectedUserId = users[0]?.id ?? '';
  selectedEmotion = emotions[0]?.id ?? '';
  pendingSkipHours = 24;
  eventEntries = [];
  relationshipChange = null;
  if (relationshipChangeTimer !== null) {
    window.clearTimeout(relationshipChangeTimer);
    relationshipChangeTimer = null;
  }
  manager = createManager();
  bindManagerEvents();
  pushEvent('↺', 'ラボを最初の状態に戻しました。');
  render();
}

function showRelationshipChange(change: RelationshipChange): void {
  relationshipChange = change;
  if (relationshipChangeTimer !== null) {
    window.clearTimeout(relationshipChangeTimer);
  }
  relationshipChangeTimer = window.setTimeout(() => {
    relationshipChange = null;
    relationshipChangeTimer = null;
    render();
  }, 4_000);
}

function pushEvent(icon: string, text: string): void {
  eventEntries.unshift({ id: eventSequence++, time: simulatedNow, icon, text });
  eventEntries = eventEntries.slice(0, 24);
}

function render(focusToken: FocusToken | null = captureFocus()): void {
  const selectedUser =
    users.find(({ id }) => id === selectedUserId) ?? users[0];
  const selectedSnapshot = selectedUser
    ? manager.getBondSnapshot(selectedUser.id)
    : null;
  const context = selectedUser
    ? manager.getBondContext(selectedUser.id, { language: 'ja' })
    : '';

  app.innerHTML = `
    <div class="app-shell">
      <header class="hero">
        <div class="hero-copy">
          <a class="eyebrow" href="https://github.com/shinshin86/aituber-onair" target="_blank" rel="noreferrer">@aituber-onair/kizuna</a>
          <p class="kicker">このデモで確認できること</p>
          <h1>Kizuna<br /><em>関係性ラボ</em></h1>
          <p class="lead">視聴者と接触の種類を選ぶと、人物ごとの親密度ポイント・温かさ・関係ステージがどう変わるかを試せます。実アプリでは、ここに表示される関係性をLLMプロンプトへ渡して応答を変えられます。</p>
          <div class="stage-path" aria-label="関係ステージ">
            <span>知り合ったばかり</span><i></i><span>知り合い</span><i></i><span>常連</span><i></i><span>相棒</span>
          </div>
        </div>
      </header>

      ${renderRelationshipToast()}

      <section class="clock-bar" aria-label="シミュレーション時計">
        <div class="clock-now">
          <span>シミュレーション時刻</span>
          <strong>${formatDateTime(simulatedNow)}</strong>
        </div>
        <div class="quick-time">
          <button data-action="advance-time" data-hours="1" ${isProcessing ? 'disabled' : ''}>+1時間</button>
          <button data-action="advance-time" data-hours="24" ${isProcessing ? 'disabled' : ''}>+1日</button>
          <button data-action="advance-time" data-hours="168" ${isProcessing ? 'disabled' : ''}>+1週間</button>
        </div>
        <label class="time-slider">
          <span>まとめて進める <output id="skip-output">${formatDuration(pendingSkipHours)}</output></span>
          <input data-field="skip-hours" type="range" min="1" max="168" step="1" value="${pendingSkipHours}" ${isProcessing ? 'disabled' : ''} />
        </label>
        <button class="secondary" data-action="apply-time" ${isProcessing ? 'disabled' : ''}>適用</button>
        <button class="ghost" data-action="reset" ${isProcessing ? 'disabled' : ''}>リセット</button>
      </section>

      <main class="lab-layout">
        <section class="workspace">
          <section class="panel contact-panel">
            <div class="section-heading">
              <div><span class="step">01</span><h2>視聴者を選ぶ</h2></div>
              <p>選んだ視聴者の関係性が右側に表示されます。</p>
            </div>
            <div class="people-grid">
              ${users.map((user) => renderPersonButton(user)).join('')}
            </div>

            <div class="contact-divider"></div>
            <div class="section-heading compact">
              <div><span class="step">02</span><h2>接触の種類を選ぶ</h2></div>
              <label class="emotion-field">
                <span>今の感情</span>
                <select data-field="emotion">
                  ${emotions.map((emotion) => `<option value="${emotion.id}" ${emotion.id === selectedEmotion ? 'selected' : ''}>${emotion.icon} ${emotion.label}</option>`).join('')}
                </select>
              </label>
            </div>
            <div class="contact-grid">
              ${contacts.map((contact) => renderContactButton(contact)).join('')}
            </div>
            <p class="contact-hint">時間を進めると「温かさ」が下がります。次の接触で「継続」の変化が確定します。</p>
          </section>

          <section class="panel roster-panel">
            <div class="section-heading">
              <div><span class="step">03</span><h2>視聴者ごとの関係性</h2></div>
              <p>ポイント・温かさ・親密度の変化を比較できます。</p>
            </div>
            <div class="bond-grid">
              ${users.map((user) => renderBondCard(user)).join('')}
            </div>
          </section>
        </section>

        <aside class="inspector">
          ${renderSelectedBond(selectedUser, selectedSnapshot)}
          <section class="panel context-panel">
            <div class="panel-title-row">
              <div><span class="mini-label">LLMへ渡す情報</span><h2>AIが受け取る関係性</h2></div>
              <span class="live-dot">現在値</span>
            </div>
            <pre>${escapeHtml(context || '最初の接触後に、ここへ関係性の文脈が表示されます。')}</pre>
          </section>
          <section class="panel event-panel">
            <div class="panel-title-row">
              <div><h2>変化ログ</h2></div>
              <span class="event-count">${eventEntries.length}</span>
            </div>
            <ol class="event-list">
              ${eventEntries.map(renderEvent).join('')}
            </ol>
          </section>
        </aside>
      </main>
    </div>
  `;
  restoreFocus(focusToken);
}

function renderPersonButton(user: DemoUser): string {
  const snapshot = manager.getBondSnapshot(user.id);
  const selected = user.id === selectedUserId;
  return `
    <button class="person ${selected ? 'selected' : ''}" data-action="select-user" data-user-id="${user.id}" aria-pressed="${selected}">
      <span class="person-icon">${user.icon}</span>
      <span class="person-copy"><strong>${user.name}</strong><small>${user.note}</small></span>
      <span class="person-stage">${snapshot ? formatStage(snapshot.stage) : 'まだ出会っていない'}</span>
    </button>
  `;
}

function renderContactButton(contact: ContactOption): string {
  return `
    <button class="contact" data-action="contact" data-kind="${contact.kind}" ${isProcessing ? 'disabled' : ''}>
      <span>${contact.icon}</span>
      <strong>${contact.label}</strong>
      <small>基本 +${contact.points} pt</small>
    </button>
  `;
}

function renderBondCard(user: DemoUser): string {
  const snapshot = manager.getBondSnapshot(user.id);
  if (!snapshot) {
    return `
      <button class="bond-card bond-empty" data-action="select-user" data-user-id="${user.id}">
        <span>${user.icon}</span><strong>${user.name}</strong><small>最初の接触を待っています</small>
      </button>
    `;
  }
  const capital = manager.toRelationshipCapital(user.id);
  return `
    <button class="bond-card ${user.id === selectedUserId ? 'selected' : ''}" data-action="select-user" data-user-id="${user.id}">
      <div class="bond-card-head"><span>${user.icon}</span><div><strong>${user.name}</strong><small>${formatStage(snapshot.stage)}</small></div><b>Lv.${snapshot.level}</b></div>
      <div class="intimacy-card-label"><span>親密度</span><strong>${Math.round(capital * 100)}%</strong></div>
      <div class="micro-meter intimacy-meter"><i style="width:${capital * 100}%"></i></div>
      <div class="bond-card-meta"><span><b>${snapshot.points}</b> ポイント</span><span><b>${Math.round(snapshot.warmth * 100)}%</b> 温かさ</span><span><b>${snapshot.continuity.streak}</b> 継続</span></div>
    </button>
  `;
}

function renderSelectedBond(
  user: DemoUser | undefined,
  snapshot: BondSnapshot | null,
): string {
  if (!user || !snapshot) {
    return `
      <section class="panel focus-panel empty-focus">
        <span class="focus-avatar">${user?.icon ?? '🌱'}</span>
        <span class="mini-label">選択中の視聴者との関係性</span>
        <h2>${user?.name ?? '人物を選択'}</h2>
        <p>接触すると、絆の温かさと積み重なりがここに現れます。</p>
      </section>
    `;
  }

  const capital = manager.toRelationshipCapital(user.id);
  const favoriteEmotions = snapshot.favoriteEmotions.length
    ? snapshot.favoriteEmotions
        .slice(0, 3)
        .map(({ emotion, count }) => `<span>${emotion} ×${count}</span>`)
        .join('')
    : '<span>まだありません</span>';
  const achievements = snapshot.achievements.length
    ? snapshot.achievements
        .map(
          ({ icon, title }) =>
            `<li><span>${icon ?? '🏅'}</span><strong>${escapeHtml(title)}</strong></li>`,
        )
        .join('')
    : '<li class="muted-achievement">次のステージで実績が開きます</li>';

  return `
    <section class="panel focus-panel">
      <div class="focus-head">
        <span class="focus-avatar">${user.icon}</span>
        <div><span class="mini-label">選択中の視聴者との関係性</span><h2>${user.name}</h2><p>${snapshot.role === 'owner' ? '配信者の相棒' : '視聴者'} · Lv.${snapshot.level}</p></div>
        <span class="stage-badge">${formatStage(snapshot.stage)}</span>
      </div>
      <div class="warmth-block">
        <div class="metric-label"><span>温かさ（しばらく接触がないと下がる親密さ）</span><strong>${Math.round(snapshot.warmth * 100)}%</strong></div>
        <div class="warmth-meter"><i style="width:${snapshot.warmth * 100}%"></i></div>
        <p>最後の接触: ${formatDateTime(snapshot.continuity.lastContactAt.getTime())}</p>
      </div>
      <div class="metric-grid">
        <div><span>ポイント（累計・減らない）</span><strong>${snapshot.points}</strong><small>接触のたびに加算</small></div>
        <div><span>継続（連続して会えている期間）</span><strong>${snapshot.continuity.streak}</strong><small>活動日 ${snapshot.continuity.totalActiveBuckets}回</small></div>
        <div title="Kizunaのポイントと温かさを0〜1へ正規化し、@aituber-onair/noiseの関係性ゲートに渡せる値です。"><span>noise連携用の値</span><strong>${capital.toFixed(2)}</strong><small>ポイントと温かさを0〜1へ正規化</small></div>
      </div>
      <div class="favorite-row"><span>よく記録された感情</span><div>${favoriteEmotions}</div></div>
      <div class="achievement-block"><span>実績</span><ul>${achievements}</ul></div>
    </section>
  `;
}

function renderRelationshipToast(): string {
  if (!relationshipChange) return '';
  const stageChanged =
    relationshipChange.previousStage !== relationshipChange.nextStage;
  return `
    <aside class="relationship-toast ${stageChanged ? 'stage-changed' : ''}" role="status">
      <div><span>${relationshipChange.icon}</span><div><strong>${relationshipChange.userName}の親密度が上がりました</strong><small>+${relationshipChange.pointsAdded}ポイント${stageChanged ? ` · ${formatStage(relationshipChange.previousStage)} → ${formatStage(relationshipChange.nextStage)}` : ''}</small></div></div>
      <div class="toast-meter"><i style="--from:${relationshipChange.previousCapital * 100}%;--to:${relationshipChange.nextCapital * 100}%"></i></div>
      <p>${Math.round(relationshipChange.previousCapital * 100)}% → ${Math.round(relationshipChange.nextCapital * 100)}%</p>
    </aside>
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

function formatStage(stage: string): string {
  return stageLabels[stage] ?? stage;
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
  const element = document.activeElement as HTMLElement | null;
  if (!element || !app.contains(element)) return null;
  const { action, field, userId, kind, hours } = element.dataset;
  if (!action && !field) return null;
  return { action, field, userId, kind, hours };
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
      candidate.dataset.userId === token.userId &&
      candidate.dataset.kind === token.kind &&
      candidate.dataset.hours === token.hours
    ) {
      candidate.focus();
      return;
    }
  }
}
