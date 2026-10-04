import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['full-writer.test.ts', 'existing-snapshot.test.ts'], maxWorkers: 1 } });
