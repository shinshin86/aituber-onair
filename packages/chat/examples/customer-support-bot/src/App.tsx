import { useEffect, useState } from 'react';
import './App.css';
import LanguageSwitch from './components/LanguageSwitch';
import SupportWidget from './components/SupportWidget';
import {
  getInitialLanguage,
  type Language,
  persistLanguage,
  translations,
} from './i18n';

const ArrowIcon = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M4 10h11m-4-4 4 4-4 4" />
  </svg>
);

function App() {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const t = translations[language];

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

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="site-brand" href="#top" aria-label={t.nav.homeLabel}>
          <span className="site-brand-mark">AO</span>
          <span>OnAir Docs</span>
        </a>
        <div className="site-header-actions">
          <nav className="site-nav" aria-label={t.nav.mainLabel}>
            <a href="#guides">{t.nav.guides}</a>
            <a href="#reference">{t.nav.apiReference}</a>
            <a
              href="https://github.com/shinshin86/aituber-onair"
              target="_blank"
              rel="noreferrer"
            >
              {t.nav.github}
            </a>
          </nav>
          <LanguageSwitch language={language} onChange={changeLanguage} />
        </div>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-copy">
            <span className="eyebrow">@aituber-onair/chat</span>
            <h1>{t.hero.title}</h1>
            <p>{t.hero.description}</p>
            <div className="hero-actions">
              <a className="primary-link" href="#quick-start">
                {t.hero.startBuilding} <ArrowIcon />
              </a>
              <a
                className="secondary-link"
                href="https://github.com/shinshin86/aituber-onair/tree/main/packages/chat"
                target="_blank"
                rel="noreferrer"
              >
                {t.hero.readReadme}
              </a>
            </div>
          </div>

          <div className="hero-code" aria-label={t.hero.codeLabel}>
            <div className="code-window-bar">
              <span />
              <span />
              <span />
              <small>support.ts</small>
            </div>
            <pre>
              <code>{`const chat = ChatServiceFactory
  .createChatService('openai', {
    apiKey,
    model: MODEL_GPT_5_6_TERRA,
  });

await chat.processChat(
  messages,
  onPartial,
  onComplete,
);`}</code>
            </pre>
          </div>
        </section>

        <section className="trust-strip" aria-label={t.trust.label}>
          <span>{t.trust.providers}</span>
          <span>{t.trust.streaming}</span>
          <span>{t.trust.runtimes}</span>
        </section>

        <section className="docs-section" id="guides">
          <div className="section-heading">
            <span className="eyebrow">{t.docs.eyebrow}</span>
            <h2>{t.docs.title}</h2>
            <p>{t.docs.description}</p>
          </div>

          <div className="feature-grid">
            <article className="feature-card">
              <span className="feature-number">01</span>
              <h3>{t.docs.providersTitle}</h3>
              <p>{t.docs.providersDescription}</p>
              <a href="#reference">
                {t.docs.providersLink} <ArrowIcon />
              </a>
            </article>
            <article className="feature-card">
              <span className="feature-number">02</span>
              <h3>{t.docs.streamingTitle}</h3>
              <p>{t.docs.streamingDescription}</p>
              <a href="#quick-start">
                {t.docs.streamingLink} <ArrowIcon />
              </a>
            </article>
            <article className="feature-card">
              <span className="feature-number">03</span>
              <h3>{t.docs.capabilitiesTitle}</h3>
              <p>{t.docs.capabilitiesDescription}</p>
              <a
                href="https://github.com/shinshin86/aituber-onair/tree/main/packages/chat#features"
                target="_blank"
                rel="noreferrer"
              >
                {t.docs.capabilitiesLink} <ArrowIcon />
              </a>
            </article>
          </div>
        </section>

        <section className="quick-start-section" id="quick-start">
          <div>
            <span className="eyebrow">{t.quickStart.eyebrow}</span>
            <h2>{t.quickStart.title}</h2>
          </div>
          <div className="install-command">
            <code>npm install @aituber-onair/chat</code>
            <span>npm</span>
          </div>
        </section>

        <section className="reference-section" id="reference">
          <span>{t.supportCta.title}</span>
          <p>{t.supportCta.description}</p>
        </section>
      </main>

      <footer className="site-footer">
        <span>AITuber OnAir</span>
        <span>{t.footer.example}</span>
      </footer>

      <SupportWidget language={language} />
    </div>
  );
}

export default App;
