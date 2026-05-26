# Krashen — Project Brief

## What It Is

Krashen is a browser-based comprehensible input (CI) tool, initially implemented for Spanish. It generates graded reading content (stories, articles, dialogues) using an LLM, displays it for reading practice, and will support TTS playback for listening practice. The name references Stephen Krashen's input hypothesis (i+1): acquire language by receiving input slightly above your current level.

## Who It's For

Initially: a single personal user (the developer). Architecture should anticipate optional future public release without requiring a rewrite.

## The Core Loop

1. User configures a content request (topic, difficulty, length, linguistic parameters)
2. Tool generates a structured LLM prompt from those parameters
3. LLM returns graded Spanish content
4. User reads the content in the browser
5. (Future) User listens to a TTS-generated audio version
6. (Future) Vocabulary and progress data are tracked across sessions

## Constraints (Hard)

- **Browser-only.** No backend server. Deployable to GitHub Pages as a static site.
- **User-supplied API key.** Stored in localStorage. Never transmitted to any server other than the chosen LLM/TTS provider.
- **No user accounts.** All state is local to the browser.
- **No speech recognition.** Output (reading/listening) only; speaking practice is out of scope.
- **No mobile-native app.** Desktop browser primary target. PWA support is a possible later addition, not a v1 concern.

## Technology

- Vanilla HTML/CSS/JavaScript (no framework required for v1; keep the door open for a lightweight framework later if complexity demands it)
- LLM: Claude API primary, OpenAI API as secondary/switchable
- TTS: OpenAI TTS primary (architecture must not assume a specific provider)
- Storage: localStorage for settings/preferences; structured for future export/import

## Explicitly Out of Scope (v1)

- Speech recognition / speaking practice
- User accounts or server-side persistence
- Click-to-translate (architecture should not preclude it; implementation deferred)
- Inline vocabulary quizzing (same — defer, don't foreclose)
- Anki deck export (defer)
- PWA / installable app
- Sentence-level TTS highlighting / read-along sync (defer)
- Multi-user or shared content

## Success Criteria (v1)

A user can open the tool in a browser, configure a content request, generate a graded story or article, and read it. The experience is clean, fast, and produces noticeably better-calibrated content than a raw LLM prompt.
