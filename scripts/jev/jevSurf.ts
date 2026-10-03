/**
 * Jev plays Breakline: the physical surf zone the game runs (`SurfZoneRunner`
 * with the player's rider, the same code the page's worker steps), driven by
 * Jev, TypeSafe's System One model, through the same `RideRequest` a player's
 * keys make. Nothing is scripted between the sea and the rider but the motor's
 * thumb: each look, the game's state becomes a few phrases, Jev answers a
 * handful of typed questions, and the motor holds that plan until the next.
 *
 *   sea + rider ──► senses ──► phrases ──► typed questions ──► Jev ──► plan ──► RideRequest each step
 *                    (code)      (code)        (code)                    (code)
 *
 * Reaction time is honest by default: a look at time t lands at t + the call's
 * own measured latency (about 220–300 ms, a human's visual reaction), the sea
 * stepping on meanwhile with the previous plan held (src/dev/jev/pilot.ts).
 *
 *   npm run play:jev                                   (Canyon, Practice swell, until a wave is caught or 3 min)
 *   npm run play:jev -- --spot point --seed 2 --minutes 5 --log /tmp/jev.jsonl
 *   npm run play:jev -- --reaction 250                 (a fixed 250 ms reaction, in simulated time)
 *   npm run play:jev -- --reaction 0                   (lockstep: the sea waits for every answer)
 *   npm run play:jev -- --hz 5                         (five looks a second instead of ten)
 *   npm run play:jev -- --pilot script                 (the dev autopilot through the same loop: the baseline)
 *   npm run play:jev -- --keep-going --verbose         (ride the whole session, print every answer)
 *
 * Exit code 0 when a wave was caught (a ride of at least --min-ride s, by the
 * game's own ride analyzer), 1 when none was, 2 on an error. The key is read
 * from TYPESAFE_API_KEY or ~/.config/typesafe/api_key.
 */
import { appendFileSync, writeFileSync } from 'node:fs';
import { Autopilot } from '../../src/dev/Autopilot';
import { compactAnswers } from '../../src/dev/jev/answers';
import type { Live } from '../../src/dev/jev/motor';
import type { Phase } from '../../src/dev/jev/observe';
import { JevPilot, type Landing } from '../../src/dev/jev/pilot';
import { LOOK, readSenses } from '../../src/dev/jev/senses';
import { DEFAULT_PHYSICAL_SETTINGS, swellFor } from '../../src/game/PhysicalMode';
import type { SpotName } from '../../src/wave/Bathymetry';
import { SURF_ZONE_STEP, SurfZoneRunner, type RideRequest, type SurfZoneStatus } from '../../src/wave/SurfZoneRunner';
import { JevClient } from './jevClient';

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const flag = (name: string): boolean => process.argv.includes(`--${name}`);

const spot = (option('spot') ?? 'canyon') as SpotName;
const seed = Number(option('seed') ?? 1);
const minutes = Number(option('minutes') ?? 3);
/** `--natural` rides the spot's default buoy swell; the Practice swell (narrow-band, regular sets) otherwise. */
const practice = !flag('natural');
const pilotName = option('pilot') === 'script' ? 'script' : 'jev';
/** `real` (the call's own latency), a fixed reaction in ms of simulated time, or 0 for lockstep. */
const reactionOption = option('reaction') ?? 'real';
const reaction = reactionOption === 'real' ? 'real' : Number(reactionOption);
const hz = Number(option('hz') ?? 10);
const minRide = Number(option('min-ride') ?? 3);
const keepGoing = flag('keep-going');
const verbose = flag('verbose');
const logFile = option('log');
const summaryFile = option('out');
const model = option('model') ?? 'jev-latest';
/** The game's pocket reflex: on the Practice swell by default, as the game's own setting ('practice'); `--reflex on|off`. */
const reflex = option('reflex') === 'on' ? true : option('reflex') === 'off' ? false : practice;
/** `--trace FILE`: every step from a pop-up to the ride's end, as JSON lines (the rider, the board and the controls). */
const traceFile = option('trace');
if (reaction !== 'real' && !(reaction >= 0)) throw new Error(`--reaction takes real, 0 or a time in ms, not ${reactionOption}`);

/** The script pilot decides this often, steps (the dev autopilot's own 15 Hz). */
const SCRIPT_STRIDE = 4;
/** The full status snapshot (the peel, the ride's report) is read this often, steps: it costs more than a step. */
const STATUS_STRIDE = 60;

interface RideRecord { id: number; duration: number; distance: number; topSpeed: number; end: string; at: number }

const settings = { ...DEFAULT_PHYSICAL_SETTINGS, spot, ...(practice ? { source: 'practice' as const } : {}) };
const swell = swellFor(settings);

function buildRunner(): SurfZoneRunner {
  return new SurfZoneRunner({
    spot, seed,
    significantHeight: swell.significantHeight, heightAt: practice ? 'edge' : 'deep',
    peakPeriod: swell.peakPeriod,
    directionDegrees: swell.directionDegrees ?? settings.directionDegrees,
    spreading: swell.spreading,
    bandwidth: swell.bandwidth,
    tide: settings.tide,
    windSpeed: settings.windSpeed,
  }, { rider: true });
}

const quantile = (values: number[], q: number) => {
  if (!values.length) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
};
const fixed = (value: number, digits = 0) => (Number.isFinite(value) ? value.toFixed(digits) : '—');

async function main(): Promise<number> {
  const client = pilotName === 'jev' ? new JevClient({ model }) : undefined;
  if (client) {
    // The first call opens the connection (TLS and all, ~3 s); warm it before the sea starts.
    const warm = await client.decide({ you: 'warming up' }, { ok: { type: 'noul', instructions: 'Is this a test?' } });
    if (warm.error) {
      console.error(`Jev is not answering: ${warm.error}`);
      return 2;
    }
    console.error(`Jev up: ${warm.model}, warm-up ${fixed(warm.latencyMs)} ms`);
  }
  const built = Date.now();
  const runner = buildRunner();
  const session = runner.session!;
  console.error(`${spot}, ${practice ? 'Practice' : 'buoy'} swell Hs ${swell.significantHeight} m Tp ${swell.peakPeriod} s, seed ${seed}: sea spun up in ${((Date.now() - built) / 1000).toFixed(1)} s`);
  if (logFile) writeFileSync(logFile, '');

  const start = runner.simulation.seaTime;
  const end = start + minutes * 60;
  const wallStart = performance.now();
  const event = (text: string) => console.error(`  ${(runner.simulation.seaTime - start).toFixed(2).padStart(6)} s  ${text}`);

  // The full snapshot, refreshed every STATUS_STRIDE steps: the peel's direction and the last finished ride.
  let status: SurfZoneStatus = runner.status();
  const inReach = () => session.surfer.active && session.recovery.state === 'free' && session.recovery.inReach(session.board);
  const sensesNow = () => readSenses({
    phase: session.phase as Phase,
    cue: runner.cue,
    speed: Math.hypot(session.board.velocity.x, session.board.velocity.z),
    balance: session.phase === 'fallen' ? 0 : session.rider.balanceReserve,
    wave: runner.waveFrame ?? status.ride!.wave,
    heading: session.heading,
    peelDirection: status.peel?.direction ?? 0,
    boardInReach: inReach(),
    x: session.board.position.x, z: session.board.position.z, focusZ: runner.focus.z,
    heightAt: (x, z) => runner.water.surfaceAt(x, z),
    tide: settings.tide,
    swellHeight: swell.significantHeight,
  });
  const liveNow = (): Live => ({
    phase: session.phase as Phase,
    heading: session.heading,
    wave: runner.waveFrame ?? status.ride!.wave,
    boardInReach: inReach(),
  });

  const pilot = client ? new JevPilot(client, { reaction, hz, pocketReflex: reflex }) : undefined;
  const autopilot = new Autopilot({ style: option('style') === 'turns' ? 'turns' : 'line' });
  if (traceFile) writeFileSync(traceFile, '');
  let cuesTaken = 0;
  let cueTaken = false;
  if (pilot) {
    pilot.onLand = ({ look, verdict, plan, lag }: Landing) => {
      if (plan.pop && look.obs.state.prompt && !cueTaken) {
        cueTaken = true;
        cuesTaken += 1;
      }
      const answers = compactAnswers(verdict);
      if (verbose || plan.pop || verdict.error) {
        const said = Object.entries(answers).map(([id, a]) => `${id}=${a}`).join(' ');
        event(`${look.obs.phase.padEnd(8)} ${JSON.stringify(look.obs.state)} → ${verdict.error ? `ERROR ${verdict.error}` : said} | ${fixed(verdict.latencyMs)} ms ${verdict.inputTokens} tok`);
      }
      if (logFile) {
        appendFileSync(logFile, `${JSON.stringify({
          t: +(look.t - start).toFixed(3), lag: +lag.toFixed(3), phase: look.obs.phase, state: look.obs.state,
          answers, ms: Math.round(verdict.latencyMs), tok: verdict.inputTokens, error: verdict.error,
          plan: { paddle: plan.paddle, aim: plan.aim, pop: plan.pop, reset: plan.reset, line: plan.line, trim: plan.trim, stance: plan.stance, swim: plan.swim },
        })}\n`);
      }
    };
  }

  // What happened, read from the game's own state.
  const rides: RideRecord[] = [];
  let decisions = 0;
  let cueWindows = 0;
  let popUps = 0;
  let stands = 0;
  let falls = 0;
  let lastPhase: Phase = 'prone';
  let lastCue = false;
  let lastReport = 0;
  let caught: RideRecord | undefined;
  const takeReport = () => {
    const report = status.ride?.report;
    if (!report || report.id === lastReport) return;
    lastReport = report.id;
    const ride: RideRecord = { id: report.id, duration: report.duration, distance: report.distance, topSpeed: report.topSpeed, end: report.end, at: runner.simulation.seaTime - start };
    rides.push(ride);
    event(`RIDE ${ride.duration.toFixed(1)} s, ${ride.distance.toFixed(0)} m, top ${ride.topSpeed.toFixed(1)} m/s, ${ride.end}`);
    if (!caught && ride.duration >= minRide) caught = ride;
  };

  let request: RideRequest = { paddle: false, popUp: false, steer: 0, retry: false };
  let step = 0;
  while (runner.simulation.seaTime < end && !(caught && !keepGoing)) {
    const t = runner.simulation.seaTime;
    if (pilot) {
      request = await pilot.step(t, SURF_ZONE_STEP, sensesNow, liveNow);
    } else if (step % SCRIPT_STRIDE === 0) {
      const b = session.board.position;
      let crest = -Infinity;
      for (let back = 2; back <= LOOK; back += 2) crest = Math.max(crest, runner.water.surfaceAt(b.x, b.z - back));
      const senses = sensesNow();
      const input = autopilot.next({
        ride: { ...status.ride!, phase: senses.phase, cue: senses.cue, speed: senses.speed, wave: senses.wave },
        peelDirection: senses.peelDirection, board: { x: b.x, z: b.z, heading: senses.heading }, focusZ: runner.focus.z, crestBehind: crest - settings.tide,
      }, SCRIPT_STRIDE * SURF_ZONE_STEP);
      decisions += 1;
      if (senses.cue && input.popUp && !cueTaken) {
        cueTaken = true;
        cuesTaken += 1;
      }
      request = { ...input, retry: false, ...(reflex ? { pocketReflex: true } : {}) };
      if (autopilot.state === 'done') {
        autopilot.reset();
        request.retry = true;
      }
    } else {
      // Between the script's decisions its controls are held; presses count once.
      request = { ...request, popUp: false, retry: false };
    }

    runner.advance(1, request);
    step += 1;
    if (traceFile && session.phase !== 'prone') {
      const { rider, board } = session;
      const wave = runner.waveFrame;
      appendFileSync(traceFile, `${JSON.stringify({
        t: +(runner.simulation.seaTime - start).toFixed(3), phase: session.phase, steer: +request.steer.toFixed(2), trim: request.trim ?? 0, crouch: request.crouch ?? 0,
        heading: +(session.heading * 57.3).toFixed(1), speed: +Math.hypot(board.velocity.x, board.velocity.z).toFixed(2), vy: +board.velocity.y.toFixed(2),
        balance: +rider.balanceReserve.toFixed(2), flight: +rider.flightTime.toFixed(2), contact: rider.inContact, posture: +rider.postureError.toFixed(3),
        face: wave ? +wave.faceFraction.toFixed(2) : null, ahead: wave ? +wave.aheadOfCrest.toFixed(1) : null, height: wave ? +wave.faceHeight.toFixed(2) : null,
      })}\n`);
    }

    // The game's own record of what happened.
    const phase = session.phase as Phase;
    const cue = runner.cue;
    if (cue !== lastCue || phase !== lastPhase) pilot?.attend();
    if (cue && !lastCue) {
      cueWindows += 1;
      cueTaken = false;
      if (verbose) event('cue: POP UP NOW');
    }
    if (!cue && lastCue && !cueTaken && phase === 'prone') event('cue went out untaken');
    if (phase !== lastPhase) {
      if (phase === 'push') { popUps += 1; event('pop-up'); }
      if (phase === 'standing') { stands += 1; event('STOOD UP'); }
      if (phase === 'fallen') { falls += 1; event(`fell (${session.separation ?? 'in the water'})`); }
      if (phase === 'prone' && lastPhase === 'fallen') event('back on the board');
    }
    lastPhase = phase;
    lastCue = cue;
    if (step % STATUS_STRIDE === 0 || (phase !== 'prone' && step % 10 === 0)) {
      status = runner.status();
      takeReport();
    }
    // Let the calls' answers in.
    if (pilot) await new Promise((resolve) => setImmediate(resolve));
  }
  status = runner.status();
  takeReport();
  await pilot?.settle();
  if (pilot) decisions = pilot.landed;

  const simSeconds = runner.simulation.seaTime - start;
  const wallSeconds = (performance.now() - wallStart) / 1000;
  const reactionText = reaction === 'real' ? "each call's own latency" : reaction === 0 ? 'lockstep' : `${reaction} ms`;
  const lines = [
    `# Jev plays Breakline`,
    ``,
    `${spot}, ${practice ? 'Practice' : 'buoy'} swell (Hs ${swell.significantHeight} m, Tp ${swell.peakPeriod} s), seed ${seed}; pilot ${pilot ? `Jev (${model}), ${hz} looks/s, reaction ${reactionText}` : 'the dev autopilot (script)'}; pocket reflex ${reflex ? 'on' : 'off'}.`,
    ``,
    `- Result: ${caught ? `CAUGHT a wave at ${caught.at.toFixed(1)} s: rode ${caught.duration.toFixed(1)} s, ${caught.distance.toFixed(0)} m, top ${caught.topSpeed.toFixed(1)} m/s (${caught.end})` : `no wave caught (no ride of ${minRide} s or more)`}`,
    `- Session: ${simSeconds.toFixed(1)} s of sea in ${wallSeconds.toFixed(1)} s of wall time`,
    `- Decisions: ${decisions}${pilot ? `, latency p50 ${fixed(quantile(pilot.latencies, 0.5))} ms, p95 ${fixed(quantile(pilot.latencies, 0.95))} ms, ${fixed(quantile(pilot.tokens, 0.5))} input tokens each (p50), $${(client?.spentUsd ?? 0).toFixed(5)}, ${pilot.errors} failed, ${pilot.motor.missing} answers missing, ${pilot.stale} overtaken by a newer look` : ''}`,
    `- Cue windows (POP UP NOW): ${cueWindows}, taken ${cuesTaken}; pop-ups ${popUps}; stood ${stands}; falls ${falls}`,
    `- Rides: ${rides.length ? rides.map((r) => `${r.duration.toFixed(1)} s / ${r.distance.toFixed(0)} m / ${r.end}`).join('; ') : 'none'}`,
  ];
  console.log(lines.join('\n'));
  if (summaryFile) writeFileSync(summaryFile, `${lines.join('\n')}\n`);
  return caught ? 0 : 1;
}

main().then((code) => process.exit(code), (error) => {
  console.error(error);
  process.exit(2);
});
