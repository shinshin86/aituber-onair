import type {
  CommentIntelligenceResult,
  JevChoiceAnswer,
  JevCommentDecision,
} from '../../../src/index';

type Options = {
  language: 'en' | 'ja';
  engine: 'rules' | 'openai' | 'jev';
  decisions: JevCommentDecision[];
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
  const excluded = new Set(
    result.safetyReports.filter((r) => r.shouldIgnore).map((r) => r.commentId)
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
  const showJev = options.engine === 'jev';
  const note = showJev
    ? copy.jev
    : options.engine === 'openai' && result.debug?.usedLLM
      ? copy.openai
      : copy.rules;
  const rows = result.rankedComments
    .map((comment) => {
      const picked = selected.has(comment.id);
      const blocked = excluded.has(comment.id);
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
      return `<li class="comparison-card${picked ? ' is-selected' : ''}${blocked ? ' is-blocked' : ''}">
      <div class="comparison-heading"><strong>${escapeHtml(comment.author.displayName || comment.author.name)}</strong><span class="comparison-outcome">${status}</span></div>
      <p class="comparison-comment">${escapeHtml(comment.text)}</p>
      <p class="comparison-score">${copy.score}: <strong>${comment.score.toFixed(2)}</strong></p>
      ${showJev ? `<dl class="comparison-judgments">${judgments}</dl>` : ''}
      <p class="hint">${copy.reasons}: ${comment.reasons.map((r) => escapeHtml(copy.signals[r])).join(' / ') || '—'}</p>
    </li>`;
    })
    .join('');
  return `<p class="value-lead">${copy.lead}</p><p class="hint comparison-note">${note}</p>${rows ? `<ul class="comparison-list">${rows}</ul>` : `<p class="empty">${copy.empty}</p>`}`;
}
