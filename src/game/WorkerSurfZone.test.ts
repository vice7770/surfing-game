import { describe, expect, it, vi } from 'vitest';
import type { SurfZoneConfig } from '../wave/SurfZoneSimulation';
import { LIP_HIT_STRIDE, LIP_STRIDE, STROKE_HIT_STRIDE, SURF_ZONE_STEP, type SurfZoneRunner } from '../wave/SurfZoneRunner';
import { SPRAY_STRIDE } from '../wave/SprayCloud';
import { FRONT_STRIDE } from '../wave/barrel/frontRecords';
import { TUBE_STRIDE } from '../wave/tubeTable';
import { decompress, encodeSurfZoneState } from '../wave/surfZoneState';
import { LocalSurfZone, type SurfZoneSnapshot } from './SurfZoneHost';
import { SurfZoneWorkerCore, type SurfZoneRequest, type SurfZoneReply } from './SurfZoneWorkerCore';
import { MAX_QUEUED_STEPS, WorkerSurfZone, type WorkerPort } from './WorkerSurfZone';

const config: SurfZoneConfig = {
  spot: 'point', seed: 4, significantHeight: 1.4, peakPeriod: 9, directionDegrees: 20, spreading: 24, tide: 0,
  componentCount: 8, alongShore: 40, dx: 2, fineSpacing: 2, coarseSpacing: 4, spinUpPeriods: 1,
};

/** Everything a snapshot shows, less the wall-clock step time. */
const shown = (snapshot: SurfZoneSnapshot) => ({
  surface: Array.from(snapshot.surface),
  flow: Array.from(snapshot.flow),
  lip: Array.from(snapshot.lip.subarray(0, snapshot.lipCount * 3)),
  bubbles: Array.from(snapshot.bubbles.subarray(0, snapshot.bubbleCount * 3)),
  board: Array.from(snapshot.board),
  rider: Array.from(snapshot.rider),
  status: { ...snapshot.status, stepMs: 0, pipelineMs: undefined },
});

/** A worker stand-in: the real core behind asynchronous message delivery. */
class FakePort implements WorkerPort {
  onmessage: ((event: MessageEvent<SurfZoneReply>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  readonly requests: SurfZoneRequest[] = [];
  terminated = false;
  private readonly core = new SurfZoneWorkerCore((reply) => queueMicrotask(() => this.onmessage?.({ data: reply } as MessageEvent<SurfZoneReply>)));

  postMessage(request: SurfZoneRequest): void {
    this.requests.push(request);
    queueMicrotask(() => this.core.handle(request));
  }

  terminate(): void {
    this.terminated = true;
  }
}

/** Executes the real synchronous core only when a test completes an advance. */
class ControlledPort implements WorkerPort {
  onmessage: ((event: MessageEvent<SurfZoneReply>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  readonly requests: SurfZoneRequest[] = [];
  terminated = false;
  private readonly queued: Extract<SurfZoneRequest, { type: 'advance' }>[] = [];
  private readonly replies: SurfZoneReply[] = [];
  private readonly core = new SurfZoneWorkerCore((reply) => this.replies.push(reply));

  postMessage(request: SurfZoneRequest): void {
    this.requests.push(request);
    if (request.type === 'advance') this.queued.push(request);
    else this.core.handle(request);
  }

  deliverReady(): void {
    this.deliver();
  }

  completeAdvance(): void {
    const request = this.queued.shift();
    if (!request) throw new Error('No advance in flight');
    expect(this.queued).toHaveLength(0);
    this.core.handle(request);
    this.deliver();
  }

  terminate(): void {
    this.terminated = true;
  }

  private deliver(): void {
    const reply = this.replies.shift();
    if (!reply) throw new Error('No reply ready');
    this.onmessage?.({ data: reply } as MessageEvent<SurfZoneReply>);
  }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('SurfZoneWorkerCore', () => {
  it('replies with the same start data and snapshots as the in-page surf zone, transferring the buffers', () => {
    const replies: { reply: SurfZoneReply; transfer: Transferable[] }[] = [];
    const core = new SurfZoneWorkerCore((reply, transfer) => replies.push({ reply, transfer }));
    const local = new LocalSurfZone(config, { rider: true });
    core.handle({ type: 'start', config, options: { rider: true } });
    const ready = replies[0].reply;
    if (ready.type !== 'ready') throw new Error('expected ready');
    expect(ready.init.grid).toEqual(local.init.grid);
    expect(Array.from(ready.init.bed)).toEqual(Array.from(local.init.bed));
    expect(ready.init.focus).toEqual(local.init.focus);
    expect(shown(ready.snapshot)).toEqual(shown(local.snapshot));
    const { status: _status, ...buffers } = ready.snapshot;
    const input = { paddle: true, popUp: false, steer: 0.5, retry: false };
    core.handle({ type: 'advance', steps: 45, buffers, input });
    local.advance(45, input);
    const snapshot = replies[1].reply;
    if (snapshot.type !== 'snapshot') throw new Error('expected snapshot');
    expect(shown(snapshot.snapshot)).toEqual(shown(local.snapshot));
    expect(snapshot.snapshot.board[7]).toBe(1);
    expect(snapshot.snapshot.rider[23]).toBe(1);
    expect(replies[1].transfer).toEqual([
      buffers.surface.buffer, buffers.flow.buffer, buffers.lip.buffer, buffers.bubbles.buffer, buffers.spray.buffer, buffers.board.buffer, buffers.rider.buffer,
      buffers.lipHits.buffer, buffers.strokeHits.buffer, buffers.roar.buffer, buffers.tubes.buffer, buffers.reaction.buffer, buffers.aeration.buffer,
      buffers.front.buffer,
    ]);
    // S1: the paddler's strokes reach the snapshot for sound, as the in-page surf zone reports them.
    expect(snapshot.snapshot.strokeHitCount).toBe(local.snapshot.strokeHitCount);
  });

  it('spins the sea up on its device before it reports ready', async () => {
    const replies: SurfZoneReply[] = [];
    let deviceSteps = 0;
    let stepsAtReady = -1;
    const worker = new SurfZoneWorkerCore((reply) => {
      if (reply.type === 'ready') stepsAtReady = deviceSteps;
      replies.push(reply);
    }, async (solver) => ({
      // A stand-in device that takes the CPU solver's own step.
      step: async (dt: number) => {
        deviceSteps += 1;
        solver.step(dt);
      },
      dispose() {},
    }));
    await worker.handle({ type: 'start', config, options: { rider: true } });
    expect(stepsAtReady).toBeGreaterThan(20);
    const ready = replies[0];
    if (ready.type !== 'ready') throw new Error('expected ready');
    const local = new LocalSurfZone(config, { rider: true });
    expect(shown(ready.snapshot)).toEqual({ ...shown(local.snapshot), status: { ...shown(local.snapshot).status, compute: 'gpu' } });
  });

  it('steps the water on a device when given one, replying once it is done', async () => {
    // A stand-in device that takes the CPU solver's own step, asynchronously.
    const created: string[] = [];
    const core = (compute?: 'auto' | 'cpu') => {
      const replies: SurfZoneReply[] = [];
      const worker = new SurfZoneWorkerCore((reply) => replies.push(reply), async (solver) => {
        created.push(compute ?? 'auto');
        return { step: async (dt: number) => solver.step(dt), dispose() {} };
      });
      return { worker, replies };
    };
    const { worker, replies } = core();
    const local = new LocalSurfZone(config, { rider: true });
    await worker.handle({ type: 'start', config, options: { rider: true } });
    const ready = replies[0];
    if (ready.type !== 'ready') throw new Error('expected ready');
    expect(ready.snapshot.status.compute).toBe('gpu');
    const { status: _status, ...buffers } = ready.snapshot;
    const input = { paddle: true, popUp: false, steer: 0.5, retry: false };
    const pending = worker.handle({ type: 'advance', steps: 30, buffers, input });
    expect(replies).toHaveLength(1);
    await pending;
    local.advance(30, input);
    const snapshot = replies[1];
    if (snapshot.type !== 'snapshot') throw new Error('expected snapshot');
    expect(shown(snapshot.snapshot)).toEqual({ ...shown(local.snapshot), status: { ...shown(local.snapshot).status, compute: 'gpu' } });
    const cpu = core('cpu');
    await cpu.worker.handle({ type: 'start', config: { ...config, compute: 'cpu' }, options: { rider: true } });
    expect(created).toEqual(['auto']);
    expect(cpu.replies[0].type === 'ready' && cpu.replies[0].snapshot.status.compute).toBe('cpu');
  });

  it.each(['cpu', 'device'] as const)('keeps two %s fixed steps equivalent to two single advances, retaining both steps\' events', async (backend) => {
    const make = async () => {
      const replies: SurfZoneReply[] = [];
      const core = new SurfZoneWorkerCore((reply) => replies.push(reply), backend === 'device'
        ? async (solver) => ({ step: async (dt: number) => solver.step(dt), dispose() {} }) : undefined);
      await core.handle({ type: 'start', config, options: { rider: true } });
      const ready = replies[0];
      if (ready.type !== 'ready') throw new Error('expected ready');
      const runner = (core as unknown as { runner: SurfZoneRunner }).runner;
      const fixedSteps: number[] = [];
      const record = (dt: number) => {
        fixedSteps.push(dt);
        const n = fixedSteps.length;
        // A deterministic landing each step exercises the real sound queue and visual particle paths.
        runner.simulation.lipImpacts.push({ x: n, z: -50, volume: n * 0.25, vx: n, vy: -5, vz: 3 });
      };
      if (backend === 'device') {
        const step = runner.simulation.stepAsync.bind(runner.simulation);
        vi.spyOn(runner.simulation, 'stepAsync').mockImplementation(async (dt) => { await step(dt); record(dt); });
      } else {
        const step = runner.simulation.step.bind(runner.simulation);
        vi.spyOn(runner.simulation, 'step').mockImplementation((dt) => { step(dt); record(dt); });
      }
      const sessionSteps = vi.spyOn(runner.session!, 'step');
      const { status: _status, ...buffers } = ready.snapshot;
      return { core, runner, replies, buffers, fixedSteps, sessionSteps };
    };
    const batch = await make(), single = await make();
    const place = { x: 1, z: -50, heading: 0, speed: 1, phase: 'prone' as const };
    const input = { paddle: true, popUp: true, steer: 0.2, retry: true, place };
    await batch.core.handle({ type: 'advance', steps: 2, buffers: batch.buffers, input });
    await single.core.handle({ type: 'advance', steps: 1, buffers: single.buffers, input });
    const first = single.replies[1];
    if (first.type !== 'snapshot') throw new Error('expected snapshot');
    const firstLip = Array.from(first.snapshot.lipHits.subarray(0, first.snapshot.lipHitCount * LIP_HIT_STRIDE));
    const firstStroke = Array.from(first.snapshot.strokeHits.subarray(0, first.snapshot.strokeHitCount * STROKE_HIT_STRIDE));
    const firstKnock = first.snapshot.status.ride?.knock ?? 0;
    await single.core.handle({ type: 'advance', steps: 1, buffers: single.buffers,
      input: { ...input, popUp: false, retry: false, place: undefined } });
    const a = batch.replies[1], b = single.replies[2];
    if (a.type !== 'snapshot' || b.type !== 'snapshot') throw new Error('expected snapshots');
    expect(batch.replies).toHaveLength(2); // Ready, then one latest-state publication for two steps.
    expect(batch.fixedSteps).toEqual([SURF_ZONE_STEP, SURF_ZONE_STEP]);
    expect(single.fixedSteps).toEqual(batch.fixedSteps);
    expect(batch.sessionSteps.mock.calls.map(([dt, _water, request]) => ({ dt, request })))
      .toEqual(single.sessionSteps.mock.calls.map(([dt, _water, request]) => ({ dt, request })));
    expect(batch.sessionSteps.mock.calls[0][2]).toMatchObject({ paddle: true, popUp: true, retry: true, place });
    expect(batch.sessionSteps.mock.calls[1][2]).toMatchObject({ paddle: true, popUp: false, retry: false, place: undefined });
    expect(batch.runner.simulation.exportState()).toEqual(single.runner.simulation.exportState());
    const active = (snapshot: SurfZoneSnapshot) => ({
      ...shown(snapshot),
      lip: Array.from(snapshot.lip.subarray(0, snapshot.lipCount * LIP_STRIDE)),
      tubes: Array.from(snapshot.tubes.subarray(0, snapshot.tubeCount * TUBE_STRIDE)),
      spray: Array.from(snapshot.spray.subarray(0, snapshot.sprayCount * SPRAY_STRIDE)),
      aeration: Array.from(snapshot.aeration),
      front: Array.from(snapshot.front.subarray(0, snapshot.frontCount * FRONT_STRIDE)),
      roar: Array.from(snapshot.roar),
    });
    const finalSingle = active(b.snapshot);
    if (finalSingle.status.ride) finalSingle.status.ride.knock = Math.max(firstKnock, finalSingle.status.ride.knock);
    expect(active(a.snapshot)).toEqual(finalSingle);
    expect(a.snapshot.lipHitCount).toBe(2);
    expect(Array.from(a.snapshot.lipHits.subarray(0, a.snapshot.lipHitCount * LIP_HIT_STRIDE)))
      .toEqual([...firstLip, ...b.snapshot.lipHits.subarray(0, b.snapshot.lipHitCount * LIP_HIT_STRIDE)]);
    expect(Array.from(a.snapshot.strokeHits.subarray(0, a.snapshot.strokeHitCount * STROKE_HIT_STRIDE)))
      .toEqual([...firstStroke, ...b.snapshot.strokeHits.subarray(0, b.snapshot.strokeHitCount * STROKE_HIT_STRIDE)]);
    expect(a.snapshot.status.ride?.resets).toBe(2);
  });
});

describe('SurfZoneWorkerCore restore (L2)', () => {
  it('restores after the step under way, so the next advance starts from the restored sea', async () => {
    let release: (() => void) | undefined;
    // The device spins the sea up freely; once it is ready, each step waits to be released.
    let held = false;
    const replies: SurfZoneReply[] = [];
    const worker = new SurfZoneWorkerCore((reply) => replies.push(reply), async (solver) => ({
      step: (dt: number) => {
        if (!held) {
          solver.step(dt);
          return Promise.resolve();
        }
        return new Promise<void>((resolve) => { release = () => { solver.step(dt); resolve(); }; });
      },
      dispose() {},
    }));
    await worker.handle({ type: 'start', config, options: {} });
    held = true;
    const ready = replies[0];
    if (ready.type !== 'ready') throw new Error('expected ready');
    const local = new LocalSurfZone(config);
    const recorded = encodeSurfZoneState(local.runner.simulation.exportState());
    const { status: _status, ...buffers } = ready.snapshot;
    const stepping = worker.handle({ type: 'advance', steps: 1, buffers });
    const restoring = worker.handle({ type: 'restore', sea: recorded.slice() });
    // The restore waits for the step under way.
    await Promise.resolve();
    release!();
    await stepping;
    await restoring;
    const { status: _s, ...next } = (replies[1] as Extract<SurfZoneReply, { type: 'snapshot' }>).snapshot;
    const after = worker.handle({ type: 'advance', steps: 1, buffers: next });
    release!();
    await after;
    local.restore(recorded.slice());
    local.advance(1);
    const shownAfter = (replies[2] as Extract<SurfZoneReply, { type: 'snapshot' }>).snapshot;
    expect(Array.from(shownAfter.surface)).toEqual(Array.from(local.snapshot.surface));
  });
});

describe('WorkerSurfZone', () => {
  it('explicit two-step batching drains a lone step then a held backlog without replaying presses or reactions', async () => {
    const port = new ControlledPort();
    const host = new WorkerSurfZone(config, port, { rider: true }, { maxBatchSteps: 2 });
    port.deliverReady();
    await host.ready;
    const place = { x: 1, z: -50, heading: 0, speed: 1, phase: 'prone' as const };
    host.advance(1, { paddle: false, popUp: false, steer: 0, retry: false }, Float32Array.of(1, 2, 3, 4));
    host.advance(3, { paddle: false, popUp: true, steer: 0.1, retry: true, place }, Float32Array.of(5, 6, 7, 8));
    // A newer held input changes the controls, while pending presses and placement survive until dispatched.
    host.advance(0, { paddle: true, popUp: false, steer: 0.4, retry: false }, Float32Array.of(9, 10, 11, 12));
    const advances = () => port.requests.filter((request) => request.type === 'advance');
    expect(advances().map((request) => request.steps)).toEqual([1]);
    expect(host.outstandingSteps).toBe(4);
    expect(Array.from(advances()[0].reactions!)).toEqual([1, 2, 3, 4]);
    port.completeAdvance();
    expect(advances().map((request) => request.steps)).toEqual([1, 2]);
    expect(host.outstandingSteps).toBe(3);
    expect(advances()[1].input).toEqual({ paddle: true, popUp: true, steer: 0.4, retry: true, place });
    expect(Array.from(advances()[1].reactions!)).toEqual([5, 6, 7, 8, 9, 10, 11, 12]);
    port.completeAdvance();
    expect(advances().map((request) => request.steps)).toEqual([1, 2, 1]);
    expect(host.outstandingSteps).toBe(1);
    expect(advances()[2].input).toEqual({ paddle: true, popUp: false, steer: 0.4, retry: false, place: undefined });
    expect(advances()[2].reactions).toBeUndefined();
    port.completeAdvance();
    expect(host.outstandingSteps).toBe(0);
    host.dispose();
  });

  it.each([1, 2])('retains exactly six queued steps in addition to %i in flight, then drains every retained step', async (firstSteps) => {
    const port = new ControlledPort();
    const host = new WorkerSurfZone(config, port, {}, { maxBatchSteps: 2 });
    port.deliverReady();
    await host.ready;
    host.advance(firstSteps);
    host.advance(20);
    host.advance(20);
    expect(host.outstandingSteps).toBe(firstSteps + MAX_QUEUED_STEPS);
    port.completeAdvance();
    expect(host.outstandingSteps).toBe(MAX_QUEUED_STEPS);
    for (const left of [4, 2, 0]) {
      port.completeAdvance();
      expect(host.outstandingSteps).toBe(left);
    }
    const advances = port.requests.filter((request) => request.type === 'advance');
    expect(advances.map((request) => request.steps)).toEqual([firstSteps, 2, 2, 2]);
    expect(advances.reduce((sum, request) => sum + request.steps, 0)).toBe(firstSteps + MAX_QUEUED_STEPS);
    host.dispose();
  });

  it.each([
    { options: { maxBatchSteps: 1 }, requests: [1, 1, 1, 1, 1] },
    { options: { maxBatchSteps: 3 }, requests: [3, 2] },
    { options: { maxQueuedSteps: 90 }, requests: [5] },
    { options: { maxQueuedSteps: 90, maxBatchSteps: 1 }, requests: [1, 1, 1, 1, 1] },
  ])('preserves explicit host batching $options', async ({ options, requests }) => {
    const port = new ControlledPort();
    const host = new WorkerSurfZone(config, port, {}, options);
    port.deliverReady();
    await host.ready;
    host.advance(5);
    while (host.outstandingSteps) port.completeAdvance();
    expect(port.requests.filter((request) => request.type === 'advance').map((request) => request.steps)).toEqual(requests);
    host.dispose();
  });

  it('starts in the worker, keeps one advance in flight and shows the latest snapshot', async () => {
    const port = new FakePort();
    const host = new WorkerSurfZone(config, port);
    await host.ready;
    const local = new LocalSurfZone(config);
    expect(host.init.grid).toEqual(local.init.grid);
    expect(shown(host.snapshot)).toEqual(shown(local.snapshot));
    host.advance(3);
    host.advance(2);
    expect(port.requests.map((request) => (request.type === 'advance' ? request.steps : request.type))).toEqual(['start', 1]);
    await settle();
    expect(port.requests.map((request) => (request.type === 'advance' ? request.steps : request.type))).toEqual(['start', 1, 1, 1, 1, 1]);
    await settle();
    local.advance(5);
    expect(shown(host.snapshot)).toEqual(shown(local.snapshot));
    expect(host.heightAt(0, -60)).toBe(local.heightAt(0, -60));
    host.dispose();
    expect(port.terminated).toBe(true);
  });

  it('tells the worker’s spray the water look, before or after the sea is ready (G9: Classic keeps its spray)', async () => {
    const port = new FakePort();
    const host = new WorkerSurfZone(config, port);
    host.setSprayLook('classic');
    await host.ready;
    const runner = () => (port as unknown as { core: { runner: { spray: { look: string } } } }).core.runner;
    expect(runner().spray.look).toBe('classic');
    host.setSprayLook('rich');
    await settle();
    expect(runner().spray.look).toBe('rich');
    // The in-page host does the same.
    const local = new LocalSurfZone(config);
    local.setSprayLook('classic');
    expect(local.runner.spray.look).toBe('classic');
    host.dispose();
  });

  it('tells the worker’s spray and bubbles the Particles level, before or after the sea is ready', async () => {
    const port = new FakePort();
    const host = new WorkerSurfZone(config, port);
    host.setParticleLevel('low');
    await host.ready;
    const runner = () => (port as unknown as { core: { runner: { spray: { level: string }; bubbles: { level: string } } } }).core.runner;
    expect([runner().spray.level, runner().bubbles.level]).toEqual(['low', 'low']);
    host.setParticleLevel('medium');
    await settle();
    expect([runner().spray.level, runner().bubbles.level]).toEqual(['medium', 'medium']);
    // The in-page host does the same.
    const local = new LocalSurfZone(config);
    local.setParticleLevel('low');
    expect([local.runner.spray.level, local.runner.bubbles.level]).toEqual(['low', 'low']);
    host.dispose();
  });

  // The particles are visual only: the water, the lip and the rider step the same at any level (online, every player's sea agrees).
  it('steps the same sea, lip and rider at every Particles level; only the particles differ', () => {
    const high = new LocalSurfZone(config, { rider: true });
    const low = new LocalSurfZone(config, { rider: true });
    low.setParticleLevel('low');
    const input = { paddle: true, popUp: false, steer: 0.3, retry: false };
    high.advance(90, input);
    low.advance(90, input);
    const { spray: _high, ...highStatus } = high.snapshot.status;
    const { spray: _low, ...lowStatus } = low.snapshot.status;
    expect({ ...shown(low.snapshot), bubbles: [], status: { ...lowStatus, stepMs: 0, pipelineMs: undefined } })
      .toEqual({ ...shown(high.snapshot), bubbles: [], status: { ...highStatus, stepMs: 0, pipelineMs: undefined } });
    expect(Array.from(low.snapshot.lip.subarray(0, low.snapshot.lipCount * 9))).toEqual(Array.from(high.snapshot.lip.subarray(0, high.snapshot.lipCount * 9)));
    expect(Array.from(low.snapshot.aeration)).toEqual(Array.from(high.snapshot.aeration));
    expect(Array.from(low.snapshot.tubes)).toEqual(Array.from(high.snapshot.tubes));
    expect(low.runner.simulation.exportState()).toEqual(high.runner.simulation.exportState());
  });

  // L2: a lesson's placement asked for with no steps rides in the next advance, and only that one.
  it('carries a placement into the next advance once', async () => {
    const port = new FakePort();
    const host = new WorkerSurfZone(config, port, { rider: true });
    await host.ready;
    const place = { x: 1, z: -50, heading: 0, speed: 2, phase: 'standing' as const };
    host.advance(0, { paddle: false, popUp: false, steer: 0, retry: false, place });
    host.advance(1, { paddle: false, popUp: false, steer: 0, retry: false });
    await settle();
    host.advance(1, { paddle: false, popUp: false, steer: 0, retry: false });
    await settle();
    const places = port.requests.filter((request) => request.type === 'advance').map((request) => request.type === 'advance' && request.input?.place);
    expect(places).toEqual([place, undefined]);
    host.dispose();
  });

  // Like the page's own step accumulator: a worker that falls behind drops time instead of lagging ever further.
  it('caps the steps it queues while the worker is busy', async () => {
    const port = new FakePort();
    const host = new WorkerSurfZone(config, port);
    await host.ready;
    host.advance(1);
    host.advance(20);
    await settle();
    expect(port.requests.map((request) => (request.type === 'advance' ? request.steps : request.type))).toEqual(['start', ...Array(MAX_QUEUED_STEPS + 1).fill(1)]);
    host.dispose();
  });

  it('counts the steps asked for but not yet shown, and passes remote pushes on (spec N1)', async () => {
    const port = new FakePort();
    const host = new WorkerSurfZone(config, port);
    await host.ready;
    expect(host.outstandingSteps).toBe(0);
    host.advance(3, undefined, Float32Array.of(1, 2, 3, 4));
    host.advance(2, undefined, Float32Array.of(5, 6, 7, 8));
    expect(host.outstandingSteps).toBe(5);
    const advances = () => port.requests.filter((request) => request.type === 'advance');
    expect(Array.from(advances()[0].reactions ?? [])).toEqual([1, 2, 3, 4]);
    await settle();
    expect(advances()).toHaveLength(5);
    expect(Array.from(advances()[1].reactions ?? [])).toEqual([5, 6, 7, 8]);
    await settle();
    expect(host.outstandingSteps).toBe(0);
    // Each push went out once.
    expect(advances()).toHaveLength(5);
    host.dispose();
  });

  it('queues as many steps as its options allow', async () => {
    const port = new FakePort();
    const host = new WorkerSurfZone(config, port, {}, { maxQueuedSteps: 90 });
    await host.ready;
    host.advance(1);
    host.advance(60);
    host.advance(60);
    await settle();
    expect(port.requests.map((request) => (request.type === 'advance' ? request.steps : request.type))).toEqual(['start', 1, 90]);
    host.dispose();
  });

  it('hands its sea over, and a surf zone started from it shows the same water (spec N1)', async () => {
    const donor = new WorkerSurfZone(config, new FakePort());
    await donor.ready;
    donor.advance(6);
    await settle();
    await settle();
    const sea = await donor.exportState();
    expect(sea.bytes.byteLength).toBeGreaterThan(1000);
    const joiner = new WorkerSurfZone(config, new FakePort(), {}, { sea: await decompress(sea.bytes, sea.deflated) });
    await joiner.ready;
    expect(joiner.snapshot.status.seaTime).toBe(donor.snapshot.status.seaTime);
    let largest = 0;
    donor.snapshot.surface.forEach((value, i) => { largest = Math.max(largest, Math.abs(value - joiner.snapshot.surface[i])); });
    expect(largest).toBeLessThan(1e-4);
    const local = new LocalSurfZone(config, {}, await decompress(sea.bytes, sea.deflated));
    expect(local.snapshot.status.seaTime).toBe(donor.snapshot.status.seaTime);
    expect((await local.exportState()).bytes.byteLength).toBeGreaterThan(1000);
  });

  it('fails its start when the worker reports an error', async () => {
    const port = new FakePort();
    const host = new WorkerSurfZone(config, port);
    port.onerror?.({ message: 'boom' } as ErrorEvent);
    await expect(host.ready).rejects.toThrow('boom');
  });
});
