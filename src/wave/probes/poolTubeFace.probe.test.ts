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
import { anchorCounts } from '../barrel/faceAnchor';
import { pathPace } from '../barrel/sliceClock';
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
 * `tubeClock=old`; step 7's `tubeAnchor=old`, `tubeForm=old`, `tubeThrow=break`, `wallFlow=old`), PERIODS (12), SETTLE
 * (50 s), BODIES (0: none), COLUMNS, PLACE_S, LOG.
 *
 * Step 7 (pool-tube-wall, 2026-11-04; the advisor's re-ruled bars, docs/research/pool-tube-wall-2026-11-04/advisor-ruling.md
 * §4) adds: bar 2's mechanism tests (no overrun outside the lip's water; boards and prone riders at 0.3 H_s to touchdown;
 * 0.6 H_s bodies pitched into the lip's water); bar 3 over 0.05–0.25 H_s; bar 4a below the anchor (0.5–1.5 m) and bar 4b's
 * continuity (each point's shift as the contact placed its case, step to step; fallbacks to the crest anchor after its first
 * face anchor; the pre-throw clock's rate and holds; the slice's weight's change; the 40 largest rises by cause); bar 5's
 * usable clearance over a 0.3 m depth along the ray; bar 6 within ±1 H_s; bar 7's formation (the first clock against τ_e).
 * COST=1 compares the default against step 6's build (`tubeAnchor=old,tubeForm=old,wallFlow=old`).
 *
 * The step 7 follow-up (pool-tube-contact, 2026-11-05; the advisor's re-ruled bars, advisor-ruling-2.md) adds, under "# The
 * 2026-11-05 re-ruled bars": bar 2a along the nearest surface's normal (`signedNormal`: a direction search in the ray–vertical
 * plane on the game's union water, probe-only, so it reads main's build and the branch's alike), before the body's own σ's
 * touchdown and outside the lip's water, after it as information; 2b's three outcomes (carried, pitched, overrun) for the
 * passive lone boards and prone riders at 0.3 H_s; the risks (boards flung clear of the water, the hull force's flips); bar 3
 * one-sided; bar 4b's jitter, own pace, single steps (reads across unread steps apart), cap engagement and the anchor's
 * outcomes; the ledger (throws per crest, unbroken at touchdown, starved share, bar 6 per jet); holes at weight ≥ 0.5 with
 * the first holes' fronts. SWITCHES also takes `tubeContact=old`, `tubeCap=old`, `tubeMerge=old` (all three: main before the
 * follow-up) and the opt-in `tubeGuard=on`. COST=1 COST_ARMS=followUp compares the default against those three old.
 *
 * Ruling 3 (pool-tube-track, 2026-11-05; the advisor's advisor-ruling-3.md) adds, under "# Ruling 3's bars": the water at a
 * body step to step (its bottom's water, in the case's wall, crossing in or out of it, and in the solver's: ≤ 1 m/s a step
 * at p99 in the wall and crossing it); flings (lone boards more than 0.1 m clear of the water before touchdown, outside the
 * lip's water and with no lip over them: ≤ 10 %); 2a and 2b for both placements of the lone boards (the default: at rest
 * draft, 5 mm along the nearest surface's normal, moving with their water along it; `old`: 5 cm under the support with the
 * surface's vertical speed, as before; both placed in each run, the old ones on the game's water only); bar 4b's own pace
 * against the tracker's rate (|ΔW − v̂ Δt|, v̂ the rate before the step), the raw target's step inside a front as a bar
 * (p90 ≤ 0.02 m), the read's noise σ_v (the raw target's second difference, rms/√6), the gate's engagement with the cap's,
 * and the read's trough at its window's end; bar 6 per jet measured after the pour (the solver's breaking ≥ 0.3 within
 * ±0.5 H_s of the tip at the crash within 0.2 s of it) and per column at all weights; visible holes (a dropped open strip
 * heavier than the kept one by over 0.1, or drawn more than 0.1 m off the solver's surface). SWITCHES also takes
 * `tubeTrack=old`, `tubeInertia=old`, `tubeRetire=old` (all three: main before ruling 3) and the opt-in `tubeBuoy=on`,
 * `tubeDrop=on`. COST_ARMS=track compares the default against those three old.
 */

const quantile = (values: number[], q: number) => {
  if (!values.length) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
};
/** The largest and smallest of a list, by a loop (a spread overflows the stack on a 12-period run's samples). */
const most = (...lists: (number[] | number)[]) => {
  let best = -Infinity;
  for (const list of lists) {
    if (typeof list === 'number') { if (list > best) best = list; continue; }
    for (const v of list) if (v > best) best = v;
  }
  return best;
};
const least = (...lists: (number[] | number)[]) => {
  let best = Infinity;
  for (const list of lists) {
    if (typeof list === 'number') { if (list < best) best = list; continue; }
    for (const v of list) if (v < best) best = v;
  }
  return best;
};
const fmt = (value: number, digits = 2) => (value === value ? value.toFixed(digits) : '—');
const q3 = (values: number[], digits = 2) => (values.length ? `${fmt(quantile(values, 0.1), digits)} / ${fmt(quantile(values, 0.5), digits)} / ${fmt(quantile(values, 0.9), digits)}` : '—');
const pct = (part: number, whole: number) => (whole > 0 ? `${((100 * part) / whole).toFixed(1)} %` : '—');

const S = LOFT_SAMPLES;
const E = LOFT.extensionSamples;
/** The solver's face points read, of its height over its trough. */
const FACES = [0.05, 0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0] as const;
/**
 * Points fixed in the wave's frame: m along the solver's own column (z, which its crests travel along) from its face
 * crossing at 0.3 of its height (its lower face, which moves smoothly), on one line per column-wave.
 */
const FIXED = [-3, -2.5, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5] as const;
/** Bar 4a (step 7): the fixed points below the anchor, m shoreward of the solver's 0.3 H_s crossing. */
const BELOW = 0.5;
/** Bar 5 (step 7): the depth along the ray a crouched body needs its clearance held over, m. */
const CROUCH = 0.3;
/** Ruling 3's placement of the lone boards: their rest draft along the nearest normal, m (the advisor: about 5 mm). */
const DRAFT = 0.005;
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
  /** Bar 5 (step 7): the clearance held over CROUCH along the ray, over the support, and the cases' own (unclamped), m. */
  usable: number;
  caseUsable: number;
  /** Bar 6 (step 7): the solver's strongest breaking within ±1 H_s of the tip. */
  tipBreak1: number;
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
  /**
   * Its bottom against the solver's surface under it, from where it started (a fall through the face), m; and the most the
   * game's support stood over the solver's there meanwhile (the case's water over it), m.
   */
  minSolverGap: number;
  baseSolverGap: number;
  over: number;
  baseGap: number;
  firstDrop: number;
  separatedAt: number;
  cause: string;
  /** Bar 9: the first time the lip's water reached its head or torso before touchdown, s after placing. */
  lipHead: number;
  /**
   * Bar 2 (step 7): its slice's touchdown, s of solver time; outside the lip's water, its bottom's depth under the support
   * each step (m, positive under), the longest run under it by more than 0.15 m (s), and whether it entered the lip's water
   * before touchdown; its most drop from where it started, to touchdown, m; whether it was on at touchdown (riders).
   */
  touchdownAt: number;
  under: number[];
  underRun: number;
  longestUnder: number;
  inLip: boolean;
  dropToTouchdown: number;
  offBeforeTouchdown: boolean;
  /**
   * The 2026-11-05 ruling's bar 2 (the advisor's advisor-ruling-2.md, re-ruled bars): the bottom's signed distance along the
   * nearest surface's normal (m, positive in water; `signedNormal`) outside the lip's water, before and after the body's
   * own σ's touchdown (the contact's life at its place reaching 1, latched; off the loft its slice's touchdown), the longest
   * run over 0.15 m before it (s), its first value, its 2b outcome to touchdown ('' while undecided), its most clear of the
   * water before touchdown (m, the least signed distance), and its force and sampled-normal flips (steps).
   */
  landed: boolean;
  normalBefore: number[];
  normalAfter: number[];
  normalRun: number;
  longestNormal: number;
  normal0: number;
  outcome: '' | 'carried' | 'pitched-lip' | 'pitched-off' | 'overrun';
  clearest: number;
  forceFlips: number;
  normalFlips: number;
  flipSteps: number;
  /** Its velocity up and shoreward along the ray as it left the surface ('pitched-off'), m/s. */
  offUp?: number;
  offOut?: number;
  lastForce?: [number, number, number];
  lastNormal?: [number, number, number];
  /**
   * Ruling 3: how a lone board was placed (absent: the default, at rest draft along the nearest normal with its water's
   * velocity; 'old': 5 cm under the support with the surface's vertical speed); its most clear of the water before
   * touchdown outside the lip's water and with no lip over it (m, the least signed distance); the water at its bottom at
   * its last step (flow, and whether in the case's wall or the lip's water, or out of the water).
   */
  placement?: 'old';
  clearestOut: number;
  lastWater?: { x: number; y: number; z: number; wall: boolean; lip: boolean; note: string };
}

/** One of the largest rises at a fixed point (bar 4b, step 7), with what changed between its two reads. */
interface Rise {
  rise: number;
  text: string;
  tau: number;
  weight: number;
  dWeight: number;
  dShift: number;
  dTau: number;
  crestBefore: boolean;
  crestNow: boolean;
  fromSolver: boolean;
  fromStart: number;
  fromEnd: number;
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
    if (process.env.COST === '1') {
      // Bar 12: the step, the contact's update and the drawing's build, step 7's build against step 6's
      // (`?tubeAnchor=old&tubeForm=old&wallFlow=old`), each sea spun up SETTLE s, then 600 steps of 1/60 s alternately in
      // blocks of 25.
      const lib = libraryFromBytes(caseName === 'a38' ? readBarrelCases(undefined, BARREL_CASES.filter((entry) => POOL_TUBE_STAND_IN.includes(entry.id))) : readBarrelCases('pool', undefined, 'pool'), 'basilisk', 'pool');
      // COST_ARMS=followUp (the 2026-11-05 follow-up): the default against main's build before it (its four switches old).
      const followUp = process.env.COST_ARMS === 'followUp';
      // COST_ARMS=track (ruling 3): the default against main's build before it (its five switches old).
      const trackArms = process.env.COST_ARMS === 'track';
      const arms = (trackArms ? ['default', 'ruling 3 off'] as const : followUp ? ['default', 'follow-up off'] as const : ['step 7', 'step 6'] as const).map((arm) => {
        const sim = new SurfZoneSimulation({
          spot: 'pool', seed: 1, significantHeight: regularSignificantHeight(height), peakPeriod: POOL.period, directionDegrees: 0, spreading: 1000,
          tide: 0, windSpeed: 0, stage: 2, compute: 'cpu', poolWaves: 'barrel', poolTubeCase: caseName,
          ...(arm === 'step 6' ? { tubeAnchor: 'old', tubeForm: 'old', wallFlow: 'old' } : {}),
          ...(arm === 'follow-up off' ? { tubeContact: 'old', tubeCap: 'old', tubeMerge: 'old' } : {}),
          ...(arm === 'ruling 3 off' ? { tubeTrack: 'old', tubeInertia: 'old', tubeRetire: 'old' } : {}),
        } as unknown as SurfZoneConfig, 'spun-up', lib);
        const tubeFace = sim.tubeFace;
        const contact = new SweptContact(lib, BARREL_SLOPE.pool!, tubeFace ? { face: tubeFace } : {});
        const water = PhysicalSurfWater.forSimulation(sim, contact, 1);
        const drawing = new SweptLoft(lib, BARREL_SLOPE.pool!, { holdClearDrawing: true, ...(tubeFace ? { face: tubeFace } : {}) });
        const grid = sim.renderGrid(1);
        return { arm, sim, contact, water, drawing, grid, surface: new Float32Array(grid.nx * grid.nz * 2), records: new Float32Array(FRONT_CAPACITY * FRONT_STRIDE), step: [] as number[], update: [] as number[], draw: [] as number[], felt: [] as number[] };
      });
      for (const a of arms) while (a.sim.solver.time < settle) a.sim.step(1 / 30);
      for (let block = 0; block < 24; block += 1) {
        for (const a of arms) {
          for (let k = 0; k < 25; k += 1) {
            let t = performance.now();
            a.sim.step(1 / 60);
            a.step.push(performance.now() - t);
            const count = a.sim.writeTubeRecords(a.records);
            t = performance.now();
            a.water.withSurfaceNodeCache(() => a.contact.update(a.records, count, a.sim.solver.restLevel, (x, z) => a.water.plainSurfaceAt(x, z)));
            a.update.push(performance.now() - t);
            a.grid.xMin = a.sim.windowXMin;
            a.sim.writeUniformSurface(a.surface, a.grid, false);
            t = performance.now();
            a.drawing.build(a.records, count, a.sim.solver.restLevel, (x, z) => sampleSurfaceHeight(a.surface, a.grid, x, z));
            a.draw.push(performance.now() - t);
            // The bodies' water (the follow-up's nearest surface is per sample): 64 samples through the middle standing slice's
            // wave, 1 m behind its point to 2 m ahead along its ray, from its trough to its crest, ms per 1000 samples.
            const loft = a.contact.last;
            if (loft && loft.sliceCount > 0) {
              let mid = -1;
              for (let q = 0; q < loft.sliceCount; q += 1) if (loft.sliceWeight[q] >= 0.5 && loft.sliceJoined[q] === 1 && (mid < 0 || Math.abs(q - loft.sliceCount / 2) < Math.abs(mid - loft.sliceCount / 2))) mid = q;
              if (mid >= 0) {
                const c = 3 * (mid * S + E + LANDMARK.crest);
                const rx = loft.sliceRayX[mid];
                const rz = loft.sliceRayZ[mid];
                const x0 = loft.positions[c] - loft.sliceShift[mid] * rx;
                const z0 = loft.positions[c + 2] - loft.sliceShift[mid] * rz;
                const top = loft.positions[c + 1];
                const bottom = a.sim.solver.restLevel - 0.5;
                const out = createWaterSample();
                t = performance.now();
                a.water.withSurfaceNodeCache(() => {
                  for (let i = 0; i < 8; i += 1) for (let j = 0; j < 8; j += 1) {
                    const xi = -1 + (3 * i) / 7;
                    a.water.sampleAt(x0 + xi * rx, bottom + ((top - bottom) * j) / 7, z0 + xi * rz, out);
                  }
                });
                a.felt.push(((performance.now() - t) * 1000) / 64);
              }
            }
          }
        }
      }
      appendFileSync(log, `pool straight Barrel, H ${height} m, cases ${caseName}: the cost on this M1 (Node, shared load), p10 / p50 / p90 ms, 600 steps each after ${settle} s, alternating\n`
        + arms.map((a) => `- ${a.arm}: the sea's step ${q3(a.step)}; the contact's update ${q3(a.update)}; the drawing's loft build ${q3(a.draw)}; the bodies' water through the wave, ms per 1000 samples ${q3(a.felt, 3)}`).join('\n') + '\n');
      return;
    }
    const bytes = caseName === 'a38' ? readBarrelCases(undefined, BARREL_CASES.filter((entry) => POOL_TUBE_STAND_IN.includes(entry.id))) : readBarrelCases('pool', undefined, 'pool');
    const library = libraryFromBytes(bytes, 'basilisk', 'pool');
    const simulation = new SurfZoneSimulation({
      spot: 'pool', seed: 1, significantHeight: regularSignificantHeight(height), peakPeriod: POOL.period, directionDegrees: 0, spreading: 1000,
      tide: 0, windSpeed: 0, stage: 2, compute: 'cpu', poolWaves: 'barrel', poolTubeCase: caseName, ...switches,
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
      // Bar 5: the air under the lip over the support, from the drawn crest to past the tip; and (step 7) the clearance held
      // over a crouched body's CROUCH along the ray, over the support and on the unclamped slice (the cases' own).
      let air = 0;
      const clear: number[] = [];
      const own: number[] = [];
      const rawHere = rawLoft !== undefined && rawLoft.sliceSigma[s] === loft.sliceSigma[s] && rawLoft.sliceFront[s] === loft.sliceFront[s];
      for (let xi = Math.min(crestXi, tipXi) - 0.2; xi <= Math.max(crestXi, tipXi) + 0.6; xi += 0.05) {
        const [x, z] = at(xi);
        const floor = water.surfaceAt(x, z);
        let c = 0;
        if (contact.query(x, floor + 0.005, z, hit) && !hit.inWater && hit.ceilingY === hit.ceilingY) c = hit.ceilingY - floor;
        air = Math.max(air, c);
        clear.push(c);
        if (rawHere) {
          const rawFloor = raw.floorAt(x, z);
          own.push(rawFloor === rawFloor && raw.query(x, rawFloor + 0.005, z, hit) && !hit.inWater && hit.ceilingY === hit.ceilingY ? hit.ceilingY - rawFloor : 0);
        }
      }
      const held = (list: number[]) => {
        const span = Math.round(CROUCH / 0.05) + 1;
        let best = 0;
        for (let i = 0; i + span <= list.length; i += 1) {
          let least = Infinity;
          for (let j = i; j < i + span; j += 1) least = Math.min(least, list[j]);
          best = Math.max(best, least);
        }
        return best;
      };
      const usable = held(clear);
      const caseUsable = rawHere ? held(own) : Number.NaN;
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
      let tipBreak1 = 0;
      for (let xi = tipXi - Hs; xi <= tipXi + Hs; xi += 0.25) tipBreak1 = Math.max(tipBreak1, strengthAt(...at(xi)));
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
        collapse: loft.sliceCollapse[s], Hs, d, raw: rawD, air, caseGap, usable, caseUsable, tipBreak1, tipAhead: tipXi - crestXi, tipBreak, saddle, shift: o.shift,
      };
    };

    // The bodies (bars 2 and 9): their reactions not applied, so the sea stays shared and as is.
    let sampleCalls = 0;
    let bodySteps = 0;
    /** Ruling 3's cost: the game's water's bodies' own steps (their water, forces and solve), ms. */
    const bodyMs = { total: 0, steps: 0 };
    const quiet = (w: PhysicalSurfWater): SurfWater => ({
      sampleAt: (x, y, z, out) => { sampleCalls += 1; return w.sampleAt(x, y, z, out); },
      surfaceAt: (x, z) => w.surfaceAt(x, z),
      addReaction: () => {},
      setSampleTime: (offset) => w.setSampleTime(offset),
    });
    const waters = { swept: quiet(water), solver: quiet(plain) };
    const bodies: Body[] = [];
    const finished: Body[] = [];
    /** Ruling 3's wall-water step (m/s a step): by where the body's bottom's water was, both steps; boards apart. */
    const wallBig: { step: number; text: string }[] = [];
    const fastWall = new Map<string, number>();
    let fastAll = 0;
    const waterSteps = { wall: [] as number[], crossing: [] as number[], solver: [] as number[], lip: [] as number[], boardWall: [] as number[], boardCrossing: [] as number[], boardOther: [] as number[] };
    const peels: number[] = [];
    const input: RideInput = { paddle: false, popUp: false, steer: 0, trim: 0, crouch: 0 };
    const sample: WaterSample = createWaterSample();
    const lipSample: WaterSample = createWaterSample();
    const traceBodies = process.env.TRACE_BODIES === '1';
    const traced = new Set<number>();
    const bodyTrace: string[] = [];
    const part = new Vector3();
    const place = (x0: number, z0: number, rx: number, rz: number, target: string, front: number, peel: number, tangent: [number, number], touchdownAt: number) => {
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
        for (const kind of ['rider', 'prone', 'board', 'board-old'] as const) {
          for (const which of ['swept', 'solver'] as const) {
            // Ruling 3: the old placement's lone boards on the game's water only, beside the default's.
            if (kind === 'board-old' && which === 'solver') continue;
            // Each on its own water's surface there (the game's: the union, never under the solver's surface).
            const own = which === 'swept' ? water : plain;
            const surface0 = own.surfaceAt(x, z);
            const flow = own.sampleAt(x, surface0 - 0.05, z, sample);
            const heading = Math.atan2(vx - flow.flowX, vz - flow.flowZ);
            const speed = Math.hypot(vx - flow.flowX, vz - flow.flowZ);
            const session = kind === 'rider' || kind === 'prone' ? new RideSession() : undefined;
            const board = session ? session.board : new BoardBody();
            if (session) session.place({ x, z, heading, speed, phase: kind === 'prone' ? 'prone' : 'standing', followSurface: true }, waters[which]);
            else if (kind === 'board-old') {
              // As before ruling 3: 5 cm under the support, the surface's vertical speed.
              const s0 = own.sampleAt(x, surface0 - 0.05, z, sample);
              const up = new Vector3(s0.normalX, s0.normalY, s0.normalZ).normalize();
              const forward = new Vector3(Math.sin(heading), -(up.x * Math.sin(heading) + up.z * Math.cos(heading)) / up.y, Math.cos(heading)).normalize();
              const left = new Vector3().crossVectors(up, forward);
              const orientation = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, up, forward));
              const velocity = new Vector3(vx, 0, vz);
              const top = own.sampleAt(x, surface0, z, sample);
              velocity.y = top.flowY + velocity.x * top.slopeX + velocity.z * top.slopeZ;
              board.place(new Vector3(x, surface0 + board.shape.centerOfMass.y - 0.05, z), orientation, velocity);
            } else {
              // Ruling 3 (the advisor's §2.1): at rest draft (5 mm) along the nearest surface's normal there, moving with its
              // water along that normal (in trim along it, as before).
              const s0 = own.sampleAt(x, surface0 - DRAFT, z, sample);
              const up = new Vector3(s0.normalX, s0.normalY, s0.normalZ).normalize();
              if (!(up.y > 0.05)) up.set(0, 1, 0);
              const forward = new Vector3(Math.sin(heading), -(up.x * Math.sin(heading) + up.z * Math.cos(heading)) / up.y, Math.cos(heading)).normalize();
              const left = new Vector3().crossVectors(up, forward);
              const orientation = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, up, forward));
              const velocity = new Vector3(vx, 0, vz);
              const into = (s0.flowX - velocity.x) * up.x + (s0.flowY - velocity.y) * up.y + (s0.flowZ - velocity.z) * up.z;
              velocity.addScaledVector(up, into);
              // The bottom 5 mm under the surface along the normal; the centre of mass that far up the board's normal.
              const bottom = new Vector3(x, surface0, z).addScaledVector(up, -DRAFT);
              board.place(bottom.addScaledVector(up, board.shape.centerOfMass.y), orientation, velocity);
            }
            bodies.push({
              kind: kind === 'board-old' ? 'board' : kind, water: which, target, face: fraction, front, t0: solver.time, session, board, done: false, minGap: Infinity, baseGap: Number.NaN, minSolverGap: Infinity, baseSolverGap: Number.NaN, over: 0,
              firstDrop: Number.NaN, separatedAt: Number.NaN, cause: '', lipHead: Number.NaN,
              touchdownAt, under: [], underRun: 0, longestUnder: 0, inLip: false, dropToTouchdown: 0, offBeforeTouchdown: false,
              landed: false, normalBefore: [], normalAfter: [], normalRun: 0, longestNormal: 0, normal0: Number.NaN, outcome: '', clearest: Infinity,
              forceFlips: 0, normalFlips: 0, flipSteps: 0, clearestOut: Infinity, ...(kind === 'board-old' ? { placement: 'old' as const } : {}),
            });
          }
        }
      }
    };
    // The 2026-11-05 ruling's measure (bar 2): a point's signed distance to the game's water's surface along its nearest
    // normal, in the ray–vertical plane (the ray `rx, rz`), m, positive in water: the nearest change between water and air,
    // searched along 24 directions (every 0.025 m, then bisected to 1.6 mm) out to `cap`, the vertical distance to the
    // support (straight up or down reaches it). The water is the union the game's support is: under the solver's surface,
    // or in the swept surface's water. Probe-only (its own contact hit), so it reads main's build and the branch's alike.
    const probeHit = createContactHit();
    const unionWet = (x: number, y: number, z: number) => y < water.plainSurfaceAt(x, z) || (contact.query(x, y, z, probeHit) && probeHit.inWater);
    const DIRECTIONS = 24;
    const dirCos = Array.from({ length: DIRECTIONS }, (_, k) => Math.cos(Math.PI / 2 + (2 * Math.PI * k) / DIRECTIONS));
    const dirSin = Array.from({ length: DIRECTIONS }, (_, k) => Math.sin(Math.PI / 2 + (2 * Math.PI * k) / DIRECTIONS));
    const signedNormal = (x: number, y: number, z: number, rx: number, rz: number, vertical: number): number => {
      const inside = unionWet(x, y, z);
      if (inside !== vertical > 0) return vertical;
      let best = Math.min(1.5, Math.abs(vertical));
      for (let k = 0; k < DIRECTIONS; k += 1) {
        const c = dirCos[k];
        const sn = dirSin[k];
        let previous = 0;
        for (let r = 0.025; r < best; r += 0.025) {
          if (unionWet(x + r * c * rx, y + r * sn, z + r * c * rz) === inside) {
            previous = r;
            continue;
          }
          let lo = previous;
          let hi = r;
          for (let b = 0; b < 4; b += 1) {
            const mid = 0.5 * (lo + hi);
            if (unionWet(x + mid * c * rx, y + mid * sn, z + mid * c * rz) === inside) lo = mid;
            else hi = mid;
          }
          best = Math.min(best, hi);
          break;
        }
      }
      return inside ? best : -best;
    };
    const stepBodies = (dt: number) => {
      bodySteps += bodies.length;
      for (const body of bodies) {
        const real = body.water === 'swept' ? water : plain;
        const began = performance.now();
        if (body.session) real.withSurfaceNodeCache(() => body.session!.step(dt, waters[body.water], input));
        else real.withSurfaceNodeCache(() => body.board.step(dt, waters[body.water]));
        if (body.water === 'swept') {
          bodyMs.total += performance.now() - began;
          bodyMs.steps += 1;
        }
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
        // The same against the solver's surface: a fall through the face, told apart from the case's water standing over it.
        const solverY = plain.surfaceAt(p.x, p.z);
        const solverGap = p.y - body.board.shape.centerOfMass.y - solverY;
        if (!(body.baseSolverGap === body.baseSolverGap)) body.baseSolverGap = solverGap;
        body.minSolverGap = Math.min(body.minSolverGap, solverGap - body.baseSolverGap);
        if (body.water === 'swept') body.over = Math.max(body.over, water.surfaceAt(p.x, p.z) - solverY);
        // Bar 2 (step 7): outside the lip's water, its bottom under the support, and how long it stays over 0.15 m under;
        // before its slice's touchdown, whether it entered the lip's water and its most drop from where it started.
        const before = solver.time <= body.touchdownAt;
        if (body.water === 'swept') {
          const bottom = p.y - body.board.shape.centerOfMass.y;
          const lip = water.sampleAt(p.x, bottom + 0.02, p.z, lipSample).waterFloorY !== undefined;
          if (lip) {
            body.underRun = 0;
            if (before) body.inLip = true;
          } else {
            body.under.push(-gap);
            body.underRun = -gap > 0.15 ? body.underRun + dt : 0;
            body.longestUnder = Math.max(body.longestUnder, body.underRun);
          }
        }
        if (before) body.dropToTouchdown = Math.max(body.dropToTouchdown, -(gap - body.baseGap));
        const separatedNow = body.session !== undefined && !body.session.rider.attached;
        if (body.water === 'swept') {
          // The 2026-11-05 ruling's bar 2: along the nearest surface's normal, before the body's own σ's touchdown.
          const bottom = p.y - body.board.shape.centerOfMass.y;
          const lip = water.sampleAt(p.x, bottom + 0.02, p.z, lipSample).waterFloorY !== undefined;
          const sampledNormal: [number, number, number] = [lipSample.normalX, lipSample.normalY, lipSample.normalZ];
          // Ruling 3's wall-water step: the water at its bottom, step to step, in the case's wall, crossing it, or the solver's
          // (in the water only: its bottom under the sample's surface, both steps), before its touchdown.
          const wallNow = (water as unknown as { inWall: boolean }).inWall === true;
          const inWater = bottom + 0.02 < lipSample.surfaceY;
          const wh = (water as unknown as { hit: ReturnType<typeof createContactHit>; plainY: number });
          const note = `y ${(bottom + 0.02).toFixed(3)} plain ${fmt(wh.plainY, 3)} case ${fmt(wh.hit.surfaceY, 3)} low ${fmt(wh.hit.wallLow, 2)} top ${fmt(wh.hit.wallTop, 2)} along ${fmt(wh.hit.wallAlong, 2)} up ${fmt(wh.hit.wallUp, 2)} C ${fmt(wh.hit.wallSpeed, 2)} B ${fmt(wh.hit.wallB, 2)} w ${fmt(wh.hit.wallWeight, 2)} n ${fmt(wh.hit.normalX, 2)},${fmt(wh.hit.normalY, 2)},${fmt(wh.hit.normalZ, 2)} depth ${fmt(wh.hit.normalDepth, 3)} ahead ${fmt(wh.hit.aheadWeight, 2)} life ${fmt(wh.hit.life, 2)} flow ${lipSample.flowX.toFixed(2)},${lipSample.flowY.toFixed(2)},${lipSample.flowZ.toFixed(2)}`;
          const now = inWater ? { x: lipSample.flowX, y: lipSample.flowY, z: lipSample.flowZ, wall: wallNow, lip, note } : undefined;
          const was = body.lastWater;
          if (now && was && !body.landed && body.placement === undefined) {
            const step = Math.hypot(now.x - was.x, now.y - was.y, now.z - was.z);
            if (now.wall && was.wall && step > 3) {
              wallBig.push({ step, text: `${step.toFixed(2)} m/s, ${body.kind} ${body.target} ${body.face} t ${solver.time.toFixed(3)}:\n      before ${was.note}\n      after  ${now.note}` });
              wallBig.sort((a, b) => b.step - a.step);
              if (wallBig.length > 12) wallBig.length = 12;
            }
            const list = now.lip || was.lip ? waterSteps.lip : now.wall && was.wall ? waterSteps.wall : now.wall !== was.wall ? waterSteps.crossing : waterSteps.solver;
            list.push(step);
            if (body.kind === 'board') (now.wall && was.wall ? waterSteps.boardWall : now.wall !== was.wall ? waterSteps.boardCrossing : waterSteps.boardOther).push(step);
          }
          body.lastWater = now;
          const onLoft = contact.query(p.x, bottom, p.z, probeHit);
          const rx = onLoft ? -probeHit.tangentZ : 0;
          const rz = onLoft ? probeHit.tangentX : 1;
          if (onLoft ? probeHit.life >= 1 : solver.time > body.touchdownAt) body.landed = true;
          const normal = water.withSurfaceNodeCache(() => signedNormal(p.x, bottom, p.z, rx, rz, -gap));
          if (!(body.normal0 === body.normal0)) body.normal0 = normal;
          if (!body.landed) body.clearest = Math.min(body.clearest, normal);
          // Ruling 3's flings: clear of the water outside the lip's water and with no lip over it.
          if (!body.landed && !lip && lipSample.ceilingY === undefined) body.clearestOut = Math.min(body.clearestOut, normal);
          if (!lip) {
            (body.landed ? body.normalAfter : body.normalBefore).push(normal);
            if (!body.landed) {
              body.normalRun = normal > 0.15 ? body.normalRun + dt : 0;
              body.longestNormal = Math.max(body.longestNormal, body.normalRun);
            }
          } else body.normalRun = 0;
          if (!body.landed && body.outcome === '') {
            if (lip) body.outcome = 'pitched-lip';
            else if (normal - body.normal0 > 0.1) body.outcome = 'overrun';
            else if (body.session ? separatedNow : normal < -0.1) {
              body.outcome = 'pitched-off';
              // Which way it left: its velocity up, and along the ray (shoreward, out through the face).
              const v = body.board.velocity;
              body.offUp = v.y;
              body.offOut = v.x * rx + v.z * rz;
            }
          }
          if (body.landed && body.outcome === '') body.outcome = 'carried';
          // The risks: the water's force on the hull (buoyancy and pressure) turning past 90° in a step, both over half the
          // board's weight; the sampled normal turning more than 30° in a step (before touchdown, outside the lip's water).
          if (!body.landed && !lip) {
            const f = body.board.forces;
            const force: [number, number, number] = [f.buoyancy.x + f.pressure.x, f.buoyancy.y + f.pressure.y, f.buoyancy.z + f.pressure.z];
            const weight = 0.5 * body.board.mass * 9.81;
            const last = body.lastForce;
            if (last && Math.hypot(...force) > weight && Math.hypot(...last) > weight && force[0] * last[0] + force[1] * last[1] + force[2] * last[2] < 0) body.forceFlips += 1;
            const ln = body.lastNormal;
            if (ln && sampledNormal[0] * ln[0] + sampledNormal[1] * ln[1] + sampledNormal[2] * ln[2] < Math.cos(Math.PI / 6)) body.normalFlips += 1;
            body.flipSteps += 1;
            body.lastForce = force;
            body.lastNormal = sampledNormal;
          } else {
            body.lastForce = undefined;
            body.lastNormal = undefined;
          }
        }
        // TRACE_BODIES=1: the first lone boards on the game's water, step by step (a diagnostic).
        if (traceBodies && body.kind === 'board' && body.water === 'swept' && age < 1.5) {
          const key = bodies.indexOf(body);
          if (traced.size < 6 || traced.has(key)) {
            traced.add(key);
            const bottom = p.y - body.board.shape.centerOfMass.y;
            const at = water.sampleAt(p.x, bottom + 0.02, p.z, lipSample);
            const v = body.board.velocity;
            bodyTrace.push(`${key} ${body.target} ${body.face} age ${age.toFixed(3)} bottom ${bottom.toFixed(3)} support ${water.surfaceAt(p.x, p.z).toFixed(3)} solver ${solverY.toFixed(3)} under ${(-gap).toFixed(3)} flow ${at.flowX.toFixed(2)},${at.flowY.toFixed(2)},${at.flowZ.toFixed(2)} normal ${at.normalX.toFixed(2)},${at.normalY.toFixed(2)},${at.normalZ.toFixed(2)} floor ${at.waterFloorY === undefined ? '-' : at.waterFloorY.toFixed(2)} v ${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`);
          }
        }
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
        if (separated && before) body.offBeforeTouchdown = true;
        if (separated || age >= 3) {
          body.done = true;
          body.separatedAt = separated ? age : Number.NaN;
          body.cause = separated ? String(body.session!.separation ?? '?') : '';
        }
      }
      for (let k = bodies.length - 1; k >= 0; k -= 1) if (bodies[k].done) finished.push(...bodies.splice(k, 1));
    };
    // A slice's touchdown in the solver's time (bar 2, step 7): from its life once thrown, else its front's nearest point's case.
    const touchdownOf = (loft: LoftResult, s: number): number => {
      const tau = loft.sliceTau[s];
      const life = loft.sliceLife[s];
      if (life > 0) return solver.time + (tau / life - tau);
      const sigma = loft.sliceSigma[s];
      let best: { footHeight: number; footDepth: number; sigma: number } | undefined;
      for (const p of simulation.front?.points ?? []) {
        if (p.front !== loft.sliceFront[s] % FRONT_PIECE) continue;
        if (!best || Math.abs(p.sigma - sigma) < Math.abs(best.sigma - sigma)) best = p;
      }
      if (!best) return solver.time + 3;
      return solver.time + (library.profileTimes({ slope, footHeight: best.footHeight, footDepth: best.footDepth }).touchdownSeconds - tau);
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
    const firstEarliest: number[] = [];
    const leadTimes: number[] = [];
    const bigRises: string[] = [];
    const pointOpen: number[] = [];
    const pointCase: number[] = [];
    const rises: number[] = [];
    /** The lower face (−0.5–0.5 m about the 0.3 H_s crossing) and up the face behind it (−3 to −1 m). */
    const risesLow: number[] = [];
    const risesHigh: number[] = [];
    const lastFixed = new Map<string, { n: number; gaps: number[]; x: number; weight: number; shift: number; tau: number; place: number }>();
    // Step 7's (bar 4b, bar 7): per point, the shift the contact placed its case at, its weight and its pre-throw clock.
    const lastShift = new Map<number, number>();
    const lastPlace = new Map<number, { x: number; z: number; n: number; target: number; front: number }>();
    const frameSteps: number[] = [];
    const frameRates: number[] = [];
    const faced = new Set<number>();
    const fellBack = new Set<number>();
    let fallbacks = 0;
    let unordered = 0;
    const shiftSteps: number[] = [];
    const lastWeight = new Map<number, number>();
    const weightSteps: number[] = [];
    const preRates: number[] = [];
    const holdRun = new Map<number, number>();
    let holds = 0;
    const holdPoints = new Set<number>();
    const risesBelow: number[] = [];
    const candidates: Rise[] = [];
    const fixedBelow: number[] = [];
    let builds = 0, overlaps = 0, overlapsOpen = 0, minAdvance = Infinity, shiftMisses = 0, slices = 0;
    const shiftSlopes: number[] = [];
    const placedThrow = new Set<number>();
    const placedOpen = new Set<number>();
    const lastPlaceTau = new Map<number, number>();
    const crash0 = simulation.crash ? { ...simulation.crash.counts } : undefined;
    // The 2026-11-05 ruling's re-ruled bars 4b, the ledger and 8 (advisor-ruling-2.md).
    const anchor0 = { ...anchorCounts };
    const lastDW = new Map<number, { n: number; dW: number; rate: number; dTarget: number }>();
    const jitters: number[] = [];
    const ownPace: number[] = [];
    /** Ruling 3's 4b: |ΔW − v̂ Δt|; the raw target's second difference and its step against the tracker, inside a front. */
    const trackerPace: number[] = [];
    const targetSecond: number[] = [];
    const targetVsTracker: number[] = [];
    const targetInside: number[] = [];
    const targetEnds: number[] = [];
    const bigSteps: { step: number; text: string }[] = [];
    /** |ΔW − C Δt| over consecutive steps only, and over a gap (the point unread for a step or more: not one step's change). */
    const consecutiveSteps: number[] = [];
    const skippedSteps: number[] = [];
    let skippedBig = 0;
    const throwsOf = new Map<number, number>();
    let touchdowns = 0, unbrokenAtTouchdown = 0, unbrokenJets = 0, staleAtTouchdown = 0;
    const retireAtTouchdown: number[] = [];
    const crashedIds = new Set<number>();
    const jetBreak: number[] = [];
    const jetBreak1: number[] = [];
    /** Ruling 3: bar 6 per jet after the pour (each jet's tip at its crash, read for 0.2 s); per column at all weights. */
    const pouring: { x: number; z: number; rx: number; rz: number; tipXi: number; Hs: number; until: number; best: number }[] = [];
    const jetBreakAfter: number[] = [];
    const columnAll: number[] = [];
    const landedAll = new Set<string>();
    /** Ruling 3's visible holes: a dropped open strip heavier than the kept by over 0.1, or drawn over 0.1 m off the solver. */
    let visibleHoles = 0;
    let rawHoles = 0;
    const visibleLog: string[] = [];
    let jetUnread = 0;
    let heavyHoles = 0;
    let keptFolds = 0;
    const holeLog: string[] = [];
    for (let n = 1; n <= steps; n += 1) {
      simulation.step(dt);
      // Ruling 3's bar 6 per jet, after the pour: the solver's strongest breaking within ±0.5 H_s of each jet's tip at its
      // crash, over the 0.2 s after it.
      for (let j = pouring.length - 1; j >= 0; j -= 1) {
        const jet = pouring[j];
        for (let xi = jet.tipXi - 0.5 * jet.Hs; xi <= jet.tipXi + 0.5 * jet.Hs; xi += 0.25) jet.best = Math.max(jet.best, strengthAt(jet.x + xi * jet.rx, jet.z + xi * jet.rz));
        if (solver.time >= jet.until) {
          jetBreakAfter.push(jet.best);
          pouring.splice(j, 1);
        }
      }
      // The ledger: each joined crest's throws (its point's id).
      for (const thrown of simulation.crash?.paced ?? []) throwsOf.set(thrown.point.id, (throwsOf.get(thrown.point.id) ?? 0) + 1);
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
          if (previous === undefined) {
            joinedAt.set(p.id, solver.time);
            firstTau.push(p.tau);
            // Its case's own earliest frame (step 7's τ_e) at its size.
            firstEarliest.push(times.startSeconds);
          }
          if (previous !== undefined && previous < 0 && p.tau >= 0) {
            thrownAt.set(p.id, solver.time - dt * (p.tau / Math.max(1e-9, p.tau - previous)));
            const joined = joinedAt.get(p.id);
            if (joined !== undefined) leadTimes.push(thrownAt.get(p.id)! - joined);
          }
          if (previous !== undefined && previous < times.touchdownSeconds && p.tau >= times.touchdownSeconds) {
            touchdowns += 1;
            if (p.unbroken) {
              unbrokenAtTouchdown += 1;
              if (p.jetStrip !== undefined && p.jetStrip >= 0 && !p.jetReturned) unbrokenJets += 1;
              // Its flag against the solver's own breaking at its crest now (±2 m along its column): a stale flag (the solver
              // broke it after its throw) or truly unbroken; and its retirement then.
              let strongest = 0;
              for (let dz = -2; dz <= 2; dz += 0.5) strongest = Math.max(strongest, strengthAt(p.x, p.z + dz));
              if (strongest > 0) staleAtTouchdown += 1;
              retireAtTouchdown.push(p.retire ?? 0);
            }
          }
          const from = thrownAt.get(p.id);
          if (previous !== undefined && from !== undefined && previous < times.touchdownSeconds && p.tau >= times.touchdownSeconds) {
            const landed = solver.time - dt * ((p.tau - times.touchdownSeconds) / Math.max(1e-9, p.tau - previous));
            pointOpen.push(landed - from);
            pointCase.push(times.touchdownSeconds);
            thrownAt.delete(p.id);
          }
          // Step 7: the pre-throw clock's rate and holds (a step under 0.05× real time), and the slice's weight's change.
          if (previous !== undefined && previous < 0 && p.tau < 0) {
            const rate = (p.tau - previous) / dt;
            preRates.push(rate);
            const run = rate < 0.05 ? (holdRun.get(p.id) ?? 0) + dt : 0;
            if (run > 0.1 && (holdRun.get(p.id) ?? 0) <= 0.1) {
              holds += 1;
              holdPoints.add(p.id);
            }
            holdRun.set(p.id, run);
          }
          const weight = (1 - (p.retire ?? 0)) * (p.formation ?? 1);
          const lastW = lastWeight.get(p.id);
          if (lastW !== undefined) weightSteps.push(Math.abs(weight - lastW));
          lastWeight.set(p.id, weight);
          lastTau.set(p.id, p.tau);
        }
        // Bar 4b: each point's shift as the contact placed its case this step (records in the front's order).
        const placed = contact.last?.recordShift;
        if (placed && count === simulation.front.points.length) {
          const pts = simulation.front.points;
          // Each point's front's first and last index in the list (points are by front, then σ).
          const i0Of = (k: number) => { let i = k; while (i > 0 && pts[i - 1].front === pts[k].front) i -= 1; return i; };
          const i1Of = (k: number) => { let i = k; while (i < pts.length - 1 && pts[i + 1].front === pts[k].front) i += 1; return i; };
          pts.forEach((p, k) => {
            const shift = placed[k];
            if (shift === Infinity) return;
            const last = lastShift.get(p.id);
            if (shift === shift && last !== undefined && last === last) {
              shiftSteps.push(Math.abs(shift - last));
              // In the wave's frame: the case's crest's place along the point's ray (its front's normal over ±3 points),
              // against the wave's own advance C Δt.
              const was = lastPlace.get(p.id);
              let i0 = k;
              let i1 = k;
              while (i0 > 0 && k - i0 < 3 && pts[i0 - 1].front === p.front) i0 -= 1;
              while (i1 < pts.length - 1 && i1 - k < 3 && pts[i1 + 1].front === p.front) i1 += 1;
              const tx = pts[i1].x - pts[i0].x;
              const tz = pts[i1].z - pts[i0].z;
              const length = Math.hypot(tx, tz);
              let nx = length > 0 ? -tz / length : 0;
              let nz = length > 0 ? tx / length : 1;
              if (nz < 0) {
                nx = -nx;
                nz = -nz;
              }
              // The point's own ray where the simulation keeps it (step 7), else its front's normal; the wave's advance
              // along it, its crest's pace along its column projected on it.
              if (p.anchorRayX !== undefined) {
                nx = p.anchorRayX;
                nz = p.anchorRayZ!;
              }
              const advance = pathPace(p.crestSpeed, p.crestDepth, p.height, p.dirZ) * Math.max(0, nz) * dt;
              if (was) {
                const dW = (p.x - was.x) * nx + (p.z - was.z) * nz + shift - last;
                frameSteps.push(Math.abs(dW - advance));
                frameRates.push(dW / Math.max(1e-9, advance));
                // The 2026-11-05 bar 4b: its jitter (step to step), against the case's own pace (the smoothed target's
                // place, W* = S·n + δ*, step to step), and the largest single steps with what the anchor did.
                const gapSteps = n - was.n;
                if (gapSteps !== 1) {
                  skippedSteps.push(Math.abs(dW - advance));
                  if (Math.abs(dW - advance) > 0.1) skippedBig += 1;
                }
                if (was.n === n - 1) consecutiveSteps.push(Math.abs(dW - advance));
                const big = Math.abs(dW - advance);
                if (big > 0.1) {
                  const at = k === 0 || pts[k - 1].front !== p.front ? 'start' : k === pts.length - 1 || pts[k + 1].front !== p.front ? 'end' : 'inside';
                  bigSteps.push({ step: big, text: `t ${solver.time.toFixed(3)} (over ${gapSteps} step${gapSteps === 1 ? '' : 's'}) point ${p.id} front ${p.front}${was.front !== p.front ? ` (was ${was.front})` : ''} at its front's ${at}: |ΔW − CΔt| ${big.toFixed(3)} m; Δshift ${(shift - last).toFixed(3)}, moved along the ray ${((p.x - was.x) * nx + (p.z - was.z) * nz).toFixed(3)} (Δx ${(p.x - was.x).toFixed(2)}, Δz ${(p.z - was.z).toFixed(2)}), anchor ${p.anchorLast ?? '-'}, target ${fmt(p.anchorTarget ?? Number.NaN, 3)} (was ${fmt(was.target, 3)}), τ ${p.tau.toFixed(3)}, thrown ${p.jetStrip !== undefined}, C Δt ${advance.toFixed(4)}` });
                  bigSteps.sort((a, b) => b.step - a.step);
                  if (bigSteps.length > 16) bigSteps.length = 16;
                }
                if (was.n === n - 1) {
                  const before = lastDW.get(p.id);
                  const consecutive = before !== undefined && before.n === n - 1;
                  if (consecutive) jitters.push(Math.abs(dW - before.dW));
                  // Ruling 3: against the tracker's own pace, its rate before this step (the rate it predicted with).
                  if (consecutive && before.rate === before.rate) trackerPace.push(Math.abs(dW - before.rate * dt));
                  const target = p.anchorTarget;
                  let dTarget = Number.NaN;
                  if (target !== undefined && target === target && was.target === was.target) {
                    dTarget = (p.x - was.x) * nx + (p.z - was.z) * nz + target - was.target;
                    ownPace.push(Math.abs(dW - dTarget));
                    // The target's own step against the wave's advance, inside a front and within 3 points of its ends.
                    const fromEnd = Math.min(k - i0Of(k), i1Of(k) - k);
                    (fromEnd >= 3 ? targetInside : targetEnds).push(Math.abs(dTarget - advance));
                    if (fromEnd >= 3 && consecutive) {
                      // Ruling 3: the read's noise σ_v (its second difference, inside a front), and its step against the tracker.
                      if (before.dTarget === before.dTarget) targetSecond.push(dTarget - before.dTarget);
                      if (before.rate === before.rate) targetVsTracker.push(Math.abs(dTarget - before.rate * dt));
                    }
                  }
                  lastDW.set(p.id, { n, dW, rate: p.anchorRate ?? Number.NaN, dTarget });
                }
              }
            }
            lastPlace.set(p.id, { x: p.x, z: p.z, n, target: p.anchorTarget ?? Number.NaN, front: p.front });
            if (!(shift === shift) && faced.has(p.id)) {
              fallbacks += 1;
              fellBack.add(p.id);
            }
            if (shift === shift) faced.add(p.id);
            lastShift.set(p.id, shift);
          });
        } else if (placed) unordered += 1;
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
      heavyHoles += loft.overlapsOpenHeavy;
      keptFolds += loft.overlapsKept ?? 0;
      // Ruling 3 (information): where the case's surface's own speed is fast (over 12 m/s up or down), by profile index.
      if (loft.wall && n % 10 === 0) {
        for (let q = 0; q < loft.sliceCount; q += 1) {
          if (!(loft.sliceWeight[q] > 0.5)) continue;
          for (let j = 0; j < S; j += 1) {
            const v = q * S + j;
            if (Math.abs(loft.wall.up[v]) > 12 || Math.abs(loft.wall.along[v] - loft.wall.speed[q]) > 12) {
              const key = `${Math.floor((j - E) / 8) * 8}`;
              fastWall.set(key, (fastWall.get(key) ?? 0) + 1);
            }
            fastAll += 1;
          }
        }
      }
      for (let m = 0; m + 1 < loft.openDrops.length; m += 2) {
        const gone = loft.openDrops[m];
        const kept = loft.openDrops[m + 1];
        const wd = Math.max(loft.sliceWeight[gone], loft.sliceWeight[gone + 1]);
        const wk = Math.max(loft.sliceWeight[kept], loft.sliceWeight[kept + 1]);
        // As drawn, the strip's vertices are lerped toward the water by its weight: its height off the solver's surface is
        // its weight × lift.
        let lift = 0;
        water.withSurfaceNodeCache(() => {
          for (const q of [gone, gone + 1]) for (let j = 0; j < S; j += 1) {
            const v = 3 * (q * S + j);
            lift = Math.max(lift, loft.positions[v + 1] - water.plainSurfaceAt(loft.positions[v], loft.positions[v + 2]));
          }
        });
        rawHoles += 1;
        if (wd - wk > 0.1 || lift > 0.1) {
          visibleHoles += 1;
          if (visibleLog.length < 12) visibleLog.push(`t ${solver.time.toFixed(2)}: dropped front ${loft.sliceFront[gone]} weight ${fmt(wd)} phase ${loft.slicePhase[gone]} drawn ${fmt(lift)} m off the solver's surface; kept front ${loft.sliceFront[kept]} weight ${fmt(wk)} phase ${loft.slicePhase[kept]}`);
        }
      }
      if (loft.openDrops.length && holeLog.length < 30) {
        // Each hole: the dropped strip and the one kept, their fronts' σ spans, and the gap between the two fronts' nearest ends.
        const span = (front: number) => {
          let lo = -1, hi = -1;
          for (let q = 0; q < loft.sliceCount; q += 1) if (loft.sliceFront[q] === front) { if (lo < 0) lo = q; hi = q; }
          return [lo, hi] as const;
        };
        const at = (q: number) => { const c = 3 * (q * S + E + LANDMARK.crest); return [loft.positions[c], loft.positions[c + 2]] as const; };
        for (let m = 0; m + 1 < loft.openDrops.length && holeLog.length < 30; m += 2) {
          const a = loft.openDrops[m];
          const b = loft.openDrops[m + 1];
          const [a0, a1] = span(loft.sliceFront[a]);
          const [b0, b1] = span(loft.sliceFront[b]);
          let gap = Infinity;
          for (const u of [a0, a1]) for (const v of [b0, b1]) { const [ux, uz] = at(u); const [vx, vz] = at(v); gap = Math.min(gap, Math.hypot(ux - vx, uz - vz)); }
          const desc = (q: number, lo: number, hi: number) => `front ${loft.sliceFront[q]} σ ${fmt(loft.sliceSigma[q], 1)} (its σ ${fmt(loft.sliceSigma[lo], 1)}–${fmt(loft.sliceSigma[hi], 1)}, ${hi - lo + 1} slices) τ ${fmt(loft.sliceTau[q])} life ${fmt(loft.sliceLife[q])} weight ${fmt(Math.max(loft.sliceWeight[q], loft.sliceWeight[q + 1]))} phase ${loft.slicePhase[q]}`;
          // The two fronts' end points (their records): where, their clocks, and how far apart their nearest ends are.
          const endsOf = (front: number) => {
            let first = -1, last = -1;
            for (let q = 0; q < count; q += 1) if (records[q * FRONT_STRIDE + 2] === front) { if (first < 0) first = q; last = q; }
            return [first, last] as const;
          };
          const rec = (q: number, field: number) => records[q * FRONT_STRIDE + field];
          const [ra0, ra1] = endsOf(loft.sliceFront[a]);
          const [rb0, rb1] = endsOf(loft.sliceFront[b]);
          let pointGap = Infinity;
          let pair = '';
          if (ra0 >= 0 && rb0 >= 0) for (const u of [ra0, ra1]) for (const v of [rb0, rb1]) {
            const d = Math.hypot(rec(u, 0) - rec(v, 0), rec(u, 1) - rec(v, 1));
            if (d < pointGap) { pointGap = d; pair = `(${fmt(rec(u, 0), 1)}, ${fmt(rec(u, 1), 1)}) τ ${fmt(rec(u, 4))} and (${fmt(rec(v, 0), 1)}, ${fmt(rec(v, 1), 1)}) τ ${fmt(rec(v, 4))}`; }
          }
          holeLog.push(`t ${solver.time.toFixed(2)}: dropped ${desc(a, a0, a1)}; kept ${desc(b, b0, b1)}; the fronts' nearest end slices ${fmt(gap)} m apart; their nearest end points ${fmt(pointGap)} m apart, ${pair}; records ${ra1 - ra0 + 1} and ${rb1 - rb0 + 1}`);
        }
      }
      // Bar 6 per jet (the 2026-11-05 ledger): each jet's landing, its point's slice at its crash.
      for (const p of simulation.front?.points ?? []) {
        if (p.crashedAt === undefined || p.jetStrip === undefined || p.jetStrip < 0 || crashedIds.has(p.id)) continue;
        crashedIds.add(p.id);
        // A jet the guard returned to its crest lands nowhere (`TubeFace.guard`).
        if (p.jetReturned) continue;
        let near = -1;
        for (let q = 0; q < loft.sliceCount; q += 1) {
          if (loft.sliceFront[q] % FRONT_PIECE !== p.front) continue;
          if (near < 0 || Math.abs(loft.sliceSigma[q] - p.sigma) < Math.abs(loft.sliceSigma[near] - p.sigma)) near = q;
        }
        if (near < 0 || Math.abs(loft.sliceSigma[near] - p.sigma) > 1) {
          jetUnread += 1;
          continue;
        }
        const o = origin(loft, near);
        const { Hs } = section(o.x, o.z, o.rx, o.rz);
        if (!(Hs > 0.2)) {
          jetUnread += 1;
          continue;
        }
        const tip = 3 * (near * S + E + LANDMARK.lip);
        const tipXi = (loft.positions[tip] - o.x) * o.rx + (loft.positions[tip + 2] - o.z) * o.rz;
        const alongAt = (xi: number) => [o.x + xi * o.rx, o.z + xi * o.rz] as const;
        let b05 = 0;
        for (let xi = tipXi - 0.5 * Hs; xi <= tipXi + 0.5 * Hs; xi += 0.25) b05 = Math.max(b05, strengthAt(...alongAt(xi)));
        let b1 = 0;
        for (let xi = tipXi - Hs; xi <= tipXi + Hs; xi += 0.25) b1 = Math.max(b1, strengthAt(...alongAt(xi)));
        jetBreak.push(b05);
        jetBreak1.push(b1);
        pouring.push({ x: o.x, z: o.z, rx: o.rx, rz: o.rz, tipXi, Hs, until: solver.time + 0.2, best: b05 });
      }
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
      const bestAll = new Int32Array(columns).fill(-1);
      const bestAllDist = new Float64Array(columns).fill(Infinity);
      for (let s = 0; s < loft.sliceCount; s += 1) {
        if (loft.sliceJoined[s] === 1 && loft.sliceWeight[s] > 0) {
          // Ruling 3's bar 6 per column at all weights: each column's nearest joined slice of any weight.
          const c = 3 * (s * S + E + LANDMARK.crest);
          const reefS = poolStraightFrame(loft.positions[c] - loft.sliceShift[s] * loft.sliceRayX[s], loft.positions[c + 2] - loft.sliceShift[s] * loft.sliceRayZ[s]).s;
          const k = columnOf(reefS);
          const dist = Math.abs(reefS - (cFrom + k * cStep));
          if (k >= 0 && k < columns && dist < 0.5 && dist < bestAllDist[k]) {
            bestAllDist[k] = dist;
            bestAll[k] = s;
          }
        }
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
        for (let k = 0; k < columns; k += 1) {
          const s = bestAll[k];
          if (s < 0 || !(loft.sliceLife[s] >= 1)) continue;
          const key = `${loft.sliceFront[s] % FRONT_PIECE}:${k}`;
          if (landedAll.has(key)) continue;
          landedAll.add(key);
          const o = origin(loft, s);
          const { Hs } = section(o.x, o.z, o.rx, o.rz);
          if (!(Hs > 0.2)) continue;
          const tip = 3 * (s * S + E + LANDMARK.lip);
          const tipXi = (loft.positions[tip] - o.x) * o.rx + (loft.positions[tip + 2] - o.z) * o.rz;
          let b = 0;
          for (let xi = tipXi - 0.5 * Hs; xi <= tipXi + 0.5 * Hs; xi += 0.25) b = Math.max(b, strengthAt(o.x + xi * o.rx, o.z + xi * o.rz));
          columnAll.push(b);
        }
      });
      // Each front's ends along σ (bar 4b's causes: a rise within the end's blend).
      const ends = new Map<number, [number, number]>();
      for (let s = 0; s < loft.sliceCount; s += 1) {
        const e = ends.get(loft.sliceFront[s]);
        if (!e) ends.set(loft.sliceFront[s], [loft.sliceSigma[s], loft.sliceSigma[s]]);
        else {
          e[0] = Math.min(e[0], loft.sliceSigma[s]);
          e[1] = Math.max(e[1], loft.sliceSigma[s]);
        }
      }
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
          // The drawn crest's place along the column against the solver's lower face (the wave's frame).
          const place = loft.positions[3 * (s * S + E + LANDMARK.crest) + 2] - (o.z + lower);
          for (const g of gaps) fixedBelow.push(g);
          const last = lastFixed.get(key);
          if (last && last.n === n - 2) {
            for (let j = 0; j < gaps.length; j += 1) {
              // Per 1/60 s step, over the two steps between reads.
              const rise = (gaps[j] - last.gaps[j]) / 2;
              rises.push(rise);
              (FIXED[j] >= -0.5 ? risesLow : risesHigh).push(rise);
              if (FIXED[j] >= BELOW) risesBelow.push(rise);
              const text = `t ${solver.time.toFixed(2)} col ${k} front ${key} at ${FIXED[j]} m: ${fmt(last.gaps[j])} → ${fmt(gaps[j])} m, τ ${fmt(loft.sliceTau[s])}, life ${fmt(loft.sliceLife[s])}, weight ${fmt(loft.sliceWeight[s])}, shift ${fmt(loft.sliceShift[s])}, slice σ ${fmt(loft.sliceSigma[s], 1)}`;
              if (rise > 0.2 && bigRises.length < 40) bigRises.push(text);
              if (rise > 0.05) {
                const e = ends.get(loft.sliceFront[s]) ?? [loft.sliceSigma[s], loft.sliceSigma[s]];
                candidates.push({
                  rise, text, tau: loft.sliceTau[s], weight: loft.sliceWeight[s], dWeight: loft.sliceWeight[s] - last.weight,
                  dShift: place - last.place, dTau: loft.sliceTau[s] - last.tau, crestBefore: last.shift === 0,
                  crestNow: loft.sliceShift[s] === 0, fromSolver: Math.abs(last.gaps[j]) < 0.01, fromStart: loft.sliceSigma[s] - e[0],
                  fromEnd: e[1] - loft.sliceSigma[s],
                });
              }
            }
          }
          lastFixed.set(key, { n, gaps, x: lineX, weight: loft.sliceWeight[s], shift: loft.sliceShift[s], tau: loft.sliceTau[s], place });
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
          const touchdownAt = touchdownOf(loft, s);
          place(o.x, o.z, o.rx, o.rz, 'throw', front, speed, peel.dir, touchdownAt);
          const ahead = 0.3 * peel.speed;
          place(o.x + ahead * peel.dir[0], o.z + ahead * peel.dir[1], o.rx, o.rz, 'ahead 0.3 s', front, speed, peel.dir, touchdownAt + 0.3);
        } else if (!placedOpen.has(front) && loft.sliceLife[s] >= 0.3 && touchdown === touchdown) {
          placedOpen.add(front);
          const peel = peelAt(loft, s);
          if (!peel) return;
          place(o.x, o.z, o.rx, o.rz, 'open, life 0.3', front, Math.min(PEEL_CAP, peel.speed), peel.dir, touchdownOf(loft, s));
        }
      });
    }
    for (const body of bodies) finished.push(body);
    // Ruling 3: the old placement's lone boards apart (their own block below); every other bar reads the default's.
    const finishedAll = [...finished];
    finished.length = 0;
    for (const body of finishedAll) if (body.placement !== 'old') finished.push(body);

    // The tables.
    const lines: string[] = [];
    lines.push(`pool straight Barrel, H ${height} m at the feed, cases ${caseName}, switches ${JSON.stringify(switches)}, tubeFace ${JSON.stringify(face)}; ${periods} periods after ${settle} s; CPU 1/60 s; ${((Date.now() - t0) / 1000).toFixed(0)} s wall`);
    lines.push(`reads ${reads.length}, fronts ${new Set(reads.map((r) => r.front)).size}; H_s ${q3(reads.map((r) => r.Hs))} m; drawn H (its crest over the solver's trough) ${q3(reads.map((r) => r.Hd))} m; shift (the drawn crest ahead of the point) ${q3(reads.map((r) => r.shift))} m; the cases' own lowest less the solver's trough ${q3(reads.map((r) => r.troughGap).filter((v) => Number.isFinite(v)))} m`);
    const anchorStats = (contact as unknown as { loft: { faceAnchor?: { stats: object } } }).loft.faceAnchor?.stats;
    lines.push(`the contact's face anchor: ${JSON.stringify(anchorStats ?? 'none')}; the front: joins ${simulation.front?.joins}, unbroken ${simulation.front?.unbroken}, lost ${simulation.front?.lost}, joined beside a front's end (\`TubeFace.merge\`) ${simulation.front?.merges}`);
    const bins: [string, (r: Read) => boolean][] = [
      ['τ < −1 s', (r) => r.tau < -1], ['τ −1…0 s', (r) => r.tau >= -1 && r.tau < 0], ['life 0–0.3', (r) => r.life >= 0 && r.life < 0.3],
      ['life 0.3–0.6', (r) => r.life >= 0.3 && r.life < 0.6], ['life 0.6–1', (r) => r.life >= 0.6 && r.life < 1], ['landed', (r) => r.after >= 0],
    ];
    // Bar 1.
    const all1 = reads.flatMap((r) => r.d);
    lines.push('');
    lines.push(`## Bar 1, support − solver ≥ −0.02 m on 100 % of face reads (0.05–1.0 H_s): ${pct(all1.filter((v) => v >= -0.02).length, all1.length)} of ${all1.length}; min ${fmt(least(all1), 3)} m; p0.1 ${fmt(quantile(all1, 0.001), 3)}`);
    for (const [name, test] of bins) {
      const bin = reads.filter(test);
      if (!bin.length) continue;
      lines.push(`- ${name} (n ${bin.length}): ` + FACES.map((f, j) => { const v = bin.map((r) => r.d[j]); return `${f}: ${fmt(quantile(v, 0.5), 2)} (min ${fmt(least(v), 2)})`; }).join(' | '));
    }
    // The wall the ruling foresees over today's slope (0.76 / 1.02 m at the throw at 1.5 / 1.8 m on the pool's case): each
    // read's most support over the solver's surface along the solver's face (its 11 face points, so a lower bound).
    const walls: [string, (r: Read) => boolean][] = [
      ['τ −1…−0.5 s', (r) => r.tau >= -1 && r.tau < -0.5], ['τ −0.5…−0.1 s', (r) => r.tau >= -0.5 && r.tau < -0.1],
      ['at the throw (|τ| < 0.1 s)', (r) => Math.abs(r.tau) < 0.1], ['life 0–0.3', (r) => r.life >= 0 && r.life < 0.3],
      ['life 0.3–0.6', (r) => r.life >= 0.3 && r.life < 0.6], ['life 0.6–1', (r) => r.life >= 0.6 && r.life < 1],
    ];
    lines.push(`- the wall over the solver's slope (each read's most support − solver over its face points), p10 / p50 / p90 m: ` + walls.map(([name, test]) => {
      const v = reads.filter(test).map((r) => most(r.d.filter((x) => x === x)));
      return `${name} ${q3(v.filter((x) => Number.isFinite(x)))} (n ${v.length})`;
    }).join(' | '));
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
    lines.push(`## Bar 4, the support over the solver at points fixed in the wave's frame (${FIXED.join(', ')}): (m from the solver's face crossing at 0.3 H_s): rise per 1/60 s step p50 / p99 / p99.9 / max ${[0.5, 0.99, 0.999].map((q) => fmt(quantile(rising, q), 4)).join(' / ')} / ${fmt(most(rising, 0), 3)} m (≤ 0.02); steps over 0.02 m ${pct(rising.filter((v) => v > 0.02).length, rises.length)} of ${rises.length}; under the solver by more than 0.02 m ${pct(fixedBelow.filter((v) => v < -0.02).length, fixedBelow.length)}`);
    for (const [name, list] of [['on the lower face (−0.5…0.5 m)', risesLow], ['up the face (−3…−1 m)', risesHigh]] as const) {
      const up = list.filter((v) => v > 0);
      lines.push(`- ${name}: rise p99 / p99.9 / max ${[0.99, 0.999].map((q) => fmt(quantile(up, q), 3)).join(' / ')} / ${fmt(most(up, 0), 3)} m; steps over 0.02 m ${pct(up.filter((v) => v > 0.02).length, list.length)}`);
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
    const tipBreakOne: number[] = [];
    const openTimes: number[] = [];
    const caseOpen: number[] = [];
    for (const list of byKey.values()) {
      list.sort((a, b) => a.t - b.t);
      const landing = list.find((r) => r.life >= 1);
      if (landing) {
        tipAheadD.push(landing.tipAhead / landing.Hd);
        tipAhead.push(landing.tipAhead / landing.Hs);
        tipBreak.push(landing.tipBreak);
        tipBreakOne.push(landing.tipBreak1);
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
    lines.push(`## Bar 7, the clock after the throw (every thrown point, step to step): p50 ${fmt(quantile(rates, 0.5), 3)}× (0.95–1.05), p95 ${fmt(quantile(rates, 0.95), 3)}× (≤ 1.25), max ${fmt(most(rates), 3)}×, at the cap (≥ 1.24×) ${pct(rates.filter((v) => v >= 1.24).length, rates.length)}, n ${rates.length}; open time in the solver's time per point (its τ 0 → touchdown) ${q3(pointOpen)} s against its case's ${q3(pointCase)} s, ratio p50 ${fmt(quantile(pointOpen.map((v, i) => v / pointCase[i]), 0.5), 3)}, within ±15 % ${pct(pointOpen.filter((v, i) => Math.abs(v / pointCase[i] - 1) <= 0.15).length, pointOpen.length)} (n ${pointOpen.length}); at a fixed reef column (points travel along the reef as they come shoreward) ${q3(openTimes)} s (n ${openTimes.length})`);
    lines.push('');
    lines.push(`## Bar 8, geometry: folds (overlaps) a build ${(overlaps / Math.max(1, builds)).toFixed(3)}, holes (open overlaps) ${(overlapsOpen / Math.max(1, builds)).toFixed(3)}, least ray advance ${fmt(minAdvance, 4)} m; |dδ/dσ| p50 / p95 ${fmt(quantile(shiftSlopes, 0.5), 3)} / ${fmt(quantile(shiftSlopes, 0.95), 3)} (≤ 0.3); slices with no face crossing (the crest anchor stood) ${pct(shiftMisses, slices)}; the saddle ${q3(reads.map((r) => r.saddle))} m, in H_s p50 / p95 / max ${[0.5, 0.95].map((q) => fmt(quantile(reads.map((r) => r.saddle / r.Hs), q), 3)).join(' / ')} / ${fmt(most(reads.map((r) => r.saddle / r.Hs)), 3)} (≤ 0.1)`);
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
      lines.push(`## Bars 2 and 9, bodies at s ${placeS} in trim (peel ${q3(peels)} m/s), no input, each on its own water's surface: game's water | solver's alone; "dropped": its bottom more than 0.1 m under its water's support from where it started; "under the solver's surface": the same against the solver's surface (a fall through the face)`);
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
          const falls = (g: Body[]) => g.filter((b) => b.minSolverGap < -0.1).length;
          lines.push(`- ${target}, ${kind} at ${face} of the face: n ${game.length}; dropped > 0.1 m ${drops(game)} | ${drops(solo)}; most dropped p90 ${fmt(quantile(game.map((b) => -b.minGap), 0.9))} | ${fmt(quantile(solo.map((b) => -b.minGap), 0.9))} m`
            + `; under the solver's surface > 0.1 m ${falls(game)} | ${falls(solo)}, most p90 ${fmt(quantile(game.map((b) => -b.minSolverGap), 0.9))} | ${fmt(quantile(solo.map((b) => -b.minSolverGap), 0.9))} m; the game's support over the solver's under it, most p50 / p90 ${fmt(quantile(game.map((b) => b.over), 0.5))} / ${fmt(quantile(game.map((b) => b.over), 0.9))} m`
            + (kind !== 'board' ? `; on at 3 s ${on(game)} | ${on(solo)}; fell at p50 ${fmt(quantile(game.map((b) => b.separatedAt).filter((v) => v === v), 0.5))} | ${fmt(quantile(solo.map((b) => b.separatedAt).filter((v) => v === v), 0.5))} s; lip on head or torso before touchdown ${lipped.length}, of them fell within 0.5 s ${fellSoon}` : ''));
        }
      }
    }
    // Step 7's re-ruled bars (the advisor's 2026-11-04 ruling §4).
    lines.push('');
    lines.push('# Step 7, the re-ruled bars (the advisor\'s 2026-11-04 ruling §4)');
    if (bodiesOn) {
      const game = finished.filter((b) => b.water === 'swept');
      const under = game.flatMap((b) => b.under);
      const runs = game.filter((b) => b.longestUnder > 0.1);
      lines.push(`## Bar 2a, no overrun: outside the lip's water, the bottom under the support p99 ${fmt(quantile(under, 0.99), 3)} m (≤ 0.15), p99.9 ${fmt(quantile(under, 0.999), 3)}, max ${fmt(most(under, 0), 3)} m, n ${under.length}; bodies more than 0.15 m under for over 0.1 s: ${runs.length} of ${game.length}, the longest ${fmt(most(game.map((b) => b.longestUnder), 0), 3)} s`);
      for (const target of ['ahead 0.3 s', 'throw', 'open, life 0.3']) {
        const g = game.filter((b) => b.target === target);
        if (!g.length) continue;
        const u = g.flatMap((b) => b.under);
        lines.push(`- ${target}: under p99 ${fmt(quantile(u, 0.99), 3)} m, runs over 0.1 s ${g.filter((b) => b.longestUnder > 0.1).length} of ${g.length}; at 0.3 H_s ${fmt(quantile(g.filter((b) => b.face === 0.3).flatMap((b) => b.under), 0.99), 3)}, at 0.6 ${fmt(quantile(g.filter((b) => b.face === 0.6).flatMap((b) => b.under), 0.99), 3)} m`);
      }
      const low = game.filter((b) => b.face === 0.3 && (b.kind === 'board' || b.kind === 'prone') && (b.target === 'ahead 0.3 s' || b.target === 'throw'));
      const lipped = low.filter((b) => b.inLip);
      const clean = low.filter((b) => !b.inLip);
      const held = clean.filter((b) => b.dropToTouchdown <= 0.1 && !b.offBeforeTouchdown);
      lines.push(`## Bar 2b, lone boards and prone riders at 0.3 H_s, ahead and at the throw, within 0.1 m of the support to touchdown: ${pct(held.length, clean.length)} of ${clean.length} (≥ 80 %), lip hits apart ${lipped.length}; by kind: ` + (['board', 'prone'] as const).map((kind) => {
        const c = clean.filter((b) => b.kind === kind);
        return `${kind} ${c.filter((b) => b.dropToTouchdown <= 0.1 && !b.offBeforeTouchdown).length} of ${c.length} (drop p50 / p90 ${fmt(quantile(c.map((b) => b.dropToTouchdown), 0.5))} / ${fmt(quantile(c.map((b) => b.dropToTouchdown), 0.9))} m${kind === 'prone' ? `, off before touchdown ${c.filter((b) => b.offBeforeTouchdown).length}` : ''})`;
      }).join('; '));
      const high = game.filter((b) => b.face === 0.6);
      lines.push(`## Bar 2c (information), bodies at 0.6 H_s pitched into the lip's water before touchdown: ${pct(high.filter((b) => b.inLip).length, high.length)} of ${high.length}; ` + (['board', 'prone', 'rider'] as const).map((kind) => `${kind} ${high.filter((b) => b.kind === kind && b.inLip).length} of ${high.filter((b) => b.kind === kind).length}`).join(', '));
    }
    const lowerB: number[] = [];
    const upperB: number[] = [];
    for (const r of reads) {
      if (!(r.life < 0.6) && !(r.tau < 0)) continue;
      FACES.forEach((f, j) => {
        if (!(r.raw[j] === r.raw[j])) return;
        if (f <= 0.25) lowerB.push(Math.abs(r.raw[j]) / r.Hs);
        else if (f <= 0.4) upperB.push(Math.abs(r.raw[j]) / r.Hs);
      });
    }
    lines.push(`## Bar 3, the cases' own lower face against the solver's over 0.05–0.25 H_s (below the anchor), through life 0.6: p50 ${fmt(quantile(lowerB, 0.5), 3)} (≤ 0.05), p95 ${fmt(quantile(lowerB, 0.95), 3)} (≤ 0.15), n ${lowerB.length}; over 0.3–0.4 H_s (information) p50 ${fmt(quantile(upperB, 0.5), 3)}, p95 ${fmt(quantile(upperB, 0.95), 3)}`);
    const belowUp = risesBelow.filter((v) => v > 0);
    lines.push(`## Bar 4a, below the anchor (${FIXED.filter((f) => f >= BELOW).join(', ')} m shoreward of the solver's 0.3 H_s crossing): rise p99 ${fmt(quantile(belowUp, 0.99), 4)} m a step (≤ 0.02), p99.9 ${fmt(quantile(belowUp, 0.999), 4)}, max ${fmt(most(belowUp, 0), 3)}; steps over 0.02 m ${pct(belowUp.filter((v) => v > 0.02).length, risesBelow.length)} of ${risesBelow.length}`);
    lines.push(`## Bar 4b, continuity: the case's crest's place along each point's ray (W = S·n + δ, the shift as the contact placed its case) against the wave's advance C Δt, |ΔW − C Δt| a step p50 / p99 / p99.9 / max ${[0.5, 0.99, 0.999].map((q) => fmt(quantile(frameSteps, q), 4)).join(' / ')} / ${fmt(most(frameSteps, 0), 3)} m (p99 ≤ 0.03), over 0.03 m ${pct(frameSteps.filter((v) => v > 0.03).length, frameSteps.length)} of ${frameSteps.length}${unordered ? ` (${unordered} steps unread: records not in the front's order)` : ''}`);
    lines.push(`- the case's crest's speed along the ray over the wave's advance there, p5 / p50 / p95 ${[0.05, 0.5, 0.95].map((q) => fmt(quantile(frameRates, q), 3)).join(' / ')}`);
    lines.push(`- the shift δ itself (from the point, a crest cell's centre stepping 1 m rows along its column), its change a step p50 / p99 / max ${fmt(quantile(shiftSteps, 0.5), 4)} / ${fmt(quantile(shiftSteps, 0.99), 4)} / ${fmt(most(shiftSteps, 0), 3)} m, over 0.03 m ${pct(shiftSteps.filter((v) => v > 0.03).length, shiftSteps.length)}`);
    lines.push(`- crest-anchor fallbacks after a point's first face anchor (0): ${fallbacks} steps, ${fellBack.size} of ${faced.size} faced points`);
    lines.push(`- the pre-throw clock (0.5–1.5× real time; no holds over 0.1 s): p1 / p5 / p50 / p95 / p99 ${[0.01, 0.05, 0.5, 0.95, 0.99].map((q) => fmt(quantile(preRates, q), 3)).join(' / ')}×, within 0.5–1.5 ${pct(preRates.filter((v) => v >= 0.5 - 1e-6 && v <= 1.5 + 1e-6).length, preRates.length)} of ${preRates.length}; holds over 0.1 s ${holds} (${holdPoints.size} points)`);
    lines.push(`- the slice's weight (formation and retirement), its change a step p99 / max ${fmt(quantile(weightSteps, 0.99), 4)} / ${fmt(most(weightSteps, 0), 4)} (≤ 1/18 = 0.0556), over it ${pct(weightSteps.filter((v) => v > 1 / 18 + 1e-6).length, weightSteps.length)} of ${weightSteps.length}`);
    // The 40 largest rises by cause.
    const top = candidates.sort((a, b) => b.rise - a.rise).slice(0, 40);
    const causeOf = (r: Rise) => {
      if (r.crestBefore !== r.crestNow) return 'crest-anchor fallback';
      if (Math.abs(r.dShift) > 0.07) return 'the drawn crest moving against the solver\'s lower face (> 0.035 m a step)';
      if (Math.abs(r.dWeight) > 0.1) return 'weight change (> 0.05 a step)';
      if (r.dTau > 2 * 1.6 * dt || (r.tau < 0 && r.dTau < 2 * 0.4 * dt)) return 'clock jump or hold';
      if (Math.min(r.fromStart, r.fromEnd) < 5.3) return 'within a front end\'s blend (5.3 m)';
      return r.tau >= 0 ? 'the overturn passing (after the throw)' : 'the wall forming (before the throw)';
    };
    const causes = new Map<string, number>();
    for (const r of top) causes.set(causeOf(r), (causes.get(causeOf(r)) ?? 0) + 1);
    lines.push(`## The ${top.length} largest rises at the fixed points, by cause (rise p50 ${fmt(quantile(top.map((r) => r.rise), 0.5), 3)} m a step, smallest ${fmt(top.at(-1)?.rise ?? Number.NaN, 3)}): ${[...causes].map(([c, k]) => `${c} ${k}`).join(', ')}; at weight ≥ 0.9 ${top.filter((r) => r.weight >= 0.9).length}, after the throw ${top.filter((r) => r.tau >= 0).length}, from the solver's own surface the read before ${top.filter((r) => r.fromSolver).length}, within 5.3 m of the front's start ${top.filter((r) => r.fromStart < 5.3).length}`);
    for (const r of top.slice(0, 12)) lines.push(`  - ${fmt(r.rise, 3)} m (${causeOf(r)}; Δ(crest − lower face) ${fmt(r.dShift, 3)}, Δweight ${fmt(r.dWeight, 3)}, Δτ ${fmt(r.dTau, 3)}): ${r.text}`);
    const deep = reads.filter((r) => r.life >= 0.3 && r.life <= 0.9);
    lines.push(`## Bar 5, usable clearance (held over ${CROUCH} m along the ray) at life 0.3–0.9: p10 / p50 / p90 ${q3(deep.map((r) => r.usable))} m; the cases' own ${q3(deep.map((r) => r.caseUsable).filter((v) => v === v))} m, p50 ratio ${fmt(quantile(deep.map((r) => r.usable), 0.5) / quantile(deep.map((r) => r.caseUsable).filter((v) => v === v), 0.5), 2)}; usable > 0 on ${pct(deep.filter((r) => r.usable > 0).length, deep.length)}; the max gap (information) ${q3(deep.map((r) => r.air))} m (n ${deep.length})`);
    lines.push(`## Bar 6, touchdown on the solver's breaking ≥ 0.3: within ±0.5 H_s ${pct(tipBreak.filter((v) => v >= 0.3).length, tipBreak.length)} (≥ 85 %), within ±1 H_s ${pct(tipBreakOne.filter((v) => v >= 0.3).length, tipBreakOne.length)} (≥ 90 %); the distance as above`);
    const offsets = firstTau.map((t, i) => t - firstEarliest[i]);
    lines.push(`## Bar 7, formation: each point's first clock against its case's earliest frame τ_e (${q3(firstEarliest, 3)} s): offset ${q3(offsets, 3)} s, within 0.1 s on ${pct(offsets.filter((v) => Math.abs(v) <= 0.1).length, offsets.length)} of ${offsets.length}; (the post-throw clock and open time as above; the pre-throw clock under bar 4b)`);
    lines.push(`## Bar 8, re-ruled: holes ${(overlapsOpen / Math.max(1, builds)).toFixed(3)} a build (≤ 0.01), folds ${(overlaps / Math.max(1, builds)).toFixed(3)} (≤ 0.05), saddle p95 ${fmt(quantile(reads.map((r) => r.saddle / r.Hs), 0.95), 3)} H_s (≤ 0.2); the rest as above`);
    const simAnchor = (simulation.crash as unknown as { geometry?: { faceAnchor?: { stats: object } } } | undefined)?.geometry?.faceAnchor?.stats;
    lines.push(`the simulation's anchors (continueAnchor, cumulative over the process): ${JSON.stringify(anchorCounts)}; its face anchor's reads ${JSON.stringify(simAnchor ?? 'none')}`);
    // The 2026-11-05 ruling's re-ruled bars (advisor-ruling-2.md, "Re-ruled bars").
    lines.push('');
    lines.push('# The 2026-11-05 re-ruled bars (the advisor\'s advisor-ruling-2.md)');
    if (bodiesOn) {
      const game = finished.filter((b) => b.water === 'swept');
      const before = game.flatMap((b) => b.normalBefore);
      const after = game.flatMap((b) => b.normalAfter);
      const long = game.filter((b) => b.longestNormal > 0.1);
      lines.push(`## Bar 2a, along the nearest surface's normal, before the body's σ touchdown, outside the lip's water: p99 ${fmt(quantile(before, 0.99), 3)} m (≤ 0.15), p99.9 ${fmt(quantile(before, 0.999), 3)}, max ${fmt(most(before, 0), 3)}, n ${before.length}; bodies over 0.15 m for more than 0.1 s: ${long.length} of ${game.length} (0), the longest ${fmt(most(game.map((b) => b.longestNormal), 0), 3)} s; after touchdown (information, wipeouts): p50 / p99 ${fmt(quantile(after, 0.5), 3)} / ${fmt(quantile(after, 0.99), 3)} m, n ${after.length}`);
      for (const kind of ['board', 'prone', 'rider'] as const) {
        const g = game.filter((b) => b.kind === kind);
        const u = g.flatMap((b) => b.normalBefore);
        lines.push(`- ${kind}: p99 ${fmt(quantile(u, 0.99), 3)} m, over 0.15 m for more than 0.1 s ${g.filter((b) => b.longestNormal > 0.1).length} of ${g.length}; ` + ['ahead 0.3 s', 'throw', 'open, life 0.3'].map((target) => `${target} ${fmt(quantile(g.filter((b) => b.target === target).flatMap((b) => b.normalBefore), 0.99), 3)}`).join(', '));
      }
      const low = game.filter((b) => b.face === 0.3 && (b.kind === 'board' || b.kind === 'prone') && (b.target === 'ahead 0.3 s' || b.target === 'throw'));
      const outcome = (g: Body[], o: string) => g.filter((b) => (b.outcome || 'carried') === o).length;
      const describe = (g: Body[]) => `carried ${outcome(g, 'carried')} (of them never touched down ${g.filter((b) => b.outcome === '').length}), pitched ${outcome(g, 'pitched-lip') + outcome(g, 'pitched-off')} (into the lip's water ${outcome(g, 'pitched-lip')}, off the surface ${outcome(g, 'pitched-off')}), overrun ${outcome(g, 'overrun')} of ${g.length}`;
      const off = low.filter((b) => b.outcome === 'pitched-off');
      lines.push(`- (information) leaving the surface, velocity up / shoreward along the ray p10 / p50 / p90: boards ${q3(off.filter((b) => b.kind === 'board').map((b) => b.offUp!))} / ${q3(off.filter((b) => b.kind === 'board').map((b) => b.offOut!))} m/s; prone ${q3(off.filter((b) => b.kind === 'prone').map((b) => b.offUp!))} / ${q3(off.filter((b) => b.kind === 'prone').map((b) => b.offOut!))} m/s`);
      const lipHits = low.filter((b) => b.lipHead === b.lipHead);
      lines.push(`## Bar 2b, passive lone boards and prone riders at 0.3 H_s, ahead and at the throw, to touchdown: overrun ${pct(outcome(low, 'overrun'), low.length)} (≤ 20 %), carried + pitched ${pct(low.length - outcome(low, 'overrun'), low.length)} (≥ 80 %); ${describe(low)}; lip on head or torso (prone, kept apart) ${lipHits.length}, overrun without them ${pct(outcome(low.filter((b) => !(b.lipHead === b.lipHead)), 'overrun'), low.length - lipHits.length)}`);
      for (const kind of ['board', 'prone'] as const) for (const target of ['ahead 0.3 s', 'throw']) {
        const g = low.filter((b) => b.kind === kind && b.target === target);
        if (g.length) lines.push(`- ${kind}, ${target}: ${describe(g)}`);
      }
      const high = game.filter((b) => b.face === 0.6);
      lines.push(`## Bar 2c (information), 0.6 H_s bodies to touchdown: ${describe(high)}`);
      // The risks: flings and force flips (lone boards and prone riders, before touchdown, outside the lip's water).
      const boards = game.filter((b) => b.kind === 'board');
      const flipped = (g: Body[], key: 'forceFlips' | 'normalFlips') => g.reduce((t, b) => t + b[key], 0);
      const stepsOf = (g: Body[]) => g.reduce((t, b) => t + b.flipSteps, 0);
      lines.push(`## Cost (information): the bodies' water samples a body step ${fmt(sampleCalls / Math.max(1, bodySteps), 1)} on average (${bodySteps} body steps)`);
      lines.push(`## The risks: lone boards clear of the water before touchdown by more than 0.1 / 0.3 m (flung): ${boards.filter((b) => b.clearest < -0.1).length} / ${boards.filter((b) => b.clearest < -0.3).length} of ${boards.length}, most clear p90 / max ${fmt(quantile(boards.map((b) => -b.clearest).filter((v) => Number.isFinite(v)), 0.9), 3)} / ${fmt(most(boards.map((b) => -b.clearest).filter((v) => Number.isFinite(v)), 0), 3)} m; the water's force on the hull turning past 90° in a step (both over half the board's weight): ` + (['board', 'prone', 'rider'] as const).map((kind) => { const g = game.filter((b) => b.kind === kind); return `${kind} ${flipped(g, 'forceFlips')} in ${stepsOf(g)} steps`; }).join(', ') + `; the sampled normal turning over 30° in a step: ` + (['board', 'prone', 'rider'] as const).map((kind) => { const g = game.filter((b) => b.kind === kind); return `${kind} ${flipped(g, 'normalFlips')}`; }).join(', '));
    }
    // Bar 3, one-sided, below the anchor (0.05–0.25 H_s), through life 0.6.
    const over: number[] = [];
    const underBy: [string, number[]][] = [['τ < −1 s', []], ['τ −1…0 s', []], ['life 0–0.6', []]];
    for (const r of reads) {
      if (!(r.life < 0.6) && !(r.tau < 0)) continue;
      FACES.forEach((f, j) => {
        if (f > 0.25 || !(r.raw[j] === r.raw[j])) return;
        over.push(Math.max(0, r.raw[j]) / r.Hs);
        if (r.raw[j] < 0) (r.tau < -1 ? underBy[0][1] : r.tau < 0 ? underBy[1][1] : underBy[2][1]).push(-r.raw[j] / r.Hs);
      });
    }
    lines.push(`## Bar 3, one-sided below the anchor (0.05–0.25 H_s, through life 0.6): the case over the solver (a felt bump) p95 ${fmt(quantile(over, 0.95), 3)} H_s (≤ 0.05), max ${fmt(most(over, 0), 3)} (≤ 0.1), over at all on ${pct(over.filter((v) => v > 0).length, over.length)} of ${over.length}; the case under the solver (information) p50 / p95 by τ: ${underBy.map(([name, v]) => `${name} ${fmt(quantile(v, 0.5), 3)} / ${fmt(quantile(v, 0.95), 3)} (n ${v.length})`).join(', ')}`);
    // Bar 4b.
    const counted = Object.fromEntries(Object.entries(anchorCounts).map(([key, value]) => [key, value - (anchor0 as Record<string, number>)[key]]));
    const facedSteps = counted.kept + counted.capped;
    lines.push(`## Bar 4b, re-ruled: jitter |ΔW_n − ΔW_(n−1)| p99 ${fmt(quantile(jitters, 0.99), 4)} m (≤ 0.005), max ${fmt(most(jitters, 0), 3)} (≤ 0.02), n ${jitters.length}; against the case's own pace |ΔW − ΔW*| p99 ${fmt(quantile(ownPace, 0.99), 4)} m (≤ 0.01), n ${ownPace.length}; single steps |ΔW − C Δt| over 0.1 m (consecutive steps): ${consecutiveSteps.filter((v) => v > 0.1).length} (0), max ${fmt(most(consecutiveSteps, 0), 3)} m, p99.9 ${fmt(quantile(consecutiveSteps, 0.999), 4)}; across a gap of unread steps (not one step's change) ${skippedSteps.length} reads, over 0.1 m ${skippedBig}, max ${fmt(most(skippedSteps, 0), 3)}; all reads as step 7 measured them, over 0.1 m ${frameSteps.filter((v) => v > 0.1).length}, max ${fmt(most(frameSteps, 0), 3)}; the cap engaged on ${pct(counted.capped, facedSteps)} of ${facedSteps} faced steps (≤ 10 %); the anchor's outcomes this run ${JSON.stringify(counted)}; |ΔW − C Δt| (information) p50 / p99 / p99.9 ${[0.5, 0.99, 0.999].map((q) => fmt(quantile(frameSteps, q), 4)).join(' / ')}`);
    lines.push(`- (information) the target's own step against the wave's advance |ΔW* − C Δt|, p50 / p90 / p99: inside a front (3 points or more from its ends) ${[0.5, 0.9, 0.99].map((q) => fmt(quantile(targetInside, q), 4)).join(' / ')} m (n ${targetInside.length}); within 3 points of its ends ${[0.5, 0.9, 0.99].map((q) => fmt(quantile(targetEnds, q), 4)).join(' / ')} m (n ${targetEnds.length})`);
    for (const big of bigSteps.slice(0, 12)) lines.push(`  - ${big.text}`);
    // The ledger.
    const twice = [...throwsOf.values()].filter((v) => v > 1).length;
    const c2 = simulation.crash?.counts;
    const asked = c2 && crash0 ? c2.asked - crash0.asked : Number.NaN;
    const thrownV = c2 && crash0 ? c2.thrown - crash0.thrown : Number.NaN;
    lines.push(`## The ledger, re-ruled: crests thrown more than once ${twice} of ${throwsOf.size} (0); thrown points unbroken at touchdown ${unbrokenAtTouchdown} of ${touchdowns} touchdowns, their jets pouring ${unbrokenJets} (0) (returned to their crests by the guard: ${c2 && crash0 && c2.returned !== undefined ? c2.returned - (crash0.returned ?? 0) : '—'}), of them flagged while the solver breaks at their crest ${staleAtTouchdown}, their retirement then ${q3(retireAtTouchdown)}; starved ${fmt((100 * (asked - thrownV)) / asked, 2)} % of the ${fmt(asked, 1)} m³ asked (≤ 5 %); bar 6 per jet: on the solver's breaking ≥ 0.3 within ±0.5 H_s ${pct(jetBreak.filter((v) => v >= 0.3).length, jetBreak.length)}, within ±1 H_s ${pct(jetBreak1.filter((v) => v >= 0.3).length, jetBreak1.length)} of ${jetBreak.length} jets (${jetUnread} unread); the meter as above (±5 % of main); the jets against main (information): ${c2 && crash0 ? c2.throws - crash0.throws : '—'}`);
    // Bar 8.
    lines.push(`## Bar 8, re-ruled: holes ${(overlapsOpen / Math.max(1, builds)).toFixed(4)} a build (≤ 0.01), at weight ≥ 0.5 ${heavyHoles} (0); folds (information) ${(overlaps / Math.max(1, builds)).toFixed(3)}, overlapping open strips both kept (\`TubeFace.merge\`) ${(keptFolds / Math.max(1, builds)).toFixed(4)} a build; the first holes:`);
    for (const hole of holeLog.slice(0, 20)) lines.push(`  - ${hole}`);
    // Ruling 3's bars (the advisor's advisor-ruling-3.md).
    lines.push('');
    lines.push('# Ruling 3\'s bars (the advisor\'s advisor-ruling-3.md)');
    const q3x = (v: number[], digits = 3) => (v.length ? [0.5, 0.9, 0.99].map((f) => fmt(quantile(v, f), digits)).join(' / ') : '—');
    if (bodiesOn) {
      const w = waterSteps;
      lines.push(`## The wall-water step, the water at a body's bottom step to step before its touchdown, p50 / p90 / p99 m/s: in the case's wall ${q3x(w.wall)} (p99 ≤ 1), n ${w.wall.length}; crossing in or out of it ${q3x(w.crossing)} (p99 ≤ 1), n ${w.crossing.length}; the solver's (information) ${q3x(w.solver)}, n ${w.solver.length}; the lip's water (information) ${q3x(w.lip)}, n ${w.lip.length}; lone boards alone: in the wall ${q3x(w.boardWall)} (n ${w.boardWall.length}), crossing ${q3x(w.boardCrossing)} (n ${w.boardCrossing.length}), elsewhere ${q3x(w.boardOther)}`);
      lines.push(`- (information) the case's surface's own speed over 12 m/s (up, or along the ray off C), by profile index (8 a bin; E ${E}, the crest ${LANDMARK.crest}, the lip ${LANDMARK.lip}, the throat ${LANDMARK.throat}, the toe ${LANDMARK.toe}): ${[...fastWall].sort((a, b) => Number(a[0]) - Number(b[0])).map(([k, v]) => `${k}: ${v}`).join(', ')} of ${fastAll} vertices`);
      lines.push(`- (information) the 12 largest steps in the wall, before and after:`);
      for (const big of wallBig) lines.push(`  - ${big.text}`);
      const placements: [string, Body[]][] = [
        ['the default placement (lone boards at rest draft, 5 mm along the nearest normal, with their water along it)', finished],
        ['the old placement (lone boards 5 cm under the support, the surface\'s vertical speed)', finishedAll.filter((b) => b.placement === 'old' || b.kind !== 'board')],
      ];
      for (const [name, pop] of placements) {
        const game = pop.filter((b) => b.water === 'swept');
        const before = game.flatMap((b) => b.normalBefore);
        const long = game.filter((b) => b.longestNormal > 0.1);
        const low = game.filter((b) => b.face === 0.3 && (b.kind === 'board' || b.kind === 'prone') && (b.target === 'ahead 0.3 s' || b.target === 'throw'));
        const outcome = (g: Body[], o: string) => g.filter((b) => (b.outcome || 'carried') === o).length;
        const describe = (g: Body[]) => `carried ${outcome(g, 'carried')}, pitched ${outcome(g, 'pitched-lip') + outcome(g, 'pitched-off')} (into the lip's water ${outcome(g, 'pitched-lip')}, off the surface ${outcome(g, 'pitched-off')}), overrun ${outcome(g, 'overrun')} of ${g.length}`;
        const boards = game.filter((b) => b.kind === 'board');
        const flips = boards.reduce((t, b) => t + b.forceFlips, 0);
        const flipSteps = boards.reduce((t, b) => t + b.flipSteps, 0);
        lines.push(`## ${name}`);
        lines.push(`- 2a (along the nearest normal, before touchdown, outside the lip's water): p99 ${fmt(quantile(before, 0.99), 3)} m (≤ 0.15), n ${before.length}; bodies over 0.15 m for more than 0.1 s ${long.length} of ${game.length}; boards p99 ${fmt(quantile(boards.flatMap((b) => b.normalBefore), 0.99), 3)} m`);
        lines.push(`- 2b (lone boards and prone riders at 0.3 H_s, ahead and at the throw): overrun ${pct(outcome(low, 'overrun'), low.length)} (≤ 20 %); ${describe(low)}; boards at the throw: ${describe(low.filter((b) => b.kind === 'board' && b.target === 'throw'))}; boards ahead: ${describe(low.filter((b) => b.kind === 'board' && b.target === 'ahead 0.3 s'))}`);
        lines.push(`- flings (lone boards more than 0.1 m clear of the water before touchdown, outside the lip's water, no lip over them): ${boards.filter((b) => b.clearestOut < -0.1).length} of ${boards.length}, ${pct(boards.filter((b) => b.clearestOut < -0.1).length, boards.length)} (≤ 10 %); more than 0.3 m ${boards.filter((b) => b.clearestOut < -0.3).length}; anywhere before touchdown (as before) > 0.1 / 0.3 m ${boards.filter((b) => b.clearest < -0.1).length} / ${boards.filter((b) => b.clearest < -0.3).length}`);
        lines.push(`- (information) the hull force turning past 90° in a step, lone boards: ${flips} in ${flipSteps} steps (${pct(flips, flipSteps)})`);
      }
    }
    {
      const counted = Object.fromEntries(Object.entries(anchorCounts).map(([key, value]) => [key, value - ((anchor0 as Record<string, number>)[key] ?? 0)]));
      const faced = counted.kept + counted.capped + (counted.gated ?? 0) + (counted.reacquired ?? 0);
      const rms = targetSecond.length ? Math.sqrt(targetSecond.reduce((t, v) => t + v * v, 0) / targetSecond.length) : Number.NaN;
      const reads = (simulation.crash as unknown as { geometry?: { faceAnchor?: { stats: { shifts: number; reads: number; troughAtEnd: number; caseTroughAtEnd: number } } } } | undefined)?.geometry?.faceAnchor?.stats;
      lines.push(`## Bar 4b, ruling 3: jitter p99 ${fmt(quantile(jitters, 0.99), 4)} m (≤ 0.005), max ${fmt(most(jitters, 0), 3)} (≤ 0.02); own pace against the tracker |ΔW − v̂ Δt| p99 ${fmt(quantile(trackerPace, 0.99), 4)} m (≤ 0.01), n ${trackerPace.length}; the raw target's step inside a front |ΔW* − C Δt| p50 / p90 / p99 ${q3x(targetInside, 4)} m (p90 ≤ 0.02); single steps over 0.1 m ${consecutiveSteps.filter((v) => v > 0.1).length} (0), max ${fmt(most(consecutiveSteps, 0), 3)} m; the cap (or the tracker's gate) engaged ${pct((counted.capped ?? 0) + (counted.gated ?? 0), faced)} of ${faced} faced steps (≤ 10 %)`);
      lines.push(`- (information) the read's noise σ_v, the raw target's second difference inside a front rms/√6: ${fmt(rms / Math.sqrt(6), 4)} m (n ${targetSecond.length}; its |Δ²| p50 / p90 / p99 ${q3x(targetSecond.map(Math.abs), 4)}); the raw target's step against the tracker |ΔW* − v̂ Δt| p50 / p90 / p99 ${q3x(targetVsTracker, 4)}; own pace against the raw target (as before) p99 ${fmt(quantile(ownPace, 0.99), 4)}; the outcomes ${JSON.stringify(counted)}; the read ${reads ? `${fmt(reads.reads / Math.max(1, reads.shifts), 1)} reads a shift, its trough at its window's end on ${pct(reads.troughAtEnd, reads.shifts)}, the case's trough at its profile's last point on ${pct(reads.caseTroughAtEnd, reads.shifts)} (cumulative)` : '—'}`);
    }
    lines.push(`## Bar 6, ruling 3: per jet, the solver's breaking ≥ 0.3 within ±0.5 H_s of the tip within 0.2 s after the pour starts ${pct(jetBreakAfter.filter((v) => v >= 0.3).length, jetBreakAfter.length)} of ${jetBreakAfter.length} (≥ 85 %); at the crash itself (as before) ${pct(jetBreak.filter((v) => v >= 0.3).length, jetBreak.length)}; per column at all weights (each column-wave's nearest slice of any weight, its first read past life 1) ${pct(columnAll.filter((v) => v >= 0.3).length, columnAll.length)} of ${columnAll.length}`);
    lines.push(`## Holes, ruling 3: visible holes ${visibleHoles} (0), ${(visibleHoles / Math.max(1, builds)).toFixed(4)} a build; at weight ≥ 0.5 ${heavyHoles} (0); the raw count (information) ${rawHoles}, ${(overlapsOpen / Math.max(1, builds)).toFixed(4)} a build; the first visible:`);
    for (const hole of visibleLog) lines.push(`  - ${hole}`);
    lines.push(`## The ledger, ruling 3 (information): thrown points unbroken at touchdown ${unbrokenAtTouchdown} of ${touchdowns}, their retirement then ${q3(retireAtTouchdown)}`);
    lines.push(`## Cost, ruling 3 (this M1, Node, under the probes' load): a body's step on the game's water ${fmt(bodyMs.steps ? (1000 * bodyMs.total) / bodyMs.steps : Number.NaN, 1)} µs mean over ${bodyMs.steps} body steps; the contact's update p50 ${fmt(quantile(contactMs, 0.5), 2)} ms`);
    appendFileSync(log, lines.join('\n') + '\n');
    if (traceBodies) writeFileSync(`${log}.bodies`, bodyTrace.join('\n') + '\n');
  }, 14_400_000);
});
