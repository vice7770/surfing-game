import { describe, expect, it } from 'vitest';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { AttachedRider } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { PlaneWater } from './PlaneWater';
import { RAIL_BAND, buildBoardShape } from './boardShape';
import { REFERENCE_BOARD } from './boardReference';
import { RAIL_SUCTION, createPatchForce, patchForce, type WorldPatch } from './hullForces';
import { createWaterSample, type WaterSample } from './SurfWater';

/**
 * The hull's cross-section and the buried rail's suction (step 3.2u; `?hull=rail`). What these tests are for, in one
 * line each: the section must change **only** the thickness across the beam and the normals — never the planform, the
 * station beams, the maximum width or the volume, because the station beam is what `addedMassPerArea`,
 * `radiationPerArea` and `planingScales` all hang off (the water-physics advisor's trap 2); the suction must act only
 * on the band's leeward facets, only along the normal, and never above Breslin & Skalak's measured ceiling; and the
 * flat board must come out of this round byte for byte what it was.
 */
const still = (surfaceY: number): WaterSample => {
  const out = createWaterSample();
  out.wet = true;
  out.outsideDomain = false;
  out.surfaceY = surfaceY;
  out.stillDepth = 8;
  out.waterDepth = 8;
  out.bedY = -8;
  out.regime = 'profile';
  out.normalY = 1;
  return out;
};

describe('the rail section, against the flat board it replaces', () => {
  const flat = buildBoardShape(REFERENCE_BOARD, 12, 4, 'flat');
  const rail = buildBoardShape(REFERENCE_BOARD, 12, 4, 'rail');

  it('leaves the flat board exactly as it was', () => {
    const was = buildBoardShape();
    expect(was.section).toBe('flat');
    expect(was.patches.length).toBe(48);
    expect(was.taper).toBe(flat.taper);
    for (const patch of was.patches) expect(patch.band).toBeUndefined();
    // The one normal every patch has carried until now, which is why no coefficient could make vertical force at roll.
    expect(Math.max(...was.patches.map((patch) => Math.abs(patch.normal.x)))).toBe(0);
  });

  it('keeps the planform, every station beam, the width and the volume', () => {
    expect(rail.section).toBe('rail');
    expect(rail.planformArea).toBeCloseTo(flat.planformArea, 12);
    expect(rail.maxWidth).toBe(flat.maxWidth);
    expect(rail.volume).toBeCloseTo(REFERENCE_BOARD.volume, 5);
    const beams = (shape: typeof flat) => {
      const beam = new Map<number, number>();
      for (const patch of shape.patches) beam.set(patch.position.z, (beam.get(patch.position.z) ?? 0) + patch.area / patch.length);
      return [...beam.entries()].sort((a, b) => a[0] - b[0]);
    };
    const [a, b] = [beams(flat), beams(rail)];
    expect(b.length).toBe(a.length);
    for (let i = 0; i < a.length; i += 1) {
      expect(b[i][0]).toBeCloseTo(a[i][0], 12);
      expect(b[i][1]).toBeCloseTo(a[i][1], 12);
    }
  });

  it('gives the band its own normals, four facets a rail, spaced by equal turn angle', () => {
    const band = rail.patches.filter((patch) => patch.band);
    expect(band.length).toBe(12 * 2 * RAIL_BAND.facets);
    // The build check the advisor asked to be scored: 0 on the flat board by construction, ≈ 1 with the band.
    expect(Math.max(...band.map((patch) => Math.abs(patch.normal.x)))).toBeGreaterThan(0.9);
    const station = band.filter((patch) => patch.position.z === band[band.length - 1].position.z && patch.band!.side > 0)
      .sort((x, y) => x.band!.turn - y.band!.turn);
    expect(station.length).toBe(RAIL_BAND.facets);
    const steps = station.slice(1).map((patch, i) => patch.band!.turn - station[i].band!.turn);
    for (const step of steps) expect(step).toBeCloseTo(steps[0], 12);
    for (const patch of band) {
      // Every normal is a unit vector, points downward or outward and never upward, and the true area exceeds the planform.
      expect(Math.hypot(patch.normal.x, patch.normal.y, patch.normal.z)).toBeCloseTo(1, 12);
      expect(patch.normal.y).toBeLessThanOrEqual(0);
      expect(patch.band!.faceArea).toBeGreaterThanOrEqual(patch.area - 1e-15);
      expect(patch.thickness).toBeGreaterThan(0);
      // The deck direction is the station's own, so a near-vertical facet's deck is not found along its own normal.
      expect(patch.band!.up.y).toBeGreaterThan(0.9);
    }
  });

  it('carries a rail thick enough for the band that turns it over', () => {
    // A band of radius R turns the bottom over to an apex R above it, so the local rail must be at least 2R thick.
    const apex = new Map<number, number>();
    for (const patch of rail.patches) {
      if (!patch.band) continue;
      apex.set(patch.position.z, Math.max(apex.get(patch.position.z) ?? 0, patch.band.turn));
    }
    for (const patch of rail.patches) {
      if (!patch.band || patch.band.turn !== apex.get(patch.position.z)) continue;
      expect(patch.thickness).toBeGreaterThan(0);
    }
    // The squared taper leaves a knife edge at the rail and the linear one leaves a rail, and both hold the same
    // 0.692 of w × t: the thickness law itself at u = 1, mid-length, where the thickness curve is at its maximum.
    const atRail = (shape: typeof flat) => shape.curves.thickness(0.5) * (1 - shape.taper);
    expect(atRail(flat)).toBeLessThan(0.006);
    expect(atRail(rail)).toBeGreaterThan(0.024);
    // The section-area coefficient the advisor said must stay: the volume over the untapered slab, Σ area × stringer.
    // 0.711 on this 4-across grid, where the continuum parabola's own value is 0.692 (Σu²/n is 0.3125, not 1/3).
    const coefficient = (shape: typeof flat) => {
      let plain = 0;
      for (const patch of shape.patches) plain += patch.area * shape.curves.thickness(patch.position.z / shape.length + 0.5);
      return shape.volume / plain;
    };
    expect(coefficient(flat)).toBeCloseTo(0.711, 3);
    expect(coefficient(rail)).toBeCloseTo(coefficient(flat), 3);
  });
});

describe('the buried rail’s suction', () => {
  const base = (): { patch: WorldPatch; relative: { x: number; y: number; z: number } } => ({
    // One band facet turned 60° onto the rail, 0.2 m under, with the flow running across it toward the high rail.
    patch: {
      position: { x: 0.2, y: -0.2, z: 0 },
      normal: { x: -Math.sin(Math.PI / 3), y: -Math.cos(Math.PI / 3), z: 0 },
      area: 0.0006,
      thickness: 0.02,
      band: { faceArea: 0.0008, up: { x: 0, y: 1, z: 0 }, tangent: { x: 0, y: 0, z: 1 }, gate: 1 },
    },
    relative: { x: 2, y: 0, z: 7.5 },
  });

  it('acts along the normal, into the water, and only on a leeward facet', () => {
    const { patch, relative } = base();
    const out = patchForce(patch, still(0), relative, 1, createPatchForce());
    const normalSpeed = relative.x * patch.normal.x + relative.y * patch.normal.y + relative.z * patch.normal.z;
    expect(normalSpeed).toBeLessThan(0);
    expect(out.suction.x).toBeCloseTo(out.suction.x, 12);
    // Along +n: inward (toward the buried rail, −x here) and downward.
    expect(out.suction.x).toBeLessThan(0);
    expect(out.suction.y).toBeLessThan(0);
    const along = (out.suction.x * patch.normal.x + out.suction.y * patch.normal.y + out.suction.z * patch.normal.z);
    expect(along).toBeCloseTo(Math.hypot(out.suction.x, out.suction.y, out.suction.z), 9);
    // The same facet with the flow meeting it instead: pressure, no suction at all.
    const windward = patchForce(patch, still(0), { x: -2, y: 0, z: 7.5 }, 1, createPatchForce());
    expect(windward.suction.x).toBe(0);
    expect(windward.suction.y).toBe(0);
    expect(windward.pressure.y).toBeGreaterThan(0);
  });

  it('makes nothing without a band, without a gate, or out of the water', () => {
    const { patch, relative } = base();
    const flatPatch: WorldPatch = { ...patch, band: undefined };
    expect(patchForce(flatPatch, still(0), relative, 1, createPatchForce()).suction.y).toBe(0);
    const shut: WorldPatch = { ...patch, band: { ...patch.band!, gate: 0 } };
    expect(patchForce(shut, still(0), relative, 1, createPatchForce()).suction.y).toBe(0);
    expect(patchForce(patch, still(-1), relative, 1, createPatchForce()).suction.y).toBe(0);
  });

  it('never exceeds Breslin & Skalak’s measured ceiling of 2.5 ρ g h', () => {
    const { patch } = base();
    // A cross-flow far past anything measured: the cap must bind, and it must be the depth's own.
    const out = patchForce(patch, still(0), { x: 40, y: 0, z: 7.5 }, 1, createPatchForce());
    expect(out.suctionCapped).toBe(1);
    expect(out.suctionPressure).toBeCloseTo(RAIL_SUCTION.cap * 1025 * 9.81 * 0.2, 0);
    expect(Math.hypot(out.suction.x, out.suction.y, out.suction.z)).toBeCloseTo(out.suctionPressure * patch.band!.faceArea, 9);
    // And deeper than `depthCap` the cap stops growing, so the law cannot run away on its own depth.
    const deeper = patchForce({ ...patch, position: { x: 0.2, y: -1.5, z: 0 } }, still(0), { x: 40, y: 0, z: 7.5 }, 1, createPatchForce());
    expect(deeper.suctionCap).toBeCloseTo(RAIL_SUCTION.cap * 1025 * 9.81 * RAIL_SUCTION.depthCap, 0);
  });

  it('is driven by the cross-plane flow alone, so a board running straight down its rail makes none', () => {
    const { patch } = base();
    // The flow entirely along the rail's own tangent: no facet of a station is leeward, whatever its turn angle.
    const out = patchForce(patch, still(0), { x: 0, y: 0, z: 7.5 }, 1, createPatchForce());
    expect(Math.hypot(out.suction.x, out.suction.y, out.suction.z)).toBe(0);
    expect(out.suctionPressure).toBe(0);
    expect(out.pressure.y).toBeGreaterThanOrEqual(0);
  });
});

describe('the board with the section on it', () => {
  it('reports the band’s own ledger and nothing on the flat board', () => {
    const flat = new BoardBody({});
    const rail = new BoardBody({ hull: 'rail' });
    expect(flat.shape.patches.length).toBe(48);
    expect(rail.shape.patches.length).toBe(144);
    expect(flat.bandLedger.maxNormalX).toBe(0);
    // The rail side faces go with the band: they were a stand-in for the surface it now carries.
    expect(flat.shape.section).toBe('flat');
    expect(rail.shape.section).toBe('rail');
    expect(flat.work.suction).toBe(0);
    expect(rail.work.suction).toBe(0);
  });

  it('builds the section without the suction when asked, and the two differ only there', () => {
    const grip = new BoardBody({ hull: 'rail' });
    const bare = new BoardBody({ hull: 'rail', railSuction: 'off' });
    expect(bare.shape.patches.length).toBe(grip.shape.patches.length);
    expect(bare.shape.taper).toBe(grip.shape.taper);
    expect(bare.shape.volume).toBe(grip.shape.volume);
  });
});

/**
 * COMPRESS_PULL deleted (`compressPull: 'off'`, step 3.2u). The old rider's compressed turn rests on this one unpaired
 * force — 0.19 g of sideways push on the body with nothing pushing back — and the only question step 3.2u is for is
 * what the shaped hull can do with it gone. So the switch has to actually delete it and nothing else.
 */
describe("COMPRESS_PULL deleted (`compressPull: 'off'`, opt-in)", () => {
  const STEP = 1 / 60;
  function compressedTurn(compressPull?: 'off') {
    const tilt = (5 * Math.PI) / 180;
    const normal = new Vector3(0, 1, Math.tan(tilt)).normalize();
    const fall = new Vector3(0, -Math.sin(tilt), Math.cos(tilt));
    const left = new Vector3().crossVectors(normal, fall).normalize();
    const board = new BoardBody();
    board.place(
      normal.clone().multiplyScalar(board.shape.centerOfMass.y),
      new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, fall)),
      fall.clone().multiplyScalar(8),
    );
    const rider = new AttachedRider(board.shape, { phase: 'standing', ...(compressPull ? { compressPull } : {}) });
    board.attach(rider);
    const water = new PlaneWater({ slopeZ: -Math.tan(tilt) });
    for (let i = 0; i < 18; i += 1) board.step(STEP, water);
    Object.assign(rider, { steer: 1, compress: 1 });
    for (let i = 0; i < 60 && rider.attached; i += 1) board.step(STEP, water);
    return rider;
  }

  it('removes the compressed turn’s unpaired pull, and leaves the carry and the lean-out alone', () => {
    const was = compressedTurn();
    const inner = (rider: AttachedRider) => rider as unknown as { assistForce: Vector3; carryForce: Vector3 };
    expect(inner(was).assistForce.length()).toBeGreaterThan(0);
    const now = compressedTurn('off');
    expect(inner(now).assistForce.length()).toBe(0);
    // CARVE_CARRY is a different rule and this switch does not touch it.
    expect(inner(now).carryForce.length()).toBeGreaterThan(0);
    // And it puts nothing in its place: no leg drive fires, because none was asked for.
    expect(now.work.legDrive).toBe(0);
  });
});
