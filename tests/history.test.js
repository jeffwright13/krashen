// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { appendHistory } from '../js/storage.js';
import { getHistory, deleteHistoryEntry, clearHistory } from '../js/history.js';

const makeEntry = (id, topic = 'test topic') => ({
  id,
  date: '2026-05-27',
  topic,
  content: 'El perro corrió.',
  wordCount: 3,
  config: { cefrLevel: 'A2' },
});

beforeEach(() => {
  localStorage.clear();
});

describe('getHistory', () => {
  it('returns empty array when nothing is stored', () => {
    expect(getHistory()).toEqual([]);
  });

  it('returns entries that were appended via storage', () => {
    appendHistory(makeEntry(1));
    appendHistory(makeEntry(2));
    expect(getHistory()).toHaveLength(2);
  });
});

describe('deleteHistoryEntry', () => {
  it('removes the entry with the given id', () => {
    appendHistory(makeEntry(1));
    appendHistory(makeEntry(2));
    appendHistory(makeEntry(3));
    deleteHistoryEntry(2);
    const ids = getHistory().map(e => e.id);
    expect(ids).toEqual([1, 3]);
  });

  it('leaves the list unchanged when id does not exist', () => {
    appendHistory(makeEntry(1));
    deleteHistoryEntry(999);
    expect(getHistory()).toHaveLength(1);
  });

  it('works on an empty history', () => {
    expect(() => deleteHistoryEntry(1)).not.toThrow();
    expect(getHistory()).toEqual([]);
  });
});

describe('profile stamp', () => {
  it('preserves profileId and profileName on stamped entries', () => {
    appendHistory({ ...makeEntry(1), profileId: 'p1', profileName: 'Alice' });
    const entry = getHistory()[0];
    expect(entry.profileId).toBe('p1');
    expect(entry.profileName).toBe('Alice');
  });

  it('handles legacy entries without a profile stamp', () => {
    appendHistory(makeEntry(1));
    const entry = getHistory()[0];
    expect(entry.profileId).toBeUndefined();
    expect(entry.profileName).toBeUndefined();
  });
});

describe('clearHistory', () => {
  it('empties the history list', () => {
    appendHistory(makeEntry(1));
    appendHistory(makeEntry(2));
    clearHistory();
    expect(getHistory()).toEqual([]);
  });

  it('is safe to call on an already-empty history', () => {
    expect(() => clearHistory()).not.toThrow();
    expect(getHistory()).toEqual([]);
  });
});
