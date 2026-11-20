/**
 * The analyser's own readings of autopilot rides, over a population (`npm run report:ride-reports`).
 *
 * This is the headless twin of the `?rideReports` dev route (src/dev/rideReports.ts) and it reads the **same shipped
 * feed**: a `LocalSurfZone` wrapping the shipped `SurfZoneRunner` with its rider, stepped with the autopilot's own
 * `RideInput`, and every finished reading taken from `SurfZoneStatus.ride.report` — the report `SurfZoneRunner.analyze`
 * publishes. Nothing here builds a `RideAnalyzer`, pushes a `RideSample`, or decides what a turn was.
 *
 * That is the one thing it does differently from `scripts/ride-report.ts`, which constructs its own `RideAnalyzer`
 * and assembles its own samples in a copy of `SurfZoneRunner.analyze`'s arithmetic. That report exercises the
 * analyser class; this one exercises the shipped feed, so the manoeuvre columns it prints are the ones the game would
 * put in a Logbook.
 *
 * It changes no physics and applies no force. The autopilot's steer, paddle and pop-up go in through `RideInput`,
 * exactly as the film recorder's do — and, like the recorder's, they do not pass through `src/game/Controls.ts`.
 *
 *   npm run report:ride-reports -- --spot canyon --search '?canyonWaves=true' --rides 20 --seeds 4
 *   npm run report:ride-reports -- --spot canyon --search '?canyonWaves=true' --out /tmp/canyon.json
 *
 * **It is slow, measured, not guessed: the Canyon's sea steps here at roughly a tenth of real time** (four minutes of
 * sea time had not finished after forty-five minutes of wall clock on an M4 Pro, one process). That is the CPU tier
 * doing the solver's work on one core. For a population, drive the `?rideReports` route in a browser instead, where
 * `&compute=gpu` puts the sea on the GPU and the same Canyon steps at about six tenths of real time — fifteen times
 * faster for the same shipped feed. This harness is for a GPU-less machine, a single seed, or a check in CI.
 */
import { writeFileSync } from 'node:fs';
import { Autopilot, autopilotView, type AutopilotInput } from '../src/dev/Autopilot';
import { DEFAULT_PHYSICAL_SETTINGS, surfZoneConfigFor, type PhysicalSettings } from '../src/game/PhysicalMode';
import type { RideReport } from '../src/game/rideAnalysis';
import { LocalSurfZone } from '../src/game/SurfZoneHost';
import type { SpotName } from '../src/wave/Bathymetry';

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const number = (name: string, fallback: number): number => Number(option(name) ?? fallback);

const spot = (option('spot') ?? 'canyon') as SpotName;
const source = (option('source') ?? 'practice') as PhysicalSettings['source'];
const style = (option('style') ?? 'turns') as 'line' | 'turns' | 'flow';
/** How many finished rides to collect in all, and how many seeds to spread them over. */
const wanted = number('rides', 20);
const seeds = number('seeds', 4);
const firstSeed = number('first-seed', 1);
/** The longest each seed is stepped, minutes of sea time. */
const minutes = number('minutes', 25);
const output = option('out') ?? 'docs/research/ride-reports.json';
/**
 * `--search '?canyonWaves=true'`: the URL query the shipped dev switches are read from. The game reads them off
 * `globalThis.location.search` (`src/devTools.ts`), so setting it here is what makes `canyonBedSwitch` and the rest
 * run on their own code, not on a copy of their rules.
 */
const search = option('search') ?? '';
(globalThis as unknown as { location?: { search: string } }).location = { search };

const STEP = 1 / 60;
const LOOK = 16;
const GIVE_UP = 8;
/** Seconds of drifting after the autopilot ends an attempt before the rider is relaunched (the route's AFTER). */
const AFTER = 3;

interface CollectedRide {
  seed: number;
  attempt: number;
  seenAt: number;
  report: RideReport & { id: number };
}

const rides: CollectedRide[] = [];
let attemptsAll = 0;
let steppedAll = 0;
/**
 * What the sea actually was, read back off the host's config after it was built: the run's own proof that the switches
 * in `--search` reached the physics. `--search '?canyonWaves=true'` has to show up here as `canyonBed: 'b'`.
 */
const seas: { seed: number; spot: string; canyonBed?: string; stage?: number }[] = [];

for (let seed = firstSeed; seed < firstSeed + seeds && rides.length < wanted; seed += 1) {
  const settings: PhysicalSettings = { ...DEFAULT_PHYSICAL_SETTINGS, spot, source, compute: 'cpu' };
  const config = surfZoneConfigFor(settings, seed, false);
  const host = new LocalSurfZone(config, { rider: true });
  const focusZ = host.init.focus.z;
  seas.push({ seed, spot: config.spot, canyonBed: config.canyonBed, stage: config.stage });
  console.error(`seed ${seed}: sea ${JSON.stringify(seas[seas.length - 1])}`);
  const rise = 0.25 * (source === 'practice' ? 2 : settings.significantHeight);
  const autopilot = new Autopilot({ waitOutside: 5, rise, giveUp: GIVE_UP, style });
  const began = rides.length;
  let seen = 0;
  let after = 0;
  let simulated = 0;
  const limit = minutes * 60;
  const share = Math.ceil((wanted - rides.length) / (firstSeed + seeds - seed));
  while (simulated < limit && rides.length - began < share && rides.length < wanted) {
    const view = autopilotView(host, focusZ, settings.tide, LOOK);
    const input: AutopilotInput = view ? autopilot.next(view, STEP) : { paddle: false, popUp: false, steer: 0 };
    let retry = false;
    if (autopilot.state === 'done') {
      after += STEP;
      if (after > AFTER) {
        retry = true;
        autopilot.reset();
        after = 0;
      }
    } else {
      after = 0;
    }
    // The autopilot's own input forwarded whole, with only `retry` added. Picking fields out of it by name is how
    // this tool's first run starved the rider of the `crouch` and `compress` its bottom turn asks for.
    host.advance(1, { ...input, retry });
    simulated += STEP;
    steppedAll += 1;
    const report = host.snapshot.status.ride?.report;
    if (report && report.id > seen) {
      seen = report.id;
      rides.push({ seed, attempt: autopilot.attempts, seenAt: host.snapshot.status.seaTime, report });
      const named = report.maneuvers.filter((m) => m.kind === 'bottom turn').length;
      console.error(`seed ${seed}: ride ${rides.length}/${wanted}, ${report.duration.toFixed(2)} s, ended ${report.end}, `
        + `${report.maneuvers.length} run(s) measured, ${named} named a bottom turn`);
    }
  }
  attemptsAll += autopilot.attempts;
  console.error(`seed ${seed}: ${rides.length - began} ride(s) in ${(simulated / 60).toFixed(1)} min of sea time, ${autopilot.attempts} attempts`);
}

writeFileSync(output, `${JSON.stringify({ spot, source, style, search, seeds, firstSeed, seas, attempts: attemptsAll, steps: steppedAll, rides }, undefined, 1)}\n`);
console.error(`wrote ${output}: ${rides.length} rides, ${attemptsAll} attempts, ${steppedAll} physics steps`);
