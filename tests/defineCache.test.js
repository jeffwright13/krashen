import { describe, it, expect } from 'vitest';
import createDefineCache from '../js/defineCache.js';

describe('defineCache', () => {
  it('returns undefined for a lookup that was never cached', () => {
    const cache = createDefineCache();
    expect(cache.get('piece-1', 'perro', 'El perro corre.')).toBeUndefined();
  });

  it('returns a stored result for the exact same piece/text/context', () => {
    const cache = createDefineCache();
    const result = { lemma: 'perro', translation: 'dog' };
    cache.set('piece-1', 'perro', 'El perro corre.', result);
    expect(cache.get('piece-1', 'perro', 'El perro corre.')).toEqual(result);
  });

  it('is case- and whitespace-insensitive on both text and context', () => {
    const cache = createDefineCache();
    const result = { lemma: 'perro', translation: 'dog' };
    cache.set('piece-1', 'Perro', '  El perro corre.  ', result);
    expect(cache.get('piece-1', '  perro ', 'el perro corre.')).toEqual(result);
  });

  it('misses when the same text appears in a different context (polysemy)', () => {
    const cache = createDefineCache();
    cache.set('piece-1', 'banco', 'Me senté en el banco del parque.', { translation: 'bench' });
    expect(cache.get('piece-1', 'banco', 'Fui al banco a retirar dinero.')).toBeUndefined();
  });

  it('scopes entries per piece — same text/context in a different piece misses', () => {
    const cache = createDefineCache();
    cache.set('piece-1', 'perro', 'El perro corre.', { translation: 'dog' });
    expect(cache.get('piece-2', 'perro', 'El perro corre.')).toBeUndefined();
  });

  it('supports phrases/sentences as the cache key, not just single words', () => {
    const cache = createDefineCache();
    const result = { lemma: null, translation: 'after some days' };
    cache.set('piece-1', 'pasado algunos días', 'Habían pasado algunos días sin verse.', result);
    expect(cache.get('piece-1', 'pasado algunos días', 'Habían pasado algunos días sin verse.')).toEqual(result);
  });

  it('clear() empties every piece', () => {
    const cache = createDefineCache();
    cache.set('piece-1', 'perro', 'El perro corre.', { translation: 'dog' });
    cache.clear();
    expect(cache.get('piece-1', 'perro', 'El perro corre.')).toBeUndefined();
  });

  it('set() overwrites a previously cached result for the same key', () => {
    // Regression guard for the "Re-check" bypass button: a forced fresh lookup
    // must replace the stale cached answer, not be ignored or duplicated.
    const cache = createDefineCache();
    cache.set('piece-1', 'perro', 'El perro corre.', { translation: 'dog' });
    cache.set('piece-1', 'perro', 'El perro corre.', { translation: 'dog (corrected)' });
    expect(cache.get('piece-1', 'perro', 'El perro corre.')).toEqual({ translation: 'dog (corrected)' });
  });
});
