import { appendFileSync, writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { PADANG } from '../Bathymetry';
import { libraryFromBytes } from '../barrel/barrelLibrary';
import { FRONT_CAPACITY, FRONT_STRIDE, writeFrontRecords } from '../barrel/frontRecords';
import { readBarrelCases } from '../barrel/nodeBarrelCases';
import { LANDMARK } from '../barrel/ProfileLibrary';
import { BARREL_SLOPE, LOFT, LOFT_SAMPLES, SweptLoft, type LoftResult } from '../barrel/sweptLoft';
import { SurfZoneSimulation } from '../SurfZoneSimulation';
import { sampleSurfaceHeight } from '../../scene/WaterSurface';
import { PADANG_SPREADING } from '../../game/PhysicalMode';
import { PADANG_SWELLS } from '../../game/SurfConditions';

const quantiles = (values: number[]) => {
  if (!values.length) return '—';
  const sorted = [...values].sort((a, b) => a - b);
  return [0.1, 0.5, 0.9].map((q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))].toFixed(2)).join(' / ') + ` (max ${sorted.at(-1)!.toFixed(2)}, n ${sorted.length})`;
};

/** A slice weight this high stands the profile up off the water: a tongue as drawn. */
const STANDING = 0.5;
/** Two tongues this close (m, crest to crest) read as neighbours in a clip. */
const NEIGHBOUR = 12;

interface Tongue {
  front: number;
  first: number;
  last: number;
  /** Slices by phase: before vertical, open, after touchdown. */
  phases: [number, number, number];
  length: number;
}

/** The crest landmark's world (x, z) of a slice. */
function crestOf(loft: LoftResult, slice: number): [number, number] {
  const v = slice * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.crest;
  return [loft.positions[3 * v], loft.positions[3 * v + 2]];
}

/** Maximal runs of joined slices of one front all standing (weight ≥ STANDING). */
function tongues(loft: LoftResult): Tongue[] {
  const out: Tongue[] = [];
  let open: Tongue | undefined;
  for (let s = 0; s < loft.sliceCount; s += 1) {
    const standing = loft.sliceWeight[s] >= STANDING;
    const continues = open !== undefined && loft.sliceFront[s] === open.front && loft.sliceJoined[s - 1] === 1;
    if (open && (!standing || !continues)) {
      out.push(open);
      open = undefined;
    }
    if (!standing) continue;
    open ??= { front: loft.sliceFront[s], first: s, last: s, phases: [0, 0, 0], length: 0 };
    open.last = s;
    open.phases[Math.min(2, loft.slicePhase[s])] += 1;
    open.length = loft.sliceSigma[s] - loft.sliceSigma[open.first];
  }
  if (open) out.push(open);
  return out;
}

/** Nearest crest-to-crest distance between two tongues, m, and its split along the first's ray (across the crest) and along it. */
function separation(loft: LoftResult, a: Tongue, b: Tongue): { distance: number; across: number; along: number } {
  let best = { distance: Infinity, across: 0, along: 0 };
  for (let i = a.first; i <= a.last; i += 1) {
    const [ax, az] = crestOf(loft, i);
    for (let j = b.first; j <= b.last; j += 1) {
      const [bx, bz] = crestOf(loft, j);
      const dx = bx - ax;
      const dz = bz - az;
      const distance = Math.sqrt(dx * dx + dz * dz);
      if (distance < best.distance) {
        const across = dx * loft.sliceRayX[i] + dz * loft.sliceRayZ[i];
        best = { distance, across: Math.abs(across), along: Math.sqrt(Math.max(0, distance * distance - across * across)) };
      }
    }
  }
  return best;
}

/**
 * The drawn curl's tongues at Padang Padang (the tube review; tube-colour-fix.md, "Not solved by this"): the loft as
 * drawn (not the contact's), each frame split into tongues (standing runs of one front's joined slices), each tongue's
 * phases (before vertical, open, after touchdown), and each pair of neighbouring tongues: one front with a dip between,
 * or two fronts side by side (end to end along the crest, or one behind the other across it). Opt-in (PROBE=1);
 * SECONDS, SWELL, SEED, LOG.
 */
describe.runIf(process.env.PROBE)('Padang Padang curl probe', () => {
  it('splits the drawn curl into tongues and logs what they are', () => {
    const log = process.env.LOG ?? 'padang-curl.txt';
    writeFileSync(log, '');
    const library = libraryFromBytes(readBarrelCases());
    const swellName = (process.env.SWELL ?? 'small') as keyof typeof PADANG_SWELLS;
    const swell = PADANG_SWELLS[swellName];
    const simulation = new SurfZoneSimulation({
      spot: 'padang', seed: Number(process.env.SEED ?? 3), significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod,
      directionDegrees: 0, spreading: PADANG_SPREADING, tide: 0, componentCount: 24,
      alongShore: PADANG.alongShore, dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1,
    });
    const grid = simulation.renderGrid(1);
    const surface = new Float32Array(grid.nx * grid.nz * 2);
    const records = new Float32Array(FRONT_CAPACITY * FRONT_STRIDE);
    const loft = new SweptLoft(library, BARREL_SLOPE.padang!);
    appendFileSync(log, `Padang Padang ${swellName} (Hs ${swell.significantHeight} m, ${swell.peakPeriod} s), seed ${process.env.SEED ?? 3}, 1 m cells; a tongue: joined slices of one front at weight ≥ ${STANDING}; neighbours within ${NEIGHBOUR} m\n`);
    const seconds = Number(process.env.SECONDS ?? 120);
    // Totals over the run.
    let frames = 0;
    let framesWithTongues = 0;
    const perFrame: number[] = [];
    const composition = new Map<string, number>();
    const lengths: Record<string, number[]> = { pre: [], open: [], post: [], mixed: [] };
    let sameFrontPairs = 0;
    let twoFrontPairs = 0;
    const sameFrontGapPhases: [number, number, number] = [0, 0, 0];
    const endToEnd: number[] = [];
    const behind: number[] = [];
    // Post-touchdown slices drawn, and how squashed (weight between the water and the profile).
    let postSlices = 0;
    let postSquashed = 0;
    let openSlices = 0;
    let tail: string[] = [];
    for (let frame = 0; frame < seconds * 30; frame += 1) {
      simulation.step(1 / 30);
      grid.xMin = simulation.windowXMin;
      simulation.writeUniformSurface(surface, grid, false);
      const count = writeFrontRecords(simulation.front!.points, records);
      const result = loft.build(records, count, 0, (x, z) => sampleSurfaceHeight(surface, grid, x, z));
      frames += 1;
      for (let s = 0; s < result.sliceCount; s += 1) {
        if (result.slicePhase[s] === 1) openSlices += 1;
        if (result.slicePhase[s] !== 2) continue;
        postSlices += 1;
        if (result.sliceWeight[s] > 0.05 && result.sliceWeight[s] < 0.95) postSquashed += 1;
      }
      const list = tongues(result);
      perFrame.push(list.length);
      if (list.length) framesWithTongues += 1;
      for (const t of list) {
        const kind = t.phases[0] && !t.phases[1] && !t.phases[2] ? 'pre' : t.phases[1] && !t.phases[0] && !t.phases[2] ? 'open' : t.phases[2] && !t.phases[0] && !t.phases[1] ? 'post' : 'mixed';
        const key = `${t.phases[0] ? 'P' : '-'}${t.phases[1] ? 'O' : '-'}${t.phases[2] ? 'T' : '-'}`;
        composition.set(key, (composition.get(key) ?? 0) + 1);
        lengths[kind].push(t.length);
      }
      // Each tongue's nearest neighbour within NEIGHBOUR m, each pair once.
      for (let a = 0; a < list.length; a += 1) {
        for (let b = a + 1; b < list.length; b += 1) {
          const gap = separation(result, list[a], list[b]);
          if (gap.distance > NEIGHBOUR) continue;
          if (list[a].front === list[b].front) {
            sameFrontPairs += 1;
            // What stands between them on the front: the dipped slices' phases.
            for (let s = Math.min(list[a].last, list[b].last) + 1; s < Math.max(list[a].first, list[b].first); s += 1) {
              if (result.sliceFront[s] === list[a].front) sameFrontGapPhases[Math.min(2, result.slicePhase[s])] += 1;
            }
          } else {
            twoFrontPairs += 1;
            if (gap.across > gap.along) behind.push(gap.across);
            else endToEnd.push(gap.along);
          }
        }
      }
      if (frame % 30 === 29) {
        const fronts = new Set(list.map((t) => t.front)).size;
        tail.push(`t ${simulation.solver.time.toFixed(0)} s | ${result.sliceCount} slices on ${new Set(Array.from(result.sliceFront.subarray(0, result.sliceCount))).size} fronts | tongues ${list.length} on ${fronts} fronts: ${list.map((t) => `f${t.front} ${t.length.toFixed(1)} m P${t.phases[0]}/O${t.phases[1]}/T${t.phases[2]}`).join(', ')}`);
        if (tail.length >= 10) {
          appendFileSync(log, `${tail.join('\n')}\n`);
          tail = [];
        }
      }
    }
    if (tail.length) appendFileSync(log, `${tail.join('\n')}\n`);
    const withTongues = perFrame.filter((n) => n > 0);
    appendFileSync(log, [
      `\nframes ${frames}, with a tongue ${framesWithTongues}; tongues a frame (when any) ${quantiles(withTongues)}`,
      `tongues by phases (P before vertical, O open, T after touchdown): ${[...composition.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ')}`,
      `tongue length along the crest, m: pre only ${quantiles(lengths.pre)}; open only ${quantiles(lengths.open)}; post only ${quantiles(lengths.post)}; mixed ${quantiles(lengths.mixed)}`,
      `neighbouring tongues (within ${NEIGHBOUR} m): on one front ${sameFrontPairs} (the slices between them by phase P/O/T ${sameFrontGapPhases.join('/')}); on two fronts ${twoFrontPairs}: end to end ${quantiles(endToEnd)} m apart, one behind the other ${quantiles(behind)} m apart`,
      `slices drawn after touchdown: ${postSlices} (${((100 * postSlices) / Math.max(1, postSlices + openSlices)).toFixed(0)} % of open + post), squashed (weight 0.05–0.95) ${postSquashed}`,
    ].join('\n') + '\n');
  }, 7_200_000);
});
