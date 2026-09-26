/**
 * Sound report (S1): an autopilot ride on a physical surf zone, heard from the
 * ride camera's place, logged as the sound it would make. Headless: it runs the
 * physics-to-sound mapping (`soundTargets`), not the audio, and checks that the
 * sound follows its causes. Writes docs/research/sound-report.md.
 *
 *   npm run report:sound
 *   npm run report:sound -- --spot reef --seconds 90 --out /tmp/reef.md
 */
import { writeFileSync } from 'node:fs';
import { OneShotShaper, soundTargets, ONE_SHOT_CAP, type SoundFrame } from '../src/audio/soundMapping';
import { Autopilot } from '../src/dev/Autopilot';
import { DEFAULT_PHYSICAL_SETTINGS, swellFor } from '../src/game/PhysicalMode';
import type { SpotName } from '../src/wave/Bathymetry';
import { SURF_ZONE_STEP, SurfZoneRunner } from '../src/wave/SurfZoneRunner';

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const spot = (option('spot') ?? 'point') as SpotName;
const seconds = Number(option('seconds') ?? 60);
const seed = Number(option('seed') ?? 1);
const output = option('out') ?? 'docs/research/sound-report.md';
const settings = { ...DEFAULT_PHYSICAL_SETTINGS, spot, source: 'practice' as const };
const swell = swellFor(settings);
const direction = swell.directionDegrees ?? settings.directionDegrees;

/** The front ride camera's offset from the rider (SpectatorCamera's FRONT_SIDE, FRONT_HEIGHT, FRONT_SHOREWARD). */
const CAMERA = { x: -5, y: 3.5, z: 9 };
/** A crest this high behind the board starts the autopilot's paddle, m (as the catch report). */
const RISE = 0.25 * swell.significantHeight;
const LOOK = 14;
const WINDOW = 5;

const runner = new SurfZoneRunner({
  spot, seed, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod, directionDegrees: direction,
  spreading: swell.spreading, bandwidth: swell.bandwidth, tide: settings.tide, windSpeed: settings.windSpeed,
}, { rider: true });
const autopilot = new Autopilot({ rise: RISE });
const buffers = runner.createBuffers();
const shaper = new OneShotShaper();

interface Window {
  start: number;
  roarPeak: number;
  roarSum: number;
  breaking: number;
  rushPeak: number;
  railPeak: number;
  speedPeak: number;
  shots: Map<string, number>;
  frames: number;
}
const windows: Window[] = [];
const events: string[] = [];
const rushSpeed: [number, number][] = [];
const roarBreaking: [number, number][] = [];
let peakShots = 0;
let mappingMs = 0;
let mappingPeak = 0;
let transitions = { popUp: 0, plunge: 0 };
let heard = { popUp: 0, plunge: 0 };
let previousPhase: NonNullable<SoundFrame['ride']>['phase'] = 'prone';
let previousBoard: { x: number; y: number; z: number } | undefined;
let sideslip = 0;
let retry = false;
let peelDirection = 0;
let peelAge = Infinity;

const steps = Math.round(seconds / SURF_ZONE_STEP);
for (let step = 0; step < steps; step += 1) {
  const time = step * SURF_ZONE_STEP;
  const status = runner.status();
  const ride = status.ride!;
  peelAge += SURF_ZONE_STEP;
  if (peelAge >= 1) {
    peelAge = 0;
    peelDirection = runner.simulation.peelEstimate()?.direction ?? 0;
  }
  const board = runner.session!.board;
  let crest = -Infinity;
  for (let back = 2; back <= LOOK; back += 2) crest = Math.max(crest, runner.water.surfaceAt(board.position.x, board.position.z - back));
  const input = autopilot.next({
    ride, peelDirection, board: { x: board.position.x, z: board.position.z, heading: runner.session!.heading },
    focusZ: runner.focus.z, crestBehind: crest - settings.tide,
  }, SURF_ZONE_STEP);
  if (autopilot.state === 'done') {
    autopilot.reset();
    retry = true;
  }
  runner.advance(1, { ...input, retry });
  retry = false;
  runner.fill(buffers);

  const after = runner.status();
  const [x, y, z, qx, qy, qz, qw] = buffers.board;
  if (previousBoard) {
    const rx = 1 - 2 * (qy * qy + qz * qz);
    const ry = 2 * (qx * qy + qw * qz);
    const rz = 2 * (qx * qz - qw * qy);
    sideslip = Math.abs(((x - previousBoard.x) * rx + (y - previousBoard.y) * ry + (z - previousBoard.z) * rz) / SURF_ZONE_STEP);
  }
  previousBoard = { x, y, z };
  const phase = after.ride!.phase;
  if (previousPhase === 'prone' && phase === 'push') transitions.popUp += 1;
  if (previousPhase !== 'fallen' && phase === 'fallen') transitions.plunge += 1;
  const listener = { x: x + CAMERA.x, y: y + CAMERA.y, z: z + CAMERA.z };
  const frame: SoundFrame = {
    dt: SURF_ZONE_STEP, timeScale: 1, paused: false,
    listener: { ...listener, underwater: listener.y < runner.water.surfaceAt(listener.x, listener.z) },
    roar: buffers.roar, lipHits: buffers.lipHits, lipHitCount: buffers.lipHitCount,
    strokeHits: buffers.strokeHits, strokeHitCount: buffers.strokeHitCount,
    significantHeight: swell.significantHeight, windSpeed: settings.windSpeed,
    board: { x, y, z, speed: after.ride!.boardSpeed, sideslip },
    ride: { phase, previousPhase, speed: after.ride!.boardSpeed },
  };
  previousPhase = phase;
  const started = performance.now();
  const targets = soundTargets(frame, shaper);
  const took = performance.now() - started;
  mappingMs += took;
  mappingPeak = Math.max(mappingPeak, took);

  const index = Math.floor(time / WINDOW);
  windows[index] ??= { start: index * WINDOW, roarPeak: 0, roarSum: 0, breaking: 0, rushPeak: 0, railPeak: 0, speedPeak: 0, shots: new Map(), frames: 0 };
  const w = windows[index];
  const roar = targets.loops.filter((l) => l.id === 'roar').map((l) => l.gain);
  const roarTotal = roar.reduce((a, b) => a + b, 0);
  const rush = targets.loops.find((l) => l.id === 'rush')!.gain;
  w.roarPeak = Math.max(w.roarPeak, ...roar);
  w.roarSum += roarTotal;
  w.breaking += after.breakingFraction;
  w.rushPeak = Math.max(w.rushPeak, rush);
  w.railPeak = Math.max(w.railPeak, targets.loops.find((l) => l.id === 'rail')!.gain);
  w.speedPeak = Math.max(w.speedPeak, after.ride!.boardSpeed);
  w.frames += 1;
  for (const shot of targets.oneShots) {
    w.shots.set(shot.id, (w.shots.get(shot.id) ?? 0) + 1);
    if (shot.id === 'popUp' || shot.id === 'plunge') {
      heard[shot.id] += 1;
      events.push(`| ${time.toFixed(2)} | ${shot.id} | ${shot.gain.toFixed(2)} |`);
    }
  }
  peakShots = Math.max(peakShots, targets.oneShots.length);
  rushSpeed.push([after.ride!.boardSpeed, rush]);
  roarBreaking.push([after.breakingFraction, roarTotal]);
}

function correlation(pairs: [number, number][]): number {
  const n = pairs.length;
  const mean = (i: 0 | 1) => pairs.reduce((sum, p) => sum + p[i], 0) / n;
  const [ma, mb] = [mean(0), mean(1)];
  let cov = 0;
  let va = 0;
  let vb = 0;
  for (const [a, b] of pairs) {
    cov += (a - ma) * (b - mb);
    va += (a - ma) ** 2;
    vb += (b - mb) ** 2;
  }
  return va > 0 && vb > 0 ? cov / Math.sqrt(va * vb) : 0;
}

const rushCorrelation = correlation(rushSpeed);
const roarCorrelation = correlation(roarBreaking);
const shotNames = ['lipJet', 'lipRoller', 'paddle', 'popUp', 'plunge'];
const rows = windows.map((w) => `| ${w.start}–${w.start + WINDOW} | ${(w.breaking / w.frames * 100).toFixed(1)} % | ${w.roarPeak.toFixed(2)} | ${(w.roarSum / w.frames).toFixed(2)} | ${w.speedPeak.toFixed(1)} | ${w.rushPeak.toFixed(2)} | ${w.railPeak.toFixed(2)} | ${shotNames.map((id) => w.shots.get(id) ?? 0).join(' / ')} |`);
const check = (ok: boolean) => (ok ? 'yes' : '**no**');
const report = `# Sound report · physical surf zone

Generated by \`npm run report:sound -- ${process.argv.slice(2).join(' ')}\` on ${new Date().toISOString().slice(0, 10)} (S1; reported, not asserted).

**Conditions.** ${spot}, the practice groundswell (Hs ${swell.significantHeight} m, Tp ${swell.peakPeriod} s), seed ${seed}, ${seconds} s. An autopilot surfer paddles, pops up and rides; the listener sits at the front ride camera's offset from the board (${CAMERA.x}, ${CAMERA.y}, ${CAMERA.z} m). Each 1/60 s step is one frame of \`soundTargets\`: this is the mapping from physics to sound, not the audio engine.

## Checks

| Check | Measured | Holds |
|---|---|---|
| The roar follows the breaking | correlation of the summed roar with the breaking fraction: ${roarCorrelation.toFixed(2)} | ${check(roarCorrelation > 0.5)} |
| The board's rush follows its speed | correlation: ${rushCorrelation.toFixed(2)} | ${check(rushCorrelation > 0.8)} |
| One pop-up sound per pop-up | ${heard.popUp} heard for ${transitions.popUp} pop-ups | ${check(heard.popUp === transitions.popUp)} |
| One plunge per fall | ${heard.plunge} heard for ${transitions.plunge} falls | ${check(heard.plunge === transitions.plunge)} |
| No frame beyond the voice cap (${ONE_SHOT_CAP}) | peak ${peakShots} one-shots in a frame | ${check(peakShots <= ONE_SHOT_CAP)} |

The mapping took ${(mappingMs / steps * 1000).toFixed(1)} µs per frame on average, ${(mappingPeak * 1000).toFixed(0)} µs at most.

## Over time

| Seconds | Breaking | Roar, loudest sector | Roar, sum of sectors | Board speed peak, m/s | Rush peak | Rail peak | One-shots: jet / roller / paddle / pop-up / plunge |
|---|---:|---:|---:|---:|---:|---:|---|
${rows.join('\n')}

## Pop-ups and falls

| Seconds | Sound | Gain |
|---:|---|---:|
${events.join('\n') || '| — | — | — |'}
`;
writeFileSync(output, report);
console.error(`wrote ${output}`);
