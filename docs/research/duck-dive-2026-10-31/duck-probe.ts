/**
 * The duck-dive measured on today's main (duck-dive-l3, 2026-10-31), before any change to its physics: the cases the
 * 2026-09-27/28 work left open (docs/research/duck-dive-report.md, the it.fails in src/physics/duckDive.test.ts and
 * duckDiveBore.test.ts), re-run headless.
 * - Flat water (`PlaneWater`, the rigid rider on the reference board): a 1.5 s and a 3 s press from rest and from
 *   paddling speed. The deck's and the nose's deepest, the pitch at 0.3 s and its extremes, the largest roll, when the
 *   rider came off, and whether the pair came back up.
 * - The test bore (`BoreWater`, 1.2 m broken wave, `RideSession`): staying on top against a dive started 9 m (early),
 *   2.5 m (on time) and 0.3 m (late) from the front, at 2.5 m and 1.2 m deep, each from five starts 0.3 m apart (the
 *   stroke's phase moves a single meeting by metres): the mean setback, and the riders still on.
 * The real surf zone is `scripts/duck-dive-report.ts` (the Canyon's whitewater, ghost paddlers).
 *   npx rolldown docs/research/duck-dive-2026-10-31/duck-probe.ts -o dist/scripts/duck-probe.mjs --format esm --platform node
 *   node dist/scripts/duck-probe.mjs
 */
import { Vector3 } from 'three';
import { AttachedRider } from '../../../src/physics/AttachedRider';
import { BoardBody } from '../../../src/physics/BoardBody';
import { buildBoardShape } from '../../../src/physics/boardShape';
import { PlaneWater } from '../../../src/physics/PlaneWater';
import { RideSession } from '../../../src/physics/RideSession';
import { deckHeight } from '../../../src/physics/riderPosture';
import { BoreWater } from '../../../src/physics/testing/BoreWater';

const STEP = 1 / 60;
const DEG = 180 / Math.PI;

function flat(hold: number, paddleFirst: number) {
  const shape = buildBoardShape();
  const water = new PlaneWater();
  const board = new BoardBody({ shape });
  board.place(new Vector3(0, shape.centerOfMass.y - 0.03, 0));
  const rider = new AttachedRider(board.shape);
  board.attach(rider);
  for (let i = 0; i < 120; i += 1) board.step(STEP, water);
  rider.paddle = paddleFirst > 0;
  for (let i = 0; i < paddleFirst / STEP; i += 1) board.step(STEP, water);
  rider.paddle = false;
  const speed = Math.hypot(board.velocity.x, board.velocity.z);
  const at = (z: number) => -board.toWorld({ x: 0, y: deckHeight(shape, z), z }, new Vector3()).y;
  const pitch = () => Math.asin(new Vector3(0, 0, 1).applyQuaternion(board.orientation).y) * DEG;
  const roll = () => Math.asin(new Vector3(1, 0, 0).applyQuaternion(board.orientation).y) * DEG;
  const rest = { pitch: pitch(), deck: at(0) };
  let deck = 0; let nose = -Infinity; let pitchAt03 = 0; let pitchMax = -Infinity; let pitchMin = Infinity; let rollMax = 0;
  let off = Number.NaN; let lifted = 0;
  const total = hold + 3;
  for (let i = 0; i < total / STEP; i += 1) {
    const t = i * STEP;
    rider.duckDive = t < hold ? 1 : 0;
    board.step(STEP, water);
    deck = Math.max(deck, at(0));
    nose = Math.max(nose, at(shape.length / 2 - 0.05));
    if (Math.abs(t - 0.3) < STEP / 2) pitchAt03 = pitch();
    pitchMax = Math.max(pitchMax, pitch()); pitchMin = Math.min(pitchMin, pitch());
    if (rider.attached) rollMax = Math.max(rollMax, Math.abs(roll()));
    if (!rider.inContact && rider.attached) lifted += STEP;
    if (!rider.attached && Number.isNaN(off)) off = t;
  }
  return {
    case: `${hold} s press, ${paddleFirst > 0 ? `from paddling (${speed.toFixed(2)} m/s)` : 'from rest'}`,
    deck: deck.toFixed(2), nose: nose.toFixed(2), restPitch: rest.pitch.toFixed(1), pitchAt03: pitchAt03.toFixed(1),
    pitch: `${pitchMin.toFixed(1)} to ${pitchMax.toFixed(1)}`, rollMax: rollMax.toFixed(0), off: Number.isNaN(off) ? 'stayed on' : `off at ${off.toFixed(2)} s`,
    lifted: lifted.toFixed(2), surfaced: at(0) < rest.deck + 0.05,
  };
}

type Input = { paddle: boolean; popUp: boolean; steer: number; duckDive: number };

function replay(inputs: readonly Input[], water: BoreWater, z: number): number {
  const session = new RideSession();
  session.reset(new Vector3(0, 0, z), Math.PI, water);
  for (const input of inputs) {
    session.step(STEP, water, input);
    water.advance(STEP);
  }
  return session.board.position.z;
}

function meetBore(diveAt: number | undefined, depth: number, z: number, hold: number) {
  const water = new BoreWater({ depth, height: 1.2, frontZ: -12 });
  const session = new RideSession();
  session.reset(new Vector3(0, 0, z), Math.PI, water);
  const inputs: Input[] = [];
  let started = -1;
  let passedAt = -1;
  let offAfter = Number.NaN;
  let deepest = 0;
  for (let i = 0; i < 900; i += 1) {
    const gap = session.board.position.z - water.frontZ();
    if (diveAt !== undefined && started < 0 && gap <= diveAt) started = i;
    if (passedAt < 0 && gap <= 0) passedAt = i;
    const diving = started >= 0 && (i - started) * STEP < hold;
    const input = { paddle: !diving, popUp: false, steer: 0, duckDive: diving ? 1 : 0 };
    inputs.push(input);
    session.step(STEP, water, input);
    water.advance(STEP);
    if (diving) deepest = Math.max(deepest, water.surfaceAt(session.board.position.x, session.board.position.z) - session.board.position.y);
    if (!session.rider.attached && Number.isNaN(offAfter) && passedAt >= 0) offAfter = (i - passedAt) * STEP;
    if (passedAt >= 0 && i - passedAt > 4 / STEP) break;
  }
  const still = replay(inputs, new BoreWater({ depth, height: 0, frontZ: -12 }), z);
  return { pushed: session.board.position.z - still, attached: session.rider.attached, offAfter, deepest };
}

function meetings(diveAt: number | undefined, depth: number, hold = 1.5) {
  const runs = [0, 0.3, 0.6, 0.9, 1.2].map((z) => meetBore(diveAt, depth, z, hold));
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  const on = runs.filter((run) => run.attached);
  const offs = runs.map((run) => run.offAfter).filter(Number.isFinite);
  return {
    pushed: mean(runs.map((run) => run.pushed)).toFixed(1), on: `${on.length}/5`, pushedOn: on.length ? mean(on.map((run) => run.pushed)).toFixed(1) : '—',
    offAfter: offs.length ? `${Math.min(...offs).toFixed(1)}–${Math.max(...offs).toFixed(1)} s` : '—',
    deepest: diveAt === undefined ? '—' : mean(runs.map((run) => run.deepest)).toFixed(2),
  };
}

console.log('## Flat water');
for (const [hold, paddle] of [[1.5, 0], [3, 0], [1.5, 4], [3, 4]] as const) console.log(JSON.stringify(flat(hold, paddle)));
console.log('## Test bore (1.2 m broken wave), five starts each');
for (const depth of [2.5, 1.2]) {
  for (const [name, diveAt, hold] of [['on top', undefined, 1.5], ['early (9 m)', 9, 1.5], ['on time (2.5 m)', 2.5, 1.5], ['late (0.3 m)', 0.3, 1.5], ['on time, 3 s hold', 2.5, 3]] as const) {
    console.log(JSON.stringify({ depth, case: name, ...meetings(diveAt, depth, hold) }));
  }
}
