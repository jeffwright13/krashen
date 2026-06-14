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

};
