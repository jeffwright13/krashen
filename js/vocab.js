function createKrashenVocab({ storage, getProfileId }) {

  function vocabKey() {
    const id = getProfileId();
    return id ? 'krashen_' + id + '_vocab' : null;
  }

  function getStore() {
    const key = vocabKey();
    if (!key) return {};
    try {
      const raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function saveStore(store) {
    const key = vocabKey();
    if (key) storage.setItem(key, JSON.stringify(store));
  }

  function normalizeTerm(term) {
    return term.toLowerCase().trim().replace(/^[.,;:!?¿¡"'«»…]+|[.,;:!?¿¡"'«»…]+$/g, '');
  }

  function recordLookup(lemma, surfaceForm, translation, context) {
    const key  = normalizeTerm(lemma);
    const form = normalizeTerm(surfaceForm || lemma);
    if (!key) return null;
    const store = getStore();
    const now   = Date.now();

    if (!store[key]) {
      store[key] = {
        term:         key,
        forms:        [],
        translations: [],
        firstSeen:    now,
        lastSeen:     now,
        lookupCount:  0,
        lastLookup:   null,
        contexts:     [],
      };
    }

    const entry = store[key];

    if (form && !entry.forms.includes(form)) {
      entry.forms.push(form);
    }

    if (translation && !entry.translations.includes(translation)) {
      entry.translations.push(translation);
    }

    entry.lookupCount++;
    entry.lastLookup = now;
    entry.lastSeen   = now;

    if (context && context.trim()) {
      entry.contexts = [context.trim(), ...entry.contexts].slice(0, 3);
    }

    saveStore(store);
    return entry;
  }

  function deleteTerm(term) {
    const key   = normalizeTerm(term);
    const store = getStore();
    if (!store[key]) return;
    delete store[key];
    saveStore(store);
  }

  function setActive(term, isActive) {
    const key   = normalizeTerm(term);
    const store = getStore();
    if (!store[key]) return;
    if (isActive) {
      delete store[key].inactive;
    } else {
      store[key].inactive = true;
    }
    saveStore(store);
  }

  function clear() {
    const key = vocabKey();
    if (key) storage.removeItem(key);
  }

  return { recordLookup, getStore, deleteTerm, setActive, clear };
}

// Browser: auto-initialise once profiles.js has set up the global
if (typeof window !== 'undefined') {
  window.KrashenVocab = createKrashenVocab({
    storage:      localStorage,
    getProfileId: () => window.KrashenProfiles?.getActive()?.id || null,
  });
}

export default createKrashenVocab;
