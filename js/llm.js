const CLAUDE_MODEL  = 'claude-opus-4-5';
const OPENAI_MODEL  = 'gpt-4o';
const GOOGLE_MODEL  = 'gemini-1.5-pro';

async function callClaude(prompts, apiKey) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      system: prompts.system,
      messages: [{ role: 'user', content: prompts.user }],
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Claude API error ${response.status}`);
  }
  const data = await response.json();
  return data.content[0].text;
}

async function callOpenAI(prompts, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: prompts.system },
        { role: 'user',   content: prompts.user },
      ],
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `OpenAI API error ${response.status}`);
  }
  const data = await response.json();
  return data.choices[0].message.content;
}

async function callGoogle(prompts, apiKey) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${GOOGLE_MODEL}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: prompts.system }] },
      contents: [{ role: 'user', parts: [{ text: prompts.user }] }],
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Google API error ${response.status}`);
  }
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

export async function generateContent(prompts, provider, apiKey) {
  switch (provider) {
    case 'claude': return callClaude(prompts, apiKey);
    case 'openai': return callOpenAI(prompts, apiKey);
    case 'google': return callGoogle(prompts, apiKey);
    default: throw new Error(`Unknown provider: "${provider}"`);
  }
}
