import { useEffect } from 'react';
import AdminPage from './AdminPage';
import SupportWidget from './components/SupportWidget';

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

  useEffect(() => {
    if (!isAdmin) {
      document.title = 'AITuber OnAir Core — Character Support Bot';
    }
  }, [isAdmin]);

  if (isAdmin) return <AdminPage />;

  return (
    <div className="site-shell" id="top">
      <header className="site-header">
        <a className="brand" href="#top">
          <span className="brand-mark">AO</span>
          <span>
            <strong>AITuber OnAir</strong>
            <small>Open source character toolkit</small>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a
            href="https://github.com/shinshin86/aituber-onair"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </nav>
        <a className="header-cta" href="#quick-start">
          Start building
        </a>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <i /> @aituber-onair/core
            </span>
            <h1>
              Give your AI
              <br />
              <em>a face and a voice.</em>
            </h1>
            <p>
              One event-driven core connects streaming chat, expressive speech,
              memory, and animated characters—without locking your app to one
              provider.
            </p>
            <div className="hero-actions">
              <a className="primary-button" href="#quick-start">
                Explore the core <ArrowIcon />
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
                Meet Miko <span aria-hidden="true">↘</span>
              </button>
            </div>
            <div className="hero-meta">
              <span>TypeScript first</span>
              <span>Browser + server</span>
              <span>Provider agnostic</span>
            </div>
          </div>

          <div className="hero-visual" aria-label="AITuber OnAir event flow">
            <div className="orbit orbit--outer" />
            <div className="orbit orbit--inner" />
            <div className="core-node">
              <OrbitIcon />
              <strong>CORE</strong>
              <small>orchestration</small>
            </div>
            <div className="satellite satellite--chat">
              <span>01</span>
              <strong>CHAT</strong>
              <small>streaming LLM</small>
            </div>
            <div className="satellite satellite--voice">
              <span>02</span>
              <strong>VOICE</strong>
              <small>expressive TTS</small>
            </div>
            <div className="satellite satellite--avatar">
              <span>03</span>
              <strong>AVATAR</strong>
              <small>live reaction</small>
            </div>
            <div className="visual-caption">
              Events in.
              <br />
              Character out.
            </div>
          </div>
        </section>

        <section className="signal-strip" aria-label="Core capabilities">
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
            <span className="eyebrow">BUILT FOR CHARACTERS</span>
            <h2>Everything moves through one clear event flow.</h2>
            <p>
              Keep the experience responsive while swapping the providers and
              presentation layers underneath it.
            </p>
          </div>
          <div className="feature-grid">
            <article>
              <span className="feature-index">01 / STREAM</span>
              <h3>Responses arrive as they happen.</h3>
              <p>
                Partial-response events let your interface feel immediate while
                the complete answer moves into speech.
              </p>
              <code>ASSISTANT_PARTIAL → UI</code>
            </article>
            <article>
              <span className="feature-index">02 / SPEAK</span>
              <h3>Voice is part of the orchestration.</h3>
              <p>
                Route text through interchangeable TTS engines and receive the
                audio bytes your character animation needs.
              </p>
              <code>SPEECH_START → TTS</code>
            </article>
            <article>
              <span className="feature-index">03 / REACT</span>
              <h3>Emotion becomes visible behavior.</h3>
              <p>
                Parse screenplay emotion tags into avatar reactions, blinks,
                idle motion, and audio-driven lip sync.
              </p>
              <code>[happy] → bounce + smile</code>
            </article>
          </div>
        </section>

        <section className="flow-section" id="how-it-works">
          <div>
            <span className="eyebrow">HOW THIS EXAMPLE WORKS</span>
            <h2>
              Keys stay on the server. The character stays in the browser.
            </h2>
          </div>
          <ol>
            <li>
              <span>1</span>
              <div>
                <strong>Core streams through a same-origin endpoint</strong>
                <p>
                  The browser uses the OpenAI-compatible adapter with no API
                  key.
                </p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>The Node proxy owns provider credentials</strong>
                <p>
                  LLM and TTS keys are loaded from a gitignored settings file.
                </p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Audio bytes drive Miko’s mouth</strong>
                <p>
                  Web Audio analysis turns speech amplitude into live lip sync.
                </p>
              </div>
            </li>
          </ol>
        </section>

        <section className="quick-start" id="quick-start">
          <div>
            <span className="eyebrow">QUICK START</span>
            <h2>Build a character, not a pile of integrations.</h2>
          </div>
          <div className="install-card">
            <span>TERMINAL</span>
            <code>npm install @aituber-onair/core</code>
            <a
              href="https://github.com/shinshin86/aituber-onair/tree/main/packages/core"
              target="_blank"
              rel="noreferrer"
            >
              Read the documentation <ArrowIcon />
            </a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <span>AITuber OnAir</span>
        <span>Character Support Bot example</span>
      </footer>
      <SupportWidget />
    </div>
  );
}
