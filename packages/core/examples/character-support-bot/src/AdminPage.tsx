import { useEffect, useState, type FormEvent } from 'react';
import {
  getAdminProviders,
  getAdminSettings,
  getTtsVoices,
  saveAdminSettings,
  type AdminSettings,
  type ProviderRecord,
  type VoiceOption,
} from './api';
import LanguageSwitch from './components/LanguageSwitch';
import { type Language, translations } from './i18n';

interface SettingsDraft {
  llm: {
    provider: string;
    model: string;
    apiKey: string;
    endpoint: string;
    persona: string;
  };
  tts: {
    provider: string;
    model: string;
    voice: string;
    apiKey: string;
    endpoint: string;
    speed: number;
    groupId: string;
  };
}

const toDraft = (settings: AdminSettings): SettingsDraft => ({
  llm: {
    provider: settings.llm.provider,
    model: settings.llm.model,
    apiKey: '',
    endpoint: settings.llm.endpoint,
    persona: settings.llm.persona,
  },
  tts: {
    provider: settings.tts.provider,
    model: settings.tts.model,
    voice: settings.tts.voice,
    apiKey: '',
    endpoint: settings.tts.endpoint,
    speed: settings.tts.speed,
    groupId: settings.tts.groupId,
  },
});

interface AdminPageProps {
  language: Language;
  onLanguageChange: (language: Language) => void;
}

export default function AdminPage({
  language,
  onLanguageChange,
}: AdminPageProps) {
  const [llmProviders, setLlmProviders] = useState<ProviderRecord[]>([]);
  const [ttsProviders, setTtsProviders] = useState<ProviderRecord[]>([]);
  const [draft, setDraft] = useState<SettingsDraft | null>(null);
  const [savedSettings, setSavedSettings] = useState<AdminSettings | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [voiceOptions, setVoiceOptions] = useState<VoiceOption[]>([]);
  const [voiceListStatus, setVoiceListStatus] = useState<
    'idle' | 'loading' | 'loaded' | 'error'
  >('idle');
  const [feedback, setFeedback] = useState<
    | {
        kind: 'success' | 'error';
        key: 'saved' | 'saveError';
      }
    | undefined
  >();
  const t = translations[language];

  useEffect(() => {
    let cancelled = false;
    void Promise.all([getAdminProviders(), getAdminSettings()])
      .then(([providers, settings]) => {
        if (cancelled) return;
        setLlmProviders(providers.llm);
        setTtsProviders(providers.tts);
        setSavedSettings(settings);
        setDraft(toDraft(settings));
      })
      .catch(() => {
        // The translated load error is rendered when no draft is available.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedLlm = llmProviders.find(
    (provider) => provider.provider === draft?.llm.provider,
  );
  const selectedTts = ttsProviders.find(
    (provider) => provider.provider === draft?.tts.provider,
  );

  const changeLlmProvider = (providerId: string) => {
    const provider = llmProviders.find((item) => item.provider === providerId);
    if (!provider) return;
    setDraft((current) =>
      current
        ? {
            ...current,
            llm: {
              ...current.llm,
              provider: provider.provider,
              model: provider.defaultModel,
              endpoint: provider.supportsCustomEndpoint
                ? current.llm.endpoint
                : '',
            },
          }
        : current,
    );
    setFeedback(undefined);
  };

  const changeTtsProvider = (providerId: string) => {
    const provider = ttsProviders.find((item) => item.provider === providerId);
    if (!provider) return;
    setDraft((current) =>
      current
        ? {
            ...current,
            tts: {
              ...current.tts,
              provider: provider.provider,
              model: provider.defaultModel,
              voice: provider.defaultVoice ?? '',
              apiKey: '',
              endpoint: provider.supportsCustomEndpoint
                ? (provider.defaultEndpoint ?? '')
                : '',
              speed: 1,
              groupId: '',
            },
          }
        : current,
    );
    setVoiceOptions([]);
    setVoiceListStatus('idle');
    setFeedback(undefined);
  };

  const loadVoiceOptions = async () => {
    if (!draft || !selectedTts?.supportsVoiceList) return;
    setVoiceListStatus('loading');
    try {
      const response = await getTtsVoices(
        selectedTts.provider,
        draft.tts.endpoint,
        draft.tts.apiKey,
      );
      setVoiceOptions(response.voices);
      setVoiceListStatus('loaded');
    } catch {
      setVoiceOptions([]);
      setVoiceListStatus('error');
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft || isSaving) return;
    setIsSaving(true);
    setFeedback(undefined);
    try {
      const saved = await saveAdminSettings({
        llm: {
          provider: draft.llm.provider,
          model: draft.llm.model.trim(),
          endpoint: draft.llm.endpoint.trim(),
          persona: draft.llm.persona.trim(),
          ...(draft.llm.apiKey.trim()
            ? { apiKey: draft.llm.apiKey.trim() }
            : {}),
        },
        tts: {
          provider: draft.tts.provider,
          model: draft.tts.model.trim(),
          voice: draft.tts.voice.trim(),
          endpoint: draft.tts.endpoint.trim(),
          speed: draft.tts.speed,
          groupId: draft.tts.groupId.trim(),
          ...(draft.tts.apiKey.trim()
            ? { apiKey: draft.tts.apiKey.trim() }
            : {}),
        },
      });
      setSavedSettings(saved);
      setDraft(toDraft(saved));
      setFeedback({
        kind: 'success',
        key: 'saved',
      });
    } catch {
      setFeedback({
        kind: 'error',
        key: 'saveError',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const llmKeyReady =
    !selectedLlm?.requiresApiKey ||
    savedSettings?.llm.hasApiKey ||
    Boolean(draft?.llm.apiKey.trim());
  const ttsKeyReady =
    !selectedTts?.requiresApiKey ||
    Boolean(
      savedSettings &&
        savedSettings.tts.provider === draft?.tts.provider &&
        savedSettings.tts.hasApiKey,
    ) ||
    Boolean(draft?.tts.apiKey.trim());
  const ttsGroupIdReady =
    !selectedTts?.requiresGroupId ||
    Boolean(
      savedSettings &&
        savedSettings.tts.provider === draft?.tts.provider &&
        savedSettings.tts.groupId,
    ) ||
    Boolean(draft?.tts.groupId.trim());
  const ttsModelReady =
    !selectedTts?.modelRequired || Boolean(draft?.tts.model.trim());
  const ttsVoiceReady =
    !selectedTts?.voiceRequired || Boolean(draft?.tts.voice.trim());
  const currentTtsSpeed = draft?.tts.speed;
  const ttsSpeedReady =
    !selectedTts?.supportsSpeed ||
    (typeof currentTtsSpeed === 'number' &&
      Number.isFinite(currentTtsSpeed) &&
      currentTtsSpeed >= (selectedTts.speedMin ?? 0.25) &&
      currentTtsSpeed <= (selectedTts.speedMax ?? 4));
  const canSave = Boolean(
    draft?.llm.model.trim() &&
      ttsModelReady &&
      ttsVoiceReady &&
      llmKeyReady &&
      ttsKeyReady &&
      ttsGroupIdReady &&
      ttsSpeedReady &&
      (!selectedLlm?.supportsCustomEndpoint || draft.llm.endpoint.trim()) &&
      (!selectedTts?.supportsCustomEndpoint || draft.tts.endpoint.trim()),
  );
  const combinedVoiceOptions = [
    ...(selectedTts?.voices ?? []).map((voice) => ({
      id: voice,
      label: voice,
    })),
    ...voiceOptions,
  ].filter(
    (voice, index, voices) =>
      voices.findIndex((candidate) => candidate.id === voice.id) === index,
  );

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <a className="brand" href="/">
          <span className="brand-mark">AO</span>
          <span>
            <strong>AITuber OnAir</strong>
            <small>{t.brand.adminSubtitle}</small>
          </span>
        </a>
        <div className="admin-header-actions">
          <a className="back-link" href="/">
            ← {t.admin.back}
          </a>
          <LanguageSwitch language={language} onChange={onLanguageChange} />
        </div>
      </header>

      <main className="admin-main">
        <section className="admin-intro">
          <span className="eyebrow">{t.admin.eyebrow}</span>
          <h1>{t.admin.title}</h1>
          <p>{t.admin.intro}</p>
          <div className="security-callout">
            <strong>{t.admin.securityTitle}</strong>
            <span>{t.admin.securityDescription}</span>
          </div>
        </section>

        {isLoading ? (
          <div className="admin-loading">{t.admin.loading}</div>
        ) : !draft ? (
          <div className="admin-loading is-error">{t.admin.loadError}</div>
        ) : (
          <form className="admin-form" onSubmit={handleSubmit}>
            <section className="settings-card">
              <div className="settings-card-heading">
                <span>01</span>
                <div>
                  <h2>{t.admin.llmTitle}</h2>
                  <p>{t.admin.llmDescription}</p>
                </div>
              </div>

              <div className="settings-grid">
                <label>
                  <span>{t.admin.provider}</span>
                  <select
                    value={draft.llm.provider}
                    onChange={(event) => changeLlmProvider(event.target.value)}
                  >
                    {llmProviders.map((provider) => (
                      <option key={provider.provider} value={provider.provider}>
                        {provider.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>{t.admin.model}</span>
                  {selectedLlm?.models.length ? (
                    <select
                      value={draft.llm.model}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          llm: { ...draft.llm, model: event.target.value },
                        })
                      }
                    >
                      {selectedLlm.models.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={draft.llm.model}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          llm: { ...draft.llm, model: event.target.value },
                        })
                      }
                      placeholder="model-id"
                    />
                  )}
                </label>

                {selectedLlm?.supportsCustomEndpoint && (
                  <label className="field-wide">
                    <span>{t.admin.chatEndpoint}</span>
                    <input
                      type="url"
                      value={draft.llm.endpoint}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          llm: { ...draft.llm, endpoint: event.target.value },
                        })
                      }
                      placeholder="http://127.0.0.1:18080/v1/chat/completions"
                    />
                  </label>
                )}

                {selectedLlm?.requiresApiKey && (
                  <label className="field-wide">
                    <span>{t.admin.apiKey}</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={draft.llm.apiKey}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          llm: { ...draft.llm, apiKey: event.target.value },
                        })
                      }
                      placeholder={
                        savedSettings?.llm.hasApiKey
                          ? `${t.admin.savedKeyPrefix} ${savedSettings.llm.apiKey}`
                          : t.admin.enterServerKey
                      }
                    />
                  </label>
                )}

                <label className="field-wide">
                  <span>{t.admin.persona}</span>
                  <textarea
                    rows={4}
                    value={draft.llm.persona}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        llm: { ...draft.llm, persona: event.target.value },
                      })
                    }
                  />
                </label>
              </div>
            </section>

            <section className="settings-card">
              <div className="settings-card-heading">
                <span>02</span>
                <div>
                  <h2>{t.admin.ttsTitle}</h2>
                  <p>{t.admin.ttsDescription}</p>
                </div>
              </div>

              <div className="settings-grid">
                <label>
                  <span>{t.admin.provider}</span>
                  <select
                    value={draft.tts.provider}
                    onChange={(event) => changeTtsProvider(event.target.value)}
                  >
                    {ttsProviders.map((provider) => (
                      <option key={provider.provider} value={provider.provider}>
                        {provider.provider === 'mock'
                          ? t.admin.mockProviderLabel
                          : provider.label}
                      </option>
                    ))}
                  </select>
                </label>

                {(selectedTts?.modelRequired ||
                  selectedTts?.models.length ||
                  selectedTts?.defaultModel) && (
                  <label>
                    <span>{t.admin.model}</span>
                    {selectedTts?.models.length ? (
                      <select
                        value={draft.tts.model}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            tts: { ...draft.tts, model: event.target.value },
                          })
                        }
                      >
                        {selectedTts.models.map((model) => (
                          <option key={model} value={model}>
                            {model}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={draft.tts.model}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            tts: { ...draft.tts, model: event.target.value },
                          })
                        }
                        placeholder="tts-model"
                      />
                    )}
                  </label>
                )}

                <div className="voice-field">
                  <label>
                    <span>{t.admin.voice}</span>
                    <input
                      list="tts-voice-options"
                      value={draft.tts.voice}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          tts: { ...draft.tts, voice: event.target.value },
                        })
                      }
                      placeholder={t.admin.voiceId}
                    />
                    <datalist id="tts-voice-options">
                      {combinedVoiceOptions.map((voice) => (
                        <option key={voice.id} value={voice.id}>
                          {voice.label}
                        </option>
                      ))}
                    </datalist>
                  </label>
                  {selectedTts?.supportsVoiceList && (
                    <div className="voice-list-controls">
                      <button
                        type="button"
                        onClick={() => void loadVoiceOptions()}
                        disabled={voiceListStatus === 'loading'}
                      >
                        {voiceListStatus === 'loading'
                          ? t.admin.loadingVoices
                          : t.admin.loadVoices}
                      </button>
                      {voiceListStatus === 'loaded' && (
                        <span>
                          {t.admin.voicesLoaded.replace(
                            '{count}',
                            String(voiceOptions.length),
                          )}
                        </span>
                      )}
                      {voiceListStatus === 'error' && (
                        <span className="is-error">
                          {t.admin.voiceListUnavailable}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {selectedTts?.supportsSpeed && (
                  <label>
                    <span>{t.admin.speed}</span>
                    <input
                      type="number"
                      min={selectedTts.speedMin ?? 0.25}
                      max={selectedTts.speedMax ?? 4}
                      step={selectedTts.speedStep ?? 0.05}
                      value={draft.tts.speed}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          tts: {
                            ...draft.tts,
                            speed: Number(event.target.value),
                          },
                        })
                      }
                    />
                  </label>
                )}

                {selectedTts?.supportsCustomEndpoint && (
                  <label className="field-wide">
                    <span>{t.admin.speechEndpoint}</span>
                    <input
                      type="url"
                      value={draft.tts.endpoint}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          tts: { ...draft.tts, endpoint: event.target.value },
                        })
                      }
                      placeholder={
                        selectedTts.defaultEndpoint ||
                        'http://127.0.0.1:8880/v1/audio/speech'
                      }
                    />
                  </label>
                )}

                {selectedTts?.acceptsApiKey && (
                  <label className="field-wide">
                    <span>{t.admin.apiKey}</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={draft.tts.apiKey}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          tts: { ...draft.tts, apiKey: event.target.value },
                        })
                      }
                      placeholder={
                        savedSettings?.tts.provider === draft.tts.provider &&
                        savedSettings.tts.hasApiKey
                          ? `${t.admin.savedKeyPrefix} ${savedSettings.tts.apiKey}`
                          : t.admin.enterServerKey
                      }
                    />
                  </label>
                )}

                {selectedTts?.requiresGroupId && (
                  <label className="field-wide">
                    <span>{t.admin.groupId}</span>
                    <input
                      value={draft.tts.groupId}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          tts: { ...draft.tts, groupId: event.target.value },
                        })
                      }
                      placeholder={t.admin.enterGroupId}
                    />
                  </label>
                )}

                {selectedTts?.developmentOnly && (
                  <div className="mock-note field-wide">{t.admin.mockNote}</div>
                )}
              </div>
            </section>

            <div className="admin-actions">
              {feedback && (
                <output className={`feedback is-${feedback.kind}`}>
                  {t.admin[feedback.key]}
                </output>
              )}
              <button type="submit" disabled={!canSave || isSaving}>
                {isSaving ? t.admin.saving : t.admin.save}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
