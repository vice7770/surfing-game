import type { SurfZoneRunner } from '../src/wave/SurfZoneRunner';

/** Bots wait this far inside the window's open edges, m, as src/net/spawn.ts keeps players. */
export const BOT_EDGE_MARGIN = 10;

/**
 * How far to slide a row of bots along shore, m, so every one waits inside the window. A spot
 * whose take-off lies near an open edge (the Reef's peak) would otherwise leave bots on flat
 * sea beyond it, which never see a crest.
 */
export function alongShift(runner: SurfZoneRunner, alongs: readonly number[]): number {
  if (alongs.length === 0) return 0;
  const xs = runner.simulation.solver.xCenters;
  const low = xs[0] + BOT_EDGE_MARGIN - (runner.focus.x + Math.min(...alongs));
  const high = xs[xs.length - 1] - BOT_EDGE_MARGIN - (runner.focus.x + Math.max(...alongs));
  if (low > 0) return low;
  if (high < 0) return high;
  return 0;
}
