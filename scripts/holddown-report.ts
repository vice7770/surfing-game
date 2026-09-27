/**
 * Hold-down report (the wipeout spec, Part B): riders lying in a spot's impact
 * zone are knocked off their boards as broken water reaches them, and left in
 * the water for HOLD s, relaxed or swimming up. For each: how long their head
 * stays under in one go (the hold-down), how long in all, when they could swim
 * again, their lowest breath, and whether they were held down too long. Set
 * beside the gameplay survey's §6: hold-downs in 1–2 m plunging surf mostly
 * last 5–15 s. The riders are ghosts: they feel the water, its air and
 * turbulence, and the lip, and push back on none of it. Reported, not asserted.
 * Writes docs/research/holddown-report.md.
 *
 *   npm run report:holddown -- --seeds 2 --minutes 3
 */
import { writeFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { DEFAULT_PHYSICAL_SETTINGS, swellFor } from '../src/game/PhysicalMode';
import type { LipParcelSource } from '../src/physics/DetachedSurfer';
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
/** Where the riders lie, m inside the break point along the waves' travel. */
const inside = argument('inside', 8);
const output = option('out') ?? 'docs/research/holddown-report.md';
const settings = { ...DEFAULT_PHYSICAL_SETTINGS, spot, source: 'practice' as const };
const swell = swellFor(settings);
const direction = swell.directionDegrees ?? settings.directionDegrees;

/** Broken water counts from this breaking strength; each rider is watched this long after its fall, s. */
const BROKEN = 0.3;
const HOLD = 30;
/** Swimming up starts this long after the fall, s (a surfer first lets the wave have them). */
const SWIM_AFTER = 2;
const ALONGS = [-12, -6, 0, 6, 12];
const WAYS = ['relaxed', 'swims up'] as const;
type Way = (typeof WAYS)[number];

interface Result {
  longest: number;
  total: number;
  control: number;
  lowestBreath: number;
  rescued: boolean;
}

const results = new Map<Way, Result[]>(WAYS.map((way) => [way, []]));
let seaSeconds = 0;

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
  const radians = (direction * Math.PI) / 180;
  const travel = new Vector3(Math.sin(radians), 0, Math.cos(radians));
  const across = new Vector3(travel.z, 0, -travel.x);
  const here = createWaterSample();
  interface Rider {
    way: Way;
    session: RideSession;
    home: Vector3;
    fellAt: number;
    time: number;
    stay: number;
    longest: number;
    total: number;
    control: number;
    lowestBreath: number;
    rescued: boolean;
  }
  const riders: Rider[] = [];
  const spawn = (rider: Rider) => {
    rider.session.place({ x: rider.home.x, z: rider.home.z, heading: Math.atan2(travel.x, travel.z), speed: 0, phase: 'prone' }, ghostWater);
    Object.assign(rider, { fellAt: -1, time: 0, stay: 0, longest: 0, total: 0, control: -1, lowestBreath: 1, rescued: false });
  };
  for (const way of WAYS) {
    for (const along of ALONGS) {
      const home = new Vector3(runner.focus.x, 0, runner.focus.z).addScaledVector(travel, inside).addScaledVector(across, along + (way === 'relaxed' ? 0 : 2));
      const rider = { way, session: new RideSession(), home } as Rider;
      spawn(rider);
      riders.push(rider);
    }
  }
  const idle: RideInput = { paddle: false, popUp: false, steer: 0 };
  const steps = Math.round((minutes * 60) / SURF_ZONE_STEP);
  for (let step = 0; step < steps; step += 1) {
    runner.advance(1);
    for (const rider of riders) {
      const { session } = rider;
      if (rider.fellAt < 0) {
        // Waiting on the board: knocked off as broken water reaches the rider.
        session.step(SURF_ZONE_STEP, ghostWater, idle);
        runner.water.sampleAt(session.board.position.x, session.board.position.y, session.board.position.z, here);
        if (here.breaking >= BROKEN) {
          session.separate('impact');
          rider.fellAt = 0;
        } else if (session.board.outsideDomain || !session.rider.attached) {
          spawn(rider);
        }
        continue;
      }
      rider.time += SURF_ZONE_STEP;
      const swimming = rider.way === 'swims up' && rider.time >= SWIM_AFTER;
      session.step(SURF_ZONE_STEP, ghostWater, { ...idle, paddle: swimming });
      session.strike(lip);
      const { surfer } = session;
      const under = surfer.active && surfer.underwater;
      rider.stay = under ? rider.stay + SURF_ZONE_STEP : 0;
      rider.longest = Math.max(rider.longest, rider.stay);
      if (under) rider.total += SURF_ZONE_STEP;
      if (rider.control < 0 && surfer.active && surfer.controlGain > 0.5 && !under && rider.time > 0.5) rider.control = rider.time;
      rider.lowestBreath = Math.min(rider.lowestBreath, session.breath.level);
      if (session.breath.empty) rider.rescued = true;
      if (rider.time >= HOLD || rider.rescued || (surfer.active && surfer.outsideDomain)) {
        results.get(rider.way)!.push({ longest: rider.longest, total: rider.total, control: rider.control, lowestBreath: rider.lowestBreath, rescued: rider.rescued });
        spawn(rider);
      }
    }
  }
  seaSeconds += minutes * 60;
}

const started = performance.now();
for (let seed = 1; seed <= seedCount; seed += 1) runSeed(seed);
const wall = (performance.now() - started) / 1000;

const fixed = (value: number, digits = 1) => (Number.isFinite(value) ? value.toFixed(digits) : '—');
const quantile = (values: number[], q: number) => {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
};
const row = (way: Way) => {
  const list = results.get(way)!;
  const longest = list.map((r) => r.longest);
  const controls = list.map((r) => r.control).filter((c) => c >= 0);
  const inRange = list.filter((r) => r.longest >= 5 && r.longest <= 15).length;
  return `| ${way} | ${list.length} | ${fixed(quantile(longest, 0.5))} | ${fixed(quantile(longest, 0.1))} to ${fixed(quantile(longest, 0.9))} | ${list.length ? Math.round((100 * inRange) / list.length) : 0} % | ${fixed(quantile(list.map((r) => r.total), 0.5))} | ${controls.length ? fixed(quantile(controls, 0.5)) : '—'} (${controls.length} of ${list.length}) | ${fixed(quantile(list.map((r) => r.lowestBreath), 0.5), 2)} | ${list.filter((r) => r.rescued).length} |`;
};
const relaxed = results.get('relaxed')!.map((r) => r.longest);
const share = relaxed.filter((t) => t >= 5 && t <= 15).length / Math.max(1, relaxed.length);

const report = `# Hold-down report

The wipeout spec's Part B checks hold-downs against the gameplay survey's §6: in 1–2 m plunging surf a surfer's hold-down mostly lasts 5–15 s (surf media and coaching; no measured study), set by the aerated, turbulent water under the roller, not by a timer.

Riders lie ${inside} m inside the ${spot} break point on the practice swell (Hs ${swell.significantHeight} m, Tp ${swell.peakPeriod} s), ${ALONGS.length} along the shore for each way of taking it. Each is knocked off its board as broken water (breaking ≥ ${BROKEN}) reaches it and watched for ${HOLD} s: relaxed, or swimming up (stroking) from ${SWIM_AFTER} s. A **hold-down** is the longest single stretch with the head under water. The riders are ghosts: they feel the water, its air and turbulence, and the lip, and push back on none of it.

${seedCount} seed(s), ${minutes} simulated min each. Run time ${fixed(wall, 0)} s for ${fixed(seaSeconds, 0)} s of sea.

| way | n | median hold-down, s | 10th to 90th percentile, s | within 5–15 s | median time under in ${HOLD} s | median time to swim again, s | median lowest breath | held down too long |
|---|---|---|---|---|---|---|---|---|
${WAYS.map(row).join('\n')}

## Against the survey (§6)

| check | expectation | measured | verdict |
|---|---|---|---|
| relaxed hold-downs in 1–2 m surf | mostly 5–15 s | ${Math.round(share * 100)} % within, median ${fixed(quantile(relaxed, 0.5))} s | ${share >= 0.5 ? 'met' : 'not met'} |

A check that is not met is investigated, never tuned into passing (the gameplay spec's principle 3).
`;
writeFileSync(output, report);
console.log(report);
