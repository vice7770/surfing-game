// Runs the new surfer's step 3.1 probes only (the suite excludes docs/**). From the repo root:
//   OUT=/tmp/out.jsonl RIDER=new npx vitest run --config docs/research/new-rider/3.1/vitest.probe.config.ts bars
// RIDER=new runs them with `rider: 'new'` (`../../board-in-water/lab.ts` reads it); without it, the old rider.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { testTimeout: 1_200_000, include: ['docs/research/new-rider/3.1/*.probe.ts'] },
});
