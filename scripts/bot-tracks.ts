/**
 * Dev bots' track (spec N1): an autopilot paddles, catches and rides the
 * Canyon room's sea (Medium swell) on the CPU, and its pose is recorded at
 * 20 Hz as a player would send it. The room server replays it for BOTS=1.
 *
 *   npm run bots:record                      (5 minutes of sea)
 *   npm run bots:record -- --minutes 2 --out server/bots/short.bin
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Autopilot } from '../src/dev/Autopilot';
import { OwnPoseTracker } from '../src/net/ownPose';
import { POSE_BYTES, createPose, encodePose } from '../src/net/poseCodec';
import { POSE_HZ } from '../src/net/protocol';
import { roomSurfZoneConfig } from '../src/net/roomSea';
import type { RideInput } from '../src/physics/RideSession';
import { SURF_ZONE_STEP, SurfZoneRunner } from '../src/wave/SurfZoneRunner';
import { encodeBotTrack } from '../server/bots';

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const minutes = Number(option('minutes') ?? 5);
const output = option('out') ?? 'server/bots/canyon-medium.bin';

const config = roomSurfZoneConfig({ spot: 'canyon', conditions: { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' }, seed: 7 }, 0, 'cpu');
const runner = new SurfZoneRunner(config, { rider: true });
// Waiting at the take-off and holding the lineup: the Canyon's water carries a waiting board shoreward about 1 m/s
// over its arm, 7–48 m inside the take-off before a crest came (2026-10-22). Let drift 10 m inside, it paddles back.
const autopilot = new Autopilot({ rise: 0.25 * config.significantHeight, waitOutside: 0, holdInside: 10 });
const tracker = new OwnPoseTracker();
const buffers = runner.createBuffers();
const pose = createPose();
const frames: Uint8Array[] = [];
const stepsPerPose = Math.round(1 / (POSE_HZ * SURF_ZONE_STEP));
let input: RideInput = { paddle: false, popUp: false, steer: 0 };
let retry = false;
let peelDirection = 0;
let rides = 0;
/** Each stand's ride, for the log: seconds standing, along shore (x) and along the board's path, m, and how it ended. */
const ridden: { seconds: number; alongShore: number; path: number; outcome: string }[] = [];
let standing: { x: number; path: number; lastX: number; lastZ: number } | undefined;
const total = Math.round((minutes * 60) / SURF_ZONE_STEP);
const started = Date.now();

for (let step = 0; step < total; step += 1) {
  runner.advance(1, { ...input, retry });
  retry = false;
  const session = runner.session!;
  const wave = runner.waveFrame;
  if (step % 60 === 0) peelDirection = runner.simulation.peelEstimate()?.direction ?? 0;
  if (wave) {
    const { board } = session;
    let crest = -Infinity;
    for (let back = 2; back <= 14; back += 2) crest = Math.max(crest, runner.water.surfaceAt(board.position.x, board.position.z - back));
    const before = autopilot.state;
    input = autopilot.next({
      ride: {
        phase: session.phase, speed: Math.hypot(board.velocity.x, board.velocity.z), boardSpeed: board.velocity.length(),
        // The cue the player's HUD shows: planing down the face, or caught high on it (the take-off window).
        cue: runner.cue, popUp: { ...session.rider.popUpReport }, separation: session.separation, resets: 0, wave,
        balance: session.phase === 'fallen' ? 0 : session.rider.balanceReserve,
      },
      peelDirection, board: { x: board.position.x, z: board.position.z, heading: session.heading }, focusZ: runner.focus.z, crestBehind: crest - config.tide,
    }, SURF_ZONE_STEP);
    if (autopilot.state === 'ride' && before !== 'ride') {
      rides += 1;
      standing = { x: board.position.x, path: 0, lastX: board.position.x, lastZ: board.position.z };
    }
    if (standing) {
      standing.path += Math.hypot(board.position.x - standing.lastX, board.position.z - standing.lastZ);
      standing.lastX = board.position.x;
      standing.lastZ = board.position.z;
    }
    if (autopilot.state === 'done') {
      if (standing) {
        const ride = { seconds: autopilot.rideTime, alongShore: board.position.x - standing.x, path: standing.path, outcome: autopilot.outcome ?? '' };
        ridden.push(ride);
        console.log(`  ride ${ridden.length} at ${(step * SURF_ZONE_STEP).toFixed(0)} s: ${ride.seconds.toFixed(1)} s, ${ride.alongShore.toFixed(0)} m along shore, ${ride.path.toFixed(0)} m ridden (${ride.outcome})`);
        standing = undefined;
      } else {
        console.log(`  attempt ${autopilot.attempts} at ${(step * SURF_ZONE_STEP).toFixed(0)} s: ${autopilot.outcome ?? ''}, ${(runner.focus.z - board.position.z).toFixed(0)} m outside the take-off`);
      }
      autopilot.reset();
      input = { paddle: false, popUp: false, steer: 0 };
      retry = true;
    }
  }
  if (step % stepsPerPose === stepsPerPose - 1) {
    runner.fill(buffers);
    tracker.accumulate(buffers.reaction);
    const frame = new Uint8Array(POSE_BYTES);
    encodePose(tracker.write(buffers, (x, z) => runner.water.surfaceAt(x, z), runner.simulation.seaTime, input.paddle, pose), new DataView(frame.buffer), 0);
    frames.push(frame);
  }
  if (step % 3600 === 0) console.log(`  ${(step * SURF_ZONE_STEP).toFixed(0)} s of sea · ${((Date.now() - started) / 1000).toFixed(0)} s · ${rides} stands`);
}

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, encodeBotTrack(frames));
const seconds = ridden.map((ride) => ride.seconds).sort((a, b) => a - b);
if (seconds.length) console.log(`Rides: ${seconds.length} ended, median ${seconds[Math.floor((seconds.length - 1) / 2)].toFixed(1)} s, longest ${seconds.at(-1)!.toFixed(1)} s${standing ? '; one still riding at the end' : ''}.`);
console.log(`Wrote ${frames.length} poses (${minutes} min, ${rides} stands) to ${output}.`);
