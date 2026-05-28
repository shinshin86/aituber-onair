import type { LiveComment } from '../types/comment';
import type { CommentIntelligenceConfig } from '../types/config';
import type { SafetyCategory, SafetyReport } from '../types/safety';
import { includesAny, normalizeText } from '../utils/text';
import { evaluateFeedbackTone } from './evaluateFeedbackTone';
import {
  harassmentPatterns,
  personalInfoPatterns,
  promptInjectionPatterns,
  sexualPatterns,
  urlPatterns,
  violencePatterns,
} from './patterns';

export const ruleBasedSafetyProvider = {
  check(
    comment: LiveComment,
    config?: NonNullable<CommentIntelligenceConfig['safety']>
  ): SafetyReport {
    if (config?.enabled === false) {
      return {
        commentId: comment.id,
        riskLevel: 'none',
        categories: [],
        shouldIgnore: false,
      };
    }

    const text = normalizeText(comment.text);
    const categories: SafetyCategory[] = [];
    const reasons: string[] = [];

    if (includesAny(text, promptInjectionPatterns)) {
      categories.push('prompt_injection');
      reasons.push('prompt injection pattern');
    }

    if (urlPatterns.some((pattern) => pattern.test(comment.text))) {
      categories.push('url');
      reasons.push('URL detected');
    }

    if (/(.)\1{7,}/u.test(comment.text)) {
      categories.push('repetition');
      reasons.push('abnormal repetition');
    }

    if (comment.text.length > 1000) {
      categories.push('spam');
      reasons.push('comment is too long');
    }

    if (includesAny(text, personalInfoPatterns)) {
      categories.push('personal_info');
    }

    if (includesAny(text, harassmentPatterns)) {
      categories.push('harassment');
    }

    const feedbackTone = evaluateFeedbackTone(comment.text);
    if (feedbackTone.isHostile) {
      for (const category of feedbackTone.categories) {
        if (category !== 'constructive_feedback') {
          categories.push(category);
        }
      }
      reasons.push('hostile feedback pattern');
    }

    if (includesAny(text, sexualPatterns)) {
      categories.push('sexual');
    }

    if (includesAny(text, violencePatterns)) {
      categories.push('violence');
    }

    const uniqueCategories = [...new Set(categories)];
    const hasHighRisk =
      uniqueCategories.includes('prompt_injection') ||
      uniqueCategories.includes('spam');
    const hasMediumRisk =
      uniqueCategories.includes('url') ||
      uniqueCategories.includes('repetition') ||
      uniqueCategories.includes('hostile_feedback') ||
      uniqueCategories.includes('baiting') ||
      uniqueCategories.includes('demoralizing') ||
      uniqueCategories.includes('personal_info') ||
      uniqueCategories.includes('harassment') ||
      uniqueCategories.includes('sexual') ||
      uniqueCategories.includes('violence');
    const riskLevel = hasHighRisk ? 'high' : hasMediumRisk ? 'medium' : 'none';
    const shouldIgnorePromptInjection =
      uniqueCategories.includes('prompt_injection') &&
      config?.blockPromptInjection !== false;
    const shouldIgnoreHighRisk =
      riskLevel === 'high' && config?.ignoreHighRisk !== false;
    const shouldIgnoreSpam =
      uniqueCategories.includes('spam') && shouldIgnoreHighRisk;
    const shouldIgnoreMediumRisk =
      riskLevel === 'medium' && config?.ignoreMediumRisk === true;
    const shouldIgnoreUrl =
      uniqueCategories.includes('url') && config?.blockUrls === true;
    const shouldIgnore =
      shouldIgnorePromptInjection ||
      shouldIgnoreSpam ||
      shouldIgnoreMediumRisk ||
      shouldIgnoreUrl;

    return {
      commentId: comment.id,
      riskLevel,
      categories: uniqueCategories,
      shouldIgnore,
      reason: reasons.length > 0 ? reasons.join(', ') : undefined,
    };
  },
};
