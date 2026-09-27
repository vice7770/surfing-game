import { execSync } from 'node:child_process';
import { defineConfig, type Plugin } from 'vite';

/** The build's id (spec N1): a room only takes players on the build that created it. */
function buildId(command: 'build' | 'serve'): string {
  if (process.env.BUILD_ID) return process.env.BUILD_ID;
  if (command === 'serve') return 'dev';
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim() || 'unknown';
  } catch {
    return 'unknown';
  }
}

/** Writes `build.json` beside the built game, which the room server reads. */
function buildManifest(build: string): Plugin {
  return {
    name: 'breakline-build-id',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'build.json', source: JSON.stringify({ build }) });
    },
  };
}

export default defineConfig(({ command }) => {
  const build = buildId(command);
  return {
    define: { __BUILD_ID__: JSON.stringify(build) },
    plugins: [buildManifest(build)],
    // `npm run dev` beside `npm run server:dev`: the page's rooms go to the room server.
    server: { proxy: { '/ws': { target: 'ws://localhost:8787', ws: true } } },
  };
});
