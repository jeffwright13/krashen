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
