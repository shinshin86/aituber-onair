import type { LLMCommentAnalysisResult } from '../types/llm.js';

export function parseLLMAnalysisResult(text: string): LLMCommentAnalysisResult {
  const jsonText = extractJson(text);
  if (!jsonText) {
    return {};
  }

  try {
    const parsed = JSON.parse(jsonText) as LLMCommentAnalysisResult;
    return normalizeResult(parsed);
  } catch {
    return {};
  }
}

function extractJson(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  return text.slice(start, end + 1);
}

function normalizeResult(
  value: LLMCommentAnalysisResult
): LLMCommentAnalysisResult {
  if (!value || typeof value !== 'object') {
    return {};
  }

  return {
    selectedCommentIds: Array.isArray(value.selectedCommentIds)
      ? value.selectedCommentIds.filter(
          (id): id is string => typeof id === 'string'
        )
      : undefined,
    topicRelatedCommentIds: Array.isArray(value.topicRelatedCommentIds)
      ? value.topicRelatedCommentIds.filter(
          (id): id is string => typeof id === 'string'
        )
      : undefined,
    ignoredSummary:
      typeof value.ignoredSummary === 'string'
        ? value.ignoredSummary
        : undefined,
    audienceMood: isAudienceMood(value.audienceMood)
      ? value.audienceMood
      : undefined,
    safetyFlags: Array.isArray(value.safetyFlags)
      ? value.safetyFlags.filter(
          (flag) =>
            typeof flag?.commentId === 'string' &&
            typeof flag.category === 'string' &&
            typeof flag.reason === 'string'
        )
      : undefined,
    instructionForLLM:
      typeof value.instructionForLLM === 'string'
        ? value.instructionForLLM
        : undefined,
    contextForLLM: Array.isArray(value.contextForLLM)
      ? value.contextForLLM.filter(
          (context): context is string => typeof context === 'string'
        )
      : undefined,
  };
}

function isAudienceMood(
  value: LLMCommentAnalysisResult['audienceMood']
): value is NonNullable<LLMCommentAnalysisResult['audienceMood']> {
  return (
    value === 'calm' ||
    value === 'excited' ||
    value === 'confused' ||
    value === 'negative'
  );
}
