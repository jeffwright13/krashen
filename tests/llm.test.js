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

  // Reasoning models such as gpt-6-luna reject any non-default temperature. Each test
  // uses its own model name because the "unsupported" memory is module-level state.
  describe('OpenAI: retry without temperature when the model rejects it', () => {
    const TEMPERATURE_REJECTED = {
      error: {
        message: "Unsupported value: 'temperature' does not support 0 with this model. Only the default (1) value is supported.",
        param: 'temperature',
        code: 'unsupported_value',
      },
    };
    const OK = { choices: [{ message: { content: 'buscar comida → look for food' } }] };

    function sequencedFetch(...responses) {
      const fn = vi.fn();
      for (const [status, body] of responses) {
        fn.mockResolvedValueOnce({ ok: status >= 200 && status < 300, status, json: async () => body });
      }
      return fn;
    }
    const sentBody = (fetch, i) => JSON.parse(fetch.mock.calls[i][1].body);

    it('retries once without temperature and returns the result', async () => {
      const fetch = sequencedFetch([400, TEMPERATURE_REJECTED], [200, OK]);
      vi.stubGlobal('fetch', fetch);
      const result = await generateContent(mockPrompts, 'openai', 'sk', 'reasoning-model-a', 0);
      expect(result).toBe('buscar comida → look for food');
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(sentBody(fetch, 0).temperature).toBe(0);
      expect(sentBody(fetch, 1)).not.toHaveProperty('temperature');
    });

    it('skips temperature on later calls to the same model without a failed request', async () => {
      const fetch = sequencedFetch([400, TEMPERATURE_REJECTED], [200, OK], [200, OK]);
      vi.stubGlobal('fetch', fetch);
      await generateContent(mockPrompts, 'openai', 'sk', 'reasoning-model-b', 0);
      await generateContent(mockPrompts, 'openai', 'sk', 'reasoning-model-b', 0);
      expect(fetch).toHaveBeenCalledTimes(3);
      expect(sentBody(fetch, 2)).not.toHaveProperty('temperature');
    });

    it('still sends temperature to a different model', async () => {
      const fetch = sequencedFetch([400, TEMPERATURE_REJECTED], [200, OK], [200, OK]);
      vi.stubGlobal('fetch', fetch);
      await generateContent(mockPrompts, 'openai', 'sk', 'reasoning-model-c', 0);
      await generateContent(mockPrompts, 'openai', 'sk', 'non-reasoning-model-c', 0);
      expect(sentBody(fetch, 2).temperature).toBe(0);
    });

    it('detects the rejection from the message when param is absent', async () => {
      const fetch = sequencedFetch(
        [400, { error: { message: TEMPERATURE_REJECTED.error.message } }],
        [200, OK],
      );
      vi.stubGlobal('fetch', fetch);
      await generateContent(mockPrompts, 'openai', 'sk', 'reasoning-model-d', 0);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('does not retry on unrelated errors', async () => {
      const fetch = sequencedFetch([401, { error: { message: 'Incorrect API key provided' } }]);
      vi.stubGlobal('fetch', fetch);
      await expect(generateContent(mockPrompts, 'openai', 'sk', 'reasoning-model-e', 0))
        .rejects.toThrow('Incorrect API key provided');
      expect(fetch).toHaveBeenCalledOnce();
    });

    it('surfaces the error if the retry also fails', async () => {
      const fetch = sequencedFetch(
        [400, TEMPERATURE_REJECTED],
        [500, { error: { message: 'The server had an error' } }],
      );
      vi.stubGlobal('fetch', fetch);
      await expect(generateContent(mockPrompts, 'openai', 'sk', 'reasoning-model-f', 0))
        .rejects.toThrow('The server had an error');
      expect(fetch).toHaveBeenCalledTimes(2);
    });
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

  // Reasoning models such as gpt-6-luna reject max_tokens outright ("Use
  // 'max_completion_tokens' instead"); older OpenAI models accept either.
  it('OpenAI: sends a max_completion_tokens field that scales with the requested word count', async () => {
    const fetch = mockFetch(200, { choices: [{ message: { content: 'test' } }] });
    vi.stubGlobal('fetch', fetch);
    await generateContent(mockPrompts, 'openai', 'sk-openai-key', undefined, undefined, 2500);
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.max_completion_tokens).toBeGreaterThan(2048);
    expect(body).not.toHaveProperty('max_tokens');
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
