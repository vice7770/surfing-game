import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '.cache/vite-cost',
  server: { fs: { allow: [
    '/private/tmp/contact-height-demand-cost-20261004',
    '/private/tmp/contact-normal-demand-prototype-20261004',
    '/private/tmp/contact-height-demand-prototype-20261004',
    '/Users/regina/Desktop/Projects/surfing-game/node_modules',
  ] } },
  test: { include: ['cost.test.ts'], maxWorkers: 1, testTimeout: 60_000 },
});
