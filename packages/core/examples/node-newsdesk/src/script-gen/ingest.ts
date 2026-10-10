import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';

const URL_PATTERN = /^https?:\/\//i;

interface TextInput extends AsyncIterable<string | Buffer> {
  setEncoding(encoding: BufferEncoding): void;
}

export interface IngestSourceOptions {
  input?: TextInput;
  fetchImpl?: typeof fetch;
}

function normalizeText(text: string): string {
  return text.replaceAll('\r\n', '\n').replaceAll('\r', '\n').trim();
}

async function readStandardInput(stream: TextInput): Promise<string> {
  stream.setEncoding('utf8');
  let input = '';
  for await (const chunk of stream) input += chunk.toString();
  return normalizeText(input);
}

function extractArticleText(html: string, url: string): string {
  const markup = /<(?:html|body)\b/i.test(html)
    ? html
    : `<!doctype html><html><body>${html}</body></html>`;
  const { document } = parseHTML(markup);
  const base = document.createElement('base');
  base.setAttribute('href', url);
  document.head?.prepend(base);
  for (const element of Array.from(
    document.querySelectorAll(
      'nav, header, footer, aside, script, style, noscript',
    ),
  )) {
    element.remove();
  }

  const fallbackText = document.body?.textContent ?? '';
  const article = new Readability(document).parse();
  const text = article?.textContent || fallbackText;
  return normalizeText(text).replace(/\n{3,}/g, '\n\n');
}

async function readUrl(url: string, fetchImpl: typeof fetch): Promise<string> {
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${url}: ${response.status} ${response.statusText}`.trim(),
    );
  }
  const body = await response.text();
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.startsWith('text/plain')) return normalizeText(body);
  if (contentType.includes('html') || /<[^>]+>/.test(body)) {
    return extractArticleText(body, url);
  }
  return normalizeText(body);
}

/** Read and normalize source text from a file, stdin (`-`), or HTTP(S) URL. */
export async function ingestSource(
  source: string,
  {
    input = process.stdin as TextInput,
    fetchImpl = globalThis.fetch,
  }: IngestSourceOptions = {},
): Promise<string> {
  let text: string;
  if (source === '-') text = await readStandardInput(input);
  else if (URL_PATTERN.test(source)) text = await readUrl(source, fetchImpl);
  else text = normalizeText(await readFile(path.resolve(source), 'utf8'));

  if (!text) throw new Error('The input source did not contain any text.');
  return text;
}
