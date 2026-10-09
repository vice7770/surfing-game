/**
 * The roller lens's carry in the game's water (the Canyon roller lens, S3; the owner's playtest of 2026-10-09: a prone
 * board in the whitewater climbed to about 9 m/s while the bore ran at about 5). One deterministic run:
 * - the Canyon's sea at Medium (Hs 1.4 m, Tp 11 s, 0°, s = 150, mid tide, calm), built as the game builds it (64 swell
 *   components on the GPU tier), stepped on the CPU at the game's 1/60 s with the water first, then the body;
 * - after its spin-up (and `--wait` more seconds), the longest run of developed lenses (g ≥ 0.95) along a crest is
 *   picked, and a prone board, rider on, nose to the beach, is placed `--ahead` m ahead of the toe in its middle column;
 * - no input but `--paddle` (the rider paddles, prone, all along): the board is pushed and carried (it may start at
 *   `--speed`). No bots ride.
 *
 * Every `--every` steps it prints the board's speed across shore against the speed c of the lens it was placed ahead of
 * (its wave's lens in the board's column), where it lies in that lens (ξ: 0 at the crest, 1 at the toe), whether a lens
 * covers it, its draft and wetted area, and the water's forces along +z: on the hull (buoyancy, planing pressure,
 * friction, the froth drag, added mass and radiation), on the rider, and gravity along the face. At the end, the fastest
 * speed against c, and why the lens let go of the board, if it did: its wave's lens taken from the column while live
 * (evicted), shed, or left behind by the board.
 *
 *   rolldown scripts/roller-carry-probe.ts -o dist/scripts/roller-carry-probe.mjs --format esm --platform node \
 *     && node dist/scripts/roller-carry-probe.mjs --seed 1 --seconds 12
 *
 * Options: --seed (1), --wait (0 s), --seconds (12), --ahead (1 m), --components (64), --every (15 steps), --pick fastest
 * or thickest (the developed run with the fastest or thickest lens, not the longest), --speed (0 m/s: the board's start
 * along its heading, over the water's; the owner's readout climbed from 2), --column C --wave W (pinned: wave W's developed
 * lens in column C, for a run before and after a change), --paddle, --bare (the same sea with no lens felt, and no P11
 * push: the difference the lens makes).
 */
import type { Vector3 } from 'three';
import { PhysicalSurfWater } from '../src/physics/PhysicalSurfWater';
import { RideSession } from '../src/physics/RideSession';
import { createWaterSample } from '../src/physics/SurfWater';
import { ROLLER_FIELD, ROLLER_SLOTS, ROLLER_STRIDE, createLensPoint, type RollerLens } from '../src/wave/SpillingRoller';
import { SurfZoneSimulation, type SurfZoneConfig } from '../src/wave/SurfZoneSimulation';

const option = (name: string, fallback: number) => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? Number(process.argv[index + 1]) : fallback;
};
const flag = (name: string) => process.argv.includes(`--${name}`);

const STEP = 1 / 60;
const GRAVITY = 9.81;
/** The owner's bar for a board carried by whitewater (2026-10-07): no faster than about 1.2 c. */
const CARRY_BAR = 1.2;

const config = {
  spot: 'canyon', seed: option('seed', 1), significantHeight: 1.4, peakPeriod: 11, directionDegrees: 0, spreading: 150,
  tide: 0, windSpeed: 0, stage: 2, componentCount: option('components', 64),
} as unknown as SurfZoneConfig;
const simulation = new SurfZoneSimulation(config);
const roller = simulation.roller!;
const { solver } = simulation;
const { nx } = solver;
const entry = (slot: number, column: number, value: number) => roller.table[(slot * nx + column) * ROLLER_STRIDE + value];

/**
 * The developed runs (g ≥ 0.95 over at least 12 columns) in the table: the longest, or the one whose lens is fastest
 * (`--pick fastest`: the bores the owner met, c ≈ 5 m/s) or thickest at its crest (`--pick thickest`); or, pinned,
 * wave `--wave`'s entry in column `--column`.
 */
function developedRun(): { slot: number; column: number; run: number } | undefined {
  const pinnedColumn = option('column', -1);
  if (pinnedColumn >= 0) {
    for (let slot = 0; slot < ROLLER_SLOTS; slot += 1) {
      if (roller.tableWave(pinnedColumn, slot) === option('wave', -1) && entry(slot, pinnedColumn, ROLLER_FIELD.scale) >= 0.95) {
        return { slot, column: pinnedColumn, run: 12 };
      }
    }
    return undefined;
  }
  const by = process.argv.includes('fastest') ? ROLLER_FIELD.flowZ : process.argv.includes('thickest') ? ROLLER_FIELD.thickness : -1;
  let best: { slot: number; column: number; run: number; score: number } | undefined;
  for (let slot = 0; slot < ROLLER_SLOTS; slot += 1) {
    let start = -1;
    for (let column = 0; column <= nx; column += 1) {
      const live = column < nx && entry(slot, column, ROLLER_FIELD.scale) >= 0.95;
      if (live && start < 0) start = column;
      if (!live && start >= 0) {
        const run = column - start;
        const middle = Math.floor((start + column - 1) / 2);
        const score = by >= 0 ? entry(slot, middle, by) : run;
        if (run >= 12 && (!best || score > best.score)) best = { slot, column: middle, run, score };
        start = -1;
      }
    }
  }
  return best;
}

for (let n = 0; n < Math.round(option('wait', 0) / STEP); n += 1) simulation.step(STEP);
let pick = developedRun();
while (!pick) {
  simulation.step(STEP);
  pick = developedRun();
}
const start = simulation.solver.time;
const wave = roller.tableWave(pick.column, pick.slot);
const x0 = solver.xCenters[pick.column];
const crest0 = entry(pick.slot, pick.column, ROLLER_FIELD.crest);
const length0 = entry(pick.slot, pick.column, ROLLER_FIELD.length);
const z0 = crest0 + length0 + option('ahead', 1);
// Its state: the table's slot need not be the slot the lens is kept in.
const lens0 = Array.from({ length: ROLLER_SLOTS }, (_, slot) => roller.lens(pick!.column, slot)).find((lens) => lens?.wave === wave)!;
console.log(`Canyon Medium, seed ${config.seed}, ${config.componentCount} components; t = ${start.toFixed(2)} s: wave ${wave}'s lens in column ${pick.column} `
  + `(x ${x0.toFixed(1)} m; a run of ${pick.run}): crest ${crest0.toFixed(2)} m, length ${length0.toFixed(2)} m, t_c ${entry(pick.slot, pick.column, ROLLER_FIELD.thickness).toFixed(3)} m, `
  + `H ${lens0.height.toFixed(2)} m, h1 ${lens0.troughDepth.toFixed(2)} m, Fr1 ${Math.sqrt(lens0.froude2).toFixed(2)}, c ${lens0.c.toFixed(2)} m/s; the board at z ${z0.toFixed(2)} m`);

/** A roller with no lens anywhere: the game's water bare (no P11 push either, as at the Canyon). */
const bare: RollerLens = {
  options: roller.options,
  lensAt: (_x, _z, out) => {
    out.thickness = 0; out.rise = 0; out.g = 0; out.flowX = 0; out.flowZ = 0;
    return false;
  },
  riseAt: () => 0,
};
const water = flag('bare')
  ? new PhysicalSurfWater(solver, {
    peakPeriod: config.peakPeriod, breaking: simulation.feltBreaking, nodeSpacing: 1, aeration: simulation.aeration, roller: bare,
    carve: (x, z, surface) => simulation.lip.carve(x, z, surface),
  })
  : PhysicalSurfWater.forSimulation(simulation, undefined, 1);
const session = new RideSession();
// As `RideSession.reset` places it, at rest on the water (moving with it), or `--speed` m/s faster along its heading.
session.place({ x: x0, z: z0, heading: 0, speed: option('speed', 0), phase: 'prone' }, water);
const { board } = session;
// The rider's water force and the hull's samples are private: read for the report only.
const rider = session.rider as unknown as { waterForce: Vector3; mass: number; attached: boolean };
const hull = (board as unknown as { samples: { lensScale?: number }[] }).samples;
const totalMass = board.mass + rider.mass;
const point = createLensPoint();
const sample = createWaterSample();

/** The tracked wave's lens in `column`: its state and table entries, if any. */
function tracked(column: number) {
  let state: ReturnType<typeof roller.lens>;
  let slot = -1;
  for (let k = 0; k < ROLLER_SLOTS; k += 1) {
    const lens = roller.lens(column, k);
    if (lens?.wave === wave) state = lens;
    if (roller.tableWave(column, k) === wave) slot = k;
  }
  return { state, slot };
}

const every = option('every', 15);
console.log('    t       z     xi     vz      c   vz/c lens  draft  wet m²  slope |  buoy  press   fric  froth  added    rad  rider gravity (N along +z)');
let fastest = { ratio: 0, speed: 0, at: 0, c: Number.NaN, inside: false };
let carried = 0;
let lastC = lens0.c;
/** The tracked wave's lens in each column at the last step: 0 none, 1 active, 2 shedding. */
const seen = new Uint8Array(nx);
const seenNow = new Uint8Array(nx);
let released: string | undefined;
let wasInside = false;
for (let n = 1; n <= Math.round(option('seconds', 12) / STEP); n += 1) {
  simulation.step(STEP);
  session.step(STEP, water, { paddle: flag('paddle'), popUp: false, steer: 0 });
  const t = n * STEP;
  const p = board.position;
  const column = Math.min(nx - 1, Math.max(0, Math.round((p.x - solver.xCenters[0]) / solver.dx)));
  for (let c = 0; c < nx; c += 1) {
    const lens = tracked(c).state;
    seenNow[c] = !lens ? 0 : lens.state === 'active' ? 1 : 2;
  }
  const { state, slot } = tracked(column);
  if (state) lastC = state.c;
  const c = lastC;
  const xi = slot >= 0 ? (p.z - entry(slot, column, ROLLER_FIELD.crest)) / entry(slot, column, ROLLER_FIELD.length) : Number.NaN;
  const inside = roller.lensAt(p.x, p.z, point);
  if (inside) carried += STEP;
  // Why the lens let go: the first step the board, carried, has no lens over it.
  if (wasInside && !inside && !released) {
    released = !state
      ? (seen[column] === 1 ? `its wave's live lens was taken from column ${column} (evicted)`
        : seen[column] === 2 ? `its wave's lens shed out of column ${column}` : `its wave has no lens in column ${column}`)
      : state.state === 'shedding' ? `its wave's lens is shedding (g ${state.g.toFixed(2)})`
        : slot < 0 ? 'its wave\'s lens is held out of the table (masked or smoothed away)'
          : xi > 1 ? `the board ran ahead of the toe (ξ ${xi.toFixed(2)})` : `the board fell behind the lens (ξ ${xi.toFixed(2)})`;
    released = `t ${t.toFixed(2)} s, z ${p.z.toFixed(1)} m: ${released}`;
  }
  wasInside = inside;
  seen.set(seenNow);
  const ratio = board.velocity.z / c;
  if (ratio > fastest.ratio) fastest = { ratio, speed: board.velocity.z, at: t, c, inside };
  if (n % every !== 0) continue;
  water.sampleAt(p.x, p.y, p.z, sample);
  let covered = 0;
  for (const patch of hull) if (patch.lensScale !== undefined && patch.lensScale > 0) covered += 1;
  const f = board.forces;
  const gravity = (-totalMass * GRAVITY * sample.slopeZ) / (1 + sample.slopeZ * sample.slopeZ);
  console.log([
    t.toFixed(2), p.z.toFixed(1), xi.toFixed(2), board.velocity.z.toFixed(2), c.toFixed(2), ratio.toFixed(2), inside ? `${covered}`.padStart(4) : '   -',
    (sample.surfaceY - p.y).toFixed(3), board.wettedArea.toFixed(2), sample.slopeZ.toFixed(3), '|',
    f.buoyancy.z.toFixed(0), f.pressure.z.toFixed(0), f.friction.z.toFixed(0), f.froth.z.toFixed(0), f.addedMass.z.toFixed(0), f.radiation.z.toFixed(0),
    rider.waterForce.z.toFixed(0), gravity.toFixed(0), rider.attached ? '' : 'off the board',
  ].map((value) => value.padStart(6)).join(' '));
}
console.log(`fastest: ${fastest.speed.toFixed(2)} m/s = ${fastest.ratio.toFixed(2)} c (c ${fastest.c.toFixed(2)} m/s) at t ${fastest.at.toFixed(2)} s, ${fastest.inside ? 'in a lens' : 'outside any lens'}; `
  + `in a lens ${carried.toFixed(1)} s of ${option('seconds', 12)}; the lens let go: ${released ?? 'never'}; `
  + `${fastest.ratio <= CARRY_BAR ? 'within' : 'over'} the owner's ${CARRY_BAR} c; roller overflows so far ${roller.counts.overflow}`);
