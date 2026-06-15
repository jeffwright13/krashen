// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { toggleLoading, renderError, renderContent, showToast, extractContextSentence, selectContentDisplay, applyFontSizeClass } from '../js/display.js';

const FIXTURE = `
  <button id="generate-btn"></button>
  <div id="loading-indicator" hidden></div>
  <div id="error-display" hidden><p id="error-message"></p></div>
  <div id="content-metadata" hidden>
    <span id="meta-cefr"></span>
    <span id="meta-words"></span>
    <span id="meta-topic"></span>
    <span id="meta-date"></span>
  </div>
  <div id="content-display"></div>
`;

beforeEach(() => {
  document.body.innerHTML = FIXTURE;
});

// ── toggleLoading ──────────────────────────────────────────────────────────────

describe('toggleLoading(true)', () => {
  it('disables the generate button', () => {
    toggleLoading(true);
    expect(document.getElementById('generate-btn').disabled).toBe(true);
  });

  it('sets aria-busy="true" on the generate button', () => {
    toggleLoading(true);
    expect(document.getElementById('generate-btn').getAttribute('aria-busy')).toBe('true');
  });

  it('shows the loading indicator', () => {
    toggleLoading(true);
    expect(document.getElementById('loading-indicator').hidden).toBe(false);
  });

  it('hides the error display', () => {
    document.getElementById('error-display').hidden = false;
    toggleLoading(true);
    expect(document.getElementById('error-display').hidden).toBe(true);
  });

  it('hides the content metadata', () => {
    document.getElementById('content-metadata').hidden = false;
    toggleLoading(true);
    expect(document.getElementById('content-metadata').hidden).toBe(true);
  });
});

describe('toggleLoading(false)', () => {
  beforeEach(() => toggleLoading(true));

  it('re-enables the generate button', () => {
    toggleLoading(false);
    expect(document.getElementById('generate-btn').disabled).toBe(false);
  });

  it('sets aria-busy="false" on the generate button', () => {
    toggleLoading(false);
    expect(document.getElementById('generate-btn').getAttribute('aria-busy')).toBe('false');
  });

  it('hides the loading indicator', () => {
    toggleLoading(false);
    expect(document.getElementById('loading-indicator').hidden).toBe(true);
  });

  it('does not hide an already-visible error display', () => {
    toggleLoading(false);
    document.getElementById('error-display').hidden = false;
    toggleLoading(false);
    expect(document.getElementById('error-display').hidden).toBe(false);
  });
});

// ── renderError ────────────────────────────────────────────────────────────────

describe('renderError', () => {
  it('sets the error message text', () => {
    renderError('Something went wrong');
    expect(document.getElementById('error-message').textContent).toBe('Something went wrong');
  });

  it('shows the error display', () => {
    renderError('oops');
    expect(document.getElementById('error-display').hidden).toBe(false);
  });

  it('hides the loading indicator', () => {
    toggleLoading(true);
    renderError('oops');
    expect(document.getElementById('loading-indicator').hidden).toBe(true);
  });

  it('re-enables the generate button', () => {
    toggleLoading(true);
    renderError('oops');
    expect(document.getElementById('generate-btn').disabled).toBe(false);
  });

  it('overwrites a previous error message', () => {
    renderError('first error');
    renderError('second error');
    expect(document.getElementById('error-message').textContent).toBe('second error');
  });
});

// ── renderContent ──────────────────────────────────────────────────────────────

describe('renderContent — paragraph rendering', () => {
  const meta = { cefrLevel: 'A2', wordCount: 312, topic: 'a dog', date: '5/26/2026' };

  it('renders a single paragraph as one <p>', () => {
    renderContent('Hola mundo.', meta);
    expect(document.getElementById('content-display').querySelectorAll('p')).toHaveLength(1);
  });

  it('splits double newlines into separate <p> elements', () => {
    renderContent('First.\n\nSecond.', meta);
    const ps = document.getElementById('content-display').querySelectorAll('p');
    expect(ps).toHaveLength(2);
    expect(ps[0].textContent).toBe('First.');
    expect(ps[1].textContent).toBe('Second.');
  });

  it('collapses single newlines within a paragraph to a space', () => {
    renderContent('Line one.\nLine two.', meta);
    const p = document.getElementById('content-display').querySelector('p');
    expect(p.textContent).toBe('Line one. Line two.');
    expect(document.getElementById('content-display').querySelector('br')).toBeNull();
  });

  it('normalizes \\r\\n line endings', () => {
    renderContent('First.\r\n\r\nSecond.', meta);
    expect(document.getElementById('content-display').querySelectorAll('p')).toHaveLength(2);
  });

  it('strips stray \\r within a paragraph', () => {
    renderContent('Word one.\r\nWord two.', meta);
    const p = document.getElementById('content-display').querySelector('p');
    expect(p.textContent).not.toContain('\r');
  });

  it('filters out blank paragraphs', () => {
    renderContent('First.\n\n\n\nSecond.', meta);
    expect(document.getElementById('content-display').querySelectorAll('p')).toHaveLength(2);
  });

  it('replaces previous content on a second call', () => {
    renderContent('First render.', meta);
    renderContent('Second render.', meta);
    const ps = document.getElementById('content-display').querySelectorAll('p');
    expect(ps).toHaveLength(1);
    expect(ps[0].textContent).toBe('Second render.');
  });
});

describe('renderContent — HTML escaping', () => {
  const meta = { cefrLevel: 'B1', wordCount: 50, topic: 'test', date: '5/26/2026' };

  it('escapes < and > so script tags are inert', () => {
    renderContent('<script>alert(1)</script>', meta);
    const html = document.getElementById('content-display').innerHTML;
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes & as &amp;', () => {
    renderContent('fish & chips', meta);
    expect(document.getElementById('content-display').innerHTML).toContain('&amp;');
  });

  it('preserves the visible text despite escaping', () => {
    renderContent('a < b', meta);
    expect(document.getElementById('content-display').querySelector('p').textContent).toBe('a < b');
  });
});

describe('renderContent — metadata', () => {
  const text = 'El perro corrió por el bosque.';
  const meta = { cefrLevel: 'A2', wordCount: 312, topic: 'a dog', date: '5/26/2026' };

  it('sets CEFR level', () => {
    renderContent(text, meta);
    expect(document.getElementById('meta-cefr').textContent).toBe('A2');
  });

  it('sets word count with ~ prefix', () => {
    renderContent(text, meta);
    expect(document.getElementById('meta-words').textContent).toBe('~312 words');
  });

  it('sets topic', () => {
    renderContent(text, meta);
    expect(document.getElementById('meta-topic').textContent).toBe('a dog');
  });

  it('sets date', () => {
    renderContent(text, meta);
    expect(document.getElementById('meta-date').textContent).toBe('5/26/2026');
  });

  it('shows content metadata', () => {
    renderContent(text, meta);
    expect(document.getElementById('content-metadata').hidden).toBe(false);
  });
});

describe('renderContent — title', () => {
  const meta = { cefrLevel: 'A2', wordCount: 50, topic: 'test', date: '5/27/2026' };

  it('renders a ## title line as <h1 class="content-title">', () => {
    renderContent('## El bosque mágico\n\nEl perro corrió.', meta);
    const h1 = document.getElementById('content-display').querySelector('h1');
    expect(h1).not.toBeNull();
    expect(h1.classList.contains('content-title')).toBe(true);
    expect(h1.textContent).toBe('El bosque mágico');
  });

  it('renders body paragraphs after the title', () => {
    renderContent('## Un título\n\nPárrafo uno.\n\nPárrafo dos.', meta);
    expect(document.getElementById('content-display').querySelectorAll('p')).toHaveLength(2);
  });

  it('does not render an <h1> when no ## title is present', () => {
    renderContent('El perro corrió.', meta);
    expect(document.getElementById('content-display').querySelector('h1')).toBeNull();
  });

  it('escapes HTML in the title', () => {
    renderContent('## <script>xss</script>\n\nBody.', meta);
    const h1 = document.getElementById('content-display').querySelector('h1');
    expect(h1.textContent).toBe('<script>xss</script>');
    expect(document.getElementById('content-display').innerHTML).not.toContain('<script>');
  });
});

describe('renderContent — markdown headings', () => {
  const meta = { cefrLevel: 'B1', wordCount: 100, topic: 'test', date: '5/26/2026' };

  it('renders ### as <h3>', () => {
    renderContent('## Title\n\n### Sección\n\nTexto.', meta);
    const h3 = document.getElementById('content-display').querySelector('h3');
    expect(h3).not.toBeNull();
    expect(h3.textContent).toBe('Sección');
  });

  it('renders #### as <h4>', () => {
    renderContent('## Title\n\n#### Sub\n\nTexto.', meta);
    const h4 = document.getElementById('content-display').querySelector('h4');
    expect(h4).not.toBeNull();
    expect(h4.textContent).toBe('Sub');
  });

  it('body ## renders as <h2> (not eaten as title)', () => {
    renderContent('## Title\n\n## Segunda sección\n\nTexto.', meta);
    const h2 = document.getElementById('content-display').querySelector('h2');
    expect(h2).not.toBeNull();
    expect(h2.textContent).toBe('Segunda sección');
  });

  it('escapes HTML in headings', () => {
    renderContent('## Title\n\n### <script>xss</script>', meta);
    const h3 = document.getElementById('content-display').querySelector('h3');
    expect(h3.textContent).toBe('<script>xss</script>');
    expect(document.getElementById('content-display').innerHTML).not.toContain('<script>');
  });
});

describe('renderContent — inline markdown', () => {
  const meta = { cefrLevel: 'B1', wordCount: 50, topic: 'test', date: '5/26/2026' };

  it('renders **text** as <strong>', () => {
    renderContent('El **lobo** corrió.', meta);
    const strong = document.getElementById('content-display').querySelector('strong');
    expect(strong).not.toBeNull();
    expect(strong.textContent).toBe('lobo');
  });

  it('renders *text* as <em>', () => {
    renderContent('El *lobo* corrió.', meta);
    const em = document.getElementById('content-display').querySelector('em');
    expect(em).not.toBeNull();
    expect(em.textContent).toBe('lobo');
  });

  it('does not double-process **bold** as italic', () => {
    renderContent('**bold**', meta);
    expect(document.getElementById('content-display').querySelector('strong')).not.toBeNull();
    expect(document.getElementById('content-display').querySelector('em')).toBeNull();
  });

  it('escapes HTML inside bold', () => {
    renderContent('**<script>xss</script>**', meta);
    const strong = document.getElementById('content-display').querySelector('strong');
    expect(strong.textContent).toBe('<script>xss</script>');
    expect(document.getElementById('content-display').innerHTML).not.toContain('<script>');
  });
});

describe('renderContent — markdown lists', () => {
  const meta = { cefrLevel: 'B1', wordCount: 50, topic: 'test', date: '5/26/2026' };

  it('renders a bullet list as <ul><li>', () => {
    renderContent('- Uno\n- Dos\n- Tres', meta);
    const ul = document.getElementById('content-display').querySelector('ul');
    expect(ul).not.toBeNull();
    expect(ul.querySelectorAll('li')).toHaveLength(3);
    expect(ul.querySelectorAll('li')[0].textContent).toBe('Uno');
  });

  it('renders a numbered list as <ol><li>', () => {
    renderContent('1. Primero\n2. Segundo', meta);
    const ol = document.getElementById('content-display').querySelector('ol');
    expect(ol).not.toBeNull();
    expect(ol.querySelectorAll('li')).toHaveLength(2);
    expect(ol.querySelectorAll('li')[1].textContent).toBe('Segundo');
  });
});

describe('showToast', () => {
  it('creates a toast element with the given message', () => {
    showToast('Saved to vocab');
    const toast = document.getElementById('krashen-toast');
    expect(toast).not.toBeNull();
    expect(toast.textContent).toBe('Saved to vocab');
  });

  it('adds the toast-visible class', () => {
    showToast('Test');
    expect(document.getElementById('krashen-toast').classList.contains('toast-visible')).toBe(true);
  });

  it('reuses the existing element on repeated calls', () => {
    showToast('First');
    showToast('Second');
    expect(document.querySelectorAll('#krashen-toast').length).toBe(1);
    expect(document.getElementById('krashen-toast').textContent).toBe('Second');
  });
});

describe('renderContent — state cleanup', () => {
  const text = 'Hola.';
  const meta = { cefrLevel: 'A2', wordCount: 1, topic: 'test', date: '5/26/2026' };

  it('hides the error display', () => {
    document.getElementById('error-display').hidden = false;
    renderContent(text, meta);
    expect(document.getElementById('error-display').hidden).toBe(true);
  });

  it('hides the loading indicator', () => {
    toggleLoading(true);
    renderContent(text, meta);
    expect(document.getElementById('loading-indicator').hidden).toBe(true);
  });

  it('re-enables the generate button', () => {
    toggleLoading(true);
    renderContent(text, meta);
    expect(document.getElementById('generate-btn').disabled).toBe(false);
  });
});

describe('extractContextSentence', () => {
  it('returns the sentence containing the term', () => {
    const para = 'El perro corrió. El gato durmió. La luna brilló.';
    expect(extractContextSentence(para, 'gato')).toBe('El gato durmió.');
  });

  it('is case-insensitive when matching the term', () => {
    const para = 'Hablar es fácil. Hablé con ella ayer.';
    expect(extractContextSentence(para, 'hablé')).toBe('Hablé con ella ayer.');
  });

  it('falls back to first 120 chars when no sentence boundary found', () => {
    const para = 'Una frase sin puntuación que continúa y continúa sin parar';
    const result = extractContextSentence(para, 'gato');
    expect(result).toBe(para.slice(0, 120).trim());
  });

  it('falls back to first 120 chars when term not in any sentence', () => {
    const para = 'El perro corrió. La luna brilló.';
    const result = extractContextSentence(para, 'gato');
    // No sentence contains 'gato', so falls back to full text (< 120 chars)
    expect(result).toBe(para);
  });

  it('returns empty string for empty paragraph', () => {
    expect(extractContextSentence('', 'gato')).toBe('');
  });

  it('strips tabs and newlines from the result', () => {
    const para = 'El gato\tdurmió bien.\nOtra frase.';
    const result = extractContextSentence(para, 'gato');
    expect(result).not.toContain('\t');
    expect(result).not.toContain('\n');
  });
});

// ── applyFontSizeClass ────────────────────────────────────────────────────────

describe('applyFontSizeClass', () => {
  it('adds font-small class for "small"', () => {
    applyFontSizeClass('small');
    expect(document.getElementById('content-display').classList.contains('font-small')).toBe(true);
  });

  it('adds font-medium class for "medium"', () => {
    applyFontSizeClass('medium');
    expect(document.getElementById('content-display').classList.contains('font-medium')).toBe(true);
  });

  it('adds font-large class for "large"', () => {
    applyFontSizeClass('large');
    expect(document.getElementById('content-display').classList.contains('font-large')).toBe(true);
  });

  it('removes the previous size class when size changes', () => {
    applyFontSizeClass('small');
    applyFontSizeClass('large');
    const el = document.getElementById('content-display');
    expect(el.classList.contains('font-small')).toBe(false);
    expect(el.classList.contains('font-large')).toBe(true);
  });

  it('only ever has one font size class at a time', () => {
    applyFontSizeClass('medium');
    applyFontSizeClass('large');
    const el = document.getElementById('content-display');
    const fontClasses = [...el.classList].filter(c => c.startsWith('font-'));
    expect(fontClasses).toHaveLength(1);
    expect(fontClasses[0]).toBe('font-large');
  });
});

// ── selectContentDisplay ───────────────────────────────────────────────────────

describe('selectContentDisplay', () => {
  it('does not throw when content-display is empty', () => {
    expect(() => selectContentDisplay()).not.toThrow();
  });

  it('does not throw when content-display has text content', () => {
    document.getElementById('content-display').innerHTML =
      '<p>El perro corrió entre los árboles.</p>';
    expect(() => selectContentDisplay()).not.toThrow();
  });

  it('creates a selection after call', () => {
    document.getElementById('content-display').innerHTML =
      '<p>Una historia de prueba.</p>';
    selectContentDisplay();
    const sel = window.getSelection();
    expect(sel).not.toBeNull();
    expect(sel.rangeCount).toBeGreaterThan(0);
  });

  it('selection is anchored to content-display, not document body', () => {
    const el = document.getElementById('content-display');
    el.innerHTML = '<p>Texto de prueba.</p>';
    selectContentDisplay();
    const sel   = window.getSelection();
    const range = sel.getRangeAt(0);
    expect(el.contains(range.commonAncestorContainer)).toBe(true);
  });
});
