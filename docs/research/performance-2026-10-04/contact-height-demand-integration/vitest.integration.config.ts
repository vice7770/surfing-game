import { defineConfig } from 'vitest/config';

// Source-frozen QA only: these existing suites and no other test discovery.
export default defineConfig({
  cacheDir: '.cache/vite-integration',
  test: {
    include: [
      'src/wave/SurfZoneRunner.test.ts',
      'src/game/WorkerSurfZone.test.ts',
      'src/game/SurfZoneHost.test.ts',
    ],
    maxWorkers: 1,
    testTimeout: 60_000,
    reporters: ['default', 'json'],
    outputFile: { json: 'checks/integration-tests.json' },
  },
});
