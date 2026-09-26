import { defineConfig } from 'vitest/config';

// The physics suites step whole surf zones; under a parallel run several take
// longer than Vitest's 5 s default, though each passes alone in a few seconds.
export default defineConfig({ test: { testTimeout: 30_000 } });
