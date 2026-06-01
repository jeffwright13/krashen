const OUTPUT_LENGTH_WORDS = { Short: 300, Medium: 700, Long: 1200 };

const CEFR_DESCRIPTIONS = {
  A0: 'Complete beginner. Only the 50–100 most basic words (greetings, numbers, colors, ser/estar/tener/ir). Present tense only. Sentences of 3–5 words maximum. One idea per sentence.',
  A1: 'Beginner. Basic high-frequency vocabulary only. Present tense; ir a + infinitive for near future. Very short simple sentences. Topics: self, family, immediate surroundings.',
  A2: 'Elementary. Common everyday vocabulary. Pretérito indefinido and imperfecto for past events. Short clear sentences with basic connectors (y, pero, porque, cuando). Topics: daily routines, shopping, local environment.',
  B1: 'Intermediate. Broad everyday vocabulary. Pretérito, imperfecto, futuro simple, condicional simple. Varied subordination with standard discourse connectors. Abstract topics introduced simply and directly.',
  B2: 'Upper-intermediate. Wide vocabulary including some idiomatic expressions and less common words. Subjunctive in common contexts (ojalá, para que, cuando + subjunctive). Complex sentences with varied subordination. Abstract topics handled with nuance.',
  C1: 'Advanced. Sophisticated vocabulary including collocations, low-frequency words, and idiomatic expressions. Well-structured fluent prose. Subjunctive in varied contexts; conditional and concessive clauses; ellipsis. Nuanced register awareness; precise and subtle expression. Abstract, professional, or literary topics.',
  C2: 'Mastery level. Use rare, domain-specific, and low-frequency vocabulary; rich collocations; words chosen for subtle connotation. Deploy the full grammatical range: subjunctive in all moods (present, imperfect, pluperfect, and future subjunctive where appropriate), stylistic inversion, complex nominal clauses, ellipsis, anaphora. Prose must have rhetorical sophistication: varied register, literary devices, irony, and implied meaning. High information density; abstract, technical, or culturally layered content. The text must read as written by a highly educated native speaker and genuinely challenge an advanced learner.',
};

const NARRATIVE_PERSON_LABELS = {
  '1st': 'first person',
  '2nd': 'second person (tú)',
  '3rd': 'third person',
};

export function buildI1Constraints({ knownTerms, reExposeTerms, newWordsPerSession }) {
  const parts = [];

  if (knownTerms.length > 0) {
    parts.push(
      `Known vocabulary (use naturally, don't over-explain):\n` +
      knownTerms.slice(0, 50).join(', ')
    );
  }

  if (reExposeTerms.length > 0) {
    parts.push(
      `Re-expose these words the learner is still acquiring:\n` +
      reExposeTerms.join(', ')
    );
  }

  parts.push(`Introduce at most ${newWordsPerSession} new vocabulary words not on either list.`);

  return parts.join('\n\n');
}

export function buildSystemPrompt(config, vocabContext = null) {
  const parts = [];

  parts.push(
    `You are an expert ${config.targetLanguage} language content generator specializing ` +
    `in comprehensible input (CI) for language learners.`
  );

  const cefrDesc    = CEFR_DESCRIPTIONS[config.cefrLevel] ?? '';
  const vocabCapLine = config.cefrLevel === 'C2'
    ? `- Vocabulary: no frequency restriction — rare and low-frequency words are expected at this level`
    : `- Vocabulary: restrict to the ${config.wordCap} most common ${config.targetLanguage} words`;

  parts.push(
    `## Language and Level\n` +
    `- Target language: ${config.targetLanguage}\n` +
    `- Dialect/variety: ${config.targetDialect}\n` +
    `- CEFR level: ${config.cefrLevel}${cefrDesc ? ` — ${cefrDesc}` : ''}\n` +
    vocabCapLine + `\n` +
    `- Learner's native language: ${config.nativeLanguage} — watch for false cognates and interference patterns`
  );

  if (vocabContext) {
    parts.push(`## Vocabulary Constraints (i+1)\n${buildI1Constraints(vocabContext)}`);
  }

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

export function buildDefinePrompt(selection, context, targetLanguage, nativeLanguage) {
  const hasContext = context && context.trim() && context.trim() !== selection.trim();
  return {
    system: `Translate ${targetLanguage} to ${nativeLanguage}. Reply with the translation only — no explanations, no added punctuation.`,
    user: hasContext
      ? `"${selection}" (context: "${context.trim()}")`
      : `"${selection}"`,
  };
}
