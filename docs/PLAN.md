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
- History scoping per profile
- Per-profile vs. global settings audit (form defaults, provider selection)
- Mobile layout (architecture is migration-ready; layout itself deferred)

---
