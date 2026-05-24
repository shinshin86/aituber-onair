export type CommentCluster = {
  label: string;
  count: number;
  examples: string[];
};

export type IgnoredCommentsSummary = {
  totalCount: number;
  summary: string;
  clusters: CommentCluster[];
};
