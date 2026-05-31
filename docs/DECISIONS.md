# Krashen — Decision Log

_Append-only. One entry per meaningful architectural or design choice. Format: date, decision, rationale._

---

## 2026-05-26 — Browser-only, no backend
**Decision:** Static site only, deployable to GitHub Pages. No server-side component.  
**Rationale:** Keeps hosting free and simple. User-supplied API keys mean no auth layer needed. Aligns with prior projects (apg-web, HablaBot).

## 2026-05-26 — User-supplied API key, localStorage only
**Decision:** API keys entered by user, stored in localStorage, never sent anywhere except the chosen LLM/TTS provider.  
**Rationale:** Enables public deployment without exposing a shared API key. Consistent with HablaBot security model.

## 2026-05-26 — Claude API primary LLM, OpenAI secondary
**Decision:** Default to Claude for content generation; support OpenAI as switchable alternative.  
**Rationale:** Claude produces high-quality graded content. OpenAI familiarity provides fallback. Provider should be abstracted so switching doesn't require deep changes.

## 2026-05-26 — TTS scaffolded but not implemented in v1
**Decision:** TTS parameters included in prompt template data model and UI placeholders added, but playback not implemented until v2.  
**Rationale:** Avoids blocking v1 on TTS integration complexity while ensuring the architecture doesn't need to be retrofitted later.

## 2026-05-26 — Vocabulary tracking deferred, data model defined early
**Decision:** No vocabulary tracking UI in v1, but the data model (seen-words list, session metadata) defined before v1 ships.  
**Rationale:** i+1 prompt constraint, Anki export, and progress tracking are all high-value features. Defining the data model early prevents localStorage schema conflicts later.

## 2026-05-26 — Click-to-translate deferred, content must remain selectable
**Decision:** Click-to-translate not implemented in v1. Content text must remain DOM-selectable (no canvas rendering, no disabling of selection).  
**Rationale:** Retrofitting click-to-translate onto non-selectable text would require a rewrite of the display layer.

## 2026-05-26 — CEFR level paired with common-word cap for difficulty
**Decision:** Difficulty is expressed as both a CEFR label AND a common-word-count cap (e.g. A2 + top 1000 words). Both are passed to the LLM prompt.  
**Rationale:** CEFR level alone produces inconsistent output. Pairing with a word frequency constraint significantly improves calibration of generated content.

## 2026-05-26 — Vanilla JS for v1, framework door left open
**Decision:** No JS framework in v1. Plain HTML/CSS/JS.  
**Rationale:** Keeps the project lightweight and dependency-free. If complexity grows (state management, component reuse), a lightweight framework (e.g. Alpine.js or Preact) can be introduced without a full rewrite if the JS is kept modular.

## 2026-05-26 — Three LLM providers: Claude (primary), OpenAI (secondary), Google Gemini (tertiary)
**Decision:** Support Claude, OpenAI, and Google Gemini as user-selectable LLM providers. Claude is the default. All three are abstracted behind the same `generateContent()` interface in `llm.js`.  
**Rationale:** Existing userbase already expects Google Gemini support. Abstracting providers behind a single interface means adding a fourth provider later requires only a new internal handler, not changes to callers.

## 2026-05-26 — storage.js defaults are deep-copied on every read
**Decision:** `getSettings()` reconstructs a fresh object via recursive `deepMerge` rather than spreading `DEFAULT_SETTINGS`. No caller ever receives a reference into the module-level default.  
**Rationale:** A shallow spread caused `setApiKey()` to mutate `DEFAULT_SETTINGS.apiKeys` directly, so stored values persisted across test runs even after `localStorage.clear()`. Deep-copying on read eliminates the shared-reference hazard. Any future change to `getSettings()` must preserve this invariant or the bug silently returns.

## 2026-05-26 — LLM model constants pinned in llm.js; expected to be updated each version
**Decision:** `llm.js` hardcodes `claude-opus-4-5`, `gpt-4o`, and `gemini-2.0-flash` as module-level constants.  
**Rationale:** Pinning prevents silent drift to unknown model behaviour on provider-side changes. The constants are intentionally visible at the top of the file so they are easy to update. Review and bump these with each meaningful version of Krashen, or when a provider deprecates the pinned model.

## 2026-05-27 — Google model updated from gemini-1.5-pro to gemini-2.0-flash
**Decision:** Bumped `GOOGLE_MODEL` to `gemini-2.0-flash` in v1.0.2.  
**Rationale:** `gemini-1.5-pro` was deprecated and removed from the v1beta API, causing a model-not-found error at runtime. `gemini-2.0-flash` is the current stable replacement.

## 2026-05-27 — Google model updated from gemini-2.0-flash to gemini-2.5-flash
**Decision:** Bumped `GOOGLE_MODEL` to `gemini-2.5-flash` in v1.0.5.  
**Rationale:** `gemini-2.0-flash` became unavailable to new users. `gemini-2.5-flash` is Google's current recommended model.

## 2026-05-28 — TTS removed from roadmap entirely
**Decision:** TTS has been removed from the v2 scope and from the long-term roadmap. The scaffolded `tts.js` stub and related SPEC entries remain in place but are inactive.  
**Rationale:** AI-generated TTS is a poor substitute for native-speaker comprehensible-input audio (Dreaming Spanish, Pimsleur, etc. do this better). Implementation complexity is high, provider fragmentation is a maintenance burden, and the core value of Krashen is in graded *reading* material. Adding TTS would widen scope without deepening the niche.

## 2026-05-28 — Generated content opens with a ## title line
**Decision:** The LLM is instructed to begin every response with a title in the format `## Title Here`. `display.js` extracts this line, renders it as `<h1 class="content-title">`, and the rest of the content is rendered as body paragraphs. The title is also stored on the history entry.  
**Rationale:** Untitled content is hard to navigate in the History modal. A structured prefix is more reliable than asking the LLM to embed a title somewhere in the prose.

## 2026-05-28 — Column width is user-configurable, not hardcoded
**Decision:** `--content-max-width` is a CSS custom property set at runtime from `settings.ui.maxWidth` / `settings.ui.maxWidthValue`. Default is 70 ch, but the user can change or disable it in Settings.  
**Rationale:** The right comfortable reading width varies by screen size, font, and user preference. A hardcoded `70ch` was correct for one user's monitor and wrong for others.

## 2026-05-30 — Storage adapter pattern for profiles.js and vocab.js
**Decision:** Both modules are written as factory functions that accept a storage adapter (`{getItem, setItem, removeItem}`) rather than directly calling `localStorage`. The browser auto-initialises with `localStorage`; tests pass an in-memory mock.  
**Rationale:** Testability in Node (no DOM, no localStorage). Also makes future export/import of profile data straightforward — swap the adapter without touching module logic.

## 2026-05-30 — profiles.js and vocab.js as ES modules with a browser side-effect
**Decision:** Both files use `export default` (proper ESM). They set `window.KrashenProfiles` / `window.KrashenVocab` as a module-load side effect, guarded by `typeof window !== 'undefined'`. Loaded in the browser as `<script type="module">`.  
**Rationale:** The project root has `"type": "module"`, so Node 22 treats all .js files as ESM. UMD-style IIFE wrappers fail because `typeof module` is undefined in ESM context. Pure ES modules loaded as `<script type="module">` work cleanly in the browser and are importable via Node 22's `require(esm)` compatibility layer in tests (accessed as `.default`).

## 2026-05-30 — CJS test runner co-existing with Vitest
**Decision:** `tests/package.json` sets `"type": "commonjs"` so the Node test runner and its test files can use `require()`. `vitest.config.js` excludes `profiles.test.js` and `vocab.test.js` so Vitest doesn't try to run them.  
**Rationale:** The new modules are not testable under Vitest without a full jsdom setup. A minimal Node-only runner with no npm deps is faster and sufficient for pure-logic modules.

## 2026-05-30 — Autosave vs. popup-save in Define flow
**Decision:** The Define popup shows a "Save to vocab" button by default. If the active profile has `settings.autosave === true`, the entry is saved immediately after the translation arrives and a toast confirms it.  
**Rationale:** Most lookups are exploratory (hover-and-check), not all of them are worth saving. Making save opt-in per lookup reduces noise in the vocab store. Users who prefer automatic tracking can enable autosave per profile.

## 2026-05-30 — Word extraction for recordSeen()
**Decision:** Words are extracted from generated content by lowercasing the full text, replacing Spanish punctuation characters (`¡!¿?.,;:«»"'()-—`) with spaces, splitting on whitespace, filtering empty strings, and deduplicating with a Set.  
**Rationale:** Simple and sufficient for Spanish. Avoids treating punctuation-attached tokens (e.g. "hola,") as separate from their base form. No stemming or lemmatisation — the vocab store uses exact lowercase terms to match what the user sees and looks up.

## 2026-05-30 — SRS algorithm is toggleable per profile
**Decision:** Each profile has a `settings.srsEnabled` boolean (default `true`). When false, `handleGenerate()` passes `null` for `vocabContext`, so no i+1 block is injected into the prompt. Vocab tracking (recordSeen, recordLookup) still functions regardless.  
**Rationale:** Some users may want vocabulary tracking for their own reference without constraining the LLM prompt. Separating "track vocab" from "use vocab in prompts" gives finer control without adding a second tracking toggle.

## 2026-05-30 — Mastery level 3 upper bound dropped
**Decision:** The mastery derivation uses `lookupCount >= 2` for level 3 rather than the spec's `lookupCount >= 2 && lookupCount <= 3`.  
**Rationale:** The edge case where `lookupCount > 3` and `seenCount <= lookupCount` would fall through to level 0 with a strict upper bound, which is wrong (heavily studied words should not appear untracked). Level 3 ("still reinforcing") is the correct floor for any heavily-looked-up word that hasn't been re-encountered naturally.

## 2026-05-28 — gemini-2.0-flash briefly adopted then reverted to gemini-2.5-flash
**Decision:** During v2, the default Google model was temporarily changed to `gemini-2.0-flash` (v2.0.4) and then reverted to `gemini-2.5-flash` (v2.0.5).  
**Rationale:** Free-tier quota for `gemini-2.0-flash` is zero in some regions/accounts, producing an immediate hard error. `gemini-2.5-flash` has confirmed free-tier quota available and is kept as the default. If a user hits demand throttling on `gemini-2.5-flash`, `gemini-2.0-flash` remains a viable fallback in Settings.
