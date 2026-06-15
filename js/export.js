function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

function renderBlock(block) {
  const trimmed = block.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('#### ')) return `<h4>${inlineMarkdown(trimmed.slice(5).trim())}</h4>`;
  if (trimmed.startsWith('### '))  return `<h3>${inlineMarkdown(trimmed.slice(4).trim())}</h3>`;
  if (trimmed.startsWith('## '))   return `<h2>${inlineMarkdown(trimmed.slice(3).trim())}</h2>`;
  if (/^[-*_]{3,}$/.test(trimmed)) return '<hr>';
  const lines = block.split('\n').filter(l => l.trim());
  if (lines.length > 0 && lines.every(l => /^[-*+]\s/.test(l.trim()))) {
    const items = lines.map(l => `<li>${inlineMarkdown(l.trim().slice(2).trim())}</li>`).join('');
    return `<ul>${items}</ul>`;
  }
  if (lines.length > 0 && lines.every(l => /^\d+\.\s/.test(l.trim()))) {
    const items = lines.map(l => `<li>${inlineMarkdown(l.trim().replace(/^\d+\.\s+/, ''))}</li>`).join('');
    return `<ol>${items}</ol>`;
  }
  return `<p>${inlineMarkdown(block.replace(/\n/g, ' ').trim())}</p>`;
}

function parseTitleBody(content) {
  const normalized  = (content ?? '').replace(/\r\n|\r/g, '\n');
  const firstNewline = normalized.indexOf('\n');
  const firstLine    = firstNewline === -1 ? normalized : normalized.slice(0, firstNewline);
  if (firstLine.startsWith('## ')) {
    return {
      title: firstLine.slice(3).trim(),
      body:  normalized.slice(firstNewline + 1).replace(/^\n+/, ''),
    };
  }
  return { title: null, body: normalized };
}

function pieceToMarkdown(entry) {
  const cefr    = entry.config?.cefrLevel ?? '';
  const dialect = entry.config?.targetDialect ?? '';

  const { title, body } = parseTitleBody(entry.content);

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

export function exportPieceAsHTML(entry) {
  const cefr    = entry.config?.cefrLevel ?? '';
  const dialect = entry.config?.targetDialect ?? '';
  const { title, body } = parseTitleBody(entry.content);

  const bodyHtml = body.split(/\n{2,}/).filter(b => b.trim()).map(renderBlock).join('\n');

  const metaParts = [
    cefr    && `<span>${escapeHtml(cefr)}</span>`,
    dialect && `<span>${escapeHtml(dialect)}</span>`,
    entry.wordCount != null && `<span>~${entry.wordCount} words</span>`,
    entry.topic && `<span>${escapeHtml(entry.topic)}</span>`,
    entry.date  && `<span>${escapeHtml(entry.date)}</span>`,
  ].filter(Boolean).join('');

  const docTitle = title
    ? escapeHtml(title)
    : entry.topic ? escapeHtml(entry.topic) : 'Krashen Export';

  const titleHtml = title ? `<h1>${escapeHtml(title)}</h1>\n` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${docTitle}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 70ch; margin: 2rem auto; padding: 0 1rem; line-height: 1.7; color: #222; }
    h1 { margin-top: 0; }
    .meta { font-size: 0.85em; color: #666; margin-bottom: 2rem; border-bottom: 1px solid #ddd; padding-bottom: 0.75rem; }
    .meta span + span::before { content: " · "; }
    p { margin-top: 0; }
  </style>
</head>
<body>
${titleHtml}<div class="meta">${metaParts}</div>
${bodyHtml}
</body>
</html>`;
}

export function exportProfileBundle(profile, vocabStore) {
  return JSON.stringify({
    schema:     'krashen-profile-v1',
    exportedAt: new Date().toISOString().slice(0, 10),
    profile: {
      name:         profile.name,
      created:      profile.created,
      lastActive:   profile.lastActive,
      wordsRead:    profile.wordsRead    ?? 0,
      settings:     profile.settings     ?? {},
      formDefaults: profile.formDefaults ?? {},
    },
    vocab: vocabStore,
  }, null, 2);
}
