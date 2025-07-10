import type {
  Message,
  DiversificationPrompt,
  LocalizedPrompts,
} from '../types/index.js';
import { DEFAULT_PROMPTS } from '../config/defaultPrompts.js';
import { overridePrompts } from '../types/prompts.js';

export interface PromptGenerationOptions {
  language?: string;
}

export class PromptGenerator {
  private readonly usedPrompts: Set<string> = new Set();
  private readonly maxPromptHistory: number = 50;
  private language: string;
  private prompts: LocalizedPrompts;

  constructor(language = 'ja', customPrompts?: Partial<LocalizedPrompts>) {
    this.language = language;
    this.prompts = overridePrompts(DEFAULT_PROMPTS, customPrompts);
  }

  generateDiversificationPrompt(
    messages: Message[],
    options: PromptGenerationOptions = {}
  ): DiversificationPrompt {
    const language = options.language || this.language;
    const content = this.getInterventionPrompt(language);

    return {
      content,
      type: 'topic_change',
      priority: 'medium',
      context: `Conversation length: ${messages.length} messages`,
    };
  }

  private getInterventionPrompt(language: string): string {
    const langPrompts = this.prompts[language] || this.prompts.en;
    if (!langPrompts?.intervention || langPrompts.intervention.length === 0) {
      return 'Please change the topic and talk about something new.';
    }

    return this.selectUnusedTemplate(langPrompts.intervention);
  }

  private selectUnusedTemplate(templates: readonly string[]): string {
    const availableTemplates = templates.filter(
      (t) => !this.usedPrompts.has(t)
    );

    if (availableTemplates.length === 0) {
      this.usedPrompts.clear();
      return templates[Math.floor(Math.random() * templates.length)];
    }

    const selected =
      availableTemplates[Math.floor(Math.random() * availableTemplates.length)];
    this.usedPrompts.add(selected);

    if (this.usedPrompts.size > this.maxPromptHistory) {
      const oldestPrompt = Array.from(this.usedPrompts)[0];
      this.usedPrompts.delete(oldestPrompt);
    }

    return selected;
  }

  clearHistory(): void {
    this.usedPrompts.clear();
  }
}
