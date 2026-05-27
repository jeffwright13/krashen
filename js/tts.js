export function isAvailable() { return false; }

export async function synthesize(_text, _config, _apiKey) {
  return Promise.reject(new Error('TTS not implemented in v1'));
}
