import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

function field(id: string): HTMLInputElement {
  return document.getElementById(id) as HTMLInputElement;
}
function change(id: string, value: string, event = 'change') {
  field(id).value = value;
  field(id).dispatchEvent(new Event(event, { bubbles: true }));
}
function run() {
  field('filter-from-editor').click();
}
function debug() {
  return JSON.parse(document.getElementById('debug')?.textContent ?? '{}');
}

// Load the Vite example without adding it to the library declaration build.
const sampleModule = '../examples/live-comment-filter-sample/src/main.ts';

describe('browser Jev integration', () => {
  beforeEach(async () => {
    vi.resetModules();
    document.body.innerHTML = '<div id="app"></div>';
    vi.stubGlobal('fetch', vi.fn());
    HTMLElement.prototype.scrollIntoView = vi.fn();
    await import(sampleModule);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('preserves edited topic and history across engine switches and localizes Jev controls', () => {
    change('topic', 'Custom topic', 'input');
    change('analysis-engine', 'jev');
    expect(field('topic').value).toBe('Custom topic');
    expect(field('jev-settings').hidden).toBe(false);
    expect(field('openai-settings').hidden).toBe(true);
    change('recent-reply', 'An actual prior reply', 'input');
    change('analysis-engine', 'rules');
    expect(field('jev-api-key').disabled).toBe(true);
    change('analysis-engine', 'jev');
    expect(field('recent-reply').value).toBe('An actual prior reply');
    change('ui-language', 'ja');
    expect(document.body.textContent).toContain('OpenRouter APIキー');
    expect(document.body.textContent).toContain('直近のAIの回答');
  });

  it('requires a key for Jev and never makes requests in rules mode', async () => {
    change('analysis-engine', 'jev');
    run();
    expect(field('analysis-error').hidden).toBe(false);
    expect(
      document.querySelector('[data-status-message]')?.textContent
    ).toContain('OpenRouter');
    expect(fetch).not.toHaveBeenCalled();
    change('analysis-engine', 'rules');
    run();
    await vi.waitFor(() => expect(debug().usedLLM).toBe(false));
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends Jev decisions with topic and history and shows semantic results', async () => {
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      expect(url).toBe('https://openrouter.ai/api/alpha/decisions');
      expect((init?.headers as Record<string, string>).Authorization).toBe(
        'Bearer test-key'
      );
      const body = JSON.parse(init?.body as string);
      expect(body.model).toBe('~typesafe/jev-latest');
      expect(JSON.stringify(body.state)).toContain('speech synthesis');
      expect(JSON.stringify(body.state)).toContain(
        'This speech synthesis can run on your own computer.'
      );
      const answers = Object.fromEntries(
        Object.keys(body.questions).map((key) => [
          key,
          {
            type: 'choice',
            choice: key.endsWith('alreadyAnswered') ? 'no' : 'yes',
            confidence: 0.95,
          },
        ])
      );
      return new Response(JSON.stringify({ answers }), { status: 200 });
    });
    (
      document.querySelector('[data-preset="jev"]') as HTMLButtonElement
    ).click();
    change('analysis-engine', 'jev');
    change('jev-api-key', 'test-key', 'input');
    run();
    expect(field('filter-from-editor').disabled).toBe(true);
    expect(field('filter-from-editor').textContent).toBe('Analyzing…');
    expect(
      document
        .querySelector('[data-analysis-status]')
        ?.getAttribute('data-state')
    ).toBe('running');
    await vi.waitFor(() => expect(debug().usedLLM).toBe(true));
    expect(debug().semanticAssessments).toHaveLength(3);
    expect(document.querySelectorAll('.comparison-card')).toHaveLength(3);
    expect(
      document.querySelectorAll('.comparison-card.is-selected')
    ).toHaveLength(1);
    expect(field('candidate-comparison').textContent).toContain(
      'Confidence 95%'
    );
    expect(field('candidate-comparison').textContent).toContain(
      'Already answered?'
    );
    expect(
      document.querySelector('[data-status-message]')?.textContent
    ).toContain('Completed with Jev (OpenRouter)');
    expect(field('filter-from-editor').textContent).toBe('Run comment filter');
    expect(field('llm-fallback').hidden).toBe(true);
    expect(field('filter-from-editor').disabled).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('shows HTTP failures as rule fallback without leaking response content', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('secret upstream content', { status: 401 })
    );
    change('analysis-engine', 'jev');
    change('jev-api-key', 'test-key', 'input');
    run();
    await vi.waitFor(() => expect(debug().usedLLM).toBe(false));
    expect(field('llm-fallback').hidden).toBe(false);
    expect(field('llm-fallback').textContent).toContain('401');
    expect(field('candidate-comparison').textContent).toContain(
      'Not evaluated'
    );
    expect(
      document.querySelector('.comparison-list')?.textContent
    ).not.toContain('Confidence');
    expect(
      document.querySelector('[data-status-message]')?.textContent
    ).toContain('Jev (OpenRouter) failed · showing rules results');
    expect(
      document
        .querySelector('[data-analysis-status]')
        ?.getAttribute('data-state')
    ).toBe('warning');
    expect(field('llm-fallback').textContent).not.toContain(
      'secret upstream content'
    );
    expect(field('filter-from-editor').disabled).toBe(false);
  });

  it('shows low-confidence judgments as retained rules and escapes candidate content', async () => {
    vi.mocked(fetch).mockImplementation(async (_url, init) => {
      const body = JSON.parse(init?.body as string);
      return new Response(
        JSON.stringify({
          answers: Object.fromEntries(
            Object.keys(body.questions).map((key) => [
              key,
              { type: 'choice', choice: 'uncertain', confidence: 0.4 },
            ])
          ),
        })
      );
    });
    change('analysis-engine', 'jev');
    change('jev-api-key', 'test-key', 'input');
    change('comments', 'Viewer: How does <img src=x> work?', 'input');
    run();
    await vi.waitFor(() =>
      expect(field('filter-from-editor').disabled).toBe(false)
    );
    expect(field('candidate-comparison').textContent).toContain('Uncertain');
    expect(field('candidate-comparison').textContent).toContain(
      'Rule signal retained'
    );
    expect(field('candidate-comparison').textContent).toContain(
      'Not evaluated'
    );
    expect(field('candidate-comparison').textContent).toContain('<img src=x>');
    expect(field('candidate-comparison').querySelector('img')).toBeNull();
    change('analysis-engine', 'rules');
    expect(document.querySelectorAll('.comparison-card')).toHaveLength(0);
    run();
    await vi.waitFor(() =>
      expect(field('filter-from-editor').disabled).toBe(false)
    );
    expect(
      document.querySelector('.comparison-list')?.textContent
    ).not.toContain('Confidence');
  });

  it('shows elapsed time while waiting and ignores repeated submits', async () => {
    let finish!: (response: Response) => void;
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    change('analysis-engine', 'openai');
    change('openai-api-key', 'test-key', 'input');
    run();
    expect(
      document.querySelector('[data-status-message]')?.textContent
    ).toContain('OpenAI / gpt-5.4-nano');
    document
      .getElementById('controls')
      ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.waitFor(() =>
      expect(
        document.querySelector('[data-status-time]')?.textContent
      ).not.toBe('0.0s')
    );
    finish(
      new Response(
        JSON.stringify({
          output_text: JSON.stringify({ selectedCommentIds: [] }),
        }),
        { status: 200 }
      )
    );
    await vi.waitFor(() =>
      expect(field('filter-from-editor').disabled).toBe(false)
    );
    expect(
      document
        .querySelector('[data-analysis-status]')
        ?.getAttribute('data-state')
    ).toBe('success');
  });

  it('does not report an API success when Jev has no eligible comments', async () => {
    change('analysis-engine', 'jev');
    change('jev-api-key', 'test-key', 'input');
    change('comments', '', 'input');
    run();
    await vi.waitFor(() =>
      expect(field('filter-from-editor').disabled).toBe(false)
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(
      document.querySelector('[data-status-message]')?.textContent
    ).toContain('no API request sent');
  });

  it('does not replace pending input with results from an earlier request', async () => {
    let finish!: (response: Response) => void;
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    change('analysis-engine', 'jev');
    change('jev-api-key', 'test-key', 'input');
    run();
    change('analysis-engine', 'rules');
    finish(new Response('{}', { status: 500 }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(field('incoming-lead').textContent).toContain(
      'Click Run comment filter'
    );
    expect(field('llm-fallback').hidden).toBe(true);
  });
});
