export function convertSlackMarkdownToClipboardHtml(text: string): string {
  const htmlLines = text.split('\n').map((line) => convertLineToHtml(line));

  return `<div>${htmlLines.join('<br>')}</div>`;
}

function convertLineToHtml(line: string): string {
  const leadingSpaces = line.match(/^\s*/)?.[0] ?? '';
  const content = line.slice(leadingSpaces.length);
  const indentation = '&nbsp;'.repeat(leadingSpaces.length);

  return `${indentation}${convertBoldMarkers(escapeHtml(content))}`;
}

function convertBoldMarkers(text: string): string {
  return text.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
