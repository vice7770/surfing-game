import { defineConfig } from 'vitest/config';
export default defineConfig({root:"/private/tmp/tube-C-two-branch-inner-contour-20261005/source",test:{include:['src/wave/barrel/sharedUpperRoot.test.ts','src/wave/barrel/boundedCProfile.test.ts'],maxWorkers:1,environment:'node'}});
