// Runs the A-lite probes only (the suite excludes docs/**). From the repo root:
//   OUT=/tmp/out.jsonl npx vitest run --config docs/research/board-in-water/a-lite/vitest.probe.config.ts <probe name>
// LEG_POWER=cap runs them with the switch on.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { testTimeout: 600_000, include: ['docs/research/board-in-water/a-lite/*.probe.ts'] },
});
