import { appendFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { describe, it } from 'vitest';
import { BoardBody } from '../../physics/BoardBody';
import { PhysicalSurfWater } from '../../physics/PhysicalSurfWater';
import { RideSession, type RideInput } from '../../physics/RideSession';
import { createWaterSample, type SurfWater, type WaterSample } from '../../physics/SurfWater';
import { sampleSurfaceHeight } from '../../scene/WaterSurface';
import { libraryFromBytes, POOL_TUBE_STAND_IN } from '../barrel/barrelLibrary';
import { BARREL_CASES } from '../barrel/barrelLibraryIndex';
import { FRONT_CAPACITY, FRONT_PIECE, FRONT_STRIDE } from '../barrel/frontRecords';
import { readBarrelCases } from '../barrel/nodeBarrelCases';
import { LANDMARK, PROFILE_POINTS } from '../barrel/ProfileLibrary';
import { createContactHit, SweptContact } from '../barrel/sweptContact';
import { BARREL_SLOPE, LOFT, LOFT_SAMPLES, SweptLoft, type LoftResult } from '../barrel/sweptLoft';
import { POOL, poolStraightFrame, regularSignificantHeight } from '../pool';
import { SurfZoneSimulation, type SurfZoneConfig } from '../SurfZoneSimulation';

/**
 * The surfable tube's bars (the surfable-tube plan's step 6; the water-physics advisor's step 3 ruling, 2026-11-03,
 * docs/research/pool-tube-face-2026-11-03/advisor-ruling.md), frame by frame at the Wave Pool's straight Barrel. Opt-in
 * (PROBE=1); a probe only. It extends step 2's hole probe (`poolTubeHole.probe.test.ts`).
 *
 * The sea, the contact and the water are the game's (`SurfZoneRunner`: the contact's loft with the config's `TubeFace`,
 * the water's union). Beside them, probe-only: the contact without the support's clamp (`union` off: the cases' own floor,
 * placed by the same anchor, for the lower face and the cases' own air), and the solver's water alone (the bodies' A/B).
 * Each measured frame (30 Hz; the rise every 60 Hz step) at reef columns s `COLUMNS`, the standing slice nearest the column
 * is read along its ray from its point (its drawn crest less its shift, `LoftResult.sliceShift`):
 * 1. the support (`surfaceAt`) less the solver's surface at 0.05–1.0 of the solver's face;
 * 3. the cases' own floor less the solver's at 0.05–0.4 of the face, through life 0.6;
 * 4. the support less the solver's at points fixed in the wave's frame (0.5–3 m ahead of the solver's crest), step to step;
 * 5. the air under the lip over the support, and the cases' own air gap (step 3's vertical gap, on the unclamped slice);
 * 6. at each column-wave's touchdown: the tip ahead of the drawn crest, in H_s, and the solver's breaking within ±0.5 H_s;
 * 7. the clock: every thrown front point's τ against the solver's time, step to step; each column-wave's open time;
 * 8. the loft's folds and holes, ray advance, the shift's slope along σ, the saddle between the solver's and the drawn crest;
 * 10. the crash's ledger and the meter, for the A/B against `SWITCHES=tubeFace=old,tubeFrom=piece`;
 * 12. the contact's update and the drawing's loft build.
 * Bodies (bars 2 and 9) at reef column `PLACE_S` (55 m): a standing rider and a prone one with no input and a lone board,
 * at 0.3 and 0.6 of the solver's face, in trim (with the crest at √(g h), along the line at the peel), as the column's slice
 * throws (τ crossing 0), 0.3 s down the line from it then, and at life 0.3; on the game's water and the solver's alone.
 *
 * H (1.05 | 1.32), CASE (pool | a38), SWITCHES (comma-separated `tubeFace=old`, `tubeFrom=piece`, `tubeLag=0`,
 * `tubeClock=old`), PERIODS (12), SETTLE (50 s), BODIES (0: none), COLUMNS, PLACE_S, LOG.
 */

const quantile = (values: number[], q: number) => {
  if (!values.length) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
};
const fmt = (value: number, digits = 2) => (value === value ? value.toFixed(digits) : '—');
const q3 = (values: number[], digits = 2) => (values.length ? `${fmt(quantile(values, 0.1), digits)} / ${fmt(quantile(values, 0.5), digits)} / ${fmt(quantile(values, 0.9), digits)}` : '—');
const pct = (part: number, whole: number) => (whole > 0 ? `${((100 * part) / whole).toFixed(1)} %` : '—');

const S = LOFT_SAMPLES;
const E = LOFT.extensionSamples;
/** The solver's face points read, of its height over its trough. */
const FACES = [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0] as const;
/**
 * Points fixed in the wave's frame: m along the solver's own column (z, which its crests travel along) from its face
 * crossing at 0.3 of its height (its lower face, which moves smoothly), on one line per column-wave.
 */
const FIXED = [-3, -2.5, -2, -1.5, -1, -0.5, 0, 0.5] as const;
const BEHIND = 4;
const AHEAD = 12;
const STEP = 0.1;
const READS = Math.round((BEHIND + AHEAD) / STEP) + 1;
const PEEL_CAP = 12;

/** Step 3's vertical air gap under a profile's roof (points 64–88 over 88–127), m (`poolTube.probe.test.ts`). */
function verticalGap(p: ArrayLike<number>): number {
  const x = (i: number) => p[2 * i];
  const y = (i: number) => p[2 * i + 1];
  let gap = 0;
  for (let i = LANDMARK.lip; i <= LANDMARK.throat; i += 1) {
    const px = x(i);
    const py = y(i);
    let best = Number.NaN;
    for (let k = LANDMARK.throat; k < PROFILE_POINTS - 1; k += 1) {
      const x0 = x(k);
      const x1 = x(k + 1);
      if (x0 === x1 || (x0 - px) * (x1 - px) > 0) continue;
      const under = y(k) + ((px - x0) / (x1 - x0)) * (y(k + 1) - y(k));
      if (under < py && !(under <= best)) best = under;
    }
    if (best === best && py - best > gap) gap = py - best;
  }
  return gap;
}

interface Read {
  t: number;
  front: number;
  column: number;
  tau: number;
  life: number;
  after: number;
  collapse: number;
  Hs: number;
  /** Bar 1: support less solver at FACES; bar 3: the cases' own floor less solver at FACES (NaN where no loft). */
  d: number[];
  raw: number[];
  /** Bar 5: the most air under the lip over the support, m (0: none); the cases' own vertical gap, m (unclamped slice). */
  air: number;
  caseGap: number;
  /** Bar 6: the tip ahead of the drawn crest, m; the solver's strongest breaking within ±0.5 H_s of the tip. */
  tipAhead: number;
  tipBreak: number;
  /** Bar 8: the saddle: the lower of the two crests over the support's lowest between them, m. */
  saddle: number;
  /** The shift (the drawn crest ahead of the point), m. */
  shift: number;
  /** The drawn crest over the solver's trough, m; the cases' own floor's lowest ahead less the solver's trough, m. */
  Hd: number;
  troughGap: number;
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
  baseGap: number;
  firstDrop: number;
  separatedAt: number;
  cause: string;
  /** Bar 9: the first time the lip's water reached its head or torso before touchdown, s after placing. */
  lipHead: number;
}

describe.runIf(process.env.PROBE)('the Wave Pool straight Barrel: the surfable tube\'s bars', () => {
  it('measures the bars', () => {
    const height = Number(process.env.H ?? 1.05);
    const caseName = process.env.CASE === 'a38' ? 'a38' : 'pool';
    const periods = Number(process.env.PERIODS ?? 12);
    const settle = Number(process.env.SETTLE ?? 50);
    const bodiesOn = process.env.BODIES !== '0';
    // LIGHT=1: the sea, its crash and clocks alone (bars 7 and 10, and the cost), for the A/B's ledger.
    const light = process.env.LIGHT === '1';
    // BODIES_ONLY=1: bars 2 and 9 alone (the reads skipped but the placements' own).
    const bodiesOnly = process.env.BODIES_ONLY === '1';
    const [cFrom, cTo, cStep] = (process.env.COLUMNS ?? '30,95,2.5').split(',').map(Number);
    const placeS = Number(process.env.PLACE_S ?? 55);
    const switches: Record<string, unknown> = {};
    for (const item of (process.env.SWITCHES ?? '').split(',').filter(Boolean)) {
      const [key, value] = item.split('=');
      switches[key] = value === '0' ? 0 : value;
    }
    const log = process.env.LOG ?? `pool-tube-face-${caseName}-${height}.txt`;
    writeFileSync(log, '');
    const t0 = Date.now();
    const bytes = caseName === 'a38' ? readBarrelCases(undefined, BARREL_CASES.filter((entry) => POOL_TUBE_STAND_IN.includes(entry.id))) : readBarrelCases('pool');
    const library = libraryFromBytes(bytes, 'basilisk', 'pool');
    const simulation = new SurfZoneSimulation({
      spot: 'pool', seed: 1, significantHeight: regularSignificantHeight(height), peakPeriod: POOL.period, directionDegrees: 0, spreading: 1000,
      tide: 0, windSpeed: 0, stage: 2, compute: 'cpu', poolWaves: 'barrel', ...(caseName === 'a38' ? { poolTubeCase: 'a38' } : {}), ...switches,
    } as unknown as SurfZoneConfig, 'spun-up', library);
    const { solver } = simulation;
    const face = simulation.tubeFace;
    const slope = BARREL_SLOPE.pool!;
    // The game's contact and water (SurfZoneRunner), and probe-only: the contact without the clamp, the solver's water alone.
    const contact = new SweptContact(library, slope, face ? { face } : {});
    const water = PhysicalSurfWater.forSimulation(simulation, contact, 1);
    const raw = new SweptContact(library, slope, face ? { face: { ...face, union: false } } : {});
    const plain = new PhysicalSurfWater(solver, { peakPeriod: POOL.period, breaking: simulation.feltBreaking, nodeSpacing: 1, aeration: simulation.aeration });
    const drawing = new SweptLoft(library, slope, { holdClearDrawing: true, ...(face ? { face } : {}) });
    const grid = simulation.renderGrid(1);
    const surface = new Float32Array(grid.nx * grid.nz * 2);
    const records = new Float32Array(FRONT_CAPACITY * FRONT_STRIDE);
    const hit = createContactHit();
    const eta = new Float64Array(READS);
    const support = new Float64Array(READS);
    const reads: Read[] = [];
    const xiOf = (i: number) => -BEHIND + i * STEP;
    const iOf = (xi: number) => Math.min(READS - 1, Math.max(0, Math.round((xi + BEHIND) / STEP)));
    const strengthAt = (x: number, z: number) => {
      const column = Math.min(solver.nx - 1, Math.max(0, Math.round((x - solver.xCenters[0]) / solver.dx)));
      return simulation.breaking.strength[solver.rowBelow(z) * solver.nx + column];
    };
    // Each slice's point, its ray and its read origin (2 cm into its strip: a point exactly on a ray can round off it).
    const origin = (loft: LoftResult, s: number) => {
      const P = loft.positions;
      const c = 3 * (s * S + E + LANDMARK.crest);
      const n = c + 3 * S;
      const rx = loft.sliceRayX[s];
      const rz = loft.sliceRayZ[s];
      const length = Math.hypot(P[n] - P[c], P[n + 2] - P[c + 2]);
      const inX = length > 0 ? (0.02 * (P[n] - P[c])) / length : 0;
      const inZ = length > 0 ? (0.02 * (P[n + 2] - P[c + 2])) / length : 0;
      const shift = loft.sliceShift[s];
      return { x: P[c] - shift * rx + inX, z: P[c + 2] - shift * rz + inZ, rx, rz, shift, crestY: P[c + 1] };
    };
    /** The solver's section and the support along the ray from (x, z): its crest within ±2 m of the point, its trough within 10 m ahead. */
    const section = (x: number, z: number, rx: number, rz: number) => {
      for (let i = 0; i < READS; i += 1) {
        const px = x + xiOf(i) * rx;
        const pz = z + xiOf(i) * rz;
        eta[i] = water.plainSurfaceAt(px, pz);
        support[i] = water.surfaceAt(px, pz);
      }
      let ic = iOf(-2);
      for (let i = iOf(-2); i <= iOf(2); i += 1) if (eta[i] > eta[ic]) ic = i;
      let it = ic;
      for (let i = ic; i <= Math.min(READS - 1, ic + Math.round(10 / STEP)); i += 1) if (eta[i] < eta[it]) it = i;
      return { ic, it, Hs: eta[ic] - eta[it] };
    };
    const faceXi = (ic: number, it: number, f: number) => {
      const level = eta[it] + f * (eta[ic] - eta[it]);
      let i = ic;
      while (i < it && eta[i + 1] > level) i += 1;
      const u = eta[i] !== eta[i + 1] ? (eta[i] - level) / (eta[i] - eta[i + 1]) : 0;
      return { xi: xiOf(i) + u * STEP, level };
    };
    const profile = new Float64Array(2 * PROFILE_POINTS);
    const readSlice = (loft: LoftResult, rawLoft: LoftResult | undefined, s: number, column: number, t: number): Read | undefined => {
      const o = origin(loft, s);
      const { ic, it, Hs } = section(o.x, o.z, o.rx, o.rz);
      if (!(Hs > 0.2)) return undefined;
      const at = (xi: number) => [o.x + xi * o.rx, o.z + xi * o.rz] as const;
      const d: number[] = [];
      const rawD: number[] = [];
      for (const f of FACES) {
        const { xi, level } = faceXi(ic, it, f);
        const [x, z] = at(xi);
        d.push(water.surfaceAt(x, z) - level);
        const floor = raw.floorAt(x, z);
        rawD.push(floor === floor ? floor - level : Number.NaN);
      }
      const P = loft.positions;
      const base = s * S + E;
      const alongOf = (index: number) => (P[3 * (base + index)] - o.x) * o.rx + (P[3 * (base + index) + 2] - o.z) * o.rz;
      const crestXi = alongOf(LANDMARK.crest);
      const tipXi = alongOf(LANDMARK.lip);
      // Bar 5: the air under the lip over the support, from the drawn crest to past the tip.
      let air = 0;
      for (let xi = Math.min(crestXi, tipXi) - 0.2; xi <= Math.max(crestXi, tipXi) + 0.6; xi += 0.05) {
        const [x, z] = at(xi);
        const floor = water.surfaceAt(x, z);
        if (!contact.query(x, floor + 0.005, z, hit) || hit.inWater || !(hit.ceilingY === hit.ceilingY)) continue;
        air = Math.max(air, hit.ceilingY - floor);
      }
      // The cases' own air gap: step 3's measure on the unclamped slice, in its plane.
      let caseGap = Number.NaN;
      if (rawLoft && rawLoft.sliceSigma[s] === loft.sliceSigma[s] && rawLoft.sliceFront[s] === loft.sliceFront[s]) {
        const Q = rawLoft.positions;
        const c = 3 * (base + LANDMARK.crest);
        for (let j = 0; j < PROFILE_POINTS; j += 1) {
          const v = 3 * (base + j);
          profile[2 * j] = (Q[v] - Q[c]) * o.rx + (Q[v + 2] - Q[c + 2]) * o.rz;
          profile[2 * j + 1] = Q[v + 1] - Q[c + 1];
        }
        caseGap = verticalGap(profile);
      }
      // Bar 6: the solver's strongest breaking within ±0.5 H_s of the tip along the ray.
      let tipBreak = 0;
      for (let xi = tipXi - 0.5 * Hs; xi <= tipXi + 0.5 * Hs; xi += 0.25) tipBreak = Math.max(tipBreak, strengthAt(...at(xi)));
      // Bar 8: the saddle between the solver's crest and the drawn crest.
      let low = Infinity;
      const from = Math.min(xiOf(ic), crestXi);
      const to = Math.max(xiOf(ic), crestXi);
      for (let i = iOf(from); i <= iOf(to); i += 1) low = Math.min(low, support[i]);
      const saddle = Math.max(0, Math.min(eta[ic], o.crestY) - low);
      let rawLow = Infinity;
      for (let xi = crestXi; xi <= xiOf(it) + 2; xi += 0.25) {
        const floor = raw.floorAt(...at(xi));
        if (floor === floor) rawLow = Math.min(rawLow, floor);
      }
      return {
        Hd: o.crestY - eta[it], troughGap: rawLow - eta[it],
        t, front: loft.sliceFront[s] % FRONT_PIECE, column, tau: loft.sliceTau[s], life: loft.sliceLife[s], after: loft.sliceAfter[s],
        collapse: loft.sliceCollapse[s], Hs, d, raw: rawD, air, caseGap, tipAhead: tipXi - crestXi, tipBreak, saddle, shift: o.shift,
      };
    };

    // The bodies (bars 2 and 9): their reactions not applied, so the sea stays shared and as is.
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
    const input: RideInput = { paddle: false, popUp: false, steer: 0, trim: 0, crouch: 0 };
    const sample: WaterSample = createWaterSample();
    const part = new Vector3();
    const place = (x0: number, z0: number, rx: number, rz: number, target: string, front: number, peel: number, tangent: [number, number]) => {
      const { ic, it, Hs } = section(x0, z0, rx, rz);
      if (!(Hs > 0.2)) return;
      const crestX = x0 + xiOf(ic) * rx;
      const crestZ = z0 + xiOf(ic) * rz;
      const celerity = Math.sqrt(9.81 * Math.max(0, solver.sampleCentered(solver.h, crestX, crestZ)));
      const vx = celerity * rx + peel * tangent[0];
      const vz = celerity * rz + peel * tangent[1];
      for (const fraction of [0.3, 0.6]) {
        const { xi } = faceXi(ic, it, fraction);
        const x = x0 + xi * rx;
        const z = z0 + xi * rz;
        for (const kind of ['rider', 'prone', 'board'] as const) {
          for (const which of ['swept', 'solver'] as const) {
            // Each on its own water's surface there (the game's: the union, never under the solver's surface).
            const own = which === 'swept' ? water : plain;
            const surface0 = own.surfaceAt(x, z);
            const flow = own.sampleAt(x, surface0 - 0.05, z, sample);
            const heading = Math.atan2(vx - flow.flowX, vz - flow.flowZ);
            const speed = Math.hypot(vx - flow.flowX, vz - flow.flowZ);
            const session = kind !== 'board' ? new RideSession() : undefined;
            const board = session ? session.board : new BoardBody();
            if (session) session.place({ x, z, heading, speed, phase: kind === 'prone' ? 'prone' : 'standing', followSurface: true }, waters[which]);
            else {
              const s0 = own.sampleAt(x, surface0 - 0.05, z, sample);
              const up = new Vector3(s0.normalX, s0.normalY, s0.normalZ).normalize();
              const forward = new Vector3(Math.sin(heading), -(up.x * Math.sin(heading) + up.z * Math.cos(heading)) / up.y, Math.cos(heading)).normalize();
              const left = new Vector3().crossVectors(up, forward);
              const orientation = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, up, forward));
              const velocity = new Vector3(vx, 0, vz);
              const top = own.sampleAt(x, surface0, z, sample);
              velocity.y = top.flowY + velocity.x * top.slopeX + velocity.z * top.slopeZ;
              board.place(new Vector3(x, surface0 + board.shape.centerOfMass.y - 0.05, z), orientation, velocity);
            }
            bodies.push({
              kind, water: which, target, face: fraction, front, t0: solver.time, session, board, done: false, minGap: Infinity, baseGap: Number.NaN,
              firstDrop: Number.NaN, separatedAt: Number.NaN, cause: '', lipHead: Number.NaN,
            });
          }
        }
      }
    };
    const stepBodies = (dt: number) => {
      for (const body of bodies) {
        const real = body.water === 'swept' ? water : plain;
        if (body.session) real.withSurfaceNodeCache(() => body.session!.step(dt, waters[body.water], input));
        else real.withSurfaceNodeCache(() => body.board.step(dt, waters[body.water]));
        const age = solver.time - body.t0;
        const p = body.board.position;
        if (!Number.isFinite(p.x + p.y + p.z) || body.board.outsideDomain) {
          body.done = true;
          body.cause ||= 'lost';
          continue;
        }
        // The board's bottom against the solver's surface under it, from where it started.
        // Against its own water's support under it (the game's: the union's floor).
        const gap = p.y - body.board.shape.centerOfMass.y - (body.water === 'swept' ? water : plain).surfaceAt(p.x, p.z);
        if (!(body.baseGap === body.baseGap)) body.baseGap = gap;
        body.minGap = Math.min(body.minGap, gap - body.baseGap);
        if (gap - body.baseGap < -0.1 && !(body.firstDrop === body.firstDrop)) body.firstDrop = age;
        // Bar 9: the lip's water at the head or torso (render points 1 and 2), before its slice's touchdown.
        if (body.session && body.water === 'swept' && body.session.rider.attached && !(body.lipHead === body.lipHead)) {
          for (const k of [1, 2]) {
            body.session.renderPoint(k, part);
            const s0 = water.sampleAt(part.x, part.y, part.z, sample);
            const before = contact.query(part.x, part.y, part.z, hit) && hit.life === hit.life ? hit.life < 1 : true;
            if (before && s0.waterFloorY !== undefined && part.y < s0.surfaceY && part.y > s0.waterFloorY) {
              body.lipHead = age;
              break;
            }
          }
        }
        const separated = body.session !== undefined && !body.session.rider.attached;
        if (separated || age >= 3) {
          body.done = true;
          body.separatedAt = separated ? age : Number.NaN;
          body.cause = separated ? String(body.session!.separation ?? '?') : '';
        }
      }
      for (let k = bodies.length - 1; k >= 0; k -= 1) if (bodies[k].done) finished.push(...bodies.splice(k, 1));
    };
    const peelAt = (loft: LoftResult, s: number): { speed: number; dir: [number, number] } | undefined => {
      const front = loft.sliceFront[s];
      const sigma0 = loft.sliceSigma[s];
      let n = 0, ms = 0, mt = 0, mss = 0, mst = 0, lo = -1, hi = -1;
      for (let k = 0; k < loft.sliceCount; k += 1) {
        if (loft.sliceFront[k] !== front || !(loft.sliceWeight[k] > 0) || Math.abs(loft.sliceSigma[k] - sigma0) > 4) continue;
        const sg = loft.sliceSigma[k] - sigma0;
        n += 1; ms += sg; mt += loft.sliceTau[k]; mss += sg * sg; mst += sg * loft.sliceTau[k];
        if (lo < 0 || loft.sliceSigma[k] < loft.sliceSigma[lo]) lo = k;
        if (hi < 0 || loft.sliceSigma[k] > loft.sliceSigma[hi]) hi = k;
      }
      if (n < 4 || lo === hi) return undefined;
      const slopeT = (n * mst - ms * mt) / (n * mss - ms * ms);
      if (!(Math.abs(slopeT) > 1e-3)) return undefined;
      const a = 3 * (lo * S + E + LANDMARK.crest);
      const b = 3 * (hi * S + E + LANDMARK.crest);
      const dx = loft.positions[b] - loft.positions[a];
      const dz = loft.positions[b + 2] - loft.positions[a + 2];
      const norm = Math.hypot(dx, dz);
      return { speed: 1 / Math.abs(slopeT), dir: slopeT < 0 ? [dx / norm, dz / norm] : [-dx / norm, -dz / norm] };
    };

    while (solver.time < settle) simulation.step(1 / 30);
    const dt = 1 / 60;
    const steps = Math.round((periods * POOL.period) / dt);
    const columnOf = (s: number) => Math.round((s - cFrom) / cStep);
    const columns = Math.floor((cTo - cFrom) / cStep) + 1;
    const contactMs: number[] = [];
    const drawMs: number[] = [];
    const rates: number[] = [];
    const lastTau = new Map<number, number>();
    const thrownAt = new Map<number, number>();
    const joinedAt = new Map<number, number>();
    const firstTau: number[] = [];
    const leadTimes: number[] = [];
    const bigRises: string[] = [];
    const pointOpen: number[] = [];
    const pointCase: number[] = [];
    const rises: number[] = [];
    /** The lower face (−0.5–0.5 m about the 0.3 H_s crossing) and up the face behind it (−3 to −1 m). */
    const risesLow: number[] = [];
    const risesHigh: number[] = [];
    const lastFixed = new Map<string, { n: number; gaps: number[]; x: number }>();
    const fixedBelow: number[] = [];
    let builds = 0, overlaps = 0, overlapsOpen = 0, minAdvance = Infinity, shiftMisses = 0, slices = 0;
    const shiftSlopes: number[] = [];
    const placedThrow = new Set<number>();
    const placedOpen = new Set<number>();
    const lastPlaceTau = new Map<number, number>();
    const crash0 = simulation.crash ? { ...simulation.crash.counts } : undefined;
    for (let n = 1; n <= steps; n += 1) {
      simulation.step(dt);
      const count = simulation.writeTubeRecords(records);
      let started = performance.now();
      water.withSurfaceNodeCache(() => contact.update(records, count, solver.restLevel, (x, z) => water.plainSurfaceAt(x, z)));
      contactMs.push(performance.now() - started);
      if (!light && n % 2 === 0) water.withSurfaceNodeCache(() => raw.update(records, count, solver.restLevel, (x, z) => water.plainSurfaceAt(x, z)));
      if (n % 30 === 0 && count > 0) {
        // The drawing's loft build over the drawn surface (bilinear, as the Classic look; the page's cost, bar 12).
        grid.xMin = simulation.windowXMin;
        simulation.writeUniformSurface(surface, grid, false);
        started = performance.now();
        drawing.build(records, count, solver.restLevel, (x, z) => sampleSurfaceHeight(surface, grid, x, z));
        drawMs.push(performance.now() - started);
      }
      // Bar 7: every thrown point's clock against the solver's time.
      if (simulation.front) {
        for (const p of simulation.front.points) {
          const previous = lastTau.get(p.id);
          const times = library.profileTimes({ slope, footHeight: p.footHeight, footDepth: p.footDepth });
          if (previous !== undefined && previous >= 0 && p.tau >= 0 && p.tau < times.touchdownSeconds) rates.push((p.tau - previous) / dt);
          // Each point's open time in the solver's time: from its clock's crossing of 0 to its crossing of touchdown.
          if (previous === undefined) { joinedAt.set(p.id, solver.time); firstTau.push(p.tau); }
          if (previous !== undefined && previous < 0 && p.tau >= 0) {
            thrownAt.set(p.id, solver.time - dt * (p.tau / Math.max(1e-9, p.tau - previous)));
            const joined = joinedAt.get(p.id);
            if (joined !== undefined) leadTimes.push(thrownAt.get(p.id)! - joined);
          }
          const from = thrownAt.get(p.id);
          if (previous !== undefined && from !== undefined && previous < times.touchdownSeconds && p.tau >= times.touchdownSeconds) {
            const landed = solver.time - dt * ((p.tau - times.touchdownSeconds) / Math.max(1e-9, p.tau - previous));
            pointOpen.push(landed - from);
            pointCase.push(times.touchdownSeconds);
            thrownAt.delete(p.id);
          }
          lastTau.set(p.id, p.tau);
        }
      }
      if (bodiesOn) stepBodies(dt);
      if (count === 0 || light) continue;
      const loft = contact.last!;
      // Bar 8's per-build geometry.
      builds += 1;
      overlaps += loft.overlaps;
      overlapsOpen += loft.overlapsOpen;
      minAdvance = Math.min(minAdvance, loft.rayMinAdvance);
      shiftMisses += loft.shiftMisses;
      slices += loft.sliceCount;
      if (n % 2 === 0) {
        for (let s = 0; s + 1 < loft.sliceCount; s += 1) {
          if (loft.sliceJoined[s] !== 1 || !(loft.sliceWeight[s] >= 0.5)) continue;
          const dSigma = loft.sliceSigma[s + 1] - loft.sliceSigma[s];
          if (dSigma > 0.05) shiftSlopes.push(Math.abs((loft.sliceShift[s + 1] - loft.sliceShift[s]) / dSigma));
        }
      }
      // Each column's standing slice nearest it.
      const best = new Int32Array(columns).fill(-1);
      const bestDist = new Float64Array(columns).fill(Infinity);
      let placeSlice = -1;
      let placeDist = Infinity;
      for (let s = 0; s < loft.sliceCount; s += 1) {
        if (!(loft.sliceWeight[s] >= 0.5) || loft.sliceJoined[s] !== 1) continue;
        const c = 3 * (s * S + E + LANDMARK.crest);
        const shift = loft.sliceShift[s];
        const reefS = poolStraightFrame(loft.positions[c] - shift * loft.sliceRayX[s], loft.positions[c + 2] - shift * loft.sliceRayZ[s]).s;
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
      if (n % 2 !== 0) continue;
      water.withSurfaceNodeCache(() => {
        for (let k = 0; k < columns && !bodiesOnly; k += 1) {
          const s = best[k];
          if (s < 0) continue;
          // Bar 4: the support less the solver's at points fixed in the wave's frame, every step: along the solver's own
          // column (z) through the column-wave's first point, which its crests travel along, from their lower face.
          const o = origin(loft, s);
          const key = `${loft.sliceFront[s] % FRONT_PIECE}:${k}`;
          const lineX = lastFixed.get(key)?.x ?? o.x;
          const { ic, it, Hs } = section(lineX, o.z, 0, 1);
          if (!(Hs > 0.2)) continue;
          // The wave's frame: the solver's lower face, its crossing at 0.3 of its height, interpolated between reads.
          const lower = faceXi(ic, it, 0.3).xi;
          const gapAt = (xi: number) => {
            const f = (xi + BEHIND) / STEP;
            const i = Math.min(READS - 2, Math.max(0, Math.floor(f)));
            const u = Math.min(1, Math.max(0, f - i));
            return support[i] + u * (support[i + 1] - support[i]) - (eta[i] + u * (eta[i + 1] - eta[i]));
          };
          const gaps = FIXED.map((ahead) => gapAt(lower + ahead));
          for (const g of gaps) fixedBelow.push(g);
          const last = lastFixed.get(key);
          if (last && last.n === n - 2) {
            for (let j = 0; j < gaps.length; j += 1) {
              // Per 1/60 s step, over the two steps between reads.
              const rise = (gaps[j] - last.gaps[j]) / 2;
              rises.push(rise);
              (FIXED[j] >= -0.5 ? risesLow : risesHigh).push(rise);
              if (rise > 0.2 && bigRises.length < 40) bigRises.push(`t ${solver.time.toFixed(2)} col ${k} front ${key} at ${FIXED[j]} m: ${fmt(last.gaps[j])} → ${fmt(gaps[j])} m, τ ${fmt(loft.sliceTau[s])}, life ${fmt(loft.sliceLife[s])}, weight ${fmt(loft.sliceWeight[s])}, shift ${fmt(loft.sliceShift[s])}, slice σ ${fmt(loft.sliceSigma[s], 1)}`);
            }
          }
          lastFixed.set(key, { n, gaps, x: lineX });
          const read = readSlice(loft, raw.last, s, k, solver.time);
          if (read) reads.push(read);
        }
        if (!bodiesOn || placeSlice < 0) return;
        const s = placeSlice;
        const front = loft.sliceFront[s] % FRONT_PIECE;
        const o = origin(loft, s);
        const previous = lastPlaceTau.get(front);
        lastPlaceTau.set(front, loft.sliceTau[s]);
        const touchdown = loft.sliceLife[s] > 0 ? loft.sliceTau[s] / loft.sliceLife[s] : Number.NaN;
        if (previous !== undefined && previous < 0 && loft.sliceTau[s] >= 0 && !placedThrow.has(front)) {
          placedThrow.add(front);
          const peel = peelAt(loft, s);
          if (!peel) return;
          peels.push(peel.speed);
          const speed = Math.min(PEEL_CAP, peel.speed);
          place(o.x, o.z, o.rx, o.rz, 'throw', front, speed, peel.dir);
          const ahead = 0.3 * peel.speed;
          place(o.x + ahead * peel.dir[0], o.z + ahead * peel.dir[1], o.rx, o.rz, 'ahead 0.3 s', front, speed, peel.dir);
        } else if (!placedOpen.has(front) && loft.sliceLife[s] >= 0.3 && touchdown === touchdown) {
          placedOpen.add(front);
          const peel = peelAt(loft, s);
          if (!peel) return;
          place(o.x, o.z, o.rx, o.rz, 'open, life 0.3', front, Math.min(PEEL_CAP, peel.speed), peel.dir);
        }
      });
    }
    for (const body of bodies) finished.push(body);

    // The tables.
    const lines: string[] = [];
    lines.push(`pool straight Barrel, H ${height} m at the feed, cases ${caseName}, switches ${JSON.stringify(switches)}, tubeFace ${JSON.stringify(face)}; ${periods} periods after ${settle} s; CPU 1/60 s; ${((Date.now() - t0) / 1000).toFixed(0)} s wall`);
    lines.push(`reads ${reads.length}, fronts ${new Set(reads.map((r) => r.front)).size}; H_s ${q3(reads.map((r) => r.Hs))} m; drawn H (its crest over the solver's trough) ${q3(reads.map((r) => r.Hd))} m; shift (the drawn crest ahead of the point) ${q3(reads.map((r) => r.shift))} m; the cases' own lowest less the solver's trough ${q3(reads.map((r) => r.troughGap).filter((v) => Number.isFinite(v)))} m`);
    const anchorStats = (contact as unknown as { loft: { faceAnchor?: { stats: object } } }).loft.faceAnchor?.stats;
    lines.push(`the contact's face anchor: ${JSON.stringify(anchorStats ?? 'none')}; the front: joins ${simulation.front?.joins}, unbroken ${simulation.front?.unbroken}, lost ${simulation.front?.lost}`);
    const bins: [string, (r: Read) => boolean][] = [
      ['τ < −1 s', (r) => r.tau < -1], ['τ −1…0 s', (r) => r.tau >= -1 && r.tau < 0], ['life 0–0.3', (r) => r.life >= 0 && r.life < 0.3],
      ['life 0.3–0.6', (r) => r.life >= 0.3 && r.life < 0.6], ['life 0.6–1', (r) => r.life >= 0.6 && r.life < 1], ['landed', (r) => r.after >= 0],
    ];
    // Bar 1.
    const all1 = reads.flatMap((r) => r.d);
    lines.push('');
    lines.push(`## Bar 1, support − solver ≥ −0.02 m on 100 % of face reads (0.05–1.0 H_s): ${pct(all1.filter((v) => v >= -0.02).length, all1.length)} of ${all1.length}; min ${fmt(Math.min(...all1), 3)} m; p0.1 ${fmt(quantile(all1, 0.001), 3)}`);
    for (const [name, test] of bins) {
      const bin = reads.filter(test);
      if (!bin.length) continue;
      lines.push(`- ${name} (n ${bin.length}): ` + FACES.map((f, j) => { const v = bin.map((r) => r.d[j]); return `${f}: ${fmt(quantile(v, 0.5), 2)} (min ${fmt(Math.min(...v), 2)})`; }).join(' | '));
    }
    // Bar 3.
    const lower: number[] = [];
    for (const r of reads) {
      if (!(r.life < 0.6) && !(r.tau < 0)) continue;
      FACES.forEach((f, j) => { if (f <= 0.4 && r.raw[j] === r.raw[j]) lower.push(Math.abs(r.raw[j]) / r.Hs); });
    }
    lines.push('');
    lines.push(`## Bar 3, the cases' own lower face against the solver's (|gap| / H_s over 0.05–0.4 H_s, through life 0.6): p50 ${fmt(quantile(lower, 0.5), 3)} (≤ 0.05), p95 ${fmt(quantile(lower, 0.95), 3)} (≤ 0.15); n ${lower.length}`);
    for (const [name, test] of bins) {
      const bin = reads.filter(test);
      if (!bin.length) continue;
      lines.push(`- ${name}: ` + FACES.filter((f) => f <= 0.4).map((f) => { const j = FACES.indexOf(f); const v = bin.map((r) => r.raw[j]).filter((x) => x === x); return `${f}: ${q3(v)}`; }).join(' | ') + ' m (case floor − solver, p10 / p50 / p90)');
    }
    // Bar 4.
    const rising = rises.filter((v) => v > 0);
    lines.push('');
    lines.push(`## Bar 4, the support over the solver at points fixed in the wave's frame (${FIXED.join(', ')}): (m from the solver's face crossing at 0.3 H_s): rise per 1/60 s step p50 / p99 / p99.9 / max ${[0.5, 0.99, 0.999].map((q) => fmt(quantile(rising, q), 4)).join(' / ')} / ${fmt(Math.max(...rising, 0), 3)} m (≤ 0.02); steps over 0.02 m ${pct(rising.filter((v) => v > 0.02).length, rises.length)} of ${rises.length}; under the solver by more than 0.02 m ${pct(fixedBelow.filter((v) => v < -0.02).length, fixedBelow.length)}`);
    for (const [name, list] of [['on the lower face (−0.5…0.5 m)', risesLow], ['up the face (−3…−1 m)', risesHigh]] as const) {
      const up = list.filter((v) => v > 0);
      lines.push(`- ${name}: rise p99 / p99.9 / max ${[0.99, 0.999].map((q) => fmt(quantile(up, q), 3)).join(' / ')} / ${fmt(Math.max(...up, 0), 3)} m; steps over 0.02 m ${pct(up.filter((v) => v > 0.02).length, list.length)}`);
    }
    lines.push(`the largest rises (over 0.2 m), up to 40: \n  ${bigRises.join('\n  ')}`);
    lines.push(`each point's first clock ${q3(firstTau)} s; its time from first seen to its throw ${q3(leadTimes)} s (n ${leadTimes.length})`);
    // Bar 5.
    const open = reads.filter((r) => r.life >= 0.1 && r.life < 0.8);
    const airs = open.map((r) => r.air);
    const caseGaps = open.map((r) => r.caseGap).filter((v) => v === v);
    lines.push('');
    lines.push(`## Bar 5, air under the lip over the support at life 0.1–0.8: > 0 on ${pct(airs.filter((v) => v > 0).length, airs.length)} (≥ 90 %); p10 / p50 / p90 ${q3(airs)} m; the cases' own gap ${q3(caseGaps)} m; p50 ratio ${fmt(quantile(airs, 0.5) / quantile(caseGaps, 0.5), 2)} (0.7–1.3)`);
    for (const [name, test] of bins.slice(2, 5)) {
      const bin = reads.filter(test);
      if (bin.length) lines.push(`- ${name}: air ${q3(bin.map((r) => r.air))} m, > 0 ${pct(bin.filter((r) => r.air > 0).length, bin.length)}; the cases' own ${q3(bin.map((r) => r.caseGap).filter((v) => v === v))} m`);
    }
    // Bars 6 and 7 per column-wave.
    const byKey = new Map<string, Read[]>();
    for (const r of reads) {
      const key = `${r.front}:${r.column}`;
      (byKey.get(key) ?? byKey.set(key, []).get(key)!).push(r);
    }
    const tipAhead: number[] = [];
    const tipAheadD: number[] = [];
    const tipBreak: number[] = [];
    const openTimes: number[] = [];
    const caseOpen: number[] = [];
    for (const list of byKey.values()) {
      list.sort((a, b) => a.t - b.t);
      const landing = list.find((r) => r.life >= 1);
      if (landing) {
        tipAheadD.push(landing.tipAhead / landing.Hd);
        tipAhead.push(landing.tipAhead / landing.Hs);
        tipBreak.push(landing.tipBreak);
      }
      const throwRead = list.findIndex((r) => r.tau >= 0);
      const landRead = list.findIndex((r) => r.life >= 1);
      if (throwRead > 0 && landRead > throwRead && list[throwRead - 1].tau < 0) {
        // Interpolated to τ = 0 and life = 1.
        const a0 = list[throwRead - 1];
        const a1 = list[throwRead];
        const tThrow = a0.t + ((0 - a0.tau) / (a1.tau - a0.tau)) * (a1.t - a0.t);
        const b0 = list[landRead - 1];
        const b1 = list[landRead];
        const tLand = b0.t + ((1 - b0.life) / (b1.life - b0.life)) * (b1.t - b0.t);
        openTimes.push(tLand - tThrow);
        caseOpen.push(b1.tau / b1.life);
      }
    }
    lines.push('');
    lines.push(`## Bar 6, touchdown (each column-wave's first read past life 1; n ${tipAhead.length}): the solver's breaking ≥ 0.3 within ±0.5 H_s of the tip on ${pct(tipBreak.filter((v) => v >= 0.3).length, tipBreak.length)} (≥ 90 %), its strength ${q3(tipBreak)}; the tip ahead of the drawn crest ${q3(tipAhead)} H_s, within 0.6–1.5 on ${pct(tipAhead.filter((v) => v >= 0.6 && v <= 1.5).length, tipAhead.length)}; in the drawn H ${q3(tipAheadD)}, within 0.6–1.5 on ${pct(tipAheadD.filter((v) => v >= 0.6 && v <= 1.5).length, tipAheadD.length)}`);
    lines.push('');
    lines.push(`## Bar 7, the clock after the throw (every thrown point, step to step): p50 ${fmt(quantile(rates, 0.5), 3)}× (0.95–1.05), p95 ${fmt(quantile(rates, 0.95), 3)}× (≤ 1.25), max ${fmt(Math.max(...rates), 3)}×, at the cap (≥ 1.24×) ${pct(rates.filter((v) => v >= 1.24).length, rates.length)}, n ${rates.length}; open time in the solver's time per point (its τ 0 → touchdown) ${q3(pointOpen)} s against its case's ${q3(pointCase)} s, ratio p50 ${fmt(quantile(pointOpen.map((v, i) => v / pointCase[i]), 0.5), 3)}, within ±15 % ${pct(pointOpen.filter((v, i) => Math.abs(v / pointCase[i] - 1) <= 0.15).length, pointOpen.length)} (n ${pointOpen.length}); at a fixed reef column (points travel along the reef as they come shoreward) ${q3(openTimes)} s (n ${openTimes.length})`);
    lines.push('');
    lines.push(`## Bar 8, geometry: folds (overlaps) a build ${(overlaps / Math.max(1, builds)).toFixed(3)}, holes (open overlaps) ${(overlapsOpen / Math.max(1, builds)).toFixed(3)}, least ray advance ${fmt(minAdvance, 4)} m; |dδ/dσ| p50 / p95 ${fmt(quantile(shiftSlopes, 0.5), 3)} / ${fmt(quantile(shiftSlopes, 0.95), 3)} (≤ 0.3); slices with no face crossing (the crest anchor stood) ${pct(shiftMisses, slices)}; the saddle ${q3(reads.map((r) => r.saddle))} m, in H_s p50 / p95 / max ${[0.5, 0.95].map((q) => fmt(quantile(reads.map((r) => r.saddle / r.Hs), q), 3)).join(' / ')} / ${fmt(Math.max(...reads.map((r) => r.saddle / r.Hs)), 3)} (≤ 0.1)`);
    // Bar 10.
    const c1 = simulation.crash?.counts;
    const ledger = c1 && crash0 ? `throws ${c1.throws - crash0.throws}, thrown ${(c1.thrown - crash0.thrown).toFixed(2)} m³ of ${(c1.asked - crash0.asked).toFixed(2)} asked, crashes ${c1.crashes - crash0.crashes}, foreseen ${c1.foreseen - crash0.foreseen}, exits ${c1.exits - crash0.exits}, missed ${c1.missed - crash0.missed}` : 'no crash';
    lines.push('');
    lines.push(`## Bar 10, the ledger over the run: ${ledger}; lip launches ${simulation.lipLaunches}; the meter ${JSON.stringify(simulation.surf.reading(solver.time, periods * POOL.period))}`.slice(0, 600));
    lines.push(`the crash's counts (cumulative from the start): ${JSON.stringify(simulation.crash?.counts)}`.slice(0, 800));
    // Bar 12.
    lines.push('');
    lines.push(`## Bar 12, cost (Node, this M1, under shared load): the contact's update a step p50 / p90 ${fmt(quantile(contactMs, 0.5), 2)} / ${fmt(quantile(contactMs, 0.9), 2)} ms; the drawing's loft build p50 / p90 ${fmt(quantile(drawMs, 0.5), 2)} / ${fmt(quantile(drawMs, 0.9), 2)} ms`);
    // Bars 2 and 9.
    if (bodiesOn) {
      lines.push('');
      lines.push(`## Bars 2 and 9, bodies at s ${placeS} in trim (peel ${q3(peels)} m/s), no input, each on its own water's surface: game's water | solver's alone; "dropped": its bottom more than 0.1 m under its water's support from where it started`);
      const causes = (g: Body[]) => [...g.reduce((m, b) => (b.cause ? m.set(b.cause, (m.get(b.cause) ?? 0) + 1) : m), new Map<string, number>())].map(([c, k]) => `${c} ${k}`).join(', ');
      lines.push(`the game's riders' causes: ${causes(finished.filter((b) => b.kind !== 'board' && b.water === 'swept'))}; the solver's: ${causes(finished.filter((b) => b.kind !== 'board' && b.water === 'solver'))}`);
      for (const target of ['ahead 0.3 s', 'throw', 'open, life 0.3']) {
        for (const [kind, face] of [['board', 0.3], ['board', 0.6], ['prone', 0.3], ['prone', 0.6], ['rider', 0.3], ['rider', 0.6]] as const) {
          const game = finished.filter((b) => b.target === target && b.kind === kind && b.face === face && b.water === 'swept');
          const solo = finished.filter((b) => b.target === target && b.kind === kind && b.face === face && b.water === 'solver');
          if (!game.length) continue;
          const drops = (g: Body[]) => g.filter((b) => b.firstDrop === b.firstDrop).length;
          const on = (g: Body[]) => g.filter((b) => !(b.separatedAt === b.separatedAt)).length;
          const lipped = game.filter((b) => b.lipHead === b.lipHead);
          const fellSoon = lipped.filter((b) => b.separatedAt === b.separatedAt && b.separatedAt - b.lipHead <= 0.5).length;
          lines.push(`- ${target}, ${kind} at ${face} of the face: n ${game.length}; dropped > 0.1 m ${drops(game)} | ${drops(solo)}; most dropped p90 ${fmt(quantile(game.map((b) => -b.minGap), 0.9))} | ${fmt(quantile(solo.map((b) => -b.minGap), 0.9))} m`
            + (kind !== 'board' ? `; on at 3 s ${on(game)} | ${on(solo)}; fell at p50 ${fmt(quantile(game.map((b) => b.separatedAt).filter((v) => v === v), 0.5))} | ${fmt(quantile(solo.map((b) => b.separatedAt).filter((v) => v === v), 0.5))} s; lip on head or torso before touchdown ${lipped.length}, of them fell within 0.5 s ${fellSoon}` : ''));
        }
      }
    }
    appendFileSync(log, lines.join('\n') + '\n');
  }, 14_400_000);
});
