import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateContent } from '../js/llm.js';

const mockPrompts = {
  system: 'You are a Spanish content generator.',
  user: 'Write a short story about a dog.',
};

function mockFetch(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe('generateContent — Claude', () => {
  beforeEach(() => { vi.unstubAllGlobals(); });

  it('calls the Anthropic API endpoint', async () => {
    const fetch = mockFetch(200, {
      content: [{ type: 'text', text: 'Había una vez un perro.' }],
    });
    vi.stubGlobal('fetch', fetch);
    await generateContent(mockPrompts, 'claude', 'sk-ant-key');
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0][0]).toContain('anthropic.com');
  });

  it('sends x-api-key header', async () => {
    const fetch = mockFetch(200, {
      content: [{ type: 'text', text: 'test' }],
    });
    vi.stubGlobal('fetch', fetch);
    await generateContent(mockPrompts, 'claude', 'sk-ant-key');
    const headers = fetch.mock.calls[0][1].headers;
    expect(headers['x-api-key']).toBe('sk-ant-key');
  });

  it('returns the text from the response', async () => {
    vi.stubGlobal('fetch', mockFetch(200, {
      content: [{ type: 'text', text: 'Había una vez un perro.' }],
    }));
    const result = await generateContent(mockPrompts, 'claude', 'sk-ant-key');
    expect(result).toBe('Había una vez un perro.');
  });

  it('throws on non-2xx response', async () => {
    vi.stubGlobal('fetch', mockFetch(401, { error: { message: 'Invalid API key' } }));
    await expect(generateContent(mockPrompts, 'claude', 'bad-key')).rejects.toThrow();
  });
});

describe('generateContent — OpenAI', () => {
  beforeEach(() => { vi.unstubAllGlobals(); });

  it('calls the OpenAI API endpoint', async () => {
    const fetch = mockFetch(200, {
      choices: [{ message: { content: 'Un perro y un niño.' } }],
    });
    vi.stubGlobal('fetch', fetch);
    await generateContent(mockPrompts, 'openai', 'sk-openai-key');
    expect(fetch.mock.calls[0][0]).toContain('openai.com');
  });

  it('sends Bearer authorization header', async () => {
    const fetch = mockFetch(200, {
      choices: [{ message: { content: 'test' } }],
    });
    vi.stubGlobal('fetch', fetch);
    await generateContent(mockPrompts, 'openai', 'sk-openai-key');
    const headers = fetch.mock.calls[0][1].headers;
    expect(headers['Authorization']).toBe('Bearer sk-openai-key');
  });

  it('returns the text from the response', async () => {
    vi.stubGlobal('fetch', mockFetch(200, {
      choices: [{ message: { content: 'Un perro y un niño.' } }],
    }));
    const result = await generateContent(mockPrompts, 'openai', 'sk-openai-key');
    expect(result).toBe('Un perro y un niño.');
  });

  it('throws on non-2xx response', async () => {
    vi.stubGlobal('fetch', mockFetch(429, { error: { message: 'Rate limit exceeded' } }));
    await expect(generateContent(mockPrompts, 'openai', 'key')).rejects.toThrow();
  });
});

describe('generateContent — Google', () => {
  beforeEach(() => { vi.unstubAllGlobals(); });

  it('calls the Google Gemini API endpoint', async () => {
    const fetch = mockFetch(200, {
      candidates: [{ content: { parts: [{ text: 'El perro corrió.' }] } }],
    });
    vi.stubGlobal('fetch', fetch);
    await generateContent(mockPrompts, 'google', 'google-api-key');
    expect(fetch.mock.calls[0][0]).toMatch(/googleapis\.com|generativelanguage/);
  });

  it('returns the text from the response', async () => {
    vi.stubGlobal('fetch', mockFetch(200, {
      candidates: [{ content: { parts: [{ text: 'El perro corrió.' }] } }],
    }));
    const result = await generateContent(mockPrompts, 'google', 'google-api-key');
    expect(result).toBe('El perro corrió.');
  });

  it('throws on non-2xx response', async () => {
    vi.stubGlobal('fetch', mockFetch(403, { error: { message: 'Forbidden' } }));
    await expect(generateContent(mockPrompts, 'google', 'key')).rejects.toThrow();
  });
});

describe('generateContent — provider validation', () => {
  it('throws for unknown provider without calling fetch', async () => {
    await expect(generateContent(mockPrompts, 'mistral', 'key')).rejects.toThrow(/provider/i);
  });
});

describe('generateContent — temperature passthrough', () => {
  beforeEach(() => { vi.unstubAllGlobals(); });

  it('Claude: includes temperature in the request body when provided', async () => {
    const fetch = mockFetch(200, { content: [{ type: 'text', text: 'test' }] });
    vi.stubGlobal('fetch', fetch);
    await generateContent(mockPrompts, 'claude', 'sk-ant-key', undefined, 0);
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.temperature).toBe(0);
  });

  it('Claude: omits temperature from the request body when not provided', async () => {
    const fetch = mockFetch(200, { content: [{ type: 'text', text: 'test' }] });
    vi.stubGlobal('fetch', fetch);
    await generateContent(mockPrompts, 'claude', 'sk-ant-key');
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body).not.toHaveProperty('temperature');
  });

  it('OpenAI: includes temperature in the request body when provided', async () => {
    const fetch = mockFetch(200, { choices: [{ message: { content: 'test' } }] });
    vi.stubGlobal('fetch', fetch);
    await generateContent(mockPrompts, 'openai', 'sk-openai-key', undefined, 0);
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.temperature).toBe(0);
  });

  it('OpenAI: omits temperature from the request body when not provided', async () => {
    const fetch = mockFetch(200, { choices: [{ message: { content: 'test' } }] });
    vi.stubGlobal('fetch', fetch);
    await generateContent(mockPrompts, 'openai', 'sk-openai-key');
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body).not.toHaveProperty('temperature');
  });

  it('Google: includes temperature in generationConfig when provided', async () => {
    const fetch = mockFetch(200, { candidates: [{ content: { parts: [{ text: 'test' }] } }] });
    vi.stubGlobal('fetch', fetch);
    await generateContent(mockPrompts, 'google', 'google-api-key', undefined, 0);
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.generationConfig.temperature).toBe(0);
  });

  it('Google: omits temperature from generationConfig when not provided', async () => {
    const fetch = mockFetch(200, { candidates: [{ content: { parts: [{ text: 'test' }] } }] });
    vi.stubGlobal('fetch', fetch);
    await generateContent(mockPrompts, 'google', 'google-api-key');
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.generationConfig).not.toHaveProperty('temperature');
  });
});

describe('generateContent — max output tokens scale with requested length', () => {
  beforeEach(() => { vi.unstubAllGlobals(); });

  // Regression guard: max_tokens was previously hardcoded to 2048 on the Claude
  // path, which silently truncated any request for content longer than ~1400-1600
  // words (e.g. a 2500-word Article) regardless of what the user asked for.

  it('Claude: default max_tokens (no target word count given) stays at 2048', async () => {
    const fetch = mockFetch(200, { content: [{ type: 'text', text: 'test' }] });
    vi.stubGlobal('fetch', fetch);
    await generateContent(mockPrompts, 'claude', 'sk-ant-key');
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.max_tokens).toBe(2048);
  });

  it('Claude: max_tokens scales up for a large requested word count', async () => {
    const fetch = mockFetch(200, { content: [{ type: 'text', text: 'test' }] });
    vi.stubGlobal('fetch', fetch);
    await generateContent(mockPrompts, 'claude', 'sk-ant-key', undefined, undefined, 2500);
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.max_tokens).toBeGreaterThan(2048);
  });

  it('Claude: max_tokens for a small requested word count never drops below the 2048 floor', async () => {
    const fetch = mockFetch(200, { content: [{ type: 'text', text: 'test' }] });
    vi.stubGlobal('fetch', fetch);
    await generateContent(mockPrompts, 'claude', 'sk-ant-key', undefined, undefined, 100);
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.max_tokens).toBe(2048);
  });

  it('OpenAI: sends a max_tokens field that scales with the requested word count', async () => {
    const fetch = mockFetch(200, { choices: [{ message: { content: 'test' } }] });
    vi.stubGlobal('fetch', fetch);
    await generateContent(mockPrompts, 'openai', 'sk-openai-key', undefined, undefined, 2500);
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.max_tokens).toBeGreaterThan(2048);
  });

  it('Google: sends a maxOutputTokens field that scales with the requested word count', async () => {
    const fetch = mockFetch(200, { candidates: [{ content: { parts: [{ text: 'test' }] } }] });
    vi.stubGlobal('fetch', fetch);
    await generateContent(mockPrompts, 'google', 'google-api-key', undefined, undefined, 2500);
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.generationConfig.maxOutputTokens).toBeGreaterThan(2048);
  });

  it('does not let the computed token budget run away for extreme word counts', async () => {
    const fetch = mockFetch(200, { content: [{ type: 'text', text: 'test' }] });
    vi.stubGlobal('fetch', fetch);
    await generateContent(mockPrompts, 'claude', 'sk-ant-key', undefined, undefined, 1_000_000);
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.max_tokens).toBeLessThanOrEqual(8192);
  });
});
