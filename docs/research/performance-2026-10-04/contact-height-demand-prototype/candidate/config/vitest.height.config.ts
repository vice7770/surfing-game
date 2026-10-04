import { defineConfig } from 'vitest/config';

// Scratch only. Do not discover independent oracle tests or unreviewed normal prototype helpers.
export default defineConfig({
  cacheDir: '.cache/vite-height',
  test: {
    include: [
      'src/physics/PhysicalSurfWater.test.ts',
      'src/physics/ownedPlainSurface.prototype.test.ts',
      'src/wave/barrel/contactHeightDemand.prototype.test.ts',
      'src/wave/barrel/contactHeightDemand.f64-replay.test.ts',
    ],
    testTimeout: 60_000,
  },
});
