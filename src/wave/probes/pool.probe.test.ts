// Probe (opt-in: PROBE=1 LOG=<file> npx vitest run <this file>): the Wave Pool's waves over its A-frame finger. Each
// column's breaking onsets (time, where, the face there: crest over the trough seaward of it) are chained outward from
// each break at the tip, one wave at a time, down both arms: the break point's speed along its line is the speed a
// surfer needs (Hutt et al. 2001: V_s = C_b / sin α), and C_b ≈ √(2 g H_b) gives the peel angle α. Then whether the
// waves repeat (the tip's face and break point, wave by wave) and whether the two arms match. POOL=key=value,…
// overrides the bed; H sets the machine's wave height at its edge, m; END the seconds simulated.
import { appendFileSync } from 'node:fs';
const log = (text: string) => appendFileSync(process.env.LOG ?? '/dev/stderr', `${text}\n`);
import { it } from 'vitest';
import { POOL, poolCrestZ, poolDepth, poolRampFootZ, poolTerraceZ, regularSignificantHeight } from '../pool';
import { orthogonalGradient } from '../Overturn';
import { SurfZoneSimulation } from '../SurfZoneSimulation';

interface Onset { t: number; z: number; face: number; depth: number; x: number; ray: number }

it.skipIf(!process.env.PROBE)('rides the Wave Pool’s waves', () => {
  for (const pair of (process.env.POOL ?? '').split(',').filter(Boolean)) {
    const [key, value] = pair.split('=');
    (POOL as Record<string, number>)[key] = Number(value);
  }
  const height = Number(process.env.H ?? 0.76);
  const config = {
    spot: 'pool' as const, seed: 1, significantHeight: regularSignificantHeight(height), peakPeriod: POOL.period,
    directionDegrees: 0, spreading: 1000, tide: 0, windSpeed: 0,
  };
  const simulation = new SurfZoneSimulation(config);
  const { solver, tank } = simulation;
  const breaking = (simulation as unknown as { breaking: { strength: Float64Array } }).breaking.strength;
  const step = Number(process.env.XSTEP ?? 4);
  const reach = Number(process.env.REACH ?? 60);
  const xs: number[] = [];
  for (let x = -reach; x <= reach + 1e-9; x += step) xs.push(Math.round(x * 10) / 10);
  // Mirror-symmetric columns: the cell centred at x + 0.5 on the right (and at the tip), at x − 0.5 on the left.
  const columns = xs.map((x) => Math.round((x + (x < 0 ? -0.5 : 0.5) - solver.xCenters[0]) / solver.dx));
  const eta = (i: number) => solver.h[i] + solver.bed[i] - solver.restLevel;
  log(`H ${height} m at the edge (Hs ${config.significantHeight.toFixed(2)}); ${JSON.stringify(POOL)}; ramp foot z ${poolRampFootZ().toFixed(0)}, terrace z ${poolTerraceZ().toFixed(0)}; tank ${JSON.stringify(tank)}; crest line ${[0, 20, 40, 60].map((x) => `${x}:${poolCrestZ(x).toFixed(0)}`).join(' ')}; grid ${solver.nx}×${solver.nz}`);
  const end = Number(process.env.END ?? 150);
  const onsets: Onset[][] = xs.map(() => []);
  const was = columns.map(() => false);
  const wall = performance.now();
  while (solver.time < end) {
    simulation.step(1 / 30);
    if (!Number.isFinite(solver.h[Math.floor(solver.h.length / 2)])) {
      log(`NaN at t ${solver.time.toFixed(1)}`);
      return;
    }
    columns.forEach((column, a) => {
      // The most seaward breaking cell in this column: the wave's own break, not the bores inside it.
      let onset = -1;
      for (let iz = 2; iz < solver.nz - 2; iz += 1) {
        if (solver.zCenters[iz] > -2) break;
        if (breaking[iz * solver.nx + column] > 0.3) { onset = iz; break; }
      }
      // Only the reef's own break: near the crest line (not the lagoon's bores or the shore break), once per wave.
      const near = onset >= 0 && solver.zCenters[onset] >= poolCrestZ(xs[a]) - 50 && solver.zCenters[onset] <= poolCrestZ(xs[a]) + 8;
      const now = near;
      const lastAt = onsets[a].length ? onsets[a][onsets[a].length - 1].t : -Infinity;
      if (now && !was[a] && solver.time - lastAt > 2) {
        let crest = -Infinity;
        let trough = Infinity;
        for (let iz = Math.max(0, onset - 60); iz < Math.min(solver.nz, onset + 20); iz += 1) {
          const z = solver.zCenters[iz];
          const e = eta(iz * solver.nx + column);
          if (Math.abs(z - solver.zCenters[onset]) <= 6) crest = Math.max(crest, e);
          if (z < solver.zCenters[onset] && z > solver.zCenters[onset] - 30) trough = Math.min(trough, e);
        }
        // The wave's own direction there, from its flux: Mead & Black's gradient is taken along it (the Reef's tool).
        const cell = onset * solver.nx + column;
        const ray = Math.atan2(solver.qx[cell], solver.qz[cell]);
        onsets[a].push({ t: solver.time, z: solver.zCenters[onset], face: crest - trough, depth: solver.restLevel - solver.bed[cell], x: xs[a], ray });
      }
      was[a] = now;
    });
  }
  log(`${(end / ((performance.now() - wall) / 1000)).toFixed(2)}× real time`);
  // Chain each tip break outward: at each next column the first onset after the last one, within `gap` s.
  const gap = Number(process.env.GAP ?? 6);
  const centre = xs.indexOf(0);
  const settled = Number(process.env.SETTLED ?? 60);
  const chain = (start: Onset, direction: 1 | -1) => {
    const found: { x: number; o: Onset }[] = [{ x: 0, o: start }];
    for (let a = centre + direction; a >= 0 && a < xs.length; a += direction) {
      const last = found[found.length - 1].o;
      const next = onsets[a].find((o) => o.t >= last.t - 0.2 && o.t <= last.t + gap);
      if (!next) break;
      found.push({ x: xs[a], o: next });
    }
    return found;
  };
  const tips = onsets[centre].filter((o) => o.t >= settled);
  log(`tip breaks after ${settled} s: ${tips.map((o) => `t ${o.t.toFixed(2)} z ${o.z.toFixed(1)} face ${o.face.toFixed(2)}`).join(' | ')}`);
  for (const tip of tips) {
    for (const direction of [1, -1] as const) {
      const found = chain(tip, direction);
      if (found.length < 3) continue;
      const first = found[0];
      const last = found[found.length - 1];
      const run = Math.hypot(last.x - first.x, last.o.z - first.o.z);
      const time = last.o.t - first.o.t;
      const faces = found.map((f) => f.o.face);
      const meanFace = faces.reduce((a, b) => a + b, 0) / faces.length;
      const speed = run / Math.max(1e-6, time);
      const celerity = Math.sqrt(2 * 9.81 * meanFace);
      const alpha = (Math.asin(Math.min(1, celerity / speed)) * 180) / Math.PI;
      // Mead & Black's X along each break's ray, over its breaking depth's band.
      const xsAlong = found.map(({ o }) => {
        const g = orthogonalGradient((s) => poolDepth(o.x + s * Math.sin(o.ray), o.z + s * Math.cos(o.ray)), o.depth, 0.5, 60);
        return g > 0 ? 1 / g : Infinity;
      });
      const finite = xsAlong.filter(Number.isFinite);
      const meanX = finite.reduce((a, b) => a + b, 0) / Math.max(1, finite.length);
      // The peak's face against the arm's 20 m away (the advisor's 1.2× check).
      const at20 = found.find((f) => Math.abs(f.x) >= 20);
      const ratio = at20 ? found[0].o.face / at20.o.face : Number.NaN;
      log(`${direction > 0 ? 'right +x' : 'left −x'} from t ${tip.t.toFixed(1)}: ${found.length} columns to x ${last.x}, ${run.toFixed(0)} m in ${time.toFixed(1)} s → V ${speed.toFixed(1)} m/s, face ${meanFace.toFixed(2)} m (${Math.min(...faces).toFixed(2)}–${Math.max(...faces).toFixed(2)}), C_b ${celerity.toFixed(1)}, α ${alpha.toFixed(0)}°, X ${meanX.toFixed(0)}, peak/20 m ${ratio.toFixed(2)} | ${found.map((f) => `${f.x}:${(f.o.t - tip.t).toFixed(1)}s z${f.o.z.toFixed(0)} ${f.o.face.toFixed(2)}`).join(' ')}`);
    }
  }
}, 3_600_000);
