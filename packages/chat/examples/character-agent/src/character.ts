import { SECRETARY_CHARACTER_PROMPT } from './prompts/secretary-character';

export type SecretaryCharacter = {
  name: string;
  systemPrompt: string;
};

export const secretaryCharacter: SecretaryCharacter = {
  name: 'AITuber Secretary',
  systemPrompt: SECRETARY_CHARACTER_PROMPT,
};
