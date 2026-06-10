export function convertSlackMarkdownToClipboardHtml(text: string): string {
  const htmlLines: string[] = [];
  let listItems: ListItem[] = [];

  for (const line of text.split('\n')) {
    const listLine = parseListLine(line);
    if (listLine) {
      listItems = appendListItem(listItems, listLine);
      continue;
    }

    flushListItems(htmlLines, listItems);
    listItems = [];
    htmlLines.push(line.trim() ? renderParagraph(line) : '<p><br></p>');
  }

  flushListItems(htmlLines, listItems);

  return [
    '<!doctype html>',
    '<html>',
    '<head><meta charset="utf-8"></head>',
    '<body>',
    htmlLines.join(''),
    '</body>',
    '</html>'
  ].join('');
}

interface ListItem {
  content: string;
  children: ListItem[];
}

interface ParsedListLine {
  level: number;
  content: string;
}

interface ListStackItem {
  level: number;
  children: ListItem[];
}

function parseListLine(line: string): ParsedListLine | null {
  const match = line.match(/^(\s*)[-•◦]\s+(.+)$/);
  if (!match) {
    return null;
  }

  return {
    level: Math.floor(match[1].length / 2),
    content: match[2]
  };
}

function appendListItem(items: ListItem[], parsedLine: ParsedListLine): ListItem[] {
  const nextItems = [...items];
  const stack: ListStackItem[] = [{ level: -1, children: nextItems }];

  rebuildListStack(nextItems, stack);

  while (stack.length > 1 && stack[stack.length - 1].level >= parsedLine.level) {
    stack.pop();
  }

  const node = { content: parsedLine.content, children: [] };
  stack[stack.length - 1].children.push(node);
  return nextItems;
}

function rebuildListStack(items: ListItem[], stack: ListStackItem[]): void {
  let currentItems = items;
  let level = 0;

  while (currentItems.length > 0) {
    const lastItem = currentItems[currentItems.length - 1];
    stack.push({ level, children: lastItem.children });
    currentItems = lastItem.children;
    level += 1;
  }
}

function flushListItems(htmlLines: string[], items: ListItem[]): void {
  if (items.length > 0) {
    htmlLines.push(renderList(items));
  }
}

function renderList(items: ListItem[]): string {
  return `<ul style="margin:0 0 0 20px;padding-left:20px;">${items.map(renderListItem).join('')}</ul>`;
}

function renderListItem(item: ListItem): string {
  const children = item.children.length ? renderList(item.children) : '';
  return `<li style="margin:0;padding:0;"><span>${convertInlineMarkdown(item.content)}</span>${children}</li>`;
}

function renderParagraph(line: string): string {
  return `<p style="margin:0;">${convertLineToHtml(line)}</p>`;
}

function convertLineToHtml(line: string): string {
  const leadingSpaces = line.match(/^\s*/)?.[0] ?? '';
  const content = line.slice(leadingSpaces.length);
  const indentation = '&nbsp;'.repeat(leadingSpaces.length);

  return `${indentation}${convertInlineMarkdown(content)}`;
}

function convertInlineMarkdown(text: string): string {
  return convertBoldMarkers(escapeHtml(text));
}

function convertBoldMarkers(escapedText: string): string {
  return escapedText.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
