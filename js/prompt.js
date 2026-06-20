const OUTPUT_LENGTH_WORDS = { Short: 300, Medium: 700, Long: 1200 };

const CEFR_DESCRIPTIONS = {
  A0: 'Complete beginner. Only the 50–100 most basic words (greetings, numbers, colors, ser/estar/tener/ir). Present tense only. Sentences of 3–5 words maximum. One idea per sentence.',
  A1: 'Beginner. Basic high-frequency vocabulary only. Present tense; ir a + infinitive for near future. Very short simple sentences. Topics: self, family, immediate surroundings.',
  A2: 'Elementary. Common everyday vocabulary. Pretérito indefinido and imperfecto for past events. Short clear sentences with basic connectors (y, pero, porque, cuando). Topics: daily routines, shopping, local environment.',
  B1: 'Intermediate. Broad everyday vocabulary. Pretérito, imperfecto, futuro simple, condicional simple. Varied subordination with standard discourse connectors. Abstract topics introduced simply and directly.',
  B2: 'Upper-intermediate. Wide vocabulary including some idiomatic expressions and less common words. Subjunctive in common contexts (ojalá, para que, cuando + subjunctive). Complex sentences with varied subordination. Abstract topics handled with nuance.',
  C1: 'Advanced. High density of sophisticated vocabulary throughout — collocations, low-frequency words, idiomatic expressions, and precise register-appropriate word choices at every turn, not just occasionally. Fluent, varied sentence architecture. Subjunctive in varied and less predictable contexts; conditional, concessive, and relative clauses; ellipsis and implicit reference. The register must be unmistakably C1 — not "careful B2". Analytical or argumentative depth even in narrative content. Abstract, professional, or literary topics.',
  C2: 'Mastery level. Use rare, domain-specific, and low-frequency vocabulary; rich collocations; words chosen for subtle connotation. Deploy the full grammatical range: subjunctive in all moods (present, imperfect, pluperfect, and future subjunctive where appropriate), stylistic inversion, complex nominal clauses, ellipsis, anaphora. Prose must have rhetorical sophistication: varied register, literary devices, irony, and implied meaning. High information density; abstract, technical, or culturally layered content. The text must read as written by a highly educated native speaker and genuinely challenge an advanced learner.',
};

const DIALECT_DESCRIPTIONS = {
  Mexican:
    'Mexican Spanish. Vocabulary and expressions must be distinctly Mexican throughout — not generic Latin American. Use regional words naturally: órale, ahorita, chido/a, chavo/a, chamba (work), chamaco/a (kid), padre (cool), neta (truth), cuate (buddy), güey/wey (informal address), mande (pardon?). Use expressive diminutives as Mexicans do: tantito, ahorita, rapidito, perrito. Include characteristic exclamations: ¡híjole!, ¡ándale!, ¡no manches!, ¡qué onda! Use pues as a natural filler and ya as an intensifier. Tuteo (tú) for informal address; usted for formal. No vosotros, no Peninsular vocabulary (vale, tío as slang, coger in neutral sense).',
  Rioplatense:
    'Rioplatense Spanish (Buenos Aires / Río de la Plata). Voseo is mandatory throughout — use vos with its correct verb forms: vos tenés, vos sos, vos podés, vos querés (never tú tienes, tú eres). Characteristic vocabulary: che (address/filler), boludo/a (mild expletive/address), laburo (work), pibe/piba (kid/girl), copado/a (cool), morfar (to eat), fiaca (laziness/reluctance), quilombo (mess). Italian-influenced intonation shapes the sentence rhythm. Buenos Aires register. No vosotros, no Mexican regionalisms.',
  Castilian:
    'Castilian Spanish (Spain). Use vosotros/vosotras for 2nd person plural with correct conjugations (vosotros tenéis, vosotros sois, vosotros podéis). Characteristic vocabulary: tío/tía (informal address), vale (OK/agreed), guay (cool), mola (it\'s great), joder (mild expletive), hostia, macho. Use coger in its neutral sense (to take/grab). Peninsular vocabulary and idioms throughout. No voseo, no Latin American regionalisms.',
  'Central American':
    'Central American Spanish. Clear, neutral register without the stronger markers of Mexican or Rioplatense. Voseo is accepted and used in informal register in Guatemala, Nicaragua, and Costa Rica (vos tenés, vos sos). Avoid strong regional vocabulary from other dialects. Keep the register accessible and pan-Central American.',
  Neutral:
    'Neutral Latin American Spanish — the educated, formal standard used in broadcasting, textbooks, and formal writing across Latin America. No regional markers: no vosotros, no voseo, no Mexican or Rioplatense slang. Clear, precise, geographically unmarked prose. Appropriate when the content must be understood by speakers from any Spanish-speaking country.',
};

const NARRATIVE_PERSON_LABELS = {
  '1st': 'first person',
  '2nd': 'second person (tú)',
  '3rd': 'third person',
};

export function buildSystemPrompt(config) {
  const parts = [];

  parts.push(
    `You are an expert ${config.targetLanguage} language content generator specializing ` +
    `in comprehensible input (CI) for language learners.`
  );

  const cefrDesc    = CEFR_DESCRIPTIONS[config.cefrLevel] ?? '';
  const dialectDesc = DIALECT_DESCRIPTIONS[config.targetDialect] ?? '';
  const vocabCapLine = config.cefrLevel === 'C2'
    ? `- Vocabulary: no frequency restriction — rare and low-frequency words are expected at this level`
    : `- Vocabulary: restrict to the ${config.wordCap} most common ${config.targetLanguage} words`;

  parts.push(
    `## Language and Level\n` +
    `- Target language: ${config.targetLanguage}\n` +
    `- Dialect/variety: ${config.targetDialect}${dialectDesc ? ` — ${dialectDesc}` : ''}\n` +
    `- CEFR level: ${config.cefrLevel}${cefrDesc ? ` — ${cefrDesc}` : ''}\n` +
    vocabCapLine + `\n` +
    `- Learner's native language: ${config.nativeLanguage} — watch for false cognates and interference patterns`
  );

  if (config.tenseFocus && config.tenseFocus.length > 0) {
    parts.push(
      `## Grammar Focus\n` +
      `- Tenses/structures to use: ${config.tenseFocus.join(', ')}`
    );
  }

  if (config.sentenceLengthCeiling !== null && config.sentenceLengthCeiling !== undefined) {
    parts.push(`- Maximum sentence length: ${config.sentenceLengthCeiling} words`);
  }

  if (config.connectorDensity === 'High') {
    parts.push(
      `## Connector Density\n` +
      `- Use a high density of discourse connectors: pero, así que, sin embargo, porque, aunque, entonces, por eso, además, etc.`
    );
  } else if (config.connectorDensity === 'Low') {
    parts.push(
      `## Connector Density\n` +
      `- Minimize discourse connectors; keep sentences simple and direct.`
    );
  }

  if (config.knownStrongAreas && config.knownStrongAreas.trim()) {
    parts.push(`## Learner Notes\n- ${config.knownStrongAreas}`);
  }

  parts.push(
    `## Output Requirements\n` +
    `- Produce natural, engaging content calibrated to the level above.\n` +
    `- Do not include translations, glosses, or explanatory notes.\n` +
    `- Preserve paragraph structure and punctuation appropriate to ${config.targetLanguage}.`
  );

  return parts.join('\n\n');
}

const FORMAT_NOTES = {
  'Article': 'Expository, informational prose. No narrative characters or story arc. Educational register.',
};

export function buildUserPrompt(config) {
  const wordCount = typeof config.outputLength === 'number'
    ? config.outputLength
    : (OUTPUT_LENGTH_WORDS[config.outputLength] ?? 700);

  const personLabel = NARRATIVE_PERSON_LABELS[config.narrativePerson] ?? config.narrativePerson;

  const lines = [
    `Topic: ${config.topic}`,
    `Format: ${config.outputFormat}`,
    `Approximate length: ${wordCount} words`,
  ];

  if (config.outputFormat !== 'Article') {
    lines.push(`Narrative person: ${personLabel} (${config.narrativePerson})`);
  }

  if (FORMAT_NOTES[config.outputFormat]) {
    lines.push(`Format note: ${FORMAT_NOTES[config.outputFormat]}`);
  }

  if (config.includeWords && config.includeWords.trim()) {
    lines.push(`Must include these words/phrases (woven in naturally): ${config.includeWords}`);
  }

  if (config.excludeWords && config.excludeWords.trim()) {
    lines.push(`Must exclude these words/phrases: ${config.excludeWords}`);
  }

  lines.unshift('Begin your response with a title on its own line in this exact format: ## Your Title Here');

  return lines.join('\n');
}

// Swaps embedded double quotes for single quotes so selection/context text can
// never prematurely close the outer "..." delimiter the prompt wraps it in.
function escapeForPrompt(str) {
  return str.replace(/"/g, "'");
}

export function buildDefinePrompt(selection, context, targetLanguage, nativeLanguage) {
  const isPhrase   = selection.trim().includes(' ');
  const hasContext = context && context.trim() && context.trim() !== selection.trim();
  const lemmaNote  = isPhrase
    ? `the full phrase in canonical form in ${targetLanguage} (keep all words; do not reduce to a single headword)`
    : `the base/dictionary form of the word in ${targetLanguage}`;
  const safeSelection = escapeForPrompt(selection);
  const safeContext   = escapeForPrompt(context.trim());
  return {
    system:
      `You are a ${targetLanguage}–${nativeLanguage} dictionary. ` +
      `When context is given in parentheses, it exists only to disambiguate the sense of the quoted ` +
      `text (e.g. which meaning of an ambiguous word applies) — it is not text to translate. ` +
      `TRANSLATION must translate only the exact quoted text: never add, infer, or borrow words from ` +
      `the context, even if the quoted text reads as an incomplete fragment on its own. Even if the ` +
      `quoted text spans multiple sentences, write the TRANSLATION as a single line with no line breaks. ` +
      `Reply in exactly this format (two lines, no other text):\n` +
      `LEMMA: <${lemmaNote}>\n` +
      `TRANSLATION: <the ${nativeLanguage} translation of the quoted text>`,
    user: hasContext
      ? `"${safeSelection}" (context: "${safeContext}")`
      : `"${safeSelection}"`,
  };
}

export function parseDefineResponse(raw) {
  const text       = raw.trim();
  const lemmaMatch = text.match(/^LEMMA:\s*(.+)$/m);
  // [\s\S]+ (not .+) so a TRANSLATION that spans multiple lines — e.g. the model
  // translating a multi-sentence selection sentence-by-sentence — isn't truncated
  // at the first line break.
  const transMatch = text.match(/^TRANSLATION:\s*([\s\S]+)/m);
  if (lemmaMatch && transMatch) {
    const translation = transMatch[1].trim().replace(/\n?```\s*$/, '').trim();
    return {
      lemma: lemmaMatch[1].trim().toLowerCase(),
      translation,
    };
  }
  return { lemma: null, translation: text };
}
