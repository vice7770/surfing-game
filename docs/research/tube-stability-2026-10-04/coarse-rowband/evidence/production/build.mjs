import { build } from '/Users/regina/Desktop/Projects/surfing-game/node_modules/vite/dist/node/index.js';
const root = '/Users/regina/Desktop/Projects/surfing-game';
if (process.env.BUILD_ID !== '306258296') throw new Error('Expected measured build ID');
await build({ root, configFile: root + '/vite.config.ts', configLoader: 'runner', cacheDir: '/private/tmp/surf-rowband-adoption-20261004/root-final/.cache/vite', build: { outDir: '/private/tmp/surf-rowband-adoption-20261004/root-final/dist', copyPublicDir: false, emptyOutDir: false } });
