// Probe (opt-in): each spot's breaking zone for the swept barrel's rollout (Padang Padang Part B, PR 7).
//   PROBE=1 PART=geometry LOG=<file> npx vitest run src/wave/probes/everySpot.probe.test.ts
//   PROBE=1 PART=crests SPOTS=canyon SWELLS=big SECONDS=180 LOG=<file> npx vitest run src/wave/probes/everySpot.probe.test.ts
// geometry: per spot and Surf-screen swell (mid tide, calm), the take-off (the peak), its still depth, the sets' breaker
// depth, the bed's slope over half a wavelength offshore along the contours' normal (O'Dea et al. 2021's predictor),
// Mead & Black's orthogonal gradient over the breaking depth ± 2.5 m (the game's own `orthogonalGradient`), the fine
// zone's start, and the path's depths from the tank's edge to the shore (for the Navier–Stokes transects).
// crests: the sea's crest heights above still water as they pass candidate foot depths on the take-off transect (zero
// up-crossings, five columns 20 m apart), so each swell reads as A0 = crest / depth.
import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { createSpot, type SpotName } from '../Bathymetry';
import { orthogonalGradient } from '../Overturn';
import { SETS_OVER_TYPICAL, komarGaughan } from '../surfForecast';
import { BREAKER_INDEX } from '../SwellReadout';
import { SurfZoneSimulation, edgeHeight, takeOffPoint, tankDepth, tankLayout, type SurfZoneConfig } from '../SurfZoneSimulation';
import { waveKinematics } from '../dispersion';
import { physicalSettingsFor, type SwellSize } from '../../game/SurfConditions';
import { swellFor } from '../../game/PhysicalMode';

const log = (text: string) => appendFileSync(process.env.LOG ?? '/dev/stderr', `${text}\n`);
const list = <T extends string>(value: string | undefined, fallback: readonly T[]) => (value ? value.split(',') as T[] : [...fallback]);
const SPOTS = list<SpotName>(process.env.SPOTS, ['canyon', 'point', 'beach', 'reef']);
const SWELLS = list<SwellSize>(process.env.SWELLS, ['practice', 'small', 'medium', 'big']);

/** The Surf screen's sea for a spot and swell at mid tide in calm air, as PhysicalMode.start builds it (CPU, stage 2). */
function configFor(spot: SpotName, swell: SwellSize, seed: number): SurfZoneConfig {
  const settings = physicalSettingsFor(spot, { swell, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'cpu' });
  const input = swellFor(settings);
  return {
    spot, seed, significantHeight: input.significantHeight, peakPeriod: input.peakPeriod,
    directionDegrees: input.directionDegrees ?? settings.directionDegrees, spreading: input.spreading, bandwidth: input.bandwidth,
    tide: settings.tide, windSpeed: settings.windSpeed, stage: 2, compute: 'cpu',
    ...(settings.source === 'practice' ? { heightAt: 'edge' as const } : {}),
  };
}

/** The spot's still depth (at the config's tide) and the shoreward normal to its contours at a point. */
function bedOf(config: SurfZoneConfig) {
  const tank = tankLayout(config);
  const spot = createSpot(config.spot, config.seed);
  const depth = (x: number, z: number) => tankDepth(spot, tank.edgeDepth, x, z, tank) + config.tide;
  const normal = (x: number, z: number) => {
    const e = 0.5;
    const gx = (depth(x + e, z) - depth(x - e, z)) / (2 * e);
    const gz = (depth(x, z + e) - depth(x, z - e)) / (2 * e);
    const g = Math.hypot(gx, gz);
    return { x: -gx / g, z: -gz / g, gradient: g };
  };
  return { tank, depth, normal };
}

const f = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '—');
const ratio = (slope: number) => (slope > 0 ? `1:${(1 / slope).toFixed(1)}` : '—');

it.skipIf(!process.env.PROBE || (process.env.PART ?? 'geometry') !== 'geometry')('each spot’s breaking zone', () => {
  const seed = Number(process.env.SEED ?? 1);
  log('spot | swell | Hs, Tp, dir | edge depth | fine zone from z (depth) | take-off x, z | depth there | sets break depth | L there | contours’ normal (x, z) | O’Dea slope, normal | O’Dea slope, cross-shore | Mead & Black gradient (±2.5 m) | local gradient');
  for (const spot of SPOTS) {
    for (const swell of SWELLS) {
      const config = configFor(spot, swell, seed);
      const { tank, depth, normal } = bedOf(config);
      const peak = takeOffPoint(config);
      const db = depth(peak.x, peak.z);
      const n = normal(peak.x, peak.z);
      const setsDepth = (SETS_OVER_TYPICAL * komarGaughan(config.significantHeight, config.peakPeriod)) / BREAKER_INDEX;
      const L = waveKinematics(config.peakPeriod, db).wavelength;
      const along = (s: number) => depth(peak.x + s * n.x, peak.z + s * n.z);
      const odea = (along(-L / 2) - along(0)) / (L / 2);
      const cross = (depth(peak.x, peak.z - L / 2) - db) / (L / 2);
      // Depths to the micrometre: the Reef's pass adds a 1e-11 m Gaussian tail to its flat, which `orthogonalGradient`
      // reads as the bed still climbing, so its walk ran on to the flat's far end (1:8.4 for the ledge's 1:2.3).
      const gradient = orthogonalGradient((s) => {
        const z = peak.z + s * n.z;
        return z < tank.offshore || z > tank.shore ? Number.NaN : Math.round(along(s) * 1e6) / 1e6;
      }, db, 0.25, 400);
      log([
        spot, swell, `${config.significantHeight} m, ${config.peakPeriod} s, ${config.directionDegrees}°${config.heightAt === 'edge' ? ' (edge)' : ''}`,
        `${f(tank.edgeDepth)} m (Hs there ${f(edgeHeight(config, tank.edgeDepth))})`, `${tank.fineFrom} (${f(depth(peak.x, tank.fineFrom))} m)`,
        `${f(peak.x, 1)}, ${f(peak.z, 1)}`, `${f(db)} m`, `${f(setsDepth)} m`, `${f(L, 1)} m`, `${f(n.x)}, ${f(n.z)}`,
        `${f(odea, 4)} (${ratio(odea)})`, `${f(cross, 4)} (${ratio(cross)})`, `${f(gradient, 4)} (${ratio(gradient)})`, `${f(n.gradient, 4)} (${ratio(n.gradient)})`,
      ].join(' | '));
    }
    // The path's depths along the contours' normal through the Practice take-off, from the tank's edge in (the Navier–Stokes transect).
    const config = configFor(spot, 'practice', seed);
    const { tank, depth, normal } = bedOf(config);
    const peak = takeOffPoint(config);
    const n = normal(peak.x, peak.z);
    const samples: string[] = [];
    for (let s = (tank.zoneInner - peak.z) / Math.max(0.2, n.z); s <= (tank.shore - peak.z) / Math.max(0.2, n.z); s += 5) {
      const d = depth(peak.x + s * n.x, peak.z + s * n.z);
      if (d < 0) break;
      samples.push(`${f(s, 0)}:${f(d)}`);
    }
    log(`${spot} path (m from the Practice take-off along the normal : still depth m): ${samples.join(' ')}`);
  }
}, 600_000);

it.skipIf(!process.env.PROBE || process.env.PART !== 'crests')('each spot’s crests at candidate foot depths', () => {
  const seed = Number(process.env.SEED ?? 1);
  const seconds = Number(process.env.SECONDS ?? 180);
  const depths = (process.env.DEPTHS ?? '2.5,3,3.5,4,4.5,5,6,7,8,10').split(',').map(Number);
  for (const spot of SPOTS) {
    for (const swell of SWELLS) {
      const config = configFor(spot, swell, seed);
      const started = performance.now();
      const simulation = new SurfZoneSimulation(config);
      const { solver } = simulation;
      const peak = takeOffPoint(config);
      const columns = [-40, -20, 0, 20, 40]
        .map((dx) => Math.round((peak.x + dx - solver.xCenters[0]) / solver.dx))
        .filter((column) => column >= 3 && column < solver.nx - 3);
      // Per column and candidate depth, the first row (from offshore) at or shallower than it.
      const cells = depths.map((d) => columns.map((column) => {
        for (let iz = 0; iz < solver.nz; iz += 1) {
          const i = iz * solver.nx + column;
          if (solver.restLevel - solver.bed[i] <= d) return i;
        }
        return -1;
      }));
      const crests = depths.map(() => [] as number[]);
      const state = depths.map(() => columns.map(() => ({ up: false, max: -Infinity, started: false, previous: 0 })));
      const spinUp = solver.time;
      let steps = 0;
      while (solver.time < spinUp + seconds) {
        simulation.step(1 / 30);
        steps += 1;
        for (let k = 0; k < depths.length; k += 1) {
          for (let c = 0; c < columns.length; c += 1) {
            const i = cells[k][c];
            if (i < 0) continue;
            const eta = solver.h[i] + solver.bed[i] - solver.restLevel;
            const s = state[k][c];
            if (s.previous <= 0 && eta > 0) {
              // A zero up-crossing ends the wave before it: its crest is the highest water since the last one.
              if (s.started && Number.isFinite(s.max)) crests[k].push(s.max);
              s.started = true;
              s.max = eta;
            } else if (eta > s.max) s.max = eta;
            s.previous = eta;
          }
        }
      }
      const wall = (performance.now() - started) / 1000;
      for (let k = 0; k < depths.length; k += 1) {
        const values = crests[k].sort((a, b) => a - b);
        if (values.length === 0 || cells[k].every((i) => i < 0)) continue;
        const q = (p: number) => values[Math.min(values.length - 1, Math.floor(p * values.length))];
        const top = values.slice(Math.floor(0.9 * values.length));
        const tenth = top.reduce((a, b) => a + b, 0) / top.length;
        const zs = cells[k].filter((i) => i >= 0).map((i) => solver.zCenters[Math.floor(i / solver.nx)]);
        log([
          spot, swell, `${depths[k]} m`, `z ${f(Math.min(...zs), 0)}…${f(Math.max(...zs), 0)}`, `${values.length} crests`,
          `median ${f(q(0.5))} (A0 ${f(q(0.5) / depths[k], 3)})`, `90 % ${f(q(0.9))} (A0 ${f(q(0.9) / depths[k], 3)})`,
          `C1/10 ${f(tenth)} (A0 ${f(tenth / depths[k], 3)})`, `max ${f(values[values.length - 1])} (A0 ${f(values[values.length - 1] / depths[k], 3)})`,
        ].join(' | '));
      }
      log(`${spot} ${swell}: ${seconds} s of sea after the spin-up in ${f(wall, 0)} s wall (${steps} steps)`);
    }
  }
}, 14_400_000);
