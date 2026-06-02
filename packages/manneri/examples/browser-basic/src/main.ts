import {
  ManneriDetector,
  type AnalysisResult,
  type DiversificationPrompt,
  type Message,
} from '../../../src/index';
import './styles.css';

type PresetKey = 'repeated' | 'varied' | 'topicBias';
type UiLanguage = 'en' | 'ja';
type AnalysisFlowState = 'idle' | 'running' | 'complete';

const PRESETS: Record<UiLanguage, Record<PresetKey, string>> = {
  en: {
    repeated: `user: Viewer A: Can you sing the opening song again?
assistant: AITuber: Sure, I can sing the opening song again.
user: Viewer B: Can you sing the opening song again?
assistant: AITuber: Sure, I can sing the opening song again.
user: Viewer C: Can you sing the opening song again?
assistant: AITuber: Sure, I can sing the opening song again.`,
    varied: `user: Viewer A: First time here, your avatar is cute!
assistant: AITuber: Welcome! I am glad you joined the stream.
user: Viewer B: What game are you playing after this?
assistant: AITuber: I am planning a short puzzle game after the chat.
user: Viewer C: Can you read my fan art message?
assistant: AITuber: Of course. I will check fan art during the next break.`,
    topicBias: `user: Viewer A: Song stream requests are fun alpha
assistant: AITuber: Song stream requests help choose the next chorus beta
user: Viewer B: Song stream requests should include vocal range gamma
assistant: AITuber: Song stream requests are easier when I know the mood delta
user: Viewer C: Song stream requests keep coming from chat epsilon
assistant: AITuber: Song stream requests are useful, but I can also talk zeta
user: Viewer D: Song stream requests should focus on anime themes eta
assistant: AITuber: Song stream requests are noted for the set list theta
user: Viewer E: Song stream requests are all chat mentions now iota
assistant: AITuber: Song stream requests are filling most of the conversation kappa`,
  },
  ja: {
    repeated: `user: 視聴者A: もう一回オープニング曲を歌って！
assistant: AIチューバー: いいよ、もう一回オープニング曲を歌うね。
user: 視聴者B: もう一回オープニング曲を歌って！
assistant: AIチューバー: いいよ、もう一回オープニング曲を歌うね。
user: 視聴者C: もう一回オープニング曲を歌って！
assistant: AIチューバー: いいよ、もう一回オープニング曲を歌うね。`,
    varied: `user: 視聴者A: 初見です、アバターかわいい！
assistant: AIチューバー: いらっしゃい！配信に来てくれてうれしいです。
user: 視聴者B: このあと何のゲームをするの？
assistant: AIチューバー: このあと少しだけパズルゲームをする予定です。
user: 視聴者C: ファンアートのコメント読んでほしい！
assistant: AIチューバー: もちろんです。次の休憩でファンアートを見ますね。`,
    topicBias: `user: 視聴者A: 歌枠リクエストは盛り上がります alpha
assistant: AIチューバー: 歌枠リクエストで次のサビを決めやすいです beta
user: 視聴者B: 歌枠リクエストには声域も書くと良いです gamma
assistant: AIチューバー: 歌枠リクエストは曲の雰囲気が分かると助かります delta
user: 視聴者C: 歌枠リクエストがチャットで増えています epsilon
assistant: AIチューバー: 歌枠リクエストも良いけど雑談もできます zeta
user: 視聴者D: 歌枠リクエストはアニメ曲中心がいいです eta
assistant: AIチューバー: 歌枠リクエストはセットリストにメモします theta
user: 視聴者E: 歌枠リクエストばかりになっています iota
assistant: AIチューバー: 歌枠リクエストが会話の大半を占めています kappa`,
  },
};

const COPY = {
  en: {
    htmlLang: 'en',
    title: 'Conversation Pattern Detector',
    lead: 'Try repetitive conversation detection, topic bias checks, and contextual diversification prompts in a local browser UI.',
    conversationTitle: 'Conversation',
    conversationHint:
      'Use one message per line, formatted as <code>role: message</code>.',
    presets: {
      repeated: 'Repeated stream request',
      varied: 'Balanced stream chat',
      topicBias: 'Topic bias in chat',
    },
    advanced: 'Advanced settings',
    advancedHint:
      'These values are applied the next time you click Run analysis.',
    similarityThreshold: 'Similarity threshold',
    minMessageLength: 'Minimum message length',
    lookbackWindow: 'Lookback window',
    excludeKeywords: 'Exclude keywords',
    excludeKeywordsValue: 'ok, yes, no',
    runAnalysis: 'Run analysis',
    resetPreset: 'Reset preset',
    resultTitle: 'Result',
    resultHint: 'Analysis runs entirely in this browser session.',
    ready: 'Ready',
    analyzing: 'Analyzing...',
    analysisComplete: 'Analysis complete',
    intervention: 'Intervention suggested',
    noIntervention: 'No intervention',
    runSteps: [
      {
        title: 'Read messages',
        text: 'Parse roles and count the conversation turns.',
      },
      {
        title: 'Detect patterns',
        text: 'Compare nearby messages for repetitive phrasing.',
      },
      {
        title: 'Check topics',
        text: 'Estimate whether the conversation is stuck on one topic.',
      },
      {
        title: 'Prepare result',
        text: 'Generate an intervention prompt when thresholds are crossed.',
      },
    ],
    analysisDetails: 'Analysis details',
    summary: {
      messages: 'Messages',
      similarity: 'Similarity',
      patterns: 'Patterns',
      topics: 'Topics',
      analyses: 'Analyses',
      reason: 'Reason',
    },
    noPromptTitle: 'No prompt generated',
    noPromptText:
      'The current conversation does not cross an intervention threshold.',
    promptTitle: 'Suggested diversification prompt',
    promptMetaLabel: 'Suggestion type',
    promptTypeHint:
      'This shows why the library generated the suggested prompt.',
    promptTypes: {
      pattern_break: 'Break repeated flow',
      topic_change: 'Change topic',
      keyword_shift: 'Shift keywords',
    },
    priority: 'priority',
    priorities: {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
    },
    priorityHint:
      'Higher priority means the conversation is more likely to need an intervention.',
    topTopics: 'Top topics',
    noTopicData: 'No topic data.',
    detectedPatterns: 'Detected patterns',
    detectedPatternsHint:
      'These are repeated message contents or speaker orders found in the conversation.',
    noRepeatedPatterns: 'No repeated patterns.',
    patternExample: 'Example',
    patternFrequency: 'times found',
    patternTypes: {
      roleSequenceTitle: 'Repeated speaker order',
      roleSequenceText:
        'The same user/assistant turn order appeared multiple times.',
      repeatedUserTitle: 'Similar user message repeated',
      repeatedUserText: 'The user sent very similar wording in multiple turns.',
      repeatedAssistantTitle: 'Similar assistant response repeated',
      repeatedAssistantText:
        'The assistant answered with very similar wording in multiple turns.',
      repeatedToolTitle: 'Similar tool message repeated',
      repeatedToolText: 'A tool message with similar wording appeared again.',
      messagePairTitle: 'Repeated exchange',
      messagePairText:
        'The same pair of nearby messages appeared more than once.',
      messageFlowTitle: 'Repeated conversation flow',
      messageFlowText:
        'A longer sequence of nearby messages appeared more than once.',
    },
    roleLabels: {
      system: 'System',
      user: 'User',
      assistant: 'Assistant',
      tool: 'Tool',
    },
    analyzerStats: 'Analyzer stats',
    averageAnalysisTime: 'Average processing time',
    averageAnalysisTimeHint: 'Time spent for one analysis run in this browser.',
    cacheHitRate: 'Similarity cache reuse',
    cacheHitRateHint: 'How often previous similarity calculations were reused.',
    memoryUsage: 'Stored comparison entries',
    memoryUsageHint:
      'Internal similarity cache entries. This is not device memory usage.',
  },
  ja: {
    htmlLang: 'ja',
    title: '会話パターン検出サンプル',
    lead: '繰り返し検出、話題の偏り、会話を広げるプロンプト生成をブラウザ上で試せます。',
    conversationTitle: '会話',
    conversationHint:
      '1行に1メッセージを <code>role: message</code> の形式で入力します。',
    presets: {
      repeated: '配信リクエストの繰り返し',
      varied: '自然な配信チャット',
      topicBias: 'チャット話題の偏り',
    },
    advanced: '詳細設定',
    advancedHint: 'ここで変更した値は、次に分析を実行したときに反映されます。',
    similarityThreshold: '類似度の閾値',
    minMessageLength: '最小メッセージ長',
    lookbackWindow: '分析対象メッセージ数',
    excludeKeywords: '除外キーワード',
    excludeKeywordsValue: 'はい, いいえ, ok',
    runAnalysis: '分析を実行',
    resetPreset: 'プリセットに戻す',
    resultTitle: '結果',
    resultHint: '分析はこのブラウザ内で完結します。',
    ready: '準備完了',
    analyzing: '分析中...',
    analysisComplete: '分析完了',
    intervention: '介入を提案',
    noIntervention: '介入なし',
    runSteps: [
      {
        title: 'メッセージを読み取り',
        text: '発話者と会話ターン数を整理します。',
      },
      {
        title: 'パターンを検出',
        text: '近い発話同士を比較して繰り返しを探します。',
      },
      {
        title: '話題を確認',
        text: '会話が同じ話題に偏っていないか推定します。',
      },
      {
        title: '結果を準備',
        text: '閾値を超えた場合に介入プロンプトを生成します。',
      },
    ],
    analysisDetails: '分析詳細',
    summary: {
      messages: 'メッセージ数',
      similarity: '類似度',
      patterns: 'パターン数',
      topics: '話題数',
      analyses: '分析回数',
      reason: '理由',
    },
    noPromptTitle: 'プロンプトは生成されません',
    noPromptText: '現在の会話は介入閾値を超えていません。',
    promptTitle: '提案プロンプト',
    promptMetaLabel: '提案タイプ',
    promptTypeHint: 'ライブラリがこの提案プロンプトを生成した理由を表します。',
    promptTypes: {
      pattern_break: '会話の流れを変える提案',
      topic_change: '話題を変える提案',
      keyword_shift: 'キーワードをずらす提案',
    },
    priority: '優先度',
    priorities: {
      low: '低',
      medium: '中',
      high: '高',
    },
    priorityHint:
      '高いほど、会話に介入した方がよい可能性が高いことを表します。',
    topTopics: '上位トピック',
    noTopicData: 'トピック情報はありません。',
    detectedPatterns: '検出されたパターン',
    detectedPatternsHint:
      '会話内で繰り返された発話内容や、発話者の並びを分かりやすく表示しています。',
    noRepeatedPatterns: '繰り返しパターンはありません。',
    patternExample: '検出例',
    patternFrequency: '回検出',
    patternTypes: {
      roleSequenceTitle: '同じ発話順序の繰り返し',
      roleSequenceText:
        'ユーザー、アシスタントなどの発話順序が同じ形で複数回出ています。',
      repeatedUserTitle: '似たユーザー発話の繰り返し',
      repeatedUserText: 'ユーザーが近い内容の発話を複数回しています。',
      repeatedAssistantTitle: '似たアシスタント応答の繰り返し',
      repeatedAssistantText: 'アシスタントが近い内容の返答を複数回しています。',
      repeatedToolTitle: '似たツール出力の繰り返し',
      repeatedToolText: 'ツール由来の近い内容が複数回出ています。',
      messagePairTitle: '同じやり取りの繰り返し',
      messagePairText: '近い2つの発話の組み合わせが複数回出ています。',
      messageFlowTitle: '同じ会話の流れの繰り返し',
      messageFlowText: '近い複数の発話の流れが同じ形で複数回出ています。',
    },
    roleLabels: {
      system: 'システム',
      user: 'ユーザー',
      assistant: 'アシスタント',
      tool: 'ツール',
    },
    analyzerStats: '分析統計',
    averageAnalysisTime: '平均処理時間',
    averageAnalysisTimeHint:
      'このブラウザ内で1回の分析にかかった平均時間です。',
    cacheHitRate: '類似度計算の再利用率',
    cacheHitRateHint: '過去の類似度計算結果を再利用できた割合です。',
    memoryUsage: '保持中の比較データ',
    memoryUsageHint:
      '内部の類似度キャッシュ件数です。端末のメモリ使用量ではありません。',
  },
};

let uiLanguage: UiLanguage = 'en';
let analysisRunId = 0;

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('App root not found');
}

app.innerHTML = `
  <section class="app-shell">
    <header class="page-header">
      <div>
        <a class="eyebrow" href="https://www.npmjs.com/package/@aituber-onair/manneri" target="_blank" rel="noreferrer">
          @aituber-onair/manneri
        </a>
        <h1 id="pageTitle">Conversation Pattern Detector</h1>
        <p id="pageLead" class="lead">
          Try repetitive conversation detection, topic bias checks, and
          contextual diversification prompts in a local browser UI.
        </p>
      </div>
      <div class="header-actions">
        <select id="languageSelect" class="language-select" aria-label="Language">
          <option value="en">English</option>
          <option value="ja">日本語</option>
        </select>
      </div>
    </header>

    <section class="workspace">
      <section class="panel input-panel">
        <div class="panel-heading">
          <div>
            <h2 id="conversationTitle">Conversation</h2>
            <p id="conversationHint">Use one message per line, formatted as <code>role: message</code>.</p>
          </div>
          <select id="presetSelect" aria-label="Conversation preset">
            <option value="repeated">Repeated response</option>
            <option value="varied">Varied conversation</option>
            <option value="topicBias">Topic bias</option>
          </select>
        </div>

        <textarea id="conversationInput" spellcheck="false"></textarea>

        <details class="advanced">
          <summary id="advancedSummary">Advanced settings</summary>
          <p id="advancedHint" class="hint">
            These values are applied the next time you click Run analysis.
          </p>
          <div class="settings-grid">
            <label>
              <span id="similarityThresholdLabel">Similarity threshold</span>
              <input id="similarityThreshold" type="range" min="0.1" max="1" step="0.05" value="0.75" />
              <strong id="similarityValue">0.75</strong>
            </label>
            <label>
              <span id="minMessageLengthLabel">Minimum message length</span>
              <input id="minMessageLength" type="number" min="0" max="80" value="5" />
            </label>
            <label>
              <span id="lookbackWindowLabel">Lookback window</span>
              <input id="lookbackWindow" type="number" min="2" max="30" value="10" />
            </label>
            <label>
              <span id="excludeKeywordsLabel">Exclude keywords</span>
              <input id="excludeKeywords" type="text" value="ok, yes, no" />
            </label>
          </div>
        </details>

        <div class="actions">
          <button id="analyzeButton" type="button" class="primary">Run analysis</button>
          <button id="resetButton" type="button">Reset preset</button>
        </div>
      </section>

      <section id="resultPanel" class="panel result-panel" aria-live="polite">
        <div class="panel-heading">
          <div>
            <h2 id="resultTitle">Result</h2>
            <p id="resultHint">Analysis runs entirely in this browser session.</p>
          </div>
          <span id="statusBadge" class="status-badge">Ready</span>
        </div>

        <div id="analysisFlow" class="analysis-flow"></div>
        <div id="promptOutput" class="prompt-output"></div>
        <details class="analysis-details">
          <summary id="analysisDetailsSummary">Analysis details</summary>
          <div id="summary" class="summary-grid"></div>
          <div id="detailOutput" class="detail-output"></div>
        </details>
      </section>
    </section>
  </section>
`;

const presetSelect = getElement<HTMLSelectElement>('presetSelect');
const languageSelect = getElement<HTMLSelectElement>('languageSelect');
const conversationInput = getElement<HTMLTextAreaElement>('conversationInput');
const similarityThreshold = getElement<HTMLInputElement>('similarityThreshold');
const similarityValue = getElement<HTMLElement>('similarityValue');
const minMessageLength = getElement<HTMLInputElement>('minMessageLength');
const lookbackWindow = getElement<HTMLInputElement>('lookbackWindow');
const excludeKeywords = getElement<HTMLInputElement>('excludeKeywords');
const analyzeButton = getElement<HTMLButtonElement>('analyzeButton');
const resetButton = getElement<HTMLButtonElement>('resetButton');
const resultPanel = getElement<HTMLElement>('resultPanel');
const statusBadge = getElement<HTMLElement>('statusBadge');
const analysisFlow = getElement<HTMLElement>('analysisFlow');
const summary = getElement<HTMLElement>('summary');
const promptOutput = getElement<HTMLElement>('promptOutput');
const detailOutput = getElement<HTMLElement>('detailOutput');

presetSelect.addEventListener('change', () => {
  conversationInput.value =
    PRESETS[uiLanguage][presetSelect.value as PresetKey];
  runAnalysis();
});

languageSelect.addEventListener('change', () => {
  uiLanguage = languageSelect.value as UiLanguage;
  updateLocalizedText();
  conversationInput.value =
    PRESETS[uiLanguage][presetSelect.value as PresetKey];
  excludeKeywords.value = COPY[uiLanguage].excludeKeywordsValue;
  runAnalysis();
});

similarityThreshold.addEventListener('input', () => {
  similarityValue.textContent = Number(similarityThreshold.value).toFixed(2);
});

analyzeButton.addEventListener('click', runAnalysis);
resetButton.addEventListener('click', () => {
  conversationInput.value =
    PRESETS[uiLanguage][presetSelect.value as PresetKey];
  runAnalysis();
});

updateLocalizedText();
conversationInput.value = PRESETS[uiLanguage].repeated;
runAnalysis();

function runAnalysis(): void {
  const runId = ++analysisRunId;
  const copy = COPY[uiLanguage];

  renderRunningState(copy);

  window.setTimeout(() => {
    if (runId !== analysisRunId) {
      return;
    }

    const activeCopy = COPY[uiLanguage];
    const messages = parseMessages(conversationInput.value);
    const detector = new ManneriDetector({
      similarityThreshold: Number(similarityThreshold.value),
      repetitionLimit: 3,
      lookbackWindow: Number(lookbackWindow.value),
      interventionCooldown: 0,
      minMessageLength: Number(minMessageLength.value),
      excludeKeywords: parseKeywords(excludeKeywords.value),
      enableTopicTracking: true,
      enableKeywordAnalysis: true,
      debugMode: false,
      language: uiLanguage,
    });

    const analysis = detector.analyzeConversation(messages);
    const prompt = analysis.shouldIntervene
      ? detector.generateDiversificationPrompt(messages)
      : null;
    const stats = detector.getStatistics();

    renderStatus(analysis.shouldIntervene, activeCopy);
    renderSummary(
      messages,
      analysis,
      stats.analysisStats.totalAnalyses,
      activeCopy
    );
    renderPrompt(prompt, activeCopy);
    renderDetails(analysis, stats.analysisStats, activeCopy);
    renderCompleteState(activeCopy);
  }, 560);
}

function parseMessages(input: string): Message[] {
  return input
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line, index) => {
      const match = /^(system|user|assistant|tool)\s*:\s*(.+)$/i.exec(line);
      if (!match) {
        return {
          role: 'user',
          content: line,
          timestamp: index + 1,
        };
      }

      return {
        role: match[1].toLowerCase() as Message['role'],
        content: match[2],
        timestamp: index + 1,
      };
    });
}

function parseKeywords(input: string): string[] {
  return input
    .split(',')
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0);
}

function updateLocalizedText(): void {
  const copy = COPY[uiLanguage];
  const selectedPreset = presetSelect.value || 'repeated';
  document.documentElement.lang = copy.htmlLang;
  languageSelect.value = uiLanguage;

  getElement<HTMLElement>('pageTitle').textContent = copy.title;
  getElement<HTMLElement>('pageLead').textContent = copy.lead;
  getElement<HTMLElement>('conversationTitle').textContent =
    copy.conversationTitle;
  getElement<HTMLElement>('conversationHint').innerHTML = copy.conversationHint;
  getElement<HTMLElement>('advancedSummary').textContent = copy.advanced;
  getElement<HTMLElement>('advancedHint').textContent = copy.advancedHint;
  getElement<HTMLElement>('similarityThresholdLabel').textContent =
    copy.similarityThreshold;
  getElement<HTMLElement>('minMessageLengthLabel').textContent =
    copy.minMessageLength;
  getElement<HTMLElement>('lookbackWindowLabel').textContent =
    copy.lookbackWindow;
  getElement<HTMLElement>('excludeKeywordsLabel').textContent =
    copy.excludeKeywords;
  getElement<HTMLElement>('analyzeButton').textContent = copy.runAnalysis;
  getElement<HTMLElement>('resetButton').textContent = copy.resetPreset;
  getElement<HTMLElement>('resultTitle').textContent = copy.resultTitle;
  getElement<HTMLElement>('resultHint').textContent = copy.resultHint;
  getElement<HTMLElement>('analysisDetailsSummary').textContent =
    copy.analysisDetails;

  presetSelect.innerHTML = `
    <option value="repeated">${escapeHtml(copy.presets.repeated)}</option>
    <option value="varied">${escapeHtml(copy.presets.varied)}</option>
    <option value="topicBias">${escapeHtml(copy.presets.topicBias)}</option>
  `;
  presetSelect.value = selectedPreset;
}

function renderRunningState(copy: (typeof COPY)[UiLanguage]): void {
  resultPanel.setAttribute('aria-busy', 'true');
  resultPanel.classList.add('is-running');
  analyzeButton.disabled = true;
  resetButton.disabled = true;
  analyzeButton.textContent = copy.analyzing;
  statusBadge.textContent = copy.analyzing;
  statusBadge.className = 'status-badge status-running';
  renderAnalysisFlow('running', copy);
}

function renderCompleteState(copy: (typeof COPY)[UiLanguage]): void {
  resultPanel.setAttribute('aria-busy', 'false');
  resultPanel.classList.remove('is-running');
  analyzeButton.disabled = false;
  resetButton.disabled = false;
  analyzeButton.textContent = copy.runAnalysis;
  renderAnalysisFlow('complete', copy);
  markContentUpdated(summary, promptOutput, detailOutput);
}

function renderAnalysisFlow(
  state: AnalysisFlowState,
  copy: (typeof COPY)[UiLanguage]
): void {
  analysisFlow.className = `analysis-flow analysis-flow-${state}`;
  analysisFlow.innerHTML = copy.runSteps
    .map(
      (step, index) => `
        <div class="analysis-step">
          <span class="step-marker">${index + 1}</span>
          <span>
            <strong>${escapeHtml(step.title)}</strong>
            <small>${escapeHtml(step.text)}</small>
          </span>
        </div>
      `
    )
    .join('');
}

function markContentUpdated(...elements: HTMLElement[]): void {
  for (const element of elements) {
    element.classList.remove('content-updated');
    void element.offsetWidth;
    element.classList.add('content-updated');
  }
}

function renderStatus(
  shouldIntervene: boolean,
  copy: (typeof COPY)[UiLanguage]
): void {
  statusBadge.textContent = shouldIntervene
    ? copy.intervention
    : copy.noIntervention;
  statusBadge.className = shouldIntervene
    ? 'status-badge status-warning'
    : 'status-badge status-ok';
}

function renderSummary(
  messages: Message[],
  analysis: AnalysisResult,
  totalAnalyses: number,
  copy: (typeof COPY)[UiLanguage]
): void {
  summary.innerHTML = `
    ${summaryItem(copy.summary.messages, String(messages.length))}
    ${summaryItem(
      copy.summary.similarity,
      `${Math.round(analysis.similarity.score * 100)}%`
    )}
    ${summaryItem(copy.summary.patterns, String(analysis.patterns.length))}
    ${summaryItem(copy.summary.topics, String(analysis.topics.length))}
    ${summaryItem(copy.summary.analyses, String(totalAnalyses))}
    ${summaryItem(copy.summary.reason, escapeHtml(analysis.interventionReason))}
  `;
}

function renderPrompt(
  prompt: DiversificationPrompt | null,
  copy: (typeof COPY)[UiLanguage]
): void {
  if (!prompt) {
    promptOutput.innerHTML = `
      <div class="empty-state">
        <h3>${escapeHtml(copy.noPromptTitle)}</h3>
        <p>${escapeHtml(copy.noPromptText)}</p>
      </div>
    `;
    return;
  }

  promptOutput.innerHTML = `
    <article class="prompt-card">
      <div class="prompt-meta">
        <span>
          <strong>${escapeHtml(copy.promptMetaLabel)}</strong>
          ${escapeHtml(copy.promptTypes[prompt.type])}
        </span>
        <span>
          <strong>${escapeHtml(copy.priority)}</strong>
          ${escapeHtml(copy.priorities[prompt.priority])}
        </span>
      </div>
      <h3>${escapeHtml(copy.promptTitle)}</h3>
      <p>${escapeHtml(prompt.content)}</p>
      <div class="prompt-help">
        <span>${escapeHtml(copy.promptTypeHint)}</span>
        <span>${escapeHtml(copy.priorityHint)}</span>
      </div>
      <small>${escapeHtml(prompt.context)}</small>
    </article>
  `;
}

function renderDetails(
  analysis: AnalysisResult,
  stats: {
    totalAnalyses: number;
    averageAnalysisTime: number;
    cacheHitRate: number;
    memoryUsage: number;
  },
  copy: (typeof COPY)[UiLanguage]
): void {
  const topics = analysis.topics.slice(0, 5);
  const patterns = analysis.patterns.slice(0, 5);

  detailOutput.innerHTML = `
    <section class="detail-section">
      <h3>${escapeHtml(copy.topTopics)}</h3>
      ${
        topics.length > 0
          ? `<ul>${topics
              .map(
                (topic) => `
                  <li>
                    <span>${escapeHtml(topic.keywords.join(', '))}</span>
                    <strong>${Math.round(topic.confidence * 100)}%</strong>
                  </li>
                `
              )
              .join('')}</ul>`
          : `<p class="muted">${escapeHtml(copy.noTopicData)}</p>`
      }
    </section>

    <section class="detail-section">
      <h3>${escapeHtml(copy.detectedPatterns)}</h3>
      <p class="section-hint">${escapeHtml(copy.detectedPatternsHint)}</p>
      ${
        patterns.length > 0
          ? `<ul class="pattern-list">${patterns
              .map((pattern) => renderPatternItem(pattern, copy))
              .join('')}</ul>`
          : `<p class="muted">${escapeHtml(copy.noRepeatedPatterns)}</p>`
      }
    </section>

    <section class="detail-section">
      <h3>${escapeHtml(copy.analyzerStats)}</h3>
      <dl>
        <div>
          <dt>
            ${escapeHtml(copy.averageAnalysisTime)}
            <small>${escapeHtml(copy.averageAnalysisTimeHint)}</small>
          </dt>
          <dd>${formatDuration(stats.averageAnalysisTime)}</dd>
        </div>
        <div>
          <dt>
            ${escapeHtml(copy.cacheHitRate)}
            <small>${escapeHtml(copy.cacheHitRateHint)}</small>
          </dt>
          <dd>${Math.round(stats.cacheHitRate * 100)}%</dd>
        </div>
        <div>
          <dt>
            ${escapeHtml(copy.memoryUsage)}
            <small>${escapeHtml(copy.memoryUsageHint)}</small>
          </dt>
          <dd>${stats.memoryUsage}</dd>
        </div>
      </dl>
    </section>
  `;
}

function renderPatternItem(
  pattern: AnalysisResult['patterns'][number],
  copy: (typeof COPY)[UiLanguage]
): string {
  const description = describePattern(pattern, copy);

  return `
    <li class="pattern-item">
      <div class="pattern-heading">
        <span>
          <strong>${escapeHtml(description.title)}</strong>
          <small>${escapeHtml(description.text)}</small>
        </span>
        <em>${pattern.frequency} ${escapeHtml(copy.patternFrequency)}</em>
      </div>
      <p>
        <span>${escapeHtml(copy.patternExample)}</span>
        ${escapeHtml(description.example)}
      </p>
    </li>
  `;
}

function describePattern(
  pattern: AnalysisResult['patterns'][number],
  copy: (typeof COPY)[UiLanguage]
): {
  title: string;
  text: string;
  example: string;
} {
  const types = copy.patternTypes;

  if (pattern.pattern.startsWith('Role sequence:')) {
    return {
      title: types.roleSequenceTitle,
      text: types.roleSequenceText,
      example: formatRoleSequence(pattern, copy),
    };
  }

  if (pattern.pattern === 'Repeated user message') {
    return {
      title: types.repeatedUserTitle,
      text: types.repeatedUserText,
      example: formatMessageExample(pattern.messages, copy),
    };
  }

  if (pattern.pattern === 'Repeated assistant message') {
    return {
      title: types.repeatedAssistantTitle,
      text: types.repeatedAssistantText,
      example: formatMessageExample(pattern.messages, copy),
    };
  }

  if (pattern.pattern === 'Repeated tool message') {
    return {
      title: types.repeatedToolTitle,
      text: types.repeatedToolText,
      example: formatMessageExample(pattern.messages, copy),
    };
  }

  return {
    title:
      pattern.messages.length <= 2
        ? types.messagePairTitle
        : types.messageFlowTitle,
    text:
      pattern.messages.length <= 2
        ? types.messagePairText
        : types.messageFlowText,
    example: formatMessageExample(pattern.messages, copy),
  };
}

function formatRoleSequence(
  pattern: AnalysisResult['patterns'][number],
  copy: (typeof COPY)[UiLanguage]
): string {
  const sequence = pattern.pattern.replace('Role sequence: ', '').split('-');
  return sequence
    .map((role) => copy.roleLabels[role as Message['role']] || role)
    .join(' → ');
}

function formatMessageExample(
  messages: Message[],
  copy: (typeof COPY)[UiLanguage]
): string {
  return messages
    .map((message) => {
      const role = copy.roleLabels[message.role];
      return `${role}: ${message.content}`;
    })
    .join(' → ');
}

function formatDuration(milliseconds: number): string {
  if (milliseconds < 1) {
    return '< 1ms';
  }

  return `${milliseconds}ms`;
}

function summaryItem(label: string, value: string): string {
  return `
    <div class="summary-item">
      <span>${escapeHtml(label)}</span>
      <strong>${value}</strong>
    </div>
  `;
}

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Element not found: ${id}`);
  }
  return element as T;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
