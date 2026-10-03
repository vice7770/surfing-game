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
 *   npm run report:catch -- --ghosts --hs 2.4 --tp 14 --spread 0.2   (the Surf screen's Big swell)
 *   npm run report:catch -- --spots padang --swell small --barrel            (the swept barrel: its contact and crash)
 *   npm run report:catch -- --spots padang --swell small --barrel --no-crash (its contact, with Kennedy's lip: before PR 5)
 *   npm run report:catch -- --spots padang --swell small --barrel --no-contact (the crash, no swept contact: dev-only, below)
 *   npm run report:catch -- --spots padang --swell small --barrel --no-gate    (the crash, its whitewater the solver's own: dev-only)
 *   npm run report:catch -- --spots padang --swell small --barrel --exposure   (and what the bots met while prone: dev-only)
 *   npm run report:catch -- --spots padang --swell small --barrel --no-felt-air (the bots feel no air in the water: dev-only)
 *   npm run report:catch -- --spots padang --swell small --barrel --exposure --attempts /tmp/attempts.json (each attempt: dev-only)
 */
import { writeFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { DEFAULT_PHYSICAL_SETTINGS, swellFor } from '../src/game/PhysicalMode';
import type { LipParcelSource } from '../src/physics/DetachedSurfer';
import { RideSession } from '../src/physics/RideSession';
import type { SurfWater } from '../src/physics/SurfWater';
import type { SpotName } from '../src/wave/Bathymetry';
import { applyPadangShape } from './padangShape';
import { applyReefShape } from './reefShape';
import { chosenSwell, swellSizeOption } from './spotSwell';
import { alongShift } from './botSpots';
import { SURF_ZONE_STEP, SurfZoneRunner } from '../src/wave/SurfZoneRunner';
import { readBarrelCases } from '../src/wave/barrel/nodeBarrelCases';
import type { SweptCrash } from '../src/wave/barrel/SweptCrash';

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const argument = (name: string, fallback: number): number => Number(option(name) ?? fallback);
const flag = (name: string): boolean => process.argv.includes(`--${name}`);
const seedCount = argument('seeds', 2);
const minutes = argument('minutes', 3);
const ghosts = flag('ghosts');
/** The swept barrel at a swept spot (Part B): the bots ride its contact; `--no-crash` keeps Kennedy's lip there (before PR 5). */
const barrel = flag('barrel');
const crash = !flag('no-crash');
/**
 * Dev-only, to tell the causes apart when the cue lights less often with the crash than with Kennedy's lip. Both change
 * nothing unless given, and both leave the crash's jets thrown and poured:
 * - `--no-contact` builds no swept contact, so three things change at once, as before PR 4: the bots ride the solver's
 *   water, not the swept barrel's drawn surface; the lip's carve is back in it (`PhysicalSurfWater.forSimulation` carves
 *   only without a contact); and the lip's parcels strike them (below, `session.strike`);
 * - `--no-gate`: the whitewater over an open curl is the solver's own breaking, not withheld until the curl's touchdown
 *   (`ungate`, in this report alone).
 * `--exposure` (dev-only too, and read-only) adds tables of what the bots' own water samples met while they lay prone, from
 * each attempt's paddle start to its cue or its crest's passing: the contact, the air and the water's forward speed.
 * `--no-felt-air` (dev-only, any spot): the bots feel no air in the water. Their samples' void fraction is set to 0 in this
 * report alone, so the board and the body float, plane and drag in unaerated water; the sea, the game's code and its config
 * are unchanged, and `--exposure` still reports the air the samples met.
 * `--attempts <file>` (dev-only) writes each attempt as JSON: its bot, start, cue and outcome, and with `--exposure` its
 * window's tallies, for tests across runs.
 */
const contact = !flag('no-contact');
const gate = !flag('no-gate');
const exposure = flag('exposure');
const feltAir = !flag('no-felt-air');
const attemptsFile = option('attempts');
if ((!contact || !gate) && !barrel) throw new Error('--no-contact and --no-gate need --barrel');
if (!gate && !crash) throw new Error('--no-gate needs the crash: drop --no-crash');
/** Where the bots wait: metres along shore from the break point, and metres outside the break line (negative: inside). */
const alongs = ghosts ? [-45, -25, -5, 15, 35] : [0];
const offsets = ghosts ? [-8, -4, 0, 4, 8, 12] : [argument('offset', 3)];
// Reshape the Reef for this run: `--reef angle=50,crestZ=-125` (the design sweep).
applyReefShape(option('reef'));
applyPadangShape(option('padang'));
/** `--swell small|medium|big`: each spot's own buoy swell for that size, in place of `--hs`/`--tp`. */
const swellSize = swellSizeOption(option('swell'));
const spots = (option('spots')?.split(',') ?? ['beach', 'point', 'reef', 'canyon', 'padang']) as SpotName[];
const output = option('out') ?? 'docs/research/catch-report.md';
const practice = flag('practice');
const settings = practice ? { ...DEFAULT_PHYSICAL_SETTINGS, source: 'practice' as const } : {
  ...DEFAULT_PHYSICAL_SETTINGS,
  significantHeight: argument('hs', DEFAULT_PHYSICAL_SETTINGS.significantHeight),
  peakPeriod: argument('tp', DEFAULT_PHYSICAL_SETTINGS.peakPeriod),
  spread: argument('spread', DEFAULT_PHYSICAL_SETTINGS.spread),
};
/** Each spot's swell: its own Practice when practising (the Reef and Padang Padang have one), or its own buoy swell for `--swell`. */
const swellAt = (spot: SpotName) => (swellSize && !practice ? chosenSwell(spot, swellSize) : swellFor({ ...settings, spot }));
/** The swell's direction, or `--direction` (the Reef's design sweep). */
const directionAt = (spot: SpotName) => option('direction') !== undefined ? Number(option('direction')) : swellAt(spot).directionDegrees ?? settings.directionDegrees;

/** A crest this far above still water within LOOK m behind the board starts a paddle; the bot gives up after GIVE_UP s without a cue. */
const riseAt = (spot: SpotName) => 0.25 * swellAt(spot).significantHeight;
const LOOK = argument('look', 14);
const GIVE_UP = 8;
/** Standing, the ride ends when the board is this slow, m/s, for RIDE_END s. */
const STALL = 1.5;
const RIDE_END = 1;
/** `--exposure` counts air only in a wet sample at this void fraction or more (the advisor, 2026-10-03; a reporting floor). */
const AIR = 0.01;

type Outcome = 'no cue' | 'no support' | 'fell riding' | 'wave left';
/** How an attempt's `--exposure` window closed: at its cue, at its crest's passing, or with the attempt. */
type Closed = 'cue' | 'crest' | 'end';

interface Attempt {
  /** Its bot (`--attempts`), where the bot waits along shore from the break point, m, and outside the break line, m. */
  bot: number;
  along: number;
  offset: number;
  /** The step its paddle began, the step it ended, and the step the bot saw its cue (lit at the end of the step before). */
  start: number;
  end: number;
  cueStep?: number;
  cue: boolean;
  popUp: boolean;
  stood: boolean;
  ride: number;
  topSpeed: number;
  outcome: Outcome;
  separation?: string;
  /**
   * With `--exposure`, its window: from its paddle start to its cue or its crest's passing, its bot prone. Over the
   * window's steps: those in which one of the bot's own water samples was the swept contact's; those in which a wet one
   * (its point under the water's surface) had air in it, α ≥ AIR, with the sum and the top of each step's largest such α;
   * and the water's forward speed under the board (below), its steps, sum, top and each step's value.
   */
  open: boolean;
  closed?: Closed;
  /** Its cue lit after its window closed at its crest's passing (a check on the passing's test). */
  cueAfterPassing: boolean;
  window: number;
  contactSteps: number;
  airSteps: number;
  airSum: number;
  maxAir: number;
  flowSteps: number;
  flowSum: number;
  flowMax: number;
  flows: number[];
}

/** One bot: its spot in the lineup and the attempt under way. */
interface Bot {
  index: number;
  session: RideSession;
  home: Vector3;
  along: number;
  offset: number;
  attempt?: Attempt;
  clock: number;
  stalled: number;
}

/**
 * `--no-gate`, in this report alone: after each of the crash's steps the whitewater is the solver's breaking again, as
 * if no open curl withheld any. The gate writes only the whitewater, which the crash copies afresh from the breaking at
 * each step's start and reads nowhere else, so its jets are thrown, crashed and poured as with the gate on (its `gated`
 * tally still counts the cells it would have withheld).
 */
function ungate(sweptCrash: SweptCrash): void {
  const update = sweptCrash.update.bind(sweptCrash);
  sweptCrash.update = (points, sea) => {
    const done = update(points, sea);
    sea.whitewater.set(sea.strength);
    return done;
  };
}

function runSpot(spot: SpotName, seed: number): { attempts: Attempt[]; seconds: number } {
  const swell = swellAt(spot);
  const direction = directionAt(spot);
  const rise = riseAt(spot);
  const runner = new SurfZoneRunner({
    spot,
    seed,
    significantHeight: swell.significantHeight, heightAt: (settings.source === 'practice' ? 'edge' : 'deep') as 'edge' | 'deep',
    peakPeriod: swell.peakPeriod,
    directionDegrees: direction,
    spreading: swell.spreading,
    bandwidth: swell.bandwidth,
    tide: settings.tide,
    windSpeed: settings.windSpeed,
    ...(crash ? {} : { sweptCrash: false }),
  }, barrel ? { barrelCases: readBarrelCases(spot), ...(contact ? { contact: true } : {}) } : {});
  if (!gate && runner.simulation.crash) ungate(runner.simulation.crash);
  // `--exposure`: what the watched bot's own samples meet this step. It only reads the samples the bot takes anyway.
  const met: { watching: boolean; board?: Readonly<Vector3>; contact: boolean; air: number; flowSum: number; flows: number } = {
    watching: false, contact: false, air: 0, flowSum: 0, flows: 0,
  };
  // Ghosts: the water's reactions and the lip's recoil are dropped.
  const water: SurfWater = {
    sampleAt: (x, y, z, out) => {
      const sample = runner.water.sampleAt(x, y, z, out);
      if (met.watching) {
        // The swept contact sets `covered` wherever it answers a sample and clears it everywhere else.
        if (sample.covered !== undefined) met.contact = true;
        // Air only where a body can feel it: a wet sample, its point in a wet column and under the water's surface (with
        // the contact, the curl's top in its water, and the floor under the tube's air, where the point is dry).
        const air = sample.voidFraction ?? 0;
        if (air >= AIR && sample.wet && !sample.outsideDomain && y < sample.surfaceY) met.air = Math.max(met.air, air);
        // The water under the board: the rider's own samples at the board's centre (its planing check, each substep, and
        // the cue's), their flow toward the beach, read as 0 outside the domain as the rider reads it.
        const board = met.board;
        if (board && x === board.x && y === board.y && z === board.z) {
          met.flowSum += sample.outsideDomain ? 0 : sample.flowZ;
          met.flows += 1;
        }
      }
      // `--no-felt-air`: the bots feel none of the air, which the exposure has read above.
      if (!feltAir) sample.voidFraction = 0;
      return sample;
    },
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
  const bots: Bot[] = [];
  // Near an open edge (the Reef's peak) the row slides along shore to keep every bot inside the window.
  const shift = alongShift(runner, alongs);
  if (shift !== 0) console.error(`${spot} seed ${seed}: bots slid ${shift.toFixed(1)} m along shore to stay inside the window`);
  for (const along of alongs) {
    for (const offset of offsets) {
      const bot: Bot = {
        index: bots.length, session: new RideSession(), home: new Vector3(runner.focus.x + along + shift, 0, runner.focus.z - offset),
        along, offset, clock: 0, stalled: 0,
      };
      bot.session.reset(bot.home, 0, water);
      bots.push(bot);
    }
  }
  const attempts: Attempt[] = [];
  let now = 0;
  /** `--exposure`: an attempt's window closes once, at its cue, at its crest's passing, or with the attempt. */
  const close = (attempt: Attempt, how: Closed) => {
    if (!attempt.open) return;
    attempt.open = false;
    attempt.closed = how;
  };
  /**
   * `--exposure`: the crest has passed once no water within LOOK m behind the board, at the watch's own points, stands
   * higher than the water at the board, so the crest is under the board or ahead of it (the report's own test).
   */
  const crestPassed = (at: Readonly<Vector3>) => {
    const here = water.surfaceAt(at.x, at.z);
    for (let back = 2; back <= LOOK; back += 2) if (water.surfaceAt(at.x, at.z - back) > here) return false;
    return true;
  };
  const finish = (bot: Bot, outcome: Outcome) => {
    if (bot.attempt) {
      bot.attempt.outcome = outcome;
      bot.attempt.end = now;
      close(bot.attempt, 'end');
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
    now = step;
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
        if (crest - settings.tide > rise) {
          attempt = bot.attempt = {
            bot: bot.index, along: bot.along, offset: bot.offset, start: step, end: step,
            cue: false, popUp: false, stood: false, ride: 0, topSpeed: 0, outcome: 'no cue',
            open: exposure, cueAfterPassing: false, window: 0, contactSteps: 0, airSteps: 0, airSum: 0, maxAir: 0,
            flowSteps: 0, flowSum: 0, flowMax: -Infinity, flows: [],
          };
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
            if (!attempt.cue) {
              attempt.cueStep = step;
              if (attempt.closed === 'crest') attempt.cueAfterPassing = true;
            }
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
      // `--exposure`: the attempt's window, from its paddle start to its cue (lit at the end of the step before, so this
      // step's pop-up is outside it) or its crest's passing. This step's samples count for it while the window is open.
      if (attempt?.open) {
        if (attempt.cue) close(attempt, 'cue');
        else if (crestPassed(board.position)) close(attempt, 'crest');
      }
      const watched = attempt?.open && rider.attached && rider.phase === 'prone' ? attempt : undefined;
      met.watching = watched !== undefined;
      met.board = board.position;
      met.contact = false;
      met.air = 0;
      met.flowSum = 0;
      met.flows = 0;
      session.step(SURF_ZONE_STEP, water, request);
      met.watching = false;
      if (watched) {
        watched.window += 1;
        if (met.contact) watched.contactSteps += 1;
        if (met.air > 0) watched.airSteps += 1;
        watched.airSum += met.air;
        watched.maxAir = Math.max(watched.maxAir, met.air);
        if (met.flows > 0) {
          const flow = met.flowSum / met.flows;
          watched.flowSteps += 1;
          watched.flowSum += flow;
          watched.flowMax = Math.max(watched.flowMax, flow);
          watched.flows.push(flow);
        }
      }
      // As in the game: on the swept contact the lip strikes through it, and its parcels strike no one (PR 4).
      if (!runner.contact) session.strike(lip);
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
/** The attempts' outcomes tallied, each with the rider's separation cause or the stand check that refused. */
const outcomes = (attempts: readonly Attempt[]) => {
  const tally = new Map<string, number>();
  for (const a of attempts) {
    const key = a.outcome === 'fell riding' || a.outcome === 'no support' ? `${a.outcome}${a.separation ? ` (${a.separation})` : ''}` : a.outcome;
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }
  return [...tally.entries()].map(([key, count]) => `${key}: ${count}`).join(', ') || '—';
};
/** How the attempts' `--exposure` windows closed. */
const closings = (attempts: readonly Attempt[]) => {
  const count = (how: Closed) => attempts.filter((a) => a.closed === how).length;
  return `cue ${count('cue')}, crest's passing ${count('crest')}, attempt's end ${count('end')}`;
};

const rows: string[] = [];
const causes: string[] = [];
const starts: string[] = [];
const exposed: string[] = [];
const under: string[] = [];
const late: string[] = [];
/** Every attempt, with its spot and seed (`--attempts`). */
const dumped: Array<Attempt & { spot: SpotName; seed: number }> = [];
const started = Date.now();
const bots = alongs.length * offsets.length;
for (const spot of spots) {
  const all: Attempt[] = [];
  let seconds = 0;
  for (let seed = 1; seed <= seedCount; seed += 1) {
    const run = runSpot(spot, seed);
    all.push(...run.attempts);
    if (attemptsFile) dumped.push(...run.attempts.map((a) => ({ ...a, spot, seed })));
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
  causes.push(`| ${spot} | ${outcomes(all)} |`);
  if (exposure) {
    const total = (group: readonly Attempt[], key: 'window' | 'contactSteps' | 'airSteps' | 'airSum') => group.reduce((sum, a) => sum + a[key], 0);
    for (const [cue, group] of [['lit', all.filter((a) => a.cue)], ['never lit', all.filter((a) => !a.cue)]] as const) {
      const window = total(group, 'window');
      exposed.push(`| ${spot} | ${cue} | ${group.length} | ${fixed(window * SURF_ZONE_STEP)} | ${group.filter((a) => a.contactSteps > 0).length} | ${fixed(total(group, 'contactSteps') * SURF_ZONE_STEP)} | ${group.filter((a) => a.airSteps > 0).length} | ${fixed(total(group, 'airSteps') * SURF_ZONE_STEP)} | ${fixed(total(group, 'airSum') / window, 4)} | ${fixed(Math.max(0, ...group.map((a) => a.maxAir)), 3)} | ${closings(group)} | ${outcomes(group)} |`);
    }
    for (const offset of offsets) {
      const here = all.filter((a) => a.offset === offset);
      const steps = here.flatMap((a) => a.flows);
      const tops = here.filter((a) => a.flowSteps > 0).map((a) => a.flowMax);
      under.push(`| ${spot} | ${offset} | ${here.length} | ${fixed(total(here, 'window') * SURF_ZONE_STEP)} | ${here.filter((a) => a.airSteps > 0).length} | ${fixed(total(here, 'airSteps') * SURF_ZONE_STEP)} | ${steps.length} | ${fixed(quantile(steps, 0.5), 2)} | ${fixed(quantile(steps, 0.9), 2)} | ${tops.length} | ${fixed(quantile(tops, 0.5), 2)} | ${fixed(quantile(tops, 0.9), 2)} |`);
    }
    late.push(`${spot} ${all.filter((a) => a.cueAfterPassing).length} of ${all.filter((a) => a.cue).length}`);
  }
}

const seaAt = (spot: SpotName) => {
  const swell = swellAt(spot);
  return practice
    ? `${spot}: the narrow-band practice groundswell (Hs ${swell.significantHeight} m, Tp ${swell.peakPeriod} s, spreading s ${swell.spreading}, band ±${Math.round(swell.bandwidth! * 100)} %, ${directionAt(spot)}° from shore-normal)`
    : `${spot}: a buoy swell, Hs ${swell.significantHeight} m, Tp ${swell.peakPeriod} s, ${directionAt(spot)}° from shore-normal, spreading s ${swell.spreading.toFixed(0)}`;
};
const sea = `${practice ? 'Practice mode' : 'Buoy swells'}, tide ${settings.tide} m, calm wind. ${spots.map(seaAt).join('; ')}`;
const where = ghosts
  ? `${bots} bots share the sea, at ${alongs.join(', ')} m along shore from the break point and ${offsets.join(', ')} m outside the break line (negative: inside)`
  : `One bot waits ${offsets[0]} m outside the break line`;
/** What the bots ride at a swept spot, as the report says it: by default the contact with the crash's jets on their own clock (PR 5). */
const ridden = contact
  ? `the swept barrel's contact, ${crash ? 'its jets on its own clock (PR 5)' : 'with Kennedy\'s lip (before PR 5)'}`
  : `the solver's water with no swept contact, the lip's carve in it and its parcels striking them (--no-contact); the swept barrel's ${crash
    ? 'jets run on its own clock (PR 5)'
    : 'lip is Kennedy\'s (before PR 5)'}`;
const ungated = gate ? '' : ', the whitewater the solver\'s own over an open curl (--no-gate)';
const unfelt = feltAir ? '' : ' The bots feel no air in the water: their samples\' void fraction is set to 0 in this report alone (--no-felt-air, dev-only).';
const report = `# Catch report · physical surf zone

Generated by \`npm run report:catch -- ${process.argv.slice(2).join(' ')}\` on ${new Date().toISOString().slice(0, 10)} (P4e task 5, P4f; reported, not asserted).

**Conditions.** ${sea}. Stage 2 (Boussinesq) surf zone.${barrel ? ` At a swept spot the bots ride ${ridden}${ungated}.` : ''}${unfelt} ${seedCount === 1 ? 'Seed 1' : `Seeds 1–${seedCount}`}, ${minutes} min each.

**The bots.** ${where}, prone, nose to the beach. The bots are ghosts: they feel the water and the lip, but neither feels them. A bot paddles when a crest more than a quarter of the swell's height above still water (${spots.map((spot) => `${spot} ${fixed(riseAt(spot), 2)} m`).join(', ')}) rises within ${LOOK} m behind it. It pops up the moment the cue lights and gives up after ${GIVE_UP} s without one. Standing, it rides straight with no steering until it falls, or until the board has been slower than ${STALL} m/s for ${RIDE_END} s. After every attempt it goes back to its spot in the lineup.

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
` : ''}${exposure ? `
While prone (\`--exposure\`, dev-only): what each bot's own water samples met over its attempt's window, from its paddle start to its cue (lit at the end of a step; the next step's pop-up is outside it) or its crest's passing, the bot prone throughout. The crest has passed once no water within ${LOOK} m behind the board, at the watch's 2 m points, stands higher than the water at the board (the report's own test). The contact: a sample the swept contact answered, the drawn barrel's surface in place of the solver's. Air: a wet sample (its point in a wet column, under the water's surface) with void fraction α ≥ ${AIR}; the board floats, planes and drags in the mixture's density ρ(1 − α), and the cue asks for planing pressure. α is each step's largest over those samples (0 in a step with none), and the times are summed over the attempts.${feltAir ? '' : ' With --no-felt-air the bots felt none of this air: the table gives what their samples met.'}

| Spot | Cue | Attempts | Window, s | Met the contact | With it, s | In air | In air, s | α in the window, mean | α, largest | How the windows closed | How they ended |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
${exposed.join('\n')}

Cues lit after their window closed at the crest's passing: ${late.join(', ')}.

By start, over the same windows: the water's forward speed under the prone board, the flow toward the beach (+z, the bots' heading) in the bot's own samples at the board's centre (where the rider's planing check reads the water under the board), averaged over each step's samples. Per step: every window step of the row's attempts with such a sample. Per attempt: each attempt's largest step, over the attempts with one.

| Spot | Start, m | Attempts | Window, s | In air | In air, s | Steps | Per step: median, m/s | Per step: 90th percentile, m/s | Attempts with a step | Per attempt, its largest: median, m/s | Per attempt, its largest: 90th percentile, m/s |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
${under.join('\n')}
` : ''}`;

writeFileSync(output, report);
console.error(`wrote ${output}`);
if (attemptsFile) {
  writeFileSync(attemptsFile, `${JSON.stringify({ args: process.argv.slice(2), step: SURF_ZONE_STEP, attempts: dumped })}\n`);
  console.error(`wrote ${attemptsFile}`);
}
