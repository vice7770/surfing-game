import { defineConfig } from 'vitest/config';

// The physics suites step whole surf zones; under a parallel run several take
// longer than Vitest's 5 s default, though each passes alone in a few seconds.
// On a busy machine (load 12–16) a dozen of them take 25–45 s, so the default
// leaves room for that.
export default defineConfig({ test: { testTimeout: 60_000 } });
