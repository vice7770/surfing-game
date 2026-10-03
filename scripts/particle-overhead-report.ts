/**
 * Isolated, deterministic particle overhead: no water solver or browser rendering.
 * Compare sparse source indexing and presentation reads at different snapshot rates.
 *
 * npm run report:particle-overhead
 * npm run report:particle-overhead -- --frames 600 --trials 9 --out /tmp/particle-overhead.md
 */
import { deepStrictEqual } from 'node:assert';
import { writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { performance } from 'node:perf_hooks';
import { BubbleCloud } from '../src/wave/BubbleCloud';
import { busyWhitewater } from '../src/wave/particleTestSupport';
import { SPRAY_CAPACITY, SPRAY_STRIDE, SprayCloud, WHITEWATER_CAPACITY, type SprayScene } from '../src/wave/SprayCloud';

const option = (name: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
};
const frames = Number(option('frames') ?? 360);
const trials = Number(option('trials') ?? 7);
if (!(frames > 0 && trials > 0)) throw new Error('Frames and trials must be positive.');
const STEP = 1 / 60;

function indexed(scene: SprayScene): SprayScene {
  const cells = new Uint32Array(scene.foam.source.length);
  let count = 0;
  for (let i = 0; i < cells.length; i += 1) if (scene.foam.source[i] > 0) cells[count++] = i;
  return { ...scene, foam: { source: scene.foam.source, sourceCells: cells, sourceCount: count } };
}

/** Padang's grid dimensions, with 128 scattered bore sources among 232,000 cells. */
function sparseScene(): SprayScene {
  const nx = 320;
  const nz = 725;
  const source = new Float64Array(nx * nz);
  for (let n = 0; n < 128; n += 1) source[Math.floor(((n + 0.5) * source.length) / 128)] = 4;
  return {
    solver: {
      nx, nz, dx: 1, restLevel: 0,
      xCenters: Float64Array.from({ length: nx }, (_, i) => i + 0.5),
      zCenters: Float64Array.from({ length: nz }, (_, i) => i + 0.5),
      dz: new Float64Array(nz).fill(1),
      h: new Float64Array(nx * nz).fill(2), bed: new Float64Array(nx * nz).fill(-2),
      qx: new Float64Array(nx * nz), qz: new Float64Array(nx * nz),
      cellIndex: (x, z) => Math.min(nz - 1, Math.max(0, Math.floor(z))) * nx + Math.min(nx - 1, Math.max(0, Math.floor(x))),
    },
    foam: { source }, lipImpacts: [], windSpeed: 0,
  };
}

interface Measurement {
  sprayMs: number;
  bubbleMs: number;
  spray: Float32Array;
  bubbles: Float32Array;
}

function measure(scene: SprayScene, readEvery: number): Measurement {
  const spray = new SprayCloud(3, SPRAY_CAPACITY, WHITEWATER_CAPACITY);
  const bubbles = new BubbleCloud(3);
  for (let frame = 0; frame < 90; frame += 1) {
    spray.update(scene, STEP);
    bubbles.update(scene, STEP);
    void spray.particles;
    void bubbles.positions;
  }
  const beginSpray = performance.now();
  for (let frame = 1; frame <= frames; frame += 1) {
    spray.update(scene, STEP);
    if (readEvery > 0 && frame % readEvery === 0) void spray.particles;
  }
  const sprayMs = (performance.now() - beginSpray) / frames;
  const beginBubbles = performance.now();
  for (let frame = 1; frame <= frames; frame += 1) {
    bubbles.update(scene, STEP);
    if (readEvery > 0 && frame % readEvery === 0) void bubbles.positions;
  }
  const bubbleMs = (performance.now() - beginBubbles) / frames;
  return {
    sprayMs, bubbleMs,
    spray: spray.particles.slice(0, spray.count * SPRAY_STRIDE),
    bubbles: bubbles.positions.slice(0, bubbles.count * 3),
  };
}

const sparse = sparseScene();
const whitewater = indexed(busyWhitewater(0));
const variants = [
  { name: 'Sparse: full-grid scan', scene: sparse, readEvery: 4 },
  { name: 'Sparse: indexed sources', scene: indexed(sparse), readEvery: 4 },
  { name: 'Busy: read every step', scene: whitewater, readEvery: 1 },
  { name: 'Busy: read every fourth step', scene: whitewater, readEvery: 4 },
  { name: 'Busy: no intermediate reads', scene: whitewater, readEvery: 0 },
];
const timings = variants.map(() => [] as Measurement[]);
// Rotate order so compilation, machine load and clock drift do not always favour one variant.
for (let trial = 0; trial < trials; trial += 1) {
  for (let offset = 0; offset < variants.length; offset += 1) {
    const at = (trial + offset) % variants.length;
    const variant = variants[at];
    timings[at].push(measure(variant.scene, variant.readEvery));
  }
}
const compare = (a: number, b: number) => {
  deepStrictEqual(timings[a][0].spray, timings[b][0].spray);
  deepStrictEqual(timings[a][0].bubbles, timings[b][0].bubbles);
};
compare(0, 1);
compare(2, 3);
compare(2, 4);
const median = (values: number[]) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
const rows = variants.map((variant, at) => {
  const sample = timings[at][0];
  return `| ${variant.name} | ${median(timings[at].map((result) => result.sprayMs)).toFixed(4)} | ${median(timings[at].map((result) => result.bubbleMs)).toFixed(4)} | ${sample.spray.length / SPRAY_STRIDE} / ${sample.bubbles.length / 3} |`;
});
const report = [
  '# Particle overhead report',
  '',
  `${new Date().toISOString()} · ${cpus()[0]?.model ?? 'CPU'} · Node ${process.version} · ${trials} trials of ${frames} fixed steps after 90 warm-up steps. Median wall-clock milliseconds per physics step.`,
  '',
  'The sparse case isolates finding 128 bore sources in a 320 × 725 grid. The busy case uses the deterministic whitewater fixture with every source active. No water solver or browser rendering runs. Indexed and full-grid paths, and all presentation read schedules, produce identical final Float32 arrays.',
  '',
  '| Work | Spray ms/step | Bubbles ms/step | Final particles / bubbles |',
  '|---|---:|---:|---:|',
  ...rows,
  '',
  'Source indexing is produced during FoamField’s existing pass in the game; this benchmark excludes that pass. Four physics steps per presentation read models a worker batch. Timings depend on machine load and are reported, not asserted.',
  '',
].join('\n');
if (option('out')) writeFileSync(option('out')!, report);
process.stdout.write(report);
