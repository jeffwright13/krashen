import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildUserPrompt, buildDefinePrompt } from '../js/prompt.js';
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
