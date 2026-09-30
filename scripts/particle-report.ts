/**
 * Particle report (the Particles setting): runs a heavy sea (the Reef's and Padang Padang's Big swells by
 * default) and, on that one sea, the whitewater's particles at every Particles level side by side: they read
 * the water and never write it, so each level sees the same waves. Per level it reports how many particles
 * live (by kind), what they cost the worker each step (the spray's and bubbles' update), what each new snapshot
 * costs the page (filling the spray's and bubbles' buffers, rebuilding the lip sheet in each look), and the
 * spray's fill: the fragments its sprites cover from a ride's front view of the busiest whitewater (the Rich
 * sizes, capped at 511 px, the largest point Chrome draws on a Mac), at 1280 × 720 and at 2240 × 1260 (High on
 * the M1 Air's display). The GPU's own time is `?particleBench` in the browser. Reported, not asserted.
 * Writes docs/research/particle-report.md.
 *
 *   npm run report:particles
 *   npm run report:particles -- --spots reef --swell medium --seconds 90
 */
import { writeFileSync } from 'node:fs';
import { cpus, loadavg } from 'node:os';
import { PerspectiveCamera, Vector3 } from 'three';
import { swellFor } from '../src/game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../src/game/SurfConditions';
import { BubblePoints } from '../src/scene/BubblePoints';
import { buildLipSheet } from '../src/scene/LipSheetMesh';
import { SprayPoints } from '../src/scene/SprayPoints';
import { buildRichLipSheet } from '../src/scene/water/richLip';
import type { SpotName } from '../src/wave/Bathymetry';
import { BubbleCloud } from '../src/wave/BubbleCloud';
import { PARTICLE_BUDGETS, PARTICLE_LEVELS, type ParticleLevel } from '../src/wave/particleBudget';
import { SPRAY_CAPACITY, SPRAY_STRIDE, SprayCloud, WHITEWATER_CAPACITY } from '../src/wave/SprayCloud';
import { LIP_STRIDE } from '../src/wave/SurfZoneRunner';
import { SurfZoneSimulation, type SurfZoneConfig } from '../src/wave/SurfZoneSimulation';

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const spots = (option('spots')?.split(',') ?? ['reef', 'padang']) as SpotName[];
const swellSize = (option('swell') ?? 'big') as SwellSize;
const seconds = Number(option('seconds') ?? 60);
const output = option('out') ?? 'docs/research/particle-report.md';
/** The worker's step, s. */
const STEP = 1 / 60;
/** The page's work and the fill are sampled this often, steps (the page draws one snapshot a frame). */
const SAMPLE_EVERY = 4;
/** The worker's bubble pool (SurfZoneRunner's). */
const BUBBLE_CAPACITY = 4096;
const KINDS = ['spray', 'mist', 'foam ball', 'tube spray', 'tube mist'];
const SCREENS = [{ name: '1280 × 720', width: 1280, height: 720 }, { name: '2240 × 1260', width: 2240, height: 1260 }];
const MAX_POINT = 511;

const quantile = (values: number[], q: number) => {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
};
const fixed = (value: number, digits = 2) => (Number.isFinite(value) ? value.toFixed(digits) : '—');

interface LevelRun {
  level: ParticleLevel;
  spray: SprayCloud;
  bubbles: BubbleCloud;
  sprayPoints: SprayPoints;
  bubblePoints: BubblePoints;
  sprayMs: number[];
  bubbleMs: number[];
  counts: number[];
  bubbleCounts: number[];
  kindsAtPeak: number[];
  peak: number;
  full: number;
  pageSprayMs: number[];
  pageBubbleMs: number[];
  richLipMs: number[];
  classicLipMs: number[];
  fragments: number[][];
}

/** The fragments the spray's sprites cover from `camera`, as the Rich shaders size them (mist 1.6 times wider). */
function fragments(spray: SprayCloud, camera: PerspectiveCamera, width: number, height: number): number {
  const perMetre = height / (2 * Math.tan((camera.fov * Math.PI) / 360));
  const view = new Vector3();
  let total = 0;
  for (let k = 0; k < spray.count; k += 1) {
    const o = k * SPRAY_STRIDE;
    view.set(spray.particles[o], spray.particles[o + 1], spray.particles[o + 2]).applyMatrix4(camera.matrixWorldInverse);
    const depth = -view.z;
    if (depth < camera.near) continue;
    const kind = spray.particles[o + 5];
    const side = Math.min(MAX_POINT, Math.max(1, (spray.particles[o + 3] * (kind === 1 || kind === 4 ? 1.6 : 1) * perMetre) / Math.max(0.1, depth)));
    const x = (view.x / depth) * perMetre + width / 2;
    const y = (view.y / depth) * perMetre + height / 2;
    const w = Math.min(width, x + side / 2) - Math.max(0, x - side / 2);
    const h = Math.min(height, y + side / 2) - Math.max(0, y - side / 2);
    if (w > 0 && h > 0) total += w * h;
  }
  return total;
}

/** A ride's front view (SpectatorCamera: 9 m shoreward, 5 m aside, 3.5 m up) of the High spray's densest 10 m square. */
function frontView(spray: SprayCloud, simulation: SurfZoneSimulation, camera: PerspectiveCamera): void {
  const bins = new Map<string, number>();
  let best = '';
  let most = 0;
  for (let k = 0; k < spray.count; k += 1) {
    const key = `${Math.floor(spray.particles[k * SPRAY_STRIDE] / 10)},${Math.floor(spray.particles[k * SPRAY_STRIDE + 2] / 10)}`;
    const count = (bins.get(key) ?? 0) + 1;
    bins.set(key, count);
    if (count > most) {
      most = count;
      best = key;
    }
  }
  const focus = simulation.breakPoint();
  const [x, z] = best ? best.split(',').map((value) => (Number(value) + 0.5) * 10) : [focus.x, focus.z];
  const surface = simulation.heightAt(x, z);
  camera.position.set(x - 5, surface + 3.5, z + 9);
  camera.lookAt(x, surface + 1, z - 6);
  camera.updateMatrixWorld();
}

function timed(work: () => void): number {
  const start = performance.now();
  work();
  return performance.now() - start;
}

const sections: string[] = [];
const started = Date.now();
for (const spot of spots) {
  const settings = physicalSettingsFor(spot, { swell: swellSize, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'cpu' });
  const swell = swellFor(settings);
  const config: SurfZoneConfig = {
    spot, seed: 1, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod,
    directionDegrees: swell.directionDegrees ?? settings.directionDegrees, spreading: swell.spreading, bandwidth: swell.bandwidth,
    tide: settings.tide, windSpeed: settings.windSpeed, stage: 2, compute: 'cpu',
    ...(settings.source === 'practice' ? { heightAt: 'edge' as const } : {}),
  };
  const simulation = new SurfZoneSimulation(config);
  console.error(`${spot}: spun up, ${((Date.now() - started) / 1000).toFixed(0)} s elapsed`);
  const runs: LevelRun[] = [...PARTICLE_LEVELS].reverse().map((level) => {
    const spray = new SprayCloud(config.seed, SPRAY_CAPACITY, WHITEWATER_CAPACITY);
    const bubbles = new BubbleCloud(config.seed, BUBBLE_CAPACITY);
    spray.setLevel(level);
    bubbles.setLevel(level);
    return {
      level, spray, bubbles, sprayPoints: new SprayPoints(), bubblePoints: new BubblePoints(), sprayMs: [], bubbleMs: [], counts: [], bubbleCounts: [],
      kindsAtPeak: [0, 0, 0, 0, 0], peak: 0, full: 0, pageSprayMs: [], pageBubbleMs: [], richLipMs: [], classicLipMs: [], fragments: SCREENS.map(() => []),
    };
  });
  for (const run of runs) run.sprayPoints.setLook('rich');
  const scene = {
    solver: simulation.solver, foam: simulation.foam, lipImpacts: simulation.lipImpacts, windSpeed: config.windSpeed ?? 0,
    spits: simulation.lip.spits, eruptions: simulation.lip.eruptions, rollers: simulation.lip.rollers,
  };
  const lip = new Float32Array(4096 * LIP_STRIDE);
  const camera = new PerspectiveCamera(52, 16 / 9, 0.1, 3000);
  const width = simulation.solver.dx;
  const steps = Math.round(seconds / STEP);
  let stepMs = 0;
  /** The machine's 1-minute load average through the run: on a shared machine the times follow it. */
  const loads: number[] = [];
  const lipCounts: number[] = [];
  for (let step = 0; step < steps; step += 1) {
    simulation.step(STEP);
    stepMs += simulation.lastStepMs;
    // Each level in turn, starting from a different one each step, so the machine's drift falls on all alike.
    for (let n = 0; n < runs.length; n += 1) {
      const run = runs[(step + n) % runs.length];
      run.bubbleMs.push(timed(() => run.bubbles.update(simulation, STEP)));
      run.sprayMs.push(timed(() => run.spray.update(scene, STEP)));
      run.counts.push(run.spray.count);
      run.bubbleCounts.push(run.bubbles.count);
      if (run.spray.count - run.spray.whitewaterCount >= Math.floor(SPRAY_CAPACITY * PARTICLE_BUDGETS[run.level].pool)) run.full += 1;
      if (run.spray.count > run.peak) {
        run.peak = run.spray.count;
        run.kindsAtPeak = [0, 0, 0, 0, 0];
        for (let k = 0; k < run.spray.count; k += 1) run.kindsAtPeak[run.spray.particles[k * SPRAY_STRIDE + 5]] += 1;
      }
    }
    if (step % SAMPLE_EVERY !== 0) continue;
    // The snapshot's lip parcels, as the runner packs them.
    let parcels = 0;
    simulation.lip.forEachActiveParcel((parcel) => {
      if (parcels >= 4096) return;
      const o = parcels * LIP_STRIDE;
      lip[o] = parcel.x; lip[o + 1] = parcel.y; lip[o + 2] = parcel.z; lip[o + 3] = parcel.column; lip[o + 4] = parcel.index;
      lip[o + 5] = parcel.launchTime; lip[o + 6] = parcel.age; lip[o + 7] = parcel.volume; lip[o + 8] = parcel.kind;
      parcels += 1;
    });
    lipCounts.push(parcels);
    frontView(runs[0].spray, simulation, camera);
    for (const run of runs) {
      const { spray, bubbles } = run;
      run.pageSprayMs.push(timed(() => run.sprayPoints.update({ particles: spray.particles, count: spray.count })));
      run.pageBubbleMs.push(timed(() => run.bubblePoints.update({ positions: bubbles.positions, count: bubbles.count })));
      if (parcels > 0) {
        run.richLipMs.push(timed(() => buildRichLipSheet(lip, parcels, width, PARTICLE_BUDGETS[run.level].lipSubdivisions)));
        run.classicLipMs.push(timed(() => buildLipSheet(lip, parcels, width)));
      }
      SCREENS.forEach((screen, index) => {
        camera.aspect = screen.width / screen.height;
        camera.updateProjectionMatrix();
        run.fragments[index].push(fragments(spray, camera, screen.width, screen.height));
      });
    }
    if (step % 600 === 0) {
      loads.push(loadavg()[0]);
      console.error(`${spot} ${(step * STEP).toFixed(0)} s: ${runs.map((run) => `${run.level} ${run.spray.count}/${run.bubbles.count}`).join(', ')}`);
    }
  }
  const rows = runs.map((run) => {
    const kinds = run.kindsAtPeak.join(' / ');
    return `| ${run.level[0].toUpperCase()}${run.level.slice(1)} | ${quantile(run.counts, 0.5)} | ${quantile(run.counts, 0.95)} | ${run.peak} (${kinds}) | ${Math.round((100 * run.full) / steps)} % | ${quantile(run.bubbleCounts, 0.5)} | ${fixed(quantile(run.sprayMs, 0.5))} | ${fixed(quantile(run.sprayMs, 0.95))} | ${fixed(quantile(run.bubbleMs, 0.5))} | ${fixed(quantile(run.bubbleMs, 0.95))} | ${fixed(quantile(run.pageSprayMs, 0.5))} | ${fixed(quantile(run.richLipMs, 0.5))} | ${fixed(quantile(run.richLipMs, 0.95))} | ${fixed(Math.max(...run.richLipMs))} | ${SCREENS.map((_, index) => `${fixed(quantile(run.fragments[index], 0.5) / 1e6, 1)} / ${fixed(quantile(run.fragments[index], 0.95) / 1e6, 1)} / ${fixed(Math.max(...run.fragments[index]) / 1e6, 1)}`).join(' | ')} |`;
  });
  const classic = runs[0].classicLipMs;
  sections.push(`## ${spot[0].toUpperCase()}${spot.slice(1)} · ${swellSize} swell

Hs ${config.significantHeight} m at ${config.peakPeriod} s, ${simulation.solver.nx} × ${simulation.solver.nz} cells, ${seconds} s of sea; the solver took ${fixed(stepMs / steps, 1)} ms a step, while the machine's 1-minute load average ran ${fixed(Math.min(...loads), 0)}–${fixed(Math.max(...loads), 0)}. The lip threw up to ${Math.max(...lipCounts)} parcels at once (median ${quantile(lipCounts, 0.5)} while any flew); the Classic sheet took ${fixed(quantile(classic, 0.5))} ms to build (95th percentile ${fixed(quantile(classic, 0.95))}, at most ${fixed(Math.max(...classic))}) at every level.

| Particles | Spray, median | 95th percentile | Peak (${KINDS.join(' / ')}) | Pool full | Bubbles, median | Worker spray, ms (median) | 95th | Worker bubbles, ms (median) | 95th | Page spray buffers, ms | Rich lip sheet, ms (median) | 95th | Most | Fragments at ${SCREENS[0].name}, M (median / 95th / most) | At ${SCREENS[1].name} |
|---|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
${rows.join('\n')}`);
  // Written after every spot, so a long run's first spots can be read while the next one steps.
  writeReport();
  console.error(`${spot}: done, ${((Date.now() - started) / 1000).toFixed(0)} s elapsed`);
}

function writeReport(): void {
  const levels = PARTICLE_LEVELS.map((level) => {
    const budget = PARTICLE_BUDGETS[level];
    return `| ${level[0].toUpperCase()}${level.slice(1)} | ${budget.spawn} | ${budget.foamBall} | ${budget.bubbles} | ${budget.pool} | ${budget.mistSize} | ${budget.lipSubdivisions} |`;
  }).reverse();
  const report = `# Particle report · the Particles setting

Generated by \`npm run report:particles -- ${process.argv.slice(2).join(' ')}\` on ${new Date().toISOString().slice(0, 10)}, on ${cpus()[0]?.model ?? 'an unknown CPU'} (${cpus().length} cores), load average ${loadavg().map((value) => value.toFixed(1)).join(' / ')} when it was written. Reported, not asserted. Times are wall-clock on the CPU in Node, as the worker and the page run them in the browser; on a shared machine they vary with its load, so compare levels within a run.

**The levels.** High is the game as it was, particle for particle. Each lower level spawns a share of each source's particles into a share of the pools, draws the mist narrower, and draws the Rich lip sheet with fewer spline points between its parcels. The water, its foam and air, the lip's parcels and the rider never read the particles.

| Particles | Spawned | Foam-ball sprites | Bubbles | Pools | Mist width | Lip sheet points between parcels |
|---|---:|---:|---:|---:|---:|---:|
${levels.join('\n')}

**How it is measured.** One sea (stage 2 on the CPU, the CPU tier's sea, seed 1) steps at the worker's 1/60 s; every level's spray and bubbles follow it side by side. Every ${SAMPLE_EVERY}th step the page's work for a snapshot is timed (the spray's and bubbles' buffers, the lip sheet in each look, built from the lip's parcels as a snapshot carries them), and the fill is counted from the same camera for every level.

${sections.join('\n\n')}
`;
  writeFileSync(output, report);
  console.error(`wrote ${output}`);
}
