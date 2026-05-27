# Krashen

Browser-based [comprehensible input](https://en.wikipedia.org/wiki/Input_hypothesis) tool
for language learning. Generates graded reading content via LLM based on a structured
configuration: CEFR level, vocabulary cap, target dialect, grammar focus, and more.
Named after Stephen Krashen's i+1 input hypothesis.

No backend. No accounts. API keys stay in your browser.

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

Then open [http://localhost:3000](http://localhost:3000) in a browser.

On first launch, click **Settings** (top-right of the config panel) and enter an API key
for your chosen provider. Then fill in the content form and press **Generate**.

> Note: the app uses ES modules loaded directly by the browser. You must serve it over
> HTTP — opening `index.html` via `file://` will fail in most browsers.

---

## API keys

Keys are stored in `localStorage` and sent only to the selected provider. They are never
logged or transmitted elsewhere.

| Provider | Where to get a key |
|---|---|
| Claude (Anthropic) | [console.anthropic.com](https://console.anthropic.com) |
| OpenAI | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| Google Gemini | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) |

---

## Running tests

```bash
npm test              # run all tests once
npm run test:watch    # re-run on file changes
```

The suite covers `config`, `prompt`, `storage`, `llm`, and `display`. The orchestration
layer (`app.js`) is verified by manual in-browser testing.

---

## Project docs

| File | Contents |
|---|---|
| `docs/BRIEF.md` | What it is, who it's for, hard constraints |
| `docs/SPEC.md` | Feature-by-feature design (living document) |
| `docs/DECISIONS.md` | Architectural choices and rationale (append-only) |
| `docs/PLAN.md` | Implementation plan and done criteria per version |

---

## Versioning

Version is tracked in `package.json` and displayed in the app UI. Use `npm version` to
bump and tag:

```bash
npm version patch     # 0.1.0 → 0.1.1
npm version minor     # 0.1.0 → 0.2.0
npm version major     # 0.1.0 → 1.0.0  ← use this when v1 ships

git push origin main --tags
```

`npm version` updates `package.json`, commits the change, and creates a git tag
automatically. Push with `--tags` to publish the tag to GitHub.
