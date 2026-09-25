import { describe, expect, it } from 'vitest';
import type { SurfZoneConfig } from '../wave/SurfZoneSimulation';
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
  status: { ...snapshot.status, stepMs: 0 },
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
    expect(replies[1].transfer).toEqual([buffers.surface.buffer, buffers.flow.buffer, buffers.lip.buffer, buffers.bubbles.buffer, buffers.board.buffer, buffers.rider.buffer]);
  });
});

describe('WorkerSurfZone', () => {
  it('starts in the worker, keeps one advance in flight and shows the latest snapshot', async () => {
    const port = new FakePort();
    const host = new WorkerSurfZone(config, port);
    await host.ready;
    const local = new LocalSurfZone(config);
    expect(host.init.grid).toEqual(local.init.grid);
    expect(shown(host.snapshot)).toEqual(shown(local.snapshot));
    host.advance(3);
    host.advance(2);
    expect(port.requests.map((request) => (request.type === 'advance' ? request.steps : request.type))).toEqual(['start', 3]);
    await settle();
    expect(port.requests.map((request) => (request.type === 'advance' ? request.steps : request.type))).toEqual(['start', 3, 2]);
    await settle();
    local.advance(5);
    expect(shown(host.snapshot)).toEqual(shown(local.snapshot));
    expect(host.heightAt(0, -60)).toBe(local.heightAt(0, -60));
    host.dispose();
    expect(port.terminated).toBe(true);
  });

  // Like the page's own step accumulator: a worker that falls behind drops time instead of lagging ever further.
  it('caps the steps it queues while the worker is busy', async () => {
    const port = new FakePort();
    const host = new WorkerSurfZone(config, port);
    await host.ready;
    host.advance(1);
    host.advance(20);
    await settle();
    expect(port.requests.map((request) => (request.type === 'advance' ? request.steps : request.type))).toEqual(['start', 1, MAX_QUEUED_STEPS]);
    host.dispose();
  });

  it('fails its start when the worker reports an error', async () => {
    const port = new FakePort();
    const host = new WorkerSurfZone(config, port);
    port.onerror?.({ message: 'boom' } as ErrorEvent);
    await expect(host.ready).rejects.toThrow('boom');
  });
});
