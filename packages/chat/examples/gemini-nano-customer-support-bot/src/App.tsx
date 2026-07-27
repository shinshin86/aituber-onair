import { useEffect, useState } from 'react';
import LanguageSwitch from './components/LanguageSwitch';
import SupportChat from './components/SupportChat';
import {
  getInitialLanguage,
  persistLanguage,
  translations,
  type Language,
} from './i18n';
import { useGeminiNanoStatus } from './useGeminiNanoStatus';
import './App.css';

const DetailIcon = ({ children }: { children: string }) => (
  <span className="detail-icon" aria-hidden="true">
    {children}
  </span>
);

function App() {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const t = translations[language];
  const geminiNano = useGeminiNanoStatus(language);

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t.document.title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', t.document.description);
  }, [language, t.document.description, t.document.title]);

  const changeLanguage = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    persistLanguage(nextLanguage);
  };

  const statusText = t.model[geminiNano.status];
  const canPrepare =
    geminiNano.status === 'downloadable' || geminiNano.status === 'downloading';

  return (
    <div className="page-shell">
      <header className="site-header">
        <a className="site-brand" href="#top">
          <span>AO</span>
          <strong>OnAir Docs</strong>
        </a>
        <div className="header-actions">
          <a
            href="https://github.com/shinshin86/aituber-onair/tree/main/packages/chat"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <LanguageSwitch language={language} onChange={changeLanguage} />
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">{t.hero.eyebrow}</span>
            <h1>{t.hero.title}</h1>
            <p>{t.hero.description}</p>
            <div className="hero-badges" aria-label="Example features">
              <span>{t.hero.localBadge}</span>
              <span>{t.hero.keyBadge}</span>
              <span>{t.hero.languageBadge}</span>
            </div>
            <div className="hero-actions">
              <button
                type="button"
                onClick={() =>
                  document
                    .querySelector<HTMLButtonElement>('.support-launcher')
                    ?.click()
                }
              >
                {t.hero.openChat}
              </button>
              <a
                href="https://github.com/shinshin86/aituber-onair/tree/main/packages/chat"
                target="_blank"
                rel="noreferrer"
              >
                {t.hero.readPackage}
              </a>
            </div>
          </div>

          <aside className="model-card" aria-live="polite">
            <div className="model-card-heading">
              <span className="model-mark">N</span>
              <div>
                <small>Gemini Nano</small>
                <h2>{t.model.title}</h2>
              </div>
            </div>
            <div className={`model-state model-state--${geminiNano.status}`}>
              <span aria-hidden="true" />
              <p>{statusText}</p>
            </div>
            {canPrepare && (
              <button
                type="button"
                className="prepare-button"
                onClick={geminiNano.prepareModel}
                disabled={geminiNano.isPreparing}
              >
                {geminiNano.isPreparing ? t.model.preparing : t.model.prepare}
              </button>
            )}
            {geminiNano.downloadProgress !== null && (
              <div
                className="download-progress"
                role="progressbar"
                aria-label={t.model.progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={geminiNano.downloadProgress}
                tabIndex={0}
              >
                <span style={{ width: `${geminiNano.downloadProgress}%` }} />
              </div>
            )}
            <small className="requirements">{t.model.requirements}</small>
          </aside>
        </section>

        <section className="detail-grid">
          <article>
            <DetailIcon>◎</DetailIcon>
            <h2>{t.details.privacyTitle}</h2>
            <p>{t.details.privacyDescription}</p>
          </article>
          <article>
            <DetailIcon>≡</DetailIcon>
            <h2>{t.details.knowledgeTitle}</h2>
            <p>{t.details.knowledgeDescription}</p>
          </article>
          <article>
            <DetailIcon>あ</DetailIcon>
            <h2>{t.details.languageTitle}</h2>
            <p>{t.details.languageDescription}</p>
          </article>
        </section>
      </main>

      <footer className="site-footer">
        <span>AITuber OnAir</span>
        <span>{t.footer}</span>
      </footer>

      <SupportChat
        language={language}
        status={geminiNano.status}
        onPrepare={geminiNano.prepareModel}
        isPreparing={geminiNano.isPreparing}
      />
    </div>
  );
}

export default App;
