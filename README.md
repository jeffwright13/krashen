# Krashen

A browser-based reading tool built around Stephen Krashen's
[i+1 input hypothesis](https://en.wikipedia.org/wiki/Input_hypothesis): you acquire
language fastest when input is just slightly beyond your current level — comprehensible,
but with a handful of new words to stretch you.

Krashen generates graded Spanish reading content via LLM, tuned to your CEFR level,
vocabulary cap, dialect, and grammar focus. It tracks the words you look up and lets
you export them for use in Anki or any other SRS tool you already use.

**What's in the box:**

- **Generate** — stories, articles, dialogues, or scripts at any CEFR level (A0–C2),
  with configurable word-frequency cap, dialect, tense focus, narrative person, and length
- **Define** — select any word or phrase to get an instant inline translation from the same
  LLM; the base/dictionary form (lemma) is stored automatically; save to vocab in one click
  or enable autosave per profile
- **Vocab tracking** — entries keyed by lemma with surface forms recorded; mastery levels
  M0–M5 as an exposure indicator; Skip words to suppress them from the i+1 hint list
- **Export for Anki** — export your vocab list as a tab-separated `.txt` file
  (term, translation, context) importable directly into Anki
- **i+1 vocabulary hints** (optional, off by default) — softly nudges the LLM to
  reintroduce emerging words and avoid known ones; configurable in the Vocab tab
- **Profiles** — separate learner configurations with their own vocab store, CEFR level,
  dialect, provider preference, and settings; import/export for backup or transfer
- **History** — every generated piece saved with metadata, filterable by profile,
  exportable as JSON or Markdown
- **Prompt debug** (optional, off by default) — shows the exact system and user prompts
  sent to the LLM after each generation; useful for understanding how UI fields map to
  prompt knobs

No backend. No accounts. API keys live in your browser and go only to the provider you
choose.

---

## Getting started

**Prerequisites:** Node.js 18+ (for the dev server and tests; the app itself has no
runtime dependencies).

```bash
# Install dev dependencies
npm install

# Start a local dev server
npm run serve
```

Then open the URL printed in the terminal (`serve` defaults to port 3000 but
auto-selects another if 3000 is in use).

On first launch, open the **Settings** tab in the left panel and enter an API key for
your chosen provider. Then fill in the content form and press **Generate**.

> Note: the app uses ES modules loaded directly by the browser. You must serve it over
> HTTP — opening `index.html` via `file://` will fail in most browsers.

---

## API keys

Keys are stored in `localStorage` and sent only to the selected provider. They are never
logged or transmitted elsewhere. This is verified by `tests/security.test.js`, which
asserts that:

- `setApiKey` and `getApiKey` never call `fetch`
- Each key is routed only to its own provider's endpoint (one `fetch` call, correct URL)
- Each key appears in the correct field (header for Claude/OpenAI, URL for Google) and
  never in the request body
- No cross-provider leakage: calling one provider does not transmit another provider's key

| Provider | Where to get a key |
|---|---|
| Claude (Anthropic) | [console.anthropic.com](https://console.anthropic.com) |
| OpenAI | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| Google Gemini | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) |

> **Note:** The Claude API does not support browser-based CORS requests. Selecting Claude
> will display a warning in the UI. OpenAI and Google Gemini work in-browser without
> a proxy.

---

## Running tests

```bash
npm test              # run all tests once
npm run test:watch    # re-run on file changes
```

Two runners are used: **Vitest** for browser-environment modules (jsdom), and a minimal
**Node CJS runner** (`node tests/run.js`) for the pure-logic ES modules that don't
require a DOM.

| Test file | Runner | What it covers |
|---|---|---|
| `config.test.js` | Vitest | `DEFAULT_CONFIG` constants, `validateConfig` |
| `prompt.test.js` | Vitest | `buildSystemPrompt`, `buildUserPrompt`, `buildDefinePrompt`, `parseDefineResponse` |
| `storage.test.js` | Vitest | localStorage read/write, settings deep-merge, history CRUD |
| `history.test.js` | Vitest | `getHistory`, `deleteHistoryEntry`, `clearHistory`, profile stamp |
| `llm.test.js` | Vitest | Endpoint, headers, and response parsing per provider |
| `display.test.js` | Vitest | DOM rendering, markdown blocks, toast, `triggerDownload` |
| `security.test.js` | Vitest | API key storage and transmission guarantees |
| `import.test.js` | Vitest | `parseLibraryJSON`, `parseProfileBundle` |
| `profileIO.test.js` | Vitest | `exportProfileBundle`, `parseProfileBundle` round-trip |
| `ui.test.js` | Vitest | Tab switching, profile chip, vocab-enabled toggle, SRS fields, vocab tab |
| `profiles.test.js` | Node CJS | Profile CRUD, `createFromBundle`, `importProfileVocab` |
| `vocab.test.js` | Node CJS | `recordLookup` (lemma/forms), `recordSeen`, `getForPrompt`, `deleteTerm`, `setActive` |

The orchestration layer (`app.js`) is verified by manual in-browser testing.
