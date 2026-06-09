const PROFILES_KEY = 'krashen_profiles';
const ACTIVE_KEY   = 'krashen_active_profile';

const DEFAULT_SETTINGS = {
  autosave: false,
};

const DEFAULT_FORM_DEFAULTS = {
  provider:       'openai',
  cefrLevel:      'A2',
  wordCap:        1000,
  targetLanguage: 'Spanish',
  targetDialect:  'Neutral',
  nativeLanguage: 'English',
};

function createKrashenProfiles(storage) {
  const switchCallbacks = [];

  function read(key, fallback) {
    try {
      const raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    storage.setItem(key, JSON.stringify(value));
  }

  function getAll() {
    return read(PROFILES_KEY, []);
  }

  function getActive() {
    const activeId = storage.getItem(ACTIVE_KEY);
    if (!activeId) return null;
    return getAll().find(p => p.id === activeId) || null;
  }

  function create(name) {
    const profile = {
      id:           String(Date.now()),
      name:         name.trim(),
      created:      Date.now(),
      lastActive:   Date.now(),
      wordsRead:    0,
      settings:     Object.assign({}, DEFAULT_SETTINGS, { vocabEnabled: false }),
      formDefaults: Object.assign({}, DEFAULT_FORM_DEFAULTS),
    };
    const profiles = getAll();
    profiles.push(profile);
    write(PROFILES_KEY, profiles);
    return profile;
  }

  function switchTo(profileId) {
    const profiles = getAll();
    const idx = profiles.findIndex(p => p.id === profileId);
    if (idx === -1) return;
    profiles[idx].lastActive = Date.now();
    write(PROFILES_KEY, profiles);
    storage.setItem(ACTIVE_KEY, profileId);
    switchCallbacks.forEach(cb => cb(profiles[idx]));
  }

  function deleteProfile(profileId) {
    const profiles = getAll().filter(p => p.id !== profileId);
    write(PROFILES_KEY, profiles);
    try { storage.removeItem('krashen_' + profileId + '_vocab'); } catch (_) {}
    if (storage.getItem(ACTIVE_KEY) === profileId) {
      storage.removeItem(ACTIVE_KEY);
    }
  }

  function updateSettings(profileId, patch) {
    const profiles = getAll();
    const idx = profiles.findIndex(p => p.id === profileId);
    if (idx === -1) return;
    profiles[idx].settings = Object.assign({}, DEFAULT_SETTINGS, profiles[idx].settings, patch);
    write(PROFILES_KEY, profiles);
  }

  function updateFormDefaults(profileId, patch) {
    const profiles = getAll();
    const idx = profiles.findIndex(p => p.id === profileId);
    if (idx === -1) return;
    profiles[idx].formDefaults = Object.assign(
      {}, DEFAULT_FORM_DEFAULTS, profiles[idx].formDefaults, patch
    );
    write(PROFILES_KEY, profiles);
  }

  function incrementWordsRead(profileId, count) {
    const profiles = getAll();
    const idx = profiles.findIndex(p => p.id === profileId);
    if (idx === -1) return;
    profiles[idx].wordsRead = (profiles[idx].wordsRead || 0) + count;
    write(PROFILES_KEY, profiles);
  }

  function createFromBundle(bundleProfile, resolvedName) {
    const profile = {
      id:           String(Date.now()),
      name:         resolvedName,
      created:      bundleProfile.created    ?? Date.now(),
      lastActive:   bundleProfile.lastActive  ?? Date.now(),
      wordsRead:    bundleProfile.wordsRead   ?? 0,
      settings:     Object.assign({}, DEFAULT_SETTINGS,      bundleProfile.settings     ?? {}),
      formDefaults: Object.assign({}, DEFAULT_FORM_DEFAULTS, bundleProfile.formDefaults ?? {}),
    };
    const profiles = getAll();
    profiles.push(profile);
    write(PROFILES_KEY, profiles);
    return profile;
  }

  function importProfileVocab(profileId, vocabStore) {
    const key = 'krashen_' + profileId + '_vocab';
    try {
      storage.setItem(key, JSON.stringify(vocabStore));
      return true;
    } catch (_) {
      return false;
    }
  }

  function onSwitch(callback) {
    switchCallbacks.push(callback);
  }

  return {
    getAll,
    getActive,
    create,
    createFromBundle,
    switchTo,
    delete:             deleteProfile,
    updateSettings,
    updateFormDefaults,
    incrementWordsRead,
    importProfileVocab,
    onSwitch,
    DEFAULT_SETTINGS,
    DEFAULT_FORM_DEFAULTS,
  };
}

// Browser: auto-initialise with localStorage and expose as a global
if (typeof window !== 'undefined') {
  window.KrashenProfiles = createKrashenProfiles(localStorage);
}

export default createKrashenProfiles;
