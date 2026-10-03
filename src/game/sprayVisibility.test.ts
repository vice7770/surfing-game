import { describe, expect, it, vi } from 'vitest';
import { SurfZoneRunner } from '../wave/SurfZoneRunner';
import type { SurfZoneConfig } from '../wave/SurfZoneSimulation';
import { LocalSurfZone } from './SurfZoneHost';
import { SurfZoneWorkerCore, type SurfZoneReply } from './SurfZoneWorkerCore';
import { WorkerSurfZone, type WorkerPort } from './WorkerSurfZone';

const config: SurfZoneConfig = {
  spot: 'beach', seed: 1, significantHeight: 1, peakPeriod: 9, directionDegrees: 0, spreading: 12, tide: 0,
  stage: 1, compute: 'cpu', componentCount: 4, alongShore: 24, dx: 4, fineSpacing: 4, coarseSpacing: 8, spinUpPeriods: 0,
};

describe('hidden spray', () => {
  it('clears old spray, skips its updates and resumes without changing the sea or rider', () => {
    const visible = new SurfZoneRunner(config, { rider: true });
    const hidden = new SurfZoneRunner(config, { rider: true });
    const spray = vi.spyOn(hidden.spray, 'update');
    const bubbles = vi.spyOn(hidden.bubbles, 'update');
    hidden.spray.count = 1;
    hidden.setSprayEnabled(false);
    expect(hidden.spray.count).toBe(0);
    const input = { paddle: true, popUp: false, steer: 0.2, retry: false };
    visible.advance(3, input);
    hidden.advance(3, input);
    expect(spray).not.toHaveBeenCalled();
    expect(bubbles).toHaveBeenCalledTimes(3);
    expect(hidden.simulation.exportState()).toEqual(visible.simulation.exportState());
    const a = visible.createBuffers();
    const b = hidden.createBuffers();
    visible.fill(a);
    hidden.fill(b);
    expect(b.sprayCount).toBe(0);
    expect(b.board).toEqual(a.board);
    expect(b.rider).toEqual(a.rider);
    expect(b.roar).toEqual(a.roar);
    hidden.setSprayEnabled(true);
    hidden.advance(1);
    expect(spray).toHaveBeenCalledOnce();
  });

  it('applies the visibility flag before a worker sea is ready, and after a restart', async () => {
    const replies: SurfZoneReply[] = [];
    const core = new SurfZoneWorkerCore((reply) => replies.push(reply));
    const port: WorkerPort = {
      onmessage: null, onerror: null, terminate: vi.fn(),
      postMessage(request) { queueMicrotask(() => {
        core.handle(request);
        for (const reply of replies.splice(0)) port.onmessage?.({ data: reply } as MessageEvent<SurfZoneReply>);
      }); },
    };
    const host = new WorkerSurfZone(config, port);
    host.setSprayEnabled(false);
    await host.ready;
    const runner = () => (core as unknown as { runner: SurfZoneRunner }).runner;
    const first = vi.spyOn(runner().spray, 'update');
    host.advance(1);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(first).not.toHaveBeenCalled();
    expect(host.snapshot.sprayCount).toBe(0);
    host.setSprayEnabled(true);
    host.advance(1);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(first).toHaveBeenCalledOnce();
    await core.handle({ type: 'sprayEnabled', enabled: false });
    await core.handle({ type: 'start', config });
    const restarted = vi.spyOn(runner().spray, 'update');
    runner().advance(1);
    expect(restarted).not.toHaveBeenCalled();
    host.dispose();
  });

  it('forwards visibility in the in-page fallback too', () => {
    const local = new LocalSurfZone(config);
    const spray = vi.spyOn(local.runner.spray, 'update');
    local.setSprayEnabled(false);
    local.advance(1);
    expect(spray).not.toHaveBeenCalled();
    local.setSprayEnabled(true);
    local.advance(1);
    expect(spray).toHaveBeenCalledOnce();
  });
});
