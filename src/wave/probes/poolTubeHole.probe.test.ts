import { appendFileSync, writeFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { describe, it } from 'vitest';
import { BoardBody } from '../../physics/BoardBody';
import { PhysicalSurfWater } from '../../physics/PhysicalSurfWater';
import { RideSession, type RideInput } from '../../physics/RideSession';
import { createWaterSample, type SurfWater, type WaterSample } from '../../physics/SurfWater';
import { libraryFromBytes, POOL_TUBE_STAND_IN } from '../barrel/barrelLibrary';
import { BARREL_CASES } from '../barrel/barrelLibraryIndex';
import { FRONT_CAPACITY, FRONT_PIECE, FRONT_STRIDE } from '../barrel/frontRecords';
import { readBarrelCases } from '../barrel/nodeBarrelCases';
import { LANDMARK } from '../barrel/ProfileLibrary';
import { createContactHit, SweptContact } from '../barrel/sweptContact';
import { BARREL_SLOPE, LOFT, LOFT_SAMPLES, type LoftResult } from '../barrel/sweptLoft';
import { POOL, poolStraightFrame, regularSignificantHeight } from '../pool';
import { SurfZoneSimulation, type SurfZoneConfig } from '../SurfZoneSimulation';

/**
 * Find the hole (the surfable-tube plan's step 2, docs/superpowers/plans/2026-11-03-pool-surfable-tube.md; notes in
 * docs/research/pool-tube-hole-2026-11-03): what a board on the Wave Pool straight Barrel's face stands on as the swept
 * tube passes over it. Opt-in (PROBE=1); a probe only, nothing in the game changes.
 *
 * The sea is the game's (CPU, the Barrel, the swept contact built each 1/60 s step from the front's tube records over the
 * render nodes' surface, as `SurfZoneRunner.updateContact` builds it). Each measured frame (30 Hz), at reef columns s
 * `COLUMNS` (from,to,step m), the standing slice (weight ≥ 0.5) whose crest lies nearest the column (within 0.5 m) is read
 * along its ray:
 * - the solver's surface η (the render nodes' Catmull-Rom surface, `plainSurfaceAt`: what a board stands on without the
 *   contact) and the swept surface's lowest crossing (`floorAt`: what `PhysicalSurfWater.surfaceAt` and `sampleAt` answer
 *   wherever the loft is), every 0.1 m from 3 m behind the drawn crest to 12 m ahead;
 * - the solver's crest (its highest within ±2 m of the drawn crest) and trough (its lowest within 10 m ahead), and its face
 *   points at 0.1, 0.3, 0.5, 0.7 and 0.9 of its height H_s: there d = swept floor − η (negative: the support lies under
 *   the solver's face, the hole), and what a board point 2 cm over η is to the contact (`query`): solver (no loft), in the
 *   swept water, in its air under a roof (covered) or in open air;
 * - the drawn landmarks (crest, tip, throat, toe), their place along the ray and height against η there; the faces'
 *   offset at mid-height; their steepest slopes; the void's span and how much of it the solver's water fills; the forward
 *   rest (`REST`): the solver's water over the drawn trough at the toe and where the ease starts; the median sections.
 * Binned by the slice's life τ / touchdown; each column's wave's reads give the holes' spans.
 *
 * Bodies (`BODIES=1`, default on), at reef column `PLACE_S` (55 m), on each front's first standing slice there: a body
 * 0.3 s × the peel ahead down the line (the curl approaching), one at the column (the join, the curl arriving), and, as its
 * slice reaches life 0.3, one there (inside the open tube). Each is a rider with no input (`RideSession`), standing and lying
 * prone, and a lone board (`BoardBody`), placed on the solver's face at 0.3 and 0.6 of H_s in trim: moving shoreward with the crest
 * (√(g h) there) and along the front toward the side not yet thrown at the measured peel, pointed along its motion through
 * the water (no autopilot, no input), on the game's water (with the contact) and on the solver's alone (no contact, no
 * carve): the A/B. Their reactions are not applied: the sea stays shared and as is.
 *
 * H (1.05 | 1.32), CASE (pool | a38), PERIODS (12), SETTLE (50 s), CRASH (off: `?poolCrash=off`), BODIES (0: none), DUMP (a
 * file for one section at `PLACE_S`), LOG.
 */

const quantile = (values: number[], q: number) => {
  if (!values.length) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
};
const fmt = (value: number, digits = 2) => (value === value ? value.toFixed(digits) : '—');
const q3 = (values: number[], digits = 2) => (values.length ? `${fmt(quantile(values, 0.1), digits)} / ${fmt(quantile(values, 0.5), digits)} / ${fmt(quantile(values, 0.9), digits)}` : '—');
const share = (values: boolean[]) => (values.length ? `${((100 * values.filter(Boolean).length) / values.length).toFixed(0)} %` : '—');

const S = LOFT_SAMPLES;
const E = LOFT.extensionSamples;
/** The face fractions of the solver's height read (0.1 the trough's foot, 0.9 under the crest). */
const FACES = [0.1, 0.3, 0.5, 0.7, 0.9] as const;
/** The ray's reads, m from the drawn crest. */
const BEHIND = 3;
const AHEAD = 12;
const STEP = 0.1;
const READS = Math.round((BEHIND + AHEAD) / STEP) + 1;
/** The median section's places along the ray, m from the drawn crest. */
const SECTION = [-1, 0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8] as const;
/** A hole: the support this far under the solver's face, m. */
const HOLE = 0.1;
/** The along-line speed a placed body is given at most, m/s. */
const PEEL_CAP = 12;

type State = 'solver' | 'water' | 'covered' | 'air';
interface Read {
  t: number;
  front: number;
  column: number;
  tau: number;
  life: number;
  after: number;
  collapse: number;
  /** Solver face height, drawn height, m; the solver's face's width (crest to trough along the ray), m. */
  Hs: number;
  Hd: number;
  width: number;
  /** d at each face fraction, m; the state there; the face point's place along the ray, m from the drawn crest. */
  d: number[];
  state: State[];
  xi: number[];
  /** The solver's crest's offset from the drawn crest along the ray, m (+ shoreward), and their heights' difference, m (drawn − solver). */
  crestOffset: number;
  crestRise: number;
  /** Mid-face offset, m (+: the swept face lies shoreward of the solver's). */
  midOffset: number;
  /** Steepest descending slope (dy/dξ, positive down) of the solver's face and of the swept floor over the same span. */
  slopeS: number;
  slopeW: number;
  /** The swept floor's lowest ahead of the crest against the solver's trough, m (− : deeper). */
  troughDiff: number;
  /** The drawn landmarks' along-ray place, m from the drawn crest, and their height over the solver's surface there, m. */
  tipXi: number;
  tipOver: number;
  throatXi: number;
  throatOver: number;
  toeXi: number;
  toeOver: number;
  /** The solver's trough's place, m from the drawn crest. */
  troughXi: number;
  /** The void's mean fill by the solver's water (0 none, 1 to its roof), and its height, m; NaN without one. */
  voidFill: number;
  voidHeight: number;
  /** The forward rest: the solver's water over the drawn trough at the toe, and where the ease starts, m past the toe. */
  toeClimb: number;
  restHold: number;
  /** Breaking strength at the solver crest's cell and at mid-face. */
  breakCrest: number;
  breakFace: number;
  /** d under the drawn tip (the swept floor there − η), m. */
  dTip: number;
  /** η and the swept floor at `SECTION`, over the solver's crest, m. */
  sectionS: number[];
  sectionW: number[];
}

interface Body {
  kind: 'rider' | 'prone' | 'board';
  water: 'swept' | 'solver';
  target: string;
  face: number;
  front: number;
  t0: number;
  session?: RideSession;
  board: BoardBody;
  done: boolean;
  minGap: number;
  holeTime: number;
  coveredTime: number;
  firstHole: number;
  firstLip: number;
  lifeAtHole: number;
  lifeAtEnd: number;
  separatedAt: number;
  cause: string;
  stateAtEnd: string;
  gapAtEnd: number;
  dAtEnd: number;
  maxLife: number;
  baseGap: number;
  firstLoft: number;
}

describe.runIf(process.env.PROBE)('the Wave Pool straight Barrel: the hole probe', () => {
  it('reads the support under the face as the tube passes', () => {
    const height = Number(process.env.H ?? 1.05);
    const caseName = process.env.CASE === 'a38' ? 'a38' : 'pool';
    const periods = Number(process.env.PERIODS ?? 12);
    const settle = Number(process.env.SETTLE ?? 50);
    const [cFrom, cTo, cStep] = (process.env.COLUMNS ?? '30,95,2.5').split(',').map(Number);
    const placeS = Number(process.env.PLACE_S ?? 55);
    const bodiesOn = process.env.BODIES !== '0';
    const dumpPath = process.env.DUMP;
    let dumped = false;
    const log = process.env.LOG ?? `pool-tube-hole-${caseName}-${height}.txt`;
    writeFileSync(log, '');
    const t0 = Date.now();
    const bytes = caseName === 'a38' ? readBarrelCases(undefined, BARREL_CASES.filter((entry) => POOL_TUBE_STAND_IN.includes(entry.id))) : readBarrelCases('pool');
    const library = libraryFromBytes(bytes, 'basilisk', 'pool');
    const simulation = new SurfZoneSimulation({
      spot: 'pool', seed: 1, significantHeight: regularSignificantHeight(height), peakPeriod: POOL.period, directionDegrees: 0, spreading: 1000,
      tide: 0, windSpeed: 0, stage: 2, compute: 'cpu', poolWaves: 'barrel', ...(caseName === 'a38' ? { poolTubeCase: 'a38' } : {}),
      // CRASH=off: the barrel's jets and pace off (`?poolCrash=off`), a diagnostic of the crash's part.
      ...(process.env.CRASH === 'off' ? { sweptCrash: false } : {}),
    } as unknown as SurfZoneConfig, 'spun-up', library);
    const { solver } = simulation;
    // The game's contact and water (SurfZoneRunner: a plain SweptContact away from Padang's worker), and the solver's alone.
    const contact = new SweptContact(library, BARREL_SLOPE.pool!);
    const water = PhysicalSurfWater.forSimulation(simulation, contact, 1);
    const plain = new PhysicalSurfWater(solver, { peakPeriod: POOL.period, breaking: simulation.feltBreaking, nodeSpacing: 1, aeration: simulation.aeration });
    const records = new Float32Array(FRONT_CAPACITY * FRONT_STRIDE);
    const hit = createContactHit();
    const eta = new Float64Array(READS);
    const floor = new Float64Array(READS);
    const reads: Read[] = [];
    const strengthAt = (x: number, z: number) => {
      const column = Math.min(solver.nx - 1, Math.max(0, Math.round((x - solver.xCenters[0]) / solver.dx)));
      return simulation.breaking.strength[solver.rowBelow(z) * solver.nx + column];
    };
    const stateAt = (x: number, y: number, z: number): State => {
      if (!contact.query(x, y, z, hit)) return 'solver';
      if (hit.inWater) return 'water';
      return hit.ceilingY === hit.ceilingY ? 'covered' : 'air';
    };
    const xiOf = (i: number) => -BEHIND + i * STEP;
    const iOf = (xi: number) => Math.round((xi + BEHIND) / STEP);
    /** The solver's section along a ray from (cx, cz) into `eta` (and the swept floor into `floor`): its crest and trough indices. */
    const section = (cx: number, cz: number, rx: number, rz: number) => {
      for (let i = 0; i < READS; i += 1) {
        const x = cx + xiOf(i) * rx;
        const z = cz + xiOf(i) * rz;
        eta[i] = water.plainSurfaceAt(x, z);
        floor[i] = contact.floorAt(x, z);
      }
      let ic = iOf(-2);
      for (let i = iOf(-2); i <= iOf(2); i += 1) if (eta[i] > eta[ic]) ic = i;
      let it = ic;
      for (let i = ic; i <= Math.min(READS - 1, ic + Math.round(10 / STEP)); i += 1) if (eta[i] < eta[it]) it = i;
      return { ic, it, Hs: eta[ic] - eta[it] };
    };
    /** Where the solver's face (`section`'s, still in `eta`) crosses `f` of its height, m along the ray. */
    const faceXi = (ic: number, it: number, f: number) => {
      const level = eta[it] + f * (eta[ic] - eta[it]);
      let i = ic;
      while (i < it && eta[i + 1] > level) i += 1;
      const u = eta[i] !== eta[i + 1] ? (eta[i] - level) / (eta[i] - eta[i + 1]) : 0;
      return { xi: xiOf(i) + u * STEP, level, i };
    };

    // One slice along its ray: the solver's surface and the swept floor, and what they say.
    const readSlice = (loft: LoftResult, s: number, column: number, t: number): Read | undefined => {
      const P = loft.positions;
      const base = s * S + E;
      const c = 3 * (base + LANDMARK.crest);
      // A point exactly on a slice's ray can round off its strip (float32 positions): read 2 cm into the strip, toward the
      // next slice's crest, as a board would stand.
      const n = c + 3 * S;
      const along = Math.hypot(P[n] - P[c], P[n + 2] - P[c + 2]);
      const inX = along > 0 ? (0.02 * (P[n] - P[c])) / along : 0;
      const inZ = along > 0 ? (0.02 * (P[n + 2] - P[c + 2])) / along : 0;
      const cx = P[c] + inX;
      const cy = P[c + 1];
      const cz = P[c + 2] + inZ;
      const rx = loft.sliceRayX[s];
      const rz = loft.sliceRayZ[s];
      const at = (xi: number) => [cx + xi * rx, cz + xi * rz] as const;
      const { ic, it, Hs } = section(cx, cz, rx, rz);
      if (!(Hs > 0.2)) return undefined;
      const alongRay = (index: number) => (P[3 * (base + index)] - cx) * rx + (P[3 * (base + index) + 2] - cz) * rz;
      const yOf = (index: number) => P[3 * (base + index) + 1];
      const etaAt = (xi: number) => {
        const [x, z] = at(xi);
        return water.plainSurfaceAt(x, z);
      };
      let low = Infinity;
      for (let i = iOf(0); i < READS; i += 1) if (floor[i] === floor[i] && floor[i] < low) low = floor[i];
      const Hd = cy - low;
      const d: number[] = [];
      const state: State[] = [];
      const xis: number[] = [];
      let midOffset = Number.NaN;
      let iMid = ic;
      for (const f of FACES) {
        const { xi, level, i } = faceXi(ic, it, f);
        const [x, z] = at(xi);
        const fl = contact.floorAt(x, z);
        d.push(fl === fl ? fl - level : 0);
        state.push(stateAt(x, level + 0.02, z));
        xis.push(xi);
        if (f === 0.5) {
          iMid = i;
          // The swept floor's crossing of the same level, scanning forward from the drawn crest.
          for (let k = iOf(0); k < READS - 1; k += 1) {
            if (floor[k] === floor[k] && floor[k + 1] === floor[k + 1] && floor[k] >= level && floor[k + 1] < level) {
              midOffset = xiOf(k) + ((floor[k] - level) / (floor[k] - floor[k + 1])) * STEP - xi;
              break;
            }
          }
        }
      }
      let slopeS = 0;
      let slopeW = 0;
      for (let i = ic; i < it; i += 1) {
        slopeS = Math.max(slopeS, (eta[i] - eta[i + 1]) / STEP);
        if (floor[i] === floor[i] && floor[i + 1] === floor[i + 1]) slopeW = Math.max(slopeW, (floor[i] - floor[i + 1]) / STEP);
      }
      const sectionS = SECTION.map((xi) => eta[iOf(xi)] - eta[ic]);
      const sectionW = SECTION.map((xi) => (floor[iOf(xi)] === floor[iOf(xi)] ? floor[iOf(xi)] : eta[iOf(xi)]) - eta[ic]);
      const tipXi = alongRay(LANDMARK.lip);
      const throatXi = alongRay(LANDMARK.throat);
      const toeXi = alongRay(LANDMARK.toe);
      const tipAt = at(tipXi);
      const fTip = contact.floorAt(tipAt[0], tipAt[1]);
      // The void, where the tip stands ahead of the throat: its fill by the solver's water at three points across.
      let voidFill = Number.NaN;
      let voidHeight = Number.NaN;
      if (tipXi > throatXi + 0.05) {
        const fills: number[] = [];
        const heights: number[] = [];
        for (const g of [0.25, 0.5, 0.75]) {
          const [x, z] = at(throatXi + g * (tipXi - throatXi));
          const fl = contact.floorAt(x, z);
          if (!(fl === fl)) continue;
          contact.query(x, fl + 0.01, z, hit);
          if (!(hit.ceilingY === hit.ceilingY) || hit.inWater) continue;
          fills.push((water.plainSurfaceAt(x, z) - fl) / (hit.ceilingY - fl));
          heights.push(hit.ceilingY - fl);
        }
        if (fills.length) {
          voidFill = fills.reduce((a, b) => a + b, 0) / fills.length;
          voidHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
        }
      }
      const mid = at(xiOf(iMid));
      const crest = at(xiOf(ic));
      return {
        t, front: loft.sliceFront[s] % FRONT_PIECE, column, tau: loft.sliceTau[s], life: loft.sliceLife[s], after: loft.sliceAfter[s],
        collapse: loft.sliceCollapse[s], Hs, Hd, width: xiOf(it) - xiOf(ic), d, state, xi: xis, crestOffset: xiOf(ic), crestRise: cy - eta[ic], midOffset,
        slopeS, slopeW, troughDiff: low - eta[it], tipXi, tipOver: yOf(LANDMARK.lip) - etaAt(tipXi), throatXi,
        throatOver: yOf(LANDMARK.throat) - etaAt(throatXi), toeXi, toeOver: yOf(LANDMARK.toe) - etaAt(toeXi), troughXi: xiOf(it), voidFill,
        voidHeight, toeClimb: loft.sliceToeClimb[s], restHold: loft.sliceRestHold[s], breakCrest: strengthAt(crest[0], crest[1]),
        breakFace: strengthAt(mid[0], mid[1]), dTip: fTip === fTip ? fTip - etaAt(tipXi) : 0, sectionS, sectionW,
      };
    };

    // The bodies (the A/B): placed on the solver's face, their reactions not applied.
    const quiet = (w: PhysicalSurfWater): SurfWater => ({
      sampleAt: (x, y, z, out) => w.sampleAt(x, y, z, out),
      surfaceAt: (x, z) => w.surfaceAt(x, z),
      addReaction: () => {},
      setSampleTime: (offset) => w.setSampleTime(offset),
    });
    const waters = { swept: quiet(water), solver: quiet(plain) };
    const bodies: Body[] = [];
    const finished: Body[] = [];
    const peels: number[] = [];
    const celerities: number[] = [];
    const input: RideInput = { paddle: false, popUp: false, steer: 0, trim: 0, crouch: 0 };
    const sample: WaterSample = createWaterSample();
    const part = new Vector3();
    /** Bodies on the solver's face along the ray (rx, rz) from (cx, cz), at 0.3 and 0.6 of its height. */
    const place = (cx: number, cz: number, rx: number, rz: number, target: string, front: number, peel: number, tangent: [number, number]) => {
      const { ic, it, Hs } = section(cx, cz, rx, rz);
      if (!(Hs > 0.2)) return;
      // In trim the board keeps its place on the wave: it moves shoreward with the crest (its long-wave speed √(g h) there)
      // and along the line with the curl (the peel).
      const crestX = cx + xiOf(ic) * rx;
      const crestZ = cz + xiOf(ic) * rz;
      const celerity = Math.sqrt(9.81 * Math.max(0, solver.sampleCentered(solver.h, crestX, crestZ)));
      celerities.push(celerity);
      const vx = celerity * rx + peel * tangent[0];
      const vz = celerity * rz + peel * tangent[1];
      for (const face of [0.3, 0.6]) {
        const { xi } = faceXi(ic, it, face);
        const x = cx + xi * rx;
        const z = cz + xi * rz;
        // The board points along its motion through the water (its velocity less the surface water's), at that speed.
        const surface0 = plain.surfaceAt(x, z);
        const flow = plain.sampleAt(x, surface0 - 0.05, z, sample);
        const relX = vx - flow.flowX;
        const relZ = vz - flow.flowZ;
        const heading = Math.atan2(relX, relZ);
        const speed = Math.hypot(relX, relZ);
        for (const kind of ['rider', 'prone', 'board'] as const) {
          for (const which of ['swept', 'solver'] as const) {
            const session = kind !== 'board' ? new RideSession() : undefined;
            const board = session ? session.board : new BoardBody();
            // Placed by the solver's water either way: the same start for the A and the B.
            if (session) {
              session.place({ x, z, heading, speed, phase: kind === 'prone' ? 'prone' : 'standing', followSurface: true }, waters.solver);
            } else {
              const surface = plain.surfaceAt(x, z);
              const s0 = plain.sampleAt(x, surface - 0.05, z, sample);
              const up = new Vector3(s0.normalX, s0.normalY, s0.normalZ).normalize();
              const forward = new Vector3(Math.sin(heading), -(up.x * Math.sin(heading) + up.z * Math.cos(heading)) / up.y, Math.cos(heading)).normalize();
              const left = new Vector3().crossVectors(up, forward);
              const orientation = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, up, forward));
              const velocity = new Vector3(vx, 0, vz);
              const top = plain.sampleAt(x, surface, z, sample);
              velocity.y = top.flowY + velocity.x * top.slopeX + velocity.z * top.slopeZ;
              board.place(new Vector3(x, surface + board.shape.centerOfMass.y - 0.05, z), orientation, velocity);
            }
            bodies.push({
              kind, water: which, target, face, front, t0: solver.time, session, board, done: false, minGap: Infinity, holeTime: 0,
              coveredTime: 0, firstHole: Number.NaN, firstLip: Number.NaN, lifeAtHole: Number.NaN, lifeAtEnd: Number.NaN, separatedAt: Number.NaN,
              cause: '', stateAtEnd: '', gapAtEnd: Number.NaN, dAtEnd: Number.NaN, maxLife: Number.NaN, baseGap: Number.NaN, firstLoft: Number.NaN,
            });
          }
        }
      }
    };
    const stepBodies = (dt: number) => {
      for (const body of bodies) {
        const w = waters[body.water];
        const real = body.water === 'swept' ? water : plain;
        if (body.session) real.withSurfaceNodeCache(() => body.session!.step(dt, w, input));
        else real.withSurfaceNodeCache(() => body.board.step(dt, w));
        const age = solver.time - body.t0;
        const p = body.board.position;
        if (!Number.isFinite(p.x + p.y + p.z) || body.board.outsideDomain) {
          body.done = true;
          body.cause = body.cause || 'lost';
          continue;
        }
        const bottom = p.y - body.board.shape.centerOfMass.y;
        const etaHere = water.plainSurfaceAt(p.x, p.z);
        const fl = contact.floorAt(p.x, p.z);
        const gap = bottom - etaHere;
        if (!(body.baseGap === body.baseGap)) body.baseGap = gap;
        const state = stateAt(p.x, p.y, p.z);
        if (state !== 'solver' && !(body.firstLoft === body.firstLoft)) body.firstLoft = age;
        const life = contact.query(p.x, p.y, p.z, hit) ? hit.life : Number.NaN;
        if (life === life) body.maxLife = body.maxLife === body.maxLife ? Math.max(body.maxLife, life) : life;
        body.minGap = Math.min(body.minGap, gap - body.baseGap);
        if (gap - body.baseGap < -HOLE) {
          body.holeTime += dt;
          if (!(body.firstHole === body.firstHole)) {
            body.firstHole = age;
            body.lifeAtHole = life;
          }
        }
        if (state === 'covered') body.coveredTime += dt;
        // The lip on a rider part: a body point in the curl's water (water with air under it).
        if (body.session && body.session.rider.attached && body.water === 'swept' && !(body.firstLip === body.firstLip)) {
          for (let k = 0; k < 7; k += 1) {
            body.session.renderPoint(k, part);
            const s0 = water.sampleAt(part.x, part.y, part.z, sample);
            if (s0.waterFloorY !== undefined && part.y < s0.surfaceY && part.y > s0.waterFloorY) {
              body.firstLip = age;
              break;
            }
          }
        }
        const separated = body.session !== undefined && !body.session.rider.attached;
        if (separated || age >= 3) {
          body.done = true;
          body.separatedAt = separated ? age : Number.NaN;
          body.cause = separated ? String(body.session!.separation ?? '?') : '';
          body.stateAtEnd = state;
          body.gapAtEnd = gap - body.baseGap;
          body.dAtEnd = fl === fl ? fl - etaHere : 0;
          body.lifeAtEnd = life;
        }
      }
      for (let k = bodies.length - 1; k >= 0; k -= 1) if (bodies[k].done) finished.push(...bodies.splice(k, 1));
    };
    /** The front's peel about slice `s`: its clock's slope along σ over ±4 m, m/s, and the unit direction toward the lower clock. */
    const peelAt = (loft: LoftResult, s: number): { speed: number; dir: [number, number] } | undefined => {
      const front = loft.sliceFront[s];
      const sigma0 = loft.sliceSigma[s];
      let n = 0;
      let ms = 0;
      let mt = 0;
      let mss = 0;
      let mst = 0;
      let lo = -1;
      let hi = -1;
      for (let k = 0; k < loft.sliceCount; k += 1) {
        if (loft.sliceFront[k] !== front || !(loft.sliceWeight[k] > 0) || Math.abs(loft.sliceSigma[k] - sigma0) > 4) continue;
        const sg = loft.sliceSigma[k] - sigma0;
        n += 1;
        ms += sg;
        mt += loft.sliceTau[k];
        mss += sg * sg;
        mst += sg * loft.sliceTau[k];
        if (lo < 0 || loft.sliceSigma[k] < loft.sliceSigma[lo]) lo = k;
        if (hi < 0 || loft.sliceSigma[k] > loft.sliceSigma[hi]) hi = k;
      }
      if (n < 4 || lo === hi) return undefined;
      const slope = (n * mst - ms * mt) / (n * mss - ms * ms);
      if (!(Math.abs(slope) > 1e-3)) return undefined;
      const a = 3 * (lo * S + E + LANDMARK.crest);
      const b = 3 * (hi * S + E + LANDMARK.crest);
      let dx = loft.positions[b] - loft.positions[a];
      let dz = loft.positions[b + 2] - loft.positions[a + 2];
      const norm = Math.hypot(dx, dz);
      dx /= norm;
      dz /= norm;
      // σ rising: toward hi. The lower clock lies toward hi when the clock falls along σ.
      return { speed: 1 / Math.abs(slope), dir: slope < 0 ? [dx, dz] : [-dx, -dz] };
    };

    const dtSettle = 1 / 30;
    while (solver.time < settle) simulation.step(dtSettle);
    const dt = 1 / 60;
    const steps = Math.round((periods * POOL.period) / dt);
    const columnOf = (s: number) => Math.round((s - cFrom) / cStep);
    const columns = Math.floor((cTo - cFrom) / cStep) + 1;
    const seenAtPlace = new Set<number>();
    const openPlaced = new Set<number>();
    let contactMs = 0;
    let measureMs = 0;
    let slicesSeen = 0;
    let slicesPre = 0;
    let slicesLight = 0;
    let slicesPreStanding = 0;
    let slicesUnjoined = 0;
    for (let n = 1; n <= steps; n += 1) {
      simulation.step(dt);
      const started = performance.now();
      const count = simulation.writeTubeRecords(records);
      water.withSurfaceNodeCache(() => contact.update(records, count, solver.restLevel, (x, z) => water.plainSurfaceAt(x, z)));
      contactMs += performance.now() - started;
      if (bodiesOn) stepBodies(dt);
      if (n % 2 !== 0 || count === 0) continue;
      const m0 = performance.now();
      const loft = contact.last!;
      // Each column's standing slice nearest it (its crest within half a metre of the column's s).
      const best = new Int32Array(columns).fill(-1);
      const bestDist = new Float64Array(columns).fill(Infinity);
      let placeSlice = -1;
      let placeDist = Infinity;
      for (let s = 0; s < loft.sliceCount; s += 1) {
        slicesSeen += 1;
        if (loft.sliceTau[s] < 0) {
          slicesPre += 1;
          if (loft.sliceWeight[s] >= 0.5) slicesPreStanding += 1;
        }
        if (!(loft.sliceWeight[s] >= 0.5)) {
          slicesLight += 1;
          continue;
        }
        // A strip's first slice only: a point on its ray is the strip's (`SweptContact.strip`, half-open).
        if (loft.sliceJoined[s] !== 1) {
          slicesUnjoined += 1;
          continue;
        }
        const c = 3 * (s * S + E + LANDMARK.crest);
        const reefS = poolStraightFrame(loft.positions[c], loft.positions[c + 2]).s;
        if (Math.abs(reefS - placeS) < 0.5 && Math.abs(reefS - placeS) < placeDist) {
          placeDist = Math.abs(reefS - placeS);
          placeSlice = s;
        }
        const k = columnOf(reefS);
        if (k < 0 || k >= columns) continue;
        const dist = Math.abs(reefS - (cFrom + k * cStep));
        if (dist < 0.5 && dist < bestDist[k]) {
          bestDist[k] = dist;
          best[k] = s;
        }
      }
      water.withSurfaceNodeCache(() => {
        for (let k = 0; k < columns; k += 1) {
          if (best[k] < 0) continue;
          const read = readSlice(loft, best[k], k, solver.time);
          if (read) reads.push(read);
          // DUMP: one section at the placement column, its slice at life 0.35–0.5, 10 s into the run: the solver's surface,
          // the support and the drawn profile (the contact's), over the solver's crest, along the ray (m).
          if (read && dumpPath && !dumped && k === columnOf(placeS) && read.life >= 0.35 && read.life < 0.5 && solver.time > settle + 10) {
            dumped = true;
            const crest = eta[iOf(read.crestOffset)];
            const P = loft.positions;
            const s0 = best[k];
            const c = 3 * (s0 * S + E + LANDMARK.crest);
            const out = [`# ${caseName} H ${height}: t ${solver.time.toFixed(2)} s, front ${read.front}, column s ${cFrom + k * cStep}, τ ${read.tau.toFixed(3)} s, life ${read.life.toFixed(3)}, H_s ${read.Hs.toFixed(3)} m, drawn H ${read.Hd.toFixed(3)} m`, '# xi (m from the drawn crest), solver surface, support (swept floor; the solver where no loft), over the solver crest (m)'];
            for (let i = iOf(-1); i <= iOf(8); i += 1) out.push(`${xiOf(i).toFixed(1)} ${(eta[i] - crest).toFixed(3)} ${((floor[i] === floor[i] ? floor[i] : eta[i]) - crest).toFixed(3)}`);
            out.push('# the drawn profile (the contact loft\'s slice): index, along the ray (m from the drawn crest), height over the solver crest (m)');
            for (let j = 0; j < S; j += 1) {
              const v = 3 * (s0 * S + j);
              out.push(`${j - E} ${((P[v] - P[c]) * loft.sliceRayX[s0] + (P[v + 2] - P[c + 2]) * loft.sliceRayZ[s0]).toFixed(3)} ${(P[v + 1] - crest).toFixed(3)}`);
            }
            writeFileSync(dumpPath, out.join('\n') + '\n');
          }
        }
        if (!bodiesOn || placeSlice < 0) return;
        const s = placeSlice;
        const front = loft.sliceFront[s] % FRONT_PIECE;
        const c = 3 * (s * S + E + LANDMARK.crest);
        const [cx, cz, rx, rz] = [loft.positions[c], loft.positions[c + 2], loft.sliceRayX[s], loft.sliceRayZ[s]];
        const touchdown = loft.sliceLife[s] > 0 ? loft.sliceTau[s] / loft.sliceLife[s] : Number.NaN;
        if (!seenAtPlace.has(front)) {
          // The front's first standing slice here: the curl arrives (the join), and 0.3 s down the line it approaches.
          seenAtPlace.add(front);
          const peel = peelAt(loft, s);
          if (!peel) return;
          peels.push(peel.speed);
          const speed = Math.min(PEEL_CAP, peel.speed);
          place(cx, cz, rx, rz, 'join', front, speed, peel.dir);
          const ahead = 0.3 * peel.speed;
          place(cx + ahead * peel.dir[0], cz + ahead * peel.dir[1], rx, rz, 'ahead 0.3 s', front, speed, peel.dir);
        } else if (!openPlaced.has(front) && loft.sliceLife[s] >= 0.3 && touchdown === touchdown) {
          openPlaced.add(front);
          const peel = peelAt(loft, s);
          if (!peel) return;
          place(cx, cz, rx, rz, 'open, life 0.3', front, Math.min(PEEL_CAP, peel.speed), peel.dir);
        }
      });
      measureMs += performance.now() - m0;
    }
    for (const body of bodies) finished.push(body);

    // The tables.
    const lines: string[] = [];
    lines.push(`pool straight Barrel, H ${height} m at the feed, cases ${caseName === 'a38' ? 'a38 (the stand-in, ?poolTubeCase=a38)' : 'the pool\'s two level-13 cases (default)'}; crash ${process.env.CRASH === 'off' ? 'off' : 'on'}; ${periods} periods after ${settle} s; CPU, 1/60 s steps; ${((Date.now() - t0) / 1000).toFixed(0)} s wall; contact ${(contactMs / steps).toFixed(1)} ms a step, reads ${(measureMs / (steps / 2)).toFixed(1)} ms a frame`);
    const fronts = new Set(reads.map((r) => r.front));
    lines.push(`reads: ${reads.length} (column-frames), fronts ${fronts.size}; columns s ${cFrom}–${cTo} every ${cStep} m; loft slices read ${slicesSeen}: weight < 0.5 ${((100 * slicesLight) / Math.max(1, slicesSeen)).toFixed(0)} %, standing but not joined to the next (left out) ${((100 * slicesUnjoined) / Math.max(1, slicesSeen)).toFixed(0)} %; before the throw (τ < 0) ${slicesPre} (standing ${slicesPreStanding})`);
    lines.push(`solver face H_s ${q3(reads.map((r) => r.Hs))} m, its width crest to trough along the ray ${q3(reads.map((r) => r.width))} m; drawn H ${q3(reads.map((r) => r.Hd))} m (p10 / p50 / p90)`);
    const bins: [string, (r: Read) => boolean][] = [
      ['τ < 0 (before the throw)', (r) => r.tau < 0],
      ['life 0–0.25 (thrown)', (r) => r.life >= 0 && r.life < 0.25],
      ['life 0.25–0.5', (r) => r.life >= 0.25 && r.life < 0.5],
      ['life 0.5–0.8 (open)', (r) => r.life >= 0.5 && r.life < 0.8],
      ['life 0.8–1 (closing)', (r) => r.life >= 0.8 && r.life < 1],
      ['landed, collapse 0–0.5', (r) => r.after >= 0 && r.after < 0.5 * r.collapse],
      ['landed, collapse 0.5–1', (r) => r.after >= 0.5 * r.collapse && r.after < r.collapse],
    ];
    const each = (fn: (name: string, bin: Read[]) => string) => {
      for (const [name, test] of bins) {
        const bin = reads.filter(test);
        if (bin.length) lines.push(`- ${name} (n ${bin.length}): ${fn(name, bin)}`);
      }
    };
    lines.push('');
    lines.push('## 1–2. The support at the solver\'s face points (0.1 the trough … 0.9 under the crest): d = swept floor − solver surface, m, p10 / p50; [share d < −0.1 m]; a board point 2 cm over the solver surface is to the contact: S solver (no loft), W in swept water, C in its air under a roof, A in open air (%)');
    each((_, bin) => `H_s ${fmt(quantile(bin.map((r) => r.Hs), 0.5))} m; ` + FACES.map((f, j) => {
      const ds = bin.map((r) => r.d[j]);
      const st = bin.map((r) => r.state[j]);
      const pct = (k: State) => Math.round((100 * st.filter((v) => v === k).length) / st.length);
      return `${f} (ξ ${fmt(quantile(bin.map((r) => r.xi[j]), 0.5), 1)} m): ${fmt(quantile(ds, 0.1))} / ${fmt(quantile(ds, 0.5))} [${share(ds.map((v) => v < -HOLE))}] S${pct('solver')} W${pct('water')} C${pct('covered')} A${pct('air')}`;
    }).join(' | '));
    lines.push('');
    lines.push('## 2. The same in H_s (d / H_s, p10 / p50)');
    each((_, bin) => FACES.map((f, j) => `${f}: ${fmt(quantile(bin.map((r) => r.d[j] / r.Hs), 0.1), 3)} / ${fmt(quantile(bin.map((r) => r.d[j] / r.Hs), 0.5), 3)}`).join(' | '));
    lines.push('');
    lines.push(`## The median sections: along the ray, m from the drawn crest (${SECTION.join(', ')}): the solver's surface | the support (the swept floor, the solver's where no loft), over the solver's crest, m`);
    each((_, bin) => `${SECTION.map((_, j) => fmt(quantile(bin.map((r) => r.sectionS[j]), 0.5))).join(' ')} | ${SECTION.map((_, j) => fmt(quantile(bin.map((r) => r.sectionW[j]), 0.5))).join(' ')}`);
    lines.push('');
    lines.push('## 5. The mismatch, p10 / p50 / p90 per bin');
    lines.push('crest offset (solver crest − drawn crest along the ray, m, + shoreward); drawn crest over the solver crest, m; mid-face offset (swept − solver, m, + shoreward); steepest slope solver | swept; swept lowest − solver trough, m; solver trough at ξ, m');
    each((_, bin) => `${q3(bin.map((r) => r.crestOffset))}; ${q3(bin.map((r) => r.crestRise))}; ${q3(bin.map((r) => r.midOffset).filter((v) => v === v))} (found ${share(bin.map((r) => r.midOffset === r.midOffset))}); ${q3(bin.map((r) => r.slopeS))} | ${q3(bin.map((r) => r.slopeW))}; ${q3(bin.map((r) => r.troughDiff))}; ${q3(bin.map((r) => r.troughXi), 1)}`);
    lines.push('drawn landmarks along the ray from the drawn crest (m, p50) and their height over the solver surface there (m, p10 / p50 / p90): tip, throat, toe; d under the tip (m); the forward rest\'s toe climb (the solver over the drawn trough at the toe, m) and its hold (m past the toe)');
    each((_, bin) => `tip ${fmt(quantile(bin.map((r) => r.tipXi), 0.5))} m, ${q3(bin.map((r) => r.tipOver))}; throat ${fmt(quantile(bin.map((r) => r.throatXi), 0.5))} m, ${q3(bin.map((r) => r.throatOver))}; toe ${fmt(quantile(bin.map((r) => r.toeXi), 0.5))} m, ${q3(bin.map((r) => r.toeOver))}; d under the tip ${q3(bin.map((r) => r.dTip))}; toe climb ${q3(bin.map((r) => r.toeClimb).filter((v) => v === v))}, hold ${q3(bin.map((r) => r.restHold).filter((v) => v === v))}`);
    lines.push('the void (the tip ahead of the throat): share of reads with one; its height (m) and the solver water\'s fill of it (0 none, 1 to the roof), p10 / p50 / p90; breaking strength at the solver crest | at mid-face');
    each((_, bin) => {
      const voids = bin.filter((r) => r.voidFill === r.voidFill);
      return `${share(bin.map((r) => r.voidFill === r.voidFill))}; ${q3(voids.map((r) => r.voidHeight))} m; fill ${q3(voids.map((r) => r.voidFill))}; ${q3(bin.map((r) => r.breakCrest))} | ${q3(bin.map((r) => r.breakFace))}`;
    });

    // Holes per column-wave: its reads with d < −0.1 m at a face point.
    lines.push('');
    lines.push('## 2. The holes per column-wave (d < −0.1 m at a face point): column-waves with one; the deepest (m; in H_s); the span from its first hole read to its last (s) and the share of the reads within it in the hole; its first and last hole read on the clock (τ s; life); the column-wave\'s first read (τ s) and d there');
    const byKey = new Map<string, Read[]>();
    for (const r of reads) {
      const key = `${r.front}:${r.column}`;
      (byKey.get(key) ?? byKey.set(key, []).get(key)!).push(r);
    }
    const firstReads = [...byKey.values()].map((list) => list.reduce((m, r) => (r.t < m.t ? r : m), list[0]));
    // The drawn clock's rate in a column: τ's slope against the solver's time over each column-wave's reads (1: real time).
    const rates: number[] = [];
    for (const list of byKey.values()) {
      if (list.length < 5) continue;
      const mt = list.reduce((a, r) => a + r.t, 0) / list.length;
      const mtau = list.reduce((a, r) => a + r.tau, 0) / list.length;
      let num = 0;
      let den = 0;
      for (const r of list) {
        num += (r.t - mt) * (r.tau - mtau);
        den += (r.t - mt) ** 2;
      }
      if (den > 0) rates.push(num / den);
    }
    lines.push(`the drawn clock in a column runs ${q3(rates)} s of τ a second (p10 / p50 / p90 over the column-waves with 5 reads or more)`);
    lines.push(`column-waves ${byKey.size}, reads each ${q3([...byKey.values()].map((l) => l.length), 0)}; their first read at τ ${q3(firstReads.map((r) => r.tau))} s, d there at 0.3 / 0.5 / 0.7: ${[1, 2, 3].map((j) => fmt(quantile(firstReads.map((r) => r.d[j]), 0.5))).join(' / ')} m`);
    for (let j = 0; j < FACES.length; j += 1) {
      const depth: number[] = [];
      const depthH: number[] = [];
      const span: number[] = [];
      const inside: number[] = [];
      const startTau: number[] = [];
      const startLife: number[] = [];
      const endTau: number[] = [];
      const endLife: number[] = [];
      for (const list of byKey.values()) {
        const holes = list.filter((r) => r.d[j] < -HOLE).sort((a, b) => a.t - b.t);
        if (!holes.length) continue;
        const deepest = holes.reduce((m, r) => (r.d[j] < m.d[j] ? r : m), holes[0]);
        depth.push(-deepest.d[j]);
        depthH.push(-deepest.d[j] / deepest.Hs);
        const first = holes[0];
        const last = holes[holes.length - 1];
        span.push(last.t - first.t + 1 / 30);
        const within = list.filter((r) => r.t >= first.t && r.t <= last.t);
        inside.push(holes.length / within.length);
        startTau.push(first.tau);
        endTau.push(last.tau);
        if (first.life === first.life) startLife.push(first.life);
        if (last.life === last.life) endLife.push(last.life);
      }
      lines.push(`- face ${FACES[j]}: ${depth.length} of ${byKey.size}; deepest ${q3(depth)} m, ${q3(depthH, 3)} H_s; span ${q3(span)} s, in the hole ${q3(inside)}; first τ ${q3(startTau)} s (life ${q3(startLife)}), last τ ${q3(endTau)} s (life ${q3(endLife)})`);
    }

    // The bodies.
    if (bodiesOn) {
      lines.push('');
      lines.push(`## 4. The bodies at s ${placeS} (A/B: the game's water with the contact | the solver's alone), placed on the solver's face, no input, moving with the crest (√(g h) at it, ${q3(celerities)} m/s) and along the line at the peel, ${q3(peels)} m/s (capped at ${PEEL_CAP}), pointed along their motion through the water`);
      lines.push('per group: n; riders attached at 3 s; separated at (s) and causes; the lip in a rider part (count, first at s); the board\'s bottom dropping more than 0.1 m under the solver surface from where it started (count, first at s, for s), the most it dropped (m); first on the loft (s); covered (count); the life at the drop; the contact state at the end');
      for (const target of ['ahead 0.3 s', 'join', 'open, life 0.3']) {
        for (const face of [0.3, 0.6]) {
          for (const kind of ['rider', 'prone', 'board'] as const) {
            for (const which of ['swept', 'solver'] as const) {
              const group = finished.filter((b) => b.target === target && b.face === face && b.kind === kind && b.water === which);
              if (!group.length) continue;
              const causes = new Map<string, number>();
              for (const b of group) if (b.cause) causes.set(b.cause, (causes.get(b.cause) ?? 0) + 1);
              const holed = group.filter((b) => b.firstHole === b.firstHole);
              const lipped = group.filter((b) => b.firstLip === b.firstLip);
              const states = new Map<string, number>();
              for (const b of group) states.set(b.stateAtEnd || '—', (states.get(b.stateAtEnd || '—') ?? 0) + 1);
              lines.push(`- ${target}, face ${face}, ${kind}, ${which}: n ${group.length}; `
                + (kind !== 'board' ? `attached ${group.filter((b) => !(b.separatedAt === b.separatedAt)).length}; separated at ${q3(group.map((b) => b.separatedAt).filter((v) => v === v))} s (${[...causes].map(([c, k]) => `${c} ${k}`).join(', ') || 'none'}); lip ${lipped.length} (first ${q3(lipped.map((b) => b.firstLip))} s); ` : '')
                + `dropped ${holed.length} (first ${q3(holed.map((b) => b.firstHole))} s, for ${q3(holed.map((b) => b.holeTime))} s), most ${q3(group.map((b) => -b.minGap))} m; on the loft ${q3(group.map((b) => b.firstLoft).filter((v) => v === v))} s; covered ${group.filter((b) => b.coveredTime > 0).length}; life at the drop ${q3(holed.map((b) => b.lifeAtHole).filter((v) => v === v))}; end ${[...states].map(([c, k]) => `${c} ${k}`).join(', ')}`);
            }
          }
        }
      }
      lines.push('each rider (standing, prone) on the game\'s water: kind, target, face, front: separated at (s) cause | first on the loft (s), first drop (s), life there, most dropped (m) | first lip (s) | end state, d at the end (m), max life | its twin on the solver\'s water');
      for (const b of finished.filter((x) => x.kind !== 'board' && x.water === 'swept')) {
        const twin = finished.find((x) => x.kind === b.kind && x.water === 'solver' && x.target === b.target && x.face === b.face && x.front === b.front && x.t0 === b.t0);
        lines.push(`  ${b.kind}, ${b.target}, ${b.face}, ${b.front}: ${fmt(b.separatedAt)} ${b.cause || 'attached'} | ${fmt(b.firstLoft)}, ${fmt(b.firstHole)}, ${fmt(b.lifeAtHole)}, ${fmt(-b.minGap)} | ${fmt(b.firstLip)} | ${b.stateAtEnd}, ${fmt(b.dAtEnd)}, ${fmt(b.maxLife)} | ${twin ? `${fmt(twin.separatedAt)} ${twin.cause || 'attached'}, most dropped ${fmt(-twin.minGap)}` : '—'}`);
      }
    }
    appendFileSync(log, lines.join('\n') + '\n');
  }, 14_400_000);
});
