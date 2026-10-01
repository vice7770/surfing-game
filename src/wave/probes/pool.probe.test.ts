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
  // LINE=1: also sample the break line itself, the arm's face where it is LINE_DEPTH deep (both arms, every LINE_STEP
  // of x): each wave's arrival there, by arc length from the tip, shows the peel along the arm whatever its angle.
  const lineDepth = Number(process.env.LINE_DEPTH ?? 1.5);
  const lineStep = Number(process.env.LINE_STEP ?? 3);
  const lineCells: { x: number; z: number; s: number; cells: number[] }[] = [];
  if (process.env.LINE) {
    for (const side of [1, -1]) {
      let arc = 0;
      let previous: { x: number; z: number } | undefined;
      for (let u = 0; u <= reach + 1e-9; u += lineStep) {
        const x = side * u;
        // Seaward of the crest line until the bed is lineDepth deep.
        let z = poolCrestZ(x);
        while (poolDepth(x, z) < lineDepth && z > poolCrestZ(x) - 80) z -= 0.25;
        if (previous) arc += Math.hypot(x - previous.x, z - previous.z);
        previous = { x, z };
        const ix = Math.round((x + (x < 0 ? -0.5 : 0.5) - solver.xCenters[0]) / solver.dx);
        let iz = 0;
        while (iz < solver.nz - 1 && solver.zCenters[iz] < z) iz += 1;
        const cells: number[] = [];
        for (let dz = -2; dz <= 2; dz += 1) for (let dx = -1; dx <= 1; dx += 1) cells.push((iz + dz) * solver.nx + ix + dx);
        lineCells.push({ x, z, s: side * arc, cells });
      }
    }
  }
  const lineOnsets: number[][] = lineCells.map(() => []);
  // Each line onset's face: the crest within 6 m of the sample over the trough 30 m seaward of it, in its column.
  const lineFaces: number[][] = lineCells.map(() => []);
  const faceAt = (cell: number) => {
    const column = cell % solver.nx;
    const row = Math.floor(cell / solver.nx);
    let crest = -Infinity;
    let trough = Infinity;
    for (let iz = Math.max(0, row - 60); iz < Math.min(solver.nz, row + 20); iz += 1) {
      const z = solver.zCenters[iz];
      const e = eta(iz * solver.nx + column);
      if (Math.abs(z - solver.zCenters[row]) <= 6) crest = Math.max(crest, e);
      if (z < solver.zCenters[row] && z > solver.zCenters[row] - 30) trough = Math.min(trough, e);
    }
    return crest - trough;
  };
  const lineWas = lineCells.map(() => false);
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
    lineCells.forEach((sample, a) => {
      const now = sample.cells.some((cell) => breaking[cell] > 0.3);
      const lastAt = lineOnsets[a].length ? lineOnsets[a][lineOnsets[a].length - 1] : -Infinity;
      if (now && !lineWas[a] && solver.time - lastAt > 3) {
        lineOnsets[a].push(solver.time);
        lineFaces[a].push(faceAt(sample.cells[7]));
      }
      lineWas[a] = now;
    });
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
  const settled = Number(process.env.SETTLED ?? 60);
  // The raw break-line onsets first, so nothing measured is lost to a mistake in the summary below.
  if (lineCells.length) log(`line raw ${JSON.stringify(lineCells.map((c, a) => ({ x: c.x, z: Math.round(c.z), s: Math.round(c.s), t: lineOnsets[a].map((t) => Math.round(t * 10) / 10), f: lineFaces[a].map((f) => Math.round(f * 100) / 100) })))}`);
  // The break line, wave by wave: for each break at the tip after settling, each sample's first onset within the
  // next 30 s (or none), by arc length along the arm; then the close-out (arrivals within 1 s of the tip), the gaps,
  // and the speed along the line past the close-out.
  if (lineCells.length) {
    const tipIndex = lineCells.findIndex((c) => c.x === 0);
    for (const tipTime of lineOnsets[tipIndex].filter((t) => t >= settled)) {
      for (const side of [1, -1]) {
        const samples = lineCells.map((c, a) => ({ c, t: lineOnsets[a].find((t) => t >= tipTime - 1 && t <= tipTime + 30) }))
          .filter(({ c }) => Math.sign(c.s) === side || c.x === 0).sort((p, q) => Math.abs(p.c.s) - Math.abs(q.c.s));
        const hits = samples.filter((p) => p.t !== undefined) as { c: (typeof lineCells)[number]; t: number }[];
        const closeout = Math.max(0, ...hits.filter((p) => p.t - tipTime <= 1).map((p) => Math.abs(p.c.x)));
        const missing = samples.filter((p) => p.t === undefined).map((p) => Math.abs(p.c.x));
        const past = hits.filter((p) => Math.abs(p.c.x) > closeout);
        const last = hits[hits.length - 1];
        const fit = past.length >= 2 ? (Math.abs(past[past.length - 1].c.s) - Math.abs(past[0].c.s)) / Math.max(1e-6, past[past.length - 1].t - past[0].t) : Number.NaN;
        log(`line ${side > 0 ? 'right' : 'left'} from tip t ${tipTime.toFixed(1)}: close-out ±${closeout} m; last break at |x| ${last ? Math.abs(last.c.x) : 0} (${last ? Math.abs(last.c.s).toFixed(0) : 0} m along) after ${last ? (last.t - tipTime).toFixed(1) : 0} s; along the line past the close-out ${fit.toFixed(1)} m/s; no break at |x| ${missing.join(',') || '—'} | ${samples.map((p) => `${Math.abs(p.c.x)}:${p.t === undefined ? '—' : (p.t - tipTime).toFixed(1)}`).join(' ')}`);
      }
    }
  }
  // Chain each tip break outward: at each next column the first onset after the last one, within `gap` s.
  const gap = Number(process.env.GAP ?? 6);
  const centre = xs.indexOf(0);
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
  // DUMP=1: every column's breaks after the settling time, to see where the arms break and when.
  if (process.env.DUMP) {
    xs.forEach((x, a) => {
      if (x < 0) return;
      log(`x ${x} (crest line z ${poolCrestZ(x).toFixed(0)}): ${onsets[a].filter((o) => o.t >= settled).map((o) => `t ${o.t.toFixed(1)} z ${o.z.toFixed(0)} d ${o.depth.toFixed(2)} f ${o.face.toFixed(2)}`).join(' | ')}`);
    });
  }
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
      // Along the arm alone, past the tip's section (|x| ≥ 20): the speed a surfer needs there and its peel angle.
      const armStart = found.find((f) => Math.abs(f.x) >= 20);
      const armRun = armStart ? Math.hypot(last.x - armStart.x, last.o.z - armStart.o.z) : 0;
      const armTime = armStart ? last.o.t - armStart.o.t : 0;
      const armSpeed = armTime > 0 ? armRun / armTime : Number.NaN;
      const armAlpha = (Math.asin(Math.min(1, celerity / armSpeed)) * 180) / Math.PI;
      // The tip's close-out: how far out the break reached within 1 s of the tip.
      const closeout = Math.max(...found.filter((f) => f.o.t - first.o.t <= 1).map((f) => Math.abs(f.x)));
      // The peak's face against the arm's 20 m away (the advisor's 1.2× check).
      const at20 = found.find((f) => Math.abs(f.x) >= 20);
      const ratio = at20 ? found[0].o.face / at20.o.face : Number.NaN;
      log(`${direction > 0 ? 'right +x' : 'left −x'} from t ${tip.t.toFixed(1)}: ${found.length} columns to x ${last.x}, ${run.toFixed(0)} m in ${time.toFixed(1)} s → V ${speed.toFixed(1)} m/s, face ${meanFace.toFixed(2)} m (${Math.min(...faces).toFixed(2)}–${Math.max(...faces).toFixed(2)}), C_b ${celerity.toFixed(1)}, α ${alpha.toFixed(0)}°; along the arm V ${armSpeed.toFixed(1)} m/s α ${armAlpha.toFixed(0)}°; close-out ±${closeout} m; X ${meanX.toFixed(0)}, peak/20 m ${ratio.toFixed(2)} | ${found.map((f) => `${f.x}:${(f.o.t - tip.t).toFixed(1)}s z${f.o.z.toFixed(0)} ${f.o.face.toFixed(2)}`).join(' ')}`);
    }
  }
}, 3_600_000);
