function pieceToMarkdown(entry) {
  const cefr    = entry.config?.cefrLevel ?? '';
  const dialect = entry.config?.targetDialect ?? '';

  const content   = entry.content ?? '';
  const firstLine = content.slice(0, content.indexOf('\n') === -1 ? content.length : content.indexOf('\n'));
  let title = null;
  let body  = content;
  if (firstLine.startsWith('## ')) {
    title = firstLine.slice(3).trim();
    body  = content.slice(firstLine.length).replace(/^\n+/, '');
  }

  const frontmatter = [
    '---',
    `topic: "${entry.topic}"`,
    `cefr: ${cefr}`,
    `dialect: ${dialect}`,
    `wordCount: ${entry.wordCount}`,
    `date: "${entry.date}"`,
    '---',
  ].join('\n');

  const heading = title ? `# ${title}\n\n` : '';
  return `${frontmatter}\n\n${heading}${body}`;
}

export function exportPieceAsMarkdown(entry) {
  return pieceToMarkdown(entry);
}

export function exportLibraryAsJSON(entries) {
  return JSON.stringify({
    schema: 'krashen-library-v1',
    exported: new Date().toISOString().slice(0, 10),
    entries,
  }, null, 2);
}

export function exportLibraryAsMarkdown(entries) {
  const header = `# Krashen Library — exported ${new Date().toISOString().slice(0, 10)}`;
  if (entries.length === 0) return header + '\n';
  return header + '\n\n' + entries.map(pieceToMarkdown).join('\n\n');
}
