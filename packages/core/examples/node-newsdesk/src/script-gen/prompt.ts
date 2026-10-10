export interface BuildUserPromptOptions {
  sourceText: string;
  focus?: string | null;
}

/** Build the factual source prompt, optionally emphasizing one perspective. */
export function buildUserPrompt({
  sourceText,
  focus,
}: BuildUserPromptOptions): string {
  const sections = [
    'Turn the following source into a chaptered Japanese newsdesk script.',
    'Treat the source text as the only factual authority.',
  ];
  if (focus) {
    sections.push('', 'Center the script on this perspective:', focus);
  }
  sections.push('', 'Source text:', '', sourceText);
  return sections.join('\n');
}
