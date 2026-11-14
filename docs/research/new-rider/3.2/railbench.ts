/**
 * Step 3.2u: **the rail band's own bench** — the water's force on the hull at a known roll, trim, speed and immersion,
 * with no rider and no wave, so the advisor's predictions can be scored one at a time before any ride is run.
 *
 * Why a bench and not a ride. The advisor's score card for this round is a set of per-roll-bin numbers (the band's share
 * of the hull's vertical, the suction's size and direction, the pressure's own `pressure.y / |pressure|` against
 * cos(roll), the fraction of band facets at the suction's cap) and its own build check — **`max |normal.x|` over the
 * wetted patches, which is identically 0 on the flat board by construction** (`BoardShape`'s single
 * `normal: { x: 0, … }`). A ride mixes all of that with the rider's balance and with whatever water the test happens to
 * place the board on. The bench fixes the frame, so every column here can say what it is measured against.
 *
 * **The frame, stated once.** Still water at y = 0, no flow. The board translates at `V` toward its own nose (+z in the
 * world) with no angular velocity. It is pitched **nose up by τ** (about the world x, by −τ, which is what puts the
 * bottom's normal down-and-forward and makes the water press the underside) and then **rolled by φ** about its own long
 * axis, which buries the −x rail. The immersion is set so the **deepest point of the hull** sits `d` below the still
 * surface, `d` taken from Part 17 §3's own measured buried-rail depths per roll bin, so the bench stands where the ride
 * actually stood. φ is unsigned roll from horizontal; τ is the trim, nose up positive; "centripetal" is the world
 * horizontal component **toward the buried rail**, which in a carve is toward the turn's centre.
 *
 * One substep of the hull law is taken from that placement and the ledgers are read. Buoyancy, added mass, radiation
 * and the entry term are all in the board's own ledger and are reported, but the round's question is the pressure's and
 * the suction's, and the entry term is a placement transient, so it is reported and not read.
 *
 * Run from the repository's root:
 *   npx rolldown docs/research/new-rider/3.2/railbench.ts -o <scratch>/rb.mjs --format esm --platform node
 *   node <scratch>/rb.mjs                       # the flat board, the section, and the section with its suction
 *   HULLS=rail SPEEDS=7.5 node <scratch>/rb.mjs
 *
 * Env: HULLS (flat,rail,railNoSuction), SPEEDS (m/s), TRIM (°), ROLLS (°), OUT (one JSON line a cell).
 */
import { Quaternion, Vector3 } from 'three';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { buildBoardShape } from '../../../../src/physics/BoardShape';
import { WATER } from '../../../../src/physics/hullForces';
import { createWaterSample, type SurfWater, type WaterSample } from '../../../../src/physics/SurfWater';
import { appendFileSync } from 'node:fs';

const DEG = 180 / Math.PI;
const HULLS = (process.env.HULLS ?? 'flat,rail,railNoSuction').split(',');
const SPEEDS = (process.env.SPEEDS ?? '7.5').split(',').map(Number);
const TRIM = Number(process.env.TRIM ?? 6);
const ROLLS = (process.env.ROLLS ?? '0,10,20,30,40,50,60,70,80,90').split(',').map(Number);
/**
 * The **drift**, degrees: how far the board's path lies off its own nose, **toward the high rail** — which is the way a
 * carving board slips, outward, away from the turn it is leaning into. It is the whole of the suction's driving term and
 * the reason this sweep exists: with no drift the flow runs straight along the rail, `v_rel · n` is the same on every
 * facet of a station whatever its turn angle, **no facet is leeward at all, and the band makes no suction by
 * construction** — turning a normal about the axis the flow runs along does not change `v·n`. So the band's grip is
 * bought entirely by the board's sideways slip, and the question "how much suction" is the question "how much drift".
 */
const DRIFTS = (process.env.DRIFTS ?? '0,2,5,10,15,20').split(',').map(Number);
const OUT = process.env.OUT;
/**
 * The patches across the station, and a fixed immersion instead of Part 17's per-bin depths. Both exist for the
 * advisor's own discriminator of 2026-11-14: `WET_RAMP` is applied to a share keyed on the patch **centre**, so with 4
 * across the outermost centre sits 0.176 m out and dries fully by about 1.6° of roll, switching a quarter of the
 * station's lift off at a 0.176 m lever inside three degrees — a wall at the toe of the roll curve. The section's band
 * facets reach the rail itself, so they have no such wall. `ACROSS=12` on the **flat** board is the control that tells
 * resolution from shape: it is a parameter of `buildBoardShape`, not a new hull.
 */
const ACROSS = Number(process.env.ACROSS ?? 4);
const DEPTH_FIX = process.env.DEPTH_FIX ? Number(process.env.DEPTH_FIX) : undefined;

/** Part 17 §3's measured buried-rail depth (m) by roll bin, so the bench's immersion is the ride's own. */
const DEPTH: Array<[number, number]> = [[0, 0.055], [10, 0.109], [20, 0.172], [30, 0.177], [40, 0.173], [50, 0.254], [60, 0.260], [70, 0.207], [80, 0.150], [90, 0.150]];
const depthAt = (roll: number): number => {
  let best = DEPTH[0];
  for (const row of DEPTH) if (Math.abs(row[0] - roll) < Math.abs(best[0] - roll)) best = row;
  return best[1];
};

/** Still, flat, motionless water at y = 0, deep enough that nothing touches the bed. Test-only. */
class StillWater implements SurfWater {
  sampleAt(_x: number, y: number, _z: number, out: WaterSample): WaterSample {
    out.wet = true;
    out.outsideDomain = false;
    out.surfaceY = 0;
    out.stillDepth = 8;
    out.waterDepth = 8;
    out.bedY = -8;
    out.regime = 'profile';
    out.slopeX = 0;
    out.slopeZ = 0;
    out.normalX = 0;
    out.normalY = 1;
    out.normalZ = 0;
    out.flowX = 0;
    out.flowY = 0;
    out.flowZ = 0;
    out.breaking = 0;
    out.voidFraction = 0;
    out.covered = false;
    out.waterFloorY = undefined;
    out.ceilingY = undefined;
    out.buoyancyNormal = undefined;
    out.wallWater = false;
    out.wallFollow = false;
    out.flowAccelX = undefined;
    out.lensScale = undefined;
    out.lensShare = undefined;
    out.lensReach = undefined;
    out.lensGrip = undefined;
    out.lensThickness = undefined;
    out.lensFlowX = undefined;
    out.lensFlowZ = undefined;
    out.lensSpeedX = undefined;
    out.lensSpeedZ = undefined;
    void y;
    return out;
  }

  advance(): void {}

  addReaction(): void {}
}

const X = new Vector3(1, 0, 0);
const Z = new Vector3(0, 0, 1);

/** The hull's lowest world point at this pose, relative to the board's own origin. */
function lowest(board: BoardBody, orientation: Quaternion): number {
  let low = Infinity;
  const v = new Vector3();
  for (const patch of board.shape.patches) {
    v.set(patch.position.x, patch.position.y, patch.position.z).applyQuaternion(orientation);
    low = Math.min(low, v.y);
  }
  return low;
}

interface Row { [key: string]: number | string }

function cell(hull: string, speed: number, roll: number, drift: number): Row {
  const board = new BoardBody({
    ...(hull === 'flat' ? {} : { hull: 'rail' as const }),
    ...(hull === 'railNoSuction' ? { railSuction: 'off' as const } : {}),
    ...(ACROSS === 4 ? {} : { shape: buildBoardShape(undefined, 12, ACROSS, hull === 'flat' ? 'flat' : 'rail') }),
    substeps: 1,
  });
  const orientation = new Quaternion().setFromAxisAngle(X, (-TRIM * Math.PI) / 180)
    .multiply(new Quaternion().setFromAxisAngle(Z, (roll * Math.PI) / 180));
  const depth = DEPTH_FIX ?? depthAt(roll);
  // The deepest point of the hull `depth` under the still surface, the board's origin placed to put it there.
  const y = -depth - lowest(board, orientation);
  // The path: the board's nose, yawed `drift` toward its high rail, kept horizontal (a board skating on the surface).
  const nose = new Vector3(0, 0, 1).applyQuaternion(orientation).setY(0).normalize();
  const high = new Vector3(1, 0, 0).applyQuaternion(orientation).setY(0).normalize();
  const path = nose.clone().addScaledVector(high, Math.tan((drift * Math.PI) / 180)).normalize().multiplyScalar(speed);
  board.place(new Vector3(0, y, 0), orientation, path);
  const water = new StillWater();
  const h = 1 / 240;
  board.step(h, water);
  /**
   * The net roll the water puts on the board, rad/s², read straight off the angular velocity one substep from rest, so
   * it needs no torque ledger: **positive means the water is taking the board further over onto its buried rail.** This
   * is the column that tells the section's own effect on the roll apart from the suction's and from the rail side
   * faces', because all three are in the same number and the three hulls differ only in those.
   */
  const spin = new Vector3(0, 0, 1).applyQuaternion(orientation);
  const rollAccel = board.angularVelocity.dot(spin) / h;
  const weight = (board.mass + 73) * WATER.gravity;
  const f = board.forces;
  const L = board.bandLedger;
  const press = Math.hypot(f.pressure.x, f.pressure.y, f.pressure.z);
  const suct = Math.hypot(L.suction.x, L.suction.y, L.suction.z);
  // Toward the buried rail: rolled by +φ about the board's long axis, the board's −x rail goes down, and its world
  // direction is the rotation's first column negated.
  const inward = new Vector3(-1, 0, 0).applyQuaternion(orientation);
  const lateral = Math.hypot(inward.x, inward.z) > 1e-9 ? new Vector3(inward.x, 0, inward.z).normalize() : new Vector3(-1, 0, 0);
  const r = (x: number, n = 3) => Number(x.toFixed(n));
  return {
    hull, speed, across: ACROSS, rollDeg: roll, driftDeg: drift, trimDeg: TRIM, railDepth: r(depth),
    // The water's net roll torque, N·m, which is the roll acceleration times the board's own roll inertia: the two
    // hulls' inertias differ by 8 %, so the torque and not the acceleration is what compares between them.
    rollTorqueNm: r(rollAccel * board.shape.inertia[8], 2),
    wettedArea: r(board.wettedArea, 4),
    // The advisor's build check: 0 on the flat board by construction, ≥ sin(the wetted band's own turn) with the band.
    maxNormalX: r(L.maxNormalX),
    bandFacetsWet: L.wetFacets, bandWetArea: r(L.wetArea, 4), bandAreaShare: r(board.wettedArea > 0 ? L.wetArea / board.wettedArea : 0),
    // In system weights (board + the reference 73 kg rider), on the world vertical, as Part 17 reports.
    pressureUp: r(f.pressure.y / weight), pressureMag: r(press / weight),
    // The sideways force the round is for, in newtons, toward the buried rail — COMPRESS_PULL's own 0.19 g is 141 N on
    // this system. The flat board and the section are the same pose, the same immersion and the same foils here, so the
    // difference between their rows is the cross-section's normals and nothing else.
    pressureInN: r(f.pressure.x * lateral.x + f.pressure.z * lateral.z, 1),
    buoyancyInN: r(f.buoyancy.x * lateral.x + f.buoyancy.z * lateral.z, 1),
    railsInN: r(f.rails.x * lateral.x + f.rails.z * lateral.z, 1),
    finsInN: r(f.fins.x * lateral.x + f.fins.z * lateral.z, 1),
    // Part 17's identity: this equalled cos(roll) to within 0.008–0.077 in all eighteen bins.
    pressureRatio: r(press > 0 ? f.pressure.y / press : 0), cosRoll: r(Math.cos((roll * Math.PI) / 180)),
    bandPressureUp: r(L.pressure.y / weight), bandVerticalShare: r(Math.abs(f.pressure.y) > 1e-6 ? L.pressure.y / f.pressure.y : 0),
    suctionN: r(suct, 1), suctionUpN: r(L.suction.y, 1), suctionInwardN: r(L.suction.x * lateral.x + L.suction.z * lateral.z, 1),
    suctionUpW: r(L.suction.y / weight), suctionInwardW: r((L.suction.x * lateral.x + L.suction.z * lateral.z) / weight),
    suctionPa: r(L.pressurePa, 0), capPa: r(L.capPa, 0), cappedShare: r(L.cappedShare), ventedShare: r(L.ventedShare),
    rollMomentNm: r(L.rollMoment, 2),
    buoyancyUp: r(f.buoyancy.y / weight), frictionUp: r(f.friction.y / weight), finsUp: r(f.fins.y / weight), railsUp: r(f.rails.y / weight),
    rollAccel: r(rollAccel, 2),
    taper: r(board.shape.taper, 4), patches: board.shape.patches.length, volume: r(board.shape.volume, 6),
    rollInertia: r(board.shape.inertia[8], 4),
  };
}

const rows: Row[] = [];
for (const hull of HULLS) {
  for (const speed of SPEEDS) {
    for (const roll of ROLLS) {
      for (const drift of DRIFTS) {
        const row = cell(hull, speed, roll, drift);
        rows.push(row);
        if (OUT) appendFileSync(OUT, `${JSON.stringify(row)}\n`);
      }
    }
  }
}

const show = (keys: string[], title: string) => {
  console.log(`\n${title}`);
  console.log(['hull', 'V', 'roll', 'drift', ...keys].join('\t'));
  for (const row of rows) console.log([row.hull, row.speed, row.rollDeg, row.driftDeg, ...keys.map((k) => row[k])].join('\t'));
};
show(['maxNormalX', 'bandFacetsWet', 'bandWetArea', 'bandAreaShare', 'wettedArea'], 'The band, wetted (the build check: maxNormalX is 0 on the flat board by construction)');
show(['pressureUp', 'pressureMag', 'pressureRatio', 'cosRoll', 'bandPressureUp', 'bandVerticalShare'], 'The pressure, in system weights, and Part 17\'s cos(roll) identity');
show(['pressureInN', 'buoyancyInN', 'railsInN', 'finsInN', 'suctionInwardN'], 'The sideways force toward the buried rail, N (COMPRESS_PULL fakes 141 N)');
show(['suctionN', 'suctionUpN', 'suctionInwardN', 'suctionUpW', 'suctionInwardW', 'suctionPa', 'capPa', 'cappedShare', 'ventedShare', 'rollMomentNm'], 'The band\'s suction (N, and system weights; inward = toward the buried rail)');
show(['rollTorqueNm', 'rollAccel', 'buoyancyUp', 'frictionUp', 'finsUp', 'railsUp', 'taper', 'volume', 'rollInertia'], 'The roll the water puts on the board (rad/s², + = further onto the buried rail), the rest of the ledger, and the shape');
console.log(`\n${DEG > 0 ? '' : ''}${rows.length} cells · trim ${TRIM}° nose up · immersion from Part 17 §3's measured buried-rail depths · system weight = board + 73 kg`);
