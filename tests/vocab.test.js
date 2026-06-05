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

  'recordLookup() creates entry keyed by lemma': function () {
    const v = makeVocab('p1');
    v.recordLookup('hablar', 'hablé', 'to speak', 'Ayer hablé con ella.');
    const entry = v.getStore()['hablar'];
    assert.ok(entry, 'entry should exist under lemma key');
    assert.strictEqual(entry.term, 'hablar');
    assert.ok(entry.translations.includes('to speak'));
    assert.strictEqual(entry.lookupCount, 1);
    assert.strictEqual(entry.seenCount, 0);
    assert.strictEqual(typeof entry.firstSeen, 'number');
    assert.strictEqual(entry.contexts.length, 1);
    assert.ok(!v.getStore()['hablé'], 'entry should NOT exist under surface form key');
  },

  'recordLookup() stores the surface form in forms[]': function () {
    const v = makeVocab('p1');
    v.recordLookup('hablar', 'hablé', 'to speak', '');
    assert.deepStrictEqual(v.getStore()['hablar'].forms, ['hablé']);
  },

  'recordLookup() accumulates multiple surface forms': function () {
    const v = makeVocab('p1');
    v.recordLookup('hablar', 'hablé',   'to speak', '');
    v.recordLookup('hablar', 'hablas',  'to speak', '');
    v.recordLookup('hablar', 'hablamos','to speak', '');
    const { forms } = v.getStore()['hablar'];
    assert.ok(forms.includes('hablé'));
    assert.ok(forms.includes('hablas'));
    assert.ok(forms.includes('hablamos'));
    assert.strictEqual(forms.length, 3);
  },

  'recordLookup() does not duplicate surface forms': function () {
    const v = makeVocab('p1');
    v.recordLookup('hablar', 'hablé', 'to speak', '');
    v.recordLookup('hablar', 'hablé', 'to speak', '');
    assert.strictEqual(v.getStore()['hablar'].forms.length, 1);
  },

  'recordLookup() when lemma === surfaceForm stores it in forms': function () {
    const v = makeVocab('p1');
    v.recordLookup('hablar', 'hablar', 'to speak', '');
    assert.deepStrictEqual(v.getStore()['hablar'].forms, ['hablar']);
  },

  'recordLookup() twice on same lemma increments lookupCount': function () {
    const v = makeVocab('p1');
    v.recordLookup('gato', 'gato', 'cat', 'El gato corre.');
    v.recordLookup('gato', 'gato', 'cat', 'El gato duerme.');
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
    v.recordLookup('uno',  'uno',  'one',   '');
    v.recordLookup('dos',  'dos',  'two',   '');
    v.recordLookup('tres', 'tres', 'three', '');

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
    v.recordLookup('rojo', 'rojo', 'red', 'context one');
    v.recordLookup('rojo', 'rojo', 'red', 'context two');
    v.recordLookup('rojo', 'rojo', 'red', 'context three');
    v.recordLookup('rojo', 'rojo', 'red', 'context four');
    const entry = v.getStore()['rojo'];
    assert.strictEqual(entry.contexts.length, 3);
  },

  'deleteTerm() removes the entry from the store': function () {
    const v = makeVocab('p1');
    v.recordLookup('gato', 'gato', 'cat', '');
    v.deleteTerm('gato');
    assert.strictEqual(v.getStore()['gato'], undefined);
  },

  'deleteTerm() is a no-op for unknown terms': function () {
    const v = makeVocab('p1');
    assert.doesNotThrow(() => v.deleteTerm('nonexistent'));
  },

  'setActive(false) marks an entry inactive': function () {
    const v = makeVocab('p1');
    v.recordLookup('perro', 'perro', 'dog', '');
    v.setActive('perro', false);
    assert.strictEqual(v.getStore()['perro'].inactive, true);
  },

  'setActive(true) removes the inactive flag': function () {
    const v = makeVocab('p1');
    v.recordLookup('perro', 'perro', 'dog', '');
    v.setActive('perro', false);
    v.setActive('perro', true);
    assert.strictEqual(v.getStore()['perro'].inactive, undefined);
  },

  'setMastery() sets userMastery on the entry': function () {
    const v = makeVocab('p1');
    v.recordLookup('gato', 'gato', 'cat', '');
    v.setMastery('gato', 4);
    assert.strictEqual(v.getStore()['gato'].userMastery, 4);
  },

  'setMastery() clamps to 0–5': function () {
    const v = makeVocab('p1');
    v.recordLookup('gato', 'gato', 'cat', '');
    v.setMastery('gato', 99);
    assert.strictEqual(v.getStore()['gato'].userMastery, 5);
    v.setMastery('gato', -3);
    assert.strictEqual(v.getStore()['gato'].userMastery, 0);
  },

  'getForPrompt() uses userMastery when set': function () {
    const v = makeVocab('p1');
    v.recordLookup('gato', 'gato', 'cat', ''); // mastery=2
    v.setMastery('gato', 5);           // userMastery overrides to 5
    const { knownTerms } = v.getForPrompt({ knownThreshold: 4, reExposeMaxMastery: 3, reExposeCount: 8 });
    assert.ok(knownTerms.includes('gato'), 'userMastery=5 should classify as known at threshold 4');
  },

  'getForPrompt() falls back to mastery when userMastery absent': function () {
    const v = makeVocab('p1');
    v.recordLookup('gato', 'gato', 'cat', ''); // mastery=2, no userMastery
    const { knownTerms } = v.getForPrompt({ knownThreshold: 3, reExposeMaxMastery: 3, reExposeCount: 8 });
    assert.ok(!knownTerms.includes('gato'), 'mastery=2 below threshold 3');
  },

  'getForPrompt() excludes inactive entries': function () {
    const v = makeVocab('p1');
    v.recordLookup('uno',  'uno',  'one', '');
    v.recordLookup('dos',  'dos',  'two', '');
    v.setActive('dos', false);
    const { knownTerms, reExposeTerms } = v.getForPrompt({
      knownThreshold: 2, reExposeMaxMastery: 3, reExposeCount: 8,
    });
    assert.ok(!knownTerms.includes('dos'),     'inactive term excluded from knownTerms');
    assert.ok(!reExposeTerms.includes('dos'),  'inactive term excluded from reExposeTerms');
    assert.ok(knownTerms.includes('uno'),      'active term still present');
  },

  'recordSeen() credits seenCount via stored surface form': function () {
    const v = makeVocab('p1');
    v.recordLookup('hablar', 'hablé', 'to speak', '');
    v.recordSeen(['hablé']);
    assert.strictEqual(v.getStore()['hablar'].seenCount, 1);
  },

  'recordSeen() credits seenCount when story uses the lemma directly': function () {
    const v = makeVocab('p1');
    v.recordLookup('hablar', 'hablar', 'to speak', '');
    v.recordSeen(['hablar']);
    assert.strictEqual(v.getStore()['hablar'].seenCount, 1);
  },

  'recordSeen() does not credit unstored inflections': function () {
    const v = makeVocab('p1');
    v.recordLookup('hablar', 'hablé', 'to speak', '');
    v.recordSeen(['hablo']); // 'hablo' was never looked up
    assert.strictEqual(v.getStore()['hablar'].seenCount, 0);
  },

};
