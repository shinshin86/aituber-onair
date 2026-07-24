import { useEffect, useState, type FormEvent } from 'react';
import {
  getAdminProviders,
  getAdminSettings,
  saveAdminSettings,
  type AdminSettings,
  type ProviderRecord,
} from './api';

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
  },
});

export default function AdminPage() {
  const [llmProviders, setLlmProviders] = useState<ProviderRecord[]>([]);
  const [ttsProviders, setTtsProviders] = useState<ProviderRecord[]>([]);
  const [draft, setDraft] = useState<SettingsDraft | null>(null);
  const [savedSettings, setSavedSettings] = useState<AdminSettings | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<
    { kind: 'success' | 'error'; text: string } | undefined
  >();

  useEffect(() => {
    document.title = 'Character Support Bot — Server Settings';
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
        if (!cancelled) {
          setFeedback({
            kind: 'error',
            text: 'Could not load the server configuration.',
          });
        }
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
              endpoint: provider.supportsCustomEndpoint
                ? current.tts.endpoint
                : '',
            },
          }
        : current,
    );
    setFeedback(undefined);
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
          ...(draft.tts.apiKey.trim()
            ? { apiKey: draft.tts.apiKey.trim() }
            : {}),
        },
      });
      setSavedSettings(saved);
      setDraft(toDraft(saved));
      setFeedback({
        kind: 'success',
        text: 'Server settings saved. The character widget is ready to retry.',
      });
    } catch (error) {
      setFeedback({
        kind: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Could not save the server configuration.',
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
    savedSettings?.tts.hasApiKey ||
    Boolean(draft?.tts.apiKey.trim());
  const canSave = Boolean(
    draft?.llm.model.trim() &&
      draft.tts.model.trim() &&
      llmKeyReady &&
      ttsKeyReady &&
      (!selectedLlm?.supportsCustomEndpoint || draft.llm.endpoint.trim()) &&
      (!selectedTts?.supportsCustomEndpoint || draft.tts.endpoint.trim()),
  );

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <a className="brand" href="/">
          <span className="brand-mark">AO</span>
          <span>
            <strong>AITuber OnAir</strong>
            <small>Character Support Bot</small>
          </span>
        </a>
        <a className="back-link" href="/">
          ← Back to example
        </a>
      </header>

      <main className="admin-main">
        <section className="admin-intro">
          <span className="eyebrow">SERVER-SIDE CONFIGURATION</span>
          <h1>Connect Miko’s chat and voice</h1>
          <p>
            Provider credentials are saved only by the local Node server. The
            browser receives masked values and calls same-origin proxy routes.
          </p>
          <div className="security-callout">
            <strong>Local demo only — do not expose this admin page.</strong>
            <span>
              This example intentionally has no authentication. Add access
              control, CSRF protection, and deployment-specific secret storage
              before adapting it for any public environment.
            </span>
          </div>
        </section>

        {isLoading ? (
          <div className="admin-loading">Loading configuration…</div>
        ) : !draft ? (
          <div className="admin-loading is-error">
            The configuration could not be loaded.
          </div>
        ) : (
          <form className="admin-form" onSubmit={handleSubmit}>
            <section className="settings-card">
              <div className="settings-card-heading">
                <span>01</span>
                <div>
                  <h2>Language model</h2>
                  <p>
                    The Node server calls this provider through
                    @aituber-onair/chat.
                  </p>
                </div>
              </div>

              <div className="settings-grid">
                <label>
                  <span>Provider</span>
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
                  <span>Model</span>
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
                    <span>Chat completions endpoint</span>
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
                    <span>API key</span>
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
                          ? `Saved: ${savedSettings.llm.apiKey}`
                          : 'Enter a server-side key'
                      }
                    />
                  </label>
                )}

                <label className="field-wide">
                  <span>Character persona</span>
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
                  <h2>Text-to-speech</h2>
                  <p>
                    Audio bytes return through the server proxy so the browser
                    can play them and drive Miko’s lip sync.
                  </p>
                </div>
              </div>

              <div className="settings-grid">
                <label>
                  <span>Provider</span>
                  <select
                    value={draft.tts.provider}
                    onChange={(event) => changeTtsProvider(event.target.value)}
                  >
                    {ttsProviders.map((provider) => (
                      <option key={provider.provider} value={provider.provider}>
                        {provider.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Model</span>
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

                <label>
                  <span>Voice</span>
                  {selectedTts?.voices?.length ? (
                    <select
                      value={draft.tts.voice}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          tts: { ...draft.tts, voice: event.target.value },
                        })
                      }
                    >
                      {selectedTts.voices.map((voice) => (
                        <option key={voice} value={voice}>
                          {voice}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={draft.tts.voice}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          tts: { ...draft.tts, voice: event.target.value },
                        })
                      }
                      placeholder="Optional voice ID"
                    />
                  )}
                </label>

                <label>
                  <span>Speed</span>
                  <input
                    type="number"
                    min="0.25"
                    max="4"
                    step="0.05"
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

                {selectedTts?.supportsCustomEndpoint && (
                  <label className="field-wide">
                    <span>Speech endpoint</span>
                    <input
                      type="url"
                      value={draft.tts.endpoint}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          tts: { ...draft.tts, endpoint: event.target.value },
                        })
                      }
                      placeholder="http://127.0.0.1:8880/v1/audio/speech"
                    />
                  </label>
                )}

                {selectedTts?.requiresApiKey && (
                  <label className="field-wide">
                    <span>API key</span>
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
                        savedSettings?.tts.hasApiKey
                          ? `Saved: ${savedSettings.tts.apiKey}`
                          : 'Enter a server-side key'
                      }
                    />
                  </label>
                )}

                {selectedTts?.developmentOnly && (
                  <div className="mock-note field-wide">
                    The built-in mock returns a short generated WAV for local
                    lip-sync testing. It is not a production TTS provider.
                  </div>
                )}
              </div>
            </section>

            <div className="admin-actions">
              {feedback && (
                <output className={`feedback is-${feedback.kind}`}>
                  {feedback.text}
                </output>
              )}
              <button type="submit" disabled={!canSave || isSaving}>
                {isSaving ? 'Saving…' : 'Save server settings'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
