import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: { include: ['tests/formationWeight.test.ts'], environment: 'node', pool: 'forks', maxWorkers: 1 },
});
