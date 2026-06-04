function effectiveMastery(entry) {
  return entry.userMastery ?? entry.mastery;
}

function deriveMastery({ seenCount, lookupCount }) {
  if (seenCount >= 3 && lookupCount === 0) return 5;
  if (lookupCount >= 1 && seenCount > lookupCount) return 4;
  if (lookupCount >= 2) return 3;
  if (lookupCount === 1) return 2;
  if (seenCount > 0) return 1;
  return 0;
}

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
    return term.toLowerCase().trim();
  }

  function recordLookup(term, translation, context) {
    const key   = normalizeTerm(term);
    if (!key) return null;
    const store = getStore();
    const now   = Date.now();

    if (!store[key]) {
      store[key] = {
        term:         key,
        translations: [],
        firstSeen:    now,
        lastSeen:     now,
        seenCount:    0,
        lookupCount:  0,
        lastLookup:   null,
        contexts:     [],
        mastery:      0,
      };
    }

    const entry = store[key];

    if (translation && !entry.translations.includes(translation)) {
      entry.translations.push(translation);
    }

    entry.lookupCount++;
    entry.lastLookup = now;
    entry.lastSeen   = now;

    if (context && context.trim()) {
      entry.contexts = [context.trim(), ...entry.contexts].slice(0, 3);
    }

    entry.mastery = deriveMastery(entry);
    saveStore(store);
    return entry;
  }

  function recordSeen(termList) {
    const store = getStore();
    const now   = Date.now();
    let changed = false;

    for (const raw of termList) {
      const key = normalizeTerm(raw);
      if (!key || !store[key]) continue;
      store[key].seenCount++;
      store[key].lastSeen = now;
      store[key].mastery  = deriveMastery(store[key]);
      changed = true;
    }

    if (changed) saveStore(store);
  }

  function deleteTerm(term) {
    const key   = normalizeTerm(term);
    const store = getStore();
    if (!store[key]) return;
    delete store[key];
    saveStore(store);
  }

  function setMastery(term, level) {
    const key   = normalizeTerm(term);
    const store = getStore();
    if (!store[key]) return;
    store[key].userMastery = Math.max(0, Math.min(5, Math.round(level)));
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

  function getForPrompt({ knownThreshold = 2, reExposeMaxMastery = 3, reExposeCount = 8 } = {}) {
    const terms = Object.values(getStore()).filter(t => !t.inactive);

    const knownTerms = terms
      .filter(t => effectiveMastery(t) >= knownThreshold)
      .map(t => t.term);

    const reExposeTerms = terms
      .filter(t => effectiveMastery(t) >= 1 && effectiveMastery(t) <= reExposeMaxMastery)
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .slice(0, reExposeCount)
      .map(t => t.term);

    return { knownTerms, reExposeTerms };
  }

  function clear() {
    const key = vocabKey();
    if (key) storage.removeItem(key);
  }

  return { recordLookup, recordSeen, getStore, getForPrompt, setMastery, deleteTerm, setActive, clear };
}

createKrashenVocab.deriveMastery    = deriveMastery;
createKrashenVocab.effectiveMastery = effectiveMastery;

// Browser: auto-initialise once profiles.js has set up the global
if (typeof window !== 'undefined') {
  window.KrashenVocab = createKrashenVocab({
    storage:      localStorage,
    getProfileId: () => window.KrashenProfiles?.getActive()?.id || null,
  });
}

export default createKrashenVocab;
