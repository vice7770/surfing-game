// Runs the B-wall probes only (the suite excludes docs/**). From the repo root:
//   OUT=/tmp/out.jsonl npx vitest run --config docs/research/board-in-water/b-wall/vitest.probe.config.ts bars
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { testTimeout: 600_000, include: ['docs/research/board-in-water/b-wall/*.probe.ts'] },
});
