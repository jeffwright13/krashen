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

  'updateSettings() persists changes to profile settings': function () {
    const P = createProfiles(makeMockStorage());
    const profile = P.create('Alice');
    P.updateSettings(profile.id, { autosave: true, newWordsPerSession: 8 });
    const updated = P.getAll().find(p => p.id === profile.id);
    assert.strictEqual(updated.settings.autosave, true);
    assert.strictEqual(updated.settings.newWordsPerSession, 8);
    assert.strictEqual(updated.settings.srsEnabled, true); // default preserved
  },

};
