import { describe, expect, it } from 'vitest';
import { createPose, type SurferPose } from '../net/poseCodec';
import { POSE_HZ } from '../net/protocol';
import { RIDER_SNAPSHOT, SURF_ZONE_STEP, type RideRequest } from '../wave/SurfZoneRunner';
import { OnlinePlay, RESPAWN_SECONDS, type OnlineLink, type OnlineSurf } from './OnlinePlay';
import type { SurfZoneHost } from './SurfZoneHost';

class FakeHost {
  outstandingSteps = 0;
  readonly init = { focus: { x: 0, z: -100 }, windowXMin: -80, grid: { xMin: -80, zMin: -330, spacing: 1, nx: 161, nz: 361 }, dx: 1, bed: new Float32Array() };
  readonly snapshot = {
    board: Float64Array.of(2, 0.1, -110, 0, 0, 0, 1, 1),
    rider: new Float64Array(RIDER_SNAPSHOT.length),
    reaction: new Float64Array(4),
    status: { seaTime: 100 },
  };

  heightAt(): number {
    return 0;
  }
}

class FakeSurf implements OnlineSurf {
  readonly fake = new FakeHost();
  readonly host = this.fake as unknown as SurfZoneHost;
  advances: { steps: number; input?: Omit<RideRequest, 'retry'>; reactions?: ArrayLike<number> }[] = [];
  retries: ({ x: number; z: number } | undefined)[] = [];

  advance(steps: number, input?: Omit<RideRequest, 'retry'>, reactions?: ArrayLike<number>): void {
    this.advances.push({ steps, input, reactions });
  }

  retry(spawnAt?: { x: number; z: number }): void {
    this.retries.push(spawnAt);
  }
}

class FakeLink implements OnlineLink {
  clockReady = true;
  seaTime = 100;
  sent: SurferPose[] = [];
  reactions?: Float32Array;
  readonly remote = { latestPositions: () => [{ x: 0, z: -106 }] };

  seaTimeNow(): number {
    return this.seaTime;
  }

  takeReactions(): Float32Array | undefined {
    const taken = this.reactions;
    this.reactions = undefined;
    return taken;
  }

  sendPose(pose: SurferPose): void {
    const copy = createPose();
    Object.assign(copy, pose, { reaction: { ...pose.reaction }, points: pose.points.slice() });
    this.sent.push(copy);
  }
}

const paddle = { paddle: true, popUp: false, steer: 0 };
const frame = 1 / 60;

function setup() {
  let now = 0;
  const link = new FakeLink();
  const surf = new FakeSurf();
  const play = new OnlinePlay(link, () => now);
  return { link, surf, play, advance: (ms: number) => { now += ms; } };
}

describe('OnlinePlay', () => {
  it('waits for the server\'s clock', () => {
    const { link, surf, play } = setup();
    link.clockReady = false;
    play.step(surf, frame, paddle);
    expect(surf.advances).toEqual([{ steps: 0, input: undefined, reactions: undefined }]);
    expect(link.sent).toHaveLength(0);
  });

  it('catches up with the room without the player\'s input, and says nothing meanwhile', () => {
    const { link, surf, play } = setup();
    link.seaTime = 110;
    play.step(surf, frame, paddle);
    expect(surf.advances[0].steps).toBe(30);
    expect(surf.advances[0].input).toEqual({ paddle: false, popUp: false, steer: 0 });
    expect(play.phase).toBe('catching-up');
    expect(play.behind).toBeCloseTo(10, 6);
    expect(link.sent).toHaveLength(0);
    expect(surf.retries).toEqual([]);
  });

  it('once caught up, moves to a free spot once, hands the player\'s input on, and sends poses 20 times a second', () => {
    const { link, surf, play } = setup();
    link.seaTime = 100 + 2 * SURF_ZONE_STEP;
    play.step(surf, frame, paddle);
    expect(play.phase).toBe('riding');
    expect(surf.retries).toHaveLength(1);
    const spot = surf.retries[0]!;
    expect(Math.hypot(spot.x - 0, spot.z + 106)).toBeGreaterThanOrEqual(3);
    expect(surf.advances[0]).toMatchObject({ steps: 2, input: paddle });
    for (let i = 0; i < 59; i += 1) play.step(surf, frame, paddle);
    expect(surf.retries).toHaveLength(1);
    expect(link.sent.length).toBeGreaterThanOrEqual(POSE_HZ - 1);
    expect(link.sent.length).toBeLessThanOrEqual(POSE_HZ + 1);
    expect(link.sent[0]).toMatchObject({ x: 2, z: -110, paddling: true, step: Math.round(100 / SURF_ZONE_STEP) });
  });

  it('passes the others\' pushes on to the water', () => {
    const { link, surf, play } = setup();
    link.reactions = Float32Array.of(1, 2, 3, 4);
    play.step(surf, frame, paddle);
    expect(Array.from(surf.advances[0].reactions ?? [])).toEqual([1, 2, 3, 4]);
  });

  it('sums this board\'s pushes once per new snapshot into the next pose', () => {
    const { link, surf, play } = setup();
    surf.fake.snapshot.reaction.set([2, -110, 3, 4]);
    play.step(surf, frame, paddle);
    play.step(surf, frame, paddle);
    surf.fake.snapshot.status.seaTime = 100 + SURF_ZONE_STEP;
    link.seaTime = surf.fake.snapshot.status.seaTime;
    for (let i = 0; i < 10; i += 1) play.step(surf, frame, paddle);
    // Each snapshot's push goes out once, in whichever pose follows it.
    expect(link.sent.reduce((sum, pose) => sum + pose.reaction.jx, 0)).toBeCloseTo(6, 6);
    expect(link.sent.reduce((sum, pose) => sum + pose.reaction.jz, 0)).toBeCloseTo(8, 6);
  });

  it('asks for a rebuild when the sea falls far behind after catching up', () => {
    const { link, surf, play } = setup();
    play.step(surf, frame, paddle);
    link.seaTime = 130;
    expect(play.step(surf, 30, paddle).resync).toBe(true);
    expect(play.phase).toBe('resyncing');
    play.restart();
    expect(play.phase).toBe('catching-up');
  });

  it('respawns at a free spot after a 3 s countdown', () => {
    const { surf, play, advance } = setup();
    play.step(surf, frame, paddle);
    play.respawn();
    advance(1000);
    play.step(surf, frame, paddle);
    expect(play.respawnIn).toBeCloseTo(RESPAWN_SECONDS - 1, 6);
    play.respawn();
    advance(2000);
    play.step(surf, frame, paddle);
    expect(surf.retries).toHaveLength(2);
    expect(play.respawnIn).toBeUndefined();
  });
});
