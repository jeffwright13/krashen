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

## v2 — TTS Playback

_Stub. Scope TBD after v1 ships._

---

## v3 — Vocabulary Tracking

_Stub. Scope TBD after v2 ships._

---
