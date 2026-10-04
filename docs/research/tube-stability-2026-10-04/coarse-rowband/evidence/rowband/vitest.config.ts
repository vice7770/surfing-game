import { defineConfig } from '/Users/regina/Desktop/Projects/surfing-game/node_modules/vitest/dist/config.js';
// @ts-expect-error The source-only QA guard has no generated declaration file.
import { assertAuthority } from './check-authority.mjs';
assertAuthority();
export default defineConfig({
  root: '/private/tmp/surf-tube-fallback-rowband-20261004',
  resolve: { preserveSymlinks: true },
  cacheDir: '/private/tmp/surf-tube-fallback-rowband-20261004/.cache/vite',
  test: {
    include: ['check/src/scene/WaterSurface.test.ts', 'check/src/scene/barrel/SweptBarrelMesh.test.ts', 'check/src/scene/barrel/SweptBarrel.test.ts', 'check/src/scene/barrel/fallbackRows.test.ts'],
    testTimeout: 60_000,
  },
});
