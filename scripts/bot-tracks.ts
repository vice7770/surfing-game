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
const autopilot = new Autopilot({ rise: 0.25 * config.significantHeight });
const tracker = new OwnPoseTracker();
const buffers = runner.createBuffers();
const pose = createPose();
const frames: Uint8Array[] = [];
const stepsPerPose = Math.round(1 / (POSE_HZ * SURF_ZONE_STEP));
let input: RideInput = { paddle: false, popUp: false, steer: 0 };
let retry = false;
let peelDirection = 0;
let rides = 0;
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
        cue: session.rider.popUpCue, popUp: { ...session.rider.popUpReport }, separation: session.separation, resets: 0, wave,
        balance: session.phase === 'fallen' ? 0 : session.rider.balanceReserve,
      },
      peelDirection, board: { x: board.position.x, z: board.position.z, heading: session.heading }, focusZ: runner.focus.z, crestBehind: crest - config.tide,
    }, SURF_ZONE_STEP);
    if (autopilot.state === 'ride' && before !== 'ride') rides += 1;
    if (autopilot.state === 'done') {
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
console.log(`Wrote ${frames.length} poses (${minutes} min, ${rides} stands) to ${output}.`);
