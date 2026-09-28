import type {
  CommentIntelligenceResult,
  CommentResponsePlan,
  SafetyCategory,
  JevChoiceAnswer,
  JevCommentDecision,
} from '../../../src/index';

type Options = {
  language: 'en' | 'ja';
  engine: 'rules' | 'openai' | 'jev';
  decisions: JevCommentDecision[];
  formatCategory: (category: SafetyCategory) => string;
};

const COPY = {
  en: {
    selected: 'Selected',
    blocked: 'Excluded',
    skipped: 'Not selected',
    score: 'Ranking score',
    topicRelated: 'On topic?',
    question: 'Requests an answer?',
    alreadyAnswered: 'Already answered?',
    yes: 'Yes',
    no: 'No',
    uncertain: 'Uncertain',
    notEvaluated: 'Not evaluated',
    confidence: 'Confidence',
    retained: 'Rule signal retained',
    empty: 'No comments to compare.',
    lead: 'Compare every candidate with the final selection. Scores belong to the package ranking, not model confidence. Confidence is not a measured accuracy rate.',
    jev: 'The three judgments below are Jev outputs. Uncertain or low-confidence judgments keep the rule signal. “Not evaluated” includes missing context, excluded comments, input limits, and API failures. Topic filtering settings still determine whether topic judgments affect ranking.',
    openai:
      'OpenAI selects comment IDs directly, so its choice may differ from score order. It does not return the three Jev judgments.',
    rules: 'This run used rules. No Jev judgments were used.',
    plan: 'Response plan (does not affect ranking)',
    excluded:
      'Excluded by the rule-based safety check before any AI analysis. This comment was not sent to the AI.',
    judgments: 'AI judgments',
    responseDepth: 'Reply style',
    depths: {
      one_liner: 'One line',
      quick: 'Short and casual',
      thoughtful: 'Think it through',
    },
    noDepth: 'No suggestion (low confidence)',
    reasoningEffort: 'Suggested reasoning effort',
    hostile: 'Rude (needs attention)',
    pointsOutError: 'Points out an error',
    needsModerator: 'Safety risk',
    probability: 'Probability',
    badges: {
      notify: 'Moderator alert',
      error: 'Points out an error',
      attention: 'Needs attention',
    },
    reasons: 'Ranking signals',
    signals: {
      direct_question: 'Question',
      topic_related: 'On topic',
      topic_unrelated: 'Off topic',
      answered_in_context: 'Prior answer: lower priority',
      ignored_recently: 'Previously answered',
      unsafe: 'Unsafe input',
      blocked_viewer: 'Blocked viewer',
      new_viewer: 'New viewer',
      returning_viewer: 'Returning viewer',
      topic_change_candidate: 'Topic change',
      high_engagement: 'High engagement',
      easy_to_answer: 'Easy to answer',
      super_chat: 'Super chat',
      moderator: 'Moderator',
      duplicate: 'Duplicate',
      spam_like: 'Spam-like',
      fresh: 'Recent',
    },
  },
  ja: {
    selected: '選択',
    blocked: '除外',
    skipped: '未選択',
    score: 'ランキングスコア',
    topicRelated: '話題に関連？',
    question: '回答を求めている？',
    alreadyAnswered: '回答済み？',
    yes: 'はい',
    no: 'いいえ',
    uncertain: '判断保留',
    notEvaluated: '未評価',
    confidence: '確信度',
    retained: 'ルール判定を維持',
    empty: '比較するコメントがありません。',
    lead: '候補ごとの評価と最終的な選択を見比べられます。スコアはパッケージのランキング値で、モデルの確信度とは別です。確信度も実測した正答率ではありません。',
    jev: '下の3項目はJevが返した判定です。判断保留・低確信の場合はルール判定を維持します。「未評価」には文脈不足、除外対象、入力上限、API失敗などが含まれます。話題の判定を順位に使うかはトピック絞り込み設定に従います。',
    openai:
      'OpenAIは対象のコメントIDを直接選ぶため、スコア順と選択結果が異なることがあります。Jevの3項目の判定は返しません。',
    rules: '今回はルールで処理しました。Jevの判定は使っていません。',
    plan: '対応方針（順位には影響しません）',
    excluded:
      'AIで分析する前に、ルールの安全チェックで除外しました。このコメントはAIに送っていません。',
    judgments: 'AIの判定',
    responseDepth: '返し方',
    depths: {
      one_liner: '一言で',
      quick: 'ノリで短く',
      thoughtful: 'じっくり考えて',
    },
    noDepth: '指定なし（低確信）',
    reasoningEffort: '推奨reasoningEffort',
    hostile: '失礼・攻撃的（要注意）',
    pointsOutError: '誤りの指摘',
    needsModerator: '安全上のリスク',
    probability: '確率',
    badges: {
      notify: '管理者に通知',
      error: '誤りの指摘',
      attention: '要注意',
    },
    reasons: 'ランキングの要素',
    signals: {
      direct_question: '質問',
      topic_related: '話題に関連',
      topic_unrelated: '話題と無関係',
      answered_in_context: '回答済みと推定して減点',
      ignored_recently: '回答済みの記録',
      unsafe: '安全性による除外',
      blocked_viewer: '視聴者をブロック',
      new_viewer: '初見',
      returning_viewer: '常連',
      topic_change_candidate: '話題転換の候補',
      high_engagement: '高い反応',
      easy_to_answer: '答えやすい',
      super_chat: 'スーパーチャット',
      moderator: 'モデレーター',
      duplicate: '重複',
      spam_like: 'スパム傾向',
      fresh: '新しいコメント',
    },
  },
} as const;

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ] ?? char
  );
}

export function renderComparison(
  result: CommentIntelligenceResult,
  options: Options
): string {
  const copy = COPY[options.language];
  const selected = new Set(result.selectedComments.map((c) => c.id));
  const excludedReports = new Map(
    result.safetyReports
      .filter((r) => r.shouldIgnore)
      .map((r) => [r.commentId, r])
  );
  const decisions = new Map(
    (result.debug?.usedLLM ? options.decisions : []).map((d) => [
      d.commentId,
      d,
    ])
  );
  const assessments = new Map(
    result.debug?.semanticAssessments?.map((a) => [a.commentId, a])
  );
  const plans = new Map(
    (result.responsePlans ?? []).map((p) => [p.commentId, p])
  );
  const showJev = options.engine === 'jev';
  const note = showJev
    ? copy.jev
    : options.engine === 'openai' && result.debug?.usedLLM
      ? copy.openai
      : copy.rules;
  const rows = result.rankedComments
    .map((comment) => {
      const picked = selected.has(comment.id);
      const report = excludedReports.get(comment.id);
      const blocked = Boolean(report);
      const status = blocked
        ? copy.blocked
        : picked
          ? copy.selected
          : copy.skipped;
      const decision = decisions.get(comment.id);
      const assessment = assessments.get(comment.id);
      const judgments = showJev
        ? (['topicRelated', 'question', 'alreadyAnswered'] as const)
            .map((field) => {
              const answer: JevChoiceAnswer | undefined = decision?.[field];
              const retained =
                answer && typeof assessment?.[field] !== 'boolean';
              return `<div class="comparison-judgment"><dt>${copy[field]}</dt><dd>${answer ? copy[answer.choice] : copy.notEvaluated}${typeof answer?.confidence === 'number' ? `<small>${copy.confidence} ${(answer.confidence * 100).toFixed(0)}%</small>` : ''}${retained ? `<small>${copy.retained}</small>` : ''}</dd></div>`;
            })
            .join('')
        : '';
      const notify = plans.get(comment.id)?.notifyModerator;
      return `<li class="comparison-card${picked ? ' is-selected' : ''}${blocked ? ' is-blocked' : ''}${notify ? ' is-alert' : ''}">
      <div class="comparison-heading"><strong>${escapeHtml(comment.author.displayName || comment.author.name)}</strong><span class="comparison-outcome">${status}</span></div>
      <p class="comparison-comment">${escapeHtml(comment.text)}</p>
      <p class="comparison-score">${copy.score}: <strong>${comment.score.toFixed(2)}</strong></p>
      ${
        report
          ? `<div class="comparison-excluded"><p>${copy.excluded}</p>${report.categories.length ? `<div class="chips">${report.categories.map((c) => `<span>${escapeHtml(options.formatCategory(c))}</span>`).join('')}</div>` : ''}</div>`
          : showJev
            ? `<p class="comparison-plan-title">${copy.judgments}</p><dl class="comparison-judgments">${judgments}</dl>${renderPlan(decision, plans.get(comment.id), copy)}`
            : ''
      }
      <p class="hint">${copy.reasons}: ${comment.reasons.map((r) => escapeHtml(copy.signals[r])).join(' / ') || '—'}</p>
    </li>`;
    })
    .join('');
  return `<p class="value-lead">${copy.lead}</p><p class="hint comparison-note">${note}</p>${rows ? `<ul class="comparison-list">${rows}</ul>` : `<p class="empty">${copy.empty}</p>`}`;
}

function renderPlan(
  decision: JevCommentDecision | undefined,
  plan: CommentResponsePlan | undefined,
  copy: (typeof COPY)['en' | 'ja']
): string {
  if (!decision?.responseDepth || !plan) return '';
  const depthConfidence = decision.responseDepth.confidence;
  const item = (label: string, value: string, note?: string) =>
    `<div class="comparison-judgment"><dt>${label}</dt><dd>${value}${note ? `<small>${note}</small>` : ''}</dd></div>`;
  const badges = [
    plan.notifyModerator ? ['notify', copy.badges.notify] : undefined,
    plan.pointsOutError ? ['error', copy.badges.error] : undefined,
    plan.needsAttention ? ['attention', copy.badges.attention] : undefined,
  ]
    .filter((badge): badge is string[] => Boolean(badge))
    .map(
      ([kind, label]) => `<span class="plan-badge is-${kind}">${label}</span>`
    )
    .join('');
  const percent = (value: number | undefined) =>
    value === undefined ? '—' : `${(value * 100).toFixed(0)}%`;
  return `<div class="comparison-plan">
    <p class="comparison-plan-title">${copy.plan}${badges}</p>
    <dl class="comparison-judgments comparison-plan-grid">
      ${item(
        copy.responseDepth,
        plan.depth ? copy.depths[plan.depth] : copy.noDepth,
        typeof depthConfidence === 'number'
          ? `${copy.confidence} ${percent(depthConfidence)}`
          : undefined
      )}
      ${item(copy.reasoningEffort, plan.reasoningEffort ?? '—')}
      ${item(copy.hostile, percent(decision.hostile?.probability), copy.probability)}
      ${item(copy.pointsOutError, percent(decision.pointsOutError?.probability), copy.probability)}
      ${item(copy.needsModerator, percent(decision.needsModerator?.probability), copy.probability)}
    </dl>
  </div>`;
}
