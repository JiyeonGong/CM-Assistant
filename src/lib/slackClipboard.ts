export interface SlackClipboardContent {
  text: string;
  html: string;
}

export function createSlackClipboardContent(text: string): SlackClipboardContent {
  return {
    text: normalizeSlackComposerMarkdown(text),
    html: convertSlackMarkdownToClipboardHtml(text)
  };
}

export function convertSlackMarkdownToClipboardHtml(text: string): string {
  const htmlLines = text.split('\n').map(renderClipboardLine);

  return [
    '<!doctype html>',
    '<html>',
    '<head><meta charset="utf-8"></head>',
    '<body><div style="margin:0;">',
    htmlLines.join('<br>'),
    '</div>',
    '</body>',
    '</html>'
  ].join('');
}

interface ParsedListLine {
  level: number;
  content: string;
}

function parseListLine(line: string): ParsedListLine | null {
  const match = line.match(/^(\s*)[-*•◦]\s+(.+)$/);
  if (!match) {
    return null;
  }

  return {
    level: Math.ceil(match[1].replace(/\t/g, '    ').length / 4),
    content: match[2]
  };
}

function renderClipboardLine(line: string): string {
  const listLine = parseListLine(line);
  if (!listLine) {
    return line.trim() ? convertLineToHtml(line) : '';
  }

  const indentation = '&emsp;&emsp;'.repeat(listLine.level);
  const bullet = listLine.level > 0 ? '◦' : '•';
  return `${indentation}${bullet}&nbsp;${convertInlineMarkdown(listLine.content)}`;
}

function convertLineToHtml(line: string): string {
  const leadingSpaces = line.match(/^\s*/)?.[0] ?? '';
  const content = line.slice(leadingSpaces.length);
  const indentation = '&nbsp;'.repeat(leadingSpaces.length);

  return `${indentation}${convertInlineMarkdown(content)}`;
}

function convertInlineMarkdown(text: string): string {
  const codeSegments: string[] = [];
  const escapedText = escapeHtml(text).replace(/`([^`]+)`/g, (_match, code: string) => {
    const token = `\u0000CODE${codeSegments.length}\u0000`;
    codeSegments.push(`<code>${code}</code>`);
    return token;
  });
  const formattedText = convertVisualStyleMarkers(escapedText);

  return formattedText.replace(/\u0000CODE(\d+)\u0000/g, (_match, index: string) => codeSegments[Number(index)]);
}

function convertVisualStyleMarkers(escapedText: string): string {
  return escapedText
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_\n]+)__/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>');
}

function normalizeSlackComposerMarkdown(text: string): string {
  const codeSegments: string[] = [];
  const protectedText = text.replace(/`([^`]+)`/g, (_match, code: string) => {
    const token = `\u0000CODE${codeSegments.length}\u0000`;
    codeSegments.push(`\`${code}\``);
    return token;
  });
  const normalizedText = protectedText
    .split('\n')
    .map((line) => {
      const normalizedStyles = line
        .replace(/__([^_\n]+)__/g, '**$1**')
        .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1**$2**');
      const listLine = parseListLine(normalizedStyles);
      if (!listLine) {
        return normalizedStyles;
      }

      const indentation = '\u3000\u3000'.repeat(listLine.level);
      const bullet = listLine.level > 0 ? '◦' : '•';
      return `${indentation}${bullet} ${listLine.content}`;
    })
    .join('\n');

  return normalizedText.replace(/\u0000CODE(\d+)\u0000/g, (_match, index: string) => codeSegments[Number(index)]);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
