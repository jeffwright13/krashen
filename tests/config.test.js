import { describe, it, expect } from 'vitest';
import { validateConfig, DEFAULT_CONFIG, CEFR_LEVELS, WORD_CAPS, PROVIDERS } from '../js/config.js';

describe('DEFAULT_CONFIG', () => {
  it('defaults targetLanguage to Spanish', () => {
    expect(DEFAULT_CONFIG.targetLanguage).toBe('Spanish');
  });

  it('defaults provider to openai', () => {
    expect(DEFAULT_CONFIG.provider).toBe('openai');
  });

  it('defaults cefrLevel to A2', () => {
    expect(DEFAULT_CONFIG.cefrLevel).toBe('A2');
  });
});

describe('validateConfig', () => {
  const base = () => ({ ...DEFAULT_CONFIG, topic: 'a dog explores a forest' });

  it('accepts a valid config', () => {
    expect(validateConfig(base())).toEqual({ valid: true, errors: [] });
  });

  it('requires topic', () => {
    const result = validateConfig({ ...base(), topic: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => /topic/i.test(e))).toBe(true);
  });

  it('rejects whitespace-only topic', () => {
    const result = validateConfig({ ...base(), topic: '   ' });
    expect(result.valid).toBe(false);
  });

  it('rejects invalid CEFR level', () => {
    const result = validateConfig({ ...base(), cefrLevel: 'X1' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => /cefr/i.test(e))).toBe(true);
  });

  it('accepts all valid CEFR levels', () => {
    for (const level of CEFR_LEVELS) {
      expect(validateConfig({ ...base(), cefrLevel: level }).valid).toBe(true);
    }
  });

  it('rejects invalid word cap', () => {
    const result = validateConfig({ ...base(), wordCap: 999 });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => /word cap/i.test(e))).toBe(true);
  });

  it('accepts all valid word caps', () => {
    for (const cap of WORD_CAPS) {
      expect(validateConfig({ ...base(), wordCap: cap }).valid).toBe(true);
    }
  });

  it('requires non-empty targetLanguage', () => {
    const result = validateConfig({ ...base(), targetLanguage: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => /language/i.test(e))).toBe(true);
  });

  it('rejects invalid provider', () => {
    const result = validateConfig({ ...base(), provider: 'mistral' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => /provider/i.test(e))).toBe(true);
  });

  it('accepts all valid providers', () => {
    for (const provider of PROVIDERS) {
      expect(validateConfig({ ...base(), provider }).valid).toBe(true);
    }
  });

  it('collects multiple errors at once', () => {
    const result = validateConfig({ ...base(), topic: '', cefrLevel: 'Z9', provider: 'bad' });
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it('accepts null sentenceLengthCeiling', () => {
    expect(validateConfig({ ...base(), sentenceLengthCeiling: null }).valid).toBe(true);
  });

  it('rejects negative sentenceLengthCeiling', () => {
    const result = validateConfig({ ...base(), sentenceLengthCeiling: -5 });
    expect(result.valid).toBe(false);
  });
});
