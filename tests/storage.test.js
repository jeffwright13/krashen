// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getApiKey, setApiKey,
  getModel, setModel,
  getSettings, setSettings,
  getHistory, appendHistory,
  getVocab,
} from '../js/storage.js';

beforeEach(() => {
  localStorage.clear();
});

describe('API keys', () => {
  it('returns empty string for unset provider', () => {
    expect(getApiKey('claude')).toBe('');
  });

  it('returns empty string for unknown provider', () => {
    expect(getApiKey('nonexistent')).toBe('');
  });

  it('stores and retrieves a key', () => {
    setApiKey('claude', 'sk-ant-test123');
    expect(getApiKey('claude')).toBe('sk-ant-test123');
  });

  it('stores keys per provider independently', () => {
    setApiKey('claude', 'key-claude');
    setApiKey('openai', 'key-openai');
    setApiKey('google', 'key-google');
    expect(getApiKey('claude')).toBe('key-claude');
    expect(getApiKey('openai')).toBe('key-openai');
    expect(getApiKey('google')).toBe('key-google');
  });
});

describe('settings', () => {
  it('returns default font size when nothing is stored', () => {
    expect(getSettings().ui.fontSize).toBe('medium');
  });

  it('returns default theme when nothing is stored', () => {
    expect(getSettings().ui.theme).toBe('system');
  });

  it('returns empty API keys when nothing is stored', () => {
    const { apiKeys } = getSettings();
    expect(apiKeys.claude).toBe('');
    expect(apiKeys.openai).toBe('');
    expect(apiKeys.google).toBe('');
  });

  it('persists and retrieves settings', () => {
    const s = getSettings();
    s.ui.theme = 'dark';
    setSettings(s);
    expect(getSettings().ui.theme).toBe('dark');
  });

  it('fills missing keys with defaults when stored settings are incomplete', () => {
    localStorage.setItem('krashen_settings', JSON.stringify({ ui: { theme: 'dark' } }));
    const settings = getSettings();
    expect(settings.ui.fontSize).toBe('medium');
    expect(settings.apiKeys).toBeDefined();
    expect(settings.apiKeys.claude).toBe('');
  });
});

describe('history', () => {
  it('returns empty array when nothing is stored', () => {
    expect(getHistory()).toEqual([]);
  });

  it('appends a session entry', () => {
    const entry = { id: 1, date: '2026-05-26', content: 'Había una vez...', wordCount: 300 };
    appendHistory(entry);
    expect(getHistory()).toHaveLength(1);
    expect(getHistory()[0]).toMatchObject({ id: 1, wordCount: 300 });
  });

  it('accumulates multiple entries in order', () => {
    appendHistory({ id: 1 });
    appendHistory({ id: 2 });
    const history = getHistory();
    expect(history).toHaveLength(2);
    expect(history[0].id).toBe(1);
    expect(history[1].id).toBe(2);
  });
});

describe('models', () => {
  it('returns default model for claude', () => {
    expect(getModel('claude')).toBe('claude-opus-4-5');
  });

  it('returns default model for openai', () => {
    expect(getModel('openai')).toBe('gpt-4o');
  });

  it('returns default model for google', () => {
    expect(getModel('google')).toBe('gemini-2.5-flash');
  });

  it('stores and retrieves a custom model', () => {
    setModel('openai', 'gpt-4o-mini');
    expect(getModel('openai')).toBe('gpt-4o-mini');
  });

  it('stores models per provider independently', () => {
    setModel('claude', 'claude-haiku-4-5');
    setModel('google', 'gemini-2.5-pro');
    expect(getModel('claude')).toBe('claude-haiku-4-5');
    expect(getModel('google')).toBe('gemini-2.5-pro');
    expect(getModel('openai')).toBe('gpt-4o');
  });
});

describe('vocab scaffold', () => {
  it('returns empty seenWords and sessions when nothing is stored', () => {
    const vocab = getVocab();
    expect(vocab.seenWords).toEqual([]);
    expect(vocab.sessions).toEqual([]);
  });
});
