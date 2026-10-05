// Prospective source only. The candidate dependency tree is intentionally absent until root materializes it.
import { Quaternion, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { AttachedRider } from '../source/src/physics/AttachedRider';
import { BoardBody } from '../source/src/physics/BoardBody';
import { PlaneWater } from '../source/src/physics/PlaneWater';
import { AttachedRider as OracleRider } from '/private/tmp/tube-pop-up-contact-operands-native-v8-20261005/source/src/physics/AttachedRider';
import { BoardBody as OracleBoard } from '/private/tmp/tube-pop-up-contact-operands-native-v8-20261005/source/src/physics/BoardBody';
import { PlaneWater as OracleWater } from '/private/tmp/tube-pop-up-contact-operands-native-v8-20261005/source/src/physics/PlaneWater';
import fields from '../observer-fields.json';

const DT = 1 / 60, YAW = 0.23362283028731087;
const added = new Set([...fields.newFields, fields.availabilityMarker]);
const calls = new WeakMap<object, unknown[]>();

// Capture the actual query/reaction order in external test storage. No own physics/water state is excluded for instrumentation.
class ObservedWater extends PlaneWater {
  override sampleAt(...args: Parameters<PlaneWater['sampleAt']>) {
    calls.get(this)!.push(['sampleAt-entry', args[0], args[1], args[2]]);
    const out = super.sampleAt(...args);
    calls.get(this)!.push(['sampleAt-return', ownWords(out)]);
    return out;
  }
  override surfaceAt(...args: Parameters<PlaneWater['surfaceAt']>) {
    calls.get(this)!.push(['surfaceAt', ...args]);
    return super.surfaceAt(...args);
  }
  override addReaction(...args: Parameters<PlaneWater['addReaction']>) {
    calls.get(this)!.push(['addReaction', ...args]);
    return super.addReaction(...args);
  }
}
class RecordedOracleWater extends OracleWater {
  override sampleAt(...args: Parameters<OracleWater['sampleAt']>) {
    calls.get(this)!.push(['sampleAt-entry', args[0], args[1], args[2]]);
    const out = super.sampleAt(...args);
    calls.get(this)!.push(['sampleAt-return', ownWords(out)]);
    return out;
  }
  override surfaceAt(...args: Parameters<OracleWater['surfaceAt']>) {
    calls.get(this)!.push(['surfaceAt', ...args]);
    return super.surfaceAt(...args);
  }
  override addReaction(...args: Parameters<OracleWater['addReaction']>) {
    calls.get(this)!.push(['addReaction', ...args]);
    return super.addReaction(...args);
  }
}

function pair(oracle: boolean, angle: number, speed: number) {
  const board = oracle ? new OracleBoard() : new BoardBody();
  const yaw = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), YAW);
  const q = yaw.multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), angle));
  board.place(new Vector3(0, board.shape.centerOfMass.y * Math.cos(angle), 0), q);
  const rider = oracle ? new OracleRider(board.shape, { phase: 'prone' }) : new AttachedRider(board.shape, { phase: 'prone' });
  if (board instanceof OracleBoard && rider instanceof OracleRider) board.attach(rider);
  else if (board instanceof BoardBody && rider instanceof AttachedRider) board.attach(rider);
  else throw new Error('fixture nominal class mismatch');
  const options = { slopeX: -Math.tan(angle) * Math.sin(YAW), slopeZ: -Math.tan(angle) * Math.cos(YAW) };
  const water = oracle ? new RecordedOracleWater(options) : new ObservedWater(options);
  calls.set(water, []);
  const direction = new Vector3(0, -Math.sin(angle), Math.cos(angle))
    .applyQuaternion(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), YAW));
  const tow = () => {
    if (angle === 0) {
      // Retained flat study: horizontal tow leaves the vertical velocity free.
      board.velocity.x = direction.x * speed; board.velocity.z = direction.z * speed;
      rider.velocity.x = direction.x * speed; rider.velocity.z = direction.z * speed;
    } else { board.velocity.copy(direction).multiplyScalar(speed); rider.velocity.copy(board.velocity); }
  };
  return { board, rider, water, tow };
}
type Pair = ReturnType<typeof pair>;

/** All own data, including private scratches, descriptors, typed bytes, sets/maps, cycles and alias identity. */
function ownWords(root: unknown, filterAdditions = false): unknown {
  const seen = new Map<object, number>();
  const symbols = new Map<symbol, number>();
  const symbol = (s: symbol) => {
    if (!symbols.has(s)) symbols.set(s, symbols.size);
    return { symbol: symbols.get(s), global: Symbol.keyFor(s), description: s.description };
  };
  const walk = (value: unknown): unknown => {
    if (typeof value === 'symbol') return symbol(value);
    if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return value;
    const object = value as object;
    if (seen.has(object)) return { ref: seen.get(object) };
    const id = seen.size; seen.set(object, id);
    // Only records containing the original38 operand words may omit the exact64 additions.
    // landingDemand itself, all original38 and every unrelated own field remain present.
    const observer = filterAdditions && fields.originalFields.every(key => Object.prototype.hasOwnProperty.call(object, key));
    const properties = Reflect.ownKeys(object)
      .filter(key => !(observer && typeof key === 'string' && added.has(key)))
      .filter(key => !(ArrayBuffer.isView(object) && typeof key === 'string' && /^(0|[1-9]\d*)$/.test(key)))
      .map(key => {
        const d = Object.getOwnPropertyDescriptor(object, key)!;
        return 'value' in d
          ? [typeof key === 'symbol' ? symbol(key) : key, d.enumerable, d.configurable, d.writable, walk(d.value)]
          : [typeof key === 'symbol' ? symbol(key) : key, d.enumerable, d.configurable, d.get?.toString(), d.set?.toString()];
      });
    if (ArrayBuffer.isView(object)) {
      return { id, kind: object.constructor.name, offset: object.byteOffset, length: object.byteLength,
        bytes: Array.from(new Uint8Array(object.buffer, object.byteOffset, object.byteLength)), buffer: walk(object.buffer), properties };
    }
    if (object instanceof ArrayBuffer) return { id, kind: 'ArrayBuffer', bytes: Array.from(new Uint8Array(object)), properties };
    if (object instanceof Set) return { id, kind: 'Set', entries: Array.from(object, walk), properties };
    if (object instanceof Map) return { id, kind: 'Map', entries: Array.from(object, ([k, v]) => [walk(k), walk(v)]), properties };
    if (typeof value === 'function') return { id, kind: 'function', source: Function.prototype.toString.call(value), properties };
    return { id, kind: Array.isArray(value) ? 'Array' : 'Object', properties };
  };
  return walk(root);
}
function state(p: Pair, filterAdditions = true) {
  // Keep board.rider too: the graph serializer handles the real shared reference rather than dropping it.
  return ownWords({ board: p.board, rider: p.rider, water: p.water, diagnostics: p.rider.readContactDiagnostics() }, filterAdditions);
}

type VectorWords = { x: number; y: number; z: number };
type LiveOperands = {
  boardVelocity: VectorWords; boardSpin: VectorWords; external: VectorWords; arm: VectorWords; carried: VectorWords;
  landingDemand: Record<string, number>;
};
type Hook = { pair: Pair; candidate: boolean; events: unknown[] };
const hooks = new WeakMap<object, Hook>();
type HookablePrototype = {
  prepare(h: number, board: unknown, water: unknown): void;
  coupleStanding(system: Float64Array, rhs: Float64Array, h: number): void;
  settleStanding(x: Float64Array, h: number, board: unknown): boolean;
  finish(h: number, board: unknown): void;
};
function checkCopies(rider: object, expected: Record<string, number>, marker: number) {
  const actual = (rider as LiveOperands).landingDemand;
  for (const [name, value] of Object.entries(expected)) expect(actual[name], name).toBe(value);
  expect(actual[fields.availabilityMarker]).toBe(marker);
}
function capturePre(rider: object, system: Float64Array, rhs: Float64Array) {
  const out: Record<string, number> = {};
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) out[`boardPreMatrix${i}${j}`] = system[i * 8 + j];
  for (let i = 0; i < 6; i++) out[`boardPreRhs${i}`] = rhs[i];
  const r = rider as LiveOperands;
  for (const [prefix, v] of [
    ['preparedBoardVelocity', r.boardVelocity], ['preparedBoardSpin', r.boardSpin], ['riderExternal', r.external],
    ['forceArm', r.arm], ['carriedArm', r.carried],
  ] as const) for (const axis of ['x', 'y', 'z'] as const) out[prefix + axis.toUpperCase()] = v[axis];
  return out; // Every value is a copied primitive; no system/rhs/vector reference escapes.
}
function captureTrial(x: Float64Array) {
  const out: Record<string, number> = {};
  for (const [prefix, offset] of [['trialBoardDeltaVelocity', 0], ['trialBoardDeltaSpin', 3]] as const) {
    for (let i = 0; i < 3; i++) out[prefix + 'XYZ'[i]] = x[offset + i];
  }
  return out; // Coupled trial, not the fallback or realized board delta.
}
function installHooks(prototype: object) {
  const p = prototype as HookablePrototype;
  const { prepare, coupleStanding, settleStanding, finish } = p;
  // Prototype wrappers add no own instrumentation property to either physics instance.
  p.prepare = function (h, board, water) {
    prepare.call(this, h, board, water);
    const hook = hooks.get(this)!;
    if (hook.candidate) expect((this as unknown as LiveOperands).landingDemand[fields.availabilityMarker]).toBe(0);
  };
  p.coupleStanding = function (system, rhs, h) {
    const hook = hooks.get(this)!;
    const copied = capturePre(this, system, rhs);
    hook.events.push(['coupleStanding-entry', h, copied]);
    coupleStanding.call(this, system, rhs, h);
    if (hook.candidate) checkCopies(this, copied, 0);
  };
  p.settleStanding = function (x, h, board) {
    const hook = hooks.get(this)!;
    const copied = captureTrial(x);
    hook.events.push(['settleStanding-entry', h, copied]);
    const feasible = settleStanding.call(this, x, h, board);
    if (hook.candidate) checkCopies(this, copied, 1);
    hook.events.push(['settleStanding-return', feasible]);
    return feasible;
  };
  p.finish = function (h, board) {
    finish.call(this, h, board);
    const hook = hooks.get(this)!;
    hook.events.push(['finish-substep-exit', h, state(hook.pair), calls.get(hook.pair.water)!.length]);
  };
  return () => { p.prepare = prepare; p.coupleStanding = coupleStanding; p.settleStanding = settleStanding; p.finish = finish; };
}

function detachedDiagnostics(p: Pair) {
  const before = state(p, false);
  const diagnosticBefore = ownWords(p.rider.readContactDiagnostics());
  const d = p.rider.readContactDiagnostics();
  const samples = [d.last, d.firstLimited, d.firstNonContact, d.loss?.sample];
  for (const sample of samples) if (sample) {
    for (const [key, value] of Object.entries(sample)) if (typeof value === 'number') {
      (sample as unknown as Record<string, unknown>)[key] = -123456;
    }
  }
  d.step = -1;
  expect(ownWords(p.rider.readContactDiagnostics())).toStrictEqual(diagnosticBefore);
  expect(state(p, false)).toStrictEqual(before);
}

for (const fixture of [
  { name: 'existing flat towed 6 m/s pop-up study', angle: 0, speed: 6, continueTow: true },
  { name: 'fixed 15-degree face released from 9.2 m/s tow at pop-up', angle: Math.PI / 12, speed: 9.2, continueTow: false },
]) it(fixture.name + ': exact original state, query/reaction order and independently copied trial stages', () => {
  const restoreOracle = installHooks(OracleRider.prototype), restoreCandidate = installHooks(AttachedRider.prototype);
  try {
    const old = pair(true, fixture.angle, fixture.speed), candidate = pair(false, fixture.angle, fixture.speed);
    const oldHook: Hook = { pair: old, candidate: false, events: [] };
    const candidateHook: Hook = { pair: candidate, candidate: true, events: [] };
    hooks.set(old.rider, oldHook); hooks.set(candidate.rider, candidateHook);
    let capturedStandingTrials = 0;
    for (let step = 1; step <= 276; step++) {
      oldHook.events.length = 0; candidateHook.events.length = 0;
      calls.get(old.water)!.length = 0; calls.get(candidate.water)!.length = 0;
      for (const p of [old, candidate]) {
        if (step <= 180 || fixture.continueTow) p.tow();
        if (step === 181) expect(p.rider.popUp()).toBe(true);
        p.board.step(DT, p.water);
      }
      expect(state(candidate), `all original own words at step ${step}`).toStrictEqual(state(old));
      expect(candidateHook.events, `stage scalars and complete finish-substep words at step ${step}`).toStrictEqual(oldHook.events);
      expect(calls.get(candidate.water), `ordered water query/return/reaction calls at step ${step}`).toStrictEqual(calls.get(old.water));
      capturedStandingTrials += candidateHook.events.filter(event => (event as unknown[])[0] === 'settleStanding-entry').length;
      // Test detachedness for old38 and new64 in every available returned sample/latch.
      detachedDiagnostics(candidate);
    }
    expect(capturedStandingTrials).toBeGreaterThan(0);
  } finally { restoreCandidate(); restoreOracle(); }
}, 30000);
