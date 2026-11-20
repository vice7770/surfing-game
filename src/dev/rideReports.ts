/**
 * Dev tool (`?rideReports=N`): an autopilot rides the shipped physical surf zone and the **game's own analyser reads
 * it**, so the game names its own manoeuvres instead of a probe naming them for it.
 *
 * Nothing here analyses anything. The analyser is `RideAnalyzer`, built and fed inside `SurfZoneRunner`
 * (`SurfZoneRunner.analyze`, on every physics step of a session), and its finished readings leave the runner on
 * `SurfZoneStatus.ride.report`. This tool only drives the same `Autopilot` the film recorder drives
 * (`src/dev/rideRecorder.ts`), and **collects the reports the runner publishes** — it never pushes a sample, never
 * builds an analyser, and never decides what a turn was. That matters because the one existing route that reads
 * autopilot rides through this analyser, `scripts/ride-report.ts`, constructs its **own** `RideAnalyzer` and feeds
 * it samples it assembles itself, in a copy of `SurfZoneRunner.analyze`'s arithmetic (its own comment says "as
 * `SurfZoneRunner.analyze` feeds it"). So that report exercises the analyser class but not the shipped feed. This
 * tool exercises the shipped feed.
 *
 * `?rideReports=N` collects N finished rides and stops (20 by default). It takes the recorder's own options where
 * they apply: `&spot=`, `&source=`, `&style=line|turns|flow|tube`, `&inpage`, `&compute=`, `&outside=`,
 * `&turnLimit=`, `&minRide=`, `&maxMinutes=`, and the spot's own switches (`&canyonWaves=true` reaches the Canyon's
 * version B waves through `canyonBedSwitch`, as it does in an ordinary start). It films nothing, so it needs no
 * encoder and no receiver.
 *
 * The rides land in three places, whichever the reader has: `globalThis.breaklineRideReports` (the whole run, as the
 * analyser wrote it), one console line per ride, and a POST of the JSON to the recorder's receiver when one is
 * listening (`npm run record:ride`). The page's animation clock stays off, as it does for every tool in this folder,
 * so the run is the same in a hidden page — just not in real time.
 *
 * This is instrumentation. It changes no physics, applies no force, and asks nothing of the rider that the recorder's
 * autopilot does not already ask through `RideInput`.
 *
 * **The autopilot has to pop the rider up: a rider PLACED already standing is never analysed at all.** A ride begins
 * only on a sample whose phase is `standing` after one that was not (`RideAnalyzer.push`, and the shipped test
 * "starts only once the rider stands from a pop-up"), and a placement rebuilds the analyser as well
 * (`SurfZoneRunner.advance`, on `request.place`), so the first sample the new analyser sees is already standing and no
 * later sample can supply the transition. That is why a rider put on a face measures nothing: not because its turn
 * failed a condition, but because there is no ride to read. So this route cannot take the recorder's `&start=trough`
 * shortcut, and every ride here costs the autopilot a paddle and a catch.
 */
import { DEFAULT_PHYSICAL_SETTINGS, type PhysicalMode, type PhysicalSettings } from '../game/PhysicalMode';
import type { RideReport } from '../game/rideAnalysis';
import type { RideRequest } from '../wave/SurfZoneRunner';
import type { SurfZoneConfig } from '../wave/SurfZoneSimulation';
import { Autopilot, autopilotView, type AutopilotInput } from './Autopilot';
import { advance, breathe } from './devStepping';

/**
 * **Build guard: every field the autopilot can ask for must reach `advance`.** The first run of this tool rebuilt the
 * input as `{ paddle, popUp, steer }` and so threw away `trim`, `crouch`, `compress` and `rotate` — the autopilot's
 * bottom turn asks for `crouch` and `compress` at the base of the turn (`Autopilot.next`), and its cutback adds
 * `rotate`. The rider was steered and never crouched, and a whole population was measured on it.
 *
 * Typing the parameter `RideInput` cannot catch that on its own, because every one of those fields is optional and a
 * three-field literal satisfies the type. So this checks **key coverage** instead: if `AutopilotInput` ever carries a
 * field that `advance`'s input type does not declare, `Dropped` resolves to that field's name and the assignment
 * below fails the build naming it.
 */
type Dropped = Exclude<keyof AutopilotInput, keyof Parameters<typeof advance>[2]>;
const everyInputFieldReachesThePhysics: Dropped extends never ? true : Dropped = true;
void everyInputFieldReachesThePhysics;

/** What the tool needs of the game: the recording hooks, minus the camera and the encoder. */
export interface RideReportHooks {
  start(settings: PhysicalSettings, overrides?: Partial<SurfZoneConfig>): Promise<void>;
  /** The rider's whole input (see `SteppedHooks.step`): never a hand-picked subset of fields. */
  step(input: Omit<RideRequest, 'retry'>): void;
  retry(): void;
  mode: PhysicalMode;
}

/** One ride as the run records it: the analyser's own report, plus which attempt produced it. */
export interface CollectedRide {
  attempt: number;
  /** Sea time when the report was first seen, s. */
  seenAt: number;
  report: RideReport & { id: number };
}

export interface RideReportRun {
  spot: string;
  source: string;
  style: string;
  /** The sea time the run reached, s, and the attempts the autopilot made. */
  simulated: number;
  attempts: number;
  rides: CollectedRide[];
  /**
   * What the sea the rides were ridden on actually was, read back off the host's own config after the start. This is
   * the run's own proof that a spot switch in the URL reached the physics rather than only parsing: `?canyonWaves=true`
   * has to show up here as `canyonBed: 'b'`.
   */
  sea: { spot: string; canyonBed?: string; compute: string; stage?: number };
  /** Set when the run stopped at its simulated-time limit before collecting the rides asked for. */
  gaveUp?: string;
}

/**
 * `?rideReports=N`: how many finished rides to collect, 20 by default. Any value that is not a positive whole number
 * (including a bare `?rideReports`) takes the default, so a typo collects rides rather than silently collecting none.
 */
export function rideReportsWanted(search: string): number | undefined {
  const params = new URLSearchParams(search);
  if (!params.has('rideReports')) return undefined;
  const asked = Number(params.get('rideReports'));
  return Number.isInteger(asked) && asked > 0 ? asked : 20;
}

/**
 * **One step's request for the runner: the autopilot's whole input, with only `retry` added.** The headless twin
 * (`scripts/ride-reports.ts`) drives `host.advance` rather than `advance`, so it needs to build a `RideRequest`; this
 * is the one place that happens, and `rideReports.test.ts` asserts it preserves every key of a loaded input. The
 * point is that neither collection site ever names the input's fields — that is the defect this tool shipped once.
 */
export function rideRequestFor(input: AutopilotInput, retry: boolean): RideRequest {
  return { ...input, retry };
}

const STEP = 1 / 60;
/** A crest this far behind the board starts a paddle, m, as in the film recorder. */
const LOOK = 16;
const GIVE_UP = 8;
/**
 * Seconds of drifting after the autopilot ends an attempt before the rider is relaunched. The analyser ends a ride on
 * its own conditions, which can need a second or two past the autopilot's own stall: relaunching sooner drops the
 * ride unreported (`SurfZoneRunner.launchRide` builds a fresh analyser).
 */
const AFTER = 3;
/** Nothing asked for, for the steps before the autopilot has a view to read. */
const IDLE: AutopilotInput = { paddle: false, popUp: false, steer: 0 };

export async function collectRideReports(hooks: RideReportHooks, search = globalThis.location?.search ?? ''): Promise<RideReportRun | undefined> {
  const wanted = rideReportsWanted(search);
  if (wanted === undefined) return undefined;
  const params = new URLSearchParams(search);
  const spot = (params.get('spot') ?? 'point') as PhysicalSettings['spot'];
  const source = (params.get('source') ?? 'practice') as PhysicalSettings['source'];
  const style = params.get('style') === 'tube' ? 'tube' : params.get('style') === 'line' ? 'line' : params.get('style') === 'flow' ? 'flow' : 'turns';
  const compute = params.get('compute') === 'gpu' || params.get('compute') === 'auto' ? 'auto' : 'cpu';
  const maxSeconds = (Number(params.get('maxMinutes')) || 40) * 60;
  const waitOutside = Number(params.get('outside')) || 5;
  const turnLimit = Number(params.get('turnLimit')) || undefined;
  const settings: PhysicalSettings = { ...DEFAULT_PHYSICAL_SETTINGS, spot, source, compute };
  // No overrides: an empty overrides object is what lets `switchedConfigFor` apply the URL's own spot switches, so
  // `&canyonWaves=true` reaches the sea exactly as it does in an ordinary start.
  await hooks.start(settings);
  const host = hooks.mode.host!;
  const rise = 0.25 * (source === 'practice' ? 2 : settings.significantHeight);
  const autopilot = new Autopilot({ waitOutside, rise, giveUp: GIVE_UP, style, ...(turnLimit ? { turnLimit } : {}) });
  const run: RideReportRun = {
    spot, source, style, simulated: 0, attempts: 0, rides: [],
    sea: { spot: host.config.spot, canyonBed: host.config.canyonBed, compute: host.snapshot.status.compute, stage: host.config.stage },
  };
  console.info(`[rideReports] sea: ${JSON.stringify(run.sea)}`);
  publish(run);

  let after = 0;
  let seen = 0;
  let simulated = 0;
  let steps = 0;
  while (simulated < maxSeconds && run.rides.length < wanted) {
    // Stepping the page's own surf zone (`?inpage`) never waits for a worker, so `advance` never yields: without
    // this the loop starves the event loop and nothing else in the page — a console read, a fetch, a repaint — ever
    // runs. The film recorder breathes on the same count.
    steps += 1;
    if (steps % 30 === 0) await breathe();
    const view = autopilotView(host, hooks.mode.focus.z, settings.tide, LOOK);
    const input: AutopilotInput = view ? autopilot.next(view, STEP) : { ...IDLE };
    if (autopilot.state === 'done') {
      after += STEP;
      if (after > AFTER) {
        hooks.retry();
        autopilot.reset();
        after = 0;
      }
    } else {
      after = 0;
    }
    // The autopilot's own object, forwarded whole. Never reconstructed field by field: that is what starved the
    // rider of its crouch and compress on this tool's first run.
    await advance(hooks, 1, input);
    simulated += STEP;
    run.simulated = simulated;
    run.attempts = autopilot.attempts;
    // The analyser's own finished reading, as the runner published it. Its id counts up, so a new id is a new ride.
    const report = host.snapshot.status.ride?.report;
    if (report && report.id > seen) {
      seen = report.id;
      run.rides.push({ attempt: autopilot.attempts, seenAt: host.snapshot.status.seaTime, report });
      console.info(`[rideReports] ride ${run.rides.length}/${wanted}: ${report.duration.toFixed(2)} s, ended ${report.end}, `
        + `${report.maneuvers.length} run(s) measured, ${report.maneuvers.filter((m) => m.kind === 'bottom turn').length} named a bottom turn`);
    }
  }
  if (run.rides.length < wanted) run.gaveUp = `${run.rides.length} of ${wanted} rides in ${(simulated / 60).toFixed(1)} min simulated, ${autopilot.attempts} attempts`;
  publish(run);
  console.info(`[rideReports] done: ${run.rides.length} rides, ${autopilot.attempts} attempts, ${(simulated / 60).toFixed(1)} min simulated`);
  // The film recorder's receiver, when one is listening; a run with no receiver keeps its reports in the page.
  const receiver = params.get('receiver') ?? 'http://localhost:5199';
  await fetch(`${receiver}/upload?name=ride-reports.json`, { method: 'POST', body: JSON.stringify(run) }).catch(() => undefined);
  return run;
}

function publish(run: RideReportRun): void {
  (globalThis as unknown as { breaklineRideReports?: RideReportRun }).breaklineRideReports = run;
}
