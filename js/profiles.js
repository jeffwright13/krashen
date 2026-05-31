const PROFILES_KEY = 'krashen_profiles';
const ACTIVE_KEY   = 'krashen_active_profile';

const DEFAULT_SETTINGS = {
  autosave:           false,
  srsEnabled:         true,
  knownThreshold:     2,
  newWordsPerSession: 5,
  reExposeCount:      8,
  reExposeMaxMastery: 3,
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
      id:         String(Date.now()),
      name:       name.trim(),
      created:    Date.now(),
      lastActive: Date.now(),
      settings:   Object.assign({}, DEFAULT_SETTINGS),
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

  function onSwitch(callback) {
    switchCallbacks.push(callback);
  }

  return {
    getAll,
    getActive,
    create,
    switchTo,
    delete:         deleteProfile,
    updateSettings,
    onSwitch,
    DEFAULT_SETTINGS,
  };
}

// Browser: auto-initialise with localStorage and expose as a global
if (typeof window !== 'undefined') {
  window.KrashenProfiles = createKrashenProfiles(localStorage);
}

export default createKrashenProfiles;
