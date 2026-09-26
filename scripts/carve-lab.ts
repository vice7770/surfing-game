/**
 * Carve lab (turn redesign, Task 1): standard manoeuvres on a 15° plane face,
 * measured against Forsyth et al. 2024. It reports the hard turn, the carve
 * envelope, the roll–yaw wobble after a roll kick (P4e's Mode B), and the
 * hull's own roll stiffness and damping from a prone rider's board. Writes
 * docs/research/carve-lab.md.
 *
 *   npm run report:carve
 *   npm run report:carve -- --out /tmp/carve.md
 */
import { writeFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { dampedMode, turnMeasures } from '../src/dev/carveMetrics';
import { AttachedRider } from '../src/physics/AttachedRider';
import { BoardBody } from '../src/physics/BoardBody';
import { PlaneWater } from '../src/physics/PlaneWater';

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const output = option('out') ?? 'docs/research/carve-lab.md';
const STEP = 1 / 60;
const FACE = (15 * Math.PI) / 180;
const water = new PlaneWater({ slopeZ: -Math.tan(FACE) });
const fixed = (value: number, digits = 1) => (Number.isFinite(value) ? value.toFixed(digits) : '—');
const degrees = (radians: number) => (radians * 180) / Math.PI;

/** A board on the face heading `across` degrees from the fall line, at `speed`, with a rider in `phase`. */
function onFace(across: number, speed: number, phase: 'standing' | 'prone') {
  const yaw = (across * Math.PI) / 180;
  const normal = new Vector3(0, 1, Math.tan(FACE)).normalize();
  const fall = new Vector3(0, -Math.sin(FACE), Math.cos(FACE));
  const side = new Vector3().crossVectors(normal, fall).normalize();
  const forward = fall.clone().multiplyScalar(Math.cos(yaw)).addScaledVector(side, -Math.sin(yaw)).normalize();
  const left = new Vector3().crossVectors(normal, forward).normalize();
  const board = new BoardBody();
  board.place(normal.clone().multiplyScalar(board.shape.centerOfMass.y), new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)), forward.clone().multiplyScalar(speed));
  const rider = new AttachedRider(board.shape, { phase });
  board.attach(rider);
  return { board, rider };
}

const heading = (board: BoardBody) => { const f = new Vector3(0, 0, 1).applyQuaternion(board.orientation); return Math.atan2(f.x, f.z); };
/** The board's roll about its own length, rad: positive with its +x (left) rail down. */
const rail = (board: BoardBody) => -Math.asin(Math.max(-1, Math.min(1, new Vector3(1, 0, 0).applyQuaternion(board.orientation).y)));

/** A full lean with a crouch from straight down the face at 7 m/s. */
function hardTurn() {
  const { board, rider } = onFace(0, 7, 'standing');
  for (let i = 0; i < 18; i += 1) board.step(STEP, water);
  const speed = board.velocity.length();
  rider.steer = 1;
  rider.crouch = 0.6;
  const headings: number[] = [heading(board)];
  const rails: number[] = [];
  let load = 0;
  let time = 0;
  for (let i = 0; i < 120 && rider.attached; i += 1) {
    board.step(STEP, water);
    time += STEP;
    headings.push(heading(board));
    rails.push(rail(board));
    load = Math.max(load, rider.contact.load);
  }
  const first = turnMeasures(headings.slice(0, 73), STEP, 60);
  const last = rails.slice(-30);
  return {
    yaw: degrees(first.yaw), peak: first.peakRate, timeTo60: first.timeTo, rail: degrees(last.reduce((a, b) => a + b, 0) / Math.max(1, last.length)),
    kept: board.velocity.length() / speed, attached: rider.attached, time, load,
  };
}

/** Steer held for 4 s at a speed: the steady yaw rate and rail over the last second, and how long the rider stayed on. */
function carve(steer: number, speed: number) {
  const { board, rider } = onFace(0, speed, 'standing');
  for (let i = 0; i < 18; i += 1) board.step(STEP, water);
  rider.steer = steer;
  const headings: number[] = [];
  const rails: number[] = [];
  let time = 0;
  for (let i = 0; i < 240 && rider.attached; i += 1) {
    board.step(STEP, water);
    time += STEP;
    headings.push(heading(board));
    rails.push(rail(board));
  }
  const tail = Math.min(60, headings.length - 1);
  const rate = tail > 0 ? turnMeasures(headings.slice(-tail - 1), STEP, 360).yaw / (tail * STEP) : NaN;
  const lastRails = rails.slice(-tail);
  return { rate, rail: degrees(lastRails.reduce((a, b) => a + b, 0) / Math.max(1, lastRails.length)), time, attached: rider.attached };
}

/** Riding straight, a roll kick of 0.5 rad/s; the yaw rate's ringing (the roll–yaw wobble). */
function wobble(speed: number) {
  const { board, rider } = onFace(0, speed, 'standing');
  for (let i = 0; i < 60; i += 1) board.step(STEP, water);
  const forward = new Vector3(0, 0, 1).applyQuaternion(board.orientation);
  board.angularVelocity.addScaledVector(forward, 0.5);
  const rates: number[] = [];
  let previous = heading(board);
  for (let i = 0; i < 180 && rider.attached; i += 1) {
    board.step(STEP, water);
    let d = heading(board) - previous;
    d -= 2 * Math.PI * Math.round(d / (2 * Math.PI));
    previous = heading(board);
    rates.push(d / STEP);
  }
  return { mode: dampedMode(rates, STEP), attached: rider.attached };
}

/** A prone rider's board at 7 m/s kicked 10° onto its rail: the roll's ringing, and the hull's roll stiffness and damping from it. */
function hullRoll() {
  const { board, rider } = onFace(0, 7, 'prone');
  for (let i = 0; i < 60; i += 1) board.step(STEP, water);
  const forward = new Vector3(0, 0, 1).applyQuaternion(board.orientation);
  board.orientation.premultiply(new Quaternion().setFromAxisAngle(forward, (10 * Math.PI) / 180));
  (board as unknown as { syncPosition(): void }).syncPosition();
  const rolls: number[] = [];
  for (let i = 0; i < 180 && rider.attached; i += 1) {
    board.step(STEP, water);
    rolls.push(rail(board));
  }
  // Roll inertia about the board's length through the pair's centre: the board's own, and the prone body's parts.
  const boardInertia = (board as unknown as { bodyInertia: number[] }).bodyInertia[8];
  let bodyInertia = 0;
  const parts = rider.parts;
  let mass = 0;
  const center = { x: 0, y: 0 };
  for (let k = 0; k < rider.partMasses.length; k += 1) {
    mass += rider.partMasses[k];
    center.x += rider.partMasses[k] * parts[k * 3];
    center.y += rider.partMasses[k] * parts[k * 3 + 1];
  }
  center.x /= mass;
  center.y /= mass;
  for (let k = 0; k < rider.partMasses.length; k += 1) {
    bodyInertia += rider.partMasses[k] * ((parts[k * 3] - center.x) ** 2 + (parts[k * 3 + 1] - center.y) ** 2);
  }
  const inertia = boardInertia + bodyInertia;
  const mode = dampedMode(rolls, STEP);
  const omega = mode ? 2 * Math.PI * mode.frequency / Math.sqrt(Math.max(1e-6, 1 - mode.damping ** 2)) : NaN;
  return {
    mode, attached: rider.attached, boardInertia, bodyInertia, inertia,
    stiffness: inertia * omega * omega, damping: mode ? 2 * mode.damping * inertia * omega : NaN,
  };
}

const started = Date.now();
const turn = hardTurn();
const carves: string[] = [];
for (const speed of [5, 7, 9]) {
  for (const steer of [0.25, 0.5, 0.75, 1]) {
    const c = carve(steer, speed);
    carves.push(`| ${speed} | ${steer} | ${fixed(c.rate, 2)} | ${fixed(c.rail, 0)} | ${c.attached ? 'on' : `fell at ${fixed(c.time)} s`} |`);
  }
}
const wobbles: string[] = [];
for (const speed of [5, 7, 9, 11]) {
  const w = wobble(speed);
  wobbles.push(`| ${speed} | ${w.mode ? fixed(w.mode.frequency, 2) : '—'} | ${w.mode ? fixed(w.mode.damping, 3) : '—'} | ${w.attached ? 'on' : 'fell'} |`);
}
const hull = hullRoll();

const report = `# Carve lab

Generated by \`npm run report:carve${process.argv.slice(2).length ? ` -- ${process.argv.slice(2).join(' ')}` : ''}\` on ${new Date().toISOString().slice(0, 10)} (${((Date.now() - started) / 1000).toFixed(0)} s). A standing rider on a 15° plane face (the turn redesign plan, Task 1).

## Hard turn

A full lean with a crouch (0.6) from straight down the face at 7 m/s.

| | Turned in 1.2 s | Peak yaw rate | Time to 60° | Rail (last 0.5 s) | Speed kept | Peak load | Rider |
|---|---:|---:|---:|---:|---:|---:|---|
| Measured | ${fixed(turn.yaw, 0)}° | ${fixed(turn.peak, 2)} rad/s | ${turn.timeTo60 !== undefined ? `${fixed(turn.timeTo60, 2)} s` : 'not reached'} | ${fixed(turn.rail, 0)}° | ${fixed(turn.kept, 2)} | ${fixed(turn.load, 2)} BW | ${turn.attached ? 'on' : `fell at ${fixed(turn.time)} s`} |
| Forsyth 2024 bottom turn | 99° in 0.96 s | 1.9 rad/s | | 42° | 0.92 (turn flow) | 1.7–2.3 g | |

## Carve envelope

Steer held for 4 s from straight down the face: the steady yaw rate and rail over the last second.

| Speed m/s | Steer | Yaw rate rad/s | Rail ° | Rider |
|---:|---:|---:|---:|---|
${carves.join('\n')}

## Roll–yaw wobble (P4e's Mode B)

Riding straight down the face, a roll kick of 0.5 rad/s; the yaw rate's ringing. A negative damping grows.

| Speed m/s | Frequency Hz | Damping ratio | Rider |
|---:|---:|---:|---|
${wobbles.join('\n')}

## The hull's roll

A prone rider (rigid with the board) at 7 m/s, the board kicked 10° onto its rail. Its roll inertia about the board's length: board ${fixed(hull.boardInertia, 3)} + body ${fixed(hull.bodyInertia, 2)} = ${fixed(hull.inertia, 2)} kg·m².

| Frequency Hz | Damping ratio | Roll stiffness N·m/rad | Roll damping N·m·s/rad | Rider |
|---:|---:|---:|---:|---|
| ${hull.mode ? fixed(hull.mode.frequency, 2) : '—'} | ${hull.mode ? fixed(hull.mode.damping, 3) : '—'} | ${fixed(hull.stiffness, 0)} | ${fixed(hull.damping, 1)} | ${hull.attached ? 'on' : 'fell'} |
`;
writeFileSync(output, report);
console.log(report);
