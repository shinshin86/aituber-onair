import { useEffect, useMemo, useState, type FormEvent } from 'react';
import './App.css';
import './AdminPage.css';
import {
  getAdminProviders,
  getAdminSettings,
  saveAdminSettings,
  type AdminProvider,
} from './api';
import LanguageSwitch from './components/LanguageSwitch';
import {
  getInitialLanguage,
  type Language,
  persistLanguage,
  translations,
} from './i18n';

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  'openai-compatible': 'OpenAI-Compatible',
  openrouter: 'OpenRouter',
  gemini: 'Gemini',
  claude: 'Claude',
  zai: 'Z.ai',
  xai: 'xAI',
  kimi: 'Kimi',
  deepseek: 'DeepSeek',
  mistral: 'Mistral',
  sakana: 'Sakana AI',
  plamo: 'PLaMo',
};

const formatProviderLabel = (provider: string): string =>
  PROVIDER_LABELS[provider] ??
  provider
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

interface AdminDraft {
  provider: string;
  model: string;
  apiKey: string;
  endpoint: string;
  persona: string;
}

export default function AdminPage() {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const [providers, setProviders] = useState<AdminProvider[]>([]);
  const [draft, setDraft] = useState<AdminDraft | null>(null);
  const [maskedApiKey, setMaskedApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [feedback, setFeedback] = useState<
    { kind: 'success' | 'error'; text: string } | undefined
  >();
  const t = translations[language];

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t.admin.documentTitle;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', t.admin.documentDescription);
  }, [language, t.admin.documentDescription, t.admin.documentTitle]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([getAdminProviders(), getAdminSettings()])
      .then(([availableProviders, settings]) => {
        if (cancelled) return;
        setProviders(availableProviders);
        setDraft({
          provider: settings.provider,
          model: settings.model,
          apiKey: '',
          endpoint: settings.endpoint,
          persona: settings.persona,
        });
        setMaskedApiKey(settings.apiKey);
        setHasApiKey(settings.hasApiKey);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.provider === draft?.provider),
    [draft?.provider, providers],
  );

  const changeLanguage = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    persistLanguage(nextLanguage);
  };

  const changeProvider = (providerId: string) => {
    const provider = providers.find((item) => item.provider === providerId);
    if (!provider) return;
    setDraft((current) =>
      current
        ? {
            ...current,
            provider: provider.provider,
            model: provider.defaultModel || provider.models[0] || '',
          }
        : current,
    );
    setFeedback(undefined);
  };

  const isReadyToSave = Boolean(
    draft?.provider &&
      draft.model.trim() &&
      (!selectedProvider?.supportsCustomEndpoint || draft.endpoint.trim()) &&
      (!selectedProvider?.requiresApiKey || hasApiKey || draft.apiKey.trim()),
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft || !isReadyToSave || isSaving) return;

    setIsSaving(true);
    setFeedback(undefined);
    try {
      const saved = await saveAdminSettings({
        provider: draft.provider,
        model: draft.model.trim(),
        endpoint: draft.endpoint.trim(),
        persona: draft.persona.trim(),
        ...(draft.apiKey.trim() ? { apiKey: draft.apiKey.trim() } : {}),
      });
      setDraft({
        provider: saved.provider,
        model: saved.model,
        apiKey: '',
        endpoint: saved.endpoint,
        persona: saved.persona,
      });
      setMaskedApiKey(saved.apiKey);
      setHasApiKey(saved.hasApiKey);
      setFeedback({ kind: 'success', text: t.admin.saved });
    } catch {
      setFeedback({ kind: 'error', text: t.admin.saveError });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <a className="site-brand" href="/" aria-label={t.nav.homeLabel}>
          <span className="site-brand-mark">AO</span>
          <span>OnAir Docs</span>
        </a>
        <div className="admin-header-actions">
          <a href="/">← {t.admin.backToSite}</a>
          <LanguageSwitch language={language} onChange={changeLanguage} />
        </div>
      </header>

      <main className="admin-main">
        <section className="admin-intro">
          <span className="eyebrow">{t.admin.configuration}</span>
          <h1>{t.admin.title}</h1>
          <p>{t.admin.intro}</p>
          <div className="admin-security-note" role="note">
            <strong>{t.admin.securityTitle}</strong>
            <span>{t.admin.securityDescription}</span>
          </div>
        </section>

        <section className="admin-card" aria-label={t.admin.formLabel}>
          {isLoading ? (
            <p className="admin-state">{t.admin.loading}</p>
          ) : loadFailed ? (
            <p className="admin-state admin-state--error">
              {t.admin.loadError}
            </p>
          ) : !draft || providers.length === 0 ? (
            <p className="admin-state admin-state--error">
              {t.admin.noProviders}
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              <label className="admin-field">
                <span>{t.admin.provider}</span>
                <select
                  value={draft.provider}
                  onChange={(event) => changeProvider(event.target.value)}
                >
                  {providers.map((provider) => (
                    <option value={provider.provider} key={provider.provider}>
                      {formatProviderLabel(provider.provider)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-field" htmlFor="admin-model">
                <span>{t.admin.model}</span>
                {selectedProvider && selectedProvider.models.length > 0 ? (
                  <select
                    id="admin-model"
                    value={draft.model}
                    onChange={(event) =>
                      setDraft({ ...draft, model: event.target.value })
                    }
                  >
                    {selectedProvider.models.map((model) => (
                      <option value={model} key={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="admin-model"
                    type="text"
                    value={draft.model}
                    placeholder={t.admin.modelPlaceholder}
                    onChange={(event) =>
                      setDraft({ ...draft, model: event.target.value })
                    }
                  />
                )}
                <small>
                  {selectedProvider && selectedProvider.models.length > 0
                    ? t.admin.modelsLoaded
                    : t.admin.modelHelp}
                </small>
              </label>

              {selectedProvider?.supportsCustomEndpoint && (
                <label className="admin-field">
                  <span>{t.admin.endpoint}</span>
                  <input
                    type="url"
                    value={draft.endpoint}
                    placeholder="http://127.0.0.1:18080/v1/chat/completions"
                    onChange={(event) =>
                      setDraft({ ...draft, endpoint: event.target.value })
                    }
                  />
                  <small>{t.admin.endpointHelp}</small>
                </label>
              )}

              <label className="admin-field">
                <span>
                  {t.admin.apiKey}
                  {selectedProvider?.requiresApiKey
                    ? ''
                    : ` (${t.admin.optional})`}
                </span>
                <input
                  type="password"
                  value={draft.apiKey}
                  placeholder={
                    maskedApiKey ||
                    (hasApiKey
                      ? t.admin.apiKeyConfigured
                      : t.admin.apiKeyPlaceholder)
                  }
                  autoComplete="off"
                  onChange={(event) =>
                    setDraft({ ...draft, apiKey: event.target.value })
                  }
                />
                <small>{t.admin.apiKeyHelp}</small>
              </label>

              <label className="admin-field">
                <span>{t.admin.persona}</span>
                <textarea
                  value={draft.persona}
                  rows={6}
                  onChange={(event) =>
                    setDraft({ ...draft, persona: event.target.value })
                  }
                />
                <small>{t.admin.personaHelp}</small>
              </label>

              <div className="admin-form-footer">
                {feedback && (
                  <output
                    className={`admin-feedback admin-feedback--${feedback.kind}`}
                  >
                    {feedback.text}
                  </output>
                )}
                <button type="submit" disabled={!isReadyToSave || isSaving}>
                  {isSaving ? t.admin.saving : t.admin.save}
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
