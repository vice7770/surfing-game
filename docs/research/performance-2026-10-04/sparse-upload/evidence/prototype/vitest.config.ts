import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['/private/tmp/surf-sparse-upload-20261004/parity.test.ts'], testTimeout: 15_000 } });
