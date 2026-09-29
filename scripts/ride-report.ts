/**
 * Ride report (P9 phase 0): an autopilot rides each spot's physical surf zone
 * as a player would (the runner's own rider, feeding back on the water), and
 * every ride is measured against the wave under it: speed over ground against
 * the crest's speed and the peel's required speed c / sin α, and where on the
 * face it rode. Each ride is also read by the ride analyzer (turns and how the
 * ride ended), and its turns are set beside Forsyth et al. 2024's. The physics'
 * weight on the board is read every standing step, by manoeuvre (the riding-body
 * plan, step 6). Writes docs/research/ride-report.md.
 *
 *   npm run report:ride -- --practice --seeds 2 --minutes 3
 *   npm run report:ride -- --practice --ghosts --minutes 5
 *   npm run report:ride -- --spots point --minutes 5 --out /tmp/point.md
 *   npm run report:ride -- --practice --ghosts --style turns
 */
import { writeFileSync } from 'node:fs';
import { Quaternion, Vector3 } from 'three';
import { Autopilot } from '../src/dev/Autopilot';
import { DEFAULT_PHYSICAL_SETTINGS, swellFor } from '../src/game/PhysicalMode';
import { withPocketReflex } from '../src/game/pocketReflex';
import { RideAnalyzer, type ManeuverKind, type RideReport } from '../src/game/rideAnalysis';
import { bestTwo, scoreRide } from '../src/game/waveScore';
import type { LipParcelSource } from '../src/physics/DetachedSurfer';
import { RideSession } from '../src/physics/RideSession';
import { createWaterSample, type SurfWater } from '../src/physics/SurfWater';
import { inTakeOffWindow } from '../src/physics/takeOffCue';
import { WaveFrameGauge } from '../src/physics/waveFrame';
import type { SpotName } from '../src/wave/Bathymetry';
import { applyReefShape } from './reefShape';
import { alongShift } from './botSpots';
import { SURF_ZONE_STEP, SurfZoneRunner } from '../src/wave/SurfZoneRunner';

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const argument = (name: string, fallback: number): number => Number(option(name) ?? fallback);
const flag = (name: string): boolean => process.argv.includes(`--${name}`);
const seedCount = argument('seeds', 2);
const minutes = argument('minutes', 3);
// Reshape the Reef for this run: `--reef angle=50,crestZ=-125` (the design sweep).
applyReefShape(option('reef'));
const spots = (option('spots')?.split(',') ?? ['point', 'reef']) as SpotName[];
const output = option('out') ?? 'docs/research/ride-report.md';
const practice = flag('practice');
/** The practice swell's significant height, m, instead of PRACTICE_SWELL's (the reference-wave sweep, riding-the-wave Task 5). */
const heightOverride = option('height');
/** The pocket reflex rides with every rider (`--reflex`, the riding-the-wave spec). */
const reflex = flag('reflex');
/** The autopilot's riding: a line along the face, or S-turns up and down it. */
const style = option('style') === 'turns' ? 'turns' : 'line';
/** Ghost riders beside the runner's own: metres along shore from the break point (`--ghosts`, as in the catch report). */
const ghostAlongs = flag('ghosts') ? [-45, -25, -12, 12, 25, 45] : [];
const settings = practice ? { ...DEFAULT_PHYSICAL_SETTINGS, source: 'practice' as const } : DEFAULT_PHYSICAL_SETTINGS;
/** Each spot's swell: its own Practice when practising (the Reef has one), with `--height` on top. */
const swellAt = (spot: SpotName) => ({ ...swellFor({ ...settings, spot }), ...(heightOverride ? { significantHeight: Number(heightOverride) } : {}) });
/** The swell's direction, or `--direction` (the Reef's design sweep). */
const directionAt = (spot: SpotName) => option('direction') !== undefined ? Number(option('direction')) : swellAt(spot).directionDegrees ?? settings.directionDegrees;
/** A crest this far above still water within LOOK m behind the board starts a paddle. */
const riseAt = (spot: SpotName) => 0.25 * swellAt(spot).significantHeight;
const LOOK = 14;
/** Rides shorter than this, s, are not reported. */
const MIN_RIDE = 3;
/** After the autopilot ends a ride, the rider drifts at most this long, s, for the analyzer to close it. */
const WIND_DOWN = 2;

interface Ride {
  seconds: number;
  distance: number;
  meanSpeed: number;
  topSpeed: number;
  /** The old label, |board velocity|, including vertical motion. */
  meanLabel: number;
  topLabel: number;
  crestSpeed: number;
  required: number;
  /** Speed over ground over the required speed, where finite. */
  ratio: number;
  /** Share of the ride faster than 1.3 × the required speed. */
  fastShare: number;
  faceFraction: number;
  ahead: number;
  aheadP90: number;
  /** Mean face height, m, and the peel angle, degrees, under the ride. */
  faceHeight: number;
  peel: number;
  outcome: string;
  /** The ride analyzer's reading of it, when the analyzer closed it. */
  analysis?: RideReport;
}

const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : NaN);
const quantile = (values: number[], q: number) => {
  if (!values.length) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
};
const fixed = (value: number, digits = 1) => (Number.isFinite(value) ? value.toFixed(digits) : '—');

/** One rider: the runner's own (which pushes back on the water) or a ghost (which feels it and pushes back on nothing). */
interface Bot {
  session: RideSession;
  own: boolean;
  home: Vector3;
  autopilot: Autopilot;
  gauge: WaveFrameGauge;
  trace: { speed: number; label: number; crest: number; required: number; face: number; ahead: number; height: number; peel: number; x: number; z: number }[];
  request: { paddle: boolean; popUp: boolean; steer: number };
  retry: boolean;
  analyzer: RideAnalyzer;
  /** The analyzer's latest closed ride, and how long the rider has drifted since the autopilot ended its ride. */
  analysis?: RideReport;
  windDown: number;
  /** Standing, the physics' weight at each step of the ride under way, the ride's start (as the analyzer's), and the last phase. */
  weights: { t: number; weight: number; share: number; climb: number }[];
  rideStart: number;
  lastPhase: string;
}

/** The board's climb, m/s, past which a step outside a manoeuvre counts as climbing or descending the face. */
const CLIMB = 0.3;
/** The stance map's weight targets for each place a step is read (docs/research/stance-map.md). */
const WEIGHT_TARGETS: Record<string, string> = {
  level: '0.50–0.62 (trim)',
  descending: '0.50–0.60 (a pump downhill)',
  climbing: '0.40–0.50 (a pump uphill); 0.35–0.45 (extending off the bottom)',
  'bottom turn': '0.60–0.75 (Compress, driving)',
  'top turn': '0.35–0.45',
  snap: '0.35–0.45 (the top turn\'s)',
  cutback: '0.30–0.40',
};
const inverse = new Quaternion();
const point = new Vector3();
const [pelvis, front, rear] = [new Vector3(), new Vector3(), new Vector3()];
/**
 * The physics' weight on the board (the stance gauge's reading): its pelvis point
 * between the rear foot (0) and the front foot (1) along the board.
 */
function physicsWeight(session: RideSession): number {
  const { board } = session;
  inverse.copy(board.orientation).invert();
  const along = (index: number, out: Vector3) => out.copy(session.renderPoint(index, point)).sub(board.position).applyQuaternion(inverse);
  const regular = session.rider.stance === 'regular';
  along(0, pelvis);
  along(regular ? 5 : 6, front);
  along(regular ? 6 : 5, rear);
  const span = front.z - rear.z;
  return Math.abs(span) > 0.2 ? (pelvis.z - rear.z) / span : Number.NaN;
}

/** A spot's run: the rides of MIN_RIDE or more, and every closed ride's duration, share near the curl, and whether it lost the wave. */
interface SpotRun {
  rides: Ride[];
  attempts: number;
  stands: number;
  outcomes: Map<string, number>;
  durations: number[];
  curlShares: number[];
  lostWave: number;
  /** The physics' weight at each standing step of the closed rides, by where it was read: its pelvis point's, and the feet's pressure's. */
  weights: Map<string, number[]>;
  shares: Map<string, number[]>;
}

function runSpot(spot: SpotName, seed: number): SpotRun {
  const swell = swellAt(spot);
  const direction = directionAt(spot);
  const runner = new SurfZoneRunner({
    spot, seed,
    significantHeight: swell.significantHeight, heightAt: (settings.source === 'practice' ? 'edge' : 'deep') as 'edge' | 'deep', peakPeriod: swell.peakPeriod, directionDegrees: direction,
    spreading: swell.spreading, bandwidth: swell.bandwidth, tide: settings.tide, windSpeed: settings.windSpeed,
  }, { rider: true });
  // Ghosts: the water's reactions and the lip's recoil are dropped, as in the catch report.
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
  // The ghosts slide along shore to stay inside the window near an open edge (the Reef's peak); the runner's own rider stays at the take-off.
  const shift = alongShift(runner, ghostAlongs);
  if (shift !== 0) console.error(`${spot} seed ${seed}: ghosts slid ${shift.toFixed(1)} m along shore to stay inside the window`);
  const bot = (session: RideSession, own: boolean, along: number): Bot => ({
    session, own, home: new Vector3(runner.focus.x + along + (own ? 0 : shift), 0, runner.focus.z - 6),
    autopilot: new Autopilot({ rise: riseAt(spot), style, stall: false }), gauge: new WaveFrameGauge({ directionX: Math.sin(radians), directionZ: Math.cos(radians) }),
    trace: [], request: { paddle: false, popUp: false, steer: 0 }, retry: false, analyzer: new RideAnalyzer(), windDown: 0,
    weights: [], rideStart: 0, lastPhase: 'prone',
  });
  const bots: Bot[] = [bot(runner.session!, true, 0)];
  for (const along of ghostAlongs) {
    const session = new RideSession();
    const ghost = bot(session, false, along);
    session.reset(ghost.home, 0, ghostWater);
    bots.push(ghost);
  }
  const rides: Ride[] = [];
  let stands = 0;
  const outcomes = new Map<string, number>();
  const durations: number[] = [];
  const curlShares: number[] = [];
  let lostWave = 0;
  const weights = new Map<string, number[]>();
  const shares = new Map<string, number[]>();
  let peelDirection = 0;
  let peelAngle = 0;
  let peelAge = Infinity;
  const steps = Math.round((minutes * 60) / SURF_ZONE_STEP);
  const own = bots[0];
  const here = createWaterSample();
  const left = new Vector3();
  for (let step = 0; step < steps; step += 1) {
    runner.advance(1, { ...own.request, retry: own.retry, pocketReflex: reflex });
    own.retry = false;
    peelAge += SURF_ZONE_STEP;
    if (peelAge >= 1) {
      peelAge = 0;
      const peel = runner.simulation.peelEstimate();
      peelDirection = peel?.direction ?? 0;
      peelAngle = peel?.angleDegrees ?? 0;
    }
    for (const b of bots) {
      const { session, autopilot } = b;
      if (!b.own) {
        session.step(SURF_ZONE_STEP, ghostWater, b.request);
        session.strike(lip);
        if (session.board.outsideDomain || !Number.isFinite(session.board.position.x + session.board.position.z)) session.reset(b.home, 0, ghostWater);
      }
      const { board } = session;
      const body = session.rider.attached ? board.centerOfMass : session.surfer.centerOfMass();
      const velocity = session.rider.attached ? board.velocity : session.surfer.linearMomentum().divideScalar(session.surfer.mass);
      const wave = b.gauge.update(b.own ? runner.water : ghostWater, body, velocity, SURF_ZONE_STEP, peelAngle);
      runner.water.sampleAt(body.x, body.y, body.z, here);
      left.set(1, 0, 0).applyQuaternion(board.orientation);
      // The physics' weight, standing, from the ride's start as the analyzer marks it.
      const phase = session.phase;
      if (phase === 'standing' && b.lastPhase !== 'standing' && b.lastPhase !== 'fallen') {
        b.weights = [];
        b.rideStart = runner.simulation.seaTime;
      }
      if (phase === 'standing') {
        const share = session.rider.contact.load > 0.1 ? session.rider.contact.frontShare : Number.NaN;
        b.weights.push({ t: runner.simulation.seaTime, weight: physicsWeight(session), share, climb: velocity.y });
      }
      b.lastPhase = phase;
      b.analyzer.push({
        t: runner.simulation.seaTime, x: body.x, z: body.z, heading: session.heading, speed: Math.hypot(velocity.x, velocity.z),
        roll: Math.asin(Math.max(-1, Math.min(1, left.y))), load: session.rider.contact.load, phase: session.phase, wave,
        depth: here.stillDepth, breakingHere: here.breaking,
      });
      const closed = b.analyzer.report();
      if (closed) {
        b.analysis = closed;
        b.analyzer = new RideAnalyzer();
        durations.push(closed.duration);
        curlShares.push(closed.duration > 0 ? closed.curlTime / closed.duration : NaN);
        if (closed.end === 'lost the wave') lostWave += 1;
        for (const sample of b.weights) {
          const at = sample.t - b.rideStart;
          if (at > closed.duration || !Number.isFinite(sample.weight)) continue;
          const turn = closed.maneuvers.find((m) => at >= m.start && at <= m.end);
          const where = turn ? turn.kind : sample.climb > CLIMB ? 'climbing' : sample.climb < -CLIMB ? 'descending' : 'level';
          if (!weights.has(where)) weights.set(where, []);
          weights.get(where)!.push(sample.weight);
          if (Number.isFinite(sample.share)) {
            if (!shares.has(where)) shares.set(where, []);
            shares.get(where)!.push(sample.share);
          }
        }
        b.weights = [];
        // The analyzer's end is the ride's end (a fall the autopilot names itself, with its cause).
        if (closed.end !== 'fell') autopilot.finish(closed.end);
      }
      // A board relaunched lying down (out of the window) ends the ride under way.
      if (autopilot.state === 'ride' && session.phase === 'prone') autopilot.finish('relaunched');
      const ride = {
        phase: session.phase, speed: Math.hypot(board.velocity.x, board.velocity.z), boardSpeed: board.velocity.length(),
        cue: b.own ? runner.cue : session.rider.popUpCue || (session.phase === 'prone' && inTakeOffWindow(wave)), popUp: { ...session.rider.popUpReport }, separation: session.separation, resets: 0, wave: { ...wave },
        balance: session.phase === 'fallen' ? 0 : session.rider.balanceReserve,
      };
      let crest = -Infinity;
      for (let back = 2; back <= LOOK; back += 2) crest = Math.max(crest, runner.water.surfaceAt(board.position.x, board.position.z - back));
      const before = autopilot.state;
      const input = autopilot.next({
        ride, peelDirection, board: { x: board.position.x, z: board.position.z, heading: session.heading },
        focusZ: runner.focus.z, crestBehind: crest - settings.tide,
      }, SURF_ZONE_STEP);
      if (autopilot.state === 'ride') {
        if (before !== 'ride') stands += 1;
        b.trace.push({
          speed: ride.speed, label: ride.boardSpeed, crest: wave.valid ? wave.crestSpeed : NaN, required: wave.valid ? wave.requiredSpeed : NaN,
          face: wave.valid ? wave.faceFraction : NaN, ahead: wave.valid ? wave.aheadOfCrest : NaN, height: wave.valid ? wave.faceHeight : NaN,
          peel: peelAngle, x: board.position.x, z: board.position.z,
        });
      }
      // The runner applies the reflex to its own rider; the script applies it to the ghosts.
      b.request = reflex && !b.own ? withPocketReflex(input, wave, session.phase) : input;
      if (autopilot.state === 'done' && b.analyzer.riding && b.windDown < WIND_DOWN) {
        b.windDown += SURF_ZONE_STEP;
      } else if (autopilot.state === 'done') {
        const outcome = autopilot.outcome ?? '';
        outcomes.set(outcome, (outcomes.get(outcome) ?? 0) + 1);
        const { trace } = b;
        if (trace.length * SURF_ZONE_STEP >= MIN_RIDE) {
          let distance = 0;
          for (let i = 1; i < trace.length; i += 1) distance += Math.hypot(trace[i].x - trace[i - 1].x, trace[i].z - trace[i - 1].z);
          const finite = (key: 'crest' | 'required' | 'face' | 'ahead' | 'height') => trace.map((s) => s[key]).filter(Number.isFinite);
          const ratios = trace.filter((s) => Number.isFinite(s.required) && s.required > 0).map((s) => s.speed / s.required);
          rides.push({
            seconds: trace.length * SURF_ZONE_STEP, distance,
            meanSpeed: mean(trace.map((s) => s.speed)), topSpeed: Math.max(...trace.map((s) => s.speed)),
            meanLabel: mean(trace.map((s) => s.label)), topLabel: Math.max(...trace.map((s) => s.label)),
            crestSpeed: mean(finite('crest')), required: mean(finite('required')), ratio: mean(ratios),
            fastShare: ratios.length ? ratios.filter((r) => r > 1.3).length / ratios.length : NaN,
            faceFraction: mean(finite('face')), ahead: mean(finite('ahead')), aheadP90: quantile(finite('ahead'), 0.9),
            faceHeight: mean(finite('height')), peel: mean(trace.map((s) => s.peel)),
            outcome, analysis: b.analysis,
          });
        }
        b.analysis = undefined;
        b.analyzer = new RideAnalyzer();
        b.windDown = 0;
        b.trace = [];
        autopilot.reset();
        b.gauge.reset();
        b.request = { paddle: false, popUp: false, steer: 0 };
        if (b.own) b.retry = true;
        else session.reset(b.home, 0, ghostWater);
      }
    }
  }
  return { rides, attempts: bots.reduce((sum, b) => sum + b.autopilot.attempts, 0), stands, outcomes, durations, curlShares, lostWave, weights, shares };
}

/** Forsyth et al. 2024 (the survey's §8): accomplished surfers' turns, and the radius and lateral load they imply. */
const FORSYTH: Partial<Record<ManeuverKind, string>> = {
  'bottom turn': '| Forsyth 2024 bottom turn | 3.8 per wave | 0.96 | 99 | 1.9 | 7.3 | 3.8 | 1.41 | 42 | — |',
  cutback: '| Forsyth 2024 cutback / top turn | | 0.96 | 152 | 3.0 | 6.7 | 2.2 | 2.05 | 75 | — |',
};

/** The analyzer's reading of the rides: how they ended, their turns beside Forsyth's, and the speed kept from bottom turn to top turn. */
function turnTables(rides: Ride[]): string {
  const analyses = rides.map((r) => r.analysis).filter((a): a is RideReport => a !== undefined);
  const ends = new Map<string, number>();
  for (const a of analyses) ends.set(a.end, (ends.get(a.end) ?? 0) + 1);
  const maneuvers = analyses.flatMap((a) => a.maneuvers);
  const rows: string[] = [];
  for (const kind of ['bottom turn', 'top turn', 'snap', 'cutback'] as ManeuverKind[]) {
    const of = maneuvers.filter((m) => m.kind === kind);
    const average = (value: (m: (typeof of)[number]) => number, digits = 1) => fixed(mean(of.map(value)), digits);
    rows.push(`| ${kind} | ${of.length} | ${average((m) => m.end - m.start, 2)} | ${average((m) => Math.abs(m.yaw) * 180 / Math.PI, 0)} | ${average((m) => m.peakYawRate)} | ${average((m) => m.speedIn)} | ${average((m) => m.radius)} | ${average((m) => m.lateralG, 2)} | ${average((m) => m.roll * 180 / Math.PI, 0)} | ${of.length ? `${fixed((of.filter((m) => m.pocket).length / of.length) * 100, 0)} %` : '—'} |`);
    if (FORSYTH[kind]) rows.push(FORSYTH[kind]!);
  }
  // Speed kept: a bottom turn's entry speed against the next top turn's (Forsyth's "turn flow").
  const kept: number[] = [];
  for (const a of analyses) {
    a.maneuvers.forEach((m, i) => {
      const next = a.maneuvers[i + 1];
      if (m.kind === 'bottom turn' && next && next.kind !== 'bottom turn' && m.speedIn > 0) kept.push(next.speedIn / m.speedIn);
    });
  }
  const unread = rides.length - analyses.length;
  const scores = analyses.map((a) => scoreRide(a).score);
  return `Scores (provisional WSL-criteria rubric, 0.1–10): mean ${fixed(mean(scores))}, best two ${fixed(bestTwo(scores))} of 20.

Ride ends (the ride analyzer): ${[...ends].map(([e, c]) => `${e} ×${c}`).join(', ') || 'none'}${unread ? `; ${unread} ride(s) still open when the rider was relaunched` : ''}. Turns per ride ${fixed(maneuvers.length / Math.max(1, analyses.length))}.

| Turn | Count | Duration s | Yaw ° | Peak yaw rate rad/s | Speed in m/s | Radius m | Lateral g | Rail ° | In the pocket |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
${rows.join('\n')}

Speed kept from a bottom turn into the next top turn: ${fixed(mean(kept), 2)} (${kept.length} pair(s)); Forsyth 2024's "turn flow" is 0.88–0.95.`;
}

const started = Date.now();
const sections: string[] = [];
const summary: string[] = [];
for (const spot of spots) {
  const all: Ride[] = [];
  let attempts = 0;
  let stands = 0;
  const outcomes = new Map<string, number>();
  const durations: number[] = [];
  const shares: number[] = [];
  let lostWave = 0;
  const weights = new Map<string, number[]>();
  const feetShares = new Map<string, number[]>();
  for (let seed = 1; seed <= seedCount; seed += 1) {
    const run = runSpot(spot, seed);
    all.push(...run.rides);
    attempts += run.attempts;
    stands += run.stands;
    durations.push(...run.durations);
    shares.push(...run.curlShares.filter(Number.isFinite));
    lostWave += run.lostWave;
    for (const [where, values] of run.weights) weights.set(where, [...(weights.get(where) ?? []), ...values]);
    for (const [where, values] of run.shares) feetShares.set(where, [...(feetShares.get(where) ?? []), ...values]);
    for (const [outcome, count] of run.outcomes) outcomes.set(outcome, (outcomes.get(outcome) ?? 0) + count);
    console.log(`${spot} seed ${seed}: ${run.attempts} attempts, ${run.stands} stands, ${run.rides.length} rides ≥ ${MIN_RIDE} s; ${[...run.outcomes].map(([o, c]) => `${o} ×${c}`).join(', ')}`);
  }
  summary.push(`| ${spot} | ${attempts} | ${stands} | ${all.length} | ${fixed(quantile(durations, 0.5))} | ${fixed(durations.length ? Math.max(...durations) : NaN)} | ${lostWave} | ${fixed(mean(all.map((r) => r.meanSpeed)))} | ${fixed(all.length ? Math.max(...all.map((r) => r.topSpeed)) : NaN)} | ${shares.length ? `${fixed(mean(shares) * 100, 0)} %` : '—'} | ${fixed(mean(all.map((r) => r.faceHeight)), 2)} | ${fixed(mean(all.map((r) => r.peel)), 0)} | ${fixed(mean(all.map((r) => r.crestSpeed)))} | ${fixed(mean(all.map((r) => r.faceFraction)), 2)} | ${fixed(mean(all.map((r) => r.ahead)))} |`);
  const weightRows = Object.keys(WEIGHT_TARGETS).map((where) => {
    const values = weights.get(where) ?? [];
    const feet = feetShares.get(where) ?? [];
    return `| ${where} | ${fixed(values.length * SURF_ZONE_STEP)} | ${fixed(mean(values), 2)} | ${fixed(quantile(values, 0.1), 2)}–${fixed(quantile(values, 0.9), 2)} | ${fixed(mean(feet), 2)} | ${fixed(quantile(feet, 0.1), 2)}–${fixed(quantile(feet, 0.9), 2)} | ${WEIGHT_TARGETS[where]} |`;
  });
  const weightTable = `The physics' weight on the board (the riding-body plan, step 6), every standing step of the closed rides, by the analyzer's manoeuvres and, outside them, by the board's climb (past ±${CLIMB} m/s), beside the stance map's targets: its pelvis point between the rear foot (0) and the front foot (1), as the stance map reads it, and the feet's own pressure there (the contact's centre of pressure, the share on the front foot):\n\n| Where | Seconds | Pelvis mean | Pelvis p10–p90 | Feet's pressure mean | Feet's p10–p90 | The map's target |\n|---|---:|---:|---:|---:|---:|---|\n${weightRows.join('\n')}`;
  sections.push(`### ${spot}\n\n${turnTables(all)}\n\n${weightTable}\n\nAttempt outcomes: ${[...outcomes].map(([o, c]) => `${o} ×${c}`).join(', ') || 'none'}.\n\n| Ride s | Distance m | Mean / top over ground m/s | Mean / top old label m/s | Crest c m/s | Required m/s | Over ground ÷ required | > 1.3 × required | Face fraction | Ahead of crest m (mean / p90) | Outcome | Turns | Score |\n|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|\n${all.map((r) => `| ${fixed(r.seconds)} | ${fixed(r.distance, 0)} | ${fixed(r.meanSpeed)} / ${fixed(r.topSpeed)} | ${fixed(r.meanLabel)} / ${fixed(r.topLabel)} | ${fixed(r.crestSpeed)} | ${fixed(r.required)} | ${fixed(r.ratio, 2)} | ${fixed(r.fastShare * 100, 0)} % | ${fixed(r.faceFraction, 2)} | ${fixed(r.ahead)} / ${fixed(r.aheadP90)} | ${r.outcome} | ${r.analysis ? r.analysis.maneuvers.length : '—'} | ${r.analysis ? fixed(scoreRide(r.analysis).score) : '—'} |`).join('\n') || '| — | | | | | | | | | | no ride | | |'}`);
}

const report = `# Ride report

Generated by \`npm run report:ride${process.argv.slice(2).length ? ` -- ${process.argv.slice(2).join(' ')}` : ''}\` (${new Date().toISOString().slice(0, 10)}, ${((Date.now() - started) / 60000).toFixed(1)} min). ${practice ? 'Practice groundswell' : 'Natural sea (Wave Lab defaults)'} (${spots.map((spot) => `${spot}: Hs ${swellAt(spot).significantHeight} m, Tp ${swellAt(spot).peakPeriod} s, ${directionAt(spot)}°`).join('; ')}), ${seedCount} seed(s) × ${minutes} min per spot, stage 2 on the CPU.

The runner's own rider rides, pushing back on the water${ghostAlongs.length ? `, with ${ghostAlongs.length} ghost riders along the break (they feel the water and the lip and push back on neither)` : ''}. An autopilot waits ${5} m outside the break line, paddles when a crest rises a quarter of the swell's height (${spots.map((spot) => `${spot} ${fixed(riseAt(spot), 2)} m`).join(', ')}) behind it, pops up on the cue and ${style === 'turns' ? 'rides S-turns: a crouched bottom turn toward the peel low on the face (below 35 % of its height), a top turn sitting back high on it (above 70 %, a snap in a breaking crest), a cutback from more than 8 m out on the shoulder, crouched on the way down and extended climbing' : 'holds a line 60° from the wave\'s travel toward the peel, turning up the face below 35 % of its height and down above 75 %'}. ${reflex ? 'The pocket reflex rides with every rider: with no weight held, it trims to stay near the curl. ' : ''}Rides of ${MIN_RIDE} s or more are measured every step against the wave under them (the wave-frame gauge).

**Research ranges** (the [surf-science survey](surf-gameplay-research.md) §1): accomplished surfers average 6.4 m/s and top out at 9.7 m/s (Forsyth et al. 2024); competitors peak at 9–12.5 m/s (Farley et al. 2012); the required speed is c / sin α (Walker 1974; Hutt et al. 2001); trim sits on the lower-to-mid face (Sugimoto 1998).

| Spot | Attempts | Stands | Rides ≥ ${MIN_RIDE} s | Median ride s | Best ride s | Lost the wave | Mean speed m/s | Top m/s | Near the curl | Face height m | Peel ° | Crest c m/s | Face fraction | Ahead of crest m |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
${summary.join('\n')}

Done when (the [riding-the-wave spec](../superpowers/specs/2026-09-27-riding-the-wave.md)): median ride ≥ 10 s; best 15–20 s; lost the wave 0; mean speed 6–9 m/s; near the curl (within 8 m along the crest) ≥ 50 %; bottom turns in Forsyth's ranges (the turn table). Median, best, lost and near the curl count every ride the analyzer closed; speeds, face and peel the rides of ${MIN_RIDE} s or more.

"Old label" is |board velocity|, which the HUD showed before P9: it includes vertical motion down the face. Speed over ground is horizontal.

${sections.join('\n\n')}
`;
writeFileSync(output, report);
console.log(`wrote ${output}`);
