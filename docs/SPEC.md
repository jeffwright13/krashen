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

### 1.5 Vocab Parameters

| Parameter | Options / Format | Notes |
|---|---|---|
| Autosave lookups | Toggle (per profile) | When on, Define lookups are saved automatically; when off, a "Save to vocab" button appears |

---

## 2. Prompt Assembly

The app assembles configured parameters into a structured LLM prompt. This is the most important logic in v1.

- System prompt: establishes the LLM's role as a graded content generator, sets hard constraints (CEFR level, word cap, sentence length, grammar focus, dialect)
- User prompt: the content request (topic, format, length, specific includes/excludes)

### Prompt design notes
- CEFR level alone is fuzzy; pairing it with a common-word cap produces significantly more calibrated output
- Grammar focus should be explicit: "use X tense; avoid Y tense" outperforms vague level labels
- Connector density instruction improves readability and naturalness for CI purposes

---

## 3. Content Display

- Generated content renders in a clean reading view
- Font, line height, and contrast optimized for comfortable extended reading
- Content is selectable; `#content-display` carries `tabindex="0"` so clicking into the reading area focuses it. Ctrl-A / Cmd-A while the reading area is focused selects only the story text (not the whole page). Ctrl-C then copies the selection natively.
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
| Vocab | `vocabEnabled` checkbox at top; when enabled: word list, Anki export, autosave toggle, Clear vocab. |

Accordion behavior: only one section can be open at a time within each tab. The first section opens by default.

### 4.2 Profile chip (always visible)

Above the tab bar: a small "Profile" label, then the active profile name + cumulative words-read counter. Click to expand for profile management (switch / create / delete / export / import).

### 4.3 Provider and API credentials (Configure → Provider section)

The Provider accordion section contains: provider selector (`#provider`), API key (`#api-key`), model override (`#api-model`), and a Test button. Changing the provider select loads the stored key and model for that provider. Keys and models are stored globally in `krashen_settings` (not per-profile) and saved on blur.

### 4.4 Global display settings (toolbar ⚙ popover)

All reading-panel display controls live in a small popover triggered by the ⚙ button in the reading toolbar. The popover has two groups separated by a rule: appearance settings (theme, column width, font size) and reading mode (Define toggle).

| Setting | Storage | Notes |
|---|---|---|
| API keys | `krashen_settings.apiKeys` | Per provider; saved on blur |
| Model overrides | `krashen_settings.models` | Per provider; saved on blur |
| Theme | `krashen_settings.ui.theme` | Saved on change; applied immediately |
| Column width | `krashen_settings.ui.maxWidth` / `maxWidthValue` | Saved on change |
| Font size | `krashen_settings.ui.fontSize` | Select (Small / Medium / Large) in ⚙ popover; saved on change |
| Define mode | session only | Checkbox in ⚙ popover; resets to off on page load |

### 4.5 Vocabulary features toggle

`settings.vocabEnabled` (boolean, per-profile, default `false` for new profiles). Lives at the top of the Vocab tab. When `false`, the `#vocab-features` div is hidden — no word list, no Save to vocab. Define still works for occasional lookups. Existing profiles without the key default to `true`.

### 4.6 Prompt debug

A collapsible `<details>` element ("Last prompt sent to LLM") at the bottom of the Configure tab. Populated after every generation with the exact system and user prompts sent. No persistent toggle — collapsed by default, resets on reload.

### 4.7 Tooltips

Every form control (inputs, selects, checkboxes, buttons) carries a `title` attribute with a plain-language description. Labels mirror the same tooltip so hovering anywhere on a row shows help text. Inline hint paragraphs and `<small>` blocks are not used — all supplementary text lives in tooltips.

### 4.8 Export / import

**Reading panel:** The toolbar exposes two per-piece export buttons (visible only when a piece is loaded): **Export .md** downloads a Markdown file with YAML frontmatter (topic, CEFR, dialect, word count, date) and the story body; **Export .html** downloads a self-contained HTML file with embedded CSS, a metadata bar, and the story rendered as HTML — suitable for mobile reading, email sharing, or archiving.

**History modal:** Library export (JSON / Markdown) and import are available. Profile import/export lives in the profile chip panel.

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
| lookupCount | number | Incremented when the user explicitly uses Define |
| lastLookup | timestamp | |
| contexts | string[] | Up to 3 most recent surrounding paragraph texts |
| inactive | boolean \| undefined | When true, hidden from the default list view; shown only via "Show hidden" toggle |

**Lemma normalisation:** `recordLookup(lemma, surfaceForm, translation, context)` stores entries under the lemma key. The LLM returns the base form via the Define prompt (`LEMMA: ...` / `TRANSLATION: ...` format).

**Legacy entries** (pre-v3.13) keyed by surface form remain valid and display normally; they are not automatically migrated. Users can Clear vocab to start fresh with lemma-keyed entries.

### 6.2 Anki export

A **Export for Anki** button in the Vocab tab generates a tab-separated `.txt` file with one row per active entry: `term\ttranslation\tcontext`. Importable directly into Anki via File → Import. The file is named `krashen-{profile-slug}-anki.txt`.

---

## 7. Out of Scope (reference)

See BRIEF.md § Explicitly Out of Scope.
