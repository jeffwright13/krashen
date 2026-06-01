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
    .filter(p => p.trim())
    .map(p => `<p>${escapeHtml(p.replace(/\n/g, ' '))}</p>`)
    .join('');

  document.getElementById('meta-cefr').textContent  = cefrLevel;
  document.getElementById('meta-words').textContent = `~${wordCount} words`;
  document.getElementById('meta-topic').textContent = topic;
  document.getElementById('meta-date').textContent  = date;
  document.getElementById('content-metadata').hidden = false;
}
