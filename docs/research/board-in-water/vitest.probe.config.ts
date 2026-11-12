// Runs this folder's probes only (the suite excludes docs/**). From the repo root:
//   npx vitest run --config docs/research/board-in-water/vitest.probe.config.ts <probe name>
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { testTimeout: 600_000, include: ['docs/research/board-in-water/*.probe.ts'] },
});
