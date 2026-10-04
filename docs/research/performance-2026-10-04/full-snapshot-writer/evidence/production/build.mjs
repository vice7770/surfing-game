import { build } from '/Users/regina/Desktop/Projects/surfing-game/node_modules/vite/dist/node/index.js';
const root = '/Users/regina/Desktop/Projects/surfing-game';
if (process.env.BUILD_ID !== '306258296') throw Error('Measured build ID required');
await build({ root, configFile: root + '/vite.config.ts', configLoader: 'runner', cacheDir: '/private/tmp/surf-full-writer-adoption-20261004/.cache/vite', build: { outDir: '/private/tmp/surf-full-writer-adoption-20261004/dist', copyPublicDir: false, emptyOutDir: false } });
