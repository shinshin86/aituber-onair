import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';

interface KeySequence {
  current: number;
}

const nextKey = (sequence: KeySequence, prefix: string): string => {
  sequence.current += 1;
  return `${prefix}-${sequence.current}`;
};

const isSafeHttpUrl = (target: string): boolean => {
  try {
    const url = new URL(target);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const findLinkTargetEnd = (content: string, start: number): number => {
  let nestedParentheses = 0;

  for (let index = start; index < content.length; index += 1) {
    if (content[index] === '(') {
      nestedParentheses += 1;
      continue;
    }

    if (content[index] !== ')') continue;
    if (nestedParentheses === 0) return index;
    nestedParentheses -= 1;
  }

  return -1;
};

const findEmphasisEnd = (
  content: string,
  delimiter: string,
  start: number,
): number => {
  let candidate = content.indexOf(delimiter, start);

  while (candidate !== -1) {
    const isPartOfStrong =
      content[candidate - 1] === delimiter ||
      content[candidate + 1] === delimiter;
    if (!isPartOfStrong) return candidate;
    candidate = content.indexOf(delimiter, candidate + 1);
  }

  return -1;
};

const renderInline = (content: string, sequence: KeySequence): ReactNode[] => {
  const nodes: ReactNode[] = [];
  let index = 0;

  while (index < content.length) {
    if (content[index] === '`') {
      const closingIndex = content.indexOf('`', index + 1);
      if (closingIndex === -1) {
        nodes.push(content.slice(index));
        break;
      }

      nodes.push(
        <code
          className="markdown-inline-code"
          key={nextKey(sequence, 'inline-code')}
        >
          {content.slice(index + 1, closingIndex)}
        </code>,
      );
      index = closingIndex + 1;
      continue;
    }

    if (content[index] === '[') {
      const labelEnd = content.indexOf('](', index + 1);
      const targetEnd =
        labelEnd === -1 ? -1 : findLinkTargetEnd(content, labelEnd + 2);

      if (labelEnd !== -1 && targetEnd !== -1) {
        const label = content.slice(index + 1, labelEnd);
        const target = content.slice(labelEnd + 2, targetEnd).trim();

        if (isSafeHttpUrl(target)) {
          nodes.push(
            <a
              href={target}
              key={nextKey(sequence, 'link')}
              target="_blank"
              rel="noopener noreferrer"
            >
              {renderInline(label, sequence)}
            </a>,
          );
        } else {
          nodes.push(content.slice(index, targetEnd + 1));
        }

        index = targetEnd + 1;
        continue;
      }
    }

    const strongDelimiter = content.startsWith('**', index)
      ? '**'
      : content.startsWith('__', index)
        ? '__'
        : null;
    if (strongDelimiter) {
      const closingIndex = content.indexOf(
        strongDelimiter,
        index + strongDelimiter.length,
      );
      if (closingIndex === -1) {
        nodes.push(content.slice(index));
        break;
      }

      nodes.push(
        <strong key={nextKey(sequence, 'strong')}>
          {renderInline(
            content.slice(index + strongDelimiter.length, closingIndex),
            sequence,
          )}
        </strong>,
      );
      index = closingIndex + strongDelimiter.length;
      continue;
    }

    const emphasisDelimiter =
      content[index] === '*' || content[index] === '_' ? content[index] : null;
    if (emphasisDelimiter) {
      const closingIndex = findEmphasisEnd(
        content,
        emphasisDelimiter,
        index + 1,
      );
      if (closingIndex === -1) {
        nodes.push(content.slice(index));
        break;
      }

      nodes.push(
        <em key={nextKey(sequence, 'emphasis')}>
          {renderInline(content.slice(index + 1, closingIndex), sequence)}
        </em>,
      );
      index = closingIndex + 1;
      continue;
    }

    let textEnd = index + 1;
    while (
      textEnd < content.length &&
      !['`', '[', '*', '_'].includes(content[textEnd])
    ) {
      textEnd += 1;
    }
    nodes.push(content.slice(index, textEnd));
    index = textEnd;
  }

  return nodes;
};

const FENCE_PATTERN = /^ {0,3}```\s*([^`\s]+)?\s*$/;
const FENCE_END_PATTERN = /^ {0,3}```\s*$/;
const HEADING_PATTERN = /^(#{1,3})\s+(.+)$/;
const UNORDERED_LIST_PATTERN = /^\s*[-*]\s+(.+)$/;
const ORDERED_LIST_PATTERN = /^\s*(\d+)\.\s+(.+)$/;

const startsBlock = (line: string): boolean =>
  FENCE_PATTERN.test(line) ||
  HEADING_PATTERN.test(line) ||
  UNORDERED_LIST_PATTERN.test(line) ||
  ORDERED_LIST_PATTERN.test(line);

const appendTrailingContent = (
  nodes: ReactNode[],
  trailingContent: ReactNode,
): void => {
  if (trailingContent === undefined || trailingContent === null) return;

  const lastNode = nodes[nodes.length - 1];
  if (
    isValidElement<{ children?: ReactNode }>(lastNode) &&
    lastNode.type === 'p'
  ) {
    nodes[nodes.length - 1] = cloneElement(
      lastNode as ReactElement<{ children?: ReactNode }>,
      undefined,
      lastNode.props.children,
      trailingContent,
    );
    return;
  }

  nodes.push(trailingContent);
};

export const renderMarkdownContent = (
  content: string,
  trailingContent?: ReactNode,
): ReactNode[] => {
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  const nodes: ReactNode[] = [];
  const sequence: KeySequence = { current: 0 };
  let lineIndex = 0;

  while (lineIndex < lines.length) {
    const line = lines[lineIndex];
    if (!line.trim()) {
      lineIndex += 1;
      continue;
    }

    const fence = line.match(FENCE_PATTERN);
    if (fence) {
      const language = fence[1];
      const codeLines: string[] = [];
      let closingIndex = lineIndex + 1;

      while (
        closingIndex < lines.length &&
        !FENCE_END_PATTERN.test(lines[closingIndex])
      ) {
        codeLines.push(lines[closingIndex]);
        closingIndex += 1;
      }

      const isInProgress = closingIndex === lines.length;
      nodes.push(
        <div
          className={`markdown-code-block${
            isInProgress ? ' markdown-code-block--in-progress' : ''
          }`}
          data-in-progress={isInProgress || undefined}
          key={`code-block-${lineIndex}`}
        >
          {language && <div className="markdown-code-label">{language}</div>}
          <pre>
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>,
      );
      lineIndex = isInProgress ? lines.length : closingIndex + 1;
      continue;
    }

    const heading = line.match(HEADING_PATTERN);
    if (heading) {
      const level = heading[1].length;
      const headingContent = renderInline(heading[2], sequence);
      const key = `heading-${level}-${lineIndex}`;

      if (level === 1) nodes.push(<h1 key={key}>{headingContent}</h1>);
      if (level === 2) nodes.push(<h2 key={key}>{headingContent}</h2>);
      if (level === 3) nodes.push(<h3 key={key}>{headingContent}</h3>);
      lineIndex += 1;
      continue;
    }

    const unorderedItem = line.match(UNORDERED_LIST_PATTERN);
    if (unorderedItem) {
      const items: ReactNode[] = [];
      const listStart = lineIndex;
      while (lineIndex < lines.length) {
        const item = lines[lineIndex].match(UNORDERED_LIST_PATTERN);
        if (!item) break;
        items.push(
          <li key={`unordered-item-${lineIndex}`}>
            {renderInline(item[1], sequence)}
          </li>,
        );
        lineIndex += 1;
      }
      nodes.push(<ul key={`unordered-list-${listStart}`}>{items}</ul>);
      continue;
    }

    const orderedItem = line.match(ORDERED_LIST_PATTERN);
    if (orderedItem) {
      const items: ReactNode[] = [];
      const start = Number(orderedItem[1]);
      const listStart = lineIndex;
      while (lineIndex < lines.length) {
        const item = lines[lineIndex].match(ORDERED_LIST_PATTERN);
        if (!item) break;
        items.push(
          <li key={`ordered-item-${lineIndex}`}>
            {renderInline(item[2], sequence)}
          </li>,
        );
        lineIndex += 1;
      }
      nodes.push(
        <ol
          key={`ordered-list-${listStart}`}
          start={start === 1 ? undefined : start}
        >
          {items}
        </ol>,
      );
      continue;
    }

    const paragraphLines: string[] = [];
    const paragraphStart = lineIndex;
    while (
      lineIndex < lines.length &&
      lines[lineIndex].trim() &&
      !startsBlock(lines[lineIndex])
    ) {
      paragraphLines.push(lines[lineIndex]);
      lineIndex += 1;
    }

    const paragraphContent: ReactNode[] = [];
    paragraphLines.forEach((paragraphLine, paragraphIndex) => {
      if (paragraphIndex > 0) {
        paragraphContent.push(<br key={nextKey(sequence, 'line-break')} />);
      }
      paragraphContent.push(...renderInline(paragraphLine, sequence));
    });
    nodes.push(<p key={`paragraph-${paragraphStart}`}>{paragraphContent}</p>);
  }

  appendTrailingContent(nodes, trailingContent);
  return nodes;
};
