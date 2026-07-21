import './App.css';
import SupportWidget from './components/SupportWidget';

const ArrowIcon = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M4 10h11m-4-4 4 4-4 4" />
  </svg>
);

function App() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="site-brand" href="#top" aria-label="OnAir Docs home">
          <span className="site-brand-mark">AO</span>
          <span>OnAir Docs</span>
        </a>
        <nav className="site-nav" aria-label="Main navigation">
          <a href="#guides">Guides</a>
          <a href="#reference">API Reference</a>
          <a
            href="https://github.com/shinshin86/aituber-onair"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </nav>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-copy">
            <span className="eyebrow">@aituber-onair/chat</span>
            <h1>One chat interface. Every character you can imagine.</h1>
            <p>
              Connect OpenAI, Claude, and Gemini through a consistent, strongly
              typed API built for responsive AI character experiences.
            </p>
            <div className="hero-actions">
              <a className="primary-link" href="#quick-start">
                Start building <ArrowIcon />
              </a>
              <a
                className="secondary-link"
                href="https://github.com/shinshin86/aituber-onair/tree/main/packages/chat"
                target="_blank"
                rel="noreferrer"
              >
                Read the README
              </a>
            </div>
          </div>

          <div className="hero-code" aria-label="Quick start code example">
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

        <section className="trust-strip" aria-label="Package highlights">
          <span>Typed provider abstraction</span>
          <span>Streaming by default</span>
          <span>Browser and server runtimes</span>
        </section>

        <section className="docs-section" id="guides">
          <div className="section-heading">
            <span className="eyebrow">Build with confidence</span>
            <h2>Everything a conversational product needs</h2>
            <p>
              Keep the application layer stable while providers and models
              evolve underneath it.
            </p>
          </div>

          <div className="feature-grid">
            <article className="feature-card">
              <span className="feature-number">01</span>
              <h3>Unified providers</h3>
              <p>
                Create OpenAI, Claude, Gemini, and other services from one
                factory with a consistent message contract.
              </p>
              <a href="#reference">
                Explore providers <ArrowIcon />
              </a>
            </article>
            <article className="feature-card">
              <span className="feature-number">02</span>
              <h3>Token streaming</h3>
              <p>
                Render each partial response as it arrives so character and
                support experiences feel immediate.
              </p>
              <a href="#quick-start">
                View quick start <ArrowIcon />
              </a>
            </article>
            <article className="feature-card">
              <span className="feature-number">03</span>
              <h3>Tools, vision, and MCP</h3>
              <p>
                Move beyond text with model-aware capabilities and structured
                integrations.
              </p>
              <a
                href="https://github.com/shinshin86/aituber-onair/tree/main/packages/chat#features"
                target="_blank"
                rel="noreferrer"
              >
                See capabilities <ArrowIcon />
              </a>
            </article>
          </div>
        </section>

        <section className="quick-start-section" id="quick-start">
          <div>
            <span className="eyebrow">Quick start</span>
            <h2>From install to first response in minutes.</h2>
          </div>
          <div className="install-command">
            <code>npm install @aituber-onair/chat</code>
            <span>npm</span>
          </div>
        </section>

        <section className="reference-section" id="reference">
          <span>Need a hand?</span>
          <p>
            Open the support widget to ask Onair-chan about installation,
            providers, streaming, tools, vision, or MCP.
          </p>
        </section>
      </main>

      <footer className="site-footer">
        <span>AITuber OnAir</span>
        <span>Support widget example</span>
      </footer>

      <SupportWidget />
    </div>
  );
}

export default App;
