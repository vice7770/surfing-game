/**
 * Catch report (P4e task 5, P4f): a bot surfer on each spot's physical surf
 * zone. It waits prone a few metres outside the break line, paddles for the
 * beach when a crest rises behind it, pops up on the cue and rides straight in
 * until it falls or the wave leaves it. Writes docs/research/catch-report.md.
 *
 *   npm run report:catch -- --seeds 2 --minutes 3
 *   npm run report:catch -- --spots point --offset 5 --out /tmp/point.md
 */
import { writeFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { DEFAULT_PHYSICAL_SETTINGS, spreadingFor } from '../src/game/PhysicalMode';
import type { SpotName } from '../src/wave/Bathymetry';
import { SURF_ZONE_STEP, SurfZoneRunner, type RideRequest } from '../src/wave/SurfZoneRunner';

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const argument = (name: string, fallback: number): number => Number(option(name) ?? fallback);
const seedCount = argument('seeds', 2);
const minutes = argument('minutes', 3);
/** How far outside the break line the bot waits, m. */
const offset = argument('offset', 3);
const spots = (option('spots')?.split(',') ?? ['beach', 'point', 'reef', 'canyon']) as SpotName[];
const output = option('out') ?? 'docs/research/catch-report.md';
const settings = {
  ...DEFAULT_PHYSICAL_SETTINGS,
  significantHeight: argument('hs', DEFAULT_PHYSICAL_SETTINGS.significantHeight),
  peakPeriod: argument('tp', DEFAULT_PHYSICAL_SETTINGS.peakPeriod),
};

/** A crest this far above still water within LOOK m behind the board starts a paddle; the bot gives up after GIVE_UP s without a cue. */
const RISE = 0.25 * settings.significantHeight;
const LOOK = argument('look', 14);
const GIVE_UP = 8;
/** Standing, the ride ends when the board is this slow, m/s, for RIDE_END s. */
const STALL = 1.5;
const RIDE_END = 1;

type Outcome = 'no cue' | 'no support' | 'fell riding' | 'wave left';

interface Attempt {
  cue: boolean;
  popUp: boolean;
  stood: boolean;
  ride: number;
  topSpeed: number;
  outcome: Outcome;
  separation?: string;
}

function runSpot(spot: SpotName, seed: number): { attempts: Attempt[]; seconds: number } {
  const runner = new SurfZoneRunner({
    spot,
    seed,
    significantHeight: settings.significantHeight,
    peakPeriod: settings.peakPeriod,
    directionDegrees: settings.directionDegrees,
    spreading: spreadingFor(settings.spread),
    tide: settings.tide,
    windSpeed: settings.windSpeed,
  }, { rider: true });
  const session = runner.session!;
  const lineup = new Vector3(runner.focus.x, 0, runner.focus.z - offset);
  const home = () => session.reset(lineup, 0, runner.water);
  home();
  const attempts: Attempt[] = [];
  let attempt: Attempt | undefined;
  let clock = 0;
  let stalled = 0;
  const steps = Math.round((minutes * 60) / SURF_ZONE_STEP);
  const request: RideRequest = { paddle: false, popUp: false, steer: 0, retry: false };
  const finish = (outcome: Outcome) => {
    if (attempt) {
      attempt.outcome = outcome;
      attempt.separation = session.separation;
      attempts.push(attempt);
    }
    attempt = undefined;
    home();
  };
  for (let step = 0; step < steps; step += 1) {
    request.popUp = false;
    const { board, rider } = session;
    if (!attempt) {
      // Watch behind: a crest rising within LOOK m seaward of the board.
      let crest = -Infinity;
      for (let back = 2; back <= LOOK; back += 2) crest = Math.max(crest, runner.water.surfaceAt(board.position.x, board.position.z - back));
      request.paddle = crest - settings.tide > RISE;
      if (request.paddle) {
        attempt = { cue: false, popUp: false, stood: false, ride: 0, topSpeed: 0, outcome: 'no cue' };
        clock = 0;
        stalled = 0;
      }
    } else {
      clock += SURF_ZONE_STEP;
      attempt.topSpeed = Math.max(attempt.topSpeed, board.velocity.length());
      if (!rider.attached) {
        finish(attempt.stood ? 'fell riding' : 'no support');
      } else if (rider.phase === 'prone') {
        request.paddle = true;
        if (rider.popUpCue) {
          attempt.cue = true;
          attempt.popUp = true;
          request.popUp = true;
          request.paddle = false;
        } else if (clock > GIVE_UP) {
          finish(attempt.cue ? 'no support' : 'no cue');
        }
      } else if (rider.phase === 'recover') {
        finish('no support');
      } else {
        request.paddle = false;
        if (rider.popUpReport.outcome === 'stood') attempt.stood = true;
        if (attempt.stood) {
          attempt.ride += SURF_ZONE_STEP;
          stalled = board.velocity.length() < STALL ? stalled + SURF_ZONE_STEP : 0;
          if (stalled > RIDE_END) finish('wave left');
        }
      }
    }
    runner.advance(1, request);
  }
  if (attempt) finish(attempt.stood ? 'wave left' : 'no cue');
  return { attempts, seconds: minutes * 60 };
}

const quantile = (values: number[], q: number) => {
  if (!values.length) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
};
const fixed = (value: number, digits = 1) => (Number.isFinite(value) ? value.toFixed(digits) : '—');

const rows: string[] = [];
const causes: string[] = [];
const started = Date.now();
for (const spot of spots) {
  const all: Attempt[] = [];
  let seconds = 0;
  for (let seed = 1; seed <= seedCount; seed += 1) {
    const run = runSpot(spot, seed);
    all.push(...run.attempts);
    seconds += run.seconds;
    console.error(`${spot} seed ${seed}: ${run.attempts.length} attempts, ${run.attempts.filter((a) => a.stood).length} stood, ${((Date.now() - started) / 1000).toFixed(0)} s elapsed`);
  }
  const stood = all.filter((a) => a.stood);
  const rides = stood.map((a) => a.ride);
  rows.push(`| ${spot} | ${all.length} | ${all.filter((a) => a.cue).length} | ${all.filter((a) => a.popUp).length} | ${stood.length} | ${fixed(quantile(rides, 0.5))} | ${fixed(quantile(rides, 0.9))} | ${fixed(Math.max(0, ...rides))} | ${fixed(Math.max(0, ...all.map((a) => a.topSpeed)))} | ${fixed(all.length / (seconds / 60))} |`);
  const tally = new Map<string, number>();
  for (const a of all) {
    const key = a.outcome === 'fell riding' || a.outcome === 'no support' ? `${a.outcome}${a.separation ? ` (${a.separation})` : ''}` : a.outcome;
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  causes.push(`| ${spot} | ${[...tally.entries()].map(([key, count]) => `${key}: ${count}`).join(', ') || '—'} |`);
}

const report = `# Catch report · physical surf zone

Generated by \`npm run report:catch -- ${process.argv.slice(2).join(' ')}\` on ${new Date().toISOString().slice(0, 10)} (P4e task 5, P4f; reported, not asserted).

**Conditions.** The Wave Lab defaults: Hs ${settings.significantHeight} m, Tp ${settings.peakPeriod} s, ${settings.directionDegrees}° from shore-normal, spreading s ${spreadingFor(settings.spread).toFixed(0)}, tide ${settings.tide} m, calm wind. Seeds 1–${seedCount}, ${minutes} min each.

**The bot.** It waits prone, nose to the beach, ${offset} m outside the break line. It paddles when a crest more than ${fixed(RISE, 2)} m above still water rises within ${LOOK} m behind it. It pops up the moment the cue lights and gives up after ${GIVE_UP} s without one. Standing, it rides straight with no steering until it falls, or until the board has been slower than ${STALL} m/s for ${RIDE_END} s. After every attempt it goes back to its spot in the lineup.

| Spot | Attempts | Cue lit | Pop-ups | Stood | Median ride, s | 90th percentile, s | Longest, s | Top speed, m/s | Attempts / min |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
${rows.join('\n')}

How the attempts ended:

| Spot | Outcomes (with the rider's separation cause) |
|---|---|
${causes.join('\n')}
`;

writeFileSync(output, report);
console.error(`wrote ${output}`);
