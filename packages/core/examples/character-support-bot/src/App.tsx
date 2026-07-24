import { useEffect, useState } from 'react';
import AdminPage from './AdminPage';
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

const OrbitIcon = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true">
    <circle cx="24" cy="24" r="7" />
    <ellipse cx="24" cy="24" rx="20" ry="9" />
    <ellipse cx="24" cy="24" rx="20" ry="9" transform="rotate(60 24 24)" />
  </svg>
);

export default function App() {
  const isAdmin = window.location.pathname === '/admin';
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const t = translations[language];

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = isAdmin ? t.document.adminTitle : t.document.landingTitle;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        isAdmin ? t.document.adminDescription : t.document.landingDescription,
      );
  }, [isAdmin, language, t.document]);

  const changeLanguage = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    persistLanguage(nextLanguage);
  };

  if (isAdmin) {
    return <AdminPage language={language} onLanguageChange={changeLanguage} />;
  }

  return (
    <div className="site-shell" id="top">
      <header className="site-header">
        <a className="brand" href="#top">
          <span className="brand-mark">AO</span>
          <span>
            <strong>AITuber OnAir</strong>
            <small>{t.brand.landingSubtitle}</small>
          </span>
        </a>
        <nav aria-label={t.nav.label}>
          <a href="#features">{t.nav.features}</a>
          <a href="#how-it-works">{t.nav.howItWorks}</a>
          <a
            href="https://github.com/shinshin86/aituber-onair"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </nav>
        <div className="site-header-actions">
          <LanguageSwitch language={language} onChange={changeLanguage} />
          <a className="header-cta" href="#quick-start">
            {t.nav.startBuilding}
          </a>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <i /> @aituber-onair/core
            </span>
            <h1>
              {t.hero.titleLead}
              <br />
              <em>{t.hero.titleEmphasis}</em>
            </h1>
            <p>{t.hero.description}</p>
            <div className="hero-actions">
              <a className="primary-button" href="#quick-start">
                {t.hero.explore} <ArrowIcon />
              </a>
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  document
                    .querySelector<HTMLButtonElement>('.support-launcher')
                    ?.click()
                }
              >
                {t.hero.meetMiko} <span aria-hidden="true">↘</span>
              </button>
            </div>
            <div className="hero-meta">
              <span>{t.hero.typeScriptFirst}</span>
              <span>{t.hero.browserServer}</span>
              <span>{t.hero.providerAgnostic}</span>
            </div>
          </div>

          <div className="hero-visual" aria-label={t.diagram.label}>
            <div className="orbit orbit--outer" />
            <div className="orbit orbit--inner" />
            <div className="core-node">
              <OrbitIcon />
              <strong>CORE</strong>
              <small>{t.diagram.orchestration}</small>
            </div>
            <div className="satellite satellite--chat">
              <span>01</span>
              <strong>CHAT</strong>
              <small>{t.diagram.streamingLlm}</small>
            </div>
            <div className="satellite satellite--voice">
              <span>02</span>
              <strong>VOICE</strong>
              <small>{t.diagram.expressiveTts}</small>
            </div>
            <div className="satellite satellite--avatar">
              <span>03</span>
              <strong>AVATAR</strong>
              <small>{t.diagram.liveReaction}</small>
            </div>
            <div className="visual-caption">
              {t.diagram.captionLead}
              <br />
              {t.diagram.captionEnd}
            </div>
          </div>
        </section>

        <section
          className="signal-strip"
          aria-label={t.diagram.capabilitiesLabel}
        >
          <span>PROCESSING_START</span>
          <i />
          <span>ASSISTANT_PARTIAL</span>
          <i />
          <span>SPEECH_START</span>
          <i />
          <span>SPEECH_END</span>
        </section>

        <section className="feature-section" id="features">
          <div className="section-intro">
            <span className="eyebrow">{t.features.eyebrow}</span>
            <h2>{t.features.title}</h2>
            <p>{t.features.description}</p>
          </div>
          <div className="feature-grid">
            <article>
              <span className="feature-index">01 / STREAM</span>
              <h3>{t.features.streamTitle}</h3>
              <p>{t.features.streamDescription}</p>
              <code>ASSISTANT_PARTIAL → UI</code>
            </article>
            <article>
              <span className="feature-index">02 / SPEAK</span>
              <h3>{t.features.speakTitle}</h3>
              <p>{t.features.speakDescription}</p>
              <code>SPEECH_START → TTS</code>
            </article>
            <article>
              <span className="feature-index">03 / REACT</span>
              <h3>{t.features.reactTitle}</h3>
              <p>{t.features.reactDescription}</p>
              <code>[happy] → bounce + smile</code>
            </article>
          </div>
        </section>

        <section className="flow-section" id="how-it-works">
          <div>
            <span className="eyebrow">{t.flow.eyebrow}</span>
            <h2>{t.flow.title}</h2>
          </div>
          <ol>
            <li>
              <span>1</span>
              <div>
                <strong>{t.flow.coreTitle}</strong>
                <p>{t.flow.coreDescription}</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>{t.flow.proxyTitle}</strong>
                <p>{t.flow.proxyDescription}</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>{t.flow.audioTitle}</strong>
                <p>{t.flow.audioDescription}</p>
              </div>
            </li>
          </ol>
        </section>

        <section className="quick-start" id="quick-start">
          <div>
            <span className="eyebrow">{t.quickStart.eyebrow}</span>
            <h2>{t.quickStart.title}</h2>
          </div>
          <div className="install-card">
            <span>{t.quickStart.terminal}</span>
            <code>npm install @aituber-onair/core</code>
            <a
              href="https://github.com/shinshin86/aituber-onair/tree/main/packages/core"
              target="_blank"
              rel="noreferrer"
            >
              {t.quickStart.documentation} <ArrowIcon />
            </a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <span>AITuber OnAir</span>
        <span>{t.footer.example}</span>
      </footer>
      <SupportWidget language={language} onLanguageChange={changeLanguage} />
    </div>
  );
}
