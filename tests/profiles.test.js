const assert         = require('assert');
const createProfiles = require('../js/profiles.js').default;

function makeMockStorage() {
  const store = Object.create(null);
  return {
    getItem:    k     => (k in store ? store[k] : null),
    setItem:    (k, v) => { store[k] = v; },
    removeItem: k     => { delete store[k]; },
  };
}

module.exports = {

  'create() produces a profile with expected shape': function () {
    const P = createProfiles(makeMockStorage());
    const p = P.create('Alice');
    assert.strictEqual(p.name, 'Alice');
    assert.strictEqual(typeof p.id, 'string');
    assert.strictEqual(typeof p.created, 'number');
    assert.strictEqual(typeof p.lastActive, 'number');
    assert.strictEqual(typeof p.settings, 'object');
    assert.strictEqual(p.settings.autosave, false);
    assert.strictEqual(p.settings.srsEnabled, true);
  },

  'getAll() returns all created profiles': function () {
    const P = createProfiles(makeMockStorage());
    P.create('Alice');
    P.create('Bob');
    const all = P.getAll();
    assert.strictEqual(all.length, 2);
    assert.ok(all.some(p => p.name === 'Alice'));
    assert.ok(all.some(p => p.name === 'Bob'));
  },

  'switchTo() updates the active profile': function () {
    const P = createProfiles(makeMockStorage());
    const profile = P.create('Alice');
    P.switchTo(profile.id);
    const active = P.getActive();
    assert.notStrictEqual(active, null);
    assert.strictEqual(active.id, profile.id);
  },

  'delete() removes the profile from the list': function () {
    const P = createProfiles(makeMockStorage());
    const profile = P.create('Alice');
    P.delete(profile.id);
    assert.strictEqual(P.getAll().length, 0);
  },

  'delete() fires no errors when vocab key is absent': function () {
    const P = createProfiles(makeMockStorage());
    const profile = P.create('Alice');
    assert.doesNotThrow(() => P.delete(profile.id));
  },

  'delete() clears active profile when the active profile is deleted': function () {
    const P = createProfiles(makeMockStorage());
    const profile = P.create('Alice');
    P.switchTo(profile.id);
    P.delete(profile.id);
    assert.strictEqual(P.getActive(), null);
  },

  'getActive() returns null when no profile exists': function () {
    const P = createProfiles(makeMockStorage());
    assert.strictEqual(P.getActive(), null);
  },

  'onSwitch() callback fires when profile is switched': function () {
    const P = createProfiles(makeMockStorage());
    let fired = null;
    P.onSwitch(p => { fired = p; });
    const profile = P.create('Alice');
    P.switchTo(profile.id);
    assert.notStrictEqual(fired, null);
    assert.strictEqual(fired.id, profile.id);
  },

  'create() initialises wordsRead to 0': function () {
    const P = createProfiles(makeMockStorage());
    const profile = P.create('Alice');
    assert.strictEqual(profile.wordsRead, 0);
  },

  'incrementWordsRead() adds to wordsRead': function () {
    const P = createProfiles(makeMockStorage());
    const profile = P.create('Alice');
    P.incrementWordsRead(profile.id, 350);
    P.incrementWordsRead(profile.id, 200);
    const updated = P.getAll().find(p => p.id === profile.id);
    assert.strictEqual(updated.wordsRead, 550);
  },

  'incrementWordsRead() handles missing wordsRead field (backward compat)': function () {
    const storage = makeMockStorage();
    const P = createProfiles(storage);
    const profile = P.create('Alice');
    // Simulate an old profile with no wordsRead field
    const profiles = P.getAll();
    delete profiles[0].wordsRead;
    storage.setItem('krashen_profiles', JSON.stringify(profiles));
    P.incrementWordsRead(profile.id, 100);
    const updated = P.getAll().find(p => p.id === profile.id);
    assert.strictEqual(updated.wordsRead, 100);
  },

  'updateSettings() persists changes to profile settings': function () {
    const P = createProfiles(makeMockStorage());
    const profile = P.create('Alice');
    P.updateSettings(profile.id, { autosave: true, newWordsPerSession: 8 });
    const updated = P.getAll().find(p => p.id === profile.id);
    assert.strictEqual(updated.settings.autosave, true);
    assert.strictEqual(updated.settings.newWordsPerSession, 8);
    assert.strictEqual(updated.settings.srsEnabled, true); // default preserved
  },

  'create() includes formDefaults with correct defaults': function () {
    const P = createProfiles(makeMockStorage());
    const profile = P.create('Alice');
    assert.ok(typeof profile.formDefaults === 'object');
    assert.strictEqual(profile.formDefaults.provider,       'openai');
    assert.strictEqual(profile.formDefaults.cefrLevel,      'A2');
    assert.strictEqual(profile.formDefaults.wordCap,        1000);
    assert.strictEqual(profile.formDefaults.targetLanguage, 'Spanish');
    assert.strictEqual(profile.formDefaults.targetDialect,  'Neutral');
    assert.strictEqual(profile.formDefaults.nativeLanguage, 'English');
  },

  'updateFormDefaults() patches formDefaults and preserves unpatched keys': function () {
    const P = createProfiles(makeMockStorage());
    const profile = P.create('Alice');
    P.updateFormDefaults(profile.id, { cefrLevel: 'B1', provider: 'google' });
    const updated = P.getAll().find(p => p.id === profile.id);
    assert.strictEqual(updated.formDefaults.cefrLevel,      'B1');
    assert.strictEqual(updated.formDefaults.provider,       'google');
    assert.strictEqual(updated.formDefaults.targetLanguage, 'Spanish'); // unchanged
  },

  'createFromBundle() builds a profile with merged settings/formDefaults in one write': function () {
    const P = createProfiles(makeMockStorage());
    const bundle = {
      name: 'Imported',
      created: 1000, lastActive: 2000, wordsRead: 42,
      settings: { knownThreshold: 3 },
      formDefaults: { cefrLevel: 'B2' },
    };
    const p = P.createFromBundle(bundle, 'Imported');
    assert.strictEqual(p.name, 'Imported');
    assert.strictEqual(p.wordsRead, 42);
    assert.strictEqual(p.settings.knownThreshold, 3);
    assert.strictEqual(p.settings.srsEnabled, true);    // default preserved
    assert.strictEqual(p.formDefaults.cefrLevel, 'B2');
    assert.strictEqual(p.formDefaults.provider, 'openai'); // default preserved
    assert.strictEqual(P.getAll().length, 1);
  },

  'createFromBundle() uses resolvedName not bundle name': function () {
    const P = createProfiles(makeMockStorage());
    const p = P.createFromBundle({ name: 'Alice', wordsRead: 0 }, 'Alice (2)');
    assert.strictEqual(p.name, 'Alice (2)');
  },

  'importProfileVocab() returns true on success': function () {
    const P = createProfiles(makeMockStorage());
    const p = P.create('Alice');
    const result = P.importProfileVocab(p.id, { gato: { term: 'gato', mastery: 2 } });
    assert.strictEqual(result, true);
  },

  'importProfileVocab() returns false when storage throws': function () {
    const brokenStorage = {
      getItem:    () => null,
      setItem:    () => { throw new Error('QuotaExceededError'); },
      removeItem: () => {},
    };
    const P = createProfiles(brokenStorage);
    const result = P.importProfileVocab('any-id', { gato: { term: 'gato' } });
    assert.strictEqual(result, false);
  },

  'updateFormDefaults() is backward-compatible for profiles without formDefaults': function () {
    const storage = makeMockStorage();
    const P = createProfiles(storage);
    const profile = P.create('Alice');
    // Simulate old profile with no formDefaults field
    const profiles = P.getAll();
    delete profiles[0].formDefaults;
    storage.setItem('krashen_profiles', JSON.stringify(profiles));
    P.updateFormDefaults(profile.id, { cefrLevel: 'C1' });
    const updated = P.getAll().find(p => p.id === profile.id);
    assert.strictEqual(updated.formDefaults.cefrLevel,      'C1');
    assert.strictEqual(updated.formDefaults.targetLanguage, 'Spanish'); // filled from defaults
  },

};
