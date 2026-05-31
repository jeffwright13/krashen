import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [
      '**/node_modules/**',
      'tests/profiles.test.js',
      'tests/vocab.test.js',
      'tests/run.js',
    ],
    include: ['tests/**/*.test.js', '**/*.test.js'],
  },
});
