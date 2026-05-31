import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildUserPrompt, buildDefinePrompt, buildI1Constraints } from '../js/prompt.js';
import { DEFAULT_CONFIG } from '../js/config.js';

const base = () => ({
  ...DEFAULT_CONFIG,
  topic: 'a dog and a boy explore a forest',
  cefrLevel: 'A2',
  wordCap: 1000,
  targetLanguage: 'Spanish',
  targetDialect: 'Mexican',
  tenseFocus: ['pretérito', 'imperfecto'],
  connectorDensity: 'High',
  outputLength: 'Medium',
  outputFormat: 'Single story',
  narrativePerson: '3rd',
});

describe('buildSystemPrompt', () => {
  it('includes CEFR level', () => {
    expect(buildSystemPrompt(base())).toContain('A2');
  });

  it('includes word cap', () => {
    expect(buildSystemPrompt(base())).toContain('1000');
  });

  it('includes target language', () => {
    expect(buildSystemPrompt(base())).toContain('Spanish');
  });

  it('includes dialect', () => {
    expect(buildSystemPrompt(base())).toContain('Mexican');
  });

  it('includes tense focus entries', () => {
    const prompt = buildSystemPrompt(base());
    expect(prompt).toContain('pretérito');
    expect(prompt).toContain('imperfecto');
  });

  it('includes connector instruction when density is High', () => {
    expect(buildSystemPrompt(base())).toMatch(/connector|pero|así que|sin embargo/i);
  });

  it('includes native language', () => {
    const config = { ...base(), nativeLanguage: 'French' };
    expect(buildSystemPrompt(config)).toContain('French');
  });

  it('does not include TTS instructions when TTS params are at defaults', () => {
    const prompt = buildSystemPrompt(base());
    expect(prompt).not.toMatch(/text.to.speech|TTS|pause mark/i);
  });

  it('includes sentence length ceiling when set', () => {
    const config = { ...base(), sentenceLengthCeiling: 12 };
    expect(buildSystemPrompt(config)).toContain('12');
  });

  it('omits sentence length ceiling when null', () => {
    const config = { ...base(), sentenceLengthCeiling: null };
    expect(buildSystemPrompt(config)).not.toMatch(/sentence.length.ceiling/i);
  });

  it('works with a non-Spanish target language', () => {
    const config = { ...base(), targetLanguage: 'Latin', targetDialect: 'Neutral' };
    expect(buildSystemPrompt(config)).toContain('Latin');
  });
});

describe('buildUserPrompt', () => {
  it('includes the topic', () => {
    expect(buildUserPrompt(base())).toContain('a dog and a boy explore a forest');
  });

  it('includes output format', () => {
    expect(buildUserPrompt(base())).toContain('Single story');
  });

  it('includes approximate word count for Medium length', () => {
    expect(buildUserPrompt(base())).toMatch(/700|medium/i);
  });

  it('includes narrative person', () => {
    expect(buildUserPrompt(base())).toMatch(/third.person|3rd/i);
  });

  it('includes specific words to include when set', () => {
    const config = { ...base(), includeWords: 'bosque, árbol' };
    expect(buildUserPrompt(config)).toContain('bosque');
  });

  it('includes specific words to exclude when set', () => {
    const config = { ...base(), excludeWords: 'coche' };
    expect(buildUserPrompt(config)).toContain('coche');
  });

  it('omits include/exclude instructions when fields are empty', () => {
    const config = { ...base(), includeWords: '', excludeWords: '' };
    const prompt = buildUserPrompt(config);
    expect(prompt).not.toMatch(/must include|must exclude|avoid using/i);
  });

  it('Article format includes expository format note', () => {
    const config = { ...base(), outputFormat: 'Article' };
    expect(buildUserPrompt(config)).toMatch(/expository|informational|educational/i);
  });

  it('Article format omits narrative person', () => {
    const config = { ...base(), outputFormat: 'Article' };
    expect(buildUserPrompt(config)).not.toMatch(/narrative person|third.person|3rd/i);
  });

  it('instructs the LLM to begin with a ## title line', () => {
    expect(buildUserPrompt(base())).toMatch(/##\s|title/i);
  });
});

describe('buildSystemPrompt — vocabContext (i+1)', () => {
  it('omits i+1 block when vocabContext is not provided', () => {
    const prompt = buildSystemPrompt(base());
    expect(prompt).not.toMatch(/known vocabulary|re-expose/i);
  });

  it('omits i+1 block when vocabContext is null', () => {
    const prompt = buildSystemPrompt(base(), null);
    expect(prompt).not.toMatch(/known vocabulary|re-expose/i);
  });

  it('injects i+1 block when vocabContext is provided', () => {
    const ctx = { knownTerms: ['casa', 'perro'], reExposeTerms: ['gato'], newWordsPerSession: 5 };
    const prompt = buildSystemPrompt(base(), ctx);
    expect(prompt).toContain('casa');
    expect(prompt).toContain('gato');
  });

  it('i+1 block appears after the language/level section', () => {
    const ctx = { knownTerms: ['casa'], reExposeTerms: [], newWordsPerSession: 5 };
    const prompt = buildSystemPrompt(base(), ctx);
    const levelPos = prompt.indexOf('CEFR level');
    const vocabPos = prompt.indexOf('Vocabulary Constraints');
    expect(levelPos).toBeGreaterThanOrEqual(0);
    expect(vocabPos).toBeGreaterThan(levelPos);
  });
});

describe('buildI1Constraints', () => {
  it('includes known terms when provided', () => {
    const result = buildI1Constraints({ knownTerms: ['casa', 'perro'], reExposeTerms: [], newWordsPerSession: 5 });
    expect(result).toContain('casa');
    expect(result).toContain('perro');
  });

  it('includes re-expose terms when provided', () => {
    const result = buildI1Constraints({ knownTerms: [], reExposeTerms: ['gato', 'rojo'], newWordsPerSession: 5 });
    expect(result).toContain('gato');
    expect(result).toContain('rojo');
  });

  it('includes newWordsPerSession ceiling', () => {
    const result = buildI1Constraints({ knownTerms: [], reExposeTerms: [], newWordsPerSession: 8 });
    expect(result).toContain('8');
  });

  it('caps known terms at 50', () => {
    const manyTerms = Array.from({ length: 60 }, (_, i) => `word${i}`);
    const result = buildI1Constraints({ knownTerms: manyTerms, reExposeTerms: [], newWordsPerSession: 5 });
    expect(result).toContain('word49');
    expect(result).not.toContain('word50');
  });

  it('omits known terms section when list is empty', () => {
    const result = buildI1Constraints({ knownTerms: [], reExposeTerms: [], newWordsPerSession: 5 });
    expect(result).not.toMatch(/known vocabulary/i);
  });

  it('omits re-expose section when list is empty', () => {
    const result = buildI1Constraints({ knownTerms: [], reExposeTerms: [], newWordsPerSession: 5 });
    expect(result).not.toMatch(/re-expose/i);
  });
});

describe('buildDefinePrompt', () => {
  it('includes the selected word in the user prompt', () => {
    const { user } = buildDefinePrompt('corrió', 'El perro corrió.', 'Spanish', 'English');
    expect(user).toContain('corrió');
  });

  it('includes the target language in the system prompt', () => {
    const { system } = buildDefinePrompt('perro', '', 'Spanish', 'English');
    expect(system).toContain('Spanish');
  });

  it('includes the native language in the system prompt', () => {
    const { system } = buildDefinePrompt('perro', '', 'Spanish', 'English');
    expect(system).toContain('English');
  });

  it('includes context when provided and different from selection', () => {
    const { user } = buildDefinePrompt('corrió', 'El perro corrió rápido.', 'Spanish', 'English');
    expect(user).toContain('El perro corrió rápido.');
  });

  it('omits context when not provided', () => {
    const { user } = buildDefinePrompt('perro', '', 'Spanish', 'English');
    expect(user).not.toContain('context');
  });
});
