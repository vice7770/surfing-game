/**
 * **Step 3.5e: what the wave's FOAM does to the board's roll, on the owner's own spot and his own rider.**
 *
 * The owner rode `?physical&canyonWaves=true&rider=new&feltFrame=deck&riderBody=two` and reported that the board
 * slips underneath the surfer *"on turns and on tip of the wave foam that creates instability"*. Step 3.5d answered
 * the first half (the rider's own ankle carries 45–56 % of the deck's roll acceleration). This probe is the second
 * half, and it starts from a fact about step 3.5d's own instrument: **it ran on `FaceWater`, whose every sample
 * carries `voidFraction: 0` and no roller lens at all** [R, `src/physics/testing/FaceWater.ts:81`]. So the 23-way
 * partition 3.5d published had the `froth` row identically 0 and the hull's density at clean-water ρ on every frame
 * of every arm: **the foam was absent from it by construction.** Nothing about the foam could have shown up there.
 *
 * So this probe runs 3.5d's own rig — the same `BoardBody` + `AttachedRider` placed flush and standing, the same
 * stance held, the stick never touched, the same two ledgers read — on the **real Canyon sea** (`canyonBed: 'b'`,
 * which is what `?canyonWaves=true` sets [R, `PhysicalMode.canyonBedSwitch`]), where the foam exists.
 *
 * ## The five channels the foam reaches the board through, each one a line of shipped code
 *
 * 1. **The hull's density.** `patchForce` scales the patch's water density by `(1 − voidFraction)`, and that density
 *    multiplies the hydrostatic support, the planing pressure and the friction
 *    [R, `src/physics/hullForces.ts:319`]. A foamed rail gets less of all three.
 * 2. **The roller lens's froth drag**, with its own roll torque and its own ledger row (`froth`), inside a lens's
 *    footprint only — and **only the Canyon has roller lenses** [R, `BoardBody.ts:1293–1327`, `PhysicalMode.ts:932`].
 * 3. **The lens's own flow.** `applyLens` carries the water inside the lens toward the roller's own velocity by
 *    `S(ζ)·g` and sets the regime to `bore` [R, `PhysicalSurfWater.applyLens`]. A heeled board's two rails sit at
 *    different ζ, so they sit in different water.
 * 4. **The lens's own height.** The surface a body feels is the lens's top, `depth + bottom + roller.riseAt(x, z)`
 *    [R, `PhysicalSurfWater.ts:359`] — the foam is not drawn on top of the water, it IS the water's top.
 * 5. **The plate's added mass and the planing hollow**, both in the mixture's density
 *    [R, `BoardBody.ts:2085`, `:1918`].
 *
 * And two things the foam does **not** do: the drawn whitewater coverage (`FoamField`: dense and residual lace)
 * "never feeds back into the water" and is read by no body [R, `src/wave/FoamField.ts:48`]; and the plume's
 * turbulence reaches only the detached swimmer's eddy field, never the board (`SurfWaterBodyField`, used by
 * `RideSession` for the fall body alone).
 *
 * ## The arms, and why each one is exactly one channel
 *
 * The riders read the water and never push it, so every arm shares **one** sea, stepped once per frame, and an arm is
 * a wrapper over the one `PhysicalSurfWater`:
 *
 * - `all` — the water as it ships. The baseline.
 * - `noAir` — `voidFraction = 0` on every sample, nothing else touched. That is channel 1 (and 5) exactly.
 * - `noFroth` — `lensScale = 0` after the sample is built, nothing else touched. The froth block's own gate is
 *   `sample.lensScale !== undefined && sample.lensScale > 0` [R, `BoardBody.ts:1294`], and `applyLens` has already
 *   baked the lens's flow into `flowX/flowZ` by then, so this removes channel 2 and leaves 3 and 4 alone.
 * - `none` — both.
 *
 * Channels 3 and 4 cannot be removed from a wrapper (they are the sample's flow and the surface's own height), so
 * they are named in the audit above and not A/B'd here.
 *
 * **Every arm is placed at the same frame from the same state, so frame 1's difference between two arms is exact** —
 * the two boards have identical position, orientation and velocity and differ only in the water they read. After
 * frame 1 they diverge, and the divergence is the ride.
 *
 * ## Modes
 *
 * `MODE=field` — no rider. Steps the sea and rakes the ride corridor, reporting what the foam field under a board
 * actually is: whether a lens covers the point, its thickness and grip, the void fraction at a board's own draft
 * depths, and the across-beam difference in it at the board's beam.
 *
 * `MODE=ride` — 3.5d's rig. Each time the corridor's foam toe crosses the ride line, places one rider per
 * (arm × stance × entry) flush on the face a chosen distance seaward of the toe, the stance held and the stick never
 * touched, and records per frame the same columns 3.5d read (`bankLedger.deck`'s 23-way partition, `BoardBody.roll`'s
 * N·m budget, the three angles, `apartSub`/`bookSub`) plus the foam the board is actually in, per rail.
 *
 * Read-only: no byte under `src/` or `server/` is changed. It turns the two measurement ledgers on, which
 * `bankLedger.test.ts` asserts leave the rider byte-identical.
 *
 * Run from the repository's root:
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.5/foam.ts -o <scratch>/foam.mjs --format esm --platform node
 *   MODE=field node <scratch>/foam.mjs
 *   MODE=ride RIDER=new FELT=deck BODY=two OUT=<scratch>/ride.jsonl node <scratch>/foam.mjs
 *
 * Env: `MODE=field|ride`, `SEED`, `SIZE`, `PERIODS`, `SECONDS`, `STANCES`, `ENTRIES`, `ARMS`, `AHEAD` (m seaward of
 * the foam toe), `SIDE` (° off the fall line), `TRIALS`, `RIDER=new|old`, `FELT=deck`, `BODY=two`, `OUT`.
 */
import { appendFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { surfZoneConfigFor } from '../../../../src/game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../../../../src/game/SurfConditions';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { PhysicalSurfWater } from '../../../../src/physics/PhysicalSurfWater';
import { createWaterSample, type SurfWater } from '../../../../src/physics/SurfWater';
import { bankLedger, BANK_SOURCES, type BankSource } from '../../../../src/physics/bankLedger';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../../../src/wave/SurfZoneSimulation';

const DEG = 180 / Math.PI;
const STEP = 1 / 60;
const MODE = (process.env.MODE ?? 'field') as 'field' | 'ride';
const SEED = Number(process.env.SEED ?? 1);
const SIZE = (process.env.SIZE ?? 'medium') as SwellSize;
const PERIODS = Number(process.env.PERIODS ?? 6);
const SECONDS = Number(process.env.SECONDS ?? 4);
const TRIALS = Number(process.env.TRIALS ?? 6);
/** m seaward of the foam toe the pair is placed: 0 is on the foam, positive is open face ahead of it. */
const AHEADS = (process.env.AHEAD ?? '0,2').split(',').map(Number);
const SIDE = Number(process.env.SIDE ?? -45);
/** Seconds between placements, so the trials fall on different phases of the swell. */
const GAP = Number(process.env.GAP ?? 1.5);
const STANCES = (process.env.STANCES ?? 'tall,crouch,compress').split(',') as Stance[];
const ENTRIES = (process.env.ENTRIES ?? '2,5').split(',').map(Number);
const ARMS = (process.env.ARMS ?? 'all,noAir,noFroth,none').split(',') as ArmName[];
const RIDER = process.env.RIDER ?? 'new';
const FELT = process.env.FELT as 'deck' | undefined;
const BODY = process.env.BODY as 'two' | undefined;
const OUT = process.env.OUT;
/** The void fraction at which a point counts as foamed, for the toe search and the foamed/clean tick split. */
const FOAM = 0.05;
/** Where the void fraction is read under the surface in `field` mode, m: a standing board's own draft range. */
const DRAFTS = [0.02, 0.05, 0.1, 0.2];
/** Half the board's beam, m, for the across-beam read. */
const HALF_BEAM = 0.25;

type Stance = 'tall' | 'crouch' | 'compress';
type ArmName = 'all' | 'noAir' | 'noFroth' | 'noCarry' | 'none';

const r = (v: number, n: number): number | null => (Number.isFinite(v) ? Number(v.toFixed(n)) : null);
const emit = (line: unknown): void => {
  if (OUT) appendFileSync(OUT, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
};
const DECK_KEYS = BANK_SOURCES as readonly BankSource[];

// ---------------------------------------------------------------------------------------------------------------
// The sea: the Canyon as `?canyonWaves=true` builds it.
// ---------------------------------------------------------------------------------------------------------------
const settings = physicalSettingsFor('canyon', { swell: SIZE, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'auto' });
const base = surfZoneConfigFor(settings, SEED, true);
const config: SurfZoneConfig = { ...base, compute: 'cpu', canyonBed: 'b' };
const wall = Date.now();
const sim = new SurfZoneSimulation(config);
const physical = PhysicalSurfWater.forSimulation(sim, undefined, 1);
const focus = sim.breakPoint();

/** An arm: the one sampler with one channel removed, and nothing else touched. */
function arm(name: ArmName): SurfWater {
  const noAir = name === 'noAir' || name === 'none';
  const noFroth = name === 'noFroth' || name === 'none';
  const noCarry = name === 'noCarry' || name === 'none';
  return {
    sampleAt: (x, y, z, out) => {
      const s = physical.sampleAt(x, y, z, out);
      /**
       * `noCarry`: the lens's own flow taken back out of the sample, exactly. `applyLens` writes
       * `flow = ū + S(ζ)·g·(c·n̂ − ū)`, `lensFlow = ū + g·(c·n̂ − ū)` and `lensShare = S(ζ)·g` [R], so with
       * `s = lensShare / lensScale = S(ζ)` the depth-averaged current is `ū = (flow − s·lensFlow) / (1 − s)` — an
       * identity in the three numbers the sample already carries, not a model of them.
       */
      if (noCarry && s.lensShare !== undefined && s.lensScale !== undefined && s.lensScale > 0) {
        const share = s.lensShare / s.lensScale;
        if (share < 1 - 1e-9) {
          s.flowX = (s.flowX - share * s.lensFlowX!) / (1 - share);
          s.flowZ = (s.flowZ - share * s.lensFlowZ!) / (1 - share);
          s.lensShare = 0;
        }
      }
      if (noAir) s.voidFraction = 0;
      if (noFroth && s.lensScale !== undefined) s.lensScale = 0;
      return s;
    },
    surfaceAt: (x, z) => physical.surfaceAt(x, z),
    addReaction: () => {},
    setSampleTime: (offset: number) => physical.setSampleTime(offset),
  };
}
const waters = new Map<ArmName, SurfWater>(ARMS.map((a) => [a, arm(a)]));

const scratch = createWaterSample();
const scratch2 = createWaterSample();

const XSPAN = Number(process.env.XSPAN ?? 40);
const ZMIN = Number(process.env.ZMIN ?? -25);
const ZMAX = Number(process.env.ZMAX ?? 35);
/** `FIELD=all` dumps every foamed point; otherwise only the frame's summary and its deepest-foam point. */
const FIELD = process.env.FIELD ?? 'summary';

/**
 * The foam toe on the ride line at `x`: the most seaward z whose water 0.05 m under the surface is foamed — the **tip
 * of the wave foam** the owner names — with the face's own slope there.
 */
function foamToe(x: number): { x: number; z: number; air: number; slope: number; thickness: number } | null {
  for (let z = focus.z + ZMIN; z <= focus.z + ZMAX; z += 0.5) {
    const sy = physical.surfaceAt(x, z);
    const s = physical.sampleAt(x, sy - 0.05, z, scratch);
    if (s.wet && !s.outsideDomain && (s.voidFraction ?? 0) >= FOAM) {
      return { x, z, air: s.voidFraction ?? 0, slope: Math.atan(Math.hypot(s.slopeX, s.slopeZ)) * DEG, thickness: s.lensThickness ?? 0 };
    }
  }
  return null;
}

/** Over the corridor: the foam toe on the STEEPEST face, which is where a rider meets the foam while still on a wall. */
function bestToe(): ReturnType<typeof foamToe> {
  let best: ReturnType<typeof foamToe> = null;
  for (let x = focus.x - XSPAN; x <= focus.x + XSPAN; x += 2) {
    const toe = foamToe(x);
    if (toe && (best === null || toe.slope > best.slope)) best = toe;
  }
  return best;
}

// ---------------------------------------------------------------------------------------------------------------
// MODE=field — the foam field itself, no rider.
// ---------------------------------------------------------------------------------------------------------------
interface FieldRow {
  frame: number; t: number; x: number; z: number; surfaceY: number; depth: number;
  breaking: number; regime: string; lens: 0 | 1; thickness: number | null; grip: number | null; reach: number | null;
  air: (number | null)[]; across: number | null; airLeft: number | null; airRight: number | null;
  slope: number | null; lensShare: number | null; flowJump: number | null;
}

function fieldFrame(frame: number, t: number): FieldRow[] {
  const rows: FieldRow[] = [];
  for (let x = focus.x - XSPAN; x <= focus.x + XSPAN; x += 2) {
    for (let z = focus.z + ZMIN; z <= focus.z + ZMAX; z += 1) {
      const sy = physical.surfaceAt(x, z);
      const s = physical.sampleAt(x, sy - 0.05, z, scratch);
      if (!s.wet || s.outsideDomain) continue;
      if ((s.voidFraction ?? 0) < FOAM && s.lensScale === undefined) continue;
      const lens = s.lensScale !== undefined ? 1 : 0;
      const thickness = s.lensThickness ?? null;
      const grip = s.lensGrip ?? null;
      const reach = s.lensReach ?? null;
      const lensShare = s.lensShare ?? null;
      const slope = Math.hypot(s.slopeX, s.slopeZ);
      // The fall line in the level plane, and the beam across it.
      const fl = Math.hypot(s.slopeX, s.slopeZ) > 1e-9 ? [s.slopeX / slope, s.slopeZ / slope] : [0, 1];
      const ax = -fl[1];
      const az = fl[0];
      const air = DRAFTS.map((d) => {
        const sd = physical.sampleAt(x, sy - d, z, scratch2);
        return sd.wet && !sd.outsideDomain ? r(sd.voidFraction ?? 0, 4) : null;
      });
      const left = physical.sampleAt(x + ax * HALF_BEAM, physical.surfaceAt(x + ax * HALF_BEAM, z + az * HALF_BEAM) - 0.05, z + az * HALF_BEAM, scratch2);
      const airLeft = left.wet && !left.outsideDomain ? (left.voidFraction ?? 0) : null;
      const rightS = physical.sampleAt(x - ax * HALF_BEAM, physical.surfaceAt(x - ax * HALF_BEAM, z - az * HALF_BEAM) - 0.05, z - az * HALF_BEAM, scratch2);
      const airRight = rightS.wet && !rightS.outsideDomain ? (rightS.voidFraction ?? 0) : null;
      // The flow jump the lens makes: the lens's own water against the depth-averaged current there.
      const flowJump = s.lensFlowX !== undefined ? Math.hypot(s.lensFlowX - s.flowX, s.lensFlowZ! - s.flowZ) : null;
      rows.push({
        frame, t: r(t, 4)!, x: r(x, 2)!, z: r(z, 2)!, surfaceY: r(sy, 4)!, depth: r(s.waterDepth, 4)!,
        breaking: r(s.breaking, 4)!, regime: s.regime, lens: lens as 0 | 1,
        thickness: thickness === null ? null : r(thickness, 4), grip: grip === null ? null : r(grip, 2),
        reach: reach === null ? null : r(reach, 4), air,
        across: airLeft !== null && airRight !== null ? r(airLeft - airRight, 4) : null,
        airLeft: airLeft === null ? null : r(airLeft, 4), airRight: airRight === null ? null : r(airRight, 4),
        slope: r(Math.atan(slope) * DEG, 3), lensShare: lensShare === null ? null : r(lensShare, 4),
        flowJump: flowJump === null ? null : r(flowJump, 3),
      });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------------------------------------------
// MODE=ride — 3.5d's rig on the real sea.
// ---------------------------------------------------------------------------------------------------------------
interface Rider {
  trial: number; armName: ArmName; stance: Stance; entry: number; ahead: number;
  board: BoardBody; rider: AttachedRider; water: SurfWater;
  frame: number; done: boolean; fellAt: number | null; cause: string;
  /** The surface under the board's centre last frame, for its own rate. */
  lastSurf: number | null;
}
const live: Rider[] = [];
let trials = 0;

function place(trial: number, toe: { x: number; z: number; air: number }): void {
  const x = toe.x;
  for (const ahead of AHEADS) {
    const pz = toe.z - ahead;
    const sy = physical.surfaceAt(x, pz);
    const here = physical.sampleAt(x, sy, pz, scratch);
    if (!here.wet || here.outsideDomain) continue;
    const normal = new Vector3(here.normalX, here.normalY, here.normalZ).normalize();
    // The fall line, level: down the surface's own gradient.
    const fall = new Vector3(here.slopeX, 0, here.slopeZ);
    if (fall.lengthSq() < 1e-12) fall.set(0, 0, 1);
    fall.normalize();
    const hAng = (Math.atan2(fall.x, fall.z) * DEG + SIDE) / DEG;
    const level = new Vector3(Math.sin(hAng), 0, Math.cos(hAng));
    const forward = level.addScaledVector(normal, -level.dot(normal)).normalize();
    const left = new Vector3().crossVectors(normal, forward).normalize();
    for (const armName of ARMS) {
      const water = waters.get(armName)!;
      for (const stance of STANCES) {
        for (const entry of ENTRIES) {
          const board = new BoardBody();
          board.place(
            new Vector3(x, sy, pz).addScaledVector(normal, board.shape.centerOfMass.y),
            new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)),
            forward.clone().multiplyScalar(entry).add(new Vector3(here.flowX, here.flowY, here.flowZ)),
          );
          const rd = new AttachedRider(board.shape, {
            phase: 'standing',
            ...(RIDER === 'new' ? { rider: 'new' as const } : {}),
            ...(FELT ? { feltFrame: FELT } : {}),
            ...(BODY ? { riderBody: BODY } : {}),
          } as ConstructorParameters<typeof AttachedRider>[1]);
          board.attach(rd);
          rd.crouch = stance === 'crouch' ? 1 : stance === 'compress' ? 0.6 : 0;
          rd.compress = stance === 'compress' ? 1 : 0;
          rd.steer = 0;
          live.push({ trial, armName, stance, entry, ahead, board, rider: rd, water, frame: 0, done: false, fellAt: null, cause: '', lastSurf: null });
        }
      }
    }
  }
}

const fwd = new Vector3();
const sideV = new Vector3();
const boardUp = new Vector3();
const nW = new Vector3();
const pW = new Vector3();

function stepRider(e: Rider): void {
  const { board, rider, water } = e;
  e.frame += 1;
  board.step(STEP, water);
  const liveD = bankLedger.on && bankLedger.steps > 0;
  fwd.set(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
  sideV.set(fwd.z, 0, -fwd.x);
  boardUp.set(0, 1, 0).applyQuaternion(board.orientation);
  const roll = Math.atan2(boardUp.dot(sideV), boardUp.y) * DEG;
  const cen = water.sampleAt(board.position.x, board.position.y, board.position.z, scratch);
  nW.set(cen.normalX, cen.normalY, cen.normalZ).normalize();
  const tilt = Math.atan2(nW.dot(sideV), nW.y) * DEG;
  // The foam the board is actually in, per RAIL. `patch.position.x > 0` is the board's left [R, `BoardBody.buildFoils`].
  let airMax = 0;
  let airL = 0;
  let nL = 0;
  let airR = 0;
  let nR = 0;
  let lensPatches = 0;
  let wet = 0;
  let gripMax = 0;
  let draftFace = -Infinity;
  for (const patch of board.shape.patches) {
    board.toWorld(patch.position, pW);
    const s = water.sampleAt(pW.x, pW.y, pW.z, scratch2);
    if (!s.wet || s.outsideDomain) continue;
    if (s.surfaceY - pW.y > draftFace) draftFace = s.surfaceY - pW.y;
    if (s.surfaceY - pW.y > 0) wet += 1;
    const a = s.voidFraction ?? 0;
    if (a > airMax) airMax = a;
    if (s.lensScale !== undefined && s.lensScale > 0) lensPatches += 1;
    if (s.lensGrip !== undefined && s.lensGrip > gripMax) gripMax = s.lensGrip;
    if (patch.position.x > 0) { airL += a; nL += 1; } else { airR += a; nR += 1; }
  }
  const row: Record<string, unknown> = {
    trial: e.trial, arm: e.armName, stance: e.stance, entry: e.entry, ahead: e.ahead,
    rider: RIDER, felt: FELT ?? 'ships', body: BODY ?? 'point',
    frame: e.frame, t: r(e.frame * STEP, 4),
    roll: r(roll, 4), tilt: r(tilt, 4), rail: r(roll - tilt, 4), bank: r(rider.bank.angle * DEG, 4),
    speed: r(board.velocity.length(), 4),
    /**
     * **Step 3.5f: the planing latch, on the real sea.** Five read-only columns, so "how much of a real Canyon ride
     * sits in the 3–4 m/s band, and in which latch state" is a count and not an inference. `through` is the LATCH's
     * own speed — `hypot(v.x − flowX, v.z − flowZ)`, the same expression `planingStep` tests against
     * `PLANING_SPEED = 4` / `PLANING_DROP = 3` [R, `AttachedRider.ts:3493`] — and `throughProbe` is the CAP's,
     * the component along the heading, which is a different quantity [R, `:3524`]. The other three are the game's
     * own `leanProbe` record. Nothing about the ride changes.
     */
    through: r(Math.hypot(board.velocity.x - (cen.outsideDomain ? 0 : cen.flowX), board.velocity.z - (cen.outsideDomain ? 0 : cen.flowZ)), 4),
    throughProbe: r(rider.leanProbe.speedThrough, 4),
    planingNow: rider.leanProbe.planing,
    capDeg: r(rider.leanProbe.cap * DEG, 4),
    askDeg: r(rider.leanProbe.ask * DEG, 4),
    // the foam the board is in
    airMax: r(airMax, 4), airLeft: nL ? r(airL / nL, 4) : null, airRight: nR ? r(airR / nR, 4) : null,
    airAcross: nL && nR ? r(airL / nL - airR / nR, 4) : null,
    lensPatches, gripMax: r(gripMax, 2), wetPatches: wet, patches: board.shape.patches.length,
    breaking: r(cen.breaking, 4), regime: cen.regime,
    // **The lens's own geometry under the board, which is the one channel a wrapper cannot remove.** `draftFace` is
    // the deepest patch under the water over it (negative: the whole hull clear of the water, step 3.4l's own
    // column); `lensRise` is how much of the surface under the board's centre is the roller lens's own top
    // [R, `PhysicalSurfWater.ts:359`]; `surfRate` is how fast that surface is moving, m/s, differenced frame to frame.
    draftFace: Number.isFinite(draftFace) ? r(draftFace, 5) : null,
    lensRise: r(sim.roller ? sim.roller.riseAt(board.position.x, board.position.z) : 0, 5),
    cenSurf: r(cen.surfaceY, 5), surfRate: e.lastSurf === null ? null : r((cen.surfaceY - e.lastSurf) / STEP, 4),
    lensThickCen: cen.lensThickness === undefined ? null : r(cen.lensThickness, 5),
    lensShareCen: cen.lensShare === undefined ? null : r(cen.lensShare, 5),
    airCen: r(cen.voidFraction ?? 0, 5),
    // the roll ledger's own N·m budget — books every substep, so it may be read anywhere
    apartSub: bankLedger.apart, bookSub: bankLedger.steps, subs: board.substepsTaken,
    rlTotal: r(board.roll.total, 4), rlBuoy: r(board.roll.buoyancy, 4), rlPress: r(board.roll.pressure, 4),
    rlAdded: r(board.roll.addedMass, 4), rlRad: r(board.roll.radiation, 4), rlFric: r(board.roll.friction, 4),
    rlFins: r(board.roll.fins, 4), rlRails: r(board.roll.rails, 4), rlFroth: r(board.roll.froth, 4),
    rlSuct: r(board.roll.suction, 4), rlGyro: r(board.roll.gyro, 4), rlRider: r(board.roll.rider, 4),
    rollRateAxis: r((rider as unknown as { rollAxis: Vector3 }).rollAxis.dot(board.angularVelocity) * DEG, 4),
    rollInerBoard: r((board as unknown as { bodyInertia: number[] }).bodyInertia[8], 6),
    attached: rider.attached ? 1 : 0, upright: rider.upright ? 1 : 0, phase: rider.phase,
  };
  if (liveD) {
    row.dkSum = r(DECK_KEYS.reduce((a, k) => a + bankLedger.deck[k], 0), 6);
    row.dkClose = r(bankLedger.closure, 12);
    row.dkSplit = r(bankLedger.split, 12);
    for (const k of DECK_KEYS) row[`dk_${k}`] = r(bankLedger.deck[k], 6);
    row.deckAcc = r(bankLedger.deckTotal, 5);
    row.ankleDeck = r(bankLedger.ankleDeck, 8);
    row.rollDeckPer = r(bankLedger.rollDeckPer, 8);
    row.bdTotal = r(bankLedger.boardMomentTotal, 4);
    row.bdFroth = r(bankLedger.boardMoment.froth, 4);
    row.bdBuoy = r(bankLedger.boardMoment.buoyancy, 4);
    row.bdPress = r(bankLedger.boardMoment.pressure, 4);
  }
  e.lastSurf = cen.surfaceY;
  emit({ kind: 'ride', ...row });
  if (!rider.attached || !rider.upright || rider.phase !== 'standing') {
    e.done = true;
    e.fellAt = e.frame * STEP;
    e.cause = !rider.attached ? 'detached' : !rider.upright ? 'down' : rider.phase;
  }
  if (e.frame >= Math.round(SECONDS / STEP)) e.done = true;
}

// ---------------------------------------------------------------------------------------------------------------
// The loop.
// ---------------------------------------------------------------------------------------------------------------
bankLedger.on = MODE === 'ride';
BoardBody.rollLedger = MODE === 'ride';
BoardBody.yawLedger = MODE === 'ride';

const frames = Math.round((PERIODS * config.peakPeriod) / STEP);
emit({
  kind: 'head', mode: MODE, spot: 'canyon', bed: 'b', size: SIZE, seed: SEED, focus: { x: r(focus.x, 2), z: r(focus.z, 2) },
  period: r(config.peakPeriod, 3), frames, seconds: r(frames * STEP, 1), spinUp: r(sim.solver.time, 2),
  wallSpinUp: r((Date.now() - wall) / 1000, 1), arms: ARMS, stances: STANCES, entries: ENTRIES, aheads: AHEADS, side: SIDE,
  rider: RIDER, felt: FELT ?? 'ships', body: BODY ?? 'point',
});

let lastPlace = -1e9;
for (let i = 0; i < frames; i += 1) {
  sim.step(STEP);
  const t = sim.solver.time;
  if (MODE === 'field') {
    const rows = fieldFrame(i + 1, t);
    if (FIELD === 'all') for (const row of rows) emit({ kind: 'field', ...row });
    else {
      // One row a frame: how much of the corridor is foamed, and the point with the most air under a board's draft.
      let best: FieldRow | null = null;
      let thickest: FieldRow | null = null;
      let foamed = 0;
      let lensed = 0;
      let acrossMax = 0;
      for (const row of rows) {
        const a = (row.air[1] ?? 0) as number;
        if (a >= FOAM) foamed += 1;
        if (row.lens) lensed += 1;
        if (best === null || a > ((best.air[1] ?? 0) as number)) best = row;
        if (thickest === null || (row.thickness ?? 0) > (thickest.thickness ?? 0)) thickest = row;
        if (row.across !== null && Math.abs(row.across) > Math.abs(acrossMax)) acrossMax = row.across;
      }
      emit({
        kind: 'fsum', frame: i + 1, t: r(t, 4), points: rows.length, foamed, lensed, acrossMax: r(acrossMax, 4),
        best: best === null ? null : best, thickest: thickest === null ? null : { x: thickest.x, z: thickest.z, thickness: thickest.thickness, grip: thickest.grip, air: thickest.air },
      });
    }
  } else {
    if (trials < TRIALS && t - lastPlace > GAP) {
      const toe = bestToe();
      if (toe) {
        trials += 1;
        lastPlace = t;
        emit({
          kind: 'trial', trial: trials, t: r(t, 4), x: r(toe.x, 2), toeZ: r(toe.z, 2), toeAir: r(toe.air, 4),
          toeSlope: r(toe.slope, 3), toeThickness: r(toe.thickness, 4),
          riders: ARMS.length * STANCES.length * ENTRIES.length * AHEADS.length,
        });
        place(trials, toe);
      }
    }
    for (const e of live) if (!e.done) stepRider(e);
    if (trials >= TRIALS && live.every((e) => e.done)) break;
  }
}

if (MODE === 'ride') {
  for (const e of live) {
    emit({
      kind: 'run', trial: e.trial, arm: e.armName, stance: e.stance, entry: e.entry, ahead: e.ahead,
      rider: RIDER, felt: FELT ?? 'ships', body: BODY ?? 'point',
      frames: e.frame, fellAt: e.fellAt === null ? null : r(e.fellAt, 4), cause: e.cause || 'held',
    });
  }
}
emit({ kind: 'done', wall: r((Date.now() - wall) / 1000, 1), trials, riders: live.length });
