const CLAUDE_MODEL = 'claude-opus-4-5';
const OPENAI_MODEL = 'gpt-4o';
const GOOGLE_MODEL = 'gemini-2.5-flash';

async function callClaude(prompts, apiKey, model, temperature) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
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

async function callOpenAI(prompts, apiKey, model, temperature) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
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

async function callGoogle(prompts, apiKey, model, temperature) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: prompts.system }] },
      contents: [{ role: 'user', parts: [{ text: prompts.user }] }],
      ...(temperature !== undefined && { generationConfig: { temperature } }),
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Google API error ${response.status}`);
  }
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

export async function generateContent(prompts, provider, apiKey, model, temperature) {
  switch (provider) {
    case 'claude': return callClaude(prompts, apiKey, model ?? CLAUDE_MODEL, temperature);
    case 'openai': return callOpenAI(prompts, apiKey, model ?? OPENAI_MODEL, temperature);
    case 'google': return callGoogle(prompts, apiKey, model ?? GOOGLE_MODEL, temperature);
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
