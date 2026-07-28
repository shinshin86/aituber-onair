import { useCallback, useEffect, useRef, useState } from 'react';
import LanguageSwitch from './components/LanguageSwitch';
import SupportWidget from './components/SupportWidget';
import {
  getInitialLanguage,
  persistLanguage,
  TSUKUYOMI_CORPUS_URL,
  translations,
  type Language,
} from './i18n';
import { useGeminiNanoStatus } from './hooks/useGeminiNanoStatus';
import './styles.css';

const DetailIcon = ({ children }: { children: string }) => (
  <span className="detail-icon" aria-hidden="true">
    {children}
  </span>
);

export default function App() {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const [supportBusy, setSupportBusy] = useState(false);
  const supportBusyRef = useRef(false);
  const t = translations[language];
  const geminiNano = useGeminiNanoStatus(language);
  const canPrepare =
    geminiNano.status === 'downloadable' || geminiNano.status === 'downloading';

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = t.document.title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', t.document.description);
  }, [language, t.document.description, t.document.title]);

  const changeLanguage = useCallback((nextLanguage: Language) => {
    if (supportBusyRef.current) return;
    setLanguage(nextLanguage);
    persistLanguage(nextLanguage);
  }, []);

  const handleSupportBusyChange = useCallback((busy: boolean) => {
    supportBusyRef.current = busy;
    setSupportBusy(busy);
  }, []);

  return (
    <div className="page-shell" id="top">
      <header className="site-header">
        <a className="site-brand" href="#top">
          <span>AO</span>
          <strong>
            AITuber OnAir
            <small>Core Lab</small>
          </strong>
        </a>
        <div className="header-actions">
          <a
            href="https://github.com/shinshin86/aituber-onair/tree/main/packages/core"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <LanguageSwitch
            language={language}
            onChange={changeLanguage}
            disabled={supportBusy || geminiNano.isPreparing}
          />
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">{t.hero.eyebrow}</span>
            <h1>
              {t.hero.titleLead}
              <em>{t.hero.titleEmphasis}</em>
            </h1>
            <p>{t.hero.description}</p>
            <div className="hero-badges" aria-label="Example features">
              <span>{t.hero.localBadge}</span>
              <span>{t.hero.keyBadge}</span>
              <span>{t.hero.characterBadge}</span>
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
                href="https://github.com/shinshin86/aituber-onair/tree/main/packages/core"
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
                <small>{t.model.eyebrow}</small>
                <h2>{t.model.title}</h2>
              </div>
            </div>
            <p className="model-description">{t.model.description}</p>
            <div className={`model-state model-state--${geminiNano.status}`}>
              <span aria-hidden="true" />
              <p>{t.model[geminiNano.status]}</p>
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
            <div className="model-flow" aria-hidden="true">
              <span>Gemini Nano</span>
              <i>→</i>
              <span>Core</span>
              <i>→</i>
              <span>Miko</span>
            </div>
          </aside>
        </section>

        <section className="detail-grid">
          <article>
            <DetailIcon>◎</DetailIcon>
            <h2>{t.details.chatTitle}</h2>
            <p>{t.details.chatDescription}</p>
          </article>
          <article>
            <DetailIcon>⌁</DetailIcon>
            <h2>{t.details.voiceTitle}</h2>
            <p>{t.details.voiceDescription}</p>
          </article>
          <article>
            <DetailIcon>✦</DetailIcon>
            <h2>{t.details.avatarTitle}</h2>
            <p>{t.details.avatarDescription}</p>
          </article>
        </section>
      </main>

      <footer className="site-footer">
        <span>AITuber OnAir</span>
        <span>{t.footer}</span>
        <a href={TSUKUYOMI_CORPUS_URL} target="_blank" rel="noreferrer">
          <span>{t.voice.credit}</span>
          <span>{t.voice.creditCorpus}</span>
          <span>{TSUKUYOMI_CORPUS_URL}</span>
        </a>
      </footer>

      <SupportWidget
        language={language}
        onLanguageChange={changeLanguage}
        status={geminiNano.status}
        onPrepare={geminiNano.prepareModel}
        isPreparing={geminiNano.isPreparing}
        onBusyChange={handleSupportBusyChange}
      />
    </div>
  );
}
