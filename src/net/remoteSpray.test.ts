import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { RIDER_PHASES, SURF_ZONE_STEP } from '../wave/SurfZoneRunner';
import { AttachedRider } from '../physics/AttachedRider';
import { BoardBody } from '../physics/BoardBody';
import { PlaneWater } from '../physics/PlaneWater';
import { BOARD_SHEET_STRIDE, createBoardSpraySheet, unpackBoardSheets } from '../physics/boardSpray';
import { POSE_BYTES, createPose, encodeBundle, encodePose } from './poseCodec';
import { RemoteSurfers, createRemoteState } from './RemoteSurfers';
import { RemoteSpray } from './remoteSpray';

const look = { body: 'surfer1', outfit: 'fullsuit', color: 'teal', board: 'classic' };
const STANDING = RIDER_PHASES.indexOf('standing');
/** `circling`'s packed sheets with `snapFan: 'old'`, on the code before snap-fan (main 0b515dff). */
const BEFORE_SNAP_FAN = 4294379235;

/**
 * Player 1's board at sea step `step`, `z` m along, trimmed 4° nose up and rolled `roll` rad about its length, its centre
 * `lift` m over the water.
 */
function pose(step: number, z: number, roll: number, lift = 0): ArrayBuffer {
  const q = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), roll)
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), (-4 * Math.PI) / 180));
  const p = createPose();
  Object.assign(p, { step, x: 0, z, lift, qx: q.x, qy: q.y, qz: q.z, qw: q.w, phase: STANDING, present: true, boardPresent: true });
  const bytes = new Uint8Array(POSE_BYTES);
  encodePose(p, new DataView(bytes.buffer), 0);
  return encodeBundle([{ id: 1, pose: bytes }]).buffer as ArrayBuffer;
}

/** The packed sheets player 1's board throws, drawn at its second pose, from poses 6 steps apart `run` m apart. */
function sheetsOf(run: number, roll: number, lift = 0): Float32Array | undefined {
  const remote = new RemoteSurfers();
  remote.join({ id: 1, name: 'Ana', look });
  remote.receiveBundle(pose(600, 0, roll, lift), 0, []);
  remote.receiveBundle(pose(606, run, roll, lift), 100, []);
  const state = createRemoteState();
  const seaTime = 606 * SURF_ZONE_STEP;
  expect(remote.sample(1, seaTime, state)).toBe(true);
  const spray = new RemoteSpray();
  spray.begin();
  spray.add(remote, 1, seaTime, state, () => 0);
  return spray.packed();
}

/** A pose of player 1's board at sea step `step` (its board's own centre and orientation), as `ownPose` sends it. */
function poseOf(step: number, x: number, z: number, lift: number, q: Quaternion): ArrayBuffer {
  const p = createPose();
  Object.assign(p, { step, x, z, lift, qx: q.x, qy: q.y, qz: q.z, qw: q.w, phase: STANDING, present: true, boardPresent: true });
  const bytes = new Uint8Array(POSE_BYTES);
  encodePose(p, new DataView(bytes.buffer), 0);
  return encodeBundle([{ id: 1, pose: bytes }]).buffer as ArrayBuffer;
}

/** FNV-1a over the bits of each number: one hash for a run's packed sheets. */
function hashOf(values: ArrayLike<number>[]): number {
  let h = 0x811c9dc5;
  const view = new DataView(new ArrayBuffer(8));
  for (const list of values) {
    for (let k = 0; k < list.length; k += 1) {
      view.setFloat64(0, list[k]);
      for (let i = 0; i < 8; i += 1) h = Math.imul(h ^ view.getUint8(i), 0x01000193) >>> 0;
    }
  }
  return h >>> 0;
}

/**
 * The packed sheets thrown, frame by frame, from a board circling at `rate` rad/s and `speed` m/s, rolled 35° into the
 * turn and trimmed 8° nose up, its centre `lift` m over still water, its poses 20 a second.
 */
function circling(spray: RemoteSpray, speed: number, rate: number, lift = -0.02): Float32Array[] {
  const remote = new RemoteSurfers();
  remote.join({ id: 1, name: 'Ana', look });
  const state = createRemoteState();
  const out: Float32Array[] = [];
  const tilt = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), (-35 * Math.PI) / 180)
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), (-8 * Math.PI) / 180));
  for (let step = 0; step <= 60; step += 3) {
    const t = step * SURF_ZONE_STEP;
    // Turning toward +x (to its left, the +x rail down): the heading from +z by rate·t, on a circle of speed / rate.
    const heading = rate * t;
    const radius = speed / rate;
    const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), heading).multiply(tilt);
    remote.receiveBundle(poseOf(step, radius * (1 - Math.cos(heading)), radius * Math.sin(heading), lift, q), t * 1000, []);
    if (step < 6) continue;
    expect(remote.sample(1, t, state)).toBe(true);
    spray.begin();
    spray.add(remote, 1, t, state, () => 0);
    out.push(spray.packed() ?? new Float32Array(0));
  }
  return out;
}

describe('other players\' spray from their poses (board-spray)', () => {
  // snap-fan (2026-11-05; the water-physics advisor's ruling §3a): each patch at v + ω × (R·local), ω from the two poses.
  it('turns each patch with its board\'s spin, so a replayed hard turn throws as the board did (snap-fan)', () => {
    // The player's own board: Snap and a full steer from 7 m/s on still water (the pad's instant input), its poses at 20 Hz.
    const board = new BoardBody();
    board.place(new Vector3(0, board.shape.centerOfMass.y, 0), new Quaternion(), new Vector3(0, 0, 7));
    const rider = new AttachedRider(board.shape, { phase: 'standing' });
    board.attach(rider);
    const water = new PlaneWater();
    const remote = new RemoteSurfers();
    remote.join({ id: 1, name: 'Ana', look });
    const sprays = { spin: new RemoteSpray(), old: new RemoteSpray({ snapFan: 'old' }) };
    const state = createRemoteState();
    const local = [createBoardSpraySheet(), createBoardSpraySheet()];
    const apex = (vy: number) => (vy > 0 ? (vy * vy) / (2 * 9.81) : 0);
    const errors = { spin: [] as number[], old: [] as number[], spinMean: [] as number[], oldMean: [] as number[] };
    const highest = { local: 0, spin: 0, old: 0 };
    for (let n = 0; n < 72; n += 1) {
      const t = n * SURF_ZONE_STEP;
      rider.steer = t < 0.2 ? 0 : -1;
      rider.snap = t >= 0.2 && t < 0.8 ? 1 : 0;
      board.step(SURF_ZONE_STEP, water);
      expect(rider.attached).toBe(true);
      const step = n + 1;
      if (step % 3 !== 0) continue;
      remote.receiveBundle(poseOf(step, board.position.x, board.position.z, board.position.y, board.orientation), step * SURF_ZONE_STEP * 1000, []);
      if (step < 30) continue;
      const seaTime = step * SURF_ZONE_STEP;
      expect(remote.sample(1, seaTime, state)).toBe(true);
      const count = board.spraySheets(local, 0);
      for (const [name, spray] of Object.entries(sprays) as ['spin' | 'old', RemoteSpray][]) {
        spray.begin();
        spray.add(remote, 1, seaTime, state, () => 0);
        const packed = spray.packed();
        const drawn = packed ? unpackBoardSheets(packed) : [];
        for (const sheet of local.slice(0, count)) {
          if (sheet.flux < 10) continue;
          highest.local = Math.max(highest.local, name === 'spin' ? apex(sheet.aftVY) : 0);
          const twin = drawn.find((other) => other.side === sheet.side);
          expect(twin).toBeDefined();
          errors[name].push(Math.abs(apex(twin!.aftVY) - apex(sheet.aftVY)) / apex(sheet.aftVY));
          errors[name === 'spin' ? 'spinMean' : 'oldMean'].push(Math.abs(twin!.fluxMean - sheet.fluxMean));
          highest[name] = Math.max(highest[name], apex(twin!.aftVY));
        }
      }
    }
    const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
    expect(errors.spin.length).toBeGreaterThan(10);
    // Within 15 % of the board's own aft apex and 0.1 of its fluxMean (the advisor's bar), over the throw and at its top
    // (measured: 12 % and 0.007 median, the top 1.31 m against 1.20; without the spin 19 % and 0.05, the top 0.97 m).
    expect(median(errors.spin)).toBeLessThan(0.15);
    expect(median(errors.spinMean)).toBeLessThan(0.1);
    expect(Math.abs(highest.spin - highest.local) / highest.local).toBeLessThan(0.15);
    expect(median(errors.spin)).toBeLessThan(median(errors.old));
    expect(highest.old).toBeLessThan(0.85 * highest.local);
  });

  it('throws as before snap-fan with `snapFan: \'old\'`, bit for bit; spinning, the tail\'s faster jet', () => {
    // The same circling board on the code before snap-fan (main 0b515dff).
    expect(hashOf(circling(new RemoteSpray({ snapFan: 'old' }), 7, 4))).toBe(BEFORE_SNAP_FAN);
    // Spinning at 4 rad/s, the tail sweeps out under the high rail: its aft jet rises faster than without the spin.
    const spin = circling(new RemoteSpray(), 7, 4).map((packed) => unpackBoardSheets(packed));
    const old = circling(new RemoteSpray({ snapFan: 'old' }), 7, 4).map((packed) => unpackBoardSheets(packed));
    const top = (frames: ReturnType<typeof unpackBoardSheets>[]) => Math.max(0, ...frames.flat().map((sheet) => sheet.aftVY));
    expect(top(spin)).toBeGreaterThan(1.2 * top(old));
    // Still: nothing changes but the spin's (a board running straight throws as before).
    expect(hashOf(circling(new RemoteSpray(), 7, 1e-9))).toBe(hashOf(circling(new RemoteSpray({ snapFan: 'old' }), 7, 1e-9)));
  });

  it('throws a banked board\'s sheet from its pose on this water, by the same hull model', () => {
    // 1 m in a tenth of a second: 10 m/s, rolled 30° onto a rail.
    const packed = sheetsOf(1, (30 * Math.PI) / 180);
    expect(packed).toBeDefined();
    expect(packed!.length % BOARD_SHEET_STRIDE).toBe(0);
    const sheets = unpackBoardSheets(packed!);
    expect(sheets.reduce((sum, sheet) => sum + sheet.flux, 0)).toBeGreaterThan(1);
    for (const sheet of sheets) expect(sheet.vy).toBeGreaterThan(0);
  });

  it('marks each sheet with its player and side for its curtain, and its tear where its water went (spray-sheet)', () => {
    for (const run of [0.4, 0.6, 1]) {
      const sheets = unpackBoardSheets(sheetsOf(run, (35 * Math.PI) / 180)!);
      for (const sheet of sheets) {
        // Player 1's (its id + 1: the player's own board is 0), on one side or the other.
        expect(sheet.source).toBe(2);
        expect(Math.abs(sheet.side)).toBe(1);
        expect(sheet.breakup).toBeGreaterThanOrEqual(0);
        if (sheet.breakup > 0) {
          // Flown on from its root for its tear time: out and down by gravity's share.
          expect(sheet.tearY).toBeCloseTo(sheet.y + sheet.vy * sheet.breakup - 0.5 * 9.81 * sheet.breakup ** 2, 3);
          expect(sheet.tearVY).toBeCloseTo(sheet.vy - 9.81 * sheet.breakup, 3);
        }
      }
    }
  });

  it('throws nothing from a board at rest or out of the water', () => {
    expect(sheetsOf(0, (30 * Math.PI) / 180)).toBeUndefined();
    expect(sheetsOf(1, (30 * Math.PI) / 180, 1)).toBeUndefined();
  });
});
