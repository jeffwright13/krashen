import { describe, it, expect } from 'vitest';
import { parseLibraryJSON } from '../js/import.js';

const makeEntry = (id) => ({
  id,
  date: '5/27/2026',
  topic: 'test',
  content: 'Texto.',
  wordCount: 1,
  config: {},
});

const makeLibrary = (entries = [makeEntry(1)]) =>
  JSON.stringify({ schema: 'krashen-library-v1', exported: '2026-05-27', entries });

describe('parseLibraryJSON', () => {
  it('returns the entries array on valid input', () => {
    const result = parseLibraryJSON(makeLibrary([makeEntry(1), makeEntry(2)]));
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
  });

  it('throws on malformed JSON', () => {
    expect(() => parseLibraryJSON('not json {')).toThrow();
  });

  it('throws when schema field is missing', () => {
    const bad = JSON.stringify({ exported: '2026-05-27', entries: [makeEntry(1)] });
    expect(() => parseLibraryJSON(bad)).toThrow(/schema/i);
  });

  it('throws when schema field has an unrecognised value', () => {
    const bad = JSON.stringify({ schema: 'unknown-format', entries: [makeEntry(1)] });
    expect(() => parseLibraryJSON(bad)).toThrow(/schema/i);
  });

  it('throws when entries is not an array', () => {
    const bad = JSON.stringify({ schema: 'krashen-library-v1', entries: 'oops' });
    expect(() => parseLibraryJSON(bad)).toThrow(/entries/i);
  });

  it('throws when entries is missing', () => {
    const bad = JSON.stringify({ schema: 'krashen-library-v1' });
    expect(() => parseLibraryJSON(bad)).toThrow(/entries/i);
  });

  it('returns an empty array for a valid library with no entries', () => {
    const result = parseLibraryJSON(makeLibrary([]));
    expect(result).toEqual([]);
  });

  it('throws when input is not a string', () => {
    expect(() => parseLibraryJSON(null)).toThrow();
    expect(() => parseLibraryJSON(42)).toThrow();
  });
});
