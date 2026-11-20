/**
 * The test wave's starts (`?testWave`, 2026-11-20), on the in-page solver with the game's own config path
 * (`surfZoneConfigFor` under the page's address, `testWaveOverrides`):
 *
 * - `scan`: no rider; every 0.25 s from the mode's start, the current wave's white along the upcoast peak's +x arm (its
 *   latest onset, `onBreak`) and the face 10 m ahead of it: the crest, the trough ahead, the mid-height point, the face
 *   height, the water's flow there, and the ground velocity that keeps a rider at that place on the wave.
 * - `runs`: the rider placed as the game places him (`TEST_WAVE_STARTS`), the sea restored from the start's own state before
 *   every run as the game's restart does; 'ride' with no input, 'catch' paddling (from a delay that steps 0.1 s a run)
 *   and popping up when the cue lights, then nothing pressed. Each run's first seconds, the stand's numbers, and whether
 *   the runs met the same wave (the board's start and the water's state compared bit for bit).
 *
 *   rolldown scripts/test-wave-probe.ts -o dist/scripts/test-wave-probe.mjs --format esm --platform node
 *   node dist/scripts/test-wave-probe.mjs scan --mode ride [--start 63.5] [--seconds 6]
 *   node dist/scripts/test-wave-probe.mjs runs --mode catch --rider new --n 10
 */
import { Vector3 } from 'three';
import { physicalSettingsFor } from '../src/game/SurfConditions';
import { surfZoneConfigFor } from '../src/game/PhysicalMode';
import { TEST_WAVE_STARTS, testWaveOverrides } from '../src/game/testWave';
import { createWaterSample } from '../src/physics/SurfWater';
import type { RiderPlacement } from '../src/physics/RideSession';
import { CANYON_B } from '../src/wave/Bathymetry';
import { SURF_ZONE_STEP, SurfZoneRunner, type RideRequest } from '../src/wave/SurfZoneRunner';
import { TEST_WAVE, type TestWaveMode } from '../src/wave/testWave';

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const command = process.argv[2] ?? 'scan';
const mode = (option('mode') ?? 'ride') as TestWaveMode;
const OWNER = '?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on';
const OLD = '?canyonWaves=true';
const rider = option('rider') ?? 'new';
const foam = option('foam');
// `--extra '&mountAgree=felt'`: more switches on the address (an existing rider option, to compare).
const search = `${rider === 'new' ? OWNER : OLD}&testWave=${mode}${foam === 'on' ? '&testFoam=on' : ''}${option('extra') ?? ''}`;
const startOverride = option('start') !== undefined ? Number(option('start')) : undefined;

/** The game's config for the owner's address: the page's own switches, then the test wave's overrides (main.ts `startTestWave`). */
function gameConfig() {
  (globalThis as { location?: { search: string } }).location = { search };
  const settings = { ...physicalSettingsFor('canyon', { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'cpu' }), tide: 0, windSpeed: 0 };
  const overrides = testWaveOverrides(mode, foam === 'on' ? 'on' : undefined);
  return surfZoneConfigFor(settings, TEST_WAVE.seed, false, { ...overrides, ...(startOverride !== undefined ? { startSeaTime: startOverride } : {}) });
}

const tip = CANYON_B.takeOffX;
const sample = createWaterSample();
const r = (value: number, digits = 2) => Number(value.toFixed(digits));

/** The face at column x: the crest (highest water within ±`band` m of `nearZ`), the trough within 30 m shoreward, and the mid-height point between. */
function faceAt(runner: SurfZoneRunner, x: number, nearZ: number, band = 25) {
  const { water } = runner;
  let crestZ = nearZ;
  let crest = -Infinity;
  for (let z = nearZ - band; z <= nearZ + band; z += 0.25) {
    const y = water.surfaceAt(x, z);
    if (y > crest) { crest = y; crestZ = z; }
  }
  let trough = Infinity;
  let troughZ = crestZ;
  for (let z = crestZ; z <= crestZ + 30; z += 0.25) {
    const y = water.surfaceAt(x, z);
    if (y < trough) { trough = y; troughZ = z; }
  }
  const midY = 0.5 * (crest + trough);
  let midZ = crestZ;
  for (let z = crestZ; z <= troughZ; z += 0.05) {
    if (water.surfaceAt(x, z) <= midY) { midZ = z; break; }
  }
  return { crestZ, crest, troughZ, trough, midZ, midY, height: crest - trough };
}

/**
 * The tilt at a moment: the deck's roll (its +x, the board's left, up from level) and pitch (nose up) against gravity, deg;
 * the face's slope under the board and its part across the board's heading, deg; the body's axis (the physics pelvis to the
 * head) against gravity and against the deck's normal, deg, and its lean toward the board's left; and the balance's felt
 * vertical (`pairFelt`, on the deck's axes with `feltFrame=deck`) against gravity and the deck's normal, deg.
 */
function tilt(runner: SurfZoneRunner): string {
  const session = runner.session!;
  const { board, rider: body } = session;
  const deg = 180 / Math.PI;
  const left = new Vector3(1, 0, 0).applyQuaternion(board.orientation);
  const forward = new Vector3(0, 0, 1).applyQuaternion(board.orientation);
  const normal = new Vector3(0, 1, 0).applyQuaternion(board.orientation);
  const surface = runner.water.surfaceAt(board.centerOfMass.x, board.centerOfMass.z);
  runner.water.sampleAt(board.centerOfMass.x, surface, board.centerOfMass.z, sample);
  const slope = Math.atan(Math.hypot(sample.slopeX, sample.slopeZ)) * deg;
  // The surface's rise across the heading: the slope along the board's left, level.
  const lx = left.x, lz = left.z, ln = Math.hypot(lx, lz) || 1;
  const across = Math.atan((sample.slopeX * lx + sample.slopeZ * lz) / ln) * deg;
  const pelvis = body.partPosition(0, new Vector3());
  const head = body.partPosition(2, new Vector3());
  const axis = head.sub(pelvis).normalize();
  const angle = (a: Vector3, b: Vector3) => Math.acos(Math.max(-1, Math.min(1, a.dot(b)))) * deg;
  const up = new Vector3(0, 1, 0);
  const felt = (body as unknown as { pairFelt: Vector3; deckFelt: boolean; pairFresh: boolean });
  const feltWorld = felt.pairFelt.clone();
  if (felt.deckFelt) feltWorld.applyQuaternion(board.orientation);
  feltWorld.normalize();
  return `deck roll ${(Math.asin(left.y) * deg).toFixed(1)}° pitch ${(Math.asin(forward.y) * deg).toFixed(1)}°; face ${slope.toFixed(1)}°, rising ${across.toFixed(1)}° toward the board's left; body axis ${angle(axis, up).toFixed(1)}° from gravity (${(Math.asin(axis.dot(left)) * deg).toFixed(1)}° toward the left), ${angle(axis, normal).toFixed(1)}° from the deck normal; felt vertical ${felt.pairFresh ? 'unseeded (seeds at the world vertical on the first loaded substep)' : `${angle(feltWorld, up).toFixed(1)}° from gravity, ${angle(feltWorld, normal).toFixed(1)}° from the deck normal`}; phase ${session.phase}`;
}

if (command === 'scan') {
  const config = gameConfig();
  const runner = new SurfZoneRunner(config, {});
  const { simulation } = runner;
  const onsets: { t: number; x: number; z: number }[] = [];
  simulation.onBreak = (wave) => {
    // The arm from its tip to the bowl (whose own breaks start about 55 m along it).
    if (wave.x >= tip - 4 && wave.x <= tip + 52) onsets.push({ t: simulation.seaTime, x: wave.x, z: wave.z });
  };
  const seconds = Number(option('seconds') ?? 11);
  console.log(`scan ${mode}: start ${simulation.seaTime.toFixed(2)} s, H ${config.significantHeight} m, T ${config.peakPeriod} s, ${simulation.sea.components.length} component(s)`);
  let previous: ReturnType<typeof faceAt> | undefined;
  let previousX = Number.NaN;
  for (let step = 0; step <= Math.round(seconds / SURF_ZONE_STEP); step += 1) {
    if (step > 0) runner.advance(1);
    if (step % 15 !== 0) continue;
    const t = simulation.seaTime;
    // This wave's onsets: those since the last gap of more than 3 s.
    let from = onsets.length - 1;
    while (from > 0 && onsets[from].t - onsets[from - 1].t < 3) from -= 1;
    const wave = from >= 0 ? onsets.slice(from).filter((o) => t - o.t < 6) : [];
    if (!wave.length) {
      const tipFace = faceAt(runner, tip, -140, 40);
      console.log(`t ${t.toFixed(2)}: no white on the arm; at the tip the crest is at z ${tipFace.crestZ.toFixed(1)} (${tipFace.crest.toFixed(2)} m), face ${tipFace.height.toFixed(2)} m`);
      previous = undefined;
      continue;
    }
    const edge = wave.reduce((a, b) => (b.x > a.x ? b : a));
    // The peel: the white's x against time over this wave's onsets on the arm.
    const n = wave.length;
    const mt = wave.reduce((s, o) => s + o.t, 0) / n;
    const mx = wave.reduce((s, o) => s + o.x, 0) / n;
    const stt = wave.reduce((s, o) => s + (o.t - mt) ** 2, 0);
    const peel = stt > 0 ? wave.reduce((s, o) => s + (o.t - mt) * (o.x - mx), 0) / stt : Number.NaN;
    const x = edge.x + 10;
    const face = faceAt(runner, x, edge.z + 5);
    const surface = runner.water.surfaceAt(x, face.midZ);
    runner.water.sampleAt(x, surface - 0.05, face.midZ, sample);
    const vz = previous && previousX === x ? (face.midZ - previous.midZ) / 0.25 : Number.NaN;
    console.log(`t ${t.toFixed(2)}: white to x ${edge.x.toFixed(1)} (z ${edge.z.toFixed(1)}, ${n} onsets, peel ${peel.toFixed(1)} m/s); at x ${x.toFixed(1)}: crest z ${face.crestZ.toFixed(1)} ${face.crest.toFixed(2)} m, trough z ${face.troughZ.toFixed(1)} ${face.trough.toFixed(2)} m, face ${face.height.toFixed(2)} m, mid z ${face.midZ.toFixed(2)} y ${face.midY.toFixed(2)}, flow (${sample.flowX.toFixed(2)}, ${sample.flowZ.toFixed(2)}), slope (${sample.slopeX.toFixed(3)}, ${sample.slopeZ.toFixed(3)}), mid dz/dt ${vz.toFixed(2)} m/s`);
    previous = face;
    previousX = x;
  }
} else if (command === 'ridegrid') {
  // A population around the ride start: x ±1 m (along the arm), heading ±5°, speed ±0.5 m/s; each run from the recorded
  // start with no input, its fall time (cut off at `--seconds`).
  const config = gameConfig();
  const runner = new SurfZoneRunner(config, { rider: true });
  const { simulation } = runner;
  const start = simulation.exportState();
  const base = TEST_WAVE_STARTS.ride.placement;
  const seconds = Number(option('seconds') ?? 4);
  const headings = (option('headings') ?? '-5,0,5').split(',').map(Number);
  const dxs = (option('dxs') ?? '-1,0,1').split(',').map(Number);
  const speeds = (option('speeds') ?? '-0.5,0,0.5').split(',').map(Number);
  const baseHeading = option('heading') !== undefined ? Number(option('heading')) : (base.heading * 180) / Math.PI;
  console.log(`ridegrid rider ${rider} (${search}): around ${JSON.stringify(base)} heading ${baseHeading}°`);
  for (const dh of headings) for (const dx of dxs) for (const dv of speeds) {
    simulation.importState(start);
    runner.invalidateTubeApproach();
    const placement: RiderPlacement = { ...base, x: base.x + dx, heading: ((baseHeading + dh) * Math.PI) / 180, speed: base.speed + dv };
    let fell = Number.NaN;
    let placed = '';
    for (let step = 0; step < Math.round(seconds / SURF_ZONE_STEP); step += 1) {
      runner.advance(1, { paddle: false, popUp: false, steer: 0, retry: false, ...(step === 0 ? { place: placement } : {}) });
      if (step === 0) placed = tilt(runner);
      if (runner.status().ride?.phase === 'fallen') { fell = (step + 1) * SURF_ZONE_STEP; break; }
    }
    console.log(`dh ${dh} dx ${dx} dv ${dv}: ${Number.isNaN(fell) ? `≥ ${seconds} s` : `fell at ${fell.toFixed(2)} s (${runner.status().ride?.separation})`} | after step 1: ${placed}`);
  }
} else if (command === 'runs') {
  const config = gameConfig();
  const runner = new SurfZoneRunner(config, { rider: true });
  const { simulation } = runner;
  const session = runner.session!;
  const { board } = session;
  const start = simulation.exportState();
  const startTime = simulation.seaTime;
  // `--place x,z,speed,heading` (heading in degrees from +z toward +x): another placement, to search for the start.
  const place = option('place')?.split(',').map(Number);
  const placement: RiderPlacement = place
    ? { x: place[0], z: place[1], speed: place[2], heading: (place[3] * Math.PI) / 180, phase: mode === 'ride' ? 'standing' : 'prone', followSurface: true }
    : TEST_WAVE_STARTS[mode].placement;
  const runs = Number(option('n') ?? 10);
  const seconds = Number(option('seconds') ?? (mode === 'ride' ? 2 : 10));
  const standFor = 3;
  console.log(`runs ${mode}, rider ${rider} (${search}): start ${startTime.toFixed(2)} s; placement ${JSON.stringify(placement)}; config rider ${config.rider ?? 'old'} feltFrame ${config.feltFrame} riderBody ${config.riderBody} stanceReach ${config.stanceReach} deepen ${config.deepen} testFoam ${config.testFoam}`);
  const point = new Vector3();
  const signatures: string[] = [];
  // The white's +x edge on the arm near the board: the last column, from the tip to 25 m past the board, with breaking water
  // (the felt breaking the gauge reads, ≥ 0.3) or the drawn plume (void fraction ≥ 0.05) within 20 m seaward to 10 m
  // shoreward of it; the gap is the board's x past it.
  const whiteGap = () => {
    const { solver } = simulation;
    const breaking = simulation.feltBreaking;
    let felt = -Infinity;
    let drawn = -Infinity;
    for (let iz = 0; iz < solver.nz; iz += 1) {
      const z = solver.zCenters[iz];
      if (z < board.position.z - 20 || z > board.position.z + 10) continue;
      for (let ix = 0; ix < solver.nx; ix += 1) {
        const x = solver.xCenters[ix];
        if (x < tip - 5 || x > board.position.x + 25) continue;
        const cell = iz * solver.nx + ix;
        if (breaking[cell] >= 0.3) felt = Math.max(felt, x);
        if (simulation.aeration.voidFraction(cell) >= 0.05) drawn = Math.max(drawn, x);
      }
    }
    return `white ${(board.position.x - felt).toFixed(1)} m behind (breaking), ${(board.position.x - drawn).toFixed(1)} m (plume)`;
  };
  // The placement instant itself, before any step: the board's and the body's velocities against the water's.
  {
    simulation.importState(start);
    session.place(placement, runner.water);
    const surface = runner.water.surfaceAt(board.centerOfMass.x, board.centerOfMass.z);
    runner.water.sampleAt(board.centerOfMass.x, surface - 0.05, board.centerOfMass.z, sample);
    const rv = session.rider.velocity;
    const rel = new Vector3(board.velocity.x - sample.flowX, 0, board.velocity.z - sample.flowZ);
    console.log(`tilt at the placement, before a step: ${tilt(runner)}`);
    console.log(`at the placement, before a step: board v (${board.velocity.x.toFixed(3)}, ${board.velocity.y.toFixed(3)}, ${board.velocity.z.toFixed(3)}), body v (${rv.x.toFixed(3)}, ${rv.y.toFixed(3)}, ${rv.z.toFixed(3)}), |board − body| ${board.velocity.distanceTo(rv).toFixed(4)} m/s; water at the board (${sample.flowX.toFixed(3)}, ${sample.flowY.toFixed(3)}, ${sample.flowZ.toFixed(3)}); through the water ${rel.length().toFixed(2)} m/s along heading ${(Math.atan2(rel.x, rel.z) * 180 / Math.PI).toFixed(1)}°, board heading ${(session.heading * 180 / Math.PI).toFixed(1)}°; ${whiteGap()}`);
  }
  for (let run = 0; run < runs; run += 1) {
    // The game's restart (main.ts `restartTestWave`): the recorded sea, then the rider placed on the next step.
    simulation.importState(start);
    runner.invalidateTubeApproach();
    const delay = mode === 'catch' ? Math.round((0.1 * run) / SURF_ZONE_STEP) : 0;
    let cueAt = Number.NaN;
    let standAt = Number.NaN;
    let fellAt = Number.NaN;
    let atStand = '';
    let popped = false;
    let firstBoard = '';
    let first = '';
    const lines: string[] = [];
    let last = { phase: '', t: 0 };
    let atStandTilt = '';
    const whites: string[] = [];
    const total = Math.round(seconds / SURF_ZONE_STEP);
    for (let step = 0; step < total; step += 1) {
      const t = (step + 1) * SURF_ZONE_STEP;
      const status0 = runner.status().ride;
      const lying = status0 ? status0.phase === 'prone' : true;
      const cue = status0?.cue ?? false;
      if (mode === 'catch' && lying && cue && Number.isNaN(cueAt) && step > 0) cueAt = t - SURF_ZONE_STEP;
      const popUp = mode === 'catch' && !popped && !Number.isNaN(cueAt);
      if (popUp) popped = true;
      const request: RideRequest = {
        paddle: mode === 'catch' && lying && step >= delay && !popped, popUp, steer: 0, retry: false,
        ...(step === 0 ? { place: placement } : {}),
      };
      runner.advance(1, request);
      const status = runner.status().ride!;
      if (step === 0 || (step + 1) % 30 === 0) {
        const at = `${t.toFixed(2)} s: ${whiteGap()}`;
        if (step === 0) whites.length = 0;
        whites.push(at);
      }
      if (step === 0) {
        // The placement instant, after the step that placed him: the board's and the body's velocities against the water's.
        const surface = runner.water.surfaceAt(board.centerOfMass.x, board.centerOfMass.z);
        runner.water.sampleAt(board.centerOfMass.x, surface - 0.05, board.centerOfMass.z, sample);
        const rv = session.rider.velocity;
        firstBoard = `board (${board.position.x.toFixed(6)}, ${board.position.y.toFixed(6)}, ${board.position.z.toFixed(6)})`;
        first = `placed: board v (${board.velocity.x.toFixed(2)}, ${board.velocity.y.toFixed(2)}, ${board.velocity.z.toFixed(2)}) m/s, body v (${rv.x.toFixed(2)}, ${rv.y.toFixed(2)}, ${rv.z.toFixed(2)}), |board − body| ${board.velocity.distanceTo(rv).toFixed(3)} m/s, water flow (${sample.flowX.toFixed(2)}, ${sample.flowY.toFixed(2)}, ${sample.flowZ.toFixed(2)}), board ${(board.centerOfMass.y - surface).toFixed(3)} m from the surface; wave: face ${status.wave.faceHeight.toFixed(2)} m, ${status.wave.faceFraction.toFixed(2)} up it, ${status.wave.aheadOfCrest.toFixed(1)} m ahead of the crest, crest ${status.wave.crestSpeed.toFixed(1)} m/s, breaking at the crest ${status.wave.crestBreaking.toFixed(2)}, curl ${status.wave.curlDistance.toFixed(1)} m (side ${status.wave.curlSide}); phase ${status.phase}`;
      }
      const phase = status.phase;
      if (step === 0 && run === 0) console.log(`tilt after the first step: ${tilt(runner)}`);
      if (step === 5 && run === 0) console.log(`tilt after 0.1 s: ${tilt(runner)}`);
      if (phase === 'standing' && Number.isNaN(standAt)) {
        standAt = t;
        if (mode === 'catch') atStandTilt = tilt(runner);
        // The stand's numbers: speed through the water along the heading, the planing latch, the worst foot's height over the water.
        const surface = runner.water.surfaceAt(board.centerOfMass.x, board.centerOfMass.z);
        runner.water.sampleAt(board.centerOfMass.x, surface - 0.05, board.centerOfMass.z, sample);
        const heading = session.heading;
        const through = (board.velocity.x - sample.flowX) * Math.sin(heading) + (board.velocity.z - sample.flowZ) * Math.cos(heading);
        let worst = Infinity;
        for (const index of [5, 6]) {
          session.renderPoint(index, point);
          worst = Math.min(worst, point.y - runner.water.surfaceAt(point.x, point.z));
        }
        atStand = `through water ${through.toFixed(2)} m/s (rider's ${session.rider.leanProbe.speedThrough.toFixed(2)}), planing ${session.rider.leanProbe.planing}, worst foot ${worst >= 0 ? '+' : ''}${worst.toFixed(3)} m over the surface, ground ${status.speed.toFixed(2)} m/s, ${status.wave.faceFraction.toFixed(2)} up a ${status.wave.faceHeight.toFixed(2)} m face, ${status.wave.aheadOfCrest.toFixed(1)} m ahead of the crest`;
      }
      if (phase === 'fallen' && Number.isNaN(fellAt)) fellAt = t;
      if (phase !== last.phase) {
        lines.push(`${t.toFixed(2)} ${phase}`);
        last = { phase, t };
      }
      // A stand is followed for `standFor` s; a fall ends the run.
      if (!Number.isNaN(fellAt) || (!Number.isNaN(standAt) && t - standAt >= standFor)) break;
      if (mode === 'ride' && step % 30 === 29) lines.push(`${t.toFixed(2)} speed ${status.speed.toFixed(1)} up ${status.wave.faceFraction.toFixed(2)} ahead ${status.wave.aheadOfCrest.toFixed(1)} curl ${status.wave.curlDistance.toFixed(1)} balance ${status.balance.toFixed(2)}`);
    }
    const stood = Number.isNaN(standAt) ? '' : !Number.isNaN(fellAt) ? `stood ${(fellAt - standAt).toFixed(2)} s then fell (${runner.status().ride?.separation ?? '?'})` : `stood ≥ ${standFor} s (censored)`;
    signatures.push(firstBoard);
    console.log(`run ${run + 1} (paddle from ${(delay * SURF_ZONE_STEP).toFixed(1)} s): ${first}`);
    if (atStandTilt) console.log(`  tilt at the first standing frame: ${atStandTilt}`);
    if (mode === 'catch') console.log(`  cue ${Number.isNaN(cueAt) ? 'never' : `at ${cueAt.toFixed(2)} s`}; ${Number.isNaN(standAt) ? 'no stand' : `stood at ${standAt.toFixed(2)} s: ${atStand}`}; ${stood || (Number.isNaN(fellAt) ? 'no fall' : `fell at ${fellAt.toFixed(2)} s`)}`);
    else console.log(`  ${Number.isNaN(fellAt) ? `still standing at ${seconds} s` : `fell at ${fellAt.toFixed(2)} s (${runner.status().ride?.separation ?? '?'})`}`);
    console.log(`  ${lines.join(' | ')}`);
    if (run === 0) console.log(`  ${whites.join(' | ')}`);
  }
  console.log(`placement identical across runs: ${signatures.every((s) => s === signatures[0])} (${signatures[0]})`);
}
