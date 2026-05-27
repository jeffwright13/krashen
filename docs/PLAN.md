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

- [x] All unit tests pass (`npx vitest run`) — 89 tests across 5 files
- [x] User can enter an API key, configure a request, generate content, and read it
- [x] No API keys or secrets in the repo
- [x] GitHub Actions deploy workflow created (`.github/workflows/deploy.yml`)
- [x] Deployed and accessible on GitHub Pages (enable in repo Settings → Pages → GitHub Actions)
- [x] DECISIONS.md updated with any choices made during implementation
- [x] No `console.log` debug artifacts in committed code

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

- [ ] All unit tests pass (`npx vitest run`)
- [ ] History panel lists past pieces; clicking one loads it into reading panel
- [ ] Delete entry and clear history work (with confirmation)
- [ ] Export single piece as Markdown: downloaded file passes manual inspection
- [ ] Export library as JSON: file round-trips through import with correct counts
- [ ] Export library as Markdown: file opens cleanly in a text editor
- [ ] Import: merges correctly; duplicate entries skipped; invalid files show error
- [ ] Font size control works in reading panel
- [ ] Fullscreen toggle hides/restores config panel
- [ ] No `console.log` artifacts; DECISIONS.md updated

---

## v3 — Vocabulary Tracking and i+1 Loop

**Goal:** Close the feedback loop between what the user has read and what gets generated
next. The app tracks which words have appeared in generated content and can use that
list to constrain future prompts — the core of the i+1 (comprehensible input + 1)
technique.

_Stub. Scope TBD after v2 ships. Key design questions to resolve at v3 kickoff:_

- _Word extraction: client-side tokenization (split on whitespace, strip punctuation) or
  LLM-assisted (ask the model to return a word list alongside the content)?_
- _i+1 UI: how does the user review and edit the seen-words list before it influences
  generation?_
- _Anki export: is it in scope for v3 or deferred further?_

---
