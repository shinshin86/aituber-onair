import type { LiveComment } from '../types/comment';
import type { IgnoredCommentsSummary } from '../types/summary';
import { resolveLanguage } from '../utils/language';
import { clusterComments } from './clusterComments';

const jaLabels: Record<string, string> = {
  greeting: '挨拶コメント',
  first_time_viewer: '初見コメント',
  stream_topic_question: '今日の配信内容を聞くコメント',
  praise: 'ほめるコメント',
  question: '質問コメント',
  request: 'リクエストコメント',
  unsafe_instruction: '危険な指示を含むコメント',
  url_or_link: 'URLを含むコメント',
  spam: 'スパムらしいコメント',
  other: 'その他のコメント',
};

const enLabels: Record<string, string> = {
  greeting: 'greeting comments',
  first_time_viewer: 'first-time viewer comments',
  stream_topic_question: "questions about today's stream",
  praise: 'praise comments',
  question: 'questions',
  request: 'requests',
  unsafe_instruction: 'unsafe instructions',
  url_or_link: 'link comments',
  spam: 'spam-like comments',
  other: 'other comments',
};

export function summarizeIgnoredComments(_input: {
  comments: LiveComment[];
  language?: 'ja' | 'en' | 'auto';
  maxExamplesPerCluster?: number;
}): IgnoredCommentsSummary {
  const input = _input;
  const language = resolveLanguage(input.language);
  const clusters = clusterComments(
    input.comments,
    input.maxExamplesPerCluster ?? 3
  );
  const totalCount = input.comments.length;

  if (totalCount === 0) {
    return {
      totalCount,
      summary:
        language === 'ja'
          ? '未選択コメントはありません。'
          : 'There are no ignored comments.',
      clusters,
    };
  }

  const summary =
    language === 'ja'
      ? buildJapaneseSummary(clusters)
      : buildEnglishSummary(clusters);

  return {
    totalCount,
    summary,
    clusters,
  };
}

function buildJapaneseSummary(clusters: IgnoredCommentsSummary['clusters']) {
  const parts = clusters.map(
    (cluster) =>
      `${jaLabels[cluster.label] ?? cluster.label}が${cluster.count}件`
  );
  const suffix = clusters.some(
    (cluster) => cluster.label === 'unsafe_instruction'
  )
    ? '危険な指示を含むコメントは除外しました。'
    : '';

  return `${parts.join('、')}あります。${suffix}`;
}

function buildEnglishSummary(clusters: IgnoredCommentsSummary['clusters']) {
  const parts = clusters.map(
    (cluster) => `${cluster.count} ${enLabels[cluster.label] ?? cluster.label}`
  );
  const suffix = clusters.some(
    (cluster) => cluster.label === 'unsafe_instruction'
  )
    ? ' Unsafe instructions were ignored.'
    : '';

  return `There are ${parts.join(', ')}.${suffix}`;
}
