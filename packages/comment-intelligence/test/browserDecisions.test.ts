import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sampleModule = '../examples/live-comment-filter-sample/src/main.ts';
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

function mockDecisions() {
  vi.mocked(fetch).mockImplementation(async (_url, init) => {
    const body = JSON.parse(init?.body as string);
    const answer = { type: 'choice', choice: 'yes', confidence: 0.95 };
    const answers = Array.isArray(body.questions)
      ? body.questions.map((q: { name: string }) => ({
          ...answer,
          name: q.name,
        }))
      : Object.fromEntries(
          Object.keys(body.questions).map((name) => [name, answer])
        );
    return new Response(JSON.stringify({ answers }), { status: 200 });
  });
}

describe('browser Decisions connections', () => {
  beforeEach(async () => {
    vi.resetModules();
    document.body.innerHTML = '<div id="app"></div>';
    vi.stubGlobal('fetch', vi.fn());
    HTMLElement.prototype.scrollIntoView = vi.fn();
    await import(sampleModule);
    change('analysis-engine', 'jev');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it.each([
    ['liquid', 'd1.1', '/api/liquid/systemone', 'Authorization'],
    ['google', 'gemini-decision-1', '/api/google/decisions', 'x-goog-api-key'],
    ['openai', 'gpt-6-luna', '/api/openai/decisions', 'Authorization'],
    ['cloudflare', 'clef', '/api/cloudflare/account-1/clef', 'Authorization'],
  ])(
    'wires %s model, credentials and fixed local route',
    async (transport, model, url, header) => {
      mockDecisions();
      change('jev-transport', transport);
      expect(field('decision-model').value).toBe(model);
      expect(field('jev-key-hint').textContent).toContain(
        'CORS has not been verified'
      );
      if (transport === 'cloudflare')
        change('decision-account', 'account-1', 'input');
      change('jev-api-key', `${transport}-test-key`, 'input');
      run();
      await vi.waitFor(() =>
        expect(field('filter-from-editor').disabled).toBe(false)
      );
      expect(fetch).toHaveBeenCalledOnce();
      const [actualUrl, init] = vi.mocked(fetch).mock.calls[0];
      expect(actualUrl).toBe(url);
      expect(JSON.parse(init?.body as string).model).toBe(model);
      expect(new Headers(init?.headers).get(header)).toBe(
        `${header === 'Authorization' ? 'Bearer ' : ''}${transport}-test-key`
      );
      expect(init?.redirect).toBe('manual');
      expect(document.getElementById('debug')?.textContent).toContain(
        '"usedLLM": true'
      );
      expect(
        document.querySelector('[data-status-message]')?.textContent
      ).toContain('Completed with Decisions');
      expect(localStorage.length).toBe(0);
      expect(sessionStorage.length).toBe(0);
    }
  );

  it('retains separate in-memory keys and model choices across connections and language', () => {
    change('topic', 'Keep this topic', 'input');
    change('recent-reply', 'Keep this reply', 'input');
    for (const transport of [
      'typesafe',
      'openrouter',
      'liquid',
      'google',
      'openai',
      'cloudflare',
    ]) {
      change('jev-transport', transport);
      expect(field('jev-api-key').value).toBe('');
      change('jev-api-key', `${transport}-test-key`, 'input');
    }
    change('decision-account', 'account-1', 'input');
    change('decision-model', 'clef-omni');
    change('jev-transport', 'liquid');
    change('decision-model', 'd1-ultra');
    change('jev-transport', 'openrouter');
    expect(field('decision-model').value).toBe('~typesafe/jev-latest');
    change('decision-model', '~typesafe/jev-custom', 'input');
    for (const transport of [
      'typesafe',
      'openrouter',
      'liquid',
      'google',
      'openai',
      'cloudflare',
    ]) {
      change('jev-transport', transport);
      expect(field('jev-api-key').value).toBe(`${transport}-test-key`);
    }
    expect(field('decision-model').value).toBe('clef-omni');
    expect(field('decision-account').value).toBe('account-1');
    expect(field('topic').value).toBe('Keep this topic');
    expect(field('recent-reply').value).toBe('Keep this reply');
    change('ui-language', 'ja');
    expect(field('decision-model').value).toBe('clef-omni');
    expect(field('jev-api-key').value).toBe('cloudflare-test-key');
    expect(document.body.textContent).toContain('Cloudflare APIトークン');
    change('jev-transport', 'liquid');
    expect(field('decision-model').value).toBe('d1-ultra');
    change('jev-transport', 'openrouter');
    expect(field('decision-model').value).toBe('~typesafe/jev-custom');
    expect(fetch).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it.each([
    '',
    '../other',
    'account?target=https://example.com',
    'account/path',
  ])('rejects invalid Cloudflare account %s without a request', (account) => {
    change('jev-transport', 'cloudflare');
    change('jev-api-key', 'test-key', 'input');
    change('decision-account', account, 'input');
    run();
    expect(field('analysis-error').hidden).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends chosen Liquid, Cloudflare and OpenRouter models', async () => {
    mockDecisions();
    for (const [transport, model] of [
      ['liquid', 'd1-ultra'],
      ['cloudflare', 'clef-flash'],
      ['openrouter', '~typesafe/jev-custom'],
    ]) {
      change('jev-transport', transport);
      change('jev-api-key', 'test-key', 'input');
      if (transport === 'cloudflare')
        change('decision-account', 'account-1', 'input');
      change(
        'decision-model',
        model,
        transport === 'openrouter' ? 'input' : 'change'
      );
      run();
      await vi.waitFor(() =>
        expect(field('filter-from-editor').disabled).toBe(false)
      );
      const calls = vi.mocked(fetch).mock.calls;
      const [url, init] = calls[calls.length - 1];
      expect(JSON.parse(init?.body as string).model).toBe(model);
      if (transport === 'cloudflare')
        expect(url).toBe('/api/cloudflare/account-1/clef-flash');
    }
  });

  it('disables Microsoft fields and execution, including form submission and language switches', () => {
    change('jev-transport', 'microsoft');
    for (const id of [
      'decision-model',
      'decision-endpoint',
      'jev-api-key',
      'filter-from-editor',
    ])
      expect(field(id).disabled).toBe(true);
    expect(field('jev-transport').disabled).toBe(false);
    expect(field('jev-key-hint').textContent).toMatch(
      /^Per-user endpoints.*Microsoft Foundry/
    );
    field('controls').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );
    expect(field('analysis-error').textContent).toContain('unavailable');
    change('ui-language', 'ja');
    expect(field('decision-endpoint').disabled).toBe(true);
    expect(field('jev-api-key').disabled).toBe(true);
    expect(field('filter-from-editor').disabled).toBe(true);
    expect(field('jev-key-hint').textContent).toMatch(
      /^利用者ごと.*Microsoft Foundry/
    );
    change('analysis-engine', 'rules');
    expect(field('filter-from-editor').disabled).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('invalidates in-flight results when the account or model changes', async () => {
    let finish!: (response: Response) => void;
    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    change('jev-transport', 'cloudflare');
    change('decision-account', 'account-1', 'input');
    change('jev-api-key', 'test-key', 'input');
    run();
    change('decision-account', 'account-2', 'input');
    change('decision-model', 'clef-flash');
    finish(new Response('{}', { status: 500 }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(field('incoming-lead').textContent).toContain(
      'Click Run comment filter'
    );
    expect(field('llm-fallback').hidden).toBe(true);
  });
});
