// Reformats a generated piece into apg-web's phrase file format
// (`phrase; duration_in_seconds`, `*` for a silence-only line — see
// apg-web/README.md "Phrase File Format") for reading-while-listening
// reinforcement in that separate tool. Produces plain narratable text only;
// no audio/TTS code or provider dependency lives here (see BRIEF.md
// Constraints and SPEC.md §5.1).

// entry.content is stored as lightweight markdown (see SPEC.md §3), so it has
// to be stripped back to plain sentences before being handed to a TTS reader.

// Pause durations (seconds) per CEFR level, from the candidate values in
// SPEC.md §5.1 — explicitly unturned placeholders, not derived from a
// formula. A0 mirrors A1, matching the existing A0/A1 word-cap pairing
// (DECISIONS.md 2026-06-01). Retune by ear against real samples; this is the
// one place those numbers live.
const PAUSE_TIMING_BY_LEVEL = {
  A0: { leadIn: 1.5, sentence: 0.8,  paragraph: 1.5 },
  A1: { leadIn: 1.5, sentence: 0.8,  paragraph: 1.5 },
  A2: { leadIn: 1.2, sentence: 0.6,  paragraph: 1.2 },
  B1: { leadIn: 1.0, sentence: 0.45, paragraph: 1.0 },
  B2: { leadIn: 0.8, sentence: 0.35, paragraph: 0.85 },
  C1: { leadIn: 0.6, sentence: 0.25, paragraph: 0.7 },
  C2: { leadIn: 0.5, sentence: 0.15, paragraph: 0.5 },
};

const DEFAULT_PAUSE_TIMING = PAUSE_TIMING_BY_LEVEL.A2;

function stripInlineMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1');
}

// Splits on whitespace immediately following [.!?]. Doesn't special-case
// abbreviations or decimal numbers — acceptable for generated CI content,
// which is clean prose, not a general-purpose sentence tokenizer.
function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+(?=\S)/)
    .map(s => s.trim())
    .filter(Boolean);
}

// Mirrors js/export.js's renderBlock() block-type detection, but returns
// narratable plain-text sentences instead of HTML.
function blockToSentences(block) {
  const trimmed = block.trim();
  if (!trimmed) return [];
  if (/^[-*_]{3,}$/.test(trimmed)) return []; // horizontal rule — no narration content

  if (/^#{2,4}\s/.test(trimmed)) {
    const headingText = trimmed.replace(/^#{2,4}\s+/, '').trim();
    return splitSentences(stripInlineMarkdown(headingText));
  }

  const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
  const isBulletList   = lines.length > 0 && lines.every(l => /^[-*+]\s/.test(l));
  const isNumberedList = lines.length > 0 && lines.every(l => /^\d+\.\s/.test(l));
  if (isBulletList || isNumberedList) {
    return lines.map(l => {
      const item = l.replace(/^[-*+]\s+/, '').replace(/^\d+\.\s+/, '').trim();
      const withTerminalPunctuation = /[.!?]$/.test(item) ? item : `${item}.`;
      return stripInlineMarkdown(withTerminalPunctuation);
    });
  }

  return splitSentences(stripInlineMarkdown(lines.join(' ')));
}

export function buildApgWebExport(entry, cefrLevel) {
  const pauses = PAUSE_TIMING_BY_LEVEL[cefrLevel] ?? DEFAULT_PAUSE_TIMING;

  const normalized    = (entry.content ?? '').replace(/\r\n|\r/g, '\n');
  const firstNewline  = normalized.indexOf('\n');
  const firstLine     = firstNewline === -1 ? normalized : normalized.slice(0, firstNewline);

  let title = null;
  let body  = normalized;
  if (firstLine.startsWith('## ')) {
    title = firstLine.slice(3).trim();
    body  = firstNewline === -1 ? '' : normalized.slice(firstNewline + 1).replace(/^\n+/, '');
  }

  const paragraphs = body
    .split(/\n{2,}/)
    .map(blockToSentences)
    .filter(sentences => sentences.length > 0);

  const lines = [`*; ${pauses.leadIn}`];

  if (title) {
    for (const sentence of splitSentences(stripInlineMarkdown(title))) {
      lines.push(`${sentence}; ${pauses.sentence}`);
    }
    if (paragraphs.length > 0) lines.push(`*; ${pauses.paragraph}`);
  }

  paragraphs.forEach((sentences, i) => {
    for (const sentence of sentences) lines.push(`${sentence}; ${pauses.sentence}`);
    if (i < paragraphs.length - 1) lines.push(`*; ${pauses.paragraph}`);
  });

  return lines.join('\n') + '\n';
}
