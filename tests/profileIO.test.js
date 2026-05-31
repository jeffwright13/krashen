import { describe, it, expect } from 'vitest';
import { exportProfileBundle } from '../js/export.js';
import { parseProfileBundle  } from '../js/import.js';

const sampleProfile = {
  name:         'Alice',
  created:      1000000,
  lastActive:   2000000,
  wordsRead:    350,
  settings:     { srsEnabled: true, knownThreshold: 2 },
  formDefaults: { provider: 'openai', cefrLevel: 'B1' },
};

const sampleVocab = {
  gato: { term: 'gato', mastery: 3, seenCount: 4, lookupCount: 2 },
};

describe('exportProfileBundle', () => {
  it('produces valid JSON', () => {
    const json = exportProfileBundle(sampleProfile, sampleVocab);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('sets schema to krashen-profile-v1', () => {
    const obj = JSON.parse(exportProfileBundle(sampleProfile, sampleVocab));
    expect(obj.schema).toBe('krashen-profile-v1');
  });

  it('includes profile name and wordsRead', () => {
    const obj = JSON.parse(exportProfileBundle(sampleProfile, sampleVocab));
    expect(obj.profile.name).toBe('Alice');
    expect(obj.profile.wordsRead).toBe(350);
  });

  it('includes settings and formDefaults', () => {
    const obj = JSON.parse(exportProfileBundle(sampleProfile, sampleVocab));
    expect(obj.profile.settings.knownThreshold).toBe(2);
    expect(obj.profile.formDefaults.cefrLevel).toBe('B1');
  });

  it('includes the vocab store', () => {
    const obj = JSON.parse(exportProfileBundle(sampleProfile, sampleVocab));
    expect(obj.vocab.gato.mastery).toBe(3);
  });

  it('does not include profile id', () => {
    const obj = JSON.parse(exportProfileBundle({ ...sampleProfile, id: 'abc123' }, {}));
    expect(obj.profile.id).toBeUndefined();
  });

  it('handles missing optional fields gracefully', () => {
    const minimal = { name: 'Bob', created: 0, lastActive: 0 };
    const obj = JSON.parse(exportProfileBundle(minimal, {}));
    expect(obj.profile.wordsRead).toBe(0);
    expect(obj.vocab).toEqual({});
  });
});

describe('parseProfileBundle', () => {
  it('parses a valid bundle', () => {
    const json = exportProfileBundle(sampleProfile, sampleVocab);
    const { profile, vocab } = parseProfileBundle(json);
    expect(profile.name).toBe('Alice');
    expect(vocab.gato.mastery).toBe(3);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseProfileBundle('not json')).toThrow('not valid JSON');
  });

  it('throws on wrong schema', () => {
    const bad = JSON.stringify({ schema: 'krashen-library-v1', profile: {}, vocab: {} });
    expect(() => parseProfileBundle(bad)).toThrow('Unrecognised');
  });

  it('throws on missing schema', () => {
    const bad = JSON.stringify({ profile: { name: 'x' }, vocab: {} });
    expect(() => parseProfileBundle(bad)).toThrow('Unrecognised');
  });

  it('throws on missing profile', () => {
    const bad = JSON.stringify({ schema: 'krashen-profile-v1', vocab: {} });
    expect(() => parseProfileBundle(bad)).toThrow('profile');
  });

  it('throws on empty profile name', () => {
    const bad = JSON.stringify({ schema: 'krashen-profile-v1', profile: { name: '  ' }, vocab: {} });
    expect(() => parseProfileBundle(bad)).toThrow('profile');
  });

  it('throws on missing vocab', () => {
    const bad = JSON.stringify({ schema: 'krashen-profile-v1', profile: { name: 'x' } });
    expect(() => parseProfileBundle(bad)).toThrow('vocab');
  });

  it('throws when vocab is an array', () => {
    const bad = JSON.stringify({ schema: 'krashen-profile-v1', profile: { name: 'x' }, vocab: [] });
    expect(() => parseProfileBundle(bad)).toThrow('vocab');
  });
});
