import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { RIDER_PHASES, SURF_ZONE_STEP } from '../wave/SurfZoneRunner';
import { BOARD_SHEET_STRIDE, unpackBoardSheets } from '../physics/boardSpray';
import { POSE_BYTES, createPose, encodeBundle, encodePose } from './poseCodec';
import { RemoteSurfers, createRemoteState } from './RemoteSurfers';
import { RemoteSpray } from './remoteSpray';

const look = { body: 'surfer1', outfit: 'fullsuit', color: 'teal', board: 'classic' };
const STANDING = RIDER_PHASES.indexOf('standing');

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

describe('other players\' spray from their poses (board-spray)', () => {
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
