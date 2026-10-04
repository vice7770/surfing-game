import { defineConfig } from 'vitest/config';
export default defineConfig({
  cacheDir: '/private/tmp/surf-tube-material-visual-capture-20261004/.vitest-cache',
  test: { include: ['capture.test.ts'], testTimeout: 120_000, maxWorkers: 1 },
});
