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

## 2026-05-31 — Tabbed left panel replaces Settings modal (v3.1 UI re-org)
**Decision:** The Settings modal is eliminated. The left panel becomes a four-tab layout (Generate / Vocab / Tuning / Settings). A persistent profile chip above the tabs always shows the active profile name and cumulative words-read counter; clicking it expands profile management.  
**Rationale:** The modal had become a dumping ground mixing API credentials, SRS parameters, vocab data, and display preferences. Tabs give each concern a permanent, labelled home. The profile chip solves the "which profile is active" problem without opening anything. Architecture selected after evaluating three candidate layouts (tabbed sidebar, icon rail, reading-first drawer); tabbed sidebar won on familiarity and minimal workflow disruption.

## 2026-05-31 — Save-on-change replaces the Save button
**Decision:** All settings fields (API keys, model names, SRS params, theme, column width) now save immediately on blur or change. The explicit Save button is removed.  
**Rationale:** All storage is localStorage — there is no network call, no failure mode, and no meaningful escape hatch. The Save button provided only the illusion of a two-phase commit. Theme already saved on change before this refactor; extending the same pattern to all fields is consistent and removes an unnecessary interaction step.

## 2026-05-31 — wordsRead stored on the profile object
**Decision:** `profile.wordsRead` is a cumulative integer on the profile object itself, incremented by `incrementWordsRead()` after each successful generation.  
**Rationale:** History entries are global (not per-profile), so accumulating from history at read time would require filtering by profile — which doesn't exist yet. Storing directly on the profile is simpler, backward-compatible (missing field defaults to 0), and doesn't depend on history scoping being resolved.

## 2026-05-31 — words-read is pure exposure; no level-to-words mapping
**Decision:** The words-read counter shows a raw cumulative total. No thresholds, no level labels, no "you're at B1" inference.  
**Rationale:** Level-to-words mappings are associated with commercial CI platforms (Dreaming Spanish etc.) and their specific content types. Reproducing them would create IP risk and false precision. The user interprets their own progress.

## 2026-05-31 — History entries stamped with active profile at generation time
**Decision:** Each history entry now includes `profileId` and `profileName` from the active profile at generation time (both `null` when no profile is active). The profile name is displayed in the History modal detail line. Existing entries without these fields continue to work — the fields are simply absent.  
**Rationale:** Establishes the data foundation for per-profile history filtering without requiring a schema migration or scoping decision now. The stamp is additive and backward-compatible. Full history scoping (filtering modal by profile, or per-profile storage) is deferred until the history UI gets its own redesign pass.

## 2026-05-31 — Profile import/export bundle schema and placement
**Decision:** Export bundle schema `krashen-profile-v1` contains: `schema`, `exportedAt`, `profile` (name, created, lastActive, wordsRead, settings, formDefaults — no id), and `vocab` (full store object). Profile id is excluded and regenerated on import. History is excluded — the existing library export covers that separately. Export/Import controls live in the profile chip panel (Export button active when a profile is selected; Import always available). Name collisions on import are resolved automatically by appending a numeric suffix. Imported profiles are not auto-activated.  
**Rationale:** Omitting the id prevents collisions; omitting history keeps the bundle focused on the learner configuration and vocabulary, not the content archive. The chip panel is the correct home since profile management already lives there.

## 2026-06-01 — CEFR level auto-pairs with word-frequency cap
**Decision:** Changing the CEFR level in the Generate tab automatically updates the vocabulary cap to its natural pairing (A0/A1→550, A2→1,000, B1→2,000, B2→3,000, C1→5,000, C2→7,500/unrestricted). The user can override the cap independently after selecting a level. A hint below the selector explains the pairing and when to deviate.  
**Rationale:** CEFR level and vocabulary cap are related but not identical axes — CEFR governs grammar and discourse complexity, the cap controls vocabulary breadth. Keeping both gives power users meaningful control: a lower cap with a higher CEFR level challenges grammar while keeping vocabulary familiar; a higher cap with a lower CEFR level exposes broader vocabulary at a comfortable grammar level. But leaving them independent with no coupling caused user confusion (selecting C2 while keeping top-1,000 words actively contradicts the intent). Smart defaults eliminate the most common misconfiguration while preserving the override.  
**Non-default combinations:**  
- *Higher CEFR + lower cap* (e.g. B2 grammar + top 1,000 words): grammatically complex with restricted vocabulary. Unusual; may suit learners whose grammar outpaces their reading exposure.  
- *Lower CEFR + higher cap* (e.g. A2 grammar + top 3,000 words): familiar grammar with broader vocabulary exposure. Good for building reading vocabulary without increasing structural difficulty.

## 2026-06-01 — Topic-aware re-expose: won't build automated version
**Decision:** No automated topic-tagging or domain-matching for the re-expose list. The per-word Skip/Resume controls (v3.3.0) are the intended workflow for topic management: suppress irrelevant words before generating, resume them when appropriate.  
**Rationale:** Automated topic-awareness would require a tagging UI, a schema change to the vocab store, and some mechanism to match the current topic field against entry tags (manual or LLM-assisted). That's significant scope without real usage data to validate the design. Skip/Resume is genuinely usable and avoids over-engineering a problem that may not manifest in practice.

## 2026-05-31 — Per-word vocab controls: delete and skip/resume
**Decision:** Each vocab entry in the Vocab tab gets a **Skip** button (hides from i+1 prompt constraints without deleting) and a **×** delete button (permanent removal, no confirm). Inactive entries are hidden from the list by default; a "Show hidden (N)" toggle reveals them with a Resume button. Individual deletes require no confirm — the word can be re-saved via Define. Only bulk "Clear vocab" keeps its confirm.  
**Rationale:** Delete handles cleanup (typos, unwanted saves). Skip/resume handles topic management: words from unrelated domains can be suppressed without losing mastery data. This is the manual workaround for topic-aware re-expose until that is designed. Hiding inactive by default keeps the list uncluttered; the toggle makes re-enabling discoverable without being prominent.

## 2026-05-31 — Per-profile vs. global settings boundary formalised
**Decision:** API keys, model overrides, and display preferences (theme, font size, column width) are **global** (`krashen_settings`). SRS parameters, autosave, vocab store, and **form defaults** are **per-profile**. Form defaults cover the six Learner Profile + Provider fields: `provider`, `cefrLevel`, `wordCap`, `targetLanguage`, `targetDialect`, `nativeLanguage`. Content and Linguistic Focus fields (topic, format, length, tense focus, etc.) are not persisted — they are ephemeral per-session choices. History remains global with per-entry profile stamps; filtering UI is deferred.  
**Rationale:** API keys and display preferences follow the device, not the learner. Provider selection travels with the profile because different profiles may prefer different providers. The Learner Profile fieldset fields define who the learner is and belong on the profile object. Topic and other content fields vary every session by design and carry no signal worth persisting.

## 2026-05-28 — gemini-2.0-flash briefly adopted then reverted to gemini-2.5-flash
**Decision:** During v2, the default Google model was temporarily changed to `gemini-2.0-flash` (v2.0.4) and then reverted to `gemini-2.5-flash` (v2.0.5).  
**Rationale:** Free-tier quota for `gemini-2.0-flash` is zero in some regions/accounts, producing an immediate hard error. `gemini-2.5-flash` has confirmed free-tier quota available and is kept as the default. If a user hits demand throttling on `gemini-2.5-flash`, `gemini-2.0-flash` remains a viable fallback in Settings.
