// Probe (opt-in: PROBE=1 LOG=<file> npx vitest run <this file>): does the crest's phase run along Padang Padang's ramp at c/sin φ, and are the waves the same size along it?
import { appendFileSync } from 'node:fs';
const log = (text: string) => appendFileSync(process.env.LOG ?? '/dev/stderr', `${text}\n`);
import { it } from 'vitest';
import { SIDE_FEED } from '../SideFeed';
import { PADANG } from '../Bathymetry';
import { SurfZoneSimulation, tankDepth } from '../SurfZoneSimulation';
import { ledgePeel } from '../ledgePeel';

it.skipIf(!process.env.PROBE)('probes the phase and height along Padang Padang’s contours', () => {
  for (const pair of (process.env.PADANG ?? '').split(',').filter(Boolean)) {
    const [key, value] = pair.split('=');
    (PADANG as Record<string, number>)[key] = Number(value);
  }
  if (process.env.NOFEED) SIDE_FEED.width = 0;
  const spreading = Number(process.env.SPREADING ?? 150);
  const direction = Number(process.env.DIRECTION ?? 0);
  const config = { spot: 'padang' as const, seed: 1, significantHeight: 1.6, peakPeriod: 16, directionDegrees: direction, spreading, tide: 0, windSpeed: 0, componentCount: 24, ...(process.env.BANDWIDTH ? { bandwidth: Number(process.env.BANDWIDTH) } : {}) };
  const simulation = new SurfZoneSimulation(config);
  const { solver } = simulation;
  const predicted = ledgePeel({ period: 16, deepDepth: PADANG.deep, shelfDepth: PADANG.baseDepth, breakDepth: 3, swellDegrees: direction, ledgeDegrees: PADANG.angle });
  const xs = [-60, -30, 0, 30, 60];
  const depths = (process.env.DEPTHS ?? '5,3').split(',').map(Number);
  // Where each contour crosses each x: scanning in from the edge, the first z at that still depth.
  const cells = depths.map((depth) => xs.map((x) => {
    let z = simulation.tank.zoneInner;
    while (tankDepth(simulation.spot, simulation.tank.edgeDepth, x, z, simulation.tank) > depth) z += 0.25;
    const column = Math.round((x - solver.xCenters[0]) / solver.dx);
    let row = 0;
    while (row < solver.nz - 1 && solver.zCenters[row] < z) row += 1;
    return { x, z, index: row * solver.nx + column };
  }));
  log(`predicted along-edge phase speed ${predicted.peelSpeed.toFixed(1)} m/s (φ ${predicted.crestToLedgeDegrees.toFixed(0)}°); contours: ${cells.map((row, k) => `${depths[k]} m at z ${row.map((c) => c.z.toFixed(0)).join('/')}`).join('; ')}`);
  const eta = (i: number) => solver.h[i] + solver.bed[i] - solver.restLevel;
  const history = cells.map((row) => row.map(() => [] as number[]));
  const dt = 0.1;
  const seconds = 160;
  for (let k = 0; k < seconds / dt; k += 1) {
    for (let s = 0; s < 3; s += 1) simulation.step(dt / 3);
    cells.forEach((row, a) => row.forEach((cell, b) => history[a][b].push(eta(cell.index))));
  }
  cells.forEach((row, a) => {
    // Crest times at each x: local maxima above 0.3 m.
    const crests = row.map((_, b) => {
      const series = history[a][b];
      const times: number[] = [];
      for (let t = 1; t < series.length - 1; t += 1) if (series[t] > 0.3 && series[t] >= series[t - 1] && series[t] > series[t + 1]) times.push(t * dt);
      return times;
    });
    const heights = row.map((_, b) => {
      return 4 * Math.sqrt(history[a][b].reduce((sum, v) => sum + v * v, 0) / history[a][b].length);
    });
    const crestTops = row.map((_, b) => {
      const series = history[a][b];
      const tops = crests[b].map((t) => series[Math.round(t / dt)]).sort((p, q) => q - p);
      const top = tops.slice(0, Math.max(1, Math.ceil(tops.length / 3)));
      return top.reduce((p, q) => p + q, 0) / top.length;
    });
    // The steepest rise before each crest, m/s: the front's steepness times its speed.
    const rises = row.map((_, b) => {
      const series = history[a][b];
      const values: number[] = [];
      for (const t of crests[b]) {
        const i = Math.round(t / dt);
        let most = 0;
        for (let j = Math.max(1, i - 40); j <= i; j += 1) most = Math.max(most, (series[j] - series[j - 1]) / dt);
        values.push(most);
      }
      const top = values.sort((p, q) => q - p).slice(0, Math.max(1, Math.ceil(values.length / 3)));
      return top.reduce((p, q) => p + q, 0) / top.length;
    });
    log(`${depths[a]} m contour: Hm0 by x ${row.map((c, b) => `${c.x}:${heights[b].toFixed(2)}`).join(' ')} | crest top (highest third) ${crestTops.map((v) => v.toFixed(2)).join('/')} | steepest rise ${rises.map((v) => v.toFixed(2)).join('/')} m/s`);
    // Follow each crest at the first x to the next crest arrival at each later x (within 8 s), and fit its along-edge speed.
    for (const t0 of crests[0].slice(2, 9)) {
      const arrivals = [t0];
      for (let b = 1; b < row.length; b += 1) {
        const next = crests[b].find((t) => t >= arrivals[b - 1] - 2 && t <= arrivals[b - 1] + 8);
        if (next === undefined) break;
        arrivals.push(next);
      }
      if (arrivals.length < row.length) { log(`  crest at ${t0.toFixed(1)} s: lost after ${arrivals.length} points`); continue; }
      const alongs = row.map((c) => Math.hypot(c.x - row[0].x, c.z - row[0].z));
      const n = row.length;
      const meanS = alongs.reduce((p, q) => p + q, 0) / n;
      const meanT = arrivals.reduce((p, q) => p + q, 0) / n;
      let sst = 0;
      let ss = 0;
      alongs.forEach((s, b) => { sst += (s - meanS) * (arrivals[b] - meanT); ss += (s - meanS) ** 2; });
      log(`  crest at ${t0.toFixed(1)} s: arrivals ${arrivals.map((t) => (t - t0).toFixed(1)).join('/')} s → along-contour speed ${(ss / sst).toFixed(1)} m/s`);
    }
  });
}, 3_600_000);
