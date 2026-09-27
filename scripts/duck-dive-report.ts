/**
 * Duck-dive report (the wipeout spec, Part A): prone paddlers heading out through
 * the inside of a spot's physical surf zone meet its broken waves, side by side
 * along the shore, one per way of meeting them: staying on top, or a 1.5 s
 * duck-dive started when the broken water is 2.5 m away (about 1–2 body lengths,
 * on time), 9 m away (early) or 0.3 m away (late); and on time and on top again
 * 15 m further inside (shallower). Each paddler is a ghost: it feels the water
 * and the lip and pushes back on neither. Its setback is how much further
 * shoreward it is, 4 s after the broken water reached it, than the same inputs
 * leave it on still water. Reported beside the gameplay survey's §5
 * expectations, not asserted. Writes docs/research/duck-dive-report.md.
 *
 *   npm run report:duckdive -- --seeds 2 --minutes 3
 *   npm run report:duckdive -- --spot beach --inside 20
 */
import { writeFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { DEFAULT_PHYSICAL_SETTINGS, swellFor } from '../src/game/PhysicalMode';
import type { LipParcelSource } from '../src/physics/DetachedSurfer';
import { PlaneWater } from '../src/physics/PlaneWater';
import { RideSession, type RideInput } from '../src/physics/RideSession';
import { createWaterSample, type SurfWater } from '../src/physics/SurfWater';
import type { SpotName } from '../src/wave/Bathymetry';
import { SURF_ZONE_STEP, SurfZoneRunner } from '../src/wave/SurfZoneRunner';

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const argument = (name: string, fallback: number): number => Number(option(name) ?? fallback);
const seedCount = argument('seeds', 2);
const minutes = argument('minutes', 3);
const spot = (option('spot') ?? 'canyon') as SpotName;
/** How far inside the break point the paddlers start, m (along the wave's travel). */
const inside = argument('inside', 25);
const output = option('out') ?? 'docs/research/duck-dive-report.md';
const settings = { ...DEFAULT_PHYSICAL_SETTINGS, spot, source: 'practice' as const };
const swell = swellFor(settings);
const direction = swell.directionDegrees ?? settings.directionDegrees;

/** A duck-dive press lasts this long, s. */
const HOLD = 1.5;
/** The broken water counts from this breaking strength, and is looked for this far ahead, m. */
const BROKEN = 0.3;
const LOOK = 20;
/** Measured this long after the broken water reached the paddler, s; an episode gives up after GIVE_UP s. */
const AFTER = 4;
const GIVE_UP = 40;

interface Variant {
  name: string;
  /** The broken water's distance when the dive starts, m (undefined: stays on top). */
  diveAt?: number;
  /** Along shore from the others, m, and further inside, m. */
  along: number;
  deeper: number;
}

const VARIANTS: readonly Variant[] = [
  { name: 'on top', along: -6, deeper: 0 },
  { name: 'dive on time (2.5 m)', diveAt: 2.5, along: -2, deeper: 0 },
  { name: 'dive early (9 m)', diveAt: 9, along: 2, deeper: 0 },
  { name: 'dive late (0.3 m)', diveAt: 0.3, along: 6, deeper: 0 },
  { name: 'on top, 15 m inside', along: -2, deeper: 15 },
  { name: 'dive on time, 15 m inside', diveAt: 2.5, along: 2, deeper: 15 },
];

interface Paddler {
  variant: Variant;
  session: RideSession;
  start: Vector3;
  inputs: RideInput[];
  diveStart: number;
  hitAt: number;
  depth: number;
  done: boolean;
  fell?: { cause: string; at: number };
}

interface Result {
  setback: number;
  stayedOn: boolean;
  depth: number;
  /** Why and when it came off, s after the broken water reached it (negative: before). */
  fell?: { cause: string; at: number };
}

const results = new Map<string, Result[]>(VARIANTS.map((variant) => [variant.name, []]));
const radians = (direction * Math.PI) / 180;
const travel = new Vector3(Math.sin(radians), 0, Math.cos(radians));
/** Heading out to sea: against the waves' travel. */
const seaward = Math.atan2(-travel.x, -travel.z);
let episodes = 0;
let abandoned = 0;
let seaSeconds = 0;

/** The same inputs on still water: how far along the waves' travel they take the board, m. */
function stillAlong(inputs: readonly RideInput[]): number {
  const water = new PlaneWater({ level: settings.tide, depth: 5 });
  const session = new RideSession();
  session.place({ x: 0, z: 0, heading: seaward, speed: 0, phase: 'prone' }, water);
  const from = session.board.position.clone();
  for (const input of inputs) session.step(SURF_ZONE_STEP, water, input);
  return session.board.position.clone().sub(from).dot(travel);
}

function runSeed(seed: number): void {
  const runner = new SurfZoneRunner({
    spot, seed,
    significantHeight: swell.significantHeight, heightAt: (settings.source === 'practice' ? 'edge' : 'deep') as 'edge' | 'deep', peakPeriod: swell.peakPeriod, directionDegrees: direction,
    spreading: swell.spreading, bandwidth: swell.bandwidth, tide: settings.tide, windSpeed: settings.windSpeed,
  }, {});
  const ghostWater: SurfWater = {
    sampleAt: (x, y, z, out) => runner.water.sampleAt(x, y, z, out),
    surfaceAt: (x, z) => runner.water.surfaceAt(x, z),
    addReaction() {},
  };
  const recoil = new Vector3();
  const lip: LipParcelSource = {
    forEachContactNear: (center, reach, visit) => runner.simulation.lip.forEachContactNear(center, reach, (parcel) => {
      recoil.copy(parcel.velocity);
      visit(parcel);
      parcel.velocity.copy(recoil);
    }),
  };
  const here = createWaterSample();
  const point = new Vector3();
  const across = new Vector3(travel.z, 0, -travel.x);
  /** The broken water's distance seaward of `at`, m: 0 when it is there, Infinity when none within LOOK. */
  const brokenAhead = (at: Vector3): number => {
    for (let d = 0; d <= LOOK; d += 0.5) {
      point.copy(at).addScaledVector(travel, -d);
      runner.water.sampleAt(point.x, point.y, point.z, here);
      if (!here.outsideDomain && here.breaking >= BROKEN) return d;
    }
    return Infinity;
  };
  let paddlers: Paddler[] = [];
  let episodeTime = 0;
  const spawn = (): void => {
    paddlers = VARIANTS.map((variant) => {
      const session = new RideSession();
      const at = new Vector3(runner.focus.x, 0, runner.focus.z).addScaledVector(travel, inside + variant.deeper).addScaledVector(across, variant.along);
      session.place({ x: at.x, z: at.z, heading: seaward, speed: 0, phase: 'prone' }, ghostWater);
      return { variant, session, start: session.board.position.clone(), inputs: [], diveStart: -1, hitAt: -1, depth: 0, done: false };
    });
    episodeTime = 0;
  };
  spawn();
  const steps = Math.round((minutes * 60) / SURF_ZONE_STEP);
  for (let step = 0; step < steps; step += 1) {
    runner.advance(1);
    episodeTime += SURF_ZONE_STEP;
    for (const p of paddlers) {
      if (p.done) continue;
      const { session } = p;
      const ahead = brokenAhead(session.board.position);
      const t = p.inputs.length * SURF_ZONE_STEP;
      if (p.variant.diveAt !== undefined && p.diveStart < 0 && ahead <= p.variant.diveAt) p.diveStart = t;
      if (p.hitAt < 0 && ahead === 0) p.hitAt = t;
      const diving = p.diveStart >= 0 && t - p.diveStart < HOLD;
      const input: RideInput = { paddle: !diving, popUp: false, steer: 0, duckDive: diving ? 1 : 0 };
      p.inputs.push(input);
      const wasOn = session.rider.attached;
      session.step(SURF_ZONE_STEP, ghostWater, input);
      session.strike(lip);
      if (wasOn && !session.rider.attached && !p.fell) {
        const phase = p.diveStart >= 0 && t - p.diveStart < HOLD ? 'ducking' : p.diveStart >= 0 ? 'after the dive' : 'on top';
        p.fell = { cause: `${session.separation ?? 'balance'} (${phase})`, at: p.hitAt >= 0 ? t - p.hitAt : -1 };
      }
      runner.water.sampleAt(session.board.position.x, session.board.position.y, session.board.position.z, here);
      if (diving) p.depth = Math.max(p.depth, here.surfaceY - session.board.position.y);
      if (session.board.outsideDomain) p.done = true;
      if (p.hitAt >= 0 && t - p.hitAt >= AFTER) {
        const along = session.board.position.clone().sub(p.start).dot(travel);
        results.get(p.variant.name)!.push({ setback: along - stillAlong(p.inputs), stayedOn: session.rider.attached, depth: p.depth, fell: p.fell });
        p.done = true;
      }
    }
    if (paddlers.every((p) => p.done)) {
      episodes += 1;
      spawn();
    } else if (episodeTime > GIVE_UP) {
      abandoned += 1;
      spawn();
    }
  }
  seaSeconds += minutes * 60;
}

const started = performance.now();
for (let seed = 1; seed <= seedCount; seed += 1) runSeed(seed);
const wall = (performance.now() - started) / 1000;

const fixed = (value: number, digits = 1) => (Number.isFinite(value) ? value.toFixed(digits) : '—');
const median = (values: number[]) => {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const row = (name: string) => {
  const list = results.get(name)!;
  const setbacks = list.map((r) => r.setback);
  const dives = list.map((r) => r.depth).filter((depth) => depth > 0);
  return `| ${name} | ${list.length} | ${fixed(median(setbacks))} | ${fixed(Math.min(...setbacks))} to ${fixed(Math.max(...setbacks))} | ${list.length ? Math.round((100 * list.filter((r) => r.stayedOn).length) / list.length) : 0} % | ${dives.length ? fixed(median(dives), 2) : '—'} |`;
};
const falls = (name: string) => {
  const counts = new Map<string, number>();
  for (const r of results.get(name)!) if (r.fell) counts.set(r.fell.cause, (counts.get(r.fell.cause) ?? 0) + 1);
  const at = results.get(name)!.filter((r) => r.fell).map((r) => r.fell!.at);
  return counts.size ? `${[...counts].map(([cause, n]) => `${n} × ${cause}`).join(', ')}; median ${fixed(median(at))} s after the broken water reached it` : 'none';
};
const med = (name: string) => median(results.get(name)!.map((r) => r.setback));
const top = med('on top');
const timed = med('dive on time (2.5 m)');
const early = med('dive early (9 m)');
const late = med('dive late (0.3 m)');
const insideRatio = med('dive on time, 15 m inside') / med('on top, 15 m inside');
const verdict = (pass: boolean) => (pass ? 'met' : 'not met');

const report = `# Duck-dive report

The wipeout spec's Part A checks the duck-dive under broken water against the gameplay survey's §5: a well-timed dive is pushed shoreward much less than a paddler who stays on top, a late or early one does worse, and it is weaker in shallow inside water.

Prone paddlers start ${inside} m inside the ${spot} break point on the practice swell (Hs ${swell.significantHeight} m, Tp ${swell.peakPeriod} s), heading out to sea, side by side along the shore 4 m apart (so each meets nearly the same broken water), one per way of meeting it. A dive is a ${HOLD} s press of the Duck-dive action. The **setback** is how much further shoreward the board is ${AFTER} s after broken water (breaking ≥ ${BROKEN}) reached it than the same inputs leave it on still water. The paddlers are ghosts: they feel the water and the lip, and push back on neither.

${seedCount} seed(s), ${minutes} simulated min each: ${episodes} episodes measured, ${abandoned} abandoned (no broken water within ${GIVE_UP} s). Run time ${fixed(wall, 0)} s for ${fixed(seaSeconds, 0)} s of sea.

| way of meeting it | n | median setback, m | range, m | still on the board | median depth diving, m |
|---|---|---|---|---|---|
${VARIANTS.map((variant) => row(variant.name)).join('\n')}

## Why paddlers came off

${VARIANTS.map((variant) => `- ${variant.name}: ${falls(variant.name)}`).join('\n')}

## Against the survey (§5)

| check | expectation | measured | verdict |
|---|---|---|---|
| on time vs on top | much less (under half) | ${fixed(timed)} vs ${fixed(top)} m | ${verdict(timed < 0.5 * top)} |
| early and late vs on time | both worse | early ${fixed(early)}, late ${fixed(late)}, on time ${fixed(timed)} m | ${verdict(early > timed && late > timed)} |
| 15 m inside | weaker (dive/top ratio higher) | ${fixed(insideRatio, 2)} vs ${fixed(timed / top, 2)} | ${verdict(insideRatio > timed / top)} |

A check that is not met is investigated, never tuned into passing (the gameplay spec's principle 3).
`;
writeFileSync(output, report);
console.log(report);
