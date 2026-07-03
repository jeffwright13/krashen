const CLAUDE_MODEL = 'claude-opus-4-5';
const OPENAI_MODEL = 'gpt-4o';
const GOOGLE_MODEL = 'gemini-2.5-flash';

// Previously max_tokens was hardcoded to 2048 on the Claude path (and left
// unset entirely for OpenAI/Google), which silently truncated any request for
// content longer than ~1400-1600 words regardless of what the user asked for.
// These constants convert a requested word count into an output-token budget
// with headroom for the words-per-token ratio of non-English prose, a title
// line, and formatting — while keeping the previous 2048 default for requests
// that don't specify a target (e.g. Define lookups) or fall below it.
const DEFAULT_MAX_TOKENS = 2048;
const WORDS_TO_TOKENS_RATIO = 2.2;
const TOKEN_BUDGET_OVERHEAD = 300;
const MAX_TOKENS_CEILING = 8192;

function estimateMaxTokens(targetWordCount) {
  if (typeof targetWordCount !== 'number' || !Number.isFinite(targetWordCount)) {
    return DEFAULT_MAX_TOKENS;
  }
  const estimated = Math.round(targetWordCount * WORDS_TO_TOKENS_RATIO) + TOKEN_BUDGET_OVERHEAD;
  return Math.min(MAX_TOKENS_CEILING, Math.max(DEFAULT_MAX_TOKENS, estimated));
}

async function callClaude(prompts, apiKey, model, temperature, targetWordCount) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: estimateMaxTokens(targetWordCount),
      system: prompts.system,
      messages: [{ role: 'user', content: prompts.user }],
      ...(temperature !== undefined && { temperature }),
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Claude API error ${response.status}`);
  }
  const data = await response.json();
  return data.content[0].text;
}

async function callOpenAI(prompts, apiKey, model, temperature, targetWordCount) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: estimateMaxTokens(targetWordCount),
      messages: [
        { role: 'system', content: prompts.system },
        { role: 'user',   content: prompts.user },
      ],
      ...(temperature !== undefined && { temperature }),
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `OpenAI API error ${response.status}`);
  }
  const data = await response.json();
  return data.choices[0].message.content;
}

async function callGoogle(prompts, apiKey, model, temperature, targetWordCount) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: prompts.system }] },
      contents: [{ role: 'user', parts: [{ text: prompts.user }] }],
      generationConfig: {
        maxOutputTokens: estimateMaxTokens(targetWordCount),
        ...(temperature !== undefined && { temperature }),
      },
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Google API error ${response.status}`);
  }
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

export async function generateContent(prompts, provider, apiKey, model, temperature, targetWordCount) {
  switch (provider) {
    case 'claude': return callClaude(prompts, apiKey, model ?? CLAUDE_MODEL, temperature, targetWordCount);
    case 'openai': return callOpenAI(prompts, apiKey, model ?? OPENAI_MODEL, temperature, targetWordCount);
    case 'google': return callGoogle(prompts, apiKey, model ?? GOOGLE_MODEL, temperature, targetWordCount);
    default: throw new Error(`Unknown provider: "${provider}"`);
  }
}

export async function testApiKey(provider, apiKey) {
  if (!apiKey) throw new Error('No API key entered');
  switch (provider) {
    case 'claude': {
      const r = await fetch('https://api.anthropic.com/v1/models', {
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e?.error?.message ?? `Error ${r.status}`); }
      break;
    }
    case 'openai': {
      const r = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e?.error?.message ?? `Error ${r.status}`); }
      break;
    }
    case 'google': {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e?.error?.message ?? `Error ${r.status}`); }
      break;
    }
    default: throw new Error(`Unknown provider: "${provider}"`);
  }
}
