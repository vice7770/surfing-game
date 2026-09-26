/**
 * Catch report (P4e task 5, P4f): bot surfers on each spot's physical surf
 * zone. Each waits prone outside the break line, paddles for the beach when a
 * crest rises behind it, pops up on the cue and rides straight in until it
 * falls or the wave leaves it. The bots are ghosts: they feel the water and the
 * lip but push back on neither, so many share one sea (`--ghosts` spreads 30 of
 * them along and across the break line). Writes docs/research/catch-report.md.
 *
 *   npm run report:catch -- --seeds 2 --minutes 3
 *   npm run report:catch -- --spots point --offset 5 --out /tmp/point.md
 *   npm run report:catch -- --practice --ghosts --spots point,reef
 */
import { writeFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { DEFAULT_PHYSICAL_SETTINGS, swellFor } from '../src/game/PhysicalMode';
import type { LipParcelSource } from '../src/physics/DetachedSurfer';
import { RideSession } from '../src/physics/RideSession';
import type { SurfWater } from '../src/physics/SurfWater';
import type { SpotName } from '../src/wave/Bathymetry';
import { SURF_ZONE_STEP, SurfZoneRunner } from '../src/wave/SurfZoneRunner';

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const argument = (name: string, fallback: number): number => Number(option(name) ?? fallback);
const flag = (name: string): boolean => process.argv.includes(`--${name}`);
const seedCount = argument('seeds', 2);
const minutes = argument('minutes', 3);
const ghosts = flag('ghosts');
/** Where the bots wait: metres along shore from the break point, and metres outside the break line (negative: inside). */
const alongs = ghosts ? [-45, -25, -5, 15, 35] : [0];
const offsets = ghosts ? [-8, -4, 0, 4, 8, 12] : [argument('offset', 3)];
const spots = (option('spots')?.split(',') ?? ['beach', 'point', 'reef', 'canyon']) as SpotName[];
const output = option('out') ?? 'docs/research/catch-report.md';
const practice = flag('practice');
const settings = practice ? { ...DEFAULT_PHYSICAL_SETTINGS, source: 'practice' as const } : {
  ...DEFAULT_PHYSICAL_SETTINGS,
  significantHeight: argument('hs', DEFAULT_PHYSICAL_SETTINGS.significantHeight),
  peakPeriod: argument('tp', DEFAULT_PHYSICAL_SETTINGS.peakPeriod),
};
const swell = swellFor(settings);
const direction = swell.directionDegrees ?? settings.directionDegrees;

/** A crest this far above still water within LOOK m behind the board starts a paddle; the bot gives up after GIVE_UP s without a cue. */
const RISE = 0.25 * swell.significantHeight;
const LOOK = argument('look', 14);
const GIVE_UP = 8;
/** Standing, the ride ends when the board is this slow, m/s, for RIDE_END s. */
const STALL = 1.5;
const RIDE_END = 1;

type Outcome = 'no cue' | 'no support' | 'fell riding' | 'wave left';

interface Attempt {
  offset: number;
  cue: boolean;
  popUp: boolean;
  stood: boolean;
  ride: number;
  topSpeed: number;
  outcome: Outcome;
  separation?: string;
}

/** One bot: its spot in the lineup and the attempt under way. */
interface Bot {
  session: RideSession;
  home: Vector3;
  offset: number;
  attempt?: Attempt;
  clock: number;
  stalled: number;
}

function runSpot(spot: SpotName, seed: number): { attempts: Attempt[]; seconds: number } {
  const runner = new SurfZoneRunner({
    spot,
    seed,
    significantHeight: swell.significantHeight,
    peakPeriod: swell.peakPeriod,
    directionDegrees: direction,
    spreading: swell.spreading,
    bandwidth: swell.bandwidth,
    tide: settings.tide,
    windSpeed: settings.windSpeed,
  });
  // Ghosts: the water's reactions and the lip's recoil are dropped.
  const water: SurfWater = {
    sampleAt: (x, y, z, out) => runner.water.sampleAt(x, y, z, out),
    surfaceAt: (x, z) => runner.water.surfaceAt(x, z),
    addReaction() {},
  };
  const recoil = new Vector3();
  const lip: LipParcelSource = {
    forEachContact: (visit) => runner.simulation.lip.forEachContact((parcel) => {
      recoil.copy(parcel.velocity);
      visit(parcel);
      parcel.velocity.copy(recoil);
    }),
  };
  const bots: Bot[] = [];
  for (const along of alongs) {
    for (const offset of offsets) {
      const bot: Bot = { session: new RideSession(), home: new Vector3(runner.focus.x + along, 0, runner.focus.z - offset), offset, clock: 0, stalled: 0 };
      bot.session.reset(bot.home, 0, water);
      bots.push(bot);
    }
  }
  const attempts: Attempt[] = [];
  const finish = (bot: Bot, outcome: Outcome) => {
    if (bot.attempt) {
      bot.attempt.outcome = outcome;
      const { refusal } = bot.session.rider.popUpReport;
      bot.attempt.separation = bot.session.separation ?? (outcome === 'no support' && refusal ? `refused: ${refusal}` : undefined);
      attempts.push(bot.attempt);
    }
    bot.attempt = undefined;
    bot.session.reset(bot.home, 0, water);
  };
  const steps = Math.round((minutes * 60) / SURF_ZONE_STEP);
  const request = { paddle: false, popUp: false, steer: 0 };
  for (let step = 0; step < steps; step += 1) {
    runner.advance(1);
    for (const bot of bots) {
      const { session } = bot;
      const { board, rider } = session;
      request.popUp = false;
      request.paddle = false;
      let attempt = bot.attempt;
      if (!attempt) {
        // Watch behind: a crest rising within LOOK m seaward of the board.
        let crest = -Infinity;
        for (let back = 2; back <= LOOK; back += 2) crest = Math.max(crest, water.surfaceAt(board.position.x, board.position.z - back));
        if (crest - settings.tide > RISE) {
          attempt = bot.attempt = { offset: bot.offset, cue: false, popUp: false, stood: false, ride: 0, topSpeed: 0, outcome: 'no cue' };
          bot.clock = 0;
          bot.stalled = 0;
        }
      }
      if (attempt) {
        bot.clock += SURF_ZONE_STEP;
        attempt.topSpeed = Math.max(attempt.topSpeed, board.velocity.length());
        if (!rider.attached) {
          finish(bot, attempt.stood ? 'fell riding' : 'no support');
          continue;
        } else if (rider.phase === 'prone') {
          request.paddle = true;
          if (rider.popUpCue) {
            attempt.cue = true;
            attempt.popUp = true;
            request.popUp = true;
            request.paddle = false;
          } else if (bot.clock > GIVE_UP) {
            finish(bot, attempt.cue ? 'no support' : 'no cue');
            continue;
          }
        } else if (rider.phase === 'recover') {
          finish(bot, 'no support');
          continue;
        } else {
          if (rider.popUpReport.outcome === 'stood') attempt.stood = true;
          if (attempt.stood) {
            attempt.ride += SURF_ZONE_STEP;
            bot.stalled = board.velocity.length() < STALL ? bot.stalled + SURF_ZONE_STEP : 0;
            if (bot.stalled > RIDE_END) {
              finish(bot, 'wave left');
              continue;
            }
          }
        }
      }
      session.step(SURF_ZONE_STEP, water, request);
      session.strike(lip);
      if (board.outsideDomain || !Number.isFinite(board.position.x + board.position.y + board.position.z)) finish(bot, attempt?.stood ? 'wave left' : 'no cue');
    }
  }
  for (const bot of bots) if (bot.attempt) finish(bot, bot.attempt.stood ? 'wave left' : 'no cue');
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
const starts: string[] = [];
const started = Date.now();
const bots = alongs.length * offsets.length;
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
  rows.push(`| ${spot} | ${all.length} | ${all.filter((a) => a.cue).length} | ${all.filter((a) => a.popUp).length} | ${stood.length} | ${rides.filter((ride) => ride >= 3).length} | ${fixed(quantile(rides, 0.5))} | ${fixed(quantile(rides, 0.9))} | ${fixed(Math.max(0, ...rides))} | ${fixed(Math.max(0, ...all.map((a) => a.topSpeed)))} | ${fixed(all.length / (seconds / 60) / bots)} |`);
  for (const offset of offsets) {
    const here = all.filter((a) => a.offset === offset);
    const up = here.filter((a) => a.stood);
    starts.push(`| ${spot} | ${offset} | ${here.length} | ${here.filter((a) => a.cue).length} | ${up.length} | ${up.map((a) => fixed(a.ride)).join(', ') || '—'} |`);
  }
  const tally = new Map<string, number>();
  for (const a of all) {
    const key = a.outcome === 'fell riding' || a.outcome === 'no support' ? `${a.outcome}${a.separation ? ` (${a.separation})` : ''}` : a.outcome;
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  causes.push(`| ${spot} | ${[...tally.entries()].map(([key, count]) => `${key}: ${count}`).join(', ') || '—'} |`);
}

const sea = practice
  ? `Practice mode: the narrow-band groundswell (Hs ${swell.significantHeight} m, Tp ${swell.peakPeriod} s, spreading s ${swell.spreading}, band ±${Math.round(swell.bandwidth! * 100)} %, ${direction}° from shore-normal), tide ${settings.tide} m, calm wind`
  : `The Wave Lab defaults: Hs ${swell.significantHeight} m, Tp ${swell.peakPeriod} s, ${direction}° from shore-normal, spreading s ${swell.spreading.toFixed(0)}, tide ${settings.tide} m, calm wind`;
const where = ghosts
  ? `${bots} bots share the sea, at ${alongs.join(', ')} m along shore from the break point and ${offsets.join(', ')} m outside the break line (negative: inside)`
  : `One bot waits ${offsets[0]} m outside the break line`;
const report = `# Catch report · physical surf zone

Generated by \`npm run report:catch -- ${process.argv.slice(2).join(' ')}\` on ${new Date().toISOString().slice(0, 10)} (P4e task 5, P4f; reported, not asserted).

**Conditions.** ${sea}. Stage 2 (Boussinesq) surf zone. Seeds 1–${seedCount}, ${minutes} min each.

**The bots.** ${where}, prone, nose to the beach. The bots are ghosts: they feel the water and the lip, but neither feels them. A bot paddles when a crest more than ${fixed(RISE, 2)} m above still water rises within ${LOOK} m behind it. It pops up the moment the cue lights and gives up after ${GIVE_UP} s without one. Standing, it rides straight with no steering until it falls, or until the board has been slower than ${STALL} m/s for ${RIDE_END} s. After every attempt it goes back to its spot in the lineup.

| Spot | Attempts | Cue lit | Pop-ups | Stood | Rides ≥ 3 s | Median ride, s | 90th percentile, s | Longest, s | Top speed, m/s | Attempts / bot / min |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
${rows.join('\n')}

How the attempts ended:

| Spot | Outcomes (with the rider's separation cause, or the stand check that refused) |
|---|---|
${causes.join('\n')}
${ghosts ? `
By start (metres outside the break line):

| Spot | Start, m | Attempts | Cue lit | Stood | Rides, s |
|---|---:|---:|---:|---:|---|
${starts.join('\n')}
` : ''}`;

writeFileSync(output, report);
console.error(`wrote ${output}`);
