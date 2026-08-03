import { describe, it, expect } from 'vitest';
import { buildApgWebExport } from '../js/apgWebExport.js';

function entryWithContent(content) {
  return { content, config: {} };
}

describe('buildApgWebExport()', () => {
  it('emits a lead-in silence line first', () => {
    const out = buildApgWebExport(entryWithContent('## Title\n\nUna frase.'), 'B1');
    const lines = out.trim().split('\n');
    expect(lines[0]).toMatch(/^\*; \d+(\.\d+)?$/);
  });

  it('renders the title as its own phrase line before the body', () => {
    const out = buildApgWebExport(entryWithContent('## El perro\n\nCorre rápido.'), 'B1');
    const lines = out.trim().split('\n');
    expect(lines[1]).toMatch(/^El perro; /);
  });

  it('omits the title line when content has no "## " header', () => {
    const out = buildApgWebExport(entryWithContent('Solo un párrafo sin título.'), 'B1');
    expect(out).not.toContain('Solo un párrafo sin título.;\n');
    const lines = out.trim().split('\n');
    // first line is lead-in, second is the sentence itself (no title line in between)
    expect(lines[1]).toMatch(/^Solo un párrafo sin título\.; /);
  });

  it('splits a paragraph into one line per sentence', () => {
    const out = buildApgWebExport(
      entryWithContent('## T\n\nPrimera frase. Segunda frase. Tercera frase.'),
      'B1'
    );
    const lines = out.trim().split('\n');
    expect(lines).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^Primera frase\.; /),
        expect.stringMatching(/^Segunda frase\.; /),
        expect.stringMatching(/^Tercera frase\.; /),
      ])
    );
  });

  it('inserts a paragraph-pause silence line between paragraphs but not after the last one', () => {
    const out = buildApgWebExport(
      entryWithContent('## T\n\nPárrafo uno.\n\nPárrafo dos.'),
      'B1'
    );
    const lines = out.trim().split('\n');
    const paragraphPauseCount = lines.filter(l => /^\*; /.test(l)).length;
    // lead-in + title->body pause + one inter-paragraph pause = 3 silence lines
    expect(paragraphPauseCount).toBe(3);
    expect(lines[lines.length - 1]).toMatch(/^Párrafo dos\.; /);
  });

  it('strips bold and italic markers from narrated text', () => {
    const out = buildApgWebExport(entryWithContent('## T\n\n**Hola** a *todos*.'), 'B1');
    expect(out).toContain('Hola a todos.;');
    expect(out).not.toContain('*Hola*');
    expect(out).not.toContain('**');
  });

  it('turns a bullet list into one phrase line per item, adding terminal punctuation', () => {
    const out = buildApgWebExport(
      entryWithContent('## T\n\n- primer punto\n- segundo punto'),
      'B1'
    );
    const lines = out.trim().split('\n');
    expect(lines).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^primer punto\.; /),
        expect.stringMatching(/^segundo punto\.; /),
      ])
    );
  });

  it('turns a numbered list into one phrase line per item', () => {
    const out = buildApgWebExport(
      entryWithContent('## T\n\n1. uno\n2. dos'),
      'B1'
    );
    const lines = out.trim().split('\n');
    expect(lines).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^uno\.; /),
        expect.stringMatching(/^dos\.; /),
      ])
    );
  });

  it('narrates a body heading as its own phrase and strips the hash markers', () => {
    const out = buildApgWebExport(
      entryWithContent('## T\n\n### Sección uno\n\nTexto del cuerpo.'),
      'B1'
    );
    expect(out).toContain('Sección uno;');
    expect(out).not.toContain('###');
  });

  it('drops horizontal-rule blocks entirely (no narration content)', () => {
    const out = buildApgWebExport(
      entryWithContent('## T\n\nAntes.\n\n---\n\nDespués.'),
      'B1'
    );
    expect(out).not.toContain('---');
    expect(out).toContain('Antes.;');
    expect(out).toContain('Después.;');
  });

  it('scales pause durations by CEFR level (A1 pauses longer than C2)', () => {
    const content = '## T\n\nUna frase. Otra frase.';
    const a1 = buildApgWebExport(entryWithContent(content), 'A1');
    const c2 = buildApgWebExport(entryWithContent(content), 'C2');
    const a1LeadIn = parseFloat(a1.split('\n')[0].split('; ')[1]);
    const c2LeadIn = parseFloat(c2.split('\n')[0].split('; ')[1]);
    expect(a1LeadIn).toBeGreaterThan(c2LeadIn);
  });

  it('falls back to a default pause table for an unrecognized CEFR level', () => {
    expect(() => buildApgWebExport(entryWithContent('## T\n\nHola.'), 'not-a-level')).not.toThrow();
  });

  it('handles a title-only piece with no body paragraphs', () => {
    const out = buildApgWebExport(entryWithContent('## Solo título'), 'B1');
    const lines = out.trim().split('\n');
    expect(lines).toEqual(['*; ' + lines[0].split('; ')[1], expect.stringMatching(/^Solo título; /)]);
  });
});
