/**
 * Lesson wave (Surf School, spec L2): records the wave every lesson starts on.
 * The autopilot surfs the Canyon's practice sea from the lineup on the CPU. For
 * each ride it keeps the sea and the rider's pose at three moments: a second
 * before it sets off paddling (the waiting start), at the pop-up cue (the caught
 * start), and half a second after it stands (the pocket start). The longest ride
 * with all three is replayed from each moment as a check, and written, for each
 * solver stage:
 *
 *   public/lessons/canyon-s{stage}-{start}.sea   each start's state, encoded and deflated
 *   src/game/school/lessonWaves.ts         the sea, the placements and the checks
 *   docs/research/lesson-wave.md           every candidate and what the autopilot got
 *
 *   npm run lesson:wave
 *   npm run lesson:wave -- --stages 2 --seconds 90 --seed 3
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
const stages = (option('stages') ?? '2,1').split(',').map(Number) as (1 | 2)[];
const seconds = Number(option('seconds') ?? 300);
const seed = Number(option('seed') ?? 1);
/** How long each check may run, s, and how many of the longest rides are replayed to choose from. */
const TRIAL_SECONDS = 25;
const FINALISTS = 3;

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
  moments: Partial<Record<LessonStart, Moment>>;
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

/** One check from a copy of a kept moment: how long the autopilot stays standing from that start, and whether it stood. */
function check(stage: 1 | 2, start: LessonStart, kept: Moment): { ride: number; stood: boolean; note: string } {
  const host = new LocalSurfZone({ ...configFor(stage), spinUpPeriods: 0 }, { rider: true }, kept.state);
  const pilot = new Autopilot({ rise: 0.25 * sea.significantHeight, style: 'turns' });
  pilot.state = start === 'pocket' ? 'ride' : start === 'caught' ? 'go' : 'wait';
  const idle: RideRequest = { paddle: false, popUp: false, steer: 0, retry: false };
  host.advance(1, { ...idle, place: kept.placement });
  let standing = 0;
  let stood = false;
  for (let time = 0; time < TRIAL_SECONDS && pilot.state !== 'done'; time += SURF_ZONE_STEP) {
    const view = autopilotView(host, host.runner.focus.z, sea.tide);
    const ride = host.snapshot.status.ride;
    if (ride?.phase === 'standing') {
      stood = true;
      standing += SURF_ZONE_STEP;
    }
    if (stood && (ride?.phase === 'fallen' || ride?.report)) break;
    host.advance(1, view ? { ...idle, ...pilot.next(view, SURF_ZONE_STEP) } : idle);
  }
  const outcome = pilot.outcome ? ` (${pilot.outcome})` : '';
  return { ride: standing, stood, note: stood ? `stood, rode ${standing.toFixed(1)} s${outcome}` : `never stood${outcome}` };
}

/** Moments kept this far back, s: the waiting start is taken this long before the autopilot sets off. */
const WAIT_LEAD = 1;
/** The pocket start is taken this long after the rider stands. */
const STAND_SETTLE = 0.5;

async function record(stage: 1 | 2): Promise<{ wave: LessonWave; rides: Ride[] }> {
  const host = new LocalSurfZone(configFor(stage), { rider: true });
  const pilot = new Autopilot({ waitOutside: 5, rise: 0.25 * sea.significantHeight, giveUp: 8, style: 'turns' });
  const idle: RideRequest = { paddle: false, popUp: false, steer: 0, retry: false };
  const recent: Moment[] = [];
  const rides: Ride[] = [];
  let current: Ride = { attempt: 0, seconds: 0, outcome: '', moments: {} };
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
      current = { attempt: pilot.attempts, seconds: 0, outcome: '', moments: {} };
      const waiting = [...recent].reverse().find((kept) => kept.t <= t - WAIT_LEAD);
      if (waiting) current.moments.waiting = waiting;
    }
    if (pilot.state === 'go' && ride?.cue && !current.moments.caught) current.moments.caught = moment(host, t, 'prone');
    if (ride?.phase === 'standing') {
      if (!Number.isFinite(standAt)) standAt = t;
      if (!current.moments.pocket && t - standAt >= STAND_SETTLE) current.moments.pocket = moment(host, t, 'standing');
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
      current = { attempt: 0, seconds: 0, outcome: '', moments: {} };
      pilot.reset();
      retry = true;
    }
    host.advance(1, { ...idle, ...input, retry });
    retry = false;
  }
  const complete = rides.filter((ride) => ride.moments.waiting && ride.moments.caught && ride.moments.pocket)
    .sort((a, b) => b.seconds - a.seconds);
  if (complete.length === 0) throw new Error(`No ride with all three moments in ${seconds} s at stage ${stage}`);
  // The replays decide: the rider's own state (balance, posture) is not recorded, so a replay can differ from the ride.
  let chosen = complete[0];
  let checks = {} as Record<LessonStart, string>;
  let bestScore = -Infinity;
  for (const ride of complete.slice(0, FINALISTS)) {
    const results = {} as Record<LessonStart, { ride: number; stood: boolean; note: string }>;
    for (const start of ['pocket', 'caught', 'waiting'] as const) results[start] = check(stage, start, ride.moments[start]!);
    const score = results.pocket.ride + results.caught.ride + (results.waiting.stood ? 5 : 0);
    console.log(`stage ${stage} · attempt ${ride.attempt} replays: pocket ${results.pocket.note} · caught ${results.caught.note} · waiting ${results.waiting.note}`);
    if (score > bestScore) {
      bestScore = score;
      chosen = ride;
      checks = { pocket: results.pocket.note, caught: results.caught.note, waiting: results.waiting.note };
    }
  }
  const assets = {} as Record<LessonStart, string>;
  const placements = {} as Record<LessonStart, RiderPlacement>;
  mkdirSync('public/lessons', { recursive: true });
  for (const start of ['pocket', 'caught', 'waiting'] as const) {
    const kept = chosen.moments[start]!;
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
  `| ${wave.stage} | ${ride.attempt} | ${ride.seconds.toFixed(1)} s | ${ride.outcome} | ${['waiting', 'caught', 'pocket'].filter((start) => ride.moments[start as LessonStart]).join(', ') || '—'} |`));
writeFileSync('docs/research/lesson-wave.md', `# Lesson wave

Generated by \`npm run lesson:wave\` (Surf School, spec L2). The Canyon's practice sea (seed ${seed}), surfed ${seconds} s by the autopilot on the CPU per solver stage. Each ride keeps three moments, with the sea and the rider's pose at each:
- **waiting:** 1 s before the autopilot set off paddling;
- **caught:** at the pop-up cue;
- **pocket:** 0.5 s after it stood.

The longest ride with all three is the lesson wave. Each of its starts is replayed from its moment as a check.

**Provisional:** recorded before the riding work's reference wave. Rerun it once that lands.

| Stage | Attempt | Ride | End | Moments kept |
|---|---|---|---|---|
${rows.join('\n')}

Checks of the chosen ride: ${results.map(({ wave }) => `stage ${wave.stage}: pocket ${wave.checks.pocket}; caught ${wave.checks.caught}; waiting ${wave.checks.waiting}`).join(' · ')}.
`);
console.log('wrote public/lessons, src/game/school/lessonWaves.ts and docs/research/lesson-wave.md');
