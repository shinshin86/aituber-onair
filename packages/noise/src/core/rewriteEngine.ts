import type {
  ChatMessage,
  ContextFingerprint,
  RewriteModel,
  StainPlan,
} from './types.js';

export async function rewriteWithStains(input: {
  draft: string;
  systemPrompt: string;
  messages: ChatMessage[];
  context: ContextFingerprint;
  plan: StainPlan;
  model: RewriteModel;
}): Promise<string> {
  if (input.plan.interventions.length === 0) {
    return input.draft;
  }

  return input.model.generate({
    system: buildRewriteSystemPrompt(),
    prompt: buildRewritePrompt(input),
  });
}

function buildRewriteSystemPrompt(): string {
  return [
    'You rewrite AI VTuber speech for a live stream.',
    'Brand promise: do not let AI responses end in predictable harmony.',
    'Preserve the character, persona, relationship, intent, facts, URLs, numbers, and code exactly.',
    'Do not make the character harsher, colder, more sarcastic, or more aggressive unless the original persona already clearly supports it.',
    'Only reduce over-polished phrasing, generic agreement, clean summaries, forced positivity, and predictable rhythm.',
    'The rewrite should feel like the same character noticed the live context, not like a different character became edgy.',
    'Prefer small, natural changes that still sound like the same character.',
    'Return only the rewritten speech. Do not explain the rewrite.',
  ].join('\n');
}

function buildRewritePrompt(input: {
  draft: string;
  systemPrompt: string;
  messages: ChatMessage[];
  context: ContextFingerprint;
  plan: StainPlan;
}): string {
  return [
    'Original character/system prompt:',
    input.systemPrompt,
    '',
    'Recent conversation:',
    formatMessages(input.messages),
    '',
    'Rewrite directives:',
    JSON.stringify(
      {
        predictabilityContext: input.context,
        frictionPlan: input.plan,
      },
      null,
      2
    ),
    '',
    'Original speech:',
    input.draft,
    '',
    'Rewrite requirements:',
    '- Keep the same character voice and emotional temperature.',
    '- Keep the same meaning and do not add new claims.',
    '- Do not turn politeness into hostility.',
    '- Do not add meta phrases such as "予定調和" or "ノイズ".',
    '- Make the line feel less templated only where it is over-polished, overly agreeable, or too neatly closed.',
    '- If the draft is already natural, make a minimal change.',
  ].join('\n');
}

function formatMessages(messages: ChatMessage[]): string {
  if (messages.length === 0) {
    return '(none)';
  }

  return messages
    .slice(-8)
    .map((message) => `${message.role}: ${message.content}`)
    .join('\n');
}
