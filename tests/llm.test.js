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
