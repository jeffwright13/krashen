# Krashen — Implementation Plan

_Each version section covers: scope, file scaffold, TDD sequence, and done criteria.
Update in place as work progresses. Append new version sections; do not edit closed ones._

---

## v1 — Minimal Viable Reader

**Goal:** User opens the app, enters an API key, configures a content request, generates
graded Spanish (or other LLM-supported language) text, and reads it. No backend. No TTS.
No vocab tracking UI.

### Scope (what ships in v1)

- Config form: all learner profile + linguistic + content parameters from SPEC.md §1
- Language selector (defaults to Spanish; any LLM-supported language accepted)
- Prompt assembly: config → LLM system + user prompt
- LLM call: Claude API primary, OpenAI secondary, Google (Gemini) tertiary (all user-selectable)
- Reading panel: rendered output with metadata (CEFR, word count, topic, date)
- Settings modal: API key entry (per provider), stored in localStorage
- Two-panel layout: config left, reading output right
- TTS scaffold: interface defined, `isAvailable()` returns false, UI element disabled
- Vocab data model: localStorage schema defined, nothing written to it yet
- GitHub Actions workflow: deploy to GitHub Pages on push to main
- Pico.css via CDN for base styling; `main.css` for overrides

### Out of scope for v1

- TTS playback
- Vocabulary tracking UI
- Click-to-translate
- Layout toggle (two-panel vs. full-screen reading)
- SRS / session progression
- Export / import of settings or content

### File scaffold

```
krashen/
├── index.html
├── css/
│   └── main.css
├── js/
│   ├── storage.js      # localStorage abstraction (krashen_settings, krashen_history, krashen_vocab)
│   ├── config.js       # Config schema, DEFAULT_CONFIG, validateConfig()
│   ├── prompt.js       # buildSystemPrompt(config), buildUserPrompt(config)
│   ├── llm.js          # generateContent(prompts, provider, apiKey) → Promise<string>; providers: claude, openai, google
│   ├── tts.js          # Stub: isAvailable()→false, synthesize()→rejected Promise
│   ├── display.js      # DOM: renderContent(), renderError(), toggleLoading()
│   └── app.js          # Event wiring and orchestration
├── tests/
│   ├── config.test.js
│   ├── prompt.test.js
│   ├── storage.test.js
│   └── llm.test.js
├── .github/
│   └── workflows/
│       └── deploy.yml  # GitHub Pages deploy on push to main
├── .gitignore
└── package.json        # dev-only: vitest (no bundler, no app deps)
```

### localStorage schema

```js
// krashen_settings
{
  apiKeys: { claude: "", openai: "", google: "" },
  defaultProfile: { ...DEFAULT_CONFIG fields },
  ui: { fontSize: "medium", theme: "light" }
}

// krashen_history  (content sessions)
[
  { id, date, config, content, wordCount }
]

// krashen_vocab  (scaffolded; not written in v1)
{
  seenWords: [],
  sessions: []
}
```

### TDD sequence

Tests are written before implementation. Order follows dependency depth
(deepest / most-pure modules first):

1. **`config.test.js`** — `validateConfig()`: required fields, invalid CEFR levels,
   word-cap enum values, targetLanguage default, error message shape
2. **`prompt.test.js`** — `buildSystemPrompt()` / `buildUserPrompt()`: output contains
   CEFR label, word cap, targetLanguage, grammar focus, dialect; excludes inactive
   TTS/SRS params; handles optional fields gracefully
3. **`storage.test.js`** — get/set API keys, get/set default profile, history append,
   schema migration (missing keys get defaults); `localStorage` mocked in Node
4. **`llm.test.js`** — correct endpoint + headers for Claude vs OpenAI vs Google; request body
   contains assembled prompts; non-2xx response throws with message; `fetch` mocked

Implementation follows each test file (red → green → refactor), then moves to DOM
modules (`display.js`, `app.js`, `index.html`) which are wired up manually and
verified in-browser.

### Done criteria

- [x] All unit tests pass (`npx vitest run`) — 112 tests across 6 files
- [x] User can enter an API key, configure a request, generate content, and read it
- [x] No API keys or secrets in the repo
- [x] GitHub Actions deploy workflow created (`.github/workflows/deploy.yml`)
- [x] Deployed and accessible on GitHub Pages
- [x] DECISIONS.md updated with any choices made during implementation
- [x] No `console.log` debug artifacts in committed code

### Features pulled forward from "out of scope"

Several items listed as out-of-scope were implemented during the v1 cycle and shipped
as v1.x patch/minor releases rather than waiting for a separate milestone:

- **Click-to-translate (Define)** — toggleable LLM-powered word/phrase lookup popup
- **Theme switcher** — light / dark / system modes with FOUC-free inline script
- **Resizable panel divider** — draggable config/reading split with localStorage persistence
- **User-configurable model names** — per-provider model override in Settings modal
- **Show/hide API key toggle** — password field reveal per provider
- **Test API key button** — lightweight key validity check per provider
- **A0 CEFR level** — absolute-beginner tier below the official A1 floor
- **Article output format** — expository/nonfiction prose alongside story formats
- **Select All / Copy buttons** — reading-panel-scoped selection and clipboard copy

These are considered part of the shipped v1 feature set. v2 scope (TTS) and v3 scope
(vocabulary tracking) remain as originally planned.

---

## v2 — History, Export/Import, and Reading Polish

**Goal:** Make generated content persistent and portable. Users can browse past pieces,
re-read them, export a library to share or back up, and import libraries from others.
Reading experience gets the polish that was deferred from v1.

### Decision: TTS dropped from roadmap

TTS was originally planned for v2. After review, it's been removed. AI-generated speech
is a poor substitute for native-speaker CI audio (which Dreaming Spanish, Pimsleur, etc.
do better), and the implementation complexity is high. This app's value is in graded
*reading* content; adding TTS would widen scope without deepening the core niche.

### Scope (what ships in v2)

**History panel**
- Sidebar or collapsible panel listing past generated pieces (reads `krashen_history`)
- Each entry shows: date, topic, CEFR level, word count
- Click an entry to load it back into the reading panel
- Delete individual entries (with confirmation); clear all history option

**Export**
- Export individual piece as Markdown (`.md`): YAML frontmatter (topic, CEFR, dialect,
  word count, date) + full text body. One-click download from the reading panel.
- Export full library as JSON (`.json`): the raw `krashen_history` array, suitable for
  backup or sharing with another Krashen user. Downloaded as `krashen-library.json`.
- Export full library as Markdown (`.md`): all pieces concatenated, separated by `---`,
  each with YAML frontmatter. Human-readable, shareable with non-Krashen users.

**Import**
- Import a JSON library file: parses, validates schema, merges into existing history
  (deduplicates by `id`). UI warns before overwriting if IDs conflict.

**Reading experience polish**
- Font size control: Small / Medium / Large applied to `#content-display` (the storage
  key `ui.fontSize` is already defined; just needs UI wiring and CSS classes)
- Fullscreen reading mode: button in the reading toolbar that collapses the config panel,
  giving the full viewport to the reading panel. Press again (or Esc) to restore.

### Out of scope for v2

- TTS (see decision above)
- Vocabulary tracking / i+1 loop (v3)
- Anki export (v3+)
- Multi-file ZIP export (single-file Markdown covers the sharing use case without deps)
- Cloud sync or server-side storage

### File scaffold changes

```
js/
  history.js      # NEW: getHistory(), deleteHistoryEntry(), clearHistory() — thin wrapper
                  #      around storage.js; owns history UI state logic
  export.js       # NEW: exportPieceAsMarkdown(entry), exportLibraryAsJSON(), exportLibraryAsMarkdown()
  import.js       # NEW: importLibraryFromJSON(file) → Promise<{imported, skipped}>
  app.js          # Updated: wire history panel, fullscreen toggle, font size control,
                  #           export/import buttons
  storage.js      # Minor: add deleteHistoryEntry(), clearHistory(), mergeHistory()
index.html        # Updated: history panel markup, export/import buttons,
                  #           font size control, fullscreen toggle button
css/main.css      # Updated: history panel styles, fullscreen mode, font size classes
tests/
  export.test.js  # NEW
  import.test.js  # NEW
  history.test.js # NEW
```

### Export format specifications

**Markdown (single piece)**
```markdown
---
topic: "a dog and a boy explore a forest"
cefr: A2
dialect: Neutral
wordCount: 712
date: 5/27/2026
---

El perro se llamaba Rojo...
```

**JSON library**
```json
{
  "schema": "krashen-library-v1",
  "exported": "2026-05-27",
  "entries": [ ...krashen_history array... ]
}
```

**Markdown library**
```markdown
# Krashen Library — exported 2026-05-27

---
topic: "..."
cefr: A2
...
---

First piece text...

---
topic: "..."
...
---

Second piece text...
```

### TDD sequence

1. **`history.test.js`** — `deleteHistoryEntry()`: removes correct entry by id, leaves
   others intact; `clearHistory()`: empties array; `getHistory()` returns empty array
   when storage is empty
2. **`export.test.js`** — `exportPieceAsMarkdown()`: output starts with `---`, contains
   frontmatter keys, ends with piece text; `exportLibraryAsJSON()`: valid JSON string,
   schema field present, entries array matches input; `exportLibraryAsMarkdown()`: correct
   separator count, all topics appear in output
3. **`import.test.js`** — valid JSON: correct imported/skipped counts; duplicate id:
   skipped; malformed JSON: throws with message; missing `schema` field: throws;
   `entries` not an array: throws

Then DOM: history panel rendering, fullscreen toggle, font size switching — verified
in-browser.

### Done criteria

- [x] All unit tests pass (`npx vitest run`) — 155 tests across 9 files
- [x] History panel lists past pieces; clicking one loads it into reading panel
- [x] Delete entry and clear history work (with confirmation)
- [x] Export single piece as Markdown: downloaded file passes manual inspection
- [x] Export library as JSON: file round-trips through import with correct counts
- [x] Export library as Markdown: file opens cleanly in a text editor
- [x] Import: merges correctly; duplicate entries skipped; invalid files show error
- [x] Font size control works in reading panel
- [x] Fullscreen toggle hides/restores config panel
- [x] No `console.log` artifacts; DECISIONS.md updated

### Features pulled forward from "out of scope"

Several items were implemented during the v2 cycle as incremental improvements beyond
the original scope:

- **Content titles** — LLM prompted to open with a `## Title` line; rendered as `<h1>` in the reading panel and recorded on history entries
- **User-configurable column width** — Settings modal: toggle max-width on/off; set custom `ch` value (default 70)
- **History filter** — Live text filter in the History modal; narrows list by title or topic as you type
- **History bulk select / bulk delete** — Per-item checkboxes with Select All (including indeterminate state); Delete Selected removes all checked entries in one confirmation

---

## v3 — Vocabulary Tracking and i+1 Loop

**Goal:** Close the feedback loop between what the user has read and what gets generated
next. Track which words the user has seen and looked up, derive a mastery level per
word, and feed that back into the prompt so the LLM naturally re-exposes acquiring
vocabulary while limiting new introductions.

### Scope (what shipped in v3)

**Profiles (`js/profiles.js`)**
- Named profiles stored in localStorage (`krashen_profiles`, `krashen_active_profile`)
- Per-profile SRS settings: autosave, srsEnabled, knownThreshold, newWordsPerSession,
  reExposeCount, reExposeMaxMastery
- Methods: `getAll`, `getActive`, `create`, `switchTo`, `delete`, `updateSettings`, `onSwitch`
- Storage adapter pattern for testability; browser auto-initialises with `localStorage`

**Vocabulary store (`js/vocab.js`)**
- Per-profile store keyed as `krashen_{profileId}_vocab`
- Per-term data: translations, firstSeen/lastSeen, seenCount, lookupCount, lastLookup,
  contexts (capped at 3), mastery 0–5
- Mastery derivation (evaluated highest-first): 5 = acquired through reading, 4 = re-encountered
  after lookup, 3 = looked up ≥2 times, 2 = looked up once, 1 = seen but never looked up, 0 = never seen
- Methods: `recordLookup`, `recordSeen`, `getStore`, `getForPrompt`, `clear`

**i+1 prompt integration (`js/prompt.js`)**
- `buildI1Constraints(vocabContext)` assembles known terms (capped at 50), re-expose
  terms, and new-words-per-session ceiling into a prompt fragment
- `buildSystemPrompt(config, vocabContext)` injects the block after the CEFR/word-cap
  section when `srsEnabled` is true for the active profile

**Define → vocab pipeline (`js/app.js`)**
- After a successful Define lookup: if `autosave` is on, calls `recordLookup` immediately
  and shows a toast; if off, appends a "Save to vocab" button to the popup
- After each content generation: extracts a deduplicated word list (lowercase, strip
  Spanish punctuation) and calls `recordSeen`

**Settings UI (`js/ui.js`)**
- Profile selector (switch, create, delete) in Settings modal
- SRS settings panel with all per-profile parameters; collapses when SRS is disabled
- Collapsible vocabulary section: total count, mastery breakdown (0×M0 … n×M5),
  scrollable term list sorted by lastSeen, "Clear vocab" button

**Test harness**
- `tests/run.js`: minimal Node/CJS runner; no npm deps; skips Vitest files automatically
- `tests/profiles.test.js`: 9 tests
- `tests/vocab.test.js`: 5 tests
- `vitest.config.js`: excludes CJS test files from Vitest

**Infrastructure notes**
- profiles.js and vocab.js are ES modules (`export default factory`) loaded as
  `<script type="module">` in the browser; Node 22 `require(esm)` returns `{ default: factory }`
- `tests/package.json` sets `"type": "commonjs"` so the runner and test files use `require()`

### File scaffold changes

```
js/
  profiles.js     NEW
  vocab.js        NEW
  ui.js           NEW
  prompt.js       Updated: buildI1Constraints(), vocabContext param on buildSystemPrompt()
  app.js          Updated: vocab pipeline wiring, KrashenUI integration
  display.js      Updated: showToast()
tests/
  run.js          NEW
  package.json    NEW  {"type": "commonjs"}
  profiles.test.js  NEW (9 tests)
  vocab.test.js   NEW (5 tests)
vitest.config.js  NEW  excludes CJS test files
css/main.css      Updated: toast, define popup, profile/SRS/vocab section styles
index.html        Updated: profile + SRS + vocab HTML in Settings modal; module script tags
docs/             BRIEF.md, SPEC.md, DECISIONS.md all updated
```

### Done criteria

- [x] `node tests/run.js` — 14 tests pass
- [x] `npm test` — 267 Vitest tests pass
- [x] Profile create/switch/delete works in Settings modal
- [x] SRS settings saved per profile and respected on next generation
- [x] Define lookup saves to vocab (autosave or manual button)
- [x] Vocab list visible in Settings with mastery breakdown
- [x] i+1 constraints injected into prompt when SRS enabled
- [x] SRS disabled → vocab tracked but prompt unchanged
- [x] DECISIONS.md updated (7 new entries)
- [x] SPEC.md sections 1.5 and 6 updated to reflect live implementation

### Known issues and deferred work

The following were identified during v3 and deferred to v4. See v4 section below and
`docs/DECISIONS.md` for rationale.

- Vocab normalization: inflected forms (plurals, conjugations) stored as separate entries
- Topic-aware re-expose: words from unrelated domains included indiscriminately
- No per-word delete or per-generation deactivation
- Active profile not visible in main UI without opening Settings
- Settings modal is overloaded (SRS, profile, vocab, API keys, UI prefs all in one place)

---

## v3.1 — UI Re-org and Words-Read Counter

**Goal:** Replace the overloaded Settings modal with a tabbed left panel that gives
every configuration group a clear, permanent home. Add a persistent profile chip
that shows the active profile and cumulative words-read counter without any clicks.
All settings switch to save-on-change; the Save button is eliminated.

No breaking changes. Vocab normalization, per-word controls, and profile import/export
remain deferred (see §Open items below).

### Chosen architecture

**Option 1 (tabbed sidebar) + profile chip from Option 3**, selected after a design
evaluation session. Rationale: the persistent left panel is a feature for a generation-
focused workflow; tabs solve the dumping-ground problem without changing the mental
model; the profile chip solves active-profile visibility elegantly. Built with mobile-
migration-friendly practices throughout (see Constraints below).

### Left panel structure (after re-org)

```
┌─────────────────────────────┐
│ Krashen  v3.1   [◉ Alice  1,240 words ▾] │  ← profile chip, always visible
├──────────────────────────────┤
│ Generate │ Vocab │ Tuning │ Settings │     ← tab bar
├──────────────────────────────┤
│                              │
│  [active tab panel]          │  ← scrollable
│                              │
├──────────────────────────────┤
│  [ Generate ]                │  ← sticky, always visible
└──────────────────────────────┘
```

**Generate tab** (default): Provider selector + all content and linguistic focus
parameters (Groups E + F). This is the existing config form, lightly restyled.

**Vocab tab**: Mastery breakdown, scrollable term list sorted by lastSeen, Clear
vocab button (Group D). Renders fresh each time the tab is activated.

**Tuning tab**: All SRS / i+1 parameters for the active profile (Group C).
Save-on-change.

**Settings tab**: API keys + model overrides for all three providers; Theme and
column-width UI preferences (Groups A + G). Save-on-change (blur for text
fields, change for selects and checkboxes).

**Profile chip** (above tabs, always visible):
- Shows active profile name + cumulative words-read counter
- Click/tap to expand: profile switch dropdown, New / Delete / (future: Import /
  Export) buttons
- Collapses on outside click or profile switch

**Settings modal**: Eliminated. History modal is unchanged (it's a different UX
pattern and works well as a dialog).

**Settings button** in panel header: Removed (tabs replace it).

**Font size control**: Stays in the reading toolbar — more convenient for readers
than burying it in a Settings tab.

### Words-read counter

`profiles.js` gains an `incrementWordsRead(profileId, count)` method that adds to
`profile.wordsRead` (default 0). Called in `handleGenerate()` after each successful
generation alongside `recordSeen()`. Displayed in the profile chip.

### Save-on-change audit

| Field | Trigger | Notes |
|---|---|---|
| API key inputs | `blur` | Avoid mid-paste saves |
| Model name inputs | `blur` | Same reason |
| Provider select | `change` | |
| Theme select | `change` | Already works this way |
| Max-width toggle + value | `change` / `blur` | |
| SRS toggles and selects | `change` | Per profile via updateSettings() |

### Mobile-migration practices (baked in from the start)

- Sidebar and reading panel have no cross-component layout assumptions
- No `vw`-based sizing inside the sidebar
- Generate button is positioned relative to the sidebar container, not the page
- Tab panels are self-contained scrollable `<div>`s — they become full-screen views
  on mobile with minimal CSS changes
- Tab bar maps directly onto a mobile bottom-nav bar (rotate + reposition)

### Implementation phases

Each phase is independently committable and testable.

**Phase 1 — Profile chip + words-read**
Files: `js/profiles.js`, `js/ui.js`, `js/app.js`, `index.html`, `css/main.css`
- Add `wordsRead` field and `incrementWordsRead()` to profiles.js
- Profile chip HTML above tab bar; shows name + words-read; expands for management
- Move all profile management JS from modal into chip panel (ui.js)
- `handleGenerate()` calls `incrementWordsRead()` after each successful generation
- Tests: chip displays active profile name; incrementWordsRead() updates correctly;
  chip updates on profile switch

**Phase 2 — Tab bar scaffolding**
Files: `index.html`, `css/main.css`, `js/ui.js`
- Add tab bar HTML with four tabs (Generate / Vocab / Tuning / Settings)
- Wrap existing config form in `#tab-generate` panel (no content changes yet)
- Add empty `#tab-vocab`, `#tab-tuning`, `#tab-settings` panels
- Tab switching logic: toggle `hidden`, `aria-selected`, `tabindex`
- Move Generate button outside `<form>` with `form="config-form"` attribute so it
  stays sticky below the tab bar
- Tests: clicking each tab shows correct panel and hides others; aria-selected updates

**Phase 3 — Settings tab + save-on-change**
Files: `index.html`, `css/main.css`, `js/app.js`
- Add API key / model / UI prefs HTML inside `#tab-settings`
- Implement save-on-change (blur/change) for all Settings tab fields
- Remove `openSettings()`, `saveSettings()`, settings-btn, close-settings, modal
  event listeners from app.js
- Remove Settings modal `<dialog>` from index.html
- Keep Test API key buttons functional (they work in-place, no modal needed)
- Tests: Settings tab fields populate when tab is activated; theme change applies immediately

**Phase 4 — Tuning tab**
Files: `index.html`, `css/main.css`, `js/ui.js`
- Move SRS params HTML into `#tab-tuning`
- Save-on-change wired through `KrashenProfiles.updateSettings()`
- SRS fields refresh when active profile changes
- Tests: Tuning tab shows active profile's SRS settings; toggling srsEnabled
  collapses/expands dependent fields

**Phase 5 — Vocab tab**
Files: `index.html`, `css/main.css`, `js/ui.js`
- Move vocab stats + term list HTML into `#tab-vocab`
- Vocab tab re-renders on activation (calls existing `renderVocabStats()`)
- Tests: Vocab tab shows correct total count; re-renders after recordLookup()

**Phase 6 — Cleanup and docs**
- Remove any remaining Settings modal remnants
- Remove now-unused CSS (modal open/close animation, Settings modal article styles)
- Update DECISIONS.md (save-on-change rationale, tab architecture, words-read storage)
- Update SPEC.md §4 (Settings & Persistence) to reflect new structure

### File scaffold changes

```
js/
  profiles.js   Updated: wordsRead field, incrementWordsRead()
  ui.js         Rewritten: tab switching, profile chip, per-tab content
  app.js        Updated: remove modal wiring; add save-on-change; call
                incrementWordsRead(); remove openSettings/saveSettings
index.html      Updated: tab bar, tab panels, profile chip; Settings
                modal removed; Settings button removed
css/main.css    Updated: tab bar, chip, tab panel styles; modal styles
                removed
tests/
  ui.test.js    NEW (Vitest/jsdom): tab switching, chip rendering
  profiles.test.js  Updated: incrementWordsRead() tests
docs/
  BRIEF.md      Updated: mobile stance (done)
  PLAN.md       Updated: this section
  DECISIONS.md  To update in Phase 6
  SPEC.md       To update in Phase 6
```

### Done criteria

- [ ] Profile chip always shows active profile name and words-read counter
- [ ] Profile chip expands to show switch/create/delete controls
- [ ] words-read increments after each successful generation
- [ ] All four tabs switch correctly; Generate button always sticky
- [ ] Settings tab: all fields populate on activation; save on change/blur
- [ ] Tuning tab: SRS fields per active profile; save on change
- [ ] Vocab tab: renders fresh on activation
- [ ] Settings modal is gone; no dead HTML or JS
- [ ] `node tests/run.js` — all pass
- [ ] `npm test` — all pass
- [ ] DECISIONS.md and SPEC.md updated
- [ ] No vw-based sizing in sidebar; layout components are independent

### Deferred to later milestones

- Vocab normalization (lemmatization / conjugation merging)
- Topic-aware re-expose list
- Per-word delete and per-generation deactivation
- Profile import/export
- History scoping per profile: entries are now stamped with `profileId` and
  `profileName` at generation time and the profile name appears in the History
  modal detail line. Full filtering/scoping UI (show only entries for the active
  profile, or a filter-by-profile dropdown) remains deferred.
- Per-profile vs. global settings audit (form defaults, provider selection)
- Mobile layout (architecture is migration-ready; layout itself deferred)

---

## Design notes — deferred considerations

### "File" modal and History consolidation (noted v5.2.0)

**Status (2026-06-16): partially resolved.** The File modal shipped in v5.2.3 (Load Text + Export .md/.html). The library export/import migration described below remains open — see "Current backlog" at the end of this document.

**Context:** The reading toolbar "Export .md" and "Export .html" buttons, plus "Load Text", are all story-as-text operations. A consolidated **"File" modal** (replacing three toolbar buttons with one) was proposed and will be built. The modal would have two sections: **Open** (the current Load Text form) and **Save as** (.md / .html). Export buttons become disabled (not hidden) when no piece is loaded.

**History inclusion — considered and deferred.** History was proposed as a candidate for the File modal on the grounds that it represents stories accessible to the user. After discussion:

- History is **localStorage**, not disk files. It is more analogous to "Open Recent" in a desktop File menu than to a file operation.
- The History modal has substantial document-browser UI: text filter, profile filter, bulk select/delete, per-entry load/delete. This weight does not belong in a file-operation modal.
- The **library export/import buttons** inside the History modal *are* genuine file operations and are the stronger candidate for migration into a File modal (under a "Library" section). This would leave History as a pure document browser with no file I/O.

**Decision deferred.** Build the File modal first (Load Text + Export .md/.html). Revisit moving library export/import out of History modal into the File modal as a follow-on — it is a clean separation but adds scope. History stays as its own toolbar button for now.

---

### Reading toolbar redesign (noted v5.2.0)

**Status (2026-06-16): resolved, with two deviations from the original proposal below.** All three phases shipped (v5.2.1–v5.2.3). The fullscreen toggle did not end up as a text-area overlay — it was tried (v5.2.3) and reverted (v5.2.4) because a low-opacity overlay was undiscoverable in review; it lives in the toolbar instead, right-aligned. The ⚙ Display popover was itself later converted to a modal dialog (v5.2.5) for interaction-pattern consistency with File and History. See DECISIONS.md for both follow-on entries.

**Problem:** The reading toolbar has no organizing principle. Ten controls are crammed into one row covering unrelated concerns — display preferences, text manipulation, file I/O, and navigation. The specific trigger: Ctrl-A in the reading pane selects all browser content, not just the story, so Select All and Copy buttons were added as workarounds.

**Proposed end state:**

The toolbar collapses from ~10 items to 3:

```
⚙ Display  |  File  |  History
```

The fullscreen toggle (⤢) moves out of the toolbar entirely and lives as a quietly overlaid button inside the text area (upper-left corner), in the style of a video-player fullscreen control. Visible on hover or always-on at low opacity.

**What goes where:**

| Current item | Destination |
|---|---|
| ⤢ Fullscreen toggle | Overlaid inside text area, upper-left |
| S / M / L font size | ⚙ Display popover |
| Theme select | ⚙ Display popover (already there) |
| Limit width toggle + value | ⚙ Display popover (already there) |
| Define toggle | ⚙ Display popover (contextual mode, not a preference, but infrequent enough to live here) |
| Select All | Removed — replaced by scoped Ctrl-A keyboard shortcut |
| Copy | Removed — replaced by scoped Ctrl-C (native, works after Ctrl-A selects the pane) |
| Export .md | File modal |
| Export .html | File modal |
| Load Text | File modal |
| History | Stays as toolbar button |

**Scoped Ctrl-A implementation:** Add `tabindex="0"` to `#content-display` so it can receive focus. Intercept `keydown` on the reading panel; when Ctrl-A fires and focus is within the panel, call `window.getSelection().selectAllChildren(contentDisplay)` and `preventDefault()`. Works naturally after the user clicks into the reading area. Ctrl-C is native and needs no special handling once the selection is scoped.

**Phasing:** This is three separable changes that can ship independently:
1. **Scoped Ctrl-A + remove Select All / Copy buttons** — self-contained, low risk
2. **⚙ Display popover expansion** — add font size and Define toggle; remove S/M/L select from toolbar
3. **⤢ overlay + File modal** — move fullscreen button into text area; consolidate Load Text and Export into File modal

Each phase leaves the app in a shippable state. Phase 1 is the highest value-to-effort ratio.

---

## Current backlog (as of 2026-06-16)

The "Deferred to later milestones" / "Known issues and deferred work" lists inside the closed v3 and v3.1 sections above are historical snapshots and are mostly stale — nearly everything on them has since shipped (vocab normalization, per-word delete/deactivation, profile import/export, the per-profile/global settings audit, the active-profile indicator, the words-read counter, and the UI re-org itself). Per this doc's own convention those closed sections are not edited in place; this section is the current source of truth instead.

Genuinely open items:

- **CEFR half-levels between A1 and A2 (and possibly other adjacent pairs).** Scoped 2026-07-17 — see dedicated section below.
- **Freeform "Misc instructions" field alongside grammar/vocab include-exclude.** Scoped 2026-07-17 — see dedicated section below.
- **Regenerate existing content at a different difficulty level.** Scoped 2026-07-17, no decision yet on whether to build — see dedicated section below.
- **Custom user-overridden Define definitions.** Scoped 2026-07-17 — see dedicated section below.
- ~~**Define popup returns wrong/inconsistent translations when selection contains embedded quotes.**~~ **Fixed 2026-06-16.** `buildDefinePrompt()` (`js/prompt.js`) used to wrap `selection`/`context` in unescaped `"..."`, so a selection containing a literal `"` (e.g. `la frase "¿Qué me traes?"`) produced an ambiguous prompt and the LLM anchored on the embedded quoted sub-phrase instead of the real selection. Latent since the `5ea5def`/`38791b7` Define-prompt fixes (2026-06-09); never covered by `tests/prompt.test.js`. First attempt delimited with `<selection>`/`<context>` tags, but that introduced a new bug — the LLM sometimes echoed the literal tag tokens back into the TRANSLATION line. Final fix: keep the original quote-wrapped framing but escape embedded `"` in `selection`/`context` to `'` before substitution (`escapeForPrompt()`), so the outer delimiter quotes can never be closed early and no novel markup tokens are introduced. Regression tests added in `tests/prompt.test.js`.
- ~~**Define translations pad in unselected context words; results vary between identical requests.**~~ **Fixed 2026-06-19.** Option B implemented — see below for full state and rationale.
- ~~**Mobile: Configure panel layout.**~~ **Implemented and verified on a real iPhone, 2026-06-24.** See below.
- **Mobile: Define-on-selection.** Touch-based text selection on iOS triggers the OS's native callout menu instead of Krashen's selection handling, so Define is currently unreachable on mobile. Platform constraint, not a bug; options scoped below, not started.
- **Library export/import → File modal.** The History modal's JSON/Markdown library export and import buttons are file operations and were flagged as the stronger candidate for living in the File modal (under a "Library" section), leaving History as a pure document browser. Deferred when the File modal shipped (v5.2.3); still open.
- **CEFR evals pipeline.** Automated LLM-as-judge tests checking generated content actually matches the requested CEFR level and dialect. Would live in `evals/` (real API calls, not run in CI), separate from `tests/`. Discussed but not started — no `evals/` directory exists yet.

### Define translation scope-creep — paused investigation (2026-06-16)

**Status (2026-06-19): resolved — Option B implemented.** `buildDefinePrompt()`'s system instruction (`js/prompt.js`) now states explicitly that `context` exists only to disambiguate sense and that `TRANSLATION` must translate only the exact quoted text — never adding, inferring, or borrowing words from `context`, even when the quoted text reads as an incomplete fragment. `generateContent()` and all three provider functions (`callClaude`/`callOpenAI`/`callGoogle`) in `js/llm.js` gained an optional `temperature` parameter, included in the request body only when defined (Google: nested under `generationConfig`). The Define call site in `js/app.js` passes a new `DEFINE_TEMPERATURE = 0` constant; the story-generation call site passes no temperature and keeps each provider's existing default, preserving sampling variety there. Regression tests added in `tests/prompt.test.js` and `tests/llm.test.js`. As the caveat below notes, this controls padding and variance but cannot resolve the underlying grammatical ambiguity for fragment selections that straddle a verb-phrase boundary — that limitation is inherent to the input, not a bug.

**Branch state (historical, as of 2026-06-16):** `fix/define-embedded-quote-collision`, not merged to `main`. Contains two already-completed, unrelated fixes (commits `943f2c6`, `d765b39`) for a *different*, now-resolved Define bug (selections containing embedded quote characters caused the LLM to anchor on the wrong sub-span, then a follow-up fix introduced literal `<selection>` tag echoing — both fixed; see the resolved backlog entry above this section). The bug described here was found while manually re-testing that fix and is unrelated to quoting/delimiters — no code has been written for it yet. *Update:* that branch was merged to `main` on 2026-06-19 before this fix began; Option B was implemented on a fresh `fix/define-scope-creep` branch off `main`.

**Symptom:** Highlighting the exact same two-word span "pasado algunos" (from "...habían pasado algunos días sin verse...") repeatedly returns different translations across requests — "after some days," "after some days have passed," "after some days without seeing each other" — each pulling in words ("days," "without seeing each other") that are not part of the highlighted text at all. The user's expectation: a literal translation of only the two highlighted words, e.g. "after some" or "passed some," with nothing appended from the surrounding sentence.

**Root cause, two distinct mechanisms:**

1. **Context scope-creep.** `buildDefinePrompt()` (`js/prompt.js`) sends the full paragraph as `context` alongside `selection`, e.g. `"pasado algunos" (context: "...habían pasado algunos días sin verse...")`. The system prompt only instructs the model to translate "the quoted text" — it never states that `context` exists solely to disambiguate word *sense* (e.g. is "banco" a bench or a bank?) and must not contribute additional words to the output. Because "pasado algunos" alone is a broken sentence fragment (missing the auxiliary "habían" and the noun "días" it would modify), the model's instinct as a "helpful dictionary" is to reconstruct a coherent clause by pulling words straight out of `context`. This is the part that is unambiguously a prompt bug and is independently fixable.

2. **No determinism control.** `js/llm.js`'s `generateContent()` (and its three provider-specific functions `callClaude`/`callOpenAI`/`callGoogle`) never set a `temperature` parameter on any request, so each call uses the provider's default (commonly ~1.0). This same function is shared between story generation (where sampling variety is desirable) and Define lookups (where a single stable answer for the same input is desirable). With no override, the model is free to decide differently each call how much of `context` to fold in, which is why repeated identical requests for "pasado algunos" produce different padded results rather than the same wrong one.

**Important caveat — there may not be one single "correct" answer here.** "Pasado algunos" genuinely parses two ways depending on words *outside* the selection: (a) as part of the verb phrase "habían pasado algunos días" (had passed some days), where "pasado" is just a participle and a strict literal fragment translation would be the awkward "passed some"; or (b) as the separate Spanish "pasado/pasados + [quantity]" absolute construction (cf. "pasados cinco minutos" = "after five minutes"), which is where "after some" comes from. Which reading applies depends on grammar that isn't in the selection. A fix should stop the model from *padding* the answer with unselected words (mechanism 1) and make repeat lookups *consistent* (mechanism 2) — but it cannot make fragment selections that straddle a verb-phrase boundary resolve to one universally "correct" answer, because the ambiguity is real, not a prompt artifact.

**Two candidate fixes, not mutually exclusive, presented to the user but no decision made yet:**

- **(A) Prompt constraint only — smaller, recommended starting point.** Rewrite the `buildDefinePrompt()` system instruction to state explicitly that `context` is for sense-disambiguation only, and that `TRANSLATION` must cover *only* the exact quoted span — no words added, inferred, or borrowed from `context`, even if the result reads as an incomplete fragment. Touches only `js/prompt.js` and `tests/prompt.test.js`.
- **(B) Prompt constraint + low temperature for Define calls specifically.** Do (A), and additionally thread an optional `temperature` parameter through `generateContent()` and all three provider call functions in `js/llm.js`, so the Define call site in `js/app.js` can pass a near-zero temperature while story generation keeps its current higher default (creativity wanted there). Touches `js/llm.js`, `tests/llm.test.js`, `js/app.js`, and the `js/prompt.js` change from (A). Reduces but does not eliminate variance — even at temperature 0 some providers are not perfectly deterministic.

The user's preference between (A) and (B) had not been captured before this session paused — ask when resuming.

**Decision (2026-06-19):** Option B chosen. See DECISIONS.md for the rationale entry.

---

### Mobile: Configure panel layout (noted 2026-06-24)

**Status: implemented and verified 2026-06-24** on `fix/mobile-configure-panel-resize` — checked in a desktop browser at narrow viewport widths and confirmed working on a real iPhone. See `docs/DECISIONS.md` 2026-06-24 entry for implementation details. Identified alongside the Define-on-selection issue below during mobile spot-checking on an iPhone (Brave). Of the two, this was the one worth shipping first — see priority note at the end of this entry.

**Symptom:** On a narrow viewport, the Configure tab's content (Provider/Content accordion sections) renders in a cramped sliver between the profile chip/tab bar above and the sticky Generate button below. The two-pane desktop layout (config sidebar + reading panel side-by-side, sized via the existing resizable-divider feature) has no mobile equivalent — this is the gap BRIEF.md and v3.1's own backlog already flagged ("built mobile-migration-ready... but the responsive layout itself was never built").

**Decision:** Rather than building new mobile-specific layout/resize code from scratch, extend the existing desktop resizable-divider feature (draggable config/reading split, already persisted to `localStorage`) to operate vertically below the existing mobile breakpoint, instead of horizontally. Same underlying mechanism — drag a handle, persist the chosen size — different axis.

**Scope:**
1. Below the existing mobile breakpoint, the Configure panel already stacks above the reading panel; make the divider between them draggable vertically, reusing the existing resize-persistence code path with a value stored under a separate `localStorage` key from the desktop horizontal split (so a user's desktop and mobile preferences don't clobber each other).
2. Give the Configure panel a sensible default height on first load (e.g. enough to show one open accordion section without scrolling) rather than collapsing to minimum content height.
3. Confirm the Generate button's sticky positioning doesn't fight the new resize handle — it should stay reachable regardless of how tall the user drags the Configure panel.

**Out of scope:** Mobile Define support (separate entry below), any new mobile-specific navigation pattern, tablet-specific breakpoints.

**Done criteria:**
- [x] On a narrow viewport, a drag handle appears between the Configure panel and reading panel; dragging it resizes the Configure panel vertically
- [x] Chosen height persists across reloads (separate `localStorage` key from the desktop horizontal split)
- [x] Generate button remains visible/reachable at any drag position
- [x] Verified on a real device (iPhone), not just devtools responsive mode

**Priority note:** This entry alone would be enough to claim minimal mobile support. Define-on-selection (below) is real but lower-priority and probably deserves its own version given the on-device testing effort involved.

---

### Mobile: Define-on-selection blocked by native OS menu (noted 2026-06-24)

**Status: scoped, not started.** On desktop, selecting text in `#content-display` triggers Krashen's own selection handling and shows the Define popup. On iOS (tested: iPhone 17, Brave), selecting text instead brings up the OS's native callout menu (Copy / Look Up / Translate / Writing Tools) because touch-based text selection is handled by the OS, not the page, and arrives via a different event sequence than desktop's `mouseup`. There is no way to inject a custom item into that native iOS menu — this is a platform constraint, not something fixable with more code on the existing approach.

**Options considered, not mutually exclusive:**
- **(A) Do nothing.** Accept the platform limit; mobile users keep native Copy/Look Up/Translate, Define stays desktop-only. Zero effort, but mobile users lose Krashen's core interaction.
- **(B) Add a custom floating "Define" affordance for touch — recommended.** Listen for `touchend`/`selectionchange`; when a selection exists inside `#content-display` on a touch device, show a small floating button near the selection (the pattern Medium/Genius use for mobile highlight actions) that calls the existing Define pipeline. The native OS menu still appears alongside it — this adds a capability rather than fighting the platform for control of the native one.
- **(C) Suppress the native menu, fully custom mobile selection UI.** `-webkit-touch-callout: none` plus a bespoke touch-selection toolbar. Most work, most control, but removes native Copy entirely unless reimplemented.

**Decision:** (B) is the only option that adds mobile Define support without a UX regression (native Copy/Look Up stay available). Scope as its own version rather than bundling with the Configure panel layout fix above — it touches `js/app.js`'s selection-handling and needs real on-device testing, not just a CSS change.

**Done criteria (if scoped):**
- [ ] Selecting text in `#content-display` on a touch device shows a custom Define affordance without blocking native Copy/Look Up
- [ ] Tapping it runs the existing Define pipeline (same popup, same `clampPopupTop` viewport handling already fixed for desktop)
- [ ] Verified on at least one real iOS device, not just responsive-mode devtools (touch event timing doesn't reliably emulate)

---

### Profile and vocab-list export/import for manual sync (noted 2026-06-26)

**Status (2026-07-17): partially superseded — profile bundle export/import shipped; story/history sync across devices remains the open gap.** Since this entry was written, profile export/import shipped (`krashen-profile-v1` bundle: profile settings + `formDefaults` + the full vocab store — see `docs/DECISIONS.md` 2026-05-31 entry, `js/export.js`'s `exportProfileBundle()`, `js/ui.js`'s profile-chip wiring). The History modal's JSON/Markdown library export/import (v2) covers generated stories, but the two mechanisms are separate and neither is profile-scoped: the profile bundle deliberately excludes history ("history is excluded — the existing library export covers that separately," per the 2026-05-31 decision), and the library export includes every profile's history entries in one file with no filter-by-profile option (history scoping was flagged as deferred back in v3.1).

Re-raised 2026-07-17 (user's framing): syncing a single profile's *stories* specifically across browsers/machines (e.g. Chrome and Firefox on a laptop, Brave or DuckDuckGo on a phone) so they merge into one list per learner identity, rather than living per-browser-install. The building blocks exist (profile bundle for config+vocab, library JSON for stories with id-based dedup on import) but using both together to reconstitute "everything for profile X" on a new browser is a manual, two-step, not-obviously-discoverable process today, and the library import has no per-profile filter if the user only wants one profile's stories merged in.

**Options, not mutually exclusive:**
- **(A) Do nothing further — document the two-step manual process.** Export profile bundle + export library, transfer both files (iCloud Drive, Dropbox, rsync, AirDrop, etc.), import both on the target browser. Zero new code; just needs the two independent features to be described together somewhere discoverable (this doc / SPEC.md §4.8).
- **(B) Unify into one "Sync" export/import.** A single bundle containing profile settings + vocab + that profile's history entries (filtered from `krashen_history` by `profileId`), one export button, one import button. Removes the two-step friction and makes profile-scoped history filtering a first-class thing rather than a gap.
- **(C) Actual background sync (iCloud/Google Drive/Dropbox API, or a sync server).** Automatic instead of manual. Bigger lift, and cuts against the "no backend, no accounts" hard constraint in BRIEF.md unless scoped as client-side-only integration with a user's own cloud-storage account (e.g. writing the export JSON to a folder the OS already syncs, which is really (A)/(B) plus a "where do I put this file" convenience, not new sync infrastructure).

**Open question:** whether (B)'s unification is worth the schema/UI churn given (A) already works today with two clicks, or whether this should just be documented as the existing solution. No decision made — needs a design pass if (B) or (C) is pursued.

---

### SRS revisit — PlusOneLanguage.app model (noted 2026-06-26)

**Status: investigate further.** Krashen has SRS in the sense of vocab tracking and i+1 prompt injection, but [PlusOneLanguage.app](https://plusonelanguage.app) may implement a more structured SRS (e.g. spaced repetition scheduling with explicit review intervals, card-style recall). Investigate what specifically their model does that the current system does not, then decide whether to adopt any of it. See https://claude.ai/chat/9e43e7ca-5d7d-41cd-87de-456954808d3c for the original discussion thread.

---

### Extended story mode — Chapters (noted 2026-06-26)

**Status: not started.** A new Content → Format option: "Extended story (chapters)." Idea: a central recurring character appears across multiple independently-generated chapters rather than each generation being a standalone piece. Open questions: where chapter state/character details live (localStorage, a running summary injected into the prompt?), how chapters are named and ordered, whether the reading panel shows all chapters or one at a time. Scope is undefined — needs a design pass before implementation.

**Re-raised 2026-07-17 (user's framing), same idea, worth merging into this entry rather than opening a new one:** a recurring cast — could be one character (Pedro, a kid with a cat and a dog) or a pair (a tortoise and a rabbit) — that persists across separately-generated pieces, not necessarily under a "chapters" format label specifically. The user flagged this one as not fully thought through yet. It shares the same open questions as above (where character/continuity state lives, how much prior content gets summarized back into the prompt) plus one more worth adding: whether this is a property of a *piece* (this story continues that one) or of a *profile* (this profile has a standing cast that any new generation can opt to include), which changes the data model — a per-piece "continues from" link vs. a per-profile character-roster setting similar to `formDefaults`. Needs the same design pass as the chapters idea before scoping further; treat as one feature area, not two.

---

### Move "Autosave lookups" to Settings tab (noted 2026-06-26)

**Status: not started.** "Autosave lookups" is currently in the Tuning tab (SRS params for the active profile). Consider whether it fits better in the Settings tab alongside other persistent behavior preferences. Low effort if the decision is made — just HTML/wiring relocation.

---

### Vocab management improvements (noted 2026-06-26)

**Status: not started.** The Vocab tab term list is a scrollable widget inside the left panel — fine for small lists but cramped as vocab grows. Ideas:

- **Dedicated vocab page or expanded modal** — a larger surface showing the full list with more columns visible at once.
- **Per-entry actions: promote / demote / sleep / dismiss / retire** — more granular control than the current mastery-derivation algorithm. "Sleep" would suppress a term from re-expose lists for N generations; "retire" would mark it acquired and stop tracking it actively; "dismiss" would remove it entirely.

These build on the existing per-word delete/deactivation that already shipped, but add more states. Needs a data-model decision (new fields on vocab entries) before implementation.

---

### Choose Your Own Story mode (noted 2026-06-26)

**Status: not started.** A new content-generation mode where the story is interactive. After each generation the user is presented with three short choices ("What happens next?") and selects one; that choice seeds the next generation prompt. Rough flow:

1. First generation runs normally (using current Configure settings).
2. After the passage renders, a "What happens next?" prompt appears with three generated options (e.g. "The merchant offers a deal", "A stranger arrives", "A storm rolls in").
3. User picks one; it is injected into the next generation as a directive, producing the next passage.
4. Repeat — the story grows as a chain of player-directed passages.

Open questions: who generates the three options (a second LLM call? the same call via a structured-output mode?), whether the full story chain is displayed as one scrolling narrative or passage-by-passage, how History/library export should represent a multi-turn story, and whether SRS vocab tracking (re-expose list) spans the whole chain or resets per passage. Needs a design pass before implementation.

---

### Topic-aware vocab inclusion for SRS (noted 2026-06-26)

**Status: not started.** (Extends the existing "topic-aware re-expose list" deferred item from v3.1.) Rather than passing the full re-expose list to the LLM, filter it by topic relevance before injection: if the current story is set in a seaside town during tourist season, suppress re-expose items that only appeared in, say, a doctor's-office story. The LLM already knows the story topic; the challenge is deciding relevance without a second LLM call (expensive) or a naive keyword match (brittle). One option: record the story topic on each vocab entry at the time of lookup/save, then use that field to filter. Design needed.

---

### Phrase-boundary highlighting for Define (noted 2026-06-30)

**Status: not started.** Inspired by [PlusOneLanguage.app](https://plusonelanguage.app), which visually distinguishes single-word vs. multi-word lookups: hovering a word or collocation (e.g. "apretón de manos") underlines the full span being treated as one unit, and clicking offers a choice between the word alone and the containing phrase.

**Why this doesn't fit today's Define as-is:** Krashen's Define is drag-to-select (`js/app.js`, the `mouseup` handler around line 374) — the user manually selects arbitrary text and that literal selection is sent for translation. There is no concept of pre-known phrase boundaries to highlight on hover; PlusOne's effect depends on the text already being segmented into word/phrase spans (note their separate "Chunk" button in the screenshot) before any interaction happens.

**Proposed approach:**
1. **Segmentation step, on-demand rather than baked into generation.** Add a toolbar action (mirroring PlusOne's "Chunk" button) that makes one LLM call over the already-displayed piece and returns structured JSON — an array of span objects (`text`, `type: "word" | "phrase"`, optionally a `gloss`) in reading order — rather than inline markers in the prose. The renderer needs that structure anyway to build the `<span>` elements and to cache on the history entry, so asking the LLM for it directly avoids a separate parsing step and the fragility of re-locating marker characters inside translated/accented text. Cache the result on the history entry so it doesn't re-run on reload and works retroactively on existing History pieces. Baking markers into the main generation prompt instead was considered and rejected for now — it taxes every generation call (cost/latency) even when the user never uses Define, and doesn't help text already in History.
2. **Rendering.** Once spans are known, wrap content in `<span>`s carrying phrase-membership data attributes (driven directly off the JSON array's order), replacing (or augmenting) the current plain-text rendering in `js/display.js`.
3. **Hover.** CSS underline on hover reveals the full phrase boundary for multi-word spans, single underline for standalone words — matching the PlusOne reference image.
4. **Click behavior.** Plain click translates the hovered span as a unit (the phrase, if part of one). Alt/Option+click forces single-word translation, bypassing phrase membership. This replaces the popup-with-choice pattern PlusOne uses (word vs. phrase) with a modifier-key shortcut for the common case — lower friction, no extra popup decision on every lookup.
5. **Fallback.** Keep existing drag-to-select Define for arbitrary spans the segmenter didn't anticipate (e.g. cross-phrase selections, or pieces that haven't been Chunk'd yet).

**Open questions, need a design pass before implementation:**
- Whether the JSON span array (ordered list of `{text, type, gloss?}`) is sufficient on its own for rendering, or whether `<span>` placement also needs explicit offsets/token indices to stay robust against minor whitespace/punctuation mismatches between the array and the original text; either way, rendering should key off the array order rather than re-parsing markers out of the prose. Also needs to survive re-renders (font size change, column width toggle, etc.) without drifting out of sync with the text.
- Whether Chunk results should auto-invalidate if a piece's text could ever change (currently pieces are immutable once generated, so likely fine).
- Interaction on mobile, where Alt+click has no equivalent and Define-on-selection is already blocked by the native OS menu (see "Mobile: Define-on-selection" above) — this entry likely depends on that one being resolved first, or needs its own mobile fallback (e.g. tap = phrase, long-press = word).
- Cost/UX of the Chunk call itself: does it run automatically on first Define use, or require an explicit user action per piece?

---

### Bug: requested output length is not honored (e.g. 2500-word Article generated ~456 words) (noted 2026-07-03)

**Status: fixed in v5.3.1 (2026-07-03).** User requested Format: Article, Length: 2500 words, and got back roughly 456 words — a large undershoot, not just imprecision.

**Two separate contributing issues, both real:**

1. **Hardcoded `max_tokens: 2048` on the Claude request path.** `callClaude()` in `js/llm.js` sent a fixed `max_tokens: 2048` regardless of `config.outputLength`. Spanish prose runs roughly 1.3–1.5 tokens/word, so 2048 tokens was a hard ceiling around 1400–1600 words — meaning any request above that (2500 falls in this range, and the UI's own tooltip advertises a practical range up to 3000) was structurally unreachable even if the model fully complied. `callOpenAI()` and `callGoogle()` didn't set an explicit output-token limit at all, so they fell back to provider defaults — output length behavior was inconsistent across the three providers.
2. **Weak length wording.** The user prompt stated "Approximate length: N words" with no instruction discouraging the model from stopping early. Part of the 456-vs-2500 gap was the model under-delivering relative to the prompt, not just the token ceiling (456 words is itself well under the old 2048-token/~1500-word ceiling).

**Fix shipped:** `js/llm.js` gained `estimateMaxTokens(targetWordCount)` — converts the requested word count into a token budget (`words × 2.2 + 300` overhead, clamped between the previous 2048 default and an 8192 ceiling) and applies it to all three providers (`max_tokens` for Claude/OpenAI, `generationConfig.maxOutputTokens` for Google). `generateContent()` gained a trailing `targetWordCount` parameter; `js/app.js`'s `handleGenerate()` now passes `config.outputLength` through. `js/prompt.js`'s length line was strengthened to "...treat this as a firm target: write the full length requested, do not stop early to wrap up quickly." Regression tests added in `tests/llm.test.js` (token-budget scaling per provider, floor/ceiling behavior) and `tests/prompt.test.js` (firm-target wording).

**Deliberately not done (still open, not a regression from this fix):** no post-generation check comparing actual vs. requested word count, and no retry/continuation or sectioned-generation strategy for very large requests. The two options below from the original write-up remain open if the strengthened prompt + wider token budget don't prove sufficient in practice:
- A post-generation check in `js/app.js` that warns or retries when actual word count falls far short of the target.
- Sectioned generation (outline, then per-section) for large requests — more invasive, most reliable for hitting large targets.

---

### Feature: Vocabulary cap dropdown is a fixed 6-value enum — allow custom/intermediate values? (noted 2026-07-03)

**Status: not started, needs a decision.** The "Vocabulary cap" dropdown (`index.html` line 150; `WORD_CAPS` in `js/config.js` line 2) only offers `550, 1000, 2000, 3000, 5000, 7500`. This isn't just a UI limitation — `validateConfig()` (`js/config.js` line 36) hard-rejects any `wordCap` value not in that exact list, so today there is no way to request something in between (e.g. 1500) or outside the range, even by editing the request.

**Open question for the user:** is a closed enum tied to CEFR pairing (`CEFR_WORD_CAP` in `js/app.js` line 766: A0/A1→550, A2→1000, B1→2000, B2→3000, C1→5000, C2→unrestricted) intentional and worth keeping simple, or should it become a free-entry number (like the "Length (words)" field already is) with the six CEFR-paired values kept as presets/quick-picks? A free-entry field would need a sensible enforced range — current frequency-list-based generation hasn't been tested below 550 or above 7500, so raising or lowering the bound isn't free; it would need verification that the LLM can meaningfully honor a cap that low (e.g. 200) or that high (e.g. 10000) before exposing it.

**Options, not mutually exclusive:**
- Keep the six presets, but also allow a free-text/number input (mirroring the existing "Length (words)" pattern) with `validateConfig()` relaxed to a numeric range check instead of a fixed-set check.
- Add a few more preset rungs (e.g. 1500, 4000) without going fully free-form, if testing shows the existing six were chosen somewhat arbitrarily rather than for a specific reason.
- Leave as-is if the enum was deliberately kept small to match well-tested, natural CEFR breakpoints — needs to be checked against `docs/DECISIONS.md` 2026-05-26/2026-06-01 entries, which record the CEFR/word-cap pairing decision but not why these exact six numbers were chosen over intermediate ones.

**Done criteria (once scoped):** a decision recorded in `docs/DECISIONS.md` on whether the cap becomes free-entry or stays a closed enum, and if free-entry, an enforced min/max backed by at least manual verification that the LLM behaves sensibly at the new extremes.

---

### Define lookup caching — avoid re-fetching the same word/phrase within a piece (shipped v5.4.0, 2026-07-03)

**Status: shipped.** Previously, every highlight fired a fresh LLM call even for a word/phrase already looked up moments earlier in the same passage — wasted cost and latency, especially annoying when re-checking a word you'd just defined.

**Scoping decisions (both taken as the recommended/simpler option):**
- **Lifetime:** in-memory only, scoped to the current session — no persistence across reloads, no eviction logic needed. A page reload or navigating away from a piece naturally loses the cache.
- **Key:** `(text, context)` only — not target/native language. Define's own inputs already are `(text, context, targetLang, nativeLang)`, but language dropdowns are rarely changed mid-session without also regenerating content, so this was judged not worth the extra key complexity.

**Implementation:** New pure module `js/defineCache.js` — `createDefineCache()` returns `{ get, set, clear }` backed by a `Map<pieceId, Map<normalizedKey, result>>`. Keys normalize `text`/`context` (trim + lowercase) and join with a NUL separator (not a printable delimiter, which real text could theoretically contain). Scoping by `pieceId` (`currentEntry.id`, already set for every displayed piece — fresh generations, History reopens, and imported/"Load your own text" pieces all persist an entry with an `id` before Define can fire) means the same word appearing with different senses in different pieces never collides, and switching pieces can't serve a stale cross-piece answer.

`js/app.js`'s `mouseup` handler now checks `defineCache.get(pieceId, text, context)` before calling `generateContent()`; on a hit it renders the popup immediately from the cached `{lemma, translation}` (no API call, no visible "…" loading flash since the render happens synchronously in the same tick as the "…" placeholder). On a miss, it calls the LLM as before and stores the parsed result before rendering. The render + vocab-autosave/"Save to vocab" logic was extracted into a new `applyDefineResult()` helper shared by both paths, so caching has zero effect on vocab-tracking behavior — a cache hit still autosaves or shows the save button exactly as a fresh lookup would.

**Verified:** `tests/defineCache.test.js` (7 cases: basic hit/miss, case/whitespace normalization, polysemy — same text/different context misses, per-piece scoping, phrase/sentence keys, `clear()`). Also manually verified end-to-end in a browser with `fetch` stubbed: highlighting the same word twice made one network call total; a different word made a second call; loading a new piece and re-highlighting the same word made a third call (confirming per-piece scoping isn't leaking cross-piece).

**Deliberately not done (open follow-ups if ever needed):** persistence across reloads/History revisits, and keying on target/native language — both noted above as the simpler side of the scoping decision, not full designs.

---

### Define "Re-check" — per-lookup cache bypass (shipped v5.5.0, 2026-07-03)

**Status: shipped.** Follow-up to the Define lookup caching above. Scoping question: should there be a way to force a fresh lookup instead of a cached one? Two shapes were considered — a global session toggle to disable caching entirely, vs. a per-lookup "try again" affordance that leaves caching on but forces one fresh call. The user chose per-lookup: it covers the actual need ("I think that translation was wrong/stale, get me a new one") without a blanket setting that's easy to forget is on.

**Implementation:** A new "↻ Re-check" button (`#define-recheck-btn`, `index.html`) inside the Define popup, hidden until a real result (cached or fresh) is rendered, and re-hidden whenever a new selection starts. `js/app.js` gained: `lastDefineLookup` (module-level, records the `{text, context}` of the most recent lookup so the button — which fires from its own click listener, not the `mouseup` closure — knows what to redo); `fetchDefineResult(text, context)`, extracted from the inline `mouseup` logic, which now throws a `"No API key set"` error uniformly rather than special-casing that check before the try/catch; and `fetchAndApplyDefine(text, context, pieceId, mySeq)`, which calls it, **unconditionally overwrites** the cache entry for that key (`defineCache.set(...)`, not conditioned on a prior miss), and renders the result. Both the `mouseup` handler's cache-miss path and the Re-check click handler now call this same function, so a Re-check is implemented as "run the exact same fresh-lookup path a miss would have taken," not a separate mechanism.

**Verified:** `tests/defineCache.test.js` gained a regression-guard case confirming `set()` overwrites an existing entry (the property Re-check depends on). The button-click wiring itself (DOM event handling, visibility toggling) was verified manually in-browser with `fetch` stubbed to return a different translation on each call — confirmed a repeat highlight served the cached "call #1" answer with no new fetch, clicking Re-check forced a genuine "call #2" fetch and updated the popup, and a subsequent highlight of the same word then served the new "call #2" answer from cache (proving the overwrite, not just the bypass) — consistent with the project's existing split between unit-tested pure logic and manually-verified DOM wiring (see the 2026-06-24 mobile-resizer `DECISIONS.md` entry for the same precedent).

---

### CEFR half-levels between adjacent tiers (noted 2026-07-17)

**Status: not started, needs a decision.** `CEFR_LEVELS` (`js/config.js` line 1) is currently `['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']`, each auto-paired with a word-cap rung per the 2026-06-01 `DECISIONS.md` entry (A0/A1→550, A2→1000, B1→2000, B2→3000, C1→5000, C2→7500/unrestricted). User's observation: the step from A1 to A2 (and potentially other adjacent pairs) feels like too large a jump, and an intermediate "half-size" rung — the way shoe sizes have half sizes — would smooth the difficulty curve.

**What a half-level would actually mean:** CEFR level in this app isn't a single dial — it drives the word-cap pairing and is referenced in the system prompt as a discourse/grammar-complexity label. A true "A1.5" would need its own point on both axes: a word-cap value between 550 and 1000 (the existing pairing table has no rung there), and prompt wording that describes something between A1 and A2 grammar/discourse expectations rather than reusing one of the two label strings. This is a bigger lift than just adding a string to a dropdown.

**Options, not mutually exclusive:**
- **(A) Add explicit half-levels to the enum.** Extend `CEFR_LEVELS` with `A1.5`, `A2.5`, etc. (however many pairs feel like they need it — user only named A1→A2 so far), each with its own word-cap pairing and its own system-prompt wording describing the in-between grammar/vocabulary target. Most explicit; most work — needs a wording pass per new label so the LLM has something concrete to aim for, not just an interpolated number.
- **(B) Decouple the word-cap from the fixed enum instead (ties into the existing "vocabulary cap dropdown" open item below/above from 2026-07-03).** If word-cap becomes free-entry, a user could already dial in an intermediate *vocabulary* difficulty at a fixed CEFR label — e.g. A2 grammar with a 750-word cap instead of 1000. Doesn't address the grammar/discourse axis moving in half-steps, but may cover most of what "the jump feels too big" is actually about, since vocabulary breadth is usually the more perceptible part of a difficulty jump. Cross-reference: `docs/PLAN.md`'s 2026-07-03 "Vocabulary cap dropdown" entry above already raises free-entry for a different reason (allowing 1500, 4000, etc.) — if that ships, it may partially subsume this.
- **(C) Leave CEFR as the seven standard/near-standard tiers and rely on the independent word-cap override (already possible today per the 2026-06-01 decision) plus other axes (sentence-length ceiling, connector density) for fine-tuning between tiers.** Lowest effort — arguably this already works today via manual override, just not with a labeled "half-level" preset a user can pick without understanding the underlying knobs.

**Open questions:** how many half-levels are actually wanted (just A1/A2, or every adjacent pair through C2 — diminishing value at the higher tiers where content is already less rigidly defined); whether half-levels get their own word-cap rung or just split the difference numerically; whether this is better solved by exposing the existing independent-override capability more visibly in the UI (option C) rather than growing the enum. Needs a decision before implementation.

---

### Freeform "Misc instructions" field (noted 2026-07-17)

**Status: not started, needs a decision.** Today the linguistic-targeting inputs that reach the LLM as free text are narrowly scoped: `tenseFocus` (checklist + prompt line "Tenses/structures to use: ...", `js/prompt.js` line ~55-58), `includeWords` ("Must include these words/phrases (woven in naturally): ...", `js/prompt.js` line ~117-118), and `excludeWords` ("Must exclude these words/phrases: ...", `js/prompt.js` line ~121-122). There's no catch-all field for instructions that don't fit "grammar to use" or "words to include/exclude" — e.g. tone, a constraint on setting, a stylistic preference, something specific to one generation that doesn't warrant its own permanent config field.

**Proposed shape:** A new `miscInstructions` (or similarly named) free-text field in `js/config.js`'s config schema, surfaced in the Configure tab (Linguistic Focus section per SPEC.md §1.2, alongside tense focus and include/exclude), assembled into the prompt in `js/prompt.js` as its own line — e.g. "Additional instructions: {text}" — appended after the existing grammar/vocab constraints so the LLM sees it as supplementary rather than overriding the structured fields above it.

**Open questions, need a decision before implementation:**
- **Where it lives / scope:** per-generation (cleared or not cleared between requests, like `topic` is today) vs. a `formDefaults`-style persisted field like the other Linguistic Focus inputs. The existing include/exclude-words fields persist as form defaults — likely the same treatment applies here for consistency, but worth confirming since "misc" instructions may be more often piece-specific (e.g. "make the ending bittersweet") than durable across every future generation.
- **Precedence/conflict handling:** what happens if free text contradicts a structured field (e.g. a user writes "use subjunctive freely" in Misc while `tenseFocus` explicitly says avoid it)? Probably: no special handling, the LLM resolves it same as any other prompt content, but worth stating in the prompt-design notes (SPEC.md §2) if this ships, similar to how the Define prompt fix (see `docs/DECISIONS.md` 2026-06-19 entry) had to state explicit precedence rules once two instructions could conflict.
- **Naming:** "Misc instructions" vs. something more specific like "Additional notes for the LLM" — minor, but affects the tooltip text convention already established in SPEC.md §4.7 (every control needs a plain-language tooltip).

---

### Regenerate existing content at a different difficulty level (noted 2026-07-17)

**Status: raised, then the user talked themselves out of certainty — open, no decision, possibly not worth building.** Original idea: take an existing story/article (e.g. a piece about La Catrina generated at A0) and regenerate it "the same but harder/easier" at A1, A2, etc., rather than starting a fresh generation from scratch with the topic retyped. In the same message, the user reconsidered — flagging uncertainty about how much internal tracking of content/instructions this would require and whether it's better left as something the user manages manually (re-enter the topic at a new CEFR level, which already works today with zero new code).

**Why this isn't as simple as "regenerate with a new CEFR value":** every history entry already stores its originating `config` (per the v1 `krashen_history` schema — `{ id, date, config, content, wordCount }`), so the raw ingredients for "run this again with a different level" already exist without new data-model work. The open question is really about product behavior once that's exposed as a button:
- Does "regenerate at a different level" produce a related-but-independent history entry (simplest — just pre-fills the Configure tab from the old entry's `config` with the CEFR level changed, then a normal Generate), or does it need to track a family relationship between the original and the regenerated version (e.g. for a future "show me all difficulty variants of this piece" view)?
- Does the LLM regenerate freely from the topic/config alone (likely to produce a different plot/wording, not a true "harder version of the same text"), or does it need the original text passed back in the prompt with an instruction like "retell this at CEFR level X" (closer to what "move it up/down the difficulty spectrum" implies, but a materially different and unbuilt prompt-assembly path)?

**Options, not mutually exclusive:**
- **(A) Do nothing — confirm this is already achievable manually.** Open the old entry from History, note its topic/settings, start a new generation with the CEFR level changed. Zero new code. This is likely what the user's own second-guessing was pointing at.
- **(B) Lightweight convenience only.** A "Regenerate at a different level" action on a History entry that just pre-fills the Configure tab from that entry's stored `config` (topic, format, dialect, etc.) with the CEFR/word-cap fields left for the user to change, then a normal Generate call — no retelling, no tracking of a family relationship. Small, mechanical, low-risk.
- **(C) True "retell at a different level."** Pass the original piece's text into the prompt with an explicit retelling instruction, and track a lineage link between entries (new field on history entries, e.g. `regeneratedFrom: id`). Bigger lift; touches `js/prompt.js`, `js/history.js`/`storage.js` schema, and possibly the History UI (showing variants of the same source piece grouped together).

**Recommendation for the next conversation, not a decision:** start by confirming whether (A) already satisfies the itch before building (B) or (C) — this is the kind of feature (like the already-declined topic-aware vocab re-expose idea, `docs/DECISIONS.md` 2026-06-01 "Topic-aware re-expose: won't build automated version") that may be better left as a manual workflow than a tracked, tooled feature. No action taken; revisit only if (A) proves insufficient in practice.

---

### Custom user-overridden Define definitions (noted 2026-07-17)

**Status: not started, needs a decision on the cross-check sub-feature.** Today, Define lookups store whatever `LEMMA`/`TRANSLATION` the LLM returns (`js/prompt.js`'s Define prompt, `js/vocab.js`'s `recordLookup`) into the per-term `translations` array (SPEC.md §6.1). There's no way for the user to pin their own preferred gloss — e.g. the user wants "o sea" to always read as "rather" / "in other words" for memorization purposes, even though the LLM's contextual translation keeps coming back as "I mean."

**Precedent already in the codebase for exactly this shape of override:** the `userMastery` field (`docs/DECISIONS.md` 2026-06-04 entry) already establishes the pattern — an optional user-set field that takes precedence over the algorithmically/LLM-derived value in `getForPrompt()` and all UI display, while the underlying automatic derivation keeps running and writing to its own field underneath, untouched. A `userTranslation` (or similarly named) field on vocab entries would likely follow the identical shape: optional, user-set, takes precedence over `translations` for display and for whatever gets fed back into future prompts, never overwritten by `recordLookup`.

**Normalization/lemma handling:** the user explicitly asked that custom definitions be "subject to the same rules of normalization/lemmas/etc." as LLM-sourced ones. Since vocab entries are already keyed by lemma (SPEC.md §6.1's "Lemma normalisation" note), a user-supplied definition would naturally attach to the same lemma-keyed entry as any LLM-sourced translation for that term — no separate normalization path needed, it rides on the existing keying scheme. Surface forms (`forms` array) would still resolve to the same entry and inherit the same user override.

**Open sub-feature, needs its own decision — cross-checking the user's custom definition against the LLM:** the user floated warning them if their custom gloss seems out of line with what the LLM says (e.g. catching a case where "rather" is actually a mistranslation, not just a memorization preference). This is a materially different feature from the override itself:
- Requires an LLM call at the time the custom definition is saved (or lazily, next time the term comes up) to compare the user's text against a fresh/contextual translation and decide "close enough" vs. "flag it" — a judgment call for the LLM, not a simple string match, since "rather" vs. "I mean" are legitimately both defensible glosses for "o sea" depending on framing.
- Where the warning surfaces (inline in the Vocab tab? A toast at save time? Only shown once and dismissible?) and whether it blocks saving or is purely advisory.
- Cost/latency: this is an extra API call per custom definition saved, which the base override feature doesn't need at all.

**Options:**
- **(A) Ship the override only (no cross-check).** `userTranslation` field, same shape as `userMastery`, simplest and lowest-risk. Matches an established pattern exactly.
- **(B) Ship the override, add the cross-check as a follow-on.** Do (A) first, then decide separately whether the extra LLM call and warning UX are worth it — mirrors how `userMastery` and its review-modal UI (2026-06-04) shipped as one decision but could have been split.

**Recommendation for the next conversation, not a decision:** (A) looks straightforward and low-risk to scope into a real implementation plan next; (B)'s cross-check half needs its own design pass (UX for the warning, when the extra LLM call fires) before it's ready to build.
