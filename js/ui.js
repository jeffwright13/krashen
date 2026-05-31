// Left-panel UI: profile chip, SRS parameters, vocab list.
// Loaded as <script type="module">; exposes window.KrashenUI.

(function () {

  // ── Tab switching ─────────────────────────────────────────────────────────

  const TAB_IDS = ['generate', 'vocab', 'tuning', 'settings'];

  function activateTab(tabId) {
    TAB_IDS.forEach(id => {
      const btn   = document.getElementById('tab-btn-' + id);
      const panel = document.getElementById('tab-' + id);
      const active = id === tabId;
      btn.setAttribute('aria-selected', String(active));
      btn.tabIndex = active ? 0 : -1;
      panel.hidden = !active;
    });
    if (tabId === 'vocab')   renderVocabStats();
    if (tabId === 'tuning')  renderSrsFields(window.KrashenProfiles?.getActive()?.settings ?? {});
  }

  TAB_IDS.forEach(id => {
    document.getElementById('tab-btn-' + id).addEventListener('click', () => activateTab(id));
  });

  document.getElementById('tab-bar').addEventListener('keydown', e => {
    const current = TAB_IDS.findIndex(
      id => document.getElementById('tab-btn-' + id).getAttribute('aria-selected') === 'true'
    );
    if (e.key === 'ArrowRight') {
      const next = (current + 1) % TAB_IDS.length;
      activateTab(TAB_IDS[next]);
      document.getElementById('tab-btn-' + TAB_IDS[next]).focus();
      e.preventDefault();
    }
    if (e.key === 'ArrowLeft') {
      const prev = (current - 1 + TAB_IDS.length) % TAB_IDS.length;
      activateTab(TAB_IDS[prev]);
      document.getElementById('tab-btn-' + TAB_IDS[prev]).focus();
      e.preventDefault();
    }
  });

  // ── Profile chip ───────────────────────────────────────────────────────────

  function renderChip() {
    const active  = window.KrashenProfiles?.getActive();
    const nameEl  = document.getElementById('chip-profile-name');
    const wordsEl = document.getElementById('chip-words-read');
    if (active) {
      nameEl.textContent  = active.name;
      const w = active.wordsRead ?? 0;
      wordsEl.textContent = w.toLocaleString() + ' words read';
    } else {
      nameEl.textContent  = 'No profile';
      wordsEl.textContent = '';
    }
  }

  function closeChipPanel() {
    const panel  = document.getElementById('profile-chip-panel');
    const toggle = document.getElementById('chip-toggle-btn');
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = '▾';
  }

  document.getElementById('chip-toggle-btn').addEventListener('click', e => {
    e.stopPropagation();
    const panel   = document.getElementById('profile-chip-panel');
    const opening = panel.hidden;
    if (opening) {
      renderProfileSelect();
      panel.hidden = false;
      e.currentTarget.setAttribute('aria-expanded', 'true');
      e.currentTarget.textContent = '▴';
    } else {
      closeChipPanel();
    }
  });

  document.addEventListener('click', e => {
    if (!document.getElementById('profile-chip').contains(e.target)) {
      closeChipPanel();
    }
  });

  // ── Profile section ────────────────────────────────────────────────────────

  function renderProfileSelect() {
    const sel    = document.getElementById('profile-select');
    const delBtn = document.getElementById('delete-profile-btn');
    const active = window.KrashenProfiles?.getActive();
    const all    = window.KrashenProfiles?.getAll() ?? [];

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
      opt.value       = p.id;
      opt.textContent = p.name;
      if (active && p.id === active.id) opt.selected = true;
      sel.appendChild(opt);
    });

    delBtn.disabled = !active;
  }

  document.getElementById('profile-select').addEventListener('change', e => {
    if (!e.target.value) return;
    window.KrashenProfiles?.switchTo(e.target.value);
    const active = window.KrashenProfiles?.getActive();
    renderSrsFields(active?.settings ?? {});
    renderVocabStats();
    document.getElementById('delete-profile-btn').disabled = !active;
    renderChip();
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
    renderProfileSelect();
    renderChip();
    renderSrsFields(profile.settings);
  });

  document.getElementById('new-profile-name').addEventListener('keydown', e => {
    if (e.key === 'Enter')  document.getElementById('confirm-new-profile').click();
    if (e.key === 'Escape') document.getElementById('cancel-new-profile').click();
  });

  document.getElementById('delete-profile-btn').addEventListener('click', () => {
    const active = window.KrashenProfiles?.getActive();
    if (!active) return;
    if (!confirm(`Delete profile "${active.name}"? This also clears its vocabulary.`)) return;
    window.KrashenProfiles.delete(active.id);
    const remaining = window.KrashenProfiles.getAll();
    if (remaining.length > 0) window.KrashenProfiles.switchTo(remaining[0].id);
    renderProfileSelect();
    renderChip();
    renderSrsFields(window.KrashenProfiles.getActive()?.settings ?? {});
    renderVocabStats();
    closeChipPanel();
  });

  // Keep chip and SRS fields in sync on profile switch
  window.KrashenProfiles?.onSwitch(profile => {
    renderChip();
    renderSrsFields(profile.settings ?? {});
  });

  // ── SRS section ───────────────────────────────────────────────────────────

  function renderSrsFields(settings) {
    const s = Object.assign({}, window.KrashenProfiles?.DEFAULT_SETTINGS, settings);
    document.getElementById('srs-enabled').checked        = s.srsEnabled;
    document.getElementById('srs-autosave').checked       = s.autosave;
    document.getElementById('srs-known-threshold').value  = String(s.knownThreshold);
    document.getElementById('srs-new-words').value        = String(s.newWordsPerSession);
    document.getElementById('srs-reexpose-count').value   = String(s.reExposeCount);
    document.getElementById('srs-reexpose-mastery').value = String(s.reExposeMaxMastery);
    document.getElementById('srs-fields').hidden = !s.srsEnabled;
  }

  function saveSrsFields() {
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

  document.getElementById('srs-enabled').addEventListener('change', e => {
    document.getElementById('srs-fields').hidden = !e.target.checked;
    saveSrsFields();
  });

  ['srs-autosave'].forEach(id =>
    document.getElementById(id).addEventListener('change', saveSrsFields)
  );
  ['srs-known-threshold', 'srs-new-words', 'srs-reexpose-count', 'srs-reexpose-mastery'].forEach(id =>
    document.getElementById(id).addEventListener('change', saveSrsFields)
  );

  // ── Vocab section ─────────────────────────────────────────────────────────

  function renderVocabStats() {
    if (!window.KrashenVocab) return;
    const store   = window.KrashenVocab.getStore();
    const entries = Object.values(store);
    const total   = entries.length;

    const byMastery = [0, 0, 0, 0, 0, 0];
    entries.forEach(e => { byMastery[e.mastery] = (byMastery[e.mastery] || 0) + 1; });

    document.getElementById('vocab-total').textContent =
      `${total} word${total !== 1 ? 's' : ''}`;

    document.getElementById('vocab-mastery-breakdown').textContent =
      byMastery.map((n, i) => `${n}×M${i}`).join('  ');

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

  document.getElementById('clear-vocab-btn').addEventListener('click', () => {
    if (!confirm('Clear all vocabulary for this profile?')) return;
    window.KrashenVocab?.clear();
    renderVocabStats();
  });

  // ── Public API ─────────────────────────────────────────────────────────────

  function refreshSettings() {
    renderChip();
    renderProfileSelect();
    renderSrsFields(window.KrashenProfiles?.getActive()?.settings ?? {});
    renderVocabStats();
  }

  // Initial render on page load
  renderChip();
  renderSrsFields(window.KrashenProfiles?.getActive()?.settings ?? {});

  window.KrashenUI = { refreshSettings, refreshChip: renderChip, activateTab };

})();
