import { defineConfig } from 'vitest/config';

// TMP-only helper: do not discover the independent archived oracle's test files.
export default defineConfig({
  cacheDir: '.cache/vite',
  test: { include: ['src/**/*.test.ts'], testTimeout: 60_000 },
});
