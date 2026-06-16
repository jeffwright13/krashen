# Krashen — Decision Log

_Append-only. One entry per meaningful architectural or design choice. Format: date, decision, rationale._

---

## 2026-06-16 — Settings popover converted to modal dialog (v5.2.5)
**Decision:** The Settings popover (`.display-popover-wrap` / `#display-popover`, an absolutely-positioned dropdown) is replaced with `#display-settings-modal`, a `<dialog>` opened via `showModal()` — the same interaction pattern as File and History. The backdrop is overridden to a flat 50% black tint with no blur: Pico sets `backdrop-filter` (and `-webkit-backdrop-filter`) via the `--pico-modal-overlay-backdrop-filter` custom property, so all three (the property, and both prefixed/unprefixed properties on `::backdrop`) had to be overridden to fully kill the blur. The dialog's `<article>` is constrained to `max-width: 340px` — narrower than File (540px) and History (560px) — sized to its actual content rather than inheriting Pico's 700px default, which only applies if no width is set on the article (setting `max-width` on the `<dialog>` element itself has no effect, since Pico forces `dialog { min-width: 100% }`). The header uses the same `display:flex; justify-content:space-between` rule as the other two modals so the Close button sits upper-right instead of stacking below the title. The checkbox label is also updated from "Define mode" to "Define highlighted text" for clarity.  
**Rationale:** Settings was the only toolbar button using a different interaction pattern (inline dropdown vs. centered modal) than File and History, which read as inconsistent. A modal with a near-transparent backdrop keeps the live-preview benefit (you can see theme/font-size changes take effect against the reading panel) while unifying the interaction model across all three toolbar buttons.

---

## 2026-06-15 — Fullscreen button reverted to toolbar; Settings font-size fix (v5.2.4)
**Decision:** The `⤢` fullscreen toggle is moved back into `#reading-toolbar`, right-aligned using `margin-left: auto`. The `position: absolute` overlay approach from v5.2.3 is abandoned. The `#display-settings-btn` selector is added explicitly to the `#reading-toolbar > button` font-size rule (the `>` direct-child selector previously excluded it because the button is nested inside `.display-popover-wrap`). `position: relative` is removed from `#reading-panel`.  
**Rationale:** The overlay at 30% opacity was effectively invisible — user could not locate the button during review. The toolbar placement is unambiguous. The Settings button was rendering at Pico's default font size (too large relative to File and History) due to the CSS selector gap; the explicit addition fixes the visual inconsistency.

---

## 2026-06-15 — File modal added; toolbar reduced to ⚙ / File / History (v5.2.3)
**Decision:** Load Text, Export .md, and Export .html are consolidated into a single **File** modal triggered by a `File` toolbar button. The modal has two sections separated by a rule: **Open** (the existing load-text form — title input, textarea, load-from-file, Display button) and **Save as** (Export .md and Export .html, disabled until a piece is loaded, replacing the previous hidden-until-loaded pattern). The `load-text-modal` dialog is removed; all its content moves into `file-modal` with IDs preserved. The fullscreen toggle (⤢) leaves the toolbar entirely and is repositioned as a `position: absolute` overlay in the top-right corner of `#reading-panel` (`position: relative` added), styled at 30% opacity with full opacity on hover — visible but unobtrusive. The reading toolbar is now three items: ⚙ · File · History. Dead CSS (`#define-btn[aria-pressed]`, `#font-size-select`) is removed.  
**Rationale:** Load Text and Export are two directions of the same file operation — they belong together. Moving the fullscreen button out of the toolbar removes a navigation control from a row meant for content tools, and the overlay pattern keeps it accessible without consuming toolbar space. Export buttons change from `hidden` to `disabled` because they now live inside a modal the user explicitly opens — hiding them there would make the Save as section appear broken.

## 2026-06-15 — Font size and Define moved into ⚙ Display popover (v5.2.2)
**Decision:** The `S / M / L` font-size select and the **Define** toggle button are removed from the reading toolbar. Font size moves into the ⚙ Display popover as a full-label select (Small / Medium / Large). Define mode moves into the same popover as a checkbox below a `<hr>` separator. The popover now owns all "how I'm reading right now" controls: theme, column width, font size, and define mode. The font-size class logic is extracted into `applyFontSizeClass()` in `display.js` for testability; `applyFontSize()` in `app.js` calls it and handles storage. `FONT_SIZES` constant removed (no longer needed). `.settings-fontsize-row` CSS added, sharing styles with the existing `.settings-theme-row`.  
**Rationale:** The toolbar had no organizing principle. Font size and Define are display/reading-mode preferences — they belong alongside the other display settings, not inline in the toolbar. Removing them reduces the toolbar from ~8 items to ~5, with Phase 3 planned to reduce it further to 3.

## 2026-06-15 — Select All / Copy buttons removed; scoped Ctrl-A added (v5.2.1)
**Decision:** The **Select All** and **Copy** toolbar buttons are removed. `#content-display` gains `tabindex="0"` so it receives focus on click. A document-level `keydown` handler intercepts Ctrl-A / Cmd-A and, when `#content-display` is the active element, calls `selectContentDisplay()` (extracted into `display.js`) instead of the default browser select-all. Ctrl-C works natively once the selection is scoped. The selection logic is exported and unit-tested in `display.test.js`.  
**Rationale:** The buttons existed solely to work around the browser's default Ctrl-A selecting the entire page rather than just the story. A scoped keyboard shortcut is the correct fix — it removes two buttons from an already-crowded toolbar without losing any capability. The shortcut activates only after the user clicks into the reading area, which is the natural context in which they would want to select story text.

## 2026-06-15 — HTML export added; Export .md button renamed (v5.2.0)
**Decision:** A second per-piece export button, **Export .html**, is added to the reading toolbar alongside the existing Markdown export (renamed from "Export ↓" to "Export .md" for clarity). The HTML file is self-contained: embedded CSS (Georgia serif, 70ch max-width, 1.7 line-height), a metadata bar (CEFR, dialect, word count, topic, date), and the story body rendered as HTML paragraphs. The markdown-to-HTML rendering helpers (`escapeHtml`, `inlineMarkdown`, `renderBlock`, `parseTitleBody`) are implemented directly in `export.js` rather than imported from `display.js`, keeping the modules independent. The `lang="es"` attribute is set on the exported document.  
**Rationale:** Markdown is useful for developers and Obsidian users, but sharing a story via email, iMessage, or a mobile reading app requires HTML or a format browsers can display natively. A self-contained `.html` file opens correctly on any device without a Markdown renderer. epub/PDF were considered and deferred — epub requires a zip-of-XML format with no browser-native API, and browser-generated PDF output is OS-dependent; HTML covers the mobile-sharing use case with zero extra dependencies.

## 2026-06-08 — Remove i+1 vocabulary hint system and mastery tracking (v5.1.0)
**Decision:** The entire i+1 vocabulary hint feature is removed: the `vocabHintsEnabled` profile setting, all hint configuration UI (`vocab-hint-*` elements), `getForPrompt()`, and the mastery tracking subsystem (`seenCount`, `recordSeen`, `deriveMastery`, the M0–M5 badge display, and `vocab-mastery-breakdown`). The `autosave` setting is retained and moved directly onto the Vocab tab. The `inactive` field (skip/resume) is retained. The vocab store, Define lookups, Anki export, and the `lookupCount`/`lastSeen` fields all remain.  
**Rationale:** The hint system added cognitive overhead (six tuneable parameters) for an effect that is unreliable by design — the LLM treats the hint list as a soft suggestion, not a constraint. Real-world usage showed the vocabulary hint block rarely influenced generated content noticeably, while the configuration UI created ongoing maintenance surface and confused new users. Mastery badges were only meaningful in the context of the hint system (thresholds, re-expose logic); without it they became orphaned metadata with no actionable use. A clean vocabulary list with lookup tracking, skip/resume, and Anki export covers the genuine use cases without the complexity.

## 2026-06-08 — Rename srsEnabled → vocabHintsEnabled; retire SRS terminology (v5.0.0)
**Decision:** The `srsEnabled` profile settings key is renamed to `vocabHintsEnabled`. All associated identifiers are renamed: HTML element IDs (`srs-*` → `vocab-hint-*`), CSS classes (`.srs-grid`, `.srs-subfield`), JS functions (`renderSrsFields` → `renderVocabHintFields`, `saveSrsFields` → `saveVocabHintFields`), and local variables (`srsSettings` → `hintSettings`). SPEC.md §1.5 renamed from "SRS Parameters" to "Vocab Hint Parameters". This is a breaking schema change — existing profiles with `srsEnabled: true` lose that preference on next load; the setting resets to off (the default).  
**Rationale:** The remaining feature is not SRS. Spaced Repetition requires scheduling control — the system decides when the learner sees each item. What Krashen does is inject a soft vocabulary hint into the LLM prompt; the LLM is not guaranteed to follow it, and the user controls content generation timing, not the system. Calling it SRS was a misnomer that implied a capability the tool doesn't have. `vocabHintsEnabled` accurately describes what the toggle does.

## 2026-06-08 — Tooltip-first help text; inline hint paragraphs removed (v4.1.1–4.1.3)
**Decision:** All supplementary help text (inline `<p>`, `<small>`, and hint paragraphs beneath form fields) is removed and replaced with `title` attributes on the associated control. Labels mirror the same `title` so hovering anywhere on a label+control row shows the tooltip. The `#provider-hint` dynamic element and `updateProviderHint()` are deleted; the CORS warning for Claude is now baked permanently into the provider select's `title`. The word-cap pairing explanation, i+1 description, and API key storage notice follow the same pattern.  
**Rationale:** Inline hint text consumed vertical space in an already-compact sidebar. `title` tooltips are zero-height, universally understood, and appropriate for a power-user configuration panel used on desktop. The approach is consistent across all three tabs and all dynamic vocab row elements.

## 2026-06-08 — Settings tab eliminated; two-tab layout (Configure | Vocab); accordion sections; API keys merged into Provider (v4.1.0)
**Decision:** The Settings tab is removed entirely. Its contents are redistributed: API keys and model overrides move into the Provider accordion section of the Configure tab (now merged with the provider select already there); theme and column width move to a ⚙ popover button in the reading toolbar. The Generate tab is renamed Configure. All four form sections (Provider, Content, Learner Profile, Linguistic Focus) become collapsible `<details>` accordion elements — only one open at a time, Provider open by default. The `vocabEnabled` checkbox moves from Settings → Features to the top of the Vocab tab, where it gates a `#vocab-features` div containing two accordion sections (Vocabulary and i+1 Hints). The Vocab tab is now always visible. The prompt debug panel becomes a permanent `<details>` collapse at the bottom of Configure with no localStorage toggle.  
**Rationale:** The Settings tab had become a catch-all with no coherent theme — API credentials, display preferences, and a feature flag lived there for no reason other than "not fitting elsewhere." Distributing its contents to contextually correct locations (credentials with provider config, display with reading controls) removes a tab, reduces navigation, and makes each setting findable by context rather than by knowing where it was put. Accordion sections replace flat fieldsets to recover vertical space while keeping all parameters accessible. The two-tab layout (Configure | Vocab) is the simplest structure that accommodates all use cases, including the ALG-mode where Vocab is hidden.

## 2026-06-08 — Review and Study modals removed; i+1 injection made opt-in; Anki export added (v4.0.0)
**Decision:** The post-story Review modal (per-word mastery rating) and the Study modal (active-recall flashcard session) are removed. The i+1 vocabulary hint injection (`srsEnabled`) is now off by default for new profiles, renamed from "Enable i+1 vocabulary constraints" to "Nudge the LLM with vocabulary context" with a clarifying note that the LLM is not guaranteed to follow the hints. Anki TSV export is added to the Vocab tab. A prompt debug panel (off by default) is added to Settings, showing the exact system and user prompts from the last generation.  
**Rationale:** Full SRS requires control over what the learner sees next — but Krashen's core premise is user-driven content generation. These are fundamentally at odds: we can hint the LLM but not guarantee re-exposure timing. The Review and Study modals were bolted-on SRS that couldn't deliver real spaced repetition and added UI complexity without proportionate benefit. Removing them sharpens the tool's identity: Krashen is a reading and vocabulary-collection tool; the learner handles review with Anki or whatever method they prefer. The rename of the i+1 toggle sets honest expectations. The prompt debug panel addresses a recurring question about which UI fields affect which LLM parameters.  
**Version:** 4.0.0 — removing shipped features is a breaking change by semver convention.

## 2026-06-05 — Vocab store normalised to lemma keys; surface forms tracked in entry.forms[]
**Decision:** `recordLookup` signature changes to `(lemma, surfaceForm, translation, context)`. The store key is the lemma (base/dictionary form, lowercase). Each entry gains a `forms: string[]` field recording every surface form encountered via Define. The Define prompt is updated to request `LEMMA: ...\nTRANSLATION: ...` format so the LLM provides the base form alongside the translation. `recordSeen` builds a reverse form→lemma index at runtime to credit seen counts when known inflected forms appear in generated stories. Unknown inflections are silently skipped (no per-word LLM call). Existing surface-form entries remain valid and are not migrated.  
**Rationale:** Spanish conjugations and plurals (hablo/hablas/hablé → hablar; gato/gatos → gato) produce duplicate vocab entries under the old key-by-surface-form scheme. Deduplication to a single lemma entry with a `forms` list gives accurate mastery tracking, a cleaner vocab list, and a record of which inflections the learner has encountered. LLM-supplied lemma is the cheapest normalization approach — no library, no extra API call, LLM already knows the base form. Accent handling is not needed: the Define workflow always uses LLM-generated (correctly accented) text; manual search does not yet exist.

## 2026-06-05 — Vocabulary features are opt-in, off by default for new profiles
**Decision:** A per-profile boolean `settings.vocabEnabled` (default `false`) gates the entire vocabulary subsystem. When `false`: the Vocab tab, Review/Study toolbar buttons, and "Save to vocab" in the Define popup are all hidden. Define remains available for occasional lookups. Existing profiles without the key default to `true` (backwards compat). Toggle lives in Settings → Features.  
**Rationale:** The ALG (Automatic Language Growth) community, including Dreaming Spanish, discourages explicit vocabulary study, flashcards, and word lists as counterproductive to acquisition. Exposing these features by default would generate controversy when presenting the tool to those communities. Hiding them by default makes Krashen safe to demo as a pure reading tool while keeping the full vocabulary workflow accessible to users who want it.

## 2026-06-05 — Tab layout consolidated from 4 tabs to 3; Tuning merged into Vocab; order fixed as Generate | Settings | Vocab
**Decision:** The four-tab layout (Generate / Vocab / Tuning / Settings) is replaced by three tabs: Generate, Settings, and Vocab. SRS / i+1 parameters move into the lower section of the Vocab tab. Tab order is fixed: Generate and Settings always appear together; Vocab appends to the right only when `vocabEnabled` is true. A small "Profile" label is added above the profile chip.  
**Rationale:** Tuning was a thin tab whose sole content (SRS parameters) is directly related to vocabulary tracking. Splitting them forced users to context-switch between two tabs to manage related concerns. Merging them into one Vocab tab gives each concern a permanent home without increasing cognitive overhead. Placing Generate and Settings adjacent — rather than separating them with hidden tabs — ensures the two always-visible tabs cluster naturally regardless of vocab state. The Profile label disambiguates the chip for first-time users who might not immediately recognise the name+words row as a profile selector.

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

## 2026-06-04 — userMastery field overrides algorithmic mastery derivation
**Decision:** Vocab entries gain an optional `userMastery` field (0–5). When set, it takes precedence over the algorithmically derived `mastery` field in `getForPrompt()` and all UI display. The algorithmic derivation (`deriveMastery` from `seenCount`/`lookupCount`) continues to run on `recordSeen` and `recordLookup` but only writes to `mastery`, never to `userMastery`. `userMastery` is only written by explicit user rating and persists until the user re-rates.  
**Rationale:** Passive tracking (seen/lookup counts) cannot reflect the user's actual knowledge — a word encountered once might be instantly known, or still unfamiliar after ten exposures. The user's explicit rating is the ground truth. Keeping both fields allows the algorithmic system to keep accumulating signal underneath, which means a future change to the mastery algorithm can re-derive from counts without discarding the user's rating history.

## 2026-06-04 — Post-story vocab review modal (Anki-style ratings)
**Decision:** After generating or loading a story, a "Review" button appears in the reading toolbar. It opens a modal listing every tracked vocab word that appeared in the story, sorted by effective mastery (lowest first). Each row shows term, translation (if recorded), mastery badge, and four rating buttons: Again (−1), Hard (±0), Good (+1), Easy (+2). Ratings write to `entry.userMastery`. The modal closes via Done or backdrop click. `refreshVocab` is called after each rating so the Vocab tab stays in sync.  
**Rationale:** The passive SRS loop (generate → read → track) needed an active feedback mechanism to close the loop, as in Anki. Post-story is the natural moment for review: the user has just read the words in context and can rate recall accurately. All-at-once list is preferred over one-at-a-time flashcard mode because the content is a story (user already saw the words) rather than a blind test.

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
