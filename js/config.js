export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
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
  outputLength: 'Medium',
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

export function validateConfig(_config) {
  throw new Error('not implemented');
}
