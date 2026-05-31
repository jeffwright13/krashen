// Settings-panel UI for profiles, SRS parameters, and the vocab list.
// Loaded as a plain <script> after profiles.js and vocab.js, exposing window.KrashenUI.

(function () {

  // ── Profile section ────────────────────────────────────────────────────────

  function renderProfileSelect() {
    const sel     = document.getElementById('profile-select');
    const delBtn  = document.getElementById('delete-profile-btn');
    const active  = window.KrashenProfiles?.getActive();
    const all     = window.KrashenProfiles?.getAll() ?? [];

    sel.innerHTML = '';

    if (all.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '(no profiles)';
      sel.appendChild(opt);
      delBtn.disabled = true;
      return;
    }

    all.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      if (active && p.id === active.id) opt.selected = true;
      sel.appendChild(opt);
    });

    delBtn.disabled = !active;
  }

  function renderSrsFields(settings) {
    const s = Object.assign({}, window.KrashenProfiles?.DEFAULT_SETTINGS, settings);
    document.getElementById('srs-enabled').checked         = s.srsEnabled;
    document.getElementById('srs-autosave').checked        = s.autosave;
    document.getElementById('srs-known-threshold').value   = String(s.knownThreshold);
    document.getElementById('srs-new-words').value         = String(s.newWordsPerSession);
    document.getElementById('srs-reexpose-count').value    = String(s.reExposeCount);
    document.getElementById('srs-reexpose-mastery').value  = String(s.reExposeMaxMastery);
    document.getElementById('srs-fields').hidden = !s.srsEnabled;
  }

  function renderVocabStats() {
    if (!window.KrashenVocab) return;
    const store   = window.KrashenVocab.getStore();
    const entries = Object.values(store);
    const total   = entries.length;

    const byMastery = [0, 0, 0, 0, 0, 0];
    entries.forEach(e => { byMastery[e.mastery] = (byMastery[e.mastery] || 0) + 1; });

    document.getElementById('vocab-total').textContent =
      `${total} word${total !== 1 ? 's' : ''}`;

    const breakdown = document.getElementById('vocab-mastery-breakdown');
    breakdown.textContent = byMastery
      .map((n, i) => `${n}×M${i}`)
      .join('  ');

    const list = document.getElementById('vocab-term-list');
    list.innerHTML = '';
    entries
      .slice()
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .forEach(e => {
        const row = document.createElement('div');
        row.className = 'vocab-item';
        row.innerHTML =
          `<span class="vocab-term">${e.term}</span>` +
          `<span class="vocab-mastery">M${e.mastery}</span>`;
        list.appendChild(row);
      });
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  function refreshSettings() {
    renderProfileSelect();
    const active = window.KrashenProfiles?.getActive();
    renderSrsFields(active?.settings ?? {});
    renderVocabStats();
  }

  function saveSettings() {
    const active = window.KrashenProfiles?.getActive();
    if (!active) return;
    window.KrashenProfiles.updateSettings(active.id, {
      srsEnabled:         document.getElementById('srs-enabled').checked,
      autosave:           document.getElementById('srs-autosave').checked,
      knownThreshold:     parseInt(document.getElementById('srs-known-threshold').value, 10),
      newWordsPerSession: parseInt(document.getElementById('srs-new-words').value, 10),
      reExposeCount:      parseInt(document.getElementById('srs-reexpose-count').value, 10),
      reExposeMaxMastery: parseInt(document.getElementById('srs-reexpose-mastery').value, 10),
    });
  }

  // ── Event wiring ───────────────────────────────────────────────────────────

  document.getElementById('profile-select').addEventListener('change', e => {
    if (!e.target.value) return;
    window.KrashenProfiles?.switchTo(e.target.value);
    const active = window.KrashenProfiles?.getActive();
    renderSrsFields(active?.settings ?? {});
    renderVocabStats();
    document.getElementById('delete-profile-btn').disabled = !active;
  });

  document.getElementById('new-profile-btn').addEventListener('click', () => {
    document.getElementById('new-profile-form').hidden = false;
    document.getElementById('new-profile-name').focus();
  });

  document.getElementById('cancel-new-profile').addEventListener('click', () => {
    document.getElementById('new-profile-form').hidden = true;
    document.getElementById('new-profile-name').value  = '';
  });

  document.getElementById('confirm-new-profile').addEventListener('click', () => {
    const name = document.getElementById('new-profile-name').value.trim();
    if (!name) return;
    const profile = window.KrashenProfiles?.create(name);
    if (!profile) return;
    window.KrashenProfiles.switchTo(profile.id);
    document.getElementById('new-profile-form').hidden = true;
    document.getElementById('new-profile-name').value  = '';
    refreshSettings();
  });

  document.getElementById('new-profile-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('confirm-new-profile').click();
    if (e.key === 'Escape') document.getElementById('cancel-new-profile').click();
  });

  document.getElementById('delete-profile-btn').addEventListener('click', () => {
    const active = window.KrashenProfiles?.getActive();
    if (!active) return;
    if (!confirm(`Delete profile "${active.name}"? This also clears its vocabulary.`)) return;
    window.KrashenProfiles.delete(active.id);
    const remaining = window.KrashenProfiles.getAll();
    if (remaining.length > 0) window.KrashenProfiles.switchTo(remaining[0].id);
    refreshSettings();
  });

  document.getElementById('srs-enabled').addEventListener('change', e => {
    document.getElementById('srs-fields').hidden = !e.target.checked;
  });

  document.getElementById('clear-vocab-btn').addEventListener('click', () => {
    if (!confirm('Clear all vocabulary for this profile?')) return;
    window.KrashenVocab?.clear();
    renderVocabStats();
  });

  window.KrashenUI = { refreshSettings, saveSettings };

})();
