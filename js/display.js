export function applyFontSizeClass(size) {
  const el = document.getElementById('content-display');
  ['small', 'medium', 'large'].forEach(s => el.classList.toggle(`font-${s}`, s === size));
}

export function selectContentDisplay() {
  const el    = document.getElementById('content-display');
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

// Keeps a fixed-position popup fully on-screen: if its bottom edge would run
// past the viewport, shifts top up just enough to clear it (never above margin).
export function clampPopupTop(top, height, viewportHeight, margin = 8) {
  if (top + height <= viewportHeight - margin) return top;
  return Math.max(margin, viewportHeight - height - margin);
}

export function triggerDownload(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function showToast(message, durationMs = 2000) {
  let toast = document.getElementById('krashen-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'krashen-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('toast-visible');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('toast-visible'), durationMs);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function toggleLoading(visible) {
  const btn       = document.getElementById('generate-btn');
  const indicator = document.getElementById('loading-indicator');
  btn.disabled    = visible;
  btn.setAttribute('aria-busy', String(visible));
  indicator.hidden = !visible;
  if (visible) {
    document.getElementById('error-display').hidden   = true;
    document.getElementById('content-metadata').hidden = true;
  }
}

export function renderError(message) {
  toggleLoading(false);
  document.getElementById('error-message').textContent = message;
  document.getElementById('error-display').hidden = false;
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

export function extractContextSentence(paragraph, term) {
  if (!paragraph) return '';
  const sentences = paragraph.split(/(?<=[.!?¡])\s+/);
  const hit = sentences.find(s => s.toLowerCase().includes(term.toLowerCase()));
  if (hit) return hit.trim().replace(/\t|\n/g, ' ');
  return paragraph.slice(0, 120).replace(/\t|\n/g, ' ').trim();
}

export function renderContent(text, { cefrLevel, wordCount, topic, date }) {
  toggleLoading(false);
  document.getElementById('error-display').hidden = true;

  const normalized = text.replace(/\r\n|\r/g, '\n');

  const firstNewline = normalized.indexOf('\n');
  const firstLine    = firstNewline === -1 ? normalized : normalized.slice(0, firstNewline);
  let title = null;
  let body  = normalized;
  if (firstLine.startsWith('## ')) {
    title = firstLine.slice(3).trim();
    body  = normalized.slice(firstNewline + 1).replace(/^\n+/, '');
  }

  const titleHtml = title ? `<h1 class="content-title">${escapeHtml(title)}</h1>` : '';
  const display   = document.getElementById('content-display');
  display.innerHTML = titleHtml + body
    .split(/\n{2,}/)
    .filter(b => b.trim())
    .map(renderBlock)
    .join('');

  document.getElementById('meta-cefr').textContent  = cefrLevel;
  document.getElementById('meta-words').textContent = `~${wordCount} words`;
  document.getElementById('meta-topic').textContent = topic;
  document.getElementById('meta-date').textContent  = date;
  document.getElementById('content-metadata').hidden = false;
}
