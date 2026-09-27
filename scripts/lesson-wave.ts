/**
 * Lesson wave (Surf School, spec L2): records the wave every lesson starts on.
 * The autopilot surfs the Canyon's practice sea from the lineup on the CPU. For
 * each ride it keeps the sea and the rider's pose at three moments: a second
 * before it sets off paddling (the waiting start), at the pop-up cue (the caught
 * start), and 0.5, 1 and 1.5 s after it stands (the pocket start). The eight
 * longest rides are replayed from each moment as a new player would play them,
 * and each start keeps its best moment. Only stage 2 is recorded: the school runs
 * it on every machine (`schoolWave`). Written:
 *
 *   public/lessons/canyon-s{stage}-{start}.sea   each start's state, encoded and deflated
 *   src/game/school/lessonWaves.ts         the sea, the placements and the checks
 *   docs/research/lesson-wave.md           every candidate and what the autopilot got
 *
 *   npm run lesson:wave
 *   npm run lesson:wave -- --seconds 90 --seed 3
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { Autopilot, autopilotView } from '../src/dev/Autopilot';
import { LocalSurfZone } from '../src/game/SurfZoneHost';
import { DEFAULT_PHYSICAL_SETTINGS, GPU_TIER_COMPONENTS, swellFor } from '../src/game/PhysicalMode';
import type { LessonStart, LessonWave } from '../src/game/school/lessonWave';
import type { RiderPlacement } from '../src/physics/RideSession';
import { createWaterSample } from '../src/physics/SurfWater';
import { SURF_ZONE_STEP, type RideRequest } from '../src/wave/SurfZoneRunner';
import type { SurfZoneConfig } from '../src/wave/SurfZoneSimulation';
import { compress, encodeSurfZoneState } from '../src/wave/surfZoneState';

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
/** Stage 1's recording could not be caught (2026-09-27), so the school runs stage 2 everywhere and only it is recorded. */
const stages: readonly (1 | 2)[] = [2];
const seconds = Number(option('seconds') ?? 300);
const seed = Number(option('seed') ?? 1);
/** How long each check may run, s, and how many of the longest rides are replayed to choose from. */
const TRIAL_SECONDS = 25;
const FINALISTS = 8;

const practice = swellFor({ ...DEFAULT_PHYSICAL_SETTINGS, source: 'practice' });
const sea = {
  spot: 'canyon' as const, seed,
  significantHeight: practice.significantHeight, peakPeriod: practice.peakPeriod,
  directionDegrees: practice.directionDegrees ?? DEFAULT_PHYSICAL_SETTINGS.directionDegrees,
  spreading: practice.spreading, ...(practice.bandwidth !== undefined ? { bandwidth: practice.bandwidth } : {}),
  tide: 0, windSpeed: 0, componentCount: GPU_TIER_COMPONENTS,
};
const configFor = (stage: 1 | 2): SurfZoneConfig => ({ ...sea, stage, compute: 'cpu' });

/** One moment of the ride kept for a start: the sea's state and where the rider was. */
interface Moment {
  t: number;
  state: Uint8Array;
  placement: RiderPlacement;
}

interface Ride {
  attempt: number;
  seconds: number;
  outcome: string;
  moments: Partial<Record<'waiting' | 'caught', Moment>>;
  /** Pocket moments at each of POCKET_DELAYS after the rider stood. */
  pockets: Moment[];
}

/** The sea's state and the rider's pose now: its point, heading, and speed along the heading on top of the water's own flow. */
function moment(host: LocalSurfZone, t: number, phase: RiderPlacement['phase']): Moment {
  const { runner } = host;
  const session = runner.session!;
  const { board } = session;
  const heading = session.heading;
  const sample = createWaterSample();
  runner.water.sampleAt(board.position.x, runner.water.surfaceAt(board.position.x, board.position.z) - 0.05, board.position.z, sample);
  const speed = (board.velocity.x - sample.flowX) * Math.sin(heading) + (board.velocity.z - sample.flowZ) * Math.cos(heading);
  return {
    t,
    state: encodeSurfZoneState(runner.simulation.exportState()),
    placement: {
      x: Number(board.position.x.toFixed(2)), z: Number(board.position.z.toFixed(2)), heading: Number(heading.toFixed(3)),
      speed: Number(Math.max(0, speed).toFixed(2)), phase,
    },
  };
}

/**
 * One check from a copy of a kept moment, played as a new player would: from the
 * pocket, no input at all; caught, pop up on the cue and nothing more; waiting,
 * the autopilot paddles for the wave, pops up and rides. How long the rider stood,
 * and whether it stood at all.
 */
function check(stage: 1 | 2, start: LessonStart, kept: Moment): { ride: number; stood: boolean; note: string } {
  const host = new LocalSurfZone({ ...configFor(stage), spinUpPeriods: 0 }, { rider: true }, kept.state);
  const pilot = new Autopilot({ rise: 0.25 * sea.significantHeight, style: 'turns' });
  pilot.state = 'wait';
  const idle: RideRequest = { paddle: false, popUp: false, steer: 0, retry: false };
  host.advance(1, { ...idle, place: kept.placement });
  let standing = 0;
  let stood = false;
  let popped = false;
  for (let time = 0; time < TRIAL_SECONDS && pilot.state !== 'done'; time += SURF_ZONE_STEP) {
    const view = autopilotView(host, host.runner.focus.z, sea.tide);
    const ride = host.snapshot.status.ride;
    if (ride?.phase === 'standing') {
      stood = true;
      standing += SURF_ZONE_STEP;
    }
    if (ride?.phase === 'fallen' || (stood && ride?.report)) break;
    let request = idle;
    if (start === 'waiting' && view) request = { ...idle, ...pilot.next(view, SURF_ZONE_STEP) };
    if (start === 'caught' && ride?.cue && !popped) {
      popped = true;
      request = { ...idle, popUp: true };
    }
    host.advance(1, request);
  }
  const outcome = pilot.outcome ? ` (${pilot.outcome})` : '';
  return { ride: standing, stood, note: stood ? `stood ${standing.toFixed(1)} s${outcome}` : `never stood${outcome}` };
}

/** Moments kept this far back, s: the waiting start is taken this long before the autopilot sets off. */
const WAIT_LEAD = 1;
/** Pocket moments are taken this long after the rider stands, s; the check picks the one a still rider rides longest. */
const POCKET_DELAYS = [0.5, 1, 1.5];

async function record(stage: 1 | 2): Promise<{ wave: LessonWave; rides: Ride[] }> {
  const host = new LocalSurfZone(configFor(stage), { rider: true });
  const pilot = new Autopilot({ waitOutside: 5, rise: 0.25 * sea.significantHeight, giveUp: 8, style: 'turns' });
  const idle: RideRequest = { paddle: false, popUp: false, steer: 0, retry: false };
  const recent: Moment[] = [];
  const rides: Ride[] = [];
  let current: Ride = { attempt: 0, seconds: 0, outcome: '', moments: {}, pockets: [] };
  let standAt = Number.NaN;
  let retry = false;
  const steps = Math.round(seconds / SURF_ZONE_STEP);
  for (let step = 0; step < steps; step += 1) {
    const t = step * SURF_ZONE_STEP;
    const ride = host.snapshot.status.ride;
    // A moment every half second, the last few kept, for the waiting start.
    if (step % 30 === 0 && ride?.phase === 'prone') {
      recent.push(moment(host, t, 'prone'));
      if (recent.length > 8) recent.shift();
    }
    const before = pilot.state;
    const view = autopilotView(host, host.runner.focus.z, sea.tide);
    const input = view ? pilot.next(view, SURF_ZONE_STEP) : idle;
    if (before !== 'go' && pilot.state === 'go') {
      current = { attempt: pilot.attempts, seconds: 0, outcome: '', moments: {}, pockets: [] };
      const waiting = [...recent].reverse().find((kept) => kept.t <= t - WAIT_LEAD);
      if (waiting) current.moments.waiting = waiting;
    }
    if (pilot.state === 'go' && ride?.cue && !current.moments.caught) current.moments.caught = moment(host, t, 'prone');
    if (ride?.phase === 'standing') {
      if (!Number.isFinite(standAt)) standAt = t;
      const delay = POCKET_DELAYS[current.pockets.length];
      if (delay !== undefined && t - standAt >= delay) current.pockets.push(moment(host, t, 'standing'));
    } else {
      standAt = Number.NaN;
    }
    if (pilot.state === 'done') {
      current.seconds = pilot.rideTime;
      current.outcome = pilot.outcome ?? '';
      if (current.attempt > 0) {
        rides.push(current);
        console.log(`stage ${stage} · ${t.toFixed(0)} s · attempt ${current.attempt}: ${current.seconds.toFixed(1)} s (${current.outcome})`);
      }
      current = { attempt: 0, seconds: 0, outcome: '', moments: {}, pockets: [] };
      pilot.reset();
      retry = true;
    }
    host.advance(1, { ...idle, ...input, retry });
    retry = false;
  }
  // The replays decide, each start on its own: the rider's own state (balance, posture) is not recorded, so a replay
  // can differ from the ride, and a moment good for one start may be poor for another. Each start still restores its
  // own recorded state every time, so each always meets the same wave.
  const longest = [...rides].sort((a, b) => b.seconds - a.seconds).slice(0, FINALISTS);
  const best = {} as Record<LessonStart, { moment: Moment; ride: number; stood: boolean; note: string; attempt: number }>;
  const consider = (start: LessonStart, moment: Moment | undefined, attempt: number) => {
    if (!moment) return;
    const result = check(stage, start, moment);
    console.log(`stage ${stage} · attempt ${attempt} · ${start} replay: ${result.note}`);
    const current = best[start];
    // Standing at all counts first (the waiting start's catch), then how long.
    if (!current || Number(result.stood) - Number(current.stood) > 0 || (result.stood === current.stood && result.ride > current.ride)) {
      best[start] = { moment, ...result, attempt };
    }
  };
  for (const ride of longest) {
    for (const pocket of ride.pockets) consider('pocket', pocket, ride.attempt);
    consider('caught', ride.moments.caught, ride.attempt);
    consider('waiting', ride.moments.waiting, ride.attempt);
  }
  for (const start of ['pocket', 'caught', 'waiting'] as const) {
    if (!best[start]) throw new Error(`No ${start} moment in ${seconds} s at stage ${stage}`);
  }
  const checks = {} as Record<LessonStart, string>;
  for (const start of ['pocket', 'caught', 'waiting'] as const) checks[start] = `${best[start].note} (attempt ${best[start].attempt})`;
  const assets = {} as Record<LessonStart, string>;
  const placements = {} as Record<LessonStart, RiderPlacement>;
  mkdirSync('public/lessons', { recursive: true });
  for (const start of ['pocket', 'caught', 'waiting'] as const) {
    const kept = best[start].moment;
    assets[start] = `lessons/canyon-s${stage}-${start}.sea`;
    placements[start] = kept.placement;
    writeFileSync(`public/${assets[start]}`, (await compress(kept.state)).bytes);
  }
  return { wave: { stage, config: sea, assets, placements, provisional: true, checks }, rides };
}

const results = [];
for (const stage of stages) results.push(await record(stage));

writeFileSync('src/game/school/lessonWaves.ts', `// Generated by \`npm run lesson:wave\` — do not edit.
import type { LessonWave } from './lessonWave';

export const LESSON_WAVES: readonly LessonWave[] = ${JSON.stringify(results.map((result) => result.wave), null, 2)};
`);

const rows = results.flatMap(({ wave, rides }) => rides.map((ride) =>
  `| ${wave.stage} | ${ride.attempt} | ${ride.seconds.toFixed(1)} s | ${ride.outcome} | ${[...(ride.moments.waiting ? ['waiting'] : []), ...(ride.moments.caught ? ['caught'] : []), ...(ride.pockets.length ? [`pocket ×${ride.pockets.length}`] : [])].join(', ') || '—'} |`));
writeFileSync('docs/research/lesson-wave.md', `# Lesson wave

Generated by \`npm run lesson:wave\` (Surf School, spec L2). The Canyon's practice sea (seed ${seed}), surfed ${seconds} s by the autopilot on the CPU, on stage 2 (the school runs it on every machine). Each ride keeps three moments, with the sea and the rider's pose at each:
- **waiting:** 1 s before the autopilot set off paddling;
- **caught:** at the pop-up cue;
- **pocket:** 0.5, 1 and 1.5 s after it stood.

The eight longest rides are replayed from each moment, as a new player would play them. From the pocket there is no input at all. From caught, the rider pops up on the cue and does nothing more. From waiting, the autopilot paddles, pops up and rides. Each start takes its own best moment: standing at all first (the waiting start's catch), then the longest stand. Each start always restores its own recorded state, so it always meets the same wave.

**Provisional:** recorded before the riding work's reference wave. Rerun it once that lands.

| Stage | Attempt | Ride | End | Moments kept |
|---|---|---|---|---|
${rows.join('\n')}

Checks of the chosen moments: ${results.map(({ wave }) => `stage ${wave.stage}: pocket ${wave.checks.pocket}; caught ${wave.checks.caught}; waiting ${wave.checks.waiting}`).join(' · ')}.
`);
console.log('wrote public/lessons, src/game/school/lessonWaves.ts and docs/research/lesson-wave.md');
