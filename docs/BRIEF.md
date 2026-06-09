# Krashen — Project Brief

_Stable document: what this is, why it exists, who it's for, and hard constraints.
Update when the fundamentals change; not a changelog._

---

## What It Is

Krashen is a browser-based comprehensible input (CI) tool for language learners. It
generates graded reading content (stories, articles, dialogues) using an LLM, tracks
vocabulary across sessions, and uses that vocabulary to constrain future prompts —
implementing the i+1 technique: receive input slightly above your current level,
with known vocabulary reinforced and new words introduced in small, controlled doses.
The name references Stephen Krashen's input hypothesis.

## Who It's For

Currently a single personal user (the developer). Architecture anticipates optional
future public release without requiring a rewrite: all state is local, no accounts,
no server.

## The Core Loop

1. User selects an active profile (learner identity + vocab hint settings)
2. User configures a content request (topic, format, difficulty, linguistic focus)
3. Tool assembles an LLM prompt incorporating vocabulary constraints from the active
   profile's vocab store (i+1 block: known words, re-expose candidates, new-word cap)
4. LLM returns graded content
5. User reads the content; vocabulary from the piece is recorded (seenCount)
6. User can look up words via Define; lookups are saved to the vocab store (lookupCount)
7. Mastery levels update; the next generation reflects what the learner now knows

## Constraints (Hard)

- **Browser-only.** No backend server. Deployable to GitHub Pages as a static site.
- **User-supplied API key.** Stored in localStorage. Never transmitted anywhere except
  the chosen LLM provider.
- **No user accounts or server-side state.** All data is stored locally in the browser. Named profiles are local-only configurations, not authenticated identities.
- **No speech recognition.** Output (reading) only; speaking practice is out of scope.
- **Desktop primary.** Mobile is deferred but the architecture must not foreclose it.
  Layout and component boundaries are kept independent so a responsive layout can be
  layered on later without a rewrite.

## Technology

- Vanilla HTML/CSS/JavaScript. No framework. Keep the door open for a lightweight
  framework (Alpine.js, Preact) if complexity demands it.
- LLM: Claude API primary, OpenAI and Google Gemini as user-selectable alternatives.
  All three abstracted behind a single `generateContent()` interface.
- TTS: Removed from roadmap. See DECISIONS.md.
- Storage: localStorage only. Structured for future export/import.

## Permanently Out of Scope

- Speech recognition / speaking practice
- User accounts or server-side persistence
- Multi-user or shared content
- Sentence-level TTS read-along sync

## Deferred (architecture must not foreclose)

- Mobile layout
- Click-to-translate / inline word highlighting
- Inline vocabulary quizzing
- Anki deck export
- PWA / installable app
- Vocab normalization (lemmatization, conjugation merging)
- Topic-aware vocabulary filtering
