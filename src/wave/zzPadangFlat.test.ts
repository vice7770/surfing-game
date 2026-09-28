// Scratch probe (untracked): does a swell injected at a 10 m edge keep its shape over a flat 10 m bed?
import { it } from 'vitest';
import { PADANG } from './Bathymetry';
import { SurfZoneSimulation } from './SurfZoneSimulation';

it('probes a 16 s swell over a flat 10 m bed, by distance from the tank’s edge', () => {
  PADANG.crestDepth = PADANG.platformDepth;
  const config = {
    spot: 'padang' as const, seed: 1, significantHeight: 1.6, peakPeriod: 16, directionDegrees: 0, spreading: 150, tide: 0, windSpeed: 0, componentCount: 24,
    ...(process.env.BANDWIDTH ? { bandwidth: Number(process.env.BANDWIDTH) } : {}),
  };
  const simulation = new SurfZoneSimulation(config);
  const { solver } = simulation;
  const zoneInner = simulation.tank.zoneInner;
  const distances = [10, 40, 80, 120, 160, 200, 240];
  const column = Math.round((0 - solver.xCenters[0]) / solver.dx);
  const cells = distances.map((d) => {
    let row = 0;
    while (row < solver.nz - 1 && solver.zCenters[row] < zoneInner + d) row += 1;
    return row * solver.nx + column;
  });
  const eta = (i: number) => solver.h[i] + solver.bed[i] - solver.restLevel;
  const history = cells.map(() => [] as number[]);
  const dt = 0.1;
  for (let k = 0; k < 160 / dt; k += 1) {
    for (let s = 0; s < 3; s += 1) simulation.step(dt / 3);
    cells.forEach((cell, a) => history[a].push(eta(cell)));
  }
  const rows = distances.map((d, a) => {
    const series = history[a];
    const hm0 = 4 * Math.sqrt(series.reduce((sum, v) => sum + v * v, 0) / series.length);
    const crests: number[] = [];
    const troughs: number[] = [];
    for (let t = 1; t < series.length - 1; t += 1) {
      if (series[t] > 0.2 && series[t] >= series[t - 1] && series[t] > series[t + 1]) crests.push(series[t]);
      if (series[t] < -0.1 && series[t] <= series[t - 1] && series[t] < series[t + 1]) troughs.push(series[t]);
    }
    const third = (values: number[]) => {
      const top = [...values].sort((p, q) => Math.abs(q) - Math.abs(p)).slice(0, Math.max(1, Math.ceil(values.length / 3)));
      return top.reduce((p, q) => p + q, 0) / top.length;
    };
    const mean = series.reduce((p, q) => p + q, 0) / series.length;
    const skew = series.reduce((p, q) => p + (q - mean) ** 3, 0) / series.length / ((hm0 / 4) ** 3);
    return `${d} m in: Hm0 ${hm0.toFixed(2)}, crest ${third(crests).toFixed(2)}, trough ${third(troughs).toFixed(2)}, skewness ${skew.toFixed(2)}`;
  });
  console.log(`flat ${PADANG.platformDepth} m bed, 16 s, Hs 1.6 m deep: \n${rows.join('\n')}`);
}, 3_600_000);
