import type { VoiceOption } from './api';

export type VoiceListStatus = 'idle' | 'loading' | 'loaded' | 'error';
export type VoiceFieldMode = 'loading' | 'select' | 'input';

export const resolveVoiceFieldMode = (
  supportsVoiceList: boolean,
  status: VoiceListStatus,
  voices: VoiceOption[],
): VoiceFieldMode => {
  if (!supportsVoiceList) return 'input';
  if (status === 'loaded' && voices.length > 0) return 'select';
  if (status === 'error' || status === 'loaded') return 'input';
  return 'loading';
};

export const buildVoiceSelectOptions = (
  voices: VoiceOption[],
  currentVoiceId: string,
  unknownSavedLabel: string,
): VoiceOption[] => {
  const uniqueVoices = voices.filter(
    (voice, index) =>
      voices.findIndex((candidate) => candidate.id === voice.id) === index,
  );
  const savedVoiceId = currentVoiceId.trim();
  if (
    !savedVoiceId ||
    uniqueVoices.some((voice) => voice.id === savedVoiceId)
  ) {
    return uniqueVoices;
  }
  return [
    {
      id: savedVoiceId,
      label: unknownSavedLabel.replace('{id}', savedVoiceId),
    },
    ...uniqueVoices,
  ];
};
