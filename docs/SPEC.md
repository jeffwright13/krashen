# Krashen — Feature Spec

_Living document. Update as decisions are made. See DECISIONS.md for rationale on key choices._

---

## 1. Content Configuration (The Prompt Template)

The core of Krashen is a structured prompt template that a user fills out to specify the content they want. The tool assembles these parameters into an LLM system prompt + user prompt.

### 1.1 Learner Profile Parameters

| Parameter | Options / Format | Notes |
|---|---|---|
| CEFR level | A0, A1, A2, B1, B2, C1, C2 | Primary difficulty control; A0 is a Krashen extension for absolute beginners below A1 |
| Common word cap | 550 / 1000 / 2000 / 3000 / 5000 / 7500 | "Stick to the N most common Spanish words" |
| Target dialect | Mexican, Rioplatense, Castilian, Central American, Neutral | Affects vocabulary, voseo/tuteo, regional expressions |
| Native language | Text field (default: English) | Used to flag false cognates and interference patterns |
| Known strong areas | Text field (optional) | e.g. "food vocabulary already solid — don't over-scaffold" |

### 1.2 Linguistic Targeting Parameters

| Parameter | Options / Format | Notes |
|---|---|---|
| Tense/grammar focus | Checklist of tenses + free text | e.g. "include pretérito, imperfecto; avoid subjunctive" |
| Sentence length ceiling | Number (words) | e.g. max 15 words per sentence |
| Dialogue vs. prose ratio | Slider or select: all-prose / mostly-prose / mixed / mostly-dialogue / all-dialogue | Dialogue tends to be more accessible for CI |
| Connector density | Low / Normal / High | High: explicitly request pero, así que, sin embargo, etc. |
| Specific words/phrases to include | Text field (comma-separated) | LLM instructed to weave these in naturally |
| Specific words/phrases to exclude | Text field (comma-separated) | |

### 1.3 Content Parameters

| Parameter | Options / Format | Notes |
|---|---|---|
| Fiction / nonfiction | Select | |
| General area | Science/math, Technology, History, Culture, Arts/Music, Nature, Daily life, Other | |
| Topic | Free text | e.g. "a dog and a boy exploring a forest" |
| Output length | Free-text number field (default 700); accepts any value 50–3000 | |
| Narrative person | 1st / 2nd / 3rd | 2nd person (tú) can feel more immersive |
| Output format | Single story, Dialogue only, Q&A, Crosstalk script | See format descriptions below |

#### Output format descriptions

| Format | Description |
|---|---|
| **Single story** | Continuous prose narrative (default). Third or first person. Best for reading flow and immersion. |
| **Article** | Expository, informational prose — no narrative characters or story arc. Educational register. Best for nonfiction topics ("All about big cats", "How volcanoes work"). Narrative person is not applied. |
| **Dialogue only** | A conversation between two or more characters, no narrative prose. Good for learning natural speech patterns and turn-taking. |
| **Q&A** | Question-and-answer pairs, like an interview or FAQ. Useful for practicing interrogative structures and short-answer comprehension. |
| **Crosstalk script** | A labelled two-speaker script (Speaker A / Speaker B), formatted like a play or screenplay. Designed to be read aloud by two people together. |

### 1.4 TTS-Specific Parameters _(removed from roadmap — see DECISIONS.md)_

TTS was scaffolded in v1 and planned for v2 but has been dropped. AI-generated speech
is a poor substitute for native-speaker CI audio, and the implementation complexity is
not justified by the value added. The parameters below are retained here for reference
only; they are not exposed in the UI and will not be implemented.

| Parameter | Options / Format | Notes |
|---|---|---|
| Voice | Nova / Shimmer / Onyx/ etc.| Choice is TTS-engine-specific |
| Desired pace | Slow / Natural / Fast | Passed to TTS provider; also affects prompt (slow = shorter sentences) |
| Pause marking | On/Off | When on, prompt instructs LLM to use punctuation to mark natural pauses |
| Avoid TTS-tricky words | On/Off | Prompt instructs LLM to avoid words TTS engines commonly mispronounce |

### 1.5 Vocab Hint Parameters

| Parameter | Options / Format | Notes |
|---|---|---|
| Vocab hints enabled (`vocabHintsEnabled`) | Toggle (per profile) | When off, vocab is still tracked but no i+1 block is injected into the prompt |
| Autosave lookups | Toggle (per profile) | When on, Define lookups are saved automatically; when off, a "Save to vocab" button appears |
| Known word threshold | Select 1–4 (default 2) | Mastery level at which a word is considered known and fed to the "use naturally" list |
| New words per session | Select 3/5/8/10 (default 5) | Cap on new vocabulary the LLM is asked to introduce |
| Re-expose count | Select 5/8/12 (default 8) | How many still-acquiring words to include in the re-expose list |
| Re-expose max mastery | Select 1–4 (default 3) | Upper mastery bound for the re-expose list |

---

## 2. Prompt Assembly

The app assembles configured parameters into a structured LLM prompt. This is the most important logic in v1.

- System prompt: establishes the LLM's role as a graded content generator, sets hard constraints (CEFR level, word cap, sentence length, grammar focus, dialect)
- User prompt: the content request (topic, format, length, specific includes/excludes)
- Parameters not yet active (TTS, SRS) should still be architecturally wired — just not exposed in the UI until ready

### Prompt design notes
- CEFR level alone is fuzzy; pairing it with a common-word cap produces significantly more calibrated output
- Grammar focus should be explicit: "use X tense; avoid Y tense" outperforms vague level labels
- Connector density instruction improves readability and naturalness for CI purposes

---

## 3. Content Display

- Generated content renders in a clean reading view
- Font, line height, and contrast optimized for comfortable extended reading
- Content should be selectable (to support future click-to-translate without a rewrite)
- Paragraph structure preserved from LLM output
- Metadata shown: CEFR level, approximate word count, topic, date generated
- LLM response opens with a `## Title` line; rendered as a heading above the body
- Font size control: Small / Medium / Large applied to the reading panel
- Fullscreen mode: collapses the config panel to give full viewport to reading; Esc to restore
- Column width: user-configurable max-width (default 70 ch); can be disabled for full-width layout

---

## 4. Settings & Persistence

All settings save on change — there is no Save button.

### 4.1 Tab layout

Two tabs, both always visible: **Configure** and **Vocab**.

| Tab | Contents |
|---|---|
| Configure | Four collapsible accordion sections: Provider (+ API key/model), Content, Learner Profile, Linguistic Focus. Prompt debug `<details>` at bottom. |
| Vocab | `vocabEnabled` checkbox at top; when enabled, two collapsible sections: Vocabulary (word list, Anki export) and i+1 Vocabulary Hints (vocab hint parameters). |

Accordion behavior: only one section can be open at a time within each tab. The first section opens by default.

### 4.2 Profile chip (always visible)

Above the tab bar: a small "Profile" label, then the active profile name + cumulative words-read counter. Click to expand for profile management (switch / create / delete / export / import).

### 4.3 Provider and API credentials (Configure → Provider section)

The Provider accordion section contains: provider selector (`#provider`), API key (`#api-key`), model override (`#api-model`), and a Test button. Changing the provider select loads the stored key and model for that provider. Keys and models are stored globally in `krashen_settings` (not per-profile) and saved on blur.

### 4.4 Global display settings (toolbar ⚙ popover)

Theme and column width live in a small popover triggered by the ⚙ button in the reading toolbar.

| Setting | Storage | Notes |
|---|---|---|
| API keys | `krashen_settings.apiKeys` | Per provider; saved on blur |
| Model overrides | `krashen_settings.models` | Per provider; saved on blur |
| Theme | `krashen_settings.ui.theme` | Saved on change; applied immediately |
| Column width | `krashen_settings.ui.maxWidth` / `maxWidthValue` | Saved on change |
| Font size | `krashen_settings.ui.fontSize` | Controlled from reading toolbar font-size select |

### 4.5 Vocabulary features toggle

`settings.vocabEnabled` (boolean, per-profile, default `false` for new profiles). Lives at the top of the Vocab tab. When `false`, the `#vocab-features` div is hidden — no word list, no i+1 hints, no Save to vocab. Define still works for occasional lookups. Existing profiles without the key default to `true`.

### 4.6 i+1 vocabulary hint settings (Vocab → i+1 Vocabulary Hints section)

When `vocabHintsEnabled` is true (off by default), `buildSystemPrompt()` appends a soft hint block: known terms (mastery ≥ threshold), emerging terms (low mastery, most recently seen), and a new-words ceiling. Parameters saved immediately via `KrashenProfiles.updateSettings()`.

### 4.7 Prompt debug

A collapsible `<details>` element ("Last prompt sent to LLM") at the bottom of the Configure tab. Populated after every generation with the exact system and user prompts sent. No persistent toggle — collapsed by default, resets on reload.

### 4.8 Tooltips

Every form control (inputs, selects, checkboxes, buttons) carries a `title` attribute with a plain-language description. Labels mirror the same tooltip so hovering anywhere on a row shows help text. Inline hint paragraphs and `<small>` blocks are not used — all supplementary text lives in tooltips.

### 4.9 Export / import

History export (JSON / Markdown) and import are available from the History modal. Profile import/export lives in the profile chip panel.

---

## 5. TTS Playback _(removed from roadmap)_

TTS was scaffolded in v1 and planned for v2 but has been dropped from the roadmap.
See DECISIONS.md for rationale. The `tts.js` stub remains in the codebase but is
inactive and not wired to any UI.

---

## 6. Vocabulary Tracking

Implemented in v3. Each profile maintains an independent vocabulary store in localStorage (`krashen_{profileId}_vocab`).

### 6.1 Data model (per term)

| Field | Type | Notes |
|---|---|---|
| term | string | **Lemma** (base/dictionary form), lowercased. Store key. |
| forms | string[] | Surface forms encountered via Define (e.g. `["hablé","hablas"]`). Shown in Vocab tab when >1. |
| translations | string[] | Captures variation across lookups |
| firstSeen / lastSeen | timestamp | |
| seenCount | number | Incremented when the word (or a known surface form) appears in generated content |
| lookupCount | number | Incremented when the user explicitly uses Define |
| lastLookup | timestamp | |
| contexts | string[] | Up to 3 most recent surrounding paragraph texts |
| mastery | 0–5 | Algorithmically derived and cached on every write (see below) |
| userMastery | 0–5 \| undefined | Explicitly set by user rating; overrides `mastery` in all vocab hint logic when present |
| inactive | boolean \| undefined | When true, excluded from i+1 prompt constraints; shown in Vocab tab only via "Show hidden" |

**Lemma normalisation:** `recordLookup(lemma, surfaceForm, translation, context)` stores entries under the lemma key. The LLM returns the base form via the Define prompt (`LEMMA: ...` / `TRANSLATION: ...` format). `recordSeen` builds a reverse form→lemma index at runtime so seen counts credit the lemma entry when a known surface form appears in a story. Unknown inflections (not previously looked up) are silently skipped — a known limitation of not running per-word LLM calls post-generation.

**Legacy entries** (pre-v3.13) keyed by surface form remain valid and display normally; they are not automatically migrated. Users can Clear vocab to start fresh with lemma-keyed entries.

### 6.2 Mastery levels

Each vocab entry displays a badge **M0–M5** ("M" for Mastery). The level is derived algorithmically from exposure counts and updated on every write. Levels are evaluated highest-first; M4 and M5 take precedence when conditions overlap.

| Badge | Meaning | Condition |
|---|---|---|
| M0 | Never encountered | No seen or lookup events |
| M1 | Seen in passing | seenCount > 0, lookupCount = 0 |
| M2 | Looked up once | lookupCount = 1 |
| M3 | Looked up repeatedly | lookupCount ≥ 2 |
| M4 | Solidifying | lookupCount ≥ 1 and seenCount > lookupCount (re-encountered naturally after looking up) |
| M5 | Passively acquired | seenCount ≥ 3 and lookupCount = 0 (absorbed through reading alone, never needed to look up) |

**Effective mastery:** `getForPrompt` and Vocab tab display use `entry.userMastery ?? entry.mastery`. The algorithmic `mastery` field continues to update from counts but never overwrites a stored `userMastery`. Note: `userMastery` can only be set programmatically; the Review and Study modals were removed in v4.0 (see DECISIONS.md).

### 6.3 i+1 prompt integration (optional)

When `vocabHintsEnabled` is true for the active profile (off by default), `buildSystemPrompt()` injects a soft hint block: known terms (mastery ≥ threshold, capped at 50), re-expose terms (1 ≤ mastery ≤ maxMastery, most recently seen first, capped at reExposeCount), and a new-words-per-session ceiling. The LLM may not follow these hints exactly.

### 6.4 Anki export

A **Export for Anki** button in the Vocab tab generates a tab-separated `.txt` file with one row per active entry: `term\ttranslation\tcontext`. Importable directly into Anki via File → Import. The file is named `krashen-{profile-slug}-anki.txt`.

---

## 7. Out of Scope (reference)

See BRIEF.md § Explicitly Out of Scope.
