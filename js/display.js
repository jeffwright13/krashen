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

  const display   = document.getElementById('content-display');
  display.innerHTML = text
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
