import { Buffer } from 'node:buffer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SurfZoneWorkerCore, type SurfZoneReply, type SurfZoneRequest } from './SurfZoneWorkerCore';
import { WorkerSurfZone, type WorkerPort } from './WorkerSurfZone';
import { SurfZoneSimulation, type PreparedWaterStep, type SurfZoneConfig } from '../wave/SurfZoneSimulation';
import { SURF_ZONE_STEP, type RideRequest, type SurfZoneRunner, type SurfZoneBuffers } from '../wave/SurfZoneRunner';
import type { BoussinesqSolver } from '../wave/BoussinesqSolver';
import { DEVICE_READBACK } from '../wave/gpu/GpuBoussinesq';
import { FIELD, STEP_KERNELS } from '../wave/gpu/boussinesqWgsl';
import { encodeCase } from '../wave/barrel/profileFormat';
import { tubeCase } from '../wave/barrel/toyCase';
import { decompress, encodeSurfZoneState } from '../wave/surfZoneState';

const config: SurfZoneConfig = {
  spot: 'padang', stage: 2, seed: 3, significantHeight: 1.4, peakPeriod: 16, directionDegrees: 0,
  spreading: 24, tide: 0.5, windSpeed: 0, componentCount: 2, alongShore: 12, dx: 2,
  fineSpacing: 2, coarseSpacing: 8, spinUpPeriods: 0,
};
const options = { rider: true, renderSpacing: 2, barrelCases: [encodeCase(tubeCase(0.3))] };
type Solver = Pick<BoussinesqSolver, 'h' | 'qx' | 'qz' | 'bed' | 'time' | 'surfaceRiseRate' | 'breakingStrength' | 'breakingAge'
  | 'viscosity' | 'predictor' | 'plungeHold' | 'plungeVersion' | 'deviceLayout' | 'adoptDeviceStep' | 'step'>;
function field(s: Solver, index: number): Float64Array {
  switch (index) {
    case FIELD.H: return s.h; case FIELD.QX: return s.qx; case FIELD.QZ: return s.qz;
    case FIELD.RATEH: return s.surfaceRiseRate; case FIELD.STRENGTH: return s.breakingStrength;
    case FIELD.AGE: return s.breakingAge; case FIELD.NU: return s.viscosity;
    case FIELD.PREDX: return s.predictor!.x; case FIELD.PREDZ: return s.predictor!.z;
    default: throw new Error(`Uncovered field ${index}`);
  }
}
function exact(actual: ArrayLike<number>, expected: ArrayLike<number>, label: string) {
  if (!ArrayBuffer.isView(actual) || !ArrayBuffer.isView(expected)) throw new Error(`${label}: bulk comparison requires actual typed array views`);
  const a = Buffer.from(actual.buffer, actual.byteOffset, actual.byteLength), b = Buffer.from(expected.buffer, expected.byteOffset, expected.byteLength);
  if (actual.constructor === expected.constructor && a.length === b.length && a.equals(b)) return;
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) if (a[i] !== b[i]) throw new Error(`${label}: byte ${i} differs ${a[i]} / ${b[i]}`);
  throw new Error(`${label}: typed array kind/byte range differs ${actual.constructor.name}:${a.length} / ${expected.constructor.name}:${b.length}`);
}
function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => { release = resolve; });
  return { promise, release };
}

/**
 * CPU transport stand-in: generic and solo paths each use a separate real solver as device memory.
 * It transports all three F32 uploads and nine F32 readbacks, and uses actual adoptDeviceStep/step methods.
 * This verifies ownership/control sequencing; native numerical parity is covered by the archived actual-GPU replay.
 */
class TransportDevice {
  private version = -1;
  private plunge = -1;
  held = false;
  private carriedPacket?: Float32Array[];
  normalSteps = 0; prepares = 0; commits = 0; discards = 0; rebases = 0; disposed = false;
  failPrepare = false; failStep = false;
  wait?: Promise<void>;
  readonly preparedInputs: Float32Array[][] = [];
  readonly packets: Float32Array[][] = [];
  kernels = [...STEP_KERNELS];
  readback = true;
  constructor(readonly solver: Solver, readonly memory: Solver, readonly events: string[]) {}
  private eligible() { return !this.disposed && this.readback && this.kernels.length === STEP_KERNELS.length && this.kernels.every((k, i) => k === STEP_KERNELS[i]); }
  private run(dt: number) {
    const { solver: s, memory: m } = this;
    this.carriedPacket?.forEach((values, k) => exact(field(m, DEVICE_READBACK[k]), Float64Array.from(values), `before continuation F32 carry ${DEVICE_READBACK[k]}`));
    if (s.deviceLayout().version !== this.version) {
      m.bed.set(s.bed);
      for (const index of [FIELD.STRENGTH, FIELD.AGE, FIELD.NU, FIELD.PREDX, FIELD.PREDZ]) field(m, index).set(Float32Array.from(field(s, index)));
      m.plungeHold.set(Float32Array.from(s.plungeHold));
      m.adoptDeviceStep(0); // Actual method restores the CPU stand-in's viscosity bound without time/plunge aging.
      this.version = s.deviceLayout().version; this.rebases += 1;
    } else if (s.plungeVersion !== this.plunge) m.plungeHold.set(Float32Array.from(s.plungeHold));
    this.plunge = s.plungeVersion;
    for (const index of [FIELD.H, FIELD.QX, FIELD.QZ]) field(m, index).set(Float32Array.from(field(s, index)));
    m.time = s.time;
    m.step(dt);
    const packet = DEVICE_READBACK.map((index) => Float32Array.from(field(m, index)));
    // Device storage carries F32 values on both normal continuation and discard/rebase paths.
    // Widen the same packet into this CPU stand-in before any later step can read its carried fields.
    DEVICE_READBACK.forEach((index, k) => field(m, index).set(packet[k]));
    m.adoptDeviceStep(0); // Refresh the actual NU-derived CFL cache after its F32 storage boundary.
    DEVICE_READBACK.forEach((index, k) => exact(field(m, index), Float64Array.from(packet[k]), `memory F32 carry ${index}`));
    this.carriedPacket = packet;
    return packet;
  }
  private install(dt: number, packet: Float32Array[]) {
    DEVICE_READBACK.forEach((index, k) => field(this.solver, index).set(packet[k]));
    this.solver.adoptDeviceStep(dt);
  }
  async step(dt: number) {
    if (this.held) throw new Error('held staging used by normal step');
    if (this.failStep) { this.failStep = false; throw new Error('actual requested device failure'); }
    this.normalSteps += 1; this.events.push('water');
    const packet = this.run(dt);
    if (this.readback) this.install(dt, packet);
    else this.solver.time += dt;
  }
  async prepareStep(dt: number): Promise<PreparedWaterStep | undefined> {
    if (!this.eligible()) return undefined;
    if (this.held) throw new Error('second held staging');
    this.prepares += 1; this.events.push('prepare');
    if (this.failPrepare) { this.failPrepare = false; throw new Error('private preparation failure'); }
    this.held = true;
    const time = this.solver.time, version = this.solver.deviceLayout().version, plunge = this.solver.plungeVersion;
    this.preparedInputs.push([FIELD.H, FIELD.QX, FIELD.QZ].map((i) => Float32Array.from(field(this.solver, i))));
    const packet = this.run(dt); this.packets.push(packet);
    if (this.wait) await this.wait;
    let active = true;
    const discard = () => { if (!active) return; active = false; this.held = false; this.version = this.plunge = -1; this.discards += 1; this.events.push('discard'); };
    return {
      commit: () => {
        if (!active) return false;
        if (!this.eligible() || this.solver.time !== time || this.solver.deviceLayout().version !== version || this.solver.plungeVersion !== plunge) { discard(); return false; }
        active = false; this.held = false; this.commits += 1; this.events.push('commit'); this.install(dt, packet); return true;
      }, discard,
    };
  }
  dispose() { this.disposed = true; this.events.push('dispose'); }
}

type Core = { handle(request: SurfZoneRequest): void | Promise<void> };
async function arm(prefetched: boolean, seed = config.seed) {
  const events: string[] = [], replies: SurfZoneReply[] = [], devices: TransportDevice[] = [];
  const create = async (solver: { readonly h: Float64Array }) => {
    const memory = new SurfZoneSimulation({ ...config, seed }, 'warm').solver;
    const d = new TransportDevice(solver as unknown as Solver, memory as unknown as Solver, events); devices.push(d); return d;
  };
  const post = (reply: SurfZoneReply) => { events.push(reply.type); replies.push(reply); };
  const core = new SurfZoneWorkerCore(post, create) as Core;
  await core.handle({ type: 'start', config: { ...config, seed }, options, ...(prefetched ? { soloOneStep: true as const } : {}) });
  const runner = (core as unknown as { runner: SurfZoneRunner }).runner;
  const device = devices[0];
  const buffer = runner.createBuffers();
  const sessionCalls = vi.spyOn(runner.session!, 'step');
  return { core, runner, device, devices, replies, events, buffer, sessionCalls };
}
type Arm = Awaited<ReturnType<typeof arm>>;
function sameSea(actual: ReturnType<SurfZoneSimulation['exportState']>, expected: ReturnType<SurfZoneSimulation['exportState']>) {
  const { arrays: a, ...restA } = actual, { arrays: b, ...restB } = expected;
  expect(Object.keys(a).sort()).toEqual(Object.keys(b).sort());
  for (const name of Object.keys(b)) exact(a[name], b[name], `exported ${name}`);
  expect(restA).toEqual(restB); // Plain clock/front/lip/history objects, not bulk field-array matchers.
}
function sameState(a: Arm, b: Arm) {
  const sa = a.runner.simulation.solver as BoussinesqSolver, sb = b.runner.simulation.solver as BoussinesqSolver;
  DEVICE_READBACK.forEach((index) => exact(field(sa, index), field(sb, index), `field ${index}`));
  exact(sa.plungeHold, sb.plungeHold, 'plunge holds'); expect(sa.plungeVersion).toBe(sb.plungeVersion);
  expect(sa.time).toBe(sb.time);
  sameSea(a.runner.simulation.exportState(), b.runner.simulation.exportState()); // Front/lip/foam/aeration/counters/sea phase.
  const x = a.replies.at(-1)!, y = b.replies.at(-1)!;
  if (x.type === 'state' || y.type === 'state') throw new Error('not a snapshot comparison');
  const { status: xs, ...xb } = x.snapshot, { status: ys, ...yb } = y.snapshot;
  for (const key of Object.keys(xb) as (keyof SurfZoneBuffers)[]) {
    const u = xb[key], v = yb[key];
    if (typeof u === 'number' && typeof v === 'number') expect(Object.is(u, v), key).toBe(true);
    else exact(u as ArrayLike<number>, v as ArrayLike<number>, key);
  }
  expect({ ...xs, stepMs: 0, pipelineMs: undefined }).toEqual({ ...ys, stepMs: 0, pipelineMs: undefined });
  expect(a.sessionCalls.mock.calls.map(([dt, _water, input]) => ({ dt, input }))).toEqual(b.sessionCalls.mock.calls.map(([dt, _water, input]) => ({ dt, input })));
}
async function advance(a: Arm, input: RideRequest, reactions?: Float32Array, steps = 1) {
  await a.core.handle({ type: 'advance', steps, buffers: a.buffer, input, ...(reactions ? { reactions } : {}) });
}
const idle: RideRequest = { paddle: false, popUp: false, steer: 0, retry: false };
afterEach(() => vi.restoreAllMocks());

describe('ordinary solo water prefetch lifecycle', () => {
  it('selects the private capability only for the default ordinary Padang host', () => {
    const starts = (host = {}, cfg = config, opt = options) => {
      const requests: SurfZoneRequest[] = [];
      const port: WorkerPort = { onmessage: null, onerror: null, postMessage: (r) => requests.push(r), terminate: vi.fn() };
      const worker = new WorkerSurfZone(cfg, port, opt, host); worker.dispose();
      const request = requests[0]; if (request.type !== 'start') throw new Error('start missing'); return request;
    };
    expect(starts().soloOneStep).toBe(true);
    expect(starts({ maxQueuedSteps: 120 }).soloOneStep).toBeUndefined();
    expect(starts({ maxBatchSteps: 1 }).soloOneStep).toBeUndefined();
    expect(starts({ sea: new Uint8Array(1) }).soloOneStep).toBeUndefined();
    expect(starts({}, { ...config, compute: 'cpu' }).soloOneStep).toBeUndefined();
    expect(starts({}, { ...config, spot: 'point' }).soloOneStep).toBeUndefined();
    expect(starts({}, config, { ...options, barrelCases: [] }).soloOneStep).toBeUndefined();
  });

  it('publishes current state with latest controls and invalidates future water for remote, zero, multi and restore requests', async () => {
    const solo = await arm(true), generic = await arm(false);
    const place = { x: solo.runner.focus.x, z: solo.runner.focus.z, heading: 0, speed: 1, phase: 'prone' as const };
    const inputs: RideRequest[] = [{ ...idle, paddle: true, place }, { ...idle, paddle: true, steer: 0.5, trim: 0.1 }, { ...idle, popUp: true, steer: -0.3 }];
    for (const input of inputs) {
      await advance(generic, input); await advance(solo, input); sameState(solo, generic);
      expect(solo.events.slice(-2)).toEqual(['prepare', 'snapshot']);
      [FIELD.H, FIELD.QX, FIELD.QZ].forEach((index, k) => exact(solo.device.preparedInputs.at(-1)![k], Float32Array.from(field(solo.device.solver, index)), `after CPU feedback ${index}`));
    }
    expect(solo.sessionCalls.mock.calls.map(([, , input]) => input)).toEqual(inputs);
    expect(solo.device.normalSteps).toBe(1); expect(solo.device.commits).toBe(2); expect(generic.device.prepares).toBe(0);
    const before = solo.runner.simulation.exportState();
    await solo.core.handle({ type: 'exportState', id: 7 });
    const reply = solo.replies.at(-1)!; if (reply.type !== 'state') throw new Error('state reply missing');
    exact(await decompress(reply.bytes, reply.deflated), encodeSurfZoneState(before), 'held current export');
    sameSea(solo.runner.simulation.exportState(), before);
    expect(solo.device.commits).toBe(2); // Export/pause cannot publish the future packet.
    const reactions = Float32Array.of(place.x, place.z, 90, -40);
    await advance(solo, { ...idle, paddle: true }, reactions); await advance(generic, { ...idle, paddle: true }, reactions); sameState(solo, generic);
    expect(solo.device.discards).toBe(1); expect(solo.device.rebases).toBe(2);
    await advance(solo, idle); await advance(generic, idle); sameState(solo, generic);
    expect(solo.runner.simulation.hasWaterPrefetch).toBe(true);
    const time = solo.device.solver.time;
    await advance(solo, idle, undefined, 0); await advance(generic, idle, undefined, 0); sameState(solo, generic);
    expect(solo.device.solver.time).toBe(time); expect(solo.device.discards).toBe(2);
    await advance(solo, idle); await advance(generic, idle); sameState(solo, generic);
    await advance(solo, { ...idle, popUp: true }, undefined, 2); await advance(generic, { ...idle, popUp: true }, undefined, 2); sameState(solo, generic);
    expect(solo.device.discards).toBe(3); expect(solo.runner.simulation.hasWaterPrefetch).toBe(false);
    const pending = gate(); solo.device.wait = pending.promise;
    await advance(solo, idle); await advance(generic, idle); sameState(solo, generic);
    const restored = generic.runner.simulation.exportState(); restored.arrays.h[5] += 0.05;
    const bytes = encodeSurfZoneState(restored), count = solo.replies.filter((r) => r.type === 'snapshot').length;
    const importing = solo.core.handle({ type: 'restore', sea: bytes.slice() });
    const next = advance(solo, { ...idle, paddle: true });
    expect(solo.replies.filter((r) => r.type === 'snapshot')).toHaveLength(count);
    pending.release(); solo.device.wait = undefined; await importing; await next;
    await generic.core.handle({ type: 'restore', sea: bytes.slice() }); await advance(generic, { ...idle, paddle: true }); sameState(solo, generic);
    expect(solo.device.discards).toBe(4);
    await solo.runner.simulation.discardWaterPrefetch(); solo.device.dispose(); generic.device.dispose();
  });

  it('falls back only on the next requested positive step after private preparation fails', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const solo = await arm(true), generic = await arm(false); solo.device.failPrepare = true;
    await advance(solo, idle); await advance(generic, idle); sameState(solo, generic);
    expect(solo.device.disposed).toBe(false); expect(warning).not.toHaveBeenCalled(); expect(solo.device.solver.time).toBe(SURF_ZONE_STEP);
    await advance(solo, idle, undefined, 0); await advance(generic, idle, undefined, 0); sameState(solo, generic);
    expect(solo.device.disposed).toBe(false); expect(warning).not.toHaveBeenCalled(); expect(solo.device.solver.time).toBe(SURF_ZONE_STEP);
    generic.device.failStep = true;
    await advance(solo, { ...idle, paddle: true }); await advance(generic, { ...idle, paddle: true }); sameState(solo, generic);
    expect(solo.device.disposed).toBe(true); expect(solo.runner.simulation.device).toBeUndefined(); expect(warning).toHaveBeenCalledTimes(2);
  });

  it('retires a pending result across superseding starts without publishing future time or an intermediate sea', async () => {
    const solo = await arm(true), pending = gate(); solo.device.wait = pending.promise;
    await advance(solo, idle); const time = solo.device.solver.time;
    const first = solo.core.handle({ type: 'start', config: { ...config, seed: 7 }, options, soloOneStep: true });
    const second = solo.core.handle({ type: 'start', config: { ...config, seed: 9 }, options, soloOneStep: true });
    expect(solo.replies.filter((r) => r.type === 'ready')).toHaveLength(1);
    pending.release(); await first; await second;
    expect(solo.device.solver.time).toBe(time); expect(solo.device.commits).toBe(0); expect(solo.device.discards).toBe(1);
    expect(solo.device.disposed).toBe(true); expect(solo.device.held).toBe(false);
    expect(solo.replies.filter((r) => r.type === 'ready')).toHaveLength(2);
    const current = (solo.core as unknown as { runner: SurfZoneRunner }).runner;
    expect(current.config.seed).toBe(9); expect(current.simulation.solver.time).toBe(0);
    solo.devices.forEach((d) => d.dispose());
  });
});
