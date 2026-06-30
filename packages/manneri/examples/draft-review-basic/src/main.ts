import {
  ManneriDetector,
  REVIEW_DRAFT_REPETITION_TOOL,
  type DraftReviewResult,
  type Message,
} from '../../../src/index';
import './styles.css';

type SampleKey = 'repetitive' | 'fresh';

interface Sample {
  label: string;
  description: string;
  conversation: Message[];
  draft: string;
}

const SAMPLES: Record<SampleKey, Sample> = {
  repetitive: {
    label: 'Draft that should be blocked',
    description:
      'The mock agent generated the same reaction it already used twice.',
    conversation: [
      { role: 'user', content: 'Viewer A: That boss fight was close!' },
      { role: 'assistant', content: 'That was so exciting!' },
      { role: 'user', content: 'Viewer B: Your dodge was perfect!' },
      { role: 'assistant', content: 'That was so exciting!' },
      { role: 'user', content: 'Viewer C: The comeback was amazing!' },
    ],
    draft: 'That was so exciting!',
  },
  fresh: {
    label: 'Draft that can be sent',
    description: 'The mock agent generated a reply that adds a new direction.',
    conversation: [
      { role: 'user', content: 'Viewer A: What should we do next?' },
      {
        role: 'assistant',
        content: 'Let us choose between karaoke or a puzzle game.',
      },
      { role: 'user', content: 'Viewer B: Puzzle game sounds fun.' },
      {
        role: 'assistant',
        content: 'Good call. I will set up a short puzzle round after this.',
      },
      { role: 'user', content: 'Viewer C: Can you explain the rules first?' },
    ],
    draft:
      'Sure. I will explain the goal, controls, and win condition before we start.',
  },
};

const detector = new ManneriDetector({
  minMessageLength: 0,
  similarityThreshold: 0.7,
  interventionCooldown: 0,
  language: 'en',
});

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('App root not found');
}

let activeSample: SampleKey = 'repetitive';
let conversationText = formatConversation(SAMPLES[activeSample].conversation);
let draftText = SAMPLES[activeSample].draft;
let review: DraftReviewResult | null = null;
let sentMessage: string | null = null;
let generationNote = SAMPLES[activeSample].description;

function formatConversation(messages: Message[]): string {
  return messages
    .map((message) => `${message.role}: ${message.content}`)
    .join('\n');
}

function parseConversation(value: string): Message[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line): Message => {
      const [rolePart, ...contentParts] = line.split(':');
      const role = rolePart.trim();
      const content = contentParts.join(':').trim();

      if (
        role === 'system' ||
        role === 'user' ||
        role === 'assistant' ||
        role === 'tool'
      ) {
        return { role, content };
      }

      return { role: 'user', content: line };
    });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getConversationInput(): HTMLTextAreaElement {
  return document.querySelector<HTMLTextAreaElement>('#conversation')!;
}

function getDraftInput(): HTMLTextAreaElement {
  return document.querySelector<HTMLTextAreaElement>('#draft')!;
}

function renderToolResult(): string {
  if (!review) {
    return `
      <div class="empty-state">
        <strong>No tool call yet</strong>
        <span>Click the review button to simulate the agent gate.</span>
      </div>
    `;
  }

  const result = {
    shouldRewrite: review.shouldRewrite,
    reason: review.analysis.interventionReason,
    suggestion: review.suggestion?.content ?? null,
  };

  return `<pre>${escapeHtml(JSON.stringify(result, null, 2))}</pre>`;
}

function renderDecision(): string {
  if (!review) {
    return `
      <p class="decision-label waiting">Waiting</p>
      <h2>Send is locked</h2>
      <p>
        The app cannot post this draft yet. The agent must call
        <code>${REVIEW_DRAFT_REPETITION_TOOL.name}</code> first.
      </p>
      <button class="secondary" type="button" disabled>Send to chat</button>
    `;
  }

  if (review.shouldRewrite) {
    return `
      <p class="decision-label blocked">Blocked before send</p>
      <h2>Send remains locked</h2>
      <p>
        The tool found repetition. The agent should regenerate instead of
        posting this draft.
      </p>
      <div class="suggestion">
        ${escapeHtml(review.suggestion?.content ?? 'No suggestion returned.')}
      </div>
      <button class="primary danger" id="regenerate-button" type="button">
        Regenerate draft using suggestion
      </button>
    `;
  }

  return `
    <p class="decision-label allowed">Allowed to send</p>
    <h2>Send is unlocked</h2>
    <p>
      The draft does not repeat the recent conversation pattern, so the app can
      send it without another generation step.
    </p>
    <button class="primary" id="send-button" type="button">Send to chat</button>
  `;
}

function renderChatOutput(): string {
  if (!sentMessage) {
    return `
      <div class="chat-output empty">
        <strong>No message posted</strong>
        <span>The final chat output stays empty until the tool allows send.</span>
      </div>
    `;
  }

  return `
    <div class="chat-output posted">
      <strong>Posted to chat</strong>
      <span>${escapeHtml(sentMessage)}</span>
    </div>
  `;
}

function render(): void {
  const sample = SAMPLES[activeSample];
  const statusClass = review
    ? review.shouldRewrite
      ? 'blocked'
      : 'allowed'
    : 'waiting';

  app.innerHTML = `
    <section class="hero">
      <p class="eyebrow">Agent pre-send gate</p>
      <h1>Stop repetitive replies before they are posted</h1>
      <p class="lead">
        This sample shows where the new agent-facing feature runs: after a mock
        agent creates a draft, but before your app sends that draft to users.
      </p>
    </section>

    <section class="sample-switcher" aria-label="Sample selector">
      ${Object.entries(SAMPLES)
        .map(
          ([key, item]) => `
            <button
              class="${key === activeSample ? 'active' : ''}"
              data-sample="${key}"
              type="button"
            >
              ${item.label}
            </button>
          `
        )
        .join('')}
    </section>

    <section class="agent-flow">
      <div class="panel">
        <p class="step">1. Mock agent output</p>
        <h2>Generated draft</h2>
        <p class="hint">${escapeHtml(generationNote)}</p>
        <label>
          Recent conversation
          <textarea id="conversation" spellcheck="false">${escapeHtml(
            conversationText
          )}</textarea>
        </label>
        <label>
          Draft to send
          <textarea id="draft" spellcheck="false">${escapeHtml(draftText)}</textarea>
        </label>
      </div>

      <div class="panel tool-panel">
        <p class="step">2. Agent tool call</p>
        <h2>${REVIEW_DRAFT_REPETITION_TOOL.name}</h2>
        <p>
          This is the agent-facing step. The app calls the SDK-independent tool
          definition, then maps it to <code>reviewDraft(messages, draft)</code>.
        </p>
        <button class="primary" id="review-button" type="button">
          Call ${REVIEW_DRAFT_REPETITION_TOOL.name}
        </button>
        <div class="tool-result">
          ${renderToolResult()}
        </div>
      </div>

      <div class="panel decision-panel ${statusClass}">
        <p class="step">3. Send decision</p>
        ${renderDecision()}
      </div>
    </section>

    <section class="posted-panel">
      <h2>Final chat output</h2>
      ${renderChatOutput()}
    </section>

    <section class="why">
      <h2>What this lets users build</h2>
      <div>
        <span>Live AI characters can avoid repeating the same reaction.</span>
        <span>Chat apps can regenerate only the drafts that need it.</span>
        <span>Dashboards can show why a draft was blocked or allowed.</span>
      </div>
    </section>
  `;

  document
    .querySelectorAll<HTMLButtonElement>('[data-sample]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        activeSample = button.dataset.sample as SampleKey;
        conversationText = formatConversation(
          SAMPLES[activeSample].conversation
        );
        draftText = SAMPLES[activeSample].draft;
        review = null;
        sentMessage = null;
        generationNote = SAMPLES[activeSample].description;
        render();
      });
    });

  document
    .querySelector<HTMLButtonElement>('#review-button')
    ?.addEventListener('click', () => {
      conversationText = getConversationInput().value;
      draftText = getDraftInput().value;
      review = detector.reviewDraft(
        parseConversation(conversationText),
        draftText.trim()
      );
      sentMessage = null;
      render();
    });

  document
    .querySelector<HTMLButtonElement>('#regenerate-button')
    ?.addEventListener('click', () => {
      draftText =
        'That comeback was sharp. Let us replay the key dodge and then ask chat which strategy to try next.';
      generationNote =
        'The mock agent regenerated the draft after the tool blocked the repetitive one.';
      review = null;
      sentMessage = null;
      render();
    });

  document
    .querySelector<HTMLButtonElement>('#send-button')
    ?.addEventListener('click', () => {
      sentMessage = draftText.trim();
      render();
    });
}

render();
