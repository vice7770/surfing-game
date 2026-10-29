import { buildBoardShape } from '../physics/boardShape';
import { createHullSprayBuffers, createBoardSpraySheet, hullSprayLayout, hullSpraySheets, packBoardSheets, BOARD_SHEETS } from '../physics/boardSpray';
import type { BoardSpraySheet } from '../wave/SprayCloud';
import { createRemoteState, type RemoteState, type RemoteSurfers } from './RemoteSurfers';

/** The board's velocity is read over this much of the drawn past, s: a pose's span (20 a second). */
const VELOCITY_SPAN = 0.05;

/**
 * Other players' spray (board-spray, 2026-10-29): each board's sheets from its drawn pose on this player's own water,
 * by the same hull model as the player's own (`hullSpraySheets`), its velocity from the pose a span before. The water's
 * own flow is not known on the page and is taken as still. Packed for the worker's spray (`PhysicalMode.setRemoteSheets`).
 */
export class RemoteSpray {
  private readonly layout = hullSprayLayout(buildBoardShape());
  private readonly hull = createHullSprayBuffers(this.layout.stations, this.layout.lanes, this.layout.stationLength);
  private readonly before = createRemoteState();
  private readonly sheets: BoardSpraySheet[] = Array.from({ length: BOARD_SHEETS }, createBoardSpraySheet);
  private readonly all: BoardSpraySheet[] = [];

  constructor() {
    this.hull.width.set(this.layout.width);
    for (let o = 0; o < this.layout.stations * this.layout.lanes; o += 1) this.hull.across[o] = this.layout.local[o * 3];
  }

  /** Start a frame's sheets. */
  begin(): void {
    this.all.length = 0;
  }

  /** Add the sheets of player `id`'s board, drawn `state` at `seaTime` (`RemoteSurfers.sample`), on the water at `heightAt`. */
  add(remote: RemoteSurfers, id: number, seaTime: number, state: RemoteState, heightAt: (x: number, z: number) => number): void {
    if (!state.boardPresent || !remote.sample(id, seaTime - VELOCITY_SPAN, this.before)) return;
    const { layout, hull } = this;
    const [qx, qy, qz, qw] = state.quaternion;
    // The board's axes (the quaternion's rotation matrix columns).
    const r0 = 1 - 2 * (qy * qy + qz * qz); const r1 = 2 * (qx * qy - qz * qw); const r2 = 2 * (qx * qz + qy * qw);
    const r3 = 2 * (qx * qy + qz * qw); const r4 = 1 - 2 * (qx * qx + qz * qz); const r5 = 2 * (qy * qz - qx * qw);
    const r6 = 2 * (qx * qz - qy * qw); const r7 = 2 * (qy * qz + qx * qw); const r8 = 1 - 2 * (qx * qx + qy * qy);
    hull.axisX.set([r0, r3, r6]);
    hull.axisY.set([r1, r4, r7]);
    hull.axisZ.set([r2, r5, r8]);
    const y = heightAt(state.x, state.z) + state.lift;
    const yBefore = heightAt(this.before.x, this.before.z) + this.before.lift;
    const vx = (state.x - this.before.x) / VELOCITY_SPAN;
    const vy = (y - yBefore) / VELOCITY_SPAN;
    const vz = (state.z - this.before.z) / VELOCITY_SPAN;
    for (let o = 0; o < layout.stations * layout.lanes; o += 1) {
      const lx = layout.local[o * 3];
      const ly = layout.local[o * 3 + 1];
      const lz = layout.local[o * 3 + 2];
      const px = state.x + r0 * lx + r1 * ly + r2 * lz;
      const py = y + r3 * lx + r4 * ly + r5 * lz;
      const pz = state.z + r6 * lx + r7 * ly + r8 * lz;
      hull.point[o * 3] = px;
      hull.point[o * 3 + 1] = py;
      hull.point[o * 3 + 2] = pz;
      hull.depth[o] = heightAt(px, pz) - py;
      hull.water[o * 3] = 0;
      hull.water[o * 3 + 1] = 0;
      hull.water[o * 3 + 2] = 0;
      hull.hull[o * 3] = vx;
      hull.hull[o * 3 + 1] = vy;
      hull.hull[o * 3 + 2] = vz;
      hull.sea[o] = 1;
    }
    const count = hullSpraySheets(hull, this.sheets);
    // Fresh sheets for each board: the next board reuses the scratch.
    for (let n = 0; n < count; n += 1) this.all.push({ ...this.sheets[n] });
  }

  /** This frame's sheets, packed; undefined with none. */
  packed(): Float32Array | undefined {
    return this.all.length ? packBoardSheets(this.all) : undefined;
  }
}
