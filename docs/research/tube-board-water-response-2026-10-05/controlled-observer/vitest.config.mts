import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: '/private/tmp/tube-board-rhs-components-observer-20261005',
  test: {
    include: ['tests/trialBalance.components-parity.test.ts'],
    maxWorkers: 1,
    environment: 'node',
  },
});
