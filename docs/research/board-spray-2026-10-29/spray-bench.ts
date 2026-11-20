/**
 * The boards' spray's CPU cost (board-spray, 2026-10-29): the sheets' arithmetic for one hull, and the spray's own step
 * with a hard compressed turn's sheet thrown into it against the same sea without it.
 *   npx rolldown docs/research/board-spray-2026-10-29/spray-bench.ts -o dist/scripts/spray-bench.mjs --format esm --platform node
 *   node dist/scripts/spray-bench.mjs [--flux 90] [--frames 1200] [--level high]
 */
import { createBoardSpraySheet, createHullSprayBuffers, hullSpraySheets } from '../../../src/physics/boardSpray';
import { buildBoardShape } from '../../../src/physics/boardShape';
import { hullSprayLayout } from '../../../src/physics/boardSpray';
import { BOARD_SPRAY_CAPACITY, SPRAY_CAPACITY, SprayCloud, WHITEWATER_CAPACITY, type BoardSpraySheet } from '../../../src/wave/SprayCloud';
import { busyWhitewater } from '../../../src/wave/particleTestSupport';
import type { ParticleLevel } from '../../../src/wave/particleBudget';
import { RemoteSurfers, createRemoteState } from '../../../src/net/RemoteSurfers';
import { RemoteSpray } from '../../../src/net/remoteSpray';
import { POSE_BYTES, createPose, encodeBundle, encodePose } from '../../../src/net/poseCodec';
import { RIDER_PHASES, SURF_ZONE_STEP } from '../../../src/wave/SurfZoneRunner';

const args = process.argv.slice(2);
const option = (name: string) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : undefined;
};
const FLUX = Number(option('flux') ?? 90);
const FRAMES = Number(option('frames') ?? 1200);
const LEVEL = (option('level') ?? 'high') as ParticleLevel;

// 1. One hull's sheets: a board banked 35° into a turn at 11 m/s, drifting 6°, 4 cm deep at its low rail's centre.
const layout = hullSprayLayout(buildBoardShape());
const hull = createHullSprayBuffers(layout.stations, layout.lanes, layout.stationLength);
const bank = (35 * Math.PI) / 180;
const drift = (6 * Math.PI) / 180;
hull.axisX.set([Math.cos(bank), Math.sin(bank), 0]);
hull.axisY.set([-Math.sin(bank), Math.cos(bank), 0]);
hull.axisZ.set([0, 0, 1]);
hull.lift = 1500;
for (let o = 0; o < layout.stations * layout.lanes; o += 1) {
  const x = layout.local[o * 3];
  const z = layout.local[o * 3 + 2];
  hull.width[o] = layout.width[o];
  hull.across[o] = x;
  hull.along[o] = z;
  hull.point.set([x * Math.cos(bank), x * Math.sin(bank) - 0.04 + 0.03 * Math.max(0, -z), z], o * 3);
  hull.depth[o] = -hull.point[o * 3 + 1];
  hull.water.set([0, 0, 0], o * 3);
  hull.hull.set([11 * Math.sin(drift), -0.3, 11 * Math.cos(drift)], o * 3);
  hull.sea[o] = 1;
}
const sheets = Array.from({ length: 2 }, createBoardSpraySheet);
let count = 0;
const calls = 200_000;
let start = performance.now();
for (let n = 0; n < calls; n += 1) count = hullSpraySheets(hull, sheets);
const perCall = ((performance.now() - start) / calls) * 1000;
console.log(`hullSpraySheets: ${perCall.toFixed(2)} µs a call (${count} sheets, ${sheets.slice(0, count).map((s) => `${s.flux.toFixed(1)} kg/s`).join(', ')})`);

// 2. The spray's step with a board's sheet (FLUX kg/s, leaving 0.1 m up at 9 m/s, 5 up) against the same sea without it.
const sheet: BoardSpraySheet = { ...createBoardSpraySheet(), x: 12, y: 0.1, z: 12, alongX: 0, alongZ: 1, length: 0.6, vx: 6, vy: 5, vz: 6, flux: FLUX, spread: 1.4, fall: 7, mist: 0.12 };
function run(withSheet: boolean): { ms: number; live: number } {
  const spray = new SprayCloud(3, SPRAY_CAPACITY, WHITEWATER_CAPACITY, BOARD_SPRAY_CAPACITY);
  spray.setLevel(LEVEL);
  let total = 0;
  let live = 0;
  for (let frame = 0; frame < FRAMES; frame += 1) {
    const scene = busyWhitewater(frame);
    const withBoard = withSheet ? { ...scene, boardSheets: [sheet] } : scene;
    const t = performance.now();
    spray.update(withBoard, 1 / 60);
    total += performance.now() - t;
    if (frame >= FRAMES / 2) live += spray.boardCount;
  }
  return { ms: total / FRAMES, live: live / (FRAMES / 2) };
}
run(true);
run(false);
const base = run(false);
const board = run(true);
console.log(`spray step (${LEVEL}): ${base.ms.toFixed(4)} ms without, ${board.ms.toFixed(4)} ms with the sheet (+${(board.ms - base.ms).toFixed(4)} ms), ${board.live.toFixed(0)} board particles live`);

// 3. Another player's sheets on the page, from their pose (`RemoteSpray.add`), each frame.
{
  const remote = new RemoteSurfers();
  remote.join({ id: 1, name: 'Ana', look: { body: 'surfer1', outfit: 'fullsuit', color: 'teal', board: 'classic' } });
  for (const [step, z] of [[600, 0], [606, 1]] as const) {
    const p = createPose();
    const roll = (30 * Math.PI) / 180;
    Object.assign(p, { step, x: 0, z, lift: 0, qx: -0.03, qy: 0, qz: Math.sin(roll / 2), qw: Math.cos(roll / 2), phase: RIDER_PHASES.indexOf('standing'), present: true, boardPresent: true });
    const bytes = new Uint8Array(POSE_BYTES);
    encodePose(p, new DataView(bytes.buffer), 0);
    remote.receiveBundle(encodeBundle([{ id: 1, pose: bytes }]).buffer as ArrayBuffer, 0, []);
  }
  const state = createRemoteState();
  const seaTime = 606 * SURF_ZONE_STEP;
  remote.sample(1, seaTime, state);
  const spray = new RemoteSpray();
  const frames = 50_000;
  const t = performance.now();
  for (let n = 0; n < frames; n += 1) {
    spray.begin();
    spray.add(remote, 1, seaTime, state, (x: number, z: number) => 0.01 * Math.sin(x + z));
  }
  console.log(`RemoteSpray.add: ${(((performance.now() - t) / frames) * 1000).toFixed(2)} µs a player a frame (${spray.packed()?.length ?? 0} floats)`);
}
