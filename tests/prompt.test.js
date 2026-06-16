import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildUserPrompt, buildDefinePrompt, parseDefineResponse } from '../js/prompt.js';
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

  it('includes a CEFR level description for every level', () => {
    const levels = ['A0','A1','A2','B1','B2','C1','C2'];
    levels.forEach(level => {
      const prompt = buildSystemPrompt({ ...base(), cefrLevel: level });
      expect(prompt).toContain(level);
      // description must be non-trivially present
      expect(prompt.length).toBeGreaterThan(200);
    });
  });

  it('suppresses word cap instruction at C2', () => {
    const prompt = buildSystemPrompt({ ...base(), cefrLevel: 'C2', wordCap: 7500 });
    expect(prompt).not.toContain('7500');
    expect(prompt).toMatch(/no frequency restriction/i);
  });

  it('includes word cap for non-C2 levels', () => {
    const prompt = buildSystemPrompt({ ...base(), cefrLevel: 'B2', wordCap: 3000 });
    expect(prompt).toContain('3000');
    expect(prompt).not.toMatch(/no frequency restriction/i);
  });

  it('C2 description mentions rare vocabulary and subjunctive moods', () => {
    const prompt = buildSystemPrompt({ ...base(), cefrLevel: 'C2' });
    expect(prompt).toMatch(/rare/i);
    expect(prompt).toMatch(/subjunctive/i);
  });

  it('C1 description mentions density and unmistakably C1', () => {
    const prompt = buildSystemPrompt({ ...base(), cefrLevel: 'C1' });
    expect(prompt).toMatch(/density/i);
    expect(prompt).toMatch(/unmistakably/i);
  });

  it('includes dialect description for Mexican', () => {
    const prompt = buildSystemPrompt({ ...base(), targetDialect: 'Mexican' });
    expect(prompt).toMatch(/órale|ahorita|chido/i);
  });

  it('includes dialect description for Rioplatense', () => {
    const prompt = buildSystemPrompt({ ...base(), targetDialect: 'Rioplatense' });
    expect(prompt).toMatch(/voseo|vos tenés/i);
  });

  it('includes dialect description for Castilian', () => {
    const prompt = buildSystemPrompt({ ...base(), targetDialect: 'Castilian' });
    expect(prompt).toMatch(/vosotros/i);
  });

  it('includes dialect description for Neutral', () => {
    const prompt = buildSystemPrompt({ ...base(), targetDialect: 'Neutral' });
    expect(prompt).toMatch(/neutral/i);
  });

  it('includes dialect description for Central American', () => {
    const prompt = buildSystemPrompt({ ...base(), targetDialect: 'Central American' });
    expect(prompt).toMatch(/central american/i);
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

describe('buildSystemPrompt — no vocab injection', () => {
  it('does not inject any vocabulary constraints block', () => {
    const prompt = buildSystemPrompt(base());
    expect(prompt).not.toMatch(/known vocabulary|re-expose|Vocabulary Constraints/i);
  });

  it('takes only a config argument', () => {
    expect(() => buildSystemPrompt(base())).not.toThrow();
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

  it('system prompt requests LEMMA: and TRANSLATION: format', () => {
    const { system } = buildDefinePrompt('corrió', '', 'Spanish', 'English');
    expect(system).toContain('LEMMA:');
    expect(system).toContain('TRANSLATION:');
  });

  it('unambiguously delimits a selection containing an embedded quote', () => {
    const selection = 'la frase "¿Qué me traes?" era común';
    const context    = 'En su comunidad, la frase "¿Qué me traes?" era común. Se usaba cuando alguien quería saber.';
    const { user } = buildDefinePrompt(selection, context, 'Spanish', 'English');
    expect(user).toContain(`<selection>${selection}</selection>`);
    expect(user).toContain(`<context>${context}</context>`);
  });

  it('does not wrap selection/context in bare double quotes', () => {
    const { user } = buildDefinePrompt('corrió', 'El perro corrió rápido.', 'Spanish', 'English');
    expect(user).not.toMatch(/^"/);
  });
});

describe('parseDefineResponse', () => {
  it('parses well-formed LEMMA/TRANSLATION response', () => {
    const { lemma, translation } = parseDefineResponse('LEMMA: hablar\nTRANSLATION: to speak');
    expect(lemma).toBe('hablar');
    expect(translation).toBe('to speak');
  });

  it('lowercases the lemma', () => {
    const { lemma } = parseDefineResponse('LEMMA: Hablar\nTRANSLATION: to speak');
    expect(lemma).toBe('hablar');
  });

  it('falls back gracefully when format is missing', () => {
    const { lemma, translation } = parseDefineResponse('to speak');
    expect(lemma).toBeNull();
    expect(translation).toBe('to speak');
  });

  it('trims whitespace from lemma and translation', () => {
    const { lemma, translation } = parseDefineResponse('LEMMA:  hablar  \nTRANSLATION:  to speak  ');
    expect(lemma).toBe('hablar');
    expect(translation).toBe('to speak');
  });

  it('handles LEMMA=surfaceForm when word is already a base form', () => {
    const { lemma, translation } = parseDefineResponse('LEMMA: perro\nTRANSLATION: dog');
    expect(lemma).toBe('perro');
    expect(translation).toBe('dog');
  });

  it('parses correctly when response is wrapped in a markdown code fence', () => {
    const raw = '```\nLEMMA: hablar\nTRANSLATION: to speak\n```';
    const { lemma, translation } = parseDefineResponse(raw);
    expect(lemma).toBe('hablar');
    expect(translation).toBe('to speak');
  });

  it('falls back gracefully when TRANSLATION line is missing', () => {
    const { lemma, translation } = parseDefineResponse('LEMMA: hablar');
    expect(lemma).toBeNull();
    expect(translation).toBe('LEMMA: hablar');
  });

  it('falls back gracefully when LEMMA line is missing', () => {
    const { lemma, translation } = parseDefineResponse('TRANSLATION: to speak');
    expect(lemma).toBeNull();
    expect(translation).toBe('TRANSLATION: to speak');
  });
});
