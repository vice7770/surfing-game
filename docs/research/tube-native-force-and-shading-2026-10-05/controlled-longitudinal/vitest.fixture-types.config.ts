import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['tests/landingCompliance.fixture-types.test.ts'], cache: false, maxWorkers: 1 } });
