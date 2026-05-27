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

export function renderContent(text, { cefrLevel, wordCount, topic, date }) {
  toggleLoading(false);
  document.getElementById('error-display').hidden = true;

  const firstNewline = text.indexOf('\n');
  const firstLine    = firstNewline === -1 ? text : text.slice(0, firstNewline);
  let title = null;
  let body  = text;
  if (firstLine.startsWith('## ')) {
    title = firstLine.slice(3).trim();
    body  = text.slice(firstNewline + 1).replace(/^\n+/, '');
  }

  const titleHtml = title ? `<h1 class="content-title">${escapeHtml(title)}</h1>` : '';
  const display   = document.getElementById('content-display');
  display.innerHTML = titleHtml + body
    .split(/\n{2,}/)
    .filter(p => p.trim())
    .map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');

  document.getElementById('meta-cefr').textContent  = cefrLevel;
  document.getElementById('meta-words').textContent = `~${wordCount} words`;
  document.getElementById('meta-topic').textContent = topic;
  document.getElementById('meta-date').textContent  = date;
  document.getElementById('content-metadata').hidden = false;
}
