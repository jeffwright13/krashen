// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';

// Minimal DOM fixture — every element ui.js's IIFE touches must be present
const FIXTURE = `
  <div id="profile-chip">
    <div id="profile-chip-summary">
      <span id="chip-profile-name">No profile</span>
      <span id="chip-words-read"></span>
      <button id="chip-toggle-btn" aria-expanded="false" aria-controls="profile-chip-panel">▾</button>
    </div>
    <div id="profile-chip-panel" hidden>
      <div class="chip-profile-row">
        <select id="profile-select"></select>
        <button id="new-profile-btn"></button>
        <button id="delete-profile-btn" disabled></button>
      </div>
      <div id="new-profile-form" hidden>
        <input id="new-profile-name">
        <button id="confirm-new-profile"></button>
        <button id="cancel-new-profile"></button>
      </div>
    </div>
  </div>
  <div id="tab-bar" role="tablist">
    <button role="tab" class="tab-btn" id="tab-btn-generate"
      aria-selected="true" tabindex="0">Generate</button>
    <button role="tab" class="tab-btn" id="tab-btn-vocab"
      aria-selected="false" tabindex="-1">Vocab</button>
    <button role="tab" class="tab-btn" id="tab-btn-tuning"
      aria-selected="false" tabindex="-1">Tuning</button>
    <button role="tab" class="tab-btn" id="tab-btn-settings"
      aria-selected="false" tabindex="-1">Settings</button>
  </div>
  <div id="tab-generate" class="tab-panel"></div>
  <div id="tab-vocab"    class="tab-panel" hidden></div>
  <div id="tab-tuning"   class="tab-panel" hidden></div>
  <div id="tab-settings" class="tab-panel" hidden></div>
  <div id="tab-tuning" class="tab-panel" hidden>
    <input type="checkbox" id="srs-enabled">
    <input type="checkbox" id="srs-autosave">
    <div id="srs-fields" hidden></div>
    <select id="srs-known-threshold">
      <option value="1">1</option><option value="2" selected>2</option>
      <option value="3">3</option><option value="4">4</option>
    </select>
    <select id="srs-new-words">
      <option value="3">3</option><option value="5" selected>5</option>
      <option value="8">8</option><option value="10">10</option>
    </select>
    <select id="srs-reexpose-count">
      <option value="5">5</option><option value="8" selected>8</option>
      <option value="12">12</option>
    </select>
    <select id="srs-reexpose-mastery">
      <option value="1">1</option><option value="2">2</option>
      <option value="3" selected>3</option><option value="4">4</option>
    </select>
  </div>
  <div id="tab-vocab" class="tab-panel" hidden>
    <span id="vocab-total"></span>
    <p id="vocab-mastery-breakdown"></p>
    <div id="vocab-term-list"></div>
    <button id="clear-vocab-btn"></button>
  </div>
  <div id="tab-settings" class="tab-panel" hidden></div>
`;

beforeAll(async () => {
  document.body.innerHTML = FIXTURE;

  // Minimal stubs so ui.js doesn't throw on KrashenProfiles/KrashenVocab access
  window.KrashenProfiles = {
    getActive:  () => null,
    getAll:     () => [],
    onSwitch:   () => {},
    DEFAULT_SETTINGS: {
      autosave: false, srsEnabled: true, knownThreshold: 2,
      newWordsPerSession: 5, reExposeCount: 8, reExposeMaxMastery: 3,
    },
  };
  window.KrashenVocab = { getStore: () => ({}) };

  // ui.js is cached after first import — subsequent describe blocks reuse same instance
  try { await import('../js/ui.js'); } catch (_) {}
});

// ── Tab switching ──────────────────────────────────────────────────────────────

describe('tab switching — initial state', () => {
  it('Generate tab is visible on load', () => {
    expect(document.getElementById('tab-generate').hidden).toBe(false);
  });

  it('other tabs are hidden on load', () => {
    expect(document.getElementById('tab-vocab').hidden).toBe(true);
    expect(document.getElementById('tab-tuning').hidden).toBe(true);
    expect(document.getElementById('tab-settings').hidden).toBe(true);
  });

  it('Generate tab button has aria-selected="true"', () => {
    expect(document.getElementById('tab-btn-generate').getAttribute('aria-selected')).toBe('true');
  });

  it('other tab buttons have aria-selected="false"', () => {
    ['vocab', 'tuning', 'settings'].forEach(id => {
      expect(document.getElementById('tab-btn-' + id).getAttribute('aria-selected')).toBe('false');
    });
  });
});

describe('tab switching — clicking tabs', () => {
  it('clicking Vocab tab shows vocab panel and hides others', () => {
    document.getElementById('tab-btn-vocab').click();
    expect(document.getElementById('tab-vocab').hidden).toBe(false);
    expect(document.getElementById('tab-generate').hidden).toBe(true);
    expect(document.getElementById('tab-tuning').hidden).toBe(true);
    expect(document.getElementById('tab-settings').hidden).toBe(true);
  });

  it('clicking Vocab tab sets its button aria-selected="true"', () => {
    document.getElementById('tab-btn-vocab').click();
    expect(document.getElementById('tab-btn-vocab').getAttribute('aria-selected')).toBe('true');
    expect(document.getElementById('tab-btn-generate').getAttribute('aria-selected')).toBe('false');
  });

  it('clicking Tuning tab shows tuning panel', () => {
    document.getElementById('tab-btn-tuning').click();
    expect(document.getElementById('tab-tuning').hidden).toBe(false);
    expect(document.getElementById('tab-vocab').hidden).toBe(true);
  });

  it('clicking Settings tab shows settings panel', () => {
    document.getElementById('tab-btn-settings').click();
    expect(document.getElementById('tab-settings').hidden).toBe(false);
  });

  it('clicking Generate tab returns to generate panel', () => {
    document.getElementById('tab-btn-settings').click();
    document.getElementById('tab-btn-generate').click();
    expect(document.getElementById('tab-generate').hidden).toBe(false);
    expect(document.getElementById('tab-settings').hidden).toBe(true);
  });

  it('only one panel is visible at a time', () => {
    document.getElementById('tab-btn-tuning').click();
    const panels = ['generate', 'vocab', 'tuning', 'settings'];
    const visible = panels.filter(id => !document.getElementById('tab-' + id).hidden);
    expect(visible).toHaveLength(1);
    expect(visible[0]).toBe('tuning');
  });
});

// ── Profile chip ───────────────────────────────────────────────────────────────

describe('profile chip — no active profile', () => {
  it('shows "No profile" when no profile is active', () => {
    expect(document.getElementById('chip-profile-name').textContent).toBe('No profile');
  });

  it('words-read is empty when no profile is active', () => {
    expect(document.getElementById('chip-words-read').textContent).toBe('');
  });
});

describe('profile chip — with active profile', () => {
  it('updates chip text when refreshChip is called with an active profile', () => {
    window.KrashenProfiles.getActive = () => ({ name: 'Alice', wordsRead: 1240 });
    window.KrashenUI.refreshChip();
    expect(document.getElementById('chip-profile-name').textContent).toBe('Alice');
    expect(document.getElementById('chip-words-read').textContent).toContain('1');
  });
});

// ── Tuning tab ─────────────────────────────────────────────────────────────────

describe('tuning tab — SRS fields', () => {
  it('srs-enabled reflects active profile srsEnabled setting', () => {
    window.KrashenProfiles.getActive = () => ({
      name: 'Alice', wordsRead: 0,
      settings: { srsEnabled: true, autosave: false, knownThreshold: 2,
        newWordsPerSession: 5, reExposeCount: 8, reExposeMaxMastery: 3 },
    });
    window.KrashenUI.activateTab('tuning');
    expect(document.getElementById('srs-enabled').checked).toBe(true);
  });

  it('srs-fields is hidden when srsEnabled is false', () => {
    window.KrashenProfiles.getActive = () => ({
      name: 'Alice', wordsRead: 0,
      settings: { srsEnabled: false, autosave: false, knownThreshold: 2,
        newWordsPerSession: 5, reExposeCount: 8, reExposeMaxMastery: 3 },
    });
    window.KrashenUI.activateTab('tuning');
    expect(document.getElementById('srs-fields').hidden).toBe(true);
  });

  it('known threshold select reflects profile setting', () => {
    window.KrashenProfiles.getActive = () => ({
      name: 'Alice', wordsRead: 0,
      settings: { srsEnabled: true, autosave: false, knownThreshold: 3,
        newWordsPerSession: 5, reExposeCount: 8, reExposeMaxMastery: 3 },
    });
    window.KrashenUI.activateTab('tuning');
    expect(document.getElementById('srs-known-threshold').value).toBe('3');
  });
});
