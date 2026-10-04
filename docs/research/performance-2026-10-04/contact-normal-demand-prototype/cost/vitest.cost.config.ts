import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '.cache/cost-vite',
  test: { include: ['performance/cost.test.ts'], testTimeout: 60_000 },
});
