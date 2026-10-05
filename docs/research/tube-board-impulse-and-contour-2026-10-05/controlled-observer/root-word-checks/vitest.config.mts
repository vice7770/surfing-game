import { defineConfig } from 'vitest/config';
export default defineConfig({ root: "/private/tmp/tube-native-trial-balance-observer-20261005", test: { include: ['tests/trialBalance.parity-words.test.ts'], environment: 'node', maxWorkers: 1 } });
