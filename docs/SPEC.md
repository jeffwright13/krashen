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

### 1.5 Progression / SRS Parameters

| Parameter | Options / Format | Notes |
|---|---|---|
| SRS enabled | Toggle (per profile) | When off, vocab is still tracked but no i+1 block is injected into the prompt |
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

All settings are accessed through the tabbed left panel (no separate modal). All fields save on change — there is no Save button.

### 4.1 Tab layout

| Tab | Contents |
|---|---|
| Generate | Provider selector; content and linguistic focus parameters |
| Vocab | Per-profile vocabulary list with mastery breakdown; Clear vocab |
| Tuning | Per-profile SRS / i+1 parameters |
| Settings | API keys and model overrides (per provider); theme; column width |

### 4.2 Profile chip (always visible)

Above the tab bar: active profile name + cumulative words-read counter. Click to expand for profile management (switch / create / delete).

### 4.3 Per-profile settings (Tuning tab)

Saved immediately on change via `KrashenProfiles.updateSettings()`. See SPEC §1.5 for the full parameter list.

### 4.4 Global settings (Settings tab)

| Setting | Storage | Notes |
|---|---|---|
| API keys | `krashen_settings.apiKeys` | Saved on blur |
| Model overrides | `krashen_settings.models` | Saved on blur |
| Theme | `krashen_settings.ui.theme` | Saved on change; applied immediately |
| Column width | `krashen_settings.ui.maxWidth` / `maxWidthValue` | Saved on change |
| Font size | `krashen_settings.ui.fontSize` | Controlled from reading toolbar |

### 4.5 Export / import

History export (JSON / Markdown) and import are available from the History modal. Profile import/export is deferred — see PLAN.md §v3.1.

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
| term | string | Lowercased, trimmed |
| translations | string[] | Captures variation across lookups |
| firstSeen / lastSeen | timestamp | |
| seenCount | number | Incremented when the word appears in generated content |
| lookupCount | number | Incremented when the user explicitly uses Define |
| lastLookup | timestamp | |
| contexts | string[] | Up to 3 most recent surrounding paragraph texts |
| mastery | 0–5 | Derived and cached on every write (see below) |

### 6.2 Mastery levels

| Level | Condition |
|---|---|
| 0 | Never seen |
| 1 | seenCount > 0, lookupCount = 0 |
| 2 | lookupCount = 1 |
| 3 | lookupCount ≥ 2 |
| 4 | lookupCount ≥ 1 and seenCount > lookupCount (re-encountered naturally after looking up) |
| 5 | seenCount ≥ 3 and lookupCount = 0 (acquired through reading alone) |

Levels are evaluated highest-first; level 4 and 5 take precedence over lower levels when conditions overlap.

### 6.3 i+1 prompt integration

When SRS is enabled for the active profile, `buildSystemPrompt()` injects a vocabulary constraints block containing: known terms (mastery ≥ threshold, capped at 50), re-expose terms (mastery 1–maxMastery, most recently seen first, capped at reExposeCount), and a new-words-per-session ceiling.

### 6.4 Future work

- Lemmatization: plurals and conjugations currently stored as separate entries (see project notes)
- Topic-aware re-expose: words from unrelated domains should be excludable per generation
- Per-word delete / per-generation deactivation
- Profile import/export

---

## 7. Out of Scope (reference)

See BRIEF.md § Explicitly Out of Scope.
