import { appendFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { describe, it } from 'vitest';
import { libraryFromBytes } from '../barrel/barrelLibrary';
import { readBarrelCases } from '../barrel/nodeBarrelCases';
import { BARREL_CASES } from '../barrel/barrelLibraryIndex';
import { BARREL_SPOTS, POOL_JOIN } from '../barrel/barrelSpots';
import type { CrestTrack } from '../barrel/BreakingFront';
import { columnCrests, type CrestSample } from '../barrel/crestOnset';
import { FRONT_CAPACITY, FRONT_PIECE, FRONT_STRIDE } from '../barrel/frontRecords';
import { LANDMARK, PROFILE_POINTS, type ProfileLibrary } from '../barrel/ProfileLibrary';
import { BARREL_SLOPE, LOFT, LOFT_SAMPLES, SweptLoft } from '../barrel/sweptLoft';
import { BrokenCrests } from '../../scene/barrel/brokenCrest';
import { sampleSurfaceFoam, sampleSurfaceHeight } from '../../scene/WaterSurface';
import { POOL, POOL_STRAIGHT, POOL_STRAIGHT_EDGE_HEIGHT, poolStraightFrame, regularSignificantHeight } from '../pool';
import { SurfZoneSimulation, type SurfZoneConfig } from '../SurfZoneSimulation';

const quantiles = (values: number[], digits = 2) => {
  if (!values.length) return '—';
  const sorted = [...values].sort((a, b) => a - b);
  return [0.1, 0.5, 0.9].map((q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))].toFixed(digits)).join(' / ') + ` (n ${sorted.length})`;
};
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[sorted.length >> 1] : Number.NaN;
};

/** A slice stands (the padangCurl probe's tongues) at weight 0.5 or more. */
const STANDING = 0.5;

/**
 * The vertical air gap under a profile's roof (points 64–88 over the surface beneath them, 88–127), m: the advisor's
 * measure (docs/research/pool-barrel-drawing-2026-11-01/advisor-probe).
 */
export function verticalGap(p: ArrayLike<number>): number {
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

const segment = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
  const dx = bx - ax;
  const dy = by - ay;
  const length = dx * dx + dy * dy;
  const t = length > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length)) : 0;
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
};

/**
 * T1's shape measures (`tubeShape.test.ts`, the advisor's probe): the drawn height H (the crest over the profile's lowest
 * point ahead of it), the lip's thickness (the median over the roof's points 44–60 of the nearest distance to the
 * underside 68–88), its tip (56–62 to 66–74), the void (the polygon 64–112), its L/W and tilt from second moments, and
 * the vertical air gap.
 */
export function tubeShape(p: ArrayLike<number>): { H: number; lip: number; tip: number; area: number; lw: number; tilt: number; gap: number } {
  const x = (i: number) => p[2 * i];
  const y = (i: number) => p[2 * i + 1];
  let low = Infinity;
  for (let i = LANDMARK.crest; i < PROFILE_POINTS; i += 1) low = Math.min(low, y(i));
  const H = y(LANDMARK.crest) - low;
  const across: number[] = [];
  for (let i = 44; i <= 60; i += 1) {
    let nearest = Infinity;
    for (let j = 68; j < 88; j += 1) nearest = Math.min(nearest, segment(x(i), y(i), x(j), y(j), x(j + 1), y(j + 1)));
    across.push(nearest);
  }
  let tip = Infinity;
  for (let i = 56; i <= 62; i += 1) for (let j = 66; j < 74; j += 1) tip = Math.min(tip, segment(x(i), y(i), x(j), y(j), x(j + 1), y(j + 1)));
  const ring = Array.from({ length: 49 }, (_, k) => 64 + k);
  let area = 0;
  let cx = 0;
  let cy = 0;
  ring.forEach((i, k) => {
    const j = ring[(k + 1) % ring.length];
    const c = x(i) * y(j) - x(j) * y(i);
    area += c / 2;
    cx += (x(i) + x(j)) * c;
    cy += (y(i) + y(j)) * c;
  });
  cx /= 6 * area;
  cy /= 6 * area;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  ring.forEach((i, k) => {
    const j = ring[(k + 1) % ring.length];
    const [xi, yi, xj, yj] = [x(i) - cx, y(i) - cy, x(j) - cx, y(j) - cy];
    const c = xi * yj - xj * yi;
    sxx += ((xi * xi + xi * xj + xj * xj) * c) / 12;
    syy += ((yi * yi + yi * yj + yj * yj) * c) / 12;
    sxy += ((xi * yj + 2 * xi * yi + 2 * xj * yj + xj * yi) * c) / 24;
  });
  const [mxx, myy, mxy] = [sxx / area, syy / area, sxy / area];
  const half = (mxx + myy) / 2;
  const spread = Math.sqrt(((mxx - myy) / 2) ** 2 + mxy * mxy);
  const along = Math.atan2(half + spread - mxx, mxy);
  return {
    H, lip: median(across) / H, tip: tip / H, area: Math.abs(area) / (H * H), lw: Math.sqrt((half + spread) / Math.max(1e-12, half - spread)),
    tilt: 90 - Math.abs((Math.abs(along) * 180) / Math.PI - 90), gap: verticalGap(p),
  };
}

/**
 * The Wave Pool's straight Barrel's swept tube (pool-barrel-drawing, 2026-11-01): opt-in (PROBE=1), TUBE_MODE:
 * - `join`: the front's own crest tracks with its join switched off (none ever joins, so every track runs on), each
 *   column's wave's band crest against the still depth where Kennedy's fresh test first fired under it (the join table's
 *   pairs, the advisor's A3), with its place along the reef (s) and its foot crest, sized at the platform, against its
 *   crest 10 m seaward of the face's knee;
 * - `front` (the default): the pool's own tables: joins, late joins, unbroken, the drawn tube (its height against the
 *   meter, its air gap, its open runs per wave against 1.3–3.5 H / tan α, folds and holes), the lip's foam before touchdown,
 *   and the CPU's costs.
 * H (the machine's height at the feed, m; default SIZE small/big's), PERIODS (12), SETTLE (50 s), LOG.
 */
describe.runIf(process.env.PROBE)('the Wave Pool straight Barrel tube probe', () => {
  it('logs its fronts and drawn tubes', () => {
    const mode = process.env.TUBE_MODE ?? 'front';
    const size = (process.env.SIZE ?? 'small') as 'small' | 'big';
    const height = Number(process.env.H ?? POOL_STRAIGHT_EDGE_HEIGHT[size]);
    const periods = Number(process.env.PERIODS ?? 12);
    const settle = Number(process.env.SETTLE ?? 50);
    const log = process.env.LOG ?? `pool-tube-${mode}-${height}.txt`;
    writeFileSync(log, '');
    if (mode === 'shape') {
      // T1's table: each library at its foot crests, at 0.5, 0.8 and 0.95 of touchdown, as the drawing holds it (`FEET`:
      // the pool's measured foot crests, m, comma-separated).
      const out = new Float32Array(2 * PROFILE_POINTS);
      const lines: string[] = ['library, foot crest (m) / foot depth (m), case: at 0.5 / 0.8 / 0.95 of touchdown, H (m), lip (H), tip (H), void (H²), L/W, tilt (°), air gap (m); touchdown s'];
      const sets: [string, ProfileLibrary, number, number[]][] = [
        ['Padang Padang (its four cases, 7 m foot)', libraryFromBytes(readBarrelCases('padang')), 7, [0.99, 1.4, 2.1, 3.15]],
        ['the pool on Padang Padang\'s four cases (the advisor\'s second pick, 4.5 m foot)', libraryFromBytes(readBarrelCases('padang'), 'basilisk', 'pool'), 4.5, (process.env.FEET ?? '1.0,1.17,1.3,1.51').split(',').map(Number)],
        // The Canyon's a38 alone (the first stand-in, the advisor's A1 of 2026-11-01 on the A-frame), for comparison.
        ['the pool on the Canyon\'s a38 alone (the provisional stand-in, 4.5 m foot)', libraryFromBytes(readBarrelCases(undefined, BARREL_CASES.filter((entry) => entry.id === 'periodic-canyon23-a38-l13'))), 4.5, (process.env.FEET ?? '1.0,1.17,1.3,1.51').split(',').map(Number)],
      ];
      for (const [name, lib, depth, feet] of sets) {
        lines.push(`## ${name}`);
        for (const footHeight of feet) {
          const query = { slope: name.startsWith('Padang') ? 1 / 19 : name.includes('a38') ? lib.cases[0].slope : BARREL_SLOPE.pool!, footHeight, footDepth: depth };
          const times = lib.profileTimes(query);
          const rows = [0.5, 0.8, 0.95].map((share) => {
            const lookup = lib.profileAt({ ...query, seconds: share * times.touchdownSeconds, hold: 'contact' }, out);
            const m = tubeShape(out);
            return { lookup, m };
          });
          lines.push(`  ${footHeight.toFixed(2)} / ${depth} m (A0 ${(footHeight / depth).toFixed(3)}), ${rows[0].lookup.caseId}${rows[0].lookup.clamped ? ' (clamped)' : ''}: `
            + rows.map(({ m }) => `${m.H.toFixed(2)} m, ${m.lip.toFixed(3)}, ${m.tip.toFixed(3)}, ${m.area.toFixed(3)}, ${m.lw.toFixed(2)}, ${m.tilt.toFixed(0)}°, ${m.gap.toFixed(2)} m`).join(' | ')
            + `; touchdown ${times.touchdownSeconds.toFixed(2)} s, collapse ${times.collapseSeconds.toFixed(2)} s`);
        }
      }
      appendFileSync(log, lines.join('\n') + '\n');
      return;
    }
    if (mode === 'join') {
      // None ever crosses its join depth: every track runs on until its crest is lost.
      const onset = BARREL_SPOTS.pool!.onset as { join: typeof POOL_JOIN };
      onset.join = [{ period: POOL.period, rows: [[0, -1], [9, -1]] }];
    }
    if (process.env.FOOT) Object.defineProperty(BARREL_SPOTS.pool!, 'footDepth', { value: Number(process.env.FOOT) });
    const library = libraryFromBytes(readBarrelCases('pool'), 'basilisk', 'pool');
    const simulation = new SurfZoneSimulation({
      spot: 'pool', seed: 1, significantHeight: regularSignificantHeight(height), peakPeriod: POOL.period, directionDegrees: 0, spreading: 1000,
      tide: 0, windSpeed: 0, stage: 2, compute: 'cpu', poolWaves: 'barrel',
      ...(process.env.CRASH === 'off' ? { sweptCrash: false } : {}),
    } as unknown as SurfZoneConfig, 'spun-up', library);
    const { solver } = simulation;
    const front = simulation.front!;
    front.sizes = { joined: [], unbroken: [] };
    const reef = POOL_STRAIGHT;
    const kneeN = (reef.platformDepth - 0.9) / reef.gradient;
    const etaAt = (column: number, z: number) => {
      const row = solver.rowBelow(z);
      let best = -Infinity;
      for (let r = Math.max(0, row - 2); r <= Math.min(solver.nz - 1, row + 2); r += 1) {
        const i = r * solver.nx + column;
        best = Math.max(best, solver.h[i] + solver.bed[i] - solver.restLevel);
      }
      return best;
    };
    const step = 1 / 30;
    const steps = Math.round((settle + periods * POOL.period) / step);
    const t0 = Date.now();

    if (mode === 'join') {
      const samples: CrestSample[] = [];
      // Per column, the waves its tracks belong to: a track continues the open wave in its column nearest it within 8 m
      // (its crest moves under a metre a step), else starts one; a wave unseen for a second is done.
      type Wave = { column: number; x: number; z0: number; z: number; foot: number; ref: number | null; fresh: number | null; broke: number | null; freshS: number; knee: number; t: number; seen: number };
      const open = new Map<number, Wave[]>();
      const done: Wave[] = [];
      for (let n = 1; n <= steps; n += 1) {
        simulation.step(step);
        if (solver.time < settle) continue;
        const tracks = front['tracks'] as CrestTrack[];
        // The crests as the front reads them, for each track's segment's breaking (the join's own test, strength > 0).
        const count = columnCrests(solver, simulation.breaking, solver.rowBelow(simulation.tank.fineFrom), 0.25 * height, samples);
        const byColumn = new Map<number, CrestSample[]>();
        for (let k = 0; k < count; k += 1) (byColumn.get(samples[k].column) ?? byColumn.set(samples[k].column, []).get(samples[k].column)!).push(samples[k]);
        for (const track of tracks) {
          if (track.footHeight === null) continue;
          const x = solver.xCenters[track.column];
          const list = open.get(track.column) ?? open.set(track.column, []).get(track.column)!;
          let wave: Wave | undefined;
          for (const candidate of list) if (Math.abs(candidate.z - track.z) < 8 && (!wave || Math.abs(candidate.z - track.z) < Math.abs(wave.z - track.z))) wave = candidate;
          if (!wave) {
            wave = { column: track.column, x, z0: track.z, z: track.z, foot: track.footHeight, ref: null, fresh: null, broke: null, freshS: Number.NaN, knee: Number.NaN, t: solver.time, seen: solver.time };
            list.push(wave);
          }
          const { s, n: across } = poolStraightFrame(x, track.z);
          if (wave.knee !== wave.knee && across <= kneeN + 10) wave.knee = etaAt(track.column, track.z);
          if (wave.fresh === null && track.fresh !== null) {
            wave.fresh = track.fresh;
            wave.freshS = s;
          }
          if (wave.broke === null && track.refHeight !== null) {
            const sample = byColumn.get(track.column)?.find((candidate) => Math.abs(candidate.z - track.z) < 1.5);
            if (sample && sample.strength > 0) wave.broke = sample.depth;
          }
          wave.ref = track.refHeight;
          wave.z = track.z;
          wave.seen = solver.time;
        }
        for (const [column, list] of open) {
          const kept = list.filter((wave) => solver.time - wave.seen <= 1);
          for (const wave of list) if (!kept.includes(wave)) done.push(wave);
          open.set(column, kept);
        }
      }
      for (const list of open.values()) done.push(...list);
      // Only waves first seen after the settle, on the reef (the front's own reach), sized at the platform.
      const waves = done.filter((w) => w.t > settle + 0.5 && w.ref !== null && BARREL_SPOTS.pool!.frontAt!(w.x, w.z));
      const lines = [`pool straight, H ${height} m at the feed (Hs ${regularSignificantHeight(height).toFixed(3)}), ${periods} periods after ${settle} s, ${((Date.now() - t0) / 1000).toFixed(0)} s wall; footDepth ${BARREL_SPOTS.pool!.footDepth}`];
      lines.push(`column-waves on the reef: ${waves.length}; with a fresh onset ${waves.filter((w) => w.fresh !== null).length}`);
      lines.push(`foot crest (sized at ${BARREL_SPOTS.pool!.footDepth} m) ${quantiles(waves.map((w) => w.foot))} m; the crest 10 m seaward of the knee ${quantiles(waves.filter((w) => w.knee === w.knee).map((w) => w.knee))} m; their ratio ${quantiles(waves.filter((w) => w.knee === w.knee).map((w) => w.foot / w.knee), 3)}`);
      lines.push(`band crest ${quantiles(waves.map((w) => w.ref!))} m; fresh depth ${quantiles(waves.filter((w) => w.fresh !== null).map((w) => w.fresh!))} m; first breaking (strength > 0 over its segment) ${quantiles(waves.filter((w) => w.broke !== null).map((w) => w.broke!))} m`);
      lines.push('by s (20 m bins): column-waves, fresh %, band crest p50, fresh depth p50, foot/knee p50; breaking %, its depth p50');
      for (let s0 = 0; s0 < 220; s0 += 20) {
        const bin = waves.filter((w) => { const s = poolStraightFrame(w.x, w.z0).s; return s >= s0 && s < s0 + 20; });
        if (!bin.length) continue;
        const fresh = bin.filter((w) => w.fresh !== null);
        const broke = bin.filter((w) => w.broke !== null);
        lines.push(`  s ${s0}–${s0 + 20}: ${bin.length}, ${((100 * fresh.length) / bin.length).toFixed(0)} %, ${median(bin.map((w) => w.ref!)).toFixed(3)} m, ${median(fresh.map((w) => w.fresh!)).toFixed(2)} m, ${median(bin.filter((w) => w.knee === w.knee).map((w) => w.foot / w.knee)).toFixed(3)}; ${((100 * broke.length) / bin.length).toFixed(0)} %, ${median(broke.map((w) => w.broke!)).toFixed(2)} m`);
      }
      lines.push('by band crest (0.05 m bins): column-waves, fresh %, fresh depth p50 (p25–p75), s p50; breaking %, its depth p50 (p25–p75)');
      for (let h = 0.5; h < 2.5; h += 0.05) {
        const bin = waves.filter((w) => w.ref! >= h && w.ref! < h + 0.05);
        if (bin.length < 4) continue;
        const fresh = bin.filter((w) => w.fresh !== null).map((w) => w.fresh!).sort((a, b) => a - b);
        const q = (k: number) => (fresh.length ? fresh[Math.min(fresh.length - 1, Math.floor(k * fresh.length))].toFixed(2) : '—');
        const broke = bin.filter((w) => w.broke !== null).map((w) => w.broke!).sort((a, b) => a - b);
        const b = (k: number) => (broke.length ? broke[Math.min(broke.length - 1, Math.floor(k * broke.length))].toFixed(2) : '—');
        lines.push(`  ${h.toFixed(2)}–${(h + 0.05).toFixed(2)}: ${bin.length}, ${((100 * fresh.length) / bin.length).toFixed(0)} %, ${q(0.5)} (${q(0.25)}–${q(0.75)}), s ${median(bin.map((w) => poolStraightFrame(w.x, w.z0).s)).toFixed(0)}; ${((100 * broke.length) / bin.length).toFixed(0)} %, ${b(0.5)} (${b(0.25)}–${b(0.75)})`);
      }
      appendFileSync(log, lines.join('\n') + '\n');
      return;
    }

    const loft = new SweptLoft(library, BARREL_SLOPE.pool!, { holdClearDrawing: true });
    const grid = simulation.renderGrid(1);
    const surface = new Float32Array(grid.nx * grid.nz * 2);
    const records = new Float32Array(FRONT_CAPACITY * FRONT_STRIDE);
    const broken = new BrokenCrests();
    const profile = new Float64Array(2 * PROFILE_POINTS);
    const frontMs: number[] = [];
    const loftMs: number[] = [];
    const drawnH: number[] = [];
    const gaps: number[] = [];
    const gapsByWave = new Map<number, number[]>();
    const heightsByWave = new Map<number, number[]>();
    const openRuns: number[] = [];
    const waveOpen = new Map<number, { length: number; inH: number; s: number }>();
    const fronts = new Set<number>();
    const tauSpan = new Map<number, number>();
    let frames = 0;
    let overlaps = 0;
    let overlapsOpen = 0;
    let clamped = 0;
    let budget = 0;
    let builds = 0;
    let preSlices = 0;
    let preFoamy = 0;
    const foamyAt: number[] = [];
    const foamyTau: number[] = [];
    let points = 0;
    const joinsAt: number[] = [];
    let joins0 = 0;
    let unbroken0 = 0;
    let late0 = 0;
    const touchdownS: number[] = [];
    for (let n = 1; n <= steps; n += 1) {
      simulation.step(step);
      if (solver.time < settle) {
        joins0 = front.joins;
        unbroken0 = front.unbroken;
        late0 = front.latePasses;
        continue;
      }
      frames += 1;
      frontMs.push(simulation.stepCosts.front);
      points += front.points.length;
      for (const p of front.points) {
        fronts.add(Math.floor(p.front / 1));
        if (p.tau < 0.04 && p.tau >= 0) joinsAt.push(poolStraightFrame(p.x, p.z).s);
      }
      if (n % 3 !== 0) continue;
      const count = simulation.writeTubeRecords(records);
      if (count === 0) continue;
      grid.xMin = simulation.windowXMin;
      simulation.writeUniformSurface(surface, grid, false);
      const started = performance.now();
      const result = loft.build(records, count, 0, (x, z) => sampleSurfaceHeight(surface, grid, x, z));
      loftMs.push(performance.now() - started);
      builds += 1;
      overlaps += result.overlaps;
      overlapsOpen += result.overlapsOpen;
      clamped += result.clamps;
      if (result.refineLevels < LOFT.levels) budget += 1;
      broken.update(result, (x, z) => sampleSurfaceFoam(surface, grid, x, z));
      const heights = loft['sliceHeight'] as Float64Array;
      let first = -1;
      for (let s = 0; s <= result.sliceCount; s += 1) {
        if (s < result.sliceCount) {
          if (result.sliceAfter[s] <= 0 && result.sliceWeight[s] >= STANDING) {
            preSlices += 1;
            if (broken.outer[s] > 0.01 || broken.face[s] > 0.01) {
              preFoamy += 1;
              const o = 3 * (s * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.crest);
              foamyAt.push(poolStraightFrame(result.positions[o], result.positions[o + 2]).s);
              foamyTau.push(result.sliceTau[s]);
            }
          }
          if (result.slicePhase[s] === 2 && result.sliceAfter[s] < 0.04) {
            const o = 3 * (s * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.crest);
            touchdownS.push(poolStraightFrame(result.positions[o], result.positions[o + 2]).s);
          }
        }
        const open = s < result.sliceCount && result.slicePhase[s] === 1 && result.sliceWeight[s] >= STANDING;
        if (open) {
          const wave = result.sliceFront[s] % FRONT_PIECE;
          drawnH.push(heights[s]);
          (heightsByWave.get(wave) ?? heightsByWave.set(wave, []).get(wave)!).push(heights[s]);
          // The drawn profile in its slice's plane: along its ray from the crest, and up.
          const start = s * LOFT_SAMPLES + LOFT.extensionSamples;
          const c = 3 * (start + LANDMARK.crest);
          for (let j = 0; j < PROFILE_POINTS; j += 1) {
            const o = 3 * (start + j);
            profile[2 * j] = (result.positions[o] - result.positions[c]) * result.sliceRayX[s] + (result.positions[o + 2] - result.positions[c + 2]) * result.sliceRayZ[s];
            profile[2 * j + 1] = result.positions[o + 1] - result.positions[c + 1];
          }
          const gap = verticalGap(profile);
          gaps.push(gap);
          (gapsByWave.get(wave) ?? gapsByWave.set(wave, []).get(wave)!).push(gap);
          tauSpan.set(wave, Math.max(tauSpan.get(wave) ?? 0, result.sliceTau[s]));
        }
        const continues = first >= 0 && s < result.sliceCount && result.sliceFront[s] === result.sliceFront[first] && result.sliceJoined[s - 1] === 1;
        if (first >= 0 && (!open || !continues)) {
          const length = result.sliceSigma[s - 1] - result.sliceSigma[first];
          const runHeights = Array.from(heights.subarray(first, s)).sort((a, b) => a - b);
          const inH = length / Math.max(1e-6, runHeights[runHeights.length >> 1]);
          openRuns.push(length);
          const wave = result.sliceFront[first] % FRONT_PIECE;
          const o = 3 * (first * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.crest);
          const best = waveOpen.get(wave);
          if (!best || length > best.length) waveOpen.set(wave, { length, inH, s: poolStraightFrame(result.positions[o], result.positions[o + 2]).s });
          first = -1;
        }
        if (open && first < 0) first = s;
      }
    }
    const joins = front.joins - joins0;
    const unbroken = front.unbroken - unbroken0;
    const waves = [...waveOpen.values()];
    const meter = simulation.surf;
    const lines = [
      `pool straight, H ${height} m at the feed (Hs ${regularSignificantHeight(height).toFixed(3)}), ${periods} periods after ${settle} s, ${((Date.now() - t0) / 1000).toFixed(0)} s wall; footDepth ${BARREL_SPOTS.pool!.footDepth}; crash ${process.env.CRASH === 'off' ? 'off' : 'on'}; join rows ${JSON.stringify(POOL_JOIN)}`,
      `the meter: ${JSON.stringify(meter.reading(solver.time, periods * POOL.period))}`.slice(0, 300),
      `front: joins ${joins} (late, past the throw depth: ${front.latePasses - late0}), unbroken ${unbroken} (${((100 * unbroken) / Math.max(1, joins + unbroken)).toFixed(1)} %; the bar about 20 %), lost ${front.lost}, unsized ${front.unsized}, splits ${front.splits}; points a frame ${(points / Math.max(1, frames)).toFixed(1)}; front ids seen ${fronts.size}`,
      `joins by s: ${quantiles(joinsAt, 0)}; touchdowns by s ${quantiles(touchdownS, 0)}`,
      `drawn H, open standing slices ${quantiles(drawnH)} m; per wave medians ${quantiles([...heightsByWave.values()].map(median))} m (the meter's face: 1.52 m at 1.5 m, 1.79 m at 1.8 m)`,
      `vertical air gap, open standing slices ${quantiles(gaps)} m; per wave p90 ${quantiles([...gapsByWave.values()].map((g) => [...g].sort((a, b) => a - b)[Math.floor(0.9 * g.length)]))} m`,
      `open runs ${quantiles(openRuns)} m; per wave longest ${quantiles(waves.map((w) => w.length))} m, in H ${quantiles(waves.map((w) => w.inH))}, where (s) ${quantiles(waves.map((w) => w.s), 0)}; ${waves.length} waves`,
      `lofts ${builds}: folds (overlaps) a build ${(overlaps / Math.max(1, builds)).toFixed(3)}, holes (open overlaps) ${(overlapsOpen / Math.max(1, builds)).toFixed(3)}, clamps ${clamped}, budget-clamped refinement ${((100 * budget) / Math.max(1, builds)).toFixed(1)} %`,
      `lip foam before touchdown: ${preSlices} standing slices, carrying foam ${preFoamy} (${((100 * preFoamy) / Math.max(1, preSlices)).toFixed(1)} %; the bar ≤ 5 %), at s ${quantiles(foamyAt, 0)}, τ ${quantiles(foamyTau)} s`,
      `CPU ms (Node, this M1): the front a step ${quantiles(frontMs)}; the loft a build ${quantiles(loftMs)}`,
    ];
    appendFileSync(log, lines.join('\n') + '\n');
  }, 7_200_000);
});
