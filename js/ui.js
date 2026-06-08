// Left-panel UI: profile chip, SRS parameters, vocab list.
// Loaded as <script type="module">; exposes window.KrashenUI.

import { exportProfileBundle } from './export.js';
import { parseProfileBundle  } from './import.js';
import { triggerDownload     } from './display.js';

(function () {

  // ── Tab switching ─────────────────────────────────────────────────────────

  const TAB_IDS = ['configure', 'vocab'];

  function applyVocabEnabled(enabled) {
    document.getElementById('vocab-features').hidden = !enabled;
    document.getElementById('vocab-enabled').checked = enabled;
  }

  function activateTab(tabId) {
    TAB_IDS.forEach(id => {
      const btn   = document.getElementById('tab-btn-' + id);
      const panel = document.getElementById('tab-' + id);
      const active = id === tabId;
      btn.setAttribute('aria-selected', String(active));
      btn.tabIndex = active ? 0 : -1;
      panel.hidden = !active;
    });
    if (tabId === 'vocab') {
      renderVocabStats();
      renderSrsFields(window.KrashenProfiles?.getActive()?.settings ?? {});
    }
  }

  // Accordion: only one <details> open at a time within a container
  function initAccordion(containerEl) {
    if (!containerEl) return;
    containerEl.querySelectorAll(':scope > details, :scope > form > details').forEach(d => {
      d.addEventListener('toggle', () => {
        if (!d.open) return;
        containerEl.querySelectorAll(':scope > details, :scope > form > details').forEach(other => {
          if (other !== d) other.open = false;
        });
      });
    });
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
    const sel       = document.getElementById('profile-select');
    const delBtn    = document.getElementById('delete-profile-btn');
    const exportBtn = document.getElementById('export-profile-btn');
    const active    = window.KrashenProfiles?.getActive();
    const all       = window.KrashenProfiles?.getAll() ?? [];

    sel.innerHTML = '';

    if (all.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '(no profiles)';
      sel.appendChild(opt);
      delBtn.disabled    = true;
      exportBtn.disabled = true;
      return;
    }

    all.forEach(p => {
      const opt = document.createElement('option');
      opt.value       = p.id;
      opt.textContent = p.name;
      if (active && p.id === active.id) opt.selected = true;
      sel.appendChild(opt);
    });

    delBtn.disabled    = !active;
    exportBtn.disabled = !active;
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
    applyVocabEnabled(profile.settings?.vocabEnabled ?? true);
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

  // ── Profile export / import ────────────────────────────────────────────────

  document.getElementById('export-profile-btn').addEventListener('click', () => {
    const active = window.KrashenProfiles?.getActive();
    if (!active) return;
    const vocabStore = window.KrashenVocab?.getStore() ?? {};
    const json = exportProfileBundle(active, vocabStore);
    const slug = active.name.replace(/[^a-z0-9]+/gi, '-').slice(0, 40).toLowerCase();
    triggerDownload(`krashen-profile-${slug}.json`, json, 'application/json');
  });

  document.getElementById('import-profile-btn').addEventListener('click', () => {
    document.getElementById('import-profile-input').click();
  });

  document.getElementById('import-profile-input').addEventListener('change', e => {
    const file     = e.target.files[0];
    const statusEl = document.getElementById('import-profile-status');
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        if (!window.KrashenProfiles) throw new Error('Profiles module not available');
        const { profile: bundleProfile, vocab } = parseProfileBundle(ev.target.result);

        // Resolve name collision
        const allNames = window.KrashenProfiles.getAll().map(p => p.name);
        let name   = bundleProfile.name;
        let suffix = 2;
        while (allNames.includes(name)) name = `${bundleProfile.name} (${suffix++})`;

        // Create profile from bundle in a single localStorage write
        const newProfile = window.KrashenProfiles.createFromBundle(bundleProfile, name);

        // Write vocab store; bail with error if storage is full
        if (Object.keys(vocab).length > 0) {
          const ok = window.KrashenProfiles.importProfileVocab(newProfile.id, vocab);
          if (!ok) throw new Error('Profile created but vocab could not be saved (storage full)');
        }

        renderProfileSelect();
        const renamed = name !== bundleProfile.name ? ` (renamed to "${name}")` : '';
        statusEl.textContent = `Profile imported successfully${renamed}.`;
        statusEl.className   = 'chip-import-status ok';
        statusEl.hidden      = false;
        setTimeout(() => { statusEl.hidden = true; }, 4000);
      } catch (err) {
        statusEl.textContent = `Import failed: ${err.message}`;
        statusEl.className   = 'chip-import-status fail';
        statusEl.hidden      = false;
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  });

  // Keep chip, SRS fields, and vocab in sync on profile switch
  window.KrashenProfiles?.onSwitch(profile => {
    showInactive = false;
    renderChip();
    renderSrsFields(profile.settings ?? {});
    renderVocabStats();
    applyVocabEnabled(profile.settings?.vocabEnabled ?? true);
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
    const patch = {
      srsEnabled:         document.getElementById('srs-enabled').checked,
      autosave:           document.getElementById('srs-autosave').checked,
      knownThreshold:     parseInt(document.getElementById('srs-known-threshold').value, 10),
      newWordsPerSession: parseInt(document.getElementById('srs-new-words').value, 10),
      reExposeCount:      parseInt(document.getElementById('srs-reexpose-count').value, 10),
      reExposeMaxMastery: parseInt(document.getElementById('srs-reexpose-mastery').value, 10),
    };
    window.KrashenProfiles.updateSettings(active.id, patch);
    // Re-render from the saved patch so the visual state is always authoritative,
    // guarding against browser rendering glitches with custom checkbox styles.
    renderSrsFields(patch);
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

  const MASTERY_LABELS = [
    'M0 — Never encountered',
    'M1 — Seen in passing (not yet looked up)',
    'M2 — Looked up once',
    'M3 — Looked up repeatedly',
    'M4 — Solidifying (re-encountered naturally after looking up)',
    'M5 — Passively acquired (absorbed through reading alone)',
  ];

  let showInactive = false;

  function renderVocabRow(entry, isInactive) {
    const row = document.createElement('div');
    row.className = 'vocab-item' + (isInactive ? ' vocab-item-inactive' : '');

    const termEl = document.createElement('span');
    termEl.className = 'vocab-term';

    const termName = document.createElement('span');
    termName.textContent = entry.term;
    if (entry.translations?.length) {
      termName.title = entry.translations.join(' · ');
    }
    termEl.appendChild(termName);

    const otherForms = (entry.forms ?? []).filter(f => f !== entry.term);
    if (otherForms.length > 0) {
      const formsEl = document.createElement('span');
      formsEl.className   = 'vocab-forms';
      formsEl.textContent = otherForms.join(', ');
      formsEl.title       = 'Other forms of this word you have looked up';
      termEl.appendChild(formsEl);
    }

    const em = entry.userMastery ?? entry.mastery;
    const mastEl = document.createElement('span');
    mastEl.className   = 'vocab-mastery' + (entry.userMastery !== undefined ? ' vocab-mastery-user' : '');
    mastEl.textContent = 'M' + em;
    mastEl.title       = (MASTERY_LABELS[em] ?? `M${em}`) +
      (entry.userMastery !== undefined ? ' (user-rated)' : ' (algorithm-derived)');

    const actions = document.createElement('span');
    actions.className = 'vocab-item-actions';

    if (isInactive) {
      const resumeBtn = document.createElement('button');
      resumeBtn.textContent = 'Resume';
      resumeBtn.className   = 'vocab-action-btn vocab-resume-btn';
      resumeBtn.title       = 'Restore this word to the active list so it appears in the i+1 hint again';
      resumeBtn.addEventListener('click', () => {
        window.KrashenVocab.setActive(entry.term, true);
        renderVocabStats();
      });
      actions.appendChild(resumeBtn);
    } else {
      const skipBtn = document.createElement('button');
      skipBtn.textContent = 'Skip';
      skipBtn.className   = 'vocab-action-btn vocab-skip-btn';
      skipBtn.title       = 'Hide this word from the i+1 hint list without deleting it — useful when a word is not relevant to your current topic';
      skipBtn.addEventListener('click', () => {
        window.KrashenVocab.setActive(entry.term, false);
        renderVocabStats();
      });
      actions.appendChild(skipBtn);
    }

    const delBtn = document.createElement('button');
    delBtn.textContent = '×';
    delBtn.className   = 'vocab-action-btn vocab-delete-btn';
    delBtn.title       = 'Permanently delete this word from your vocabulary. You can re-save it via Define.';
    delBtn.addEventListener('click', () => {
      window.KrashenVocab.deleteTerm(entry.term);
      renderVocabStats();
    });
    actions.appendChild(delBtn);

    row.appendChild(termEl);
    row.appendChild(mastEl);
    row.appendChild(actions);
    return row;
  }

  function renderVocabStats() {
    const noProfileEl = document.getElementById('vocab-no-profile');
    const emptyEl     = document.getElementById('vocab-empty');
    const breakdownEl = document.getElementById('vocab-mastery-breakdown');
    const listEl      = document.getElementById('vocab-term-list');
    const clearBtn    = document.getElementById('clear-vocab-btn');
    const ankiBtn     = document.getElementById('export-anki-btn');
    const totalEl     = document.getElementById('vocab-total');

    const activeProfile = window.KrashenProfiles?.getActive();
    if (!activeProfile) {
      noProfileEl.hidden  = false;
      emptyEl.hidden      = true;
      breakdownEl.hidden  = true;
      clearBtn.hidden     = true;
      if (ankiBtn) ankiBtn.hidden = true;
      listEl.innerHTML    = '';
      totalEl.textContent = '';
      return;
    }
    noProfileEl.hidden = true;

    if (!window.KrashenVocab) return;
    const allEntries  = Object.values(window.KrashenVocab.getStore());
    const active      = allEntries.filter(e => !e.inactive).sort((a, b) => b.lastSeen - a.lastSeen);
    const inactive    = allEntries.filter(e =>  e.inactive).sort((a, b) => b.lastSeen - a.lastSeen);

    if (allEntries.length === 0) {
      emptyEl.hidden      = false;
      breakdownEl.hidden  = true;
      clearBtn.hidden     = true;
      if (ankiBtn) ankiBtn.hidden = true;
      listEl.innerHTML    = '';
      totalEl.textContent = '';
      return;
    }
    emptyEl.hidden = true;

    // Total label
    let totalLabel = `${active.length} word${active.length !== 1 ? 's' : ''}`;
    if (inactive.length > 0) totalLabel += ` · ${inactive.length} hidden`;
    totalEl.textContent = totalLabel;

    // Breakdown reflects active entries only; action buttons available whenever any entry exists
    clearBtn.hidden = false;
    if (ankiBtn) ankiBtn.hidden = false;
    if (active.length > 0) {
      const byMastery = [0, 0, 0, 0, 0, 0];
      active.forEach(e => { const m = e.userMastery ?? e.mastery; byMastery[m] = (byMastery[m] || 0) + 1; });
      breakdownEl.textContent = byMastery.map((n, i) => `${n}×M${i}`).join('  ');
      breakdownEl.hidden = false;
    } else {
      breakdownEl.hidden = true;
    }

    listEl.innerHTML = '';

    // Active rows
    active.forEach(e => listEl.appendChild(renderVocabRow(e, false)));

    // Show/hide inactive toggle
    if (inactive.length === 0) {
      showInactive = false;
    } else {
      const toggleBtn = document.createElement('button');
      toggleBtn.className   = 'vocab-action-btn vocab-toggle-inactive-btn';
      toggleBtn.textContent = showInactive
        ? 'Hide hidden'
        : `Show hidden (${inactive.length})`;
      toggleBtn.addEventListener('click', () => {
        showInactive = !showInactive;
        renderVocabStats();
      });
      listEl.appendChild(toggleBtn);

      if (showInactive) {
        inactive.forEach(e => listEl.appendChild(renderVocabRow(e, true)));
      }
    }
  }

  function ankiContext(paragraph, term) {
    if (!paragraph) return '';
    const sentences = paragraph.split(/(?<=[.!?¡])\s+/);
    const hit = sentences.find(s => s.toLowerCase().includes(term.toLowerCase()));
    if (hit) return hit.trim().replace(/\t|\n/g, ' ');
    // Sentence not found or paragraph has no punctuation — return first 120 chars
    return paragraph.slice(0, 120).replace(/\t|\n/g, ' ').trim();
  }

  document.getElementById('export-anki-btn').addEventListener('click', () => {
    const store = window.KrashenVocab?.getStore() ?? {};
    const entries = Object.values(store).filter(e => !e.inactive);
    if (entries.length === 0) return;

    const rows = entries.map(e => {
      const term        = e.term;
      const translation = e.translations?.[0] ?? '';
      const context     = ankiContext(e.contexts?.[0] ?? '', e.term);
      return `${term}\t${translation}\t${context}`;
    });

    const profile = window.KrashenProfiles?.getActive();
    const slug    = (profile?.name ?? 'vocab').replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40);
    triggerDownload(`krashen-${slug}-anki.tsv`, rows.join('\n'), 'text/tab-separated-values');
  });

  document.getElementById('clear-vocab-btn').addEventListener('click', () => {
    if (!confirm('Clear all vocabulary for this profile?')) return;
    window.KrashenVocab?.clear();
    showInactive = false;
    renderVocabStats();
  });

  // ── Public API ─────────────────────────────────────────────────────────────

  function refreshSettings() {
    renderChip();
    renderProfileSelect();
    renderSrsFields(window.KrashenProfiles?.getActive()?.settings ?? {});
    renderVocabStats();
  }

  // ── vocab-enabled checkbox ────────────────────────────────────────────────

  document.getElementById('vocab-enabled').addEventListener('change', e => {
    const active = window.KrashenProfiles?.getActive();
    if (!active) return;
    const enabled = e.target.checked;
    window.KrashenProfiles.updateSettings(active.id, { vocabEnabled: enabled });
    applyVocabEnabled(enabled);
  });

  // ── Accordion init ────────────────────────────────────────────────────────

  initAccordion(document.getElementById('tab-configure'));
  initAccordion(document.getElementById('vocab-features'));

  // ── Initial render ────────────────────────────────────────────────────────

  renderChip();
  const _activeOnLoad = window.KrashenProfiles?.getActive();
  renderSrsFields(_activeOnLoad?.settings ?? {});
  applyVocabEnabled(_activeOnLoad?.settings?.vocabEnabled ?? true);

  window.KrashenUI = { refreshSettings, refreshChip: renderChip, refreshVocab: renderVocabStats, activateTab, applyVocabEnabled };

})();
