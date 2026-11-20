/**
 * The two-body duck-dive measured (duck-two-body, 2026-10-31), headless, against `?duckBody=old` and the duck-dive-l3
 * README's numbers: whole `RideSession`s, so the dive is the game's.
 * - Flat water: a 1.5 s and a 3 s press from rest and from paddling speed, the reference board and a 50 L one: the deck's
 *   and nose's deepest, the pitch at 0.3 s (nose-down negative), the largest roll, whether the rider is still with the
 *   board (on it, or holding it), and back lying on it.
 * - The test bore (`BoreWater`, a 1.2 m broken wave): on top against a dive started 9 m, 2.5 m and 0.3 m from the front,
 *   and a 3 s hold, at 2.5 m and 1.2 m deep, five starts each: the mean setback and the riders still on.
 *   npx rolldown docs/research/duck-two-body-2026-10-31/duck-probe.ts -o dist/scripts/duck-probe2.mjs --format esm --platform node
 *   node dist/scripts/duck-probe2.mjs [--old]
 */
import { Vector3 } from 'three';
import { REFERENCE_BOARD } from '../../../src/physics/boardReference';
import { PlaneWater } from '../../../src/physics/PlaneWater';
import { RideSession, type RideSessionOptions } from '../../../src/physics/RideSession';
import { deckHeight } from '../../../src/physics/riderPosture';
import { BoreWater } from '../../../src/physics/testing/BoreWater';

const STEP = 1 / 60;
const DEG = 180 / Math.PI;
const options: RideSessionOptions = process.argv.includes('--old') ? { duckBody: 'old' } : {};
const idle = { paddle: false, popUp: false, steer: 0 };

function flat(hold: number, paddleFirst: number) {
  const water = new PlaneWater({ depth: 5 });
  const session = new RideSession(options);
  session.reset(new Vector3(), 0, water);
  for (let i = 0; i < 120; i += 1) session.step(STEP, water, idle);
  for (let i = 0; i < paddleFirst / STEP; i += 1) session.step(STEP, water, { ...idle, paddle: true });
  const { board } = session;
  const speed = Math.hypot(board.velocity.x, board.velocity.z);
  const at = (z: number) => -board.toWorld({ x: 0, y: deckHeight(board.shape, z), z }, new Vector3()).y;
  const pitch = () => Math.asin(new Vector3(0, 0, 1).applyQuaternion(board.orientation).y) * DEG;
  const roll = () => Math.asin(new Vector3(1, 0, 0).applyQuaternion(board.orientation).y) * DEG;
  const rest = pitch();
  let deck = 0; let nose = -Infinity; let pitchAt03 = 0; let rollMax = 0; let lost = Number.NaN; let back = Number.NaN;
  for (let i = 0; i < (hold + 4) / STEP; i += 1) {
    const t = i * STEP;
    session.step(STEP, water, { ...idle, duckDive: t < hold ? 1 : 0 });
    deck = Math.max(deck, at(0));
    nose = Math.max(nose, at(board.shape.length / 2 - 0.05));
    if (Math.abs(t - 0.3) < STEP / 2) pitchAt03 = pitch();
    rollMax = Math.max(rollMax, Math.abs(roll()));
    if (!session.rider.attached && session.recovery.state === 'free' && Number.isNaN(lost)) lost = t;
    if (t > hold && Number.isNaN(back) && session.rider.attached && !session.ducking && !session.rider.climbingOn) back = t;
  }
  return {
    case: `${hold} s press, ${paddleFirst > 0 ? `from paddling (${speed.toFixed(2)} m/s)` : 'from rest'}`,
    deck: deck.toFixed(2), nose: nose.toFixed(2), pitch: `${rest.toFixed(1)} → ${pitchAt03.toFixed(1)} at 0.3 s`, rollMax: rollMax.toFixed(0),
    board: Number.isNaN(lost) ? 'kept' : `lost at ${lost.toFixed(2)} s`, back: Number.isNaN(back) ? 'not back on' : `back on at ${back.toFixed(2)} s`,
  };
}

type Input = { paddle: boolean; popUp: boolean; steer: number; duckDive: number };
function replay(inputs: readonly Input[], water: BoreWater, z: number): number {
  const session = new RideSession(options);
  session.reset(new Vector3(0, 0, z), Math.PI, water);
  for (const input of inputs) { session.step(STEP, water, input); water.advance(STEP); }
  return session.board.position.z;
}
function meetBore(diveAt: number | undefined, depth: number, z: number, hold: number) {
  const water = new BoreWater({ depth, height: 1.2, frontZ: -12 });
  const session = new RideSession(options);
  session.reset(new Vector3(0, 0, z), Math.PI, water);
  const inputs: Input[] = [];
  let started = -1; let passedAt = -1;
  for (let i = 0; i < 900; i += 1) {
    const gap = session.board.position.z - water.frontZ();
    if (diveAt !== undefined && started < 0 && gap <= diveAt) started = i;
    if (passedAt < 0 && gap <= 0) passedAt = i;
    const diving = started >= 0 && (i - started) * STEP < hold;
    const input = { paddle: !diving && !session.ducking, popUp: false, steer: 0, duckDive: diving ? 1 : 0 };
    inputs.push(input);
    session.step(STEP, water, input);
    water.advance(STEP);
    if (passedAt >= 0 && i - passedAt > 4 / STEP) break;
  }
  const still = replay(inputs, new BoreWater({ depth, height: 0, frontZ: -12 }), z);
  // With the board: on it, or ducking with it.
  return { pushed: session.board.position.z - still, on: session.rider.attached };
}
function meetings(diveAt: number | undefined, depth: number, hold = 1.5) {
  const runs = [0, 0.3, 0.6, 0.9, 1.2].map((z) => meetBore(diveAt, depth, z, hold));
  const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / Math.max(1, v.length);
  const on = runs.filter((r) => r.on);
  return { pushed: mean(runs.map((r) => r.pushed)).toFixed(1), on: `${on.length}/5`, pushedOn: on.length ? mean(on.map((r) => r.pushed)).toFixed(1) : '—' };
}

console.log(`## Flat water ${options.duckBody ? '(old)' : '(two-body)'}`);
for (const [hold, paddle] of [[1.5, 0], [3, 0], [1.5, 4], [3, 4]] as const) console.log(JSON.stringify(flat(hold, paddle)));
console.log(`## Test bore (1.2 m broken wave), five starts each`);
for (const depth of [2.5, 1.2]) {
  for (const [name, diveAt, hold] of [['on top', undefined, 1.5], ['early (9 m)', 9, 1.5], ['on time (2.5 m)', 2.5, 1.5], ['late (0.3 m)', 0.3, 1.5], ['on time, 3 s hold', 2.5, 3]] as const) {
    console.log(JSON.stringify({ depth, case: name, ...meetings(diveAt, depth, hold) }));
  }
}
void REFERENCE_BOARD;
