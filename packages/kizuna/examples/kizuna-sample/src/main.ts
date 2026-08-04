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
      advanceTime(Number(actionTarget.dataset.hours ?? 0));
      break;
    case 'apply-time':
      advanceTime(pendingSkipHours);
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
    await manager.processInteraction(interaction);
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
  manager = createManager();
  bindManagerEvents();
  pushEvent('↺', 'ラボを最初の状態に戻しました。');
  render();
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
          <p class="kicker">BOND SIMULATION LAB</p>
          <h1>ふれあうほど、<br /><em>関係が育つ。</em></h1>
          <p class="lead">話す、反応する、そばにいる。小さな接触が積み重なり、AIキャラクターとの絆になっていく様子を試せます。</p>
          <div class="stage-path" aria-label="絆ステージ">
            <span>stranger</span><i></i><span>acquaintance</span><i></i><span>regular</span><i></i><span>companion</span>
          </div>
        </div>
      </header>

      <section class="clock-bar" aria-label="シミュレーション時計">
        <div class="clock-now">
          <span>SIMULATED TIME</span>
          <strong>${formatDateTime(simulatedNow)}</strong>
        </div>
        <div class="quick-time">
          <button data-action="advance-time" data-hours="1">+1時間</button>
          <button data-action="advance-time" data-hours="24">+1日</button>
          <button data-action="advance-time" data-hours="168">+1週間</button>
        </div>
        <label class="time-slider">
          <span>まとめて進める <output id="skip-output">${formatDuration(pendingSkipHours)}</output></span>
          <input data-field="skip-hours" type="range" min="1" max="168" step="1" value="${pendingSkipHours}" />
        </label>
        <button class="secondary" data-action="apply-time">適用</button>
        <button class="ghost" data-action="reset">リセット</button>
      </section>

      <main class="lab-layout">
        <section class="workspace">
          <section class="panel contact-panel">
            <div class="section-heading">
              <div><span class="step">01</span><h2>誰とふれあう？</h2></div>
              <p>人物を選ぶと、その人の絆が右側に表示されます。</p>
            </div>
            <div class="people-grid">
              ${users.map((user) => renderPersonButton(user)).join('')}
            </div>

            <div class="contact-divider"></div>
            <div class="section-heading compact">
              <div><span class="step">02</span><h2>どんな接触？</h2></div>
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
            <p class="contact-hint">時間を進めると warmth が下がります。次の接触で continuity の変化が確定します。</p>
          </section>

          <section class="panel roster-panel">
            <div class="section-heading">
              <div><span class="step">03</span><h2>みんなの絆</h2></div>
              <p>接触した人物の状態を並べて比較できます。</p>
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
              <div><span class="mini-label">LLM CONTEXT</span><h2>AIが受け取る関係性</h2></div>
              <span class="live-dot">LIVE</span>
            </div>
            <pre>${escapeHtml(context || '最初の接触後に、ここへ関係性の文脈が表示されます。')}</pre>
          </section>
          <section class="panel event-panel">
            <div class="panel-title-row">
              <div><span class="mini-label">EVENT STREAM</span><h2>絆の変化</h2></div>
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
      <span class="person-stage">${snapshot?.stage ?? 'まだ出会っていない'}</span>
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
  return `
    <button class="bond-card ${user.id === selectedUserId ? 'selected' : ''}" data-action="select-user" data-user-id="${user.id}">
      <div class="bond-card-head"><span>${user.icon}</span><div><strong>${user.name}</strong><small>${snapshot.stage}</small></div><b>Lv.${snapshot.level}</b></div>
      <div class="micro-meter"><i style="width:${snapshot.warmth * 100}%"></i></div>
      <div class="bond-card-meta"><span>${snapshot.points} pt</span><span>🔥 ${snapshot.continuity.streak}</span><span>${Math.round(snapshot.warmth * 100)}%</span></div>
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
        <span class="mini-label">SELECTED BOND</span>
        <h2>${user?.name ?? '人物を選択'}</h2>
        <p>接触すると、絆の温度と積み重なりがここに現れます。</p>
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
        <div><span class="mini-label">SELECTED BOND</span><h2>${user.name}</h2><p>${snapshot.role === 'owner' ? 'owner' : 'guest'} · Lv.${snapshot.level}</p></div>
        <span class="stage-badge">${snapshot.stage}</span>
      </div>
      <div class="warmth-block">
        <div class="metric-label"><span>WARMTH</span><strong>${Math.round(snapshot.warmth * 100)}%</strong></div>
        <div class="warmth-meter"><i style="width:${snapshot.warmth * 100}%"></i></div>
        <p>最後の接触: ${formatDateTime(snapshot.continuity.lastContactAt.getTime())}</p>
      </div>
      <div class="metric-grid">
        <div><span>POINTS</span><strong>${snapshot.points}</strong></div>
        <div><span>CONTINUITY</span><strong>${snapshot.continuity.streak}</strong><small>${snapshot.continuity.totalActiveBuckets} buckets</small></div>
        <div><span>CAPITAL</span><strong>${capital.toFixed(2)}</strong><small>Noise bridge</small></div>
      </div>
      <div class="favorite-row"><span>FAVORITE EMOTIONS</span><div>${favoriteEmotions}</div></div>
      <div class="achievement-block"><span>ACHIEVEMENTS</span><ul>${achievements}</ul></div>
    </section>
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
