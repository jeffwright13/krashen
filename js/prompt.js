const OUTPUT_LENGTH_WORDS = { Short: 300, Medium: 700, Long: 1200 };

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

  parts.push(
    `## Language and Level\n` +
    `- Target language: ${config.targetLanguage}\n` +
    `- Dialect/variety: ${config.targetDialect}\n` +
    `- CEFR level: ${config.cefrLevel}\n` +
    `- Vocabulary: restrict to the ${config.wordCap} most common ${config.targetLanguage} words\n` +
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
