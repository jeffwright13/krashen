import { validateConfig, DEFAULT_CONFIG } from './config.js';
import { buildSystemPrompt, buildUserPrompt } from './prompt.js';
import { generateContent } from './llm.js';
import { getApiKey, setApiKey, appendHistory } from './storage.js';
import { toggleLoading, renderContent, renderError } from './display.js';

function readConfig() {
  const sentenceRaw = document.getElementById('sentence-length').value;
  return {
    ...DEFAULT_CONFIG,
    provider:              document.getElementById('provider').value,
    targetLanguage:        document.getElementById('target-language').value.trim(),
    cefrLevel:             document.getElementById('cefr-level').value,
    wordCap:               parseInt(document.getElementById('word-cap').value, 10),
    targetDialect:         document.getElementById('target-dialect').value,
    nativeLanguage:        document.getElementById('native-language').value.trim(),
    tenseFocus:            document.getElementById('tense-focus').value
                             .split(',').map(s => s.trim()).filter(Boolean),
    sentenceLengthCeiling: sentenceRaw ? parseInt(sentenceRaw, 10) : null,
    connectorDensity:      document.getElementById('connector-density').value,
    includeWords:          document.getElementById('include-words').value.trim(),
    excludeWords:          document.getElementById('exclude-words').value.trim(),
    topic:                 document.getElementById('topic').value.trim(),
    outputFormat:          document.getElementById('output-format').value,
    outputLength:          document.getElementById('output-length').value,
    narrativePerson:       document.getElementById('narrative-person').value,
  };
}

async function handleGenerate(e) {
  e.preventDefault();

  const config = readConfig();
  const { valid, errors } = validateConfig(config);
  if (!valid) {
    renderError(errors.join(' · '));
    return;
  }

  const apiKey = getApiKey(config.provider);
  if (!apiKey) {
    renderError(`No API key set for ${config.provider}. Open Settings to add one.`);
    return;
  }

  toggleLoading(true);

  try {
    const prompts = {
      system: buildSystemPrompt(config),
      user:   buildUserPrompt(config),
    };

    const content  = await generateContent(prompts, config.provider, apiKey);
    const wordCount = content.trim().split(/\s+/).length;
    const date      = new Date().toLocaleDateString();

    renderContent(content, { cefrLevel: config.cefrLevel, wordCount, topic: config.topic, date });
    appendHistory({ id: Date.now(), date, config, content, wordCount });
  } catch (err) {
    renderError(err.message ?? 'An unexpected error occurred.');
  }
}

function openSettings() {
  ['claude', 'openai', 'google'].forEach(provider => {
    document.getElementById(`api-key-${provider}`).value = getApiKey(provider);
  });
  document.getElementById('settings-modal').showModal();
}

function saveSettings() {
  ['claude', 'openai', 'google'].forEach(provider => {
    setApiKey(provider, document.getElementById(`api-key-${provider}`).value.trim());
  });
  document.getElementById('settings-modal').close();
}

fetch('./package.json')
  .then(r => r.json())
  .then(pkg => {
    const el = document.getElementById('app-version');
    if (el && pkg.version) el.textContent = `v${pkg.version}`;
  })
  .catch(() => {});

const providerSelect = document.getElementById('provider');
const providerHint   = document.getElementById('provider-hint');
function updateProviderHint() {
  providerHint.hidden = providerSelect.value !== 'claude';
}
providerSelect.addEventListener('change', updateProviderHint);
updateProviderHint();

document.getElementById('config-form').addEventListener('submit', handleGenerate);
document.getElementById('settings-btn').addEventListener('click', openSettings);
document.getElementById('save-settings').addEventListener('click', saveSettings);
document.getElementById('close-settings').addEventListener('click', () => {
  document.getElementById('settings-modal').close();
});
document.getElementById('settings-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.close();
});
