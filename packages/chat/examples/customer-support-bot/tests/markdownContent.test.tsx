import { createElement, Fragment, isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import MessageList from '../src/components/MessageList';
import { renderMarkdownContent } from '../src/components/markdownContent';

const renderMarkdown = (content: string): string =>
  renderToStaticMarkup(
    createElement(Fragment, null, ...renderMarkdownContent(content)),
  );

describe('support message markdown', () => {
  it('renders the supported block and inline subset', () => {
    const html = renderMarkdown(`# Setup
Use **bold**, *italic*, and \`npm run build\`.
Keep this line.

- First
* Second

1. One
2. Two

## Notes
### Details`);

    expect(html).toContain('<h1>Setup</h1>');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain(
      '<code class="markdown-inline-code">npm run build</code>',
    );
    expect(html).toContain('<br/>Keep this line.');
    expect(html).toContain('<ul><li>First</li><li>Second</li></ul>');
    expect(html).toContain('<ol><li>One</li><li>Two</li></ol>');
    expect(html).toContain('<h2>Notes</h2>');
    expect(html).toContain('<h3>Details</h3>');
  });

  it('renders fenced code safely with an optional language label', () => {
    const html = renderMarkdown(`\`\`\`tsx
const node = <script>alert('no')</script>;
\`\`\``);

    expect(html).toContain('<div class="markdown-code-label">tsx</div>');
    expect(html).toContain(
      '&lt;script&gt;alert(&#x27;no&#x27;)&lt;/script&gt;',
    );
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('data-in-progress');
  });

  it('keeps an unclosed code fence visible while streaming', () => {
    const inProgress = renderMarkdown(`\`\`\`ts
const streaming = true;`);
    const complete = renderMarkdown(`\`\`\`ts
const streaming = true;
\`\`\``);

    expect(inProgress).toContain('markdown-code-block--in-progress');
    expect(inProgress).toContain('data-in-progress="true"');
    expect(inProgress).toContain('const streaming = true;');
    expect(complete).not.toContain('markdown-code-block--in-progress');
    expect(complete).not.toContain('data-in-progress');
  });

  it('leaves unclosed emphasis literal until a later chunk closes it', () => {
    const inProgress = 'Still **streaming';
    const inProgressHtml = renderMarkdown(inProgress);
    const completeHtml = renderMarkdown(`${inProgress}**`);
    const italicInProgress = 'Still *streaming';

    expect(inProgressHtml).toContain(inProgress);
    expect(inProgressHtml).not.toContain('<strong>');
    expect(completeHtml).toContain('<strong>streaming</strong>');
    expect(renderMarkdown(italicInProgress)).toContain(italicInProgress);
    expect(renderMarkdown(italicInProgress)).not.toContain('<em>');
    expect(renderMarkdown('*waiting **next')).toContain('*waiting **next');
    expect(renderMarkdown('*waiting **next')).not.toContain('<em>');
  });

  it('restricts links to HTTP(S) and escapes raw HTML', () => {
    const html = renderMarkdown(
      '[Docs](https://example.com/docs) [Unsafe](javascript:alert(1)) <b>raw</b>',
    );

    expect(html).toContain(
      '<a href="https://example.com/docs" target="_blank" rel="noopener noreferrer">Docs</a>',
    );
    expect(html).toContain(' [Unsafe](javascript:alert(1)) ');
    expect(html).not.toContain('href="javascript:');
    expect(html).toContain('&lt;b&gt;raw&lt;/b&gt;');
    expect(html).not.toContain('<b>raw</b>');
  });

  it('renders markdown for assistant messages only and keeps the cursor', () => {
    const html = renderToStaticMarkup(
      <MessageList
        language="en"
        messages={[
          {
            id: 'user',
            role: 'user',
            content: '**user** <b>plain</b>',
          },
          {
            id: 'assistant',
            role: 'assistant',
            content: '**assistant**',
            state: 'streaming',
          },
        ]}
      />,
    );

    expect(html).toContain('**user** &lt;b&gt;plain&lt;/b&gt;');
    expect(html).not.toContain('<strong>user</strong>');
    expect(html).toContain('<strong>assistant</strong>');
    expect(html).toContain(
      '<p><strong>assistant</strong><span class="stream-cursor"',
    );
  });

  it('keeps block keys stable when a streaming delimiter closes', () => {
    const inProgress = renderMarkdownContent(
      'Still **streaming\n\nNext paragraph',
    );
    const complete = renderMarkdownContent(
      'Still **streaming**\n\nNext paragraph',
    );

    expect(isValidElement(inProgress[0]) && inProgress[0].key).toBe(
      isValidElement(complete[0]) && complete[0].key,
    );
    expect(isValidElement(inProgress[1]) && inProgress[1].key).toBe(
      isValidElement(complete[1]) && complete[1].key,
    );
  });
});
