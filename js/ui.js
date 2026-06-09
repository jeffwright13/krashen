// Left-panel UI: profile chip, vocab hint parameters, vocab list.
// Loaded as <script type="module">; exposes window.KrashenUI.

import { exportProfileBundle } from './export.js';
import { parseProfileBundle  } from './import.js';
import { triggerDownload, extractContextSentence } from './display.js';

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
      renderAutosave(window.KrashenProfiles?.getActive()?.settings ?? {});
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
    renderAutosave(active?.settings ?? {});
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
    renderAutosave(profile.settings);
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
    renderAutosave(window.KrashenProfiles.getActive()?.settings ?? {});
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

  // Keep chip and vocab in sync on profile switch
  window.KrashenProfiles?.onSwitch(profile => {
    showInactive = false;
    renderChip();
    renderAutosave(profile.settings ?? {});
    renderVocabStats();
    applyVocabEnabled(profile.settings?.vocabEnabled ?? true);
  });

  // ── Autosave setting ──────────────────────────────────────────────────────

  function renderAutosave(settings) {
    const s = Object.assign({}, window.KrashenProfiles?.DEFAULT_SETTINGS, settings);
    document.getElementById('vocab-autosave').checked = s.autosave;
  }

  document.getElementById('vocab-autosave').addEventListener('change', e => {
    const active = window.KrashenProfiles?.getActive();
    if (!active) return;
    window.KrashenProfiles.updateSettings(active.id, { autosave: e.target.checked });
  });

  // ── Vocab section ─────────────────────────────────────────────────────────

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

    const lookupEl = document.createElement('span');
    lookupEl.className   = 'vocab-lookup-count';
    lookupEl.textContent = `×${entry.lookupCount ?? 0}`;
    lookupEl.title       = `Looked up ${entry.lookupCount ?? 0} time${(entry.lookupCount ?? 0) !== 1 ? 's' : ''} via Define`;

    const actions = document.createElement('span');
    actions.className = 'vocab-item-actions';

    if (isInactive) {
      const resumeBtn = document.createElement('button');
      resumeBtn.textContent = 'Resume';
      resumeBtn.className   = 'vocab-action-btn vocab-resume-btn';
      resumeBtn.title       = 'Restore this word to the active list';
      resumeBtn.addEventListener('click', () => {
        window.KrashenVocab.setActive(entry.term, true);
        renderVocabStats();
      });
      actions.appendChild(resumeBtn);
    } else {
      const skipBtn = document.createElement('button');
      skipBtn.textContent = 'Skip';
      skipBtn.className   = 'vocab-action-btn vocab-skip-btn';
      skipBtn.title       = 'Hide this word from the list without deleting it — use Resume to bring it back';
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
    row.appendChild(lookupEl);
    row.appendChild(actions);
    return row;
  }

  function renderVocabStats() {
    const noProfileEl = document.getElementById('vocab-no-profile');
    const emptyEl     = document.getElementById('vocab-empty');
    const listEl      = document.getElementById('vocab-term-list');
    const clearBtn    = document.getElementById('clear-vocab-btn');
    const ankiBtn     = document.getElementById('export-anki-btn');
    const totalEl     = document.getElementById('vocab-total');

    const activeProfile = window.KrashenProfiles?.getActive();
    if (!activeProfile) {
      noProfileEl.hidden  = false;
      emptyEl.hidden      = true;
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
      clearBtn.hidden     = true;
      if (ankiBtn) ankiBtn.hidden = true;
      listEl.innerHTML    = '';
      totalEl.textContent = '';
      return;
    }
    emptyEl.hidden = true;

    let totalLabel = `${active.length} word${active.length !== 1 ? 's' : ''}`;
    if (inactive.length > 0) totalLabel += ` · ${inactive.length} hidden`;
    totalEl.textContent = totalLabel;

    clearBtn.hidden = false;
    if (ankiBtn) ankiBtn.hidden = false;

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

  document.getElementById('export-anki-btn').addEventListener('click', () => {
    const store = window.KrashenVocab?.getStore() ?? {};
    const entries = Object.values(store).filter(e => !e.inactive);
    if (entries.length === 0) return;

    const rows = entries.map(e => {
      const term        = e.term;
      const translation = e.translations?.[0] ?? '';
      const context     = extractContextSentence(e.contexts?.[0] ?? '', e.term);
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
    renderAutosave(window.KrashenProfiles?.getActive()?.settings ?? {});
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
  renderAutosave(_activeOnLoad?.settings ?? {});
  applyVocabEnabled(_activeOnLoad?.settings?.vocabEnabled ?? true);

  window.KrashenUI = { refreshSettings, refreshChip: renderChip, refreshVocab: renderVocabStats, activateTab, applyVocabEnabled };

})();
