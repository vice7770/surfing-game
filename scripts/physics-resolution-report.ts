/**
 * Bounded CPU resolution comparison for the performance work. A 40 m Padang Big
 * window starts from the same warm WKB sea at both resolutions; this is an early
 * quality screen, not the full-window, settled surf-height calibration.
 *
 * npx rolldown scripts/physics-resolution-report.ts -o /tmp/physics-resolution.mjs --format esm --platform node
 * node /tmp/physics-resolution.mjs --seconds 24 --out /tmp/physics-resolution.json
 */
import { writeFileSync } from 'node:fs';
import { PhysicalSurfWater } from '../src/physics/PhysicalSurfWater';
import { createWaterSample } from '../src/physics/SurfWater';
import { sampleCubicSurface } from '../src/scene/water/cubicSurface';
import { BoussinesqSolver } from '../src/wave/BoussinesqSolver';
import { SurfMeter, highestMean } from '../src/wave/SurfMeter';
import { SurfZoneSimulation, windOnsetScale, type SurfZoneConfig } from '../src/wave/SurfZoneSimulation';

const option = (name: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
};
const seconds = Number(option('seconds') ?? 24);
const winds = (option('winds') ?? '0').split(',').map(Number);
const coarseDx = Number(option('coarse-dx') ?? 2);
const coarseDz = Number(option('coarse-dz') ?? 1.5);
if (!(seconds > 0 && coarseDx > 0 && coarseDz > 0) || winds.some((wind) => !Number.isFinite(wind))) throw new Error('Invalid seconds, resolution or winds.');
const STEP = 1 / 60;
const SAMPLE_EVERY = 6;
const config: SurfZoneConfig = {
  spot: 'padang', seed: 1, significantHeight: 3.8, peakPeriod: 18, directionDegrees: 0, spreading: 150, tide: 0,
  alongShore: 40, componentCount: 8, spinUpPeriods: 0, compute: 'cpu',
};
const resolutions = [{ name: 'fine', dx: 1, fineSpacing: 1 }, { name: 'coarse', dx: coarseDx, fineSpacing: coarseDz }];
const mean = (values: readonly number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const peak = (values: readonly number[]) => values.length ? Math.max(...values) : null;

interface Measurement {
  name: string;
  windSpeed: number;
  cells: number;
  dx: number;
  fineSpacing: number;
  timeMs: number;
  stepMs: number | null;
  stagesMs: Record<string, number | null>;
  finite: boolean;
  onsetScale: number;
  breakPoint: { x: number; z: number };
  waves: ReturnType<SurfMeter['waves']>;
  faceHighestThird: number | null;
  firstJoined: number | null;
  firstThrown: number | null;
  maxFronts: number;
  foamArea: number;
  airVolume: number;
  contactError: { spacing: number; samples: number; height: number; slope: number }[];
  probeTraces: number[][];
  surfaceTrace: number[];
}

function measure(resolution: typeof resolutions[number], windSpeed: number): Measurement {
  const simulation = new SurfZoneSimulation({ ...config, ...resolution, windSpeed }, 'warm');
  const { solver } = simulation;
  const breakPoint = simulation.breakPoint();
  const meter = new SurfMeter([{ xMin: -12, xMax: 12 }], config.peakPeriod, Infinity);
  simulation.onBreak = (wave) => meter.add(wave);
  const points = [-12, -6, 0, 6, 12].flatMap((x) => Array.from({ length: 25 }, (_, i) => ({ x, z: breakPoint.z - 120 + i * 10 })));
  const probes = [-60, -30, 0, 30].map((offset) => ({ x: 0, z: breakPoint.z + offset }));
  const probeTraces = probes.map(() => [] as number[]);
  const surfaceTrace: number[] = [];
  const stepsMs: number[] = [];
  const stages: Record<string, number[]> = {};
  const contactError = [1, 2].map((spacing) => {
    const grid = simulation.renderGrid(spacing);
    return { spacing, grid, surface: new Float32Array(grid.nx * grid.nz * 2), water: new PhysicalSurfWater(solver, { peakPeriod: config.peakPeriod, nodeSpacing: spacing }), samples: 0, height: 0, slope: 0 };
  });
  const sample = createWaterSample();
  let firstJoined = Infinity;
  let firstThrown = Infinity;
  let maxFronts = 0;
  const begin = performance.now();
  for (let step = 0; step <= Math.ceil(seconds / STEP); step += 1) {
    if (step > 0) {
      simulation.step(STEP);
      stepsMs.push(simulation.lastStepMs);
      for (const [key, value] of Object.entries(simulation.stepCosts)) (stages[key] ??= []).push(value);
      const points = simulation.front?.points ?? [];
      maxFronts = Math.max(maxFronts, new Set(points.map((p) => p.front)).size);
      for (const point of points) {
        if (Math.abs(point.x) > 12) continue;
        firstJoined = Math.min(firstJoined, point.joined);
        if (point.thrown !== null) firstThrown = Math.min(firstThrown, point.thrown);
      }
    }
    if (step % SAMPLE_EVERY === 0) {
      for (const p of points) surfaceTrace.push(solver.sampleCentered(solver.h, p.x, p.z) + solver.sampleCentered(solver.bed, p.x, p.z));
      probes.forEach((p, i) => probeTraces[i].push(solver.sampleCentered(solver.h, p.x, p.z) + solver.sampleCentered(solver.bed, p.x, p.z)));
    }
    if (step % 30 === 0) {
      for (const c of contactError) {
        simulation.writeUniformSurface(c.surface, c.grid, false);
        for (const p of points) {
          const x = p.x + 0.37;
          const z = p.z + 0.61;
          const drawn = sampleCubicSurface(c.surface, c.grid, x, z);
          c.water.sampleAt(x, 0, z, sample);
          c.height = Math.max(c.height, Math.abs(drawn.height - sample.surfaceY));
          c.slope = Math.max(c.slope, Math.abs(drawn.slopeX - sample.slopeX), Math.abs(drawn.slopeZ - sample.slopeZ));
          c.samples += 1;
        }
      }
    }
    if (step > 0 && step % 240 === 0) process.stderr.write(`${resolution.name} wind ${windSpeed}: ${(step * STEP).toFixed(0)}/${seconds} s\n`);
  }
  let foamArea = 0;
  let airVolume = 0;
  for (let i = 0; i < solver.h.length; i += 1) {
    const area = solver.dx * solver.dz[Math.floor(i / solver.nx)];
    foamArea += simulation.foam.totalAt(i) * area;
    airVolume += simulation.aeration.air[i] * area;
  }
  const waves = meter.waves();
  return {
    name: resolution.name, windSpeed, cells: solver.h.length, dx: resolution.dx, fineSpacing: resolution.fineSpacing, timeMs: performance.now() - begin, stepMs: mean(stepsMs),
    stagesMs: Object.fromEntries(Object.entries(stages).map(([key, values]) => [key, mean(values)])),
    finite: solver.h.every((h) => Number.isFinite(h) && h >= 0) && solver.qx.every(Number.isFinite) && solver.qz.every(Number.isFinite),
    onsetScale: (solver as BoussinesqSolver).onsetScale, breakPoint, waves, faceHighestThird: waves.length ? highestMean(waves.map((wave) => wave.face), 1 / 3) : null,
    firstJoined: firstJoined === Infinity ? null : firstJoined, firstThrown: firstThrown === Infinity ? null : firstThrown, maxFronts,
    foamArea, airVolume, contactError: contactError.map(({ spacing, samples, height, slope }) => ({ spacing, samples, height, slope })), probeTraces, surfaceTrace,
  };
}

const runs = winds.flatMap((wind) => resolutions.map((resolution) => measure(resolution, wind)));
const comparisons = winds.map((windSpeed) => {
  const [fine, coarse] = runs.filter((run) => run.windSpeed === windSpeed);
  let squaredError = 0;
  let squaredFine = 0;
  for (let i = 0; i < fine.surfaceTrace.length; i += 1) {
    squaredError += (coarse.surfaceTrace[i] - fine.surfaceTrace[i]) ** 2;
    squaredFine += fine.surfaceTrace[i] ** 2;
  }
  return {
    windSpeed, surfaceRmsError: Math.sqrt(squaredError / fine.surfaceTrace.length), fineSurfaceRms: Math.sqrt(squaredFine / fine.surfaceTrace.length),
    probes: fine.probeTraces.map((trace, i) => {
      const other = coarse.probeTraces[i];
      const finePeak = peak(trace)!;
      const coarsePeak = peak(other)!;
      return { zOffset: [-60, -30, 0, 30][i], finePeak, coarsePeak, finePeakTime: trace.indexOf(finePeak) * SAMPLE_EVERY * STEP, coarsePeakTime: other.indexOf(coarsePeak) * SAMPLE_EVERY * STEP };
    }),
  };
});
const result = {
  config, seconds, step: STEP, sampleEverySeconds: SAMPLE_EVERY * STEP,
  limitation: 'A warm 40 m window with 8 swell components, no solver settling, and a short run. Side boundaries and startup transients differ from ordinary 320 m gameplay. This cannot establish settled surf-height or long-term stability parity.',
  windOnsetScales: [-5, 0, 6].map((wind) => ({ wind, depth: 5, scale: windOnsetScale(wind, 5) })),
  runs: runs.map(({ surfaceTrace, ...run }) => ({ ...run, surfaceSamples: surfaceTrace.length })), comparisons,
};
const out = option('out');
if (out) writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ runs: result.runs.map(({ probeTraces, ...run }) => run), comparisons }, null, 2)}\n`);
