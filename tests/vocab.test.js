const assert      = require('assert');
const createVocab = require('../js/vocab.js').default;

function makeMockStorage() {
  const store = Object.create(null);
  return {
    getItem:    k      => (k in store ? store[k] : null),
    setItem:    (k, v) => { store[k] = v; },
    removeItem: k      => { delete store[k]; },
  };
}

function makeVocab(profileId) {
  return createVocab({
    storage:      makeMockStorage(),
    getProfileId: () => profileId,
  });
}

module.exports = {

  'recordLookup() creates entry with correct shape': function () {
    const v = makeVocab('p1');
    v.recordLookup('hola', 'hello', 'Buenos días. Hola.');
    const entry = v.getStore()['hola'];
    assert.ok(entry, 'entry should exist');
    assert.strictEqual(entry.term, 'hola');
    assert.ok(entry.translations.includes('hello'));
    assert.strictEqual(entry.lookupCount, 1);
    assert.strictEqual(entry.seenCount, 0);
    assert.strictEqual(typeof entry.firstSeen, 'number');
    assert.strictEqual(entry.contexts.length, 1);
  },

  'recordLookup() twice on same term increments lookupCount': function () {
    const v = makeVocab('p1');
    v.recordLookup('gato', 'cat', 'El gato corre.');
    v.recordLookup('gato', 'cat', 'El gato duerme.');
    const entry = v.getStore()['gato'];
    assert.strictEqual(entry.lookupCount, 2);
  },

  'mastery recalculates correctly for each level boundary': function () {
    const derive = createVocab.deriveMastery;
    assert.strictEqual(derive({ seenCount: 0, lookupCount: 0 }), 0, 'level 0');
    assert.strictEqual(derive({ seenCount: 1, lookupCount: 0 }), 1, 'level 1');
    assert.strictEqual(derive({ seenCount: 0, lookupCount: 1 }), 2, 'level 2');
    assert.strictEqual(derive({ seenCount: 0, lookupCount: 2 }), 3, 'level 3');
    assert.strictEqual(derive({ seenCount: 3, lookupCount: 1 }), 4, 'level 4: seen > lookupCount');
    assert.strictEqual(derive({ seenCount: 3, lookupCount: 0 }), 5, 'level 5');
  },

  'getForPrompt() returns correct known/reExpose split and respects reExposeCount': function () {
    const v = makeVocab('p1');
    // Create 3 mastery-2 terms
    v.recordLookup('uno',  'one',   '');
    v.recordLookup('dos',  'two',   '');
    v.recordLookup('tres', 'three', '');

    const { knownTerms, reExposeTerms } = v.getForPrompt({
      knownThreshold:    2,
      reExposeMaxMastery: 3,
      reExposeCount:     2,
    });

    // All three have mastery 2 → all known
    assert.strictEqual(knownTerms.length, 3);
    // reExposeCount caps at 2
    assert.strictEqual(reExposeTerms.length, 2);
  },

  'contexts array is capped at 3': function () {
    const v = makeVocab('p1');
    v.recordLookup('rojo', 'red', 'context one');
    v.recordLookup('rojo', 'red', 'context two');
    v.recordLookup('rojo', 'red', 'context three');
    v.recordLookup('rojo', 'red', 'context four');
    const entry = v.getStore()['rojo'];
    assert.strictEqual(entry.contexts.length, 3);
  },

};
