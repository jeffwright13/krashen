# Krashen — Feature Spec

_Living document. Update as decisions are made. See DECISIONS.md for rationale on key choices._

---

## 1. Content Configuration (The Prompt Template)

The core of Krashen is a structured prompt template that a user fills out to specify the content they want. The tool assembles these parameters into an LLM system prompt + user prompt.

### 1.1 Learner Profile Parameters

| Parameter | Options / Format | Notes |
|---|---|---|
| CEFR level | A1, A2, B1, B2, C1, C2 | Primary difficulty control |
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
| Output length | Number (words) or select: Short ~300 / Medium ~700 / Long ~1200 / Custom | |
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

### 1.4 TTS-Specific Parameters _(scaffolded now, activated later)_

| Parameter | Options / Format | Notes |
|---|---|---|
| Voice | Nova / Shimmer / Onyx/ etc.| Choice is TTS-engine-specific (see apg-weband hablabot for ideas) |
| Desired pace | Slow / Natural / Fast | Passed to TTS provider; also affects prompt (slow = shorter sentences) |
| Pause marking | On/Off | When on, prompt instructs LLM to use punctuation to mark natural pauses |
| Avoid TTS-tricky words | On/Off | Prompt instructs LLM to avoid words TTS engines commonly mispronounce |

### 1.5 Progression / SRS Parameters _(scaffolded now, activated later)_

| Parameter | Options / Format | Notes |
|---|---|---|
| Session number | Auto-tracked integer | Content can drift slightly harder over time |
| Re-expose words | Text field (comma-separated) | Words from prior sessions to weave in again |
| Words seen (vocab list) | Managed by app | Used for i+1 constraint: "use these known words; introduce ≤5 new ones" |

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

---

## 4. Settings & Persistence

- API key entry (LLM provider, TTS provider) — stored in localStorage, never logged
- Default learner profile (pre-fills the configuration form)
- UI preferences (font size, theme)
- Export/import of settings and generated content — architecture should support this from the start even if UI is deferred

---

## 5. TTS Playback _(scaffolded in v1, implemented later)_

- "Listen" button present but disabled in v1, or hidden behind a feature flag
- When implemented: calls TTS provider with generated text, plays audio inline
- Architecture: TTS provider abstracted behind an interface so OpenAI TTS, ElevenLabs, or Web Speech API can be swapped
- Future: sentence-level highlighting / read-along sync

---

## 6. Vocabulary Tracking _(deferred, architecture only)_

- Each generated piece potentially feeds a seen-words list stored in localStorage
- Future uses: i+1 prompt constraint, Anki export, inline quiz, progress dashboard
- Data model should be defined before v1 ships, even if the UI isn't built yet

---

## 7. Out of Scope (reference)

See BRIEF.md § Explicitly Out of Scope.
