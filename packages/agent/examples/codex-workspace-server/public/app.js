const messages = document.getElementById('messages');
const approvals = document.getElementById('approvals');
const eventLog = document.getElementById('eventLog');
const connectionBadge = document.getElementById('connectionBadge');
const turnBadge = document.getElementById('turnBadge');
const sandboxBadge = document.getElementById('sandboxBadge');
const sessionBadge = document.getElementById('sessionBadge');
const workspacePath = document.getElementById('workspacePath');
const runForm = document.getElementById('runForm');
const runButton = document.getElementById('runButton');
const interruptButton = document.getElementById('interruptButton');
const instruction = document.getElementById('instruction');

let streamingElement = null;
const pendingApprovals = new Map();

function clearEmpty(container) {
  const empty = container.querySelector('.empty');
  if (empty) empty.remove();
}

function appendMessage(kind, text) {
  clearEmpty(messages);
  const element = document.createElement('div');
  element.className = `msg ${kind}`;
  element.textContent = text;
  messages.appendChild(element);
  messages.scrollTop = messages.scrollHeight;
  return element;
}

function finishStreaming() {
  if (streamingElement) streamingElement.classList.remove('streaming');
  streamingElement = null;
}

function logEvent(type, summary) {
  const line = document.createElement('div');
  const time = new Date().toLocaleTimeString();
  line.innerHTML = `<span>${time}</span> <span class="type"></span> <span></span>`;
  line.children[1].textContent = type;
  line.children[2].textContent = summary ?? '';
  eventLog.appendChild(line);
  eventLog.scrollTop = eventLog.scrollHeight;
}

function renderApprovals() {
  approvals.innerHTML = '';
  if (pendingApprovals.size === 0) {
    approvals.innerHTML = '<p class="empty">No pending approvals.</p>';
    return;
  }
  for (const request of pendingApprovals.values()) {
    const card = document.createElement('div');
    card.className = 'approval';
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = `${request.toolId} (risk: ${request.risk})`;
    const reason = document.createElement('div');
    reason.textContent = request.reason ?? '';
    const args = document.createElement('pre');
    args.textContent = JSON.stringify(request.arguments, null, 2);
    const actions = document.createElement('div');
    actions.className = 'actions';
    for (const decision of ['allow-once', 'deny']) {
      const button = document.createElement('button');
      button.textContent = decision;
      if (decision === 'allow-once') button.className = 'primary';
      button.addEventListener('click', () => {
        void resolveApproval(request.id, decision);
      });
      actions.appendChild(button);
    }
    card.append(meta, reason, args, actions);
    approvals.appendChild(card);
  }
}

async function resolveApproval(requestId, decision) {
  try {
    const response = await fetch('/api/approvals', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ requestId, decision }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      appendMessage('error', body.error ?? 'Failed to resolve the approval.');
    }
  } catch (error) {
    appendMessage('error', `Failed to resolve the approval: ${error.message}`);
  }
}

function applyState(state) {
  turnBadge.textContent = state.turnActive ? 'running' : 'idle';
  turnBadge.classList.toggle('on', state.turnActive);
  runButton.disabled = state.turnActive;
  interruptButton.disabled = !state.turnActive;
  sandboxBadge.textContent = `sandbox: ${state.sandbox}`;
  const workspaceParts = state.workspaceDir.split(/[\\/]/).filter(Boolean);
  const workspaceName = workspaceParts.at(-1) ?? state.workspaceDir;
  workspacePath.textContent = `workspace: ${workspaceName}`;
  const sessionId = state.backendSessionId ?? 'none';
  const suffix = state.resumed ? ' (resumed)' : '';
  sessionBadge.textContent = `thread: ${sessionId.slice(0, 12)}${suffix}`;
  pendingApprovals.clear();
  for (const request of state.pendingApprovals ?? []) {
    pendingApprovals.set(request.id, request);
  }
  renderApprovals();
}

function handleAgentEvent(event) {
  switch (event.type) {
    case 'message.delta': {
      if (!streamingElement) {
        streamingElement = appendMessage('staff streaming', '');
      }
      streamingElement.textContent += event.text;
      messages.scrollTop = messages.scrollHeight;
      break;
    }
    case 'message.completed': {
      if (streamingElement) {
        const completedElement = streamingElement;
        finishStreaming();
        completedElement.textContent = event.text;
      } else {
        appendMessage('staff', event.text);
      }
      break;
    }
    case 'approval.requested': {
      pendingApprovals.set(event.request.id, event.request);
      renderApprovals();
      logEvent(event.type, event.request.toolId);
      return;
    }
    case 'approval.resolved': {
      pendingApprovals.delete(event.requestId);
      renderApprovals();
      logEvent(event.type, event.decision);
      return;
    }
    case 'artifact.created': {
      appendMessage(
        'staff',
        `[artifact] ${event.artifact.type}\n${JSON.stringify(event.artifact.data, null, 2)}`
      );
      break;
    }
    case 'turn.failed': {
      finishStreaming();
      appendMessage('error', event.error?.message ?? 'The Turn failed.');
      break;
    }
    case 'turn.interrupted': {
      finishStreaming();
      appendMessage('notice', 'The Turn was interrupted.');
      break;
    }
    case 'turn.completed': {
      finishStreaming();
      break;
    }
    default:
      break;
  }
  logEvent(event.type, event.turnId ?? '');
}

const source = new EventSource('/api/events');
source.onopen = () => {
  connectionBadge.textContent = 'connected';
  connectionBadge.classList.add('on');
};
source.onerror = () => {
  connectionBadge.textContent = 'reconnecting';
  connectionBadge.classList.remove('on');
};
source.onmessage = (message) => {
  const envelope = JSON.parse(message.data);
  if (envelope.kind === 'state') applyState(envelope.state);
  if (envelope.kind === 'agent-event') handleAgentEvent(envelope.event);
  if (envelope.kind === 'turn-error') appendMessage('error', envelope.message);
};

runForm.addEventListener('submit', (submitEvent) => {
  submitEvent.preventDefault();
  const text = instruction.value.trim();
  if (!text) return;
  appendMessage('user', text);
  instruction.value = '';
  void fetch('/api/run', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ instruction: text }),
  })
    .then(async (response) => {
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        appendMessage('error', body.error ?? 'Failed to start the Turn.');
      }
    })
    .catch((error) => {
      appendMessage('error', `Failed to start the Turn: ${error.message}`);
    });
});

interruptButton.addEventListener('click', () => {
  void fetch('/api/interrupt', { method: 'POST' })
    .then(async (response) => {
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        appendMessage('error', body.error ?? 'Interrupt failed.');
      }
    })
    .catch((error) => {
      appendMessage('error', `Interrupt failed: ${error.message}`);
    });
});
