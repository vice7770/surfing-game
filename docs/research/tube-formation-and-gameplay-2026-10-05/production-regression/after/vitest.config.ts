import { defineConfig } from 'vitest/config';
export default defineConfig({ root: "/private/tmp/tube-c-formation-production-tests-20261005/after", test: { include: ['regression.test.ts'], environment: 'node', pool: 'forks', maxWorkers: 1 } });
