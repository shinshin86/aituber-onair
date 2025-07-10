/**
 * Prompt template types for intervention
 */

export interface PromptTemplates {
  intervention: string[];
}

export interface LocalizedPrompts {
  [language: string]: PromptTemplates;
}

export interface PromptConfig {
  language?: string;
  customPrompts?: Partial<LocalizedPrompts>;
}

export type SupportedLanguage = 'ja' | 'en' | string;

/**
 * Get prompt template for specific language and path
 */
export function getPromptTemplate(
  prompts: LocalizedPrompts,
  language: string,
  index?: number
): string {
  const langPrompts = prompts[language] || prompts['en'];
  if (!langPrompts || !langPrompts.intervention) {
    return 'Please change the topic and talk about something new.';
  }

  if (index !== undefined && langPrompts.intervention[index]) {
    return langPrompts.intervention[index];
  }

  // Return random intervention prompt
  const randomIndex = Math.floor(
    Math.random() * langPrompts.intervention.length
  );
  return langPrompts.intervention[randomIndex];
}

/**
 * Override default prompts with custom prompts where provided
 */
export function overridePrompts(
  defaultPrompts: LocalizedPrompts,
  customPrompts?: Partial<LocalizedPrompts>
): LocalizedPrompts {
  if (!customPrompts) return defaultPrompts;

  const merged: LocalizedPrompts = { ...defaultPrompts };

  for (const [lang, templates] of Object.entries(customPrompts)) {
    if (templates && templates.intervention) {
      merged[lang] = {
        ...merged[lang], // Preserve default prompts
        ...templates, // Override with custom prompts
      };
    }
  }

  return merged;
}
