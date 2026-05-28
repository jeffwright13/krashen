export const CEFR_LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
export const WORD_CAPS = [550, 1000, 2000, 3000, 5000, 7500];
export const DIALECTS = ['Mexican', 'Rioplatense', 'Castilian', 'Central American', 'Neutral'];
export const PROVIDERS = ['claude', 'openai', 'google'];

export const DEFAULT_CONFIG = {
  cefrLevel: 'A2',
  wordCap: 1000,
  targetLanguage: 'Spanish',
  targetDialect: 'Neutral',
  nativeLanguage: 'English',
  knownStrongAreas: '',
  tenseFocus: [],
  sentenceLengthCeiling: null,
  dialogueProseRatio: 'mixed',
  connectorDensity: 'Normal',
  includeWords: '',
  excludeWords: '',
  fiction: true,
  generalArea: 'Daily life',
  topic: '',
  outputLength: 700,
  narrativePerson: '3rd',
  outputFormat: 'Single story',
  ttsVoice: null,
  ttsPace: 'Natural',
  pauseMarking: false,
  avoidTtsWords: false,
  sessionNumber: 1,
  reExposeWords: '',
  provider: 'claude',
};

export function validateConfig(config) {
  const errors = [];

  if (!config.topic || !config.topic.trim()) {
    errors.push('topic is required');
  }

  if (!CEFR_LEVELS.includes(config.cefrLevel)) {
    errors.push(`CEFR level must be one of: ${CEFR_LEVELS.join(', ')}`);
  }

  if (!WORD_CAPS.includes(config.wordCap)) {
    errors.push(`word cap must be one of: ${WORD_CAPS.join(', ')}`);
  }

  if (!config.targetLanguage || !config.targetLanguage.trim()) {
    errors.push('target language is required');
  }

  if (!PROVIDERS.includes(config.provider)) {
    errors.push(`provider must be one of: ${PROVIDERS.join(', ')}`);
  }

  if (config.sentenceLengthCeiling !== null && config.sentenceLengthCeiling !== undefined) {
    if (typeof config.sentenceLengthCeiling !== 'number' || config.sentenceLengthCeiling <= 0) {
      errors.push('sentence length ceiling must be a positive number');
    }
  }

  return { valid: errors.length === 0, errors };
}
