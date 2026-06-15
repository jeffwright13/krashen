import { describe, it, expect } from 'vitest';
import {
  exportPieceAsMarkdown,
  exportPieceAsHTML,
  exportLibraryAsJSON,
  exportLibraryAsMarkdown,
} from '../js/export.js';

const makeEntry = (overrides = {}) => ({
  id: 1717804800000,
  date: '5/27/2026',
  topic: 'a dog explores a forest',
  content: 'El perro corrió entre los árboles.',
  wordCount: 6,
  config: { cefrLevel: 'A2', targetDialect: 'Neutral' },
  ...overrides,
});

describe('exportPieceAsMarkdown', () => {
  it('starts with YAML frontmatter delimiter', () => {
    expect(exportPieceAsMarkdown(makeEntry())).toMatch(/^---\n/);
  });

  it('includes topic in frontmatter', () => {
    const md = exportPieceAsMarkdown(makeEntry({ topic: 'los volcanes' }));
    expect(md).toContain('topic: "los volcanes"');
  });

  it('includes cefr in frontmatter', () => {
    const md = exportPieceAsMarkdown(makeEntry());
    expect(md).toContain('cefr: A2');
  });

  it('includes dialect in frontmatter', () => {
    const md = exportPieceAsMarkdown(makeEntry());
    expect(md).toContain('dialect: Neutral');
  });

  it('includes wordCount in frontmatter', () => {
    const md = exportPieceAsMarkdown(makeEntry({ wordCount: 712 }));
    expect(md).toContain('wordCount: 712');
  });

  it('includes date in frontmatter', () => {
    const md = exportPieceAsMarkdown(makeEntry({ date: '5/27/2026' }));
    expect(md).toContain('date: "5/27/2026"');
  });

  it('ends frontmatter block and includes content text', () => {
    const md = exportPieceAsMarkdown(makeEntry());
    expect(md).toContain('---\n\nEl perro corrió');
  });

  it('ends with the content text', () => {
    const md = exportPieceAsMarkdown(makeEntry());
    expect(md.trimEnd()).toMatch(/árboles\.$/);
  });

  it('promotes a ## title line to a # heading in Markdown', () => {
    const entry = makeEntry({ content: '## El bosque mágico\n\nEl perro corrió.' });
    const md = exportPieceAsMarkdown(entry);
    expect(md).toContain('# El bosque mágico');
    expect(md).not.toContain('## El bosque mágico');
  });

  it('outputs content as-is when no ## title is present', () => {
    const md = exportPieceAsMarkdown(makeEntry());
    expect(md).toContain('El perro corrió entre los árboles.');
  });
});

describe('exportPieceAsHTML', () => {
  it('returns a complete HTML document', () => {
    const html = exportPieceAsHTML(makeEntry());
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain('</html>');
  });

  it('sets charset to UTF-8', () => {
    expect(exportPieceAsHTML(makeEntry())).toContain('charset="UTF-8"');
  });

  it('includes story content as a paragraph', () => {
    const html = exportPieceAsHTML(makeEntry());
    expect(html).toContain('<p>');
    expect(html).toContain('El perro corrió entre los árboles.');
  });

  it('promotes ## title to <h1> and uses it as <title>', () => {
    const entry = makeEntry({ content: '## El bosque mágico\n\nEl perro corrió.' });
    const html = exportPieceAsHTML(entry);
    expect(html).toContain('<h1>El bosque mágico</h1>');
    expect(html).toContain('<title>El bosque mágico</title>');
  });

  it('falls back to topic as <title> when no ## heading', () => {
    const html = exportPieceAsHTML(makeEntry());
    expect(html).toContain('<title>a dog explores a forest</title>');
  });

  it('includes CEFR level in metadata', () => {
    expect(exportPieceAsHTML(makeEntry())).toContain('A2');
  });

  it('includes word count in metadata', () => {
    expect(exportPieceAsHTML(makeEntry({ wordCount: 712 }))).toContain('~712 words');
  });

  it('includes topic in metadata', () => {
    const html = exportPieceAsHTML(makeEntry({ topic: 'los volcanes' }));
    expect(html).toContain('los volcanes');
  });

  it('includes date in metadata', () => {
    expect(exportPieceAsHTML(makeEntry())).toContain('5/27/2026');
  });

  it('escapes HTML special characters in metadata', () => {
    const html = exportPieceAsHTML(makeEntry({ topic: 'cats & dogs <fun>' }));
    expect(html).toContain('cats &amp; dogs &lt;fun&gt;');
    expect(html).not.toContain('<fun>');
  });

  it('renders bold markdown as <strong>', () => {
    const html = exportPieceAsHTML(makeEntry({ content: 'Una **palabra** importante.' }));
    expect(html).toContain('<strong>palabra</strong>');
  });
});

describe('exportLibraryAsJSON', () => {
  it('returns valid JSON', () => {
    expect(() => JSON.parse(exportLibraryAsJSON([makeEntry()]))).not.toThrow();
  });

  it('includes schema field', () => {
    const obj = JSON.parse(exportLibraryAsJSON([makeEntry()]));
    expect(obj.schema).toBe('krashen-library-v1');
  });

  it('includes exported date', () => {
    const obj = JSON.parse(exportLibraryAsJSON([makeEntry()]));
    expect(obj.exported).toBeDefined();
  });

  it('entries array matches input', () => {
    const entries = [makeEntry({ id: 1 }), makeEntry({ id: 2 })];
    const obj = JSON.parse(exportLibraryAsJSON(entries));
    expect(obj.entries).toHaveLength(2);
    expect(obj.entries[0].id).toBe(1);
    expect(obj.entries[1].id).toBe(2);
  });

  it('handles empty library', () => {
    const obj = JSON.parse(exportLibraryAsJSON([]));
    expect(obj.entries).toEqual([]);
  });
});

describe('exportLibraryAsMarkdown', () => {
  it('includes all topics', () => {
    const entries = [
      makeEntry({ topic: 'los volcanes', content: 'Texto uno.' }),
      makeEntry({ topic: 'el mar', content: 'Texto dos.' }),
    ];
    const md = exportLibraryAsMarkdown(entries);
    expect(md).toContain('los volcanes');
    expect(md).toContain('el mar');
  });

  it('separates pieces with ---', () => {
    const entries = [
      makeEntry({ id: 1, content: 'Texto uno.' }),
      makeEntry({ id: 2, content: 'Texto dos.' }),
    ];
    const md = exportLibraryAsMarkdown(entries);
    // Two pieces = one separator between them plus frontmatter delimiters
    const separators = md.match(/^---$/gm);
    expect(separators.length).toBeGreaterThanOrEqual(4); // 2 open + 2 close frontmatters
  });

  it('includes all content bodies', () => {
    const entries = [
      makeEntry({ id: 1, content: 'Primera historia aquí.' }),
      makeEntry({ id: 2, content: 'Segunda historia allá.' }),
    ];
    const md = exportLibraryAsMarkdown(entries);
    expect(md).toContain('Primera historia aquí.');
    expect(md).toContain('Segunda historia allá.');
  });

  it('starts with a title header', () => {
    const md = exportLibraryAsMarkdown([makeEntry()]);
    expect(md).toMatch(/^# Krashen Library/);
  });

  it('handles a single entry', () => {
    const md = exportLibraryAsMarkdown([makeEntry()]);
    expect(md).toContain('El perro corrió');
  });

  it('handles an empty library', () => {
    expect(() => exportLibraryAsMarkdown([])).not.toThrow();
  });
});
