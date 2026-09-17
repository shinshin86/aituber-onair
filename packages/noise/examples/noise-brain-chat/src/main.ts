import { textChangePercent } from './strongNoise';
import {
  ChatServiceFactory,
  type ChatProviderName,
  type ChatService,
} from '@aituber-onair/chat';
import {
  createContaminator,
  createNeuralReactionModel,
  createChatRewriteModel,
  type ChatMessage,
  type NeuralReactionTrace,
  type NoiseModulation,
  type NoiseModulatorInput,
} from '../../../src/index';
import type { Geometry, Reply, Request } from './protocol';
import { BrainView } from './brainView';
import './styles.css';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Missing app');
app.innerHTML = `
<header>
  <a class="brand" href="#"><span class="brandmark">n.</span> Noise <span class="brand-subtitle">AITuber OnAir</span></a>
  <div class="header-actions"><div class="app-status"><span class="status-dot"></span><span id="status" role="status">回路を準備中</span></div><button id="open-settings" class="secondary" aria-haspopup="dialog">設定</button></div>
</header>
<main>
<div class="workspace">
<section class="chat-panel" aria-labelledby="chat-title">
  <div class="panel-heading"><h1 id="chat-title">チャット</h1></div>
  <div id="chat-log" class="chat-log" role="log" aria-label="会話"><div class="empty"><p>「設定」でAIを選ぶと会話できます。</p><p>まずは「動きを試す」で脳の表示を確認できます。</p></div></div>
  <form id="chat-form"><label class="sr-only" for="message">メッセージ</label><textarea id="message" rows="2" placeholder="メッセージを入力…" maxlength="4000"></textarea><div class="composer-actions"><button id="demo" type="button" class="text-button" title="AIと通信せず、固定の例文で脳の動きを確認します">動きを試す</button><button id="send" type="submit" class="primary">送信</button></div></form>
  <p id="error" role="alert"></p>
</section>
<section class="brain-panel" aria-labelledby="brain-title">
  <div class="panel-heading"><h2 id="brain-title">仮想の脳</h2><span id="layout-label" class="muted">説明用の配置</span></div>
  <div class="canvas-wrap"><canvas id="brain" aria-label="ニューロンの活動表示。詳細は活動の詳細から確認できます"></canvas><div class="canvas-top"><span id="view-state">待機中</span><button id="reset-view" class="text-button">向きを戻す ↺</button></div><span class="canvas-hint">ドラッグで回転</span><div class="legend"><span><i class="quiet"></i>反応なし</span><span><i class="active"></i>反応あり</span><span><i class="readout"></i>読み出し</span></div></div>
  <div class="timeline"><button id="play" class="text-button" disabled>▶ 記録を再生</button><input id="frame" type="range" min="0" max="23" value="0" aria-label="活動フレーム" disabled/><span id="frame-label">記録なし</span><button id="total" class="text-button" disabled>合計</button></div>
  <details class="calculation-details"><summary>活動の詳細</summary>
    <p class="caption" id="trace-note">会話ごとの神経活動をゆっくり再生します。ピンクは返答の調整に使う神経です。</p>
    <div class="metrics"><div><span>神経細胞の数</span><strong id="neurons">—</strong></div><div><span>今回反応した細胞数</span><strong id="active-count">—</strong></div><div><span>計算にかかった時間</span><strong id="elapsed">—</strong></div><div><span>今回の発火率</span><strong id="scale">—</strong></div></div>

    <div id="active-list" class="active-list"><p class="muted">会話を送ると計算結果が記録されます。</p></div>
    <p class="caption" id="geometry-note">仮想の脳は、このサンプル用に作った回路です。</p>
  </details>
</section>
</div>
</main>
<dialog id="settings" aria-labelledby="settings-title">
  <div class="dialog-heading"><h2 id="settings-title">設定</h2><button id="close-settings" class="text-button" autofocus>閉じる</button></div>
  <div class="settings-grid">
<label>使う脳の種類<select id="backend"><option value="virtual">仮想の脳（すぐに試せます）</option><option value="malecns">ハエの脳の実データ（MaleCNS）</option></select></label>
<label id="manifest-field" hidden>ハエの脳データのURL<input id="manifest" value="/brain-data/manifest.json" /></label><button id="load" class="secondary">選んだ脳で会話を始め直す</button>
<label>AIサービス<select id="provider"></select></label>
<label id="model-field">AIモデル<select id="model"></select></label>
<label id="custom-model-field" hidden>接続先で使うモデル名（ID）<input id="custom-model" placeholder="接続先のモデルID" /></label>
<label id="endpoint-field" hidden>AIへの接続URL<input id="endpoint" placeholder="http://localhost:11434/v1/chat/completions" /></label>
<label id="key-field">APIキー<input id="key" type="password" autocomplete="off" placeholder="選んだAIサービスのAPIキーを貼り付け" aria-describedby="key-help" /></label>
<p id="key-help" class="settings-note">APIキーはAIサービスを利用するための認証情報です。この画面には保存されず、ページを再読み込みすると消えます。</p>
<p id="provider-note" class="settings-note"></p>
<label class="wide">キャラクター設定<textarea id="system" rows="2">あなたは少し気まぐれなAITuberです。日本語で短く返答します。話のつながりを大切にし、視聴者に親しみを持って接してください。</textarea></label>
<p id="data-help" class="settings-note" hidden>データを用意した人から案内された manifest.json のURLを入力してください。読み込み時に約207MBの配線データと、位置などの追加データを取得します。</p>
</div>
  <details class="advanced-settings"><summary>返答の調整</summary><div class="chat-options"><label>返答を変える強さ <input id="intensity" type="range" min="0" max="1" step="0.05" value="0.9"/><output id="intensity-value">0.90</output></label><label class="checkbox"><input id="force" type="checkbox" checked/>毎回、返答の変化を試す</label></div>
</details>
  <details class="advanced-settings"><summary>このサンプルについて</summary><p class="caption">コメントを刺激に変え、神経の反応からAIが返答を作り直します。元の返答の生成後に通常3回、再試行時は最大7回AIを呼び出します。「動きを試す」ではAIと通信せず、固定の例文を表示します。</p><p class="caption">会話と返答の生成指示は選んだAIサービスに送信します。APIキーは保存しません。脳の表示は簡略化したシミュレーションで、ハエが言葉を理解したことを示すものではありません。</p></details>
  <p id="settings-error" role="alert"></p>
</dialog>`;

function el<T extends HTMLElement>(id: string): T {
  const value = document.getElementById(id);
  if (!value) throw new Error(id);
  return value as T;
}
const settings = el<HTMLDialogElement>('settings');
el('open-settings').onclick = () => settings.showModal();
el('close-settings').onclick = () => settings.close();
const view = new BrainView(el('brain'));
el('backend').addEventListener('change', () => {
  const usesData = el<HTMLSelectElement>('backend').value === 'malecns';
  el('manifest-field').hidden = !usesData;
  el('data-help').hidden = !usesData;
});
const emptyChat = el('chat-log').innerHTML;
let worker: Worker;
let geometry: Geometry | undefined;
let current: Extract<Reply, { type: 'result' }> | undefined;
const recordings = new Map<number, Extract<Reply, { type: 'result' }>>();
let sessionDemo: boolean | undefined;
let nextId = 0;
let ready = false;
let busy = false;
let demoMode = false;
let messages: ChatMessage[] = [];
let timer: ReturnType<typeof setInterval> | undefined;
let pending:
  | {
      id: number;
      resolve(value: NoiseModulation): void;
      reject(error: Error): void;
      deadline: ReturnType<typeof setTimeout>;
    }
  | undefined;
let initDeadline: ReturnType<typeof setTimeout> | undefined;
const setStatus = (text: string) => {
  el('status').textContent = text;
};
const setError = (text: string) => {
  el('error').textContent = text;
  el('settings-error').textContent = text;
};
function setBusy(value: boolean) {
  busy = value;
  for (const id of [
    'send',
    'demo',
    'load',
    'backend',
    'manifest',
    'provider',
    'custom-model',
    'endpoint',
    'model',
    'key',
    'system',
    'force',
    'intensity',
  ]) {
    el<HTMLInputElement>(id).disabled =
      value || ((id === 'send' || id === 'demo') && !ready);
  }
}
function stopPlayback() {
  if (timer) clearInterval(timer);
  timer = undefined;
  el('play').textContent = '▶ 記録を再生';
}
function clearActivity(reason: string) {
  stopPlayback();
  current = undefined;
  if (geometry) view.setActivity(new Uint32Array(geometry.neuronCount));
  for (const id of ['play', 'frame', 'total'])
    el<HTMLInputElement>(id).disabled = true;
  el('view-state').textContent = reason;
  el('frame-label').textContent = '記録なし';
  for (const id of ['active-count', 'elapsed', 'scale'])
    el(id).textContent = '—';
  el('active-list').textContent = reason;
}
function failWorker(message: string) {
  ready = false;
  worker?.terminate();
  clearTimeout(initDeadline);
  if (pending) {
    clearTimeout(pending.deadline);
    pending.reject(new Error(message));
    pending = undefined;
  }
  setStatus('脳を再読み込みしてください');
  setError(message);
  setBusy(busy && Boolean(geometry));
}
function initialize() {
  let manifestUrl: string;
  try {
    manifestUrl = new URL(el<HTMLInputElement>('manifest').value, location.href)
      .href;
  } catch {
    setError('ハエの脳データのURLを確認してください。');
    return;
  }
  view.clear();
  recordings.clear();
  sessionDemo = undefined;
  worker?.terminate();
  clearTimeout(initDeadline);
  ready = false;
  messages = [];
  geometry = undefined;
  clearActivity('読み込み中');
  el('chat-log').innerHTML = emptyChat;
  setError('');
  setBusy(true);
  setStatus('脳のデータを読み込み中…');
  worker = new Worker(new URL('./brain.worker.ts', import.meta.url), {
    type: 'module',
  });
  worker.onerror = () =>
    failWorker(
      '脳の読み込みか計算に失敗しました。データのURLを確認して、もう一度読み込んでください。'
    );
  initDeadline = setTimeout(
    () =>
      failWorker(
        '読み込みが120秒を超えました。配置先と接続を確認してください。'
      ),
    120_000
  );
  worker.onmessage = ({ data }: MessageEvent<Reply>) => {
    if (data.type === 'ready') {
      clearTimeout(initDeadline);
      geometry = data.geometry;
      view.setGeometry(geometry);
      ready = true;
      el('neurons').textContent = geometry.neuronCount.toLocaleString();
      el('brain-title').textContent =
        geometry.provider === 'virtual' ? '仮想の脳' : 'ハエの脳（MaleCNS）';
      el('layout-label').textContent =
        geometry.provider === 'virtual'
          ? '点の配置は説明用です'
          : '実データの位置を表示 · 神経の枝は省略';
      el('geometry-note').textContent =
        geometry.provider === 'virtual'
          ? '仮想の脳では、神経細胞の番号と位置をこのサンプル用に作っています。実際のハエの脳の形ではありません。'
          : `全${geometry.neuronCount.toLocaleString()}個のうち、位置が分かる${view.positionedCount.toLocaleString()}個が表示対象です。位置が分かる細胞のうち、反応したものはすべて表示します。反応していない細胞は一部を省略します。位置が不明でも、反応が多い順に8個まで「活動の詳細」に表示します。出典: MaleCNS / CC BY 4.0。`;
      clearActivity('待機中 · 会話を送ってください');
      contaminator = makeContaminator();
      setBusy(false);
      setStatus('準備完了');
    } else if (data.type === 'result' && pending?.id === data.id) {
      clearTimeout(pending.deadline);
      const resolve = pending.resolve;
      pending = undefined;
      current = data;
      renderActivity();
      resolve(data.modulation);
    } else if (data.type === 'error') {
      if (pending && data.id === pending.id) {
        clearTimeout(pending.deadline);
        pending.reject(new Error(data.message));
        pending = undefined;
        setError(data.message);
      } else if (data.id === undefined) failWorker(data.message);
    }
  };
  const request: Request = {
    type: 'init',
    backend: el<HTMLSelectElement>('backend').value as 'virtual' | 'malecns',
    manifestUrl,
  };
  worker.postMessage(request);
}
const modulator = {
  modulate(input: NoiseModulatorInput) {
    return new Promise<NoiseModulation>((resolve, reject) => {
      if (!ready) return reject(new Error('脳が利用できません。'));
      const id = ++nextId;
      pending = {
        id,
        resolve,
        reject,
        deadline: setTimeout(
          () =>
            failWorker(
              '脳の計算に時間がかかりすぎています。脳を読み込み直してください。'
            ),
          10_000
        ),
      };
      worker.postMessage({ type: 'run', id, input } satisfies Request);
    });
  },
};
function providerLabel(provider: string): string {
  const names: Record<string, string> = {
    openai: 'OpenAI',
    claude: 'Claude',
    gemini: 'Gemini',
    'gemini-nano': 'Gemini Nano（ブラウザ内のAI）',
    'openai-compatible': '自分で用意したAI（OpenAI互換）',
    openrouter: 'OpenRouter',
    zai: 'Z.ai',
    xai: 'xAI',
    kimi: 'Kimi',
    deepseek: 'DeepSeek',
    mistral: 'Mistral',
    sakana: 'Sakana',
    plamo: 'PLaMo',
  };
  return names[provider] ?? provider;
}
let chatService: ChatService | undefined;
const providerSelect = el<HTMLSelectElement>('provider');
for (const provider of ChatServiceFactory.getAvailableProviders()) {
  providerSelect.add(new Option(providerLabel(provider), provider));
}
function updateModels() {
  const provider = providerSelect.value;
  const models = ChatServiceFactory.getSupportedModels(provider);
  const select = el<HTMLSelectElement>('model');
  select.replaceChildren(...models.map((model) => new Option(model, model)));
  const defaultModel =
    ChatServiceFactory.getProviderCapabilities(provider)?.defaultModel;
  if (defaultModel && models.includes(defaultModel))
    select.value = defaultModel;
  const custom = provider === 'openai-compatible' || models.length === 0;
  el('model-field').hidden = custom;
  el('custom-model-field').hidden = !custom;
  el('endpoint-field').hidden = provider !== 'openai-compatible';
  el('key-field').hidden = provider === 'gemini-nano';
  el('key-help').hidden = provider === 'gemini-nano';
  el('provider-note').textContent =
    provider === 'gemini-nano'
      ? 'Gemini Nanoは対応ブラウザの組み込みAIを使います。ブラウザ側の準備が必要です。'
      : provider === 'openai-compatible'
        ? 'モデル名と接続URLは、AIサーバーの設定を確認するか、用意した人に聞いてください。URLは /chat/completions まで含めます。APIキーは接続先で必要な場合のみ入力します。'
        : 'AIサービスを選び、続いてモデルを選択してください。そのサービスで発行したAPIキーを入力すると会話できます。';
}
updateModels();
function resetChatConnection() {
  chatService = undefined;
  messages = [];
  if (ready) worker.postMessage({ type: 'reset' } satisfies Request);
  contaminator = makeContaminator();
  if (sessionDemo !== undefined) {
    el('chat-log').append(
      bubble(
        'AIの設定を変更したため、新しい会話を開始します。',
        'response-meta'
      )
    );
  }
  sessionDemo = undefined;
}
providerSelect.addEventListener('change', () => {
  el<HTMLInputElement>('key').value = '';
  el<HTMLInputElement>('custom-model').value = '';
  updateModels();
  resetChatConnection();
});
for (const id of ['model', 'custom-model', 'endpoint', 'key', 'system']) {
  el(id).addEventListener('change', resetChatConnection);
}
function connectChat(): ChatService {
  const provider = providerSelect.value as ChatProviderName;
  const model = el<HTMLInputElement>(
    el('custom-model-field').hidden ? 'model' : 'custom-model'
  ).value.trim();
  const apiKey = el<HTMLInputElement>('key').value.trim();
  if (!model) throw new Error('モデルを設定してください。');
  if (provider === 'openai-compatible') {
    const endpoint = el<HTMLInputElement>('endpoint').value.trim();
    let url: URL;
    try {
      url = new URL(endpoint);
    } catch {
      throw new Error('AIへの接続URLを設定してください。');
    }
    if (!['http:', 'https:'].includes(url.protocol))
      throw new Error('HTTPまたはHTTPSのURLを指定してください。');
    return ChatServiceFactory.createChatService(provider, {
      model,
      endpoint,
      apiKey: apiKey || undefined,
    });
  }
  if (provider === 'gemini-nano')
    return ChatServiceFactory.createChatService(provider, { model });
  if (!apiKey) throw new Error('選んだAIサービスのAPIキーを設定してください。');
  return ChatServiceFactory.createChatService(provider, { model, apiKey });
}
async function withDeadline<T>(request: Promise<T>): Promise<T> {
  let deadline: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      request,
      new Promise<never>((_, reject) => {
        deadline = setTimeout(
          () =>
            reject(
              new Error(
                'AIの応答が60秒を超えました。接続先を確認してください。'
              )
            ),
          60_000
        );
      }),
    ]);
  } finally {
    clearTimeout(deadline);
  }
}
async function completion(history: ChatMessage[]): Promise<string> {
  if (!chatService)
    throw new Error('AIがまだ設定されていません。「設定」を確認してください。');
  const result = await withDeadline(
    chatService.chatOnce(history, false, () => undefined)
  );
  const text = result.blocks
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();
  if (!text) throw new Error('APIからテキストの返答がありませんでした。');
  if (text.length > 10000)
    throw new Error('返答が長すぎます。短い返答を指定してください。');
  return text;
}
let reactionTrace: NeuralReactionTrace | undefined;
let adapterEpoch = 0;
function currentReactionTrace(): NeuralReactionTrace | undefined {
  return reactionTrace;
}
function makeContaminator() {
  const epoch = ++adapterEpoch;
  const model = createNeuralReactionModel({
    brain: modulator,
    onTrace: (trace) => {
      if (epoch === adapterEpoch) reactionTrace = trace;
    },
    model: {
      async generate(input) {
        if (demoMode) {
          if (input.system.startsWith('Independently'))
            return JSON.stringify({
              grounded: true,
              natural: true,
              reactionChanged: true,
              stateAligned: true,
            });
          if (input.system.startsWith('Classify'))
            return JSON.stringify({
              stimulus: [0.5, 0.2, 0.8, 0.5, 0.4, 0],
              facts: [JSON.parse(input.prompt).draft],
              baselineAct: 'fixture',
            });
          if (input.system.startsWith('Audit'))
            return JSON.stringify({
              reviews: [
                {
                  grounded: true,
                  unsupportedClaims: [],
                  missingFacts: [],
                  reaction: true,
                  state: true,
                  persona: true,
                  natural: true,
                  intervention: JSON.parse(input.prompt)
                    .licensedInterventions[0].kind,
                },
              ],
            });
          const text =
            'みんなのおかげで、とても楽しい配信になりました。今日はありがとう。次回も楽しみにしていてね。';
          return JSON.stringify({ candidates: [{ text }, { text }] });
        }
        if (!chatService) throw new Error('AIが未設定です。');
        setStatus(
          input.system.startsWith('Classify')
            ? 'コメントを脳への刺激に変えています…'
            : input.system.startsWith('Audit') ||
                input.system.startsWith('Independently')
              ? '話のつながりとキャラクターらしさを確認しています…'
              : '神経の反応から返答を作っています…'
        );
        return withDeadline(
          createChatRewriteModel({ service: chatService }).generate(input)
        );
      },
    },
  });
  return createContaminator({
    model,
    mode: 'chaotic',
    relationshipCapital: 0.8,
    fallbackToDraftOnQualityFail: true,
    quality: { minLengthRatio: 0.8, maxLengthRatio: 1.1 },
    modelTimeoutMs: 450_000,
  });
}
let contaminator = makeContaminator();
function bubble(text: string, className: string) {
  const item = document.createElement('div');
  item.className = className;
  item.textContent = text;
  return item;
}
async function send(demo: boolean) {
  if (busy || !ready) return;
  const text =
    el<HTMLTextAreaElement>('message').value.trim() ||
    (demo ? '今日も無難なコメントだね。' : '');
  if (!text) return;
  setError('');
  if (!demo) {
    try {
      chatService = connectChat();
    } catch (error) {
      settings.showModal();
      setError(
        error instanceof Error ? error.message : 'AIの設定を確認してください。'
      );
      return;
    }
  }
  setBusy(true);
  demoMode = demo;
  if (sessionDemo !== undefined && sessionDemo !== demo) {
    messages = [];
    contaminator = makeContaminator();
    worker.postMessage({ type: 'reset' } satisfies Request);
    el('chat-log').append(
      bubble(
        '接続モードを切り替えたため、新しい会話を開始します。',
        'response-meta'
      )
    );
  }
  sessionDemo = demo;
  reactionTrace = undefined;
  clearActivity('返答を準備しています');
  const log = el('chat-log');
  log.querySelector('.empty')?.remove();
  log.append(bubble(text, 'user-bubble'));
  el<HTMLTextAreaElement>('message').value = '';
  const history: ChatMessage[] = [...messages, { role: 'user', content: text }];
  const systemPrompt = el<HTMLTextAreaElement>('system').value;
  try {
    setStatus(
      demo ? '例文を使って、脳の動きを計算中…' : 'AIが返答を生成しています…'
    );
    const draft = demo
      ? '今日は来てくれてありがとう。みんなのおかげでとても楽しい配信になりました。次回も楽しみにしていてね。'
      : await completion([
          { role: 'system', content: systemPrompt },
          ...history,
        ]);
    const output = await contaminator.contaminate({
      systemPrompt,
      messages: history,
      draft,
      intensity: Number(el<HTMLInputElement>('intensity').value),
      forceTilt: el<HTMLInputElement>('force').checked,
    });
    const turn = document.createElement('article');
    turn.className = 'response-card';
    turn.append(
      bubble(
        demo ? 'お試しの例文（AIとの通信なし）' : 'AIの返答',
        'response-label'
      )
    );
    turn.append(bubble(output.text, 'response-text'));
    const metrics = document.createElement('div');
    metrics.className = 'result-metrics';

    metrics.append(
      bubble(
        `最初の返答からの文字変化率 ${textChangePercent(draft, output.text)}%`,
        'record-heading'
      )
    );
    metrics.append(
      bubble(
        '文字の追加・削除・置換の割合です。面白さや意外さ、神経回路だけの効果を測る数値ではありません。',
        'caption'
      )
    );
    const acceptedTrace = currentReactionTrace();
    if (acceptedTrace && !output.skipped && output.rewriteTrace?.length) {
      const { attention, facts } = acceptedTrace;
      const describeFocus = (phase: typeof attention.opening) =>
        phase.contrast >= 0.12 ? facts[phase.focus] : '偏りは小さめ';
      metrics.append(
        bubble(
          `注意の向き：${describeFocus(attention.opening)} → ${describeFocus(attention.settling)}`,
          'record-heading'
        )
      );
      metrics.append(
        bubble(
          '発火から計算した内容への重みです。この狙いが文章に表れているかは、元の返答と比べて確認してください。',
          'caption'
        )
      );
    }
    metrics.append(
      bubble(
        `文字数：${Array.from(draft).length} → ${Array.from(output.text).length}文字`,
        'record-heading'
      )
    );
    const detail = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = '返答の詳細';
    detail.append(
      summary,
      bubble('元の返答', 'record-heading'),
      bubble(draft, 'draft'),
      metrics
    );
    turn.append(detail);
    const note = output.skipped
      ? `書き換えなし: ${skipLabel(output.skipped.reason)}`
      : output.text === draft
        ? '返答は書き換える前と同じです'
        : demo
          ? '固定の例文で接続を確認しました。文章品質の評価ではありません。'
          : '神経の反応から返答を作りました';
    detail.append(bubble(note, 'response-meta'));
    detail.append(
      bubble(
        current
          ? output.skipped
            ? '脳の反応は計算しましたが、返答は原文に戻しました'
            : demo
              ? '図は計算結果、返答は用意済みの例文です'
              : '今回の神経活動を返答の生成に使いました'
          : '今回の返答には脳の反応を使っていません',
        'response-meta'
      )
    );
    if (current) {
      recordings.set(current.id, current);
      const replay = document.createElement('button');
      replay.className = 'secondary replay-turn';
      replay.dataset.record = String(current.id);
      replay.textContent = 'この返答の活動を見る';
      detail.append(replay);
      if (recordings.size > 6) {
        const oldest = recordings.keys().next().value;
        if (oldest !== undefined) {
          recordings.delete(oldest);
          const oldButton = document.querySelector<HTMLButtonElement>(
            `[data-record="${oldest}"]`
          );
          if (oldButton) {
            oldButton.disabled = true;
            oldButton.textContent = 'この記録は削除済みです（最新6件を保存）';
          }
        }
      }
    }
    log.append(turn);
    log.scrollTop +=
      turn.getBoundingClientRect().top - log.getBoundingClientRect().top;
    if (!current)
      clearActivity(
        output.skipped
          ? `脳の反応による調整なし: ${skipLabel(output.skipped.reason)}`
          : '脳の計算に失敗したため、脳の反応を使わずに返答しました'
      );
    messages = [
      ...history,
      { role: 'assistant' as const, content: output.text },
    ].slice(-20);
    setStatus(
      demo
        ? 'お試し完了 · 用意済みの例文を表示しています'
        : '返答しました · 今回の神経の動きを表示中'
    );
  } catch (error) {
    setError(error instanceof Error ? error.message : '通信に失敗しました。');
    setStatus('送信失敗 · 再試行できます');
  } finally {
    setBusy(false);
  }
}
function interventionLabel(kind: string): string {
  return (
    (
      {
        ground_in_recent_comment: '最近のコメントに触れる',
        add_streamer_judgment: '配信者としての考えを加える',
        soft_disagreement: 'やわらかく異論を伝える',
        contrarian_reframe: '別の見方を示す',
        self_repair: '自分の言い方を言い直す',
        unfinished_margin: '話の続きを残す',
        reduce_over_apology: '謝りすぎを抑える',
        reduce_over_agreement: '同意しすぎを抑える',
        increase_specificity: '具体的な内容を加える',
        acknowledge_tension: '気まずさにも触れる',
        break_clean_closing: 'きれいに締めすぎない',
        callback: '前の話題に触れる',
        dispreferred_shape: '予想どおりでない返し方をする',
        boke_bait: 'ツッコミの余地を作る',
        tsukkomi: 'ツッコミを入れる',
        withheld_uptake: 'すぐに話に乗らず間を置く',
        status_seesaw: '会話の主導権に変化をつける',
        response_length_violation: '返答の長さを変える',
      } as Record<string, string>
    )[kind] ?? '返答の言い方を調整'
  );
}
function skipLabel(reason: string) {
  return (
    (
      {
        sincerity: '深刻な相談',
        cooldown: '変化を続けすぎないため、今回は休みます',
        platform: '今回は普段どおりの返答を使います',
        repair: '会話の流れを整える返答を優先します',
        low_predictability: 'すでに変化のある返答です',
        quality_fail: '書き換えた返答が品質の基準を満たしませんでした',
        model_error: 'AIによる書き換えに失敗しました',
        neural_unavailable: '脳の反応を取得できませんでした',
        neural_inactive: '今回の反応と強さでは、返答を変えませんでした',
        neural_unfocused: '内容への注意の偏りが小さいため、原文を保ちました',
        unsplittable: '今回の短い返答は、そのまま使います',
        no_licensed_intervention:
          '今回の会話に合う変え方が見つかりませんでした',
      } as Record<string, string>
    )[reason] || '今回は書き換えを見送りました'
  );
}
function cellType(value: string): string {
  const names: Record<string, string> = {
    input: '入力を受け取る細胞',
    readout: '返答の調整に使う細胞',
    internal: '回路内の細胞',
    reservoir: '回路内の細胞',
  };
  if (value.startsWith('channel-'))
    return `入力グループ${Number(value.slice(8)) + 1}`;
  return names[value] ?? value;
}
function renderActivity() {
  if (!current || !geometry) return;
  const active: number[] = [];
  for (let i = 0; i < current.counts.length; i++)
    if (current.counts[i]) active.push(i);
  active.sort((a, b) => (current?.counts[b] ?? 0) - (current?.counts[a] ?? 0));
  el('active-count').textContent = active.length.toLocaleString();
  el('elapsed').textContent = `${current.elapsedMs.toFixed(1)} ms`;
  el('scale').textContent =
    `${((current.modulation.brainState?.globalActivity ?? 0) * 100).toFixed(1)}%`;
  el('active-list').replaceChildren();
  for (const i of active.slice(0, 8)) {
    const row = document.createElement('div');
    row.className = 'activity-record';
    const xyz = geometry.positions.subarray(i * 3, i * 3 + 3);
    const position = xyz.every(Number.isFinite)
      ? `位置: ${Array.from(xyz, (v) => v.toFixed(1)).join(', ')}`
      : '位置のデータなし';
    row.append(
      bubble(
        `番号 ${geometry.ids[i]} · ${current.counts[i]}回反応`,
        'record-heading'
      ),
      bubble(
        `${cellType(geometry.types[i])} / ${cellType(geometry.groups[i])} · ${position}`,
        'caption'
      )
    );
    el('active-list').append(row);
  }
  if (!active.length)
    el('active-list').textContent = '反応した神経細胞はありませんでした。';
  el<HTMLInputElement>('frame').max = String(
    Math.max(0, current.trace.frames.length - 1)
  );
  for (const id of ['play', 'frame', 'total'])
    el<HTMLInputElement>(id).disabled = false;
  el('trace-note').textContent =
    '反応した順番をゆっくり再生しています。ピンクは返答の調整に使う神経、緑はそれ以外の神経です。「合計」で今回の反応をまとめて確認できます。発火率は、短い計算区間ごとに信号を出した細胞の割合の平均です。';
  startPlayback();
}
function showFrame(index: number) {
  if (!current) return;
  view.setActivity(current.counts, current.trace.frames[index]);
  el<HTMLInputElement>('frame').value = String(index);
  el('frame-label').textContent =
    `${index + 1} / ${current.trace.frames.length}`;
  el('view-state').textContent =
    `活動記録 #${current.id} · フレーム ${index + 1}`;
}
function showTotal() {
  stopPlayback();
  if (!current) return;
  view.setActivity(current.counts);
  el('frame-label').textContent = '合計';
  el('view-state').textContent = `活動記録 #${current.id} · 反応した回数の合計`;
}
function startPlayback() {
  if (!current?.trace.frames.length) return;
  stopPlayback();
  let frame = 0;
  showFrame(frame);
  el('play').textContent = 'Ⅱ 再生を停止';
  timer = setInterval(() => {
    frame++;
    if (!current || frame >= current.trace.frames.length) showTotal();
    else showFrame(frame);
  }, 140);
}
el('load').onclick = () => {
  initialize();
  settings.close();
};
el('reset-view').onclick = () => view.resetView();
el('demo').onclick = () => {
  void send(true);
};
el('chat-form').onsubmit = (e) => {
  e.preventDefault();
  void send(false);
};
el('play').onclick = () => {
  if (timer) stopPlayback();
  else startPlayback();
};
el('total').onclick = showTotal;
el('frame').oninput = () => {
  stopPlayback();
  showFrame(Number(el<HTMLInputElement>('frame').value));
};
el('intensity').oninput = () => {
  el('intensity-value').textContent = Number(
    el<HTMLInputElement>('intensity').value
  ).toFixed(2);
};
el('chat-log').onclick = (event) => {
  const replay = (event.target as HTMLElement).closest<HTMLButtonElement>(
    '[data-record]'
  );
  if (replay && !busy) {
    const record = recordings.get(Number(replay.dataset.record));
    if (record) {
      current = record;
      renderActivity();
      el('brain-title').scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }
};
window.addEventListener('beforeunload', () => {
  worker?.terminate();
  stopPlayback();
});
initialize();
