/**
 * Carve lab (turn redesign, Task 1): standard manoeuvres on a 15° plane face,
 * measured against Forsyth et al. 2024. It reports the hard turn, the carve
 * envelope, the roll–yaw wobble after a roll kick (P4e's Mode B), and the
 * hull's own roll stiffness and damping from a prone rider's board. Task 3a
 * adds the plant the balance is designed on: a board towed along its heading
 * on flat water under a held rider (`HeldRider`), its roll and turn under a
 * couple, and where it settles under a banked load. Writes
 * docs/research/carve-lab.md.
 *
 *   npm run report:carve
 *   npm run report:carve -- --out /tmp/carve.md
 */
import { writeFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { dampedMode, turnMeasures } from '../src/dev/carveMetrics';
import { HeldRider, towAlongHeading } from '../src/dev/heldRider';
import { AttachedRider } from '../src/physics/AttachedRider';
import { BoardBody } from '../src/physics/BoardBody';
import { PlaneWater } from '../src/physics/PlaneWater';
import { WATER } from '../src/physics/hullForces';

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

/** A full lean with a crouch from straight down the face at 7 m/s, and Compress over it if asked (the stances spec). */
function hardTurn(compress = 0) {
  const { board, rider } = onFace(0, 7, 'standing');
  for (let i = 0; i < 18; i += 1) board.step(STEP, water);
  const speed = board.velocity.length();
  rider.steer = 1;
  rider.crouch = 0.6;
  rider.compress = compress;
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

const flat = new PlaneWater();
const mean = (values: readonly number[]) => values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);

/** A held rider's board on flat water, towed along its heading at `speed` and settled for 0.5 s. */
function towed(speed: number) {
  const board = new BoardBody();
  board.place(new Vector3(0, board.shape.centerOfMass.y, 0), undefined, new Vector3(0, 0, speed));
  const rider = new HeldRider(board.shape);
  board.attach(rider);
  const step = () => {
    towAlongHeading(board, rider, speed);
    board.step(STEP, flat);
  };
  for (let i = 0; i < 30; i += 1) step();
  return { board, rider, step };
}

/**
 * A couple on the held rider's board for 1.5 s: the steady rail (last 0.5 s) and
 * the couple per rad of it, the time to 63 % of it, the steady yaw rate, the
 * pull per rail G = (v ω / g) / tan φ, and how long the yaw rate lags the rail.
 */
function underCouple(speed: number, couple: number) {
  const { board, rider, step } = towed(speed);
  rider.rollCouple = couple;
  const rails: number[] = [];
  const yaws: number[] = [];
  for (let i = 0; i < 90 && rider.attached; i += 1) {
    step();
    rails.push(rail(board));
    yaws.push(board.angularVelocity.y);
  }
  const steadyRail = mean(rails.slice(-30));
  const steadyYaw = mean(yaws.slice(-30));
  const rise = rails.findIndex((r) => r >= 0.63 * steadyRail) * STEP;
  const yawRise = yaws.findIndex((w) => w >= 0.63 * steadyYaw) * STEP;
  const pull = (speed * steadyYaw) / WATER.gravity;
  return { rail: steadyRail, stiffness: couple / steadyRail, rise, yaw: steadyYaw, gain: pull / Math.tan(steadyRail), lag: yawRise - rise, attached: rider.attached };
}

/**
 * The body banked by steering for 0.7 s, then held with no couple for 0.7 s: the
 * bank, where the board's rail settles (as a share of the bank: 1 if the hull
 * rights the board about the rider's load line, 0 about the vertical), the
 * pull per rail, and the speed lost per second once the tow lets go.
 */
function loadLine(speed: number, steer: number) {
  const { board, rider, step } = towed(speed);
  rider.holding = false;
  rider.steer = steer;
  for (let i = 0; i < 42 && rider.attached; i += 1) step();
  rider.holding = true;
  rider.steer = 0;
  const rails: number[] = [];
  const yaws: number[] = [];
  for (let i = 0; i < 42 && rider.attached; i += 1) {
    step();
    rails.push(rail(board));
    yaws.push(board.angularVelocity.y);
  }
  const bank = rider.bank.angle;
  const steadyRail = mean(rails.slice(-18));
  const pull = (speed * mean(yaws.slice(-18))) / WATER.gravity;
  const before = board.velocity.length();
  for (let i = 0; i < 30 && rider.attached; i += 1) board.step(STEP, flat);
  return { bank, rail: steadyRail, share: steadyRail / bank, gain: pull / Math.tan(steadyRail), drag: (before - board.velocity.length()) / 0.5, attached: rider.attached };
}


/**
 * A rail change (the top-turn plan): a live rider at `speed`, from flat (steer 0) or
 * from a carve (full steer the other way for 0.6 s), then full steer the new way
 * for 1.2 s, on flat water or climbing the face 150° from its fall line. How far
 * the board first yaws the old way (degrees), when the yaw rate turns the new way,
 * the turn the new way in the 1.2 s, the speed kept, and whether the rider stays on.
 */
function railChange(speed: number, from: 'flat' | 'carve', surface: 'flat' | 'climb') {
  const climbing = surface === 'climb';
  const { board, rider } = climbing ? onFace(150, speed, 'standing') : (() => {
    const b = new BoardBody();
    b.place(new Vector3(0, b.shape.centerOfMass.y, 0), undefined, new Vector3(0, 0, speed));
    const r = new AttachedRider(b.shape, { phase: 'standing' });
    b.attach(r);
    return { board: b, rider: r };
  })();
  const sea = climbing ? water : flat;
  for (let i = 0; i < 12; i += 1) board.step(STEP, sea);
  if (from === 'carve') {
    rider.steer = -1;
    for (let i = 0; i < 36 && rider.attached; i += 1) board.step(STEP, sea);
  }
  const entry = board.velocity.length();
  rider.steer = 1;
  let last = heading(board);
  let turned = 0;
  let wrong = 0;
  let reversal: number | undefined;
  let time = 0;
  for (let i = 0; i < 72 && rider.attached; i += 1) {
    board.step(STEP, sea);
    time += STEP;
    const now = heading(board);
    turned += Math.atan2(Math.sin(now - last), Math.cos(now - last));
    last = now;
    wrong = Math.min(wrong, turned);
    if (reversal === undefined && board.angularVelocity.y > 0.05) reversal = time;
  }
  return { wrong: -degrees(wrong), reversal, turned: degrees(turned), kept: board.velocity.length() / entry, attached: rider.attached, time };
}

/**
 * A top turn or a cutback (the top-turn plan): a live rider on the face `across`
 * degrees from its fall line at `speed`, then `steer` held with the weight at
 * `trim` for `seconds`. The turn at 1 s and at the end, the peak yaw rate while
 * the board still planes (above 3 m/s), the speed at 1 s, and whether and when
 * the rider falls.
 */
function topTurn(across: number, speed: number, steer: number, trim: number, seconds: number) {
  const { board, rider } = onFace(across, speed, 'standing');
  for (let i = 0; i < 12; i += 1) board.step(STEP, water);
  rider.steer = steer;
  rider.trim = trim;
  let last = heading(board);
  let turned = 0;
  let second = 0;
  let speedAtSecond = 0;
  let peak = 0;
  let time = 0;
  for (let i = 0; i < Math.round(seconds / STEP) && rider.attached; i += 1) {
    board.step(STEP, water);
    time += STEP;
    const now = heading(board);
    turned += Math.atan2(Math.sin(now - last), Math.cos(now - last));
    last = now;
    if (board.velocity.length() > 3) peak = Math.max(peak, Math.abs(board.angularVelocity.y));
    if (i === Math.round(1 / STEP) - 1) {
      second = turned;
      speedAtSecond = board.velocity.length();
    }
  }
  return { second: degrees(Math.abs(second)), turned: degrees(Math.abs(turned)), peak, speedAtSecond, attached: rider.attached, time };
}

/** A full-steer turn on flat water at 8 m/s for 1.2 s at a stance: the turn, the speed kept, and the board's mean pitch, sink and front-foot share. */
function depthTurn(crouch: number, compress: number, trim: number) {
  const board = new BoardBody();
  board.place(new Vector3(0, board.shape.centerOfMass.y, 0), undefined, new Vector3(0, 0, 8));
  const rider = new AttachedRider(board.shape, { phase: 'standing' });
  board.attach(rider);
  rider.crouch = crouch;
  rider.trim = trim;
  for (let i = 0; i < 30; i += 1) board.step(STEP, flat);
  const entry = board.velocity.length();
  rider.steer = 1;
  rider.compress = compress;
  const headings: number[] = [heading(board)];
  let pitch = 0;
  let sink = 0;
  let front = 0;
  let n = 0;
  for (let i = 0; i < 72 && rider.attached; i += 1) {
    board.step(STEP, flat);
    headings.push(heading(board));
    const nose = new Vector3(0, 0, 1).applyQuaternion(board.orientation);
    pitch += Math.asin(Math.max(-1, Math.min(1, nose.y)));
    sink += -board.lowestPoint();
    front += rider.contact.frontShare;
    n += 1;
  }
  const measures = turnMeasures(headings, STEP, 60);
  return { yaw: degrees(measures.yaw), kept: board.velocity.length() / entry, pitch: degrees(pitch / n), sink: sink / n, front: front / n, attached: rider.attached };
}

const started = Date.now();
const turn = hardTurn();
const changes: string[] = [];
for (const surface of ['flat', 'climb'] as const) {
  for (const from of ['flat', 'carve'] as const) {
    for (const speed of [6, 8, 10]) {
      const c = railChange(speed, from, surface);
      changes.push(`| ${surface === 'flat' ? 'flat water' : 'climbing 150°'} | ${from === 'flat' ? 'riding flat' : 'carving the other way'} | ${speed} | ${fixed(c.wrong, 0)}° | ${c.reversal !== undefined ? `${fixed(c.reversal, 2)} s` : 'never'} | ${fixed(c.turned, 0)}° | ${fixed(c.kept, 2)} | ${c.attached ? 'on' : `fell at ${fixed(c.time, 2)} s`} |`);
    }
  }
}
const tops: string[] = [];
for (const [label, across, steer, seconds] of [['top turn, climbing 150°', 150, 1, 1.5], ['cutback, across 80°', 80, -1, 2]] as const) {
  for (const speed of across === 150 ? [6.7, 8] : [7, 9]) {
    for (const [weight, trim] of [['level', 0], ['back 0.5', -0.5], ['back 1', -1]] as const) {
      const t = topTurn(across, speed, steer, trim, seconds);
      tops.push(`| ${label} | ${speed} | ${weight} | ${fixed(t.second, 0)}° | ${fixed(t.turned, 0)}° in ${seconds} s | ${fixed(t.peak, 2)} rad/s | ${fixed(t.speedAtSecond, 1)} | ${t.attached ? 'on' : `fell at ${fixed(t.time, 2)} s`} |`);
    }
  }
}
const depths: string[] = [];
for (const [label, crouch, compress, trim] of [
  ['standing', 0, 0, 0], ['crouch 0.6', 0.6, 0, 0], ['crouch 1', 1, 0, 0], ['crouch 1, weight forward 0.5', 1, 0, 0.5], ['crouch 0.6 + Compress', 0.6, 1, 0], ['weight forward 0.5', 0, 0, 0.5],
] as const) {
  const d = depthTurn(crouch, compress, trim);
  depths.push(`| ${label} | ${fixed(d.yaw, 0)}° | ${fixed(d.kept, 2)} | ${fixed(d.pitch, 1)}° | ${fixed(d.sink, 3)} | ${fixed(d.front, 2)} | ${d.attached ? 'on' : 'fell'} |`);
}
const compressed = hardTurn(1);
const turnRow = (label: string, t: typeof turn) =>
  `| ${label} | ${fixed(t.yaw, 0)}° | ${fixed(t.peak, 2)} rad/s | ${t.timeTo60 !== undefined ? `${fixed(t.timeTo60, 2)} s` : 'not reached'} | ${fixed(t.rail, 0)}° | ${fixed(t.kept, 2)} | ${fixed(t.load, 2)} BW | ${t.attached ? 'on' : `fell at ${fixed(t.time)} s`} |`;
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
const plant: string[] = [];
const lines: string[] = [];
for (const speed of [3, 5, 7, 9, 11]) {
  for (const couple of [20, 40]) {
    const c = underCouple(speed, couple);
    plant.push(`| ${speed} | ${couple} | ${fixed(degrees(c.rail), 1)} | ${fixed(c.stiffness, 0)} | ${fixed(c.rise, 2)} | ${fixed(c.yaw, 2)} | ${fixed(c.gain, 2)} | ${fixed(c.lag, 2)} | ${c.attached ? 'on' : 'off'} |`);
  }
  for (const steer of [0.3, 0.6]) {
    const l = loadLine(speed, steer);
    lines.push(`| ${speed} | ${steer} | ${fixed(degrees(l.bank), 1)} | ${fixed(degrees(l.rail), 1)} | ${fixed(l.share, 2)} | ${fixed(l.gain, 2)} | ${fixed(l.drag, 2)} | ${l.attached ? 'on' : 'off'} |`);
  }
}

const report = `# Carve lab

Generated by \`npm run report:carve${process.argv.slice(2).length ? ` -- ${process.argv.slice(2).join(' ')}` : ''}\` on ${new Date().toISOString().slice(0, 10)} (${((Date.now() - started) / 1000).toFixed(0)} s). A standing rider on a 15° plane face (the turn redesign plan, Task 1).

## Hard turn

A full lean with a crouch (0.6) from straight down the face at 7 m/s, and the same with Compress over the crouch (the stances spec).

| | Turned in 1.2 s | Peak yaw rate | Time to 60° | Rail (last 0.5 s) | Speed kept | Peak load | Rider |
|---|---:|---:|---:|---:|---:|---:|---|
${turnRow('Measured', turn)}
${turnRow('Compress over the crouch', compressed)}
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

## The plant (Task 3a)

A standing rider held on the board (\`HeldRider\`: carried at its bank whatever its feet could hold), the board towed along its heading on flat water at a steady speed.

**Under a couple.** The body upright; a couple about the board's roll axis (in place of the ankle's) for 1.5 s. The rail and yaw rate are the last 0.5 s; the stiffness is the couple per rad of rail; G is the pull per rail, (v ω / g) / tan φ; the lag is how much later the yaw rate reaches 63 % than the rail.

| Speed m/s | Couple N·m | Rail ° | Stiffness N·m/rad | Rail's 63 % s | Yaw rate rad/s | G | Yaw lag s | Rider |
|---:|---:|---:|---:|---:|---:|---:|---:|---|
${plant.join('\n')}

**Under a banked load.** The rider banks by steering for 0.7 s, then is held there with no couple for 0.7 s. The share is the board's rail over the body's bank: 1 if the hull rights the board about the rider's load line, 0 about the vertical. The drag is the speed lost per second once the tow lets go.

| Speed m/s | Steer | Bank ° | Rail ° | Share | G | Speed lost m/s² | Rider |
|---:|---:|---:|---:|---:|---:|---:|---|
${lines.join('\n')}

## Rail changes (the top-turn plan)

A live rider, full steer the new way for 1.2 s: from riding flat, or from 0.6 s of full steer the other way; on flat water, or climbing the 15° face 150° from its fall line. The wrong way is how far the board first yaws the old way; the reversal is when its yaw rate turns the new way.

| Water | From | Speed m/s | Wrong way | Reversal | Turned the new way | Speed kept | Rider |
|---|---|---:|---:|---:|---:|---:|---|
${changes.join('\n')}

## Top turns and cutbacks (the top-turn plan)

A live rider on the 15° face, full steer back down from a climb 150° from the fall line, or back up and around from across it, with the weight level or back (W/S). The turn at 1 s and at the end, the peak yaw rate while the board planes (above 3 m/s; stalling, it spins), and the speed at 1 s. The face gives nothing back: every carve up it slows toward the end of planing (3 m/s).

| Turn | Speed m/s | Weight | At 1 s | Turned | Peak yaw | Speed at 1 s | Rider |
|---|---:|---|---:|---:|---:|---:|---|
| Forsyth et al. 2024, cutbacks and top turns | 6.7 | — | 152° in 0.96 s | — | 3.0 rad/s | — | — |
${tops.join('\n')}

## Depth and speed (the top-turn plan: why Compress bleeds speed)

Full steer on flat water at 8 m/s for 1.2 s at each stance: the turn, the speed kept, and the board's mean pitch (nose up positive), how deep its lowest point sinks, m, and the front foot's share of the load.

| Stance | Turned | Speed kept | Pitch | Sink m | Front share | Rider |
|---|---:|---:|---:|---:|---:|---|
${depths.join('\n')}
`;
writeFileSync(output, report);
console.log(report);
