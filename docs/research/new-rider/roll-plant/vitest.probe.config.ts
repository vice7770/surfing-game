// Runs this folder's probes only (the suite excludes docs/**). From the repo root:
//   npx vitest run --config docs/research/new-rider/roll-plant/vitest.probe.config.ts <probe name>
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { testTimeout: 1_800_000, include: ['docs/research/new-rider/roll-plant/*.probe.ts'] },
});
