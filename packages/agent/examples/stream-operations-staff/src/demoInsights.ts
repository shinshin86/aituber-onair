import type { DemoPhase, FixtureComment } from './types';

export interface UnansweredQuestionTopic {
  readonly id: 'software' | 'license' | 'brush';
  readonly label: string;
  readonly important: boolean;
  readonly commentIds: readonly string[];
}

const QUESTION_TOPICS: readonly UnansweredQuestionTopic[] = [
  {
    id: 'software',
    label: '使用している制作ソフト',
    important: false,
    commentIds: ['c02', 'c05', 'c10'],
  },
  {
    id: 'license',
    label: '素材のライセンス条件',
    important: true,
    commentIds: ['c12'],
  },
  {
    id: 'brush',
    label: 'ブラシ設定の詳細',
    important: false,
    commentIds: ['c13'],
  },
];

export function getUnansweredQuestionTopics(
  comments: readonly FixtureComment[]
): readonly UnansweredQuestionTopic[] {
  const visibleIds = new Set(comments.map((comment) => comment.id));
  return QUESTION_TOPICS.filter((topic) =>
    topic.commentIds.some((commentId) => visibleIds.has(commentId))
  );
}

export function getRepeatedSoftwareQuestionCount(
  comments: readonly FixtureComment[]
): number {
  const softwareTopic = QUESTION_TOPICS[0];
  const softwareCommentIds = new Set(softwareTopic.commentIds);
  return comments.filter((comment) => softwareCommentIds.has(comment.id))
    .length;
}

export function canCreatePostStreamReport(
  phase: DemoPhase,
  visibleCount: number,
  totalCount: number
): boolean {
  return (
    visibleCount === totalCount &&
    (phase === 'monitoring' || phase === 'paused')
  );
}
