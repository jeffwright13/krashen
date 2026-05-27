// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setApiKey, getApiKey } from '../js/storage.js';
import { generateContent } from '../js/llm.js';

// Distinct sentinel values so any cross-contamination is unambiguous in failures
const CLAUDE_KEY = 'sk-ant-sectest-claude-only';
const OPENAI_KEY = 'sk-sectest-openai-only';
const GOOGLE_KEY = 'google-sectest-key-only';

const mockPrompts = { system: 'You are a test.', user: 'Write one sentence.' };

function mockFetch(provider) {
  const bodies = {
    claude: { content: [{ type: 'text', text: 'ok' }] },
    openai: { choices: [{ message: { content: 'ok' } }] },
    google: { candidates: [{ content: { parts: [{ text: 'ok' }] } }] },
  };
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => bodies[provider],
  });
}

// --- Storage: keys never leave localStorage ---

describe('API key storage — never touches the network', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('setApiKey does not call fetch', () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    setApiKey('claude', CLAUDE_KEY);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('getApiKey does not call fetch', () => {
    localStorage.setItem('krashen_settings', JSON.stringify({ apiKeys: { claude: CLAUDE_KEY } }));
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    getApiKey('claude');
    expect(fetch).not.toHaveBeenCalled();
  });
});

// --- Routing: each key reaches only its intended endpoint ---

describe('API key routing — key reaches only its intended endpoint', () => {
  beforeEach(() => { vi.unstubAllGlobals(); });

  it('Claude key is sent only to api.anthropic.com', async () => {
    const fetch = mockFetch('claude');
    vi.stubGlobal('fetch', fetch);
    await generateContent(mockPrompts, 'claude', CLAUDE_KEY);
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0][0]).toContain('anthropic.com');
  });

  it('OpenAI key is sent only to api.openai.com', async () => {
    const fetch = mockFetch('openai');
    vi.stubGlobal('fetch', fetch);
    await generateContent(mockPrompts, 'openai', OPENAI_KEY);
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0][0]).toContain('openai.com');
  });

  it('Google key is sent only to generativelanguage.googleapis.com', async () => {
    const fetch = mockFetch('google');
    vi.stubGlobal('fetch', fetch);
    await generateContent(mockPrompts, 'google', GOOGLE_KEY);
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0][0]).toContain('googleapis.com');
  });
});

// --- Placement: key is in the correct field, not the request body ---

describe('API key placement — key never appears in request body', () => {
  beforeEach(() => { vi.unstubAllGlobals(); });

  it('Claude key is in x-api-key header, not the request body', async () => {
    const fetch = mockFetch('claude');
    vi.stubGlobal('fetch', fetch);
    await generateContent(mockPrompts, 'claude', CLAUDE_KEY);
    const [, options] = fetch.mock.calls[0];
    expect(options.headers['x-api-key']).toBe(CLAUDE_KEY);
    expect(options.body).not.toContain(CLAUDE_KEY);
  });

  it('OpenAI key is in Authorization header, not the request body', async () => {
    const fetch = mockFetch('openai');
    vi.stubGlobal('fetch', fetch);
    await generateContent(mockPrompts, 'openai', OPENAI_KEY);
    const [, options] = fetch.mock.calls[0];
    expect(options.headers['Authorization']).toBe(`Bearer ${OPENAI_KEY}`);
    expect(options.body).not.toContain(OPENAI_KEY);
  });

  it('Google key is in the URL query string, not the request body', async () => {
    const fetch = mockFetch('google');
    vi.stubGlobal('fetch', fetch);
    await generateContent(mockPrompts, 'google', GOOGLE_KEY);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toContain(GOOGLE_KEY);
    expect(options.body).not.toContain(GOOGLE_KEY);
  });
});

// --- Isolation: one provider call never exposes another provider's key ---

describe('API key isolation — no cross-provider key leakage', () => {
  beforeEach(() => { vi.unstubAllGlobals(); });

  it('calling Claude does not transmit the OpenAI or Google key', async () => {
    const fetch = mockFetch('claude');
    vi.stubGlobal('fetch', fetch);
    await generateContent(mockPrompts, 'claude', CLAUDE_KEY);
    const [url, options] = fetch.mock.calls[0];
    const wire = url + JSON.stringify(options);
    expect(wire).not.toContain(OPENAI_KEY);
    expect(wire).not.toContain(GOOGLE_KEY);
  });

  it('calling OpenAI does not transmit the Claude or Google key', async () => {
    const fetch = mockFetch('openai');
    vi.stubGlobal('fetch', fetch);
    await generateContent(mockPrompts, 'openai', OPENAI_KEY);
    const [url, options] = fetch.mock.calls[0];
    const wire = url + JSON.stringify(options);
    expect(wire).not.toContain(CLAUDE_KEY);
    expect(wire).not.toContain(GOOGLE_KEY);
  });

  it('calling Google does not transmit the Claude or OpenAI key', async () => {
    const fetch = mockFetch('google');
    vi.stubGlobal('fetch', fetch);
    await generateContent(mockPrompts, 'google', GOOGLE_KEY);
    const [url, options] = fetch.mock.calls[0];
    const wire = url + JSON.stringify(options);
    expect(wire).not.toContain(CLAUDE_KEY);
    expect(wire).not.toContain(OPENAI_KEY);
  });
});
