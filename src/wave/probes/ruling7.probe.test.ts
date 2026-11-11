import { appendFileSync, writeFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { describe, it } from 'vitest';
import { PhysicalSurfWater } from '../../physics/PhysicalSurfWater';
import { RideSession, type RideInput } from '../../physics/RideSession';
import { createWaterSample, type SurfWater } from '../../physics/SurfWater';
import { libraryFromBytes, POOL_TUBE_STAND_IN } from '../barrel/barrelLibrary';
import { BARREL_CASES } from '../barrel/barrelLibraryIndex';
import { FRONT_CAPACITY, FRONT_STRIDE } from '../barrel/frontRecords';
import { readBarrelCases } from '../barrel/nodeBarrelCases';
import { SweptContact, createContactHit } from '../barrel/sweptContact';
import { FORMATION } from '../barrel/sliceClock';
import { BARREL_SLOPE } from '../barrel/sweptLoft';
import { parseSeamBand, parseSeamTau, seamBand, seamHeightWeight } from '../barrel/tubeSeam';
import { POOL, poolStraightAt, poolStraightFrame, regularSignificantHeight } from '../pool';
import { rideLineupAlong, rideLineupOffset, SurfZoneSimulation, type SurfZoneConfig } from '../SurfZoneSimulation';

/**
 * Prone riders through the forming tube at the Wave Pool's straight Barrel: the probe for ruling 7 (the water-physics
 * advisor's docs/research/surface-rise-2026-11-11/ruling-7/README.md; step 1's notes in
 * docs/research/crest-line-2026-11-11/README.md), grown from the probes of rulings 4 to 6 (the C1 formation clock, the
 * seam blend, the streamline wall water), whose readings it keeps. Opt-in (PROBE=1); a probe only.
 *
 * The sea, the contact and the water are the game's (`SurfZoneRunner`: the contact's loft with the config's `TubeFace`,
 * the water's union), headless on the CPU. No runner, no autopilot: `RideSession` riders with scripted inputs only, their
 * reactions on the water not applied, so every rider and both builds meet the same sea.
 *
 * The wave's phase is read once: `T0`, when the first front point within 2 m of the take-off's column throws (its clock
 * crossing 0) after the settle. Each of WAVES waves, `LEAD` s before the take-off's next throw, the riders are placed lying
 * at rest, nose shoreward (+z), as the game's start does (`RideSession.reset`), and followed for a period less 0.5 s:
 * - **passive prone** (no input), 8 a wave: at reef columns s 40, 55 and 70 m on the break line (the reef's line through
 *   the take-off) and seaward of it along −z: s 40 at 3 and 12 m, s 55 at 0, 6, 12 and 18 m, s 70 at 3 and 12 m;
 * - **scripted rides**, 6 a wave: paddling straight from the game's start (`rideLineupOffset` out) and from 15 and 12 m
 *   out; the pop-up pressed at the rider's own cue (`popUpCue`) or after 0.2 s above 3.5 m/s shoreward; then no paddle and
 *   the steer held at 0 or −0.5. A failed pop-up: the pop-up taken and the rider off the board before it has stood (after
 *   it, with no balance input, every build's stander falls: the owner's to judge, counted apart).
 *
 * Measured every 60 Hz step after the settle:
 * - the clock, every front point: its step over dt (its rate); before its throw, the share of steps on a rate bound
 *   (0.5 or 1.5 × real time); the rate's change a step, |Δτ̇|, before the throw and over every step (the throw's included);
 *   the wall water's rate (`FrontPoint.tauRate`) the same way, and against the step the clock then took;
 * - formation bar 7: each point's first clock against its case's earliest frame τ_e; the contour throw: the crest's own
 *   distance to its throw contour along its column as its clock crosses 0 (its crest read within its cell, by this probe),
 *   and whether the solver had broken it;
 * - the felt water: the water's velocity at each attached rider's board (5 cm under the surface there), its change a
 *   step, over every step and over the steps in the case's water (its surface over the solver's by more than 2 cm);
 * - the surf meter over the measured time;
 * - ruling 5's readings (advisor-ruling-5.md, docs/research/tube-seam-2026-11-11): each rider's slice clock τ (the
 *   nearest front point along the crest within 8 m along the ray), the case's height over the solver's surface under the
 *   board (hc), and the answering source (the case's wall water, `WaterSample.wallWater`, or the solver's): the felt
 *   water's jumps over 0.2 m/s as a share of steps, the felt water for τ < −0.5 s, the source's switches where hc ≤ 0.02 m
 *   (and those with a jump), and each fall's τ (before the throw or after it);
 * - the seam (ruling 4's scan): every 0.1 s, along the ray through the front points at reef columns s 45 and s 60, the
 *   surface every 0.05 m from 8 m behind the point to 6 m ahead; at each place the case's surface leaves the solver's
 *   (hc crossing 1 mm): the height step across that 0.05 m, the slope's turn from the 0.05 m before it to the 0.05 m
 *   after it less the solver's own turn there, and the felt water's change across 0.25 m centred on it.
 *
 * - ruling 7's readings, at each attached rider's place in the case for τ −1 to 0.5 s (`<log>.rise.tsv`): the surface's
 *   own rise R a step at a point carried with the wave (c along the slice's ray), split into the sea's part, the τ
 *   share's (Atau), the height share's (Ah), the case's shape at the anchor and the anchor's slip, with the residual;
 *   bar A: the steps on which the share at that carried point falls by over 0.005; bar B: the clock rate the share's τ
 *   part stands for (the smoothstep's inverse) against the front point's own step. The carried point crosses the
 *   slices' columns at c·rx, so its clock runs slower than a column's by geometry (the crest-line notes' reading).
 *   `<log>.riders.tsv` has each rider's forces and depth a step; `<log>.fronts.tsv` every front point near its throw.
 *
 * The report's `cost` line: the wall time of a step's parts on this machine's CPU (the sea's step with its front, the
 * contact's loft, one rider's step). Only for comparing builds run alone on an idle machine.
 *
 * DUMPX with DUMPT0, DUMPT1, DUMPZ0, DUMPZ1 (optional): the sea's surface over rest in the column at x = DUMPX from row
 * z = DUMPZ0 to DUMPZ1 every step between the two times, to `<log>.dump.txt` (how the crest-line notes traced the
 * crest's leap on a flat crest).
 *
 * H (1.05: "1.5 m" | 1.32: "1.8 m"), CASE (pool | a38), SWITCHES (comma-separated config switches, as
 * `poolTubeFace.probe.test.ts`: `formClock=old`, `formClock=c1`, `tubeForm=old`, `tubeFace=old,tubeFrom=piece`, `tubeSeam=blend,seamTau=-0.75,0,seamBand=0.25`, …), WAVES
 * (4), SETTLE (50 s), LEAD (6 s), T0 (s: the take-off's first throw, for a build whose clocks never cross 0, the
 * pre-tube's; read it from the default's run), LOG.
 */
describe.runIf(process.env.PROBE)('ruling 7: the surface\'s own rise by its parts, and the hand-over\'s share at a point carried with the wave', () => {
  it('measures the formation clock, the felt water and the scripted riders', () => {
    const height = Number(process.env.H ?? 1.05);
    const caseName = process.env.CASE === 'a38' ? 'a38' : 'pool';
    const waves = Number(process.env.WAVES ?? 4);
    const settle = Number(process.env.SETTLE ?? 50);
    const lead = Number(process.env.LEAD ?? 6);
    const switches: Record<string, unknown> = {};
    // A comma before a name starts the next switch; one before a number stays in its value (`seamTau=-0.5,0`).
    for (const item of (process.env.SWITCHES ?? '').split(/,(?=[A-Za-z])/).filter(Boolean)) {
      const [key, value] = item.split('=');
      switches[key] = key === 'seamTau' ? parseSeamTau(value) : key === 'seamBand' ? parseSeamBand(value) : value === '0' ? 0 : value;
    }
    const log = process.env.LOG ?? `prone-seam-${caseName}-${height}.txt`;
    writeFileSync(log, '');
    const t0 = Date.now();
    const bytes = caseName === 'a38' ? readBarrelCases(undefined, BARREL_CASES.filter((entry) => POOL_TUBE_STAND_IN.includes(entry.id))) : readBarrelCases('pool', undefined, 'pool');
    const library = libraryFromBytes(bytes, 'basilisk', 'pool');
    const config = {
      spot: 'pool', seed: 1, significantHeight: regularSignificantHeight(height), peakPeriod: POOL.period, directionDegrees: 0, spreading: 1000,
      tide: 0, windSpeed: 0, stage: 2, compute: 'cpu', poolWaves: 'barrel', poolTubeCase: caseName, ...switches,
    } as unknown as SurfZoneConfig;
    const simulation = new SurfZoneSimulation(config, 'spun-up', library);
    const { solver } = simulation;
    const face = simulation.tubeFace;
    const slope = BARREL_SLOPE.pool!;
    const contact = new SweptContact(library, slope, face ? { face } : {});
    const water = PhysicalSurfWater.forSimulation(simulation, contact, 1);
    const records = new Float32Array(FRONT_CAPACITY * FRONT_STRIDE);
    const quiet: SurfWater = {
      sampleAt: (x, y, z, out) => water.sampleAt(x, y, z, out),
      surfaceAt: (x, z) => water.surfaceAt(x, z),
      addReaction: () => {},
      setSampleTime: (offset) => water.setSampleTime(offset),
    };
    const dt = 1 / 60;
    const period = POOL.period;
    const focus = simulation.breakPoint();
    const focusS = poolStraightFrame(focus.x, focus.z).s;
    const lineAt = (s: number) => {
      const a = poolStraightAt(s);
      const b = poolStraightAt(focusS);
      return { x: focus.x + a.x - b.x, z: focus.z + a.z - b.z };
    };
    const throwDistance = (simulation as unknown as { throwDistance: (x: number, z: number, dx: number, dz: number, depth: number) => number }).throwDistance;
    /** A crest's place within its cell (the parabola through its cell and its neighbours along the column), m from `z`. */
    const subOf = (x: number, z: number) => {
      const column = Math.min(solver.nx - 1, Math.max(0, Math.round((x - solver.xCenters[0]) / solver.dx)));
      let row = solver.rowBelow(z);
      if (row + 1 < solver.nz && Math.abs(solver.zCenters[row + 1] - z) < Math.abs(solver.zCenters[row] - z)) row += 1;
      if (row < 1 || row >= solver.nz - 1) return 0;
      const at = (r: number) => solver.h[r * solver.nx + column] + solver.bed[r * solver.nx + column];
      const curve = at(row - 1) - 2 * at(row) + at(row + 1);
      if (!(curve < 0)) return 0;
      return Math.min(0.5, Math.max(-0.5, (0.5 * (at(row - 1) - at(row + 1))) / curve)) * 0.5 * (solver.zCenters[row + 1] - solver.zCenters[row - 1]);
    };

    interface Rider {
      kind: 'passive' | 'ride';
      label: string;
      wave: number;
      session: RideSession;
      steer: number;
      active: boolean;
      placed: number;
      fast: number;
      pressed: number | null;
      taken: number | null;
      stood: number | null;
      fell: { at: number; cause: string; phase: string; n: number; inCase: boolean; tau: number } | null;
      flow: [number, number, number] | null;
      source: boolean | null;
      farthest: number;
      /** Where the board was a step ago, and the surface's height there then (the surface's rise, below). */
      eta: [number, number, number, number, number] | null;
      vel: [number, number, number] | null;
    }
    const riders: Rider[] = [];
    const sample = createWaterSample();
    const felt = { all: [] as number[], inCase: [] as number[], early: [] as number[] };
    // Ruling 5's readings.
    const seam5 = { steps: 0, jumps: 0, jumpsLow: 0, switches: 0, switchJumps: 0, switchSizes: [] as number[], wallSteps: 0 };
    const footHeights: number[] = [];
    // The surface's rise against the water's (the kinematic condition at a free surface: a water particle on the surface
    // stays on it, so ∂η/∂t + u ∂η/∂x + w ∂η/∂z = v). Read at the point the board was at a step ago: the surface's rise
    // there over the step, its slope now (0.1 m each way), and the felt water 0.05 m under it. The miss is how fast
    // the surface moves through the water the board is told about. By the slice clock, in the case's water and out of it
    // (out of it: the solver's sea, the control).
    const riseBins = [-Infinity, -1, -0.5, 0, 0.5, Infinity];
    const riseLabels = ['τ under −1 s', 'τ −1 to −0.5 s', 'τ −0.5 to 0 s', 'τ 0 to 0.5 s', 'τ 0.5 s on', 'no slice by it'];
    const riseOf = () => riseLabels.map(() => ({ rise: [] as number[], need: [] as number[], up: [] as number[], miss: [] as number[], own: [] as number[], ownSea: [] as number[], slip: [] as number[] }));
    const rise = { inCase: riseOf(), sea: riseOf() };
    const riseSample = createWaterSample();
    const r7hit = createContactHit();
    const alphaAt = (x: number, z: number, y: number) => {
      if (!contact.query(x, y - 0.02, z, r7hit)) return Number.NaN;
      return r7hit.inWater && r7hit.seam !== undefined ? r7hit.seam : Number.NaN;
    };
    const frontRows: string[] = ['# t\tk\tx\tz\tfront\tsigma\ttau\ttauRate\tfoot'];
    const r7rows: string[] = ['# t\trider\tinCase\ttau\ttauStep\ttauRate\tc\tva\tlast\thc0\ta0\td0\ta1\td1\tR\tRsea\tAtau\tAh\tshape\tslip\tresid\tslope\tunder\tfoot\trx\trz\tx\tz'];
    const r7 = { R: [] as number[], sea: [] as number[], Atau: [] as number[], Ah: [] as number[], shape: [] as number[], slip: [] as number[], resid: [] as number[], tauStep: [] as number[], va: [] as number[], slope: [] as number[], last: new Map<string, number>() };
    const r7late = { R: [] as number[], sea: [] as number[], Atau: [] as number[], Ah: [] as number[], shape: [] as number[], slip: [] as number[], resid: [] as number[], tauStep: [] as number[], va: [] as number[], slope: [] as number[], last: new Map<string, number>() };
    /** Ruling 7's bars A and B, in the case for τ −1 to 0 s: the share at a point carried with the wave, a step apart. */
    const carried = { steps: 0, drops: 0, implied: [] as number[], own: [] as number[], off: 0 };
    /** The clock a τ share stands for (the smoothstep's inverse over the seam's τ course), s; NaN at its ends. */
    const clockOf = (share: number) => {
      const [on, full] = face?.seam?.tau ?? [-0.5, 0];
      return share > 0.001 && share < 0.999 ? on + (full - on) * (0.5 - Math.sin(Math.asin(1 - 2 * share) / 3)) : Number.NaN;
    };
    const riderRows: string[] = ['# t\trider\ttau\tinCase\timm\tvy\tacc\tlimit\tflight\tposture\tpressY\tbuoyY\taddY\tradY\tsubVol\tflowUp\triseFixed\tpressN\taddN\tny'];
    /** The front point `tauAt` reads, itself (its wave speed and ray). */
    const pointAt = (x: number, z: number) => {
      let best: NonNullable<typeof simulation.front>['points'][number] | null = null;
      let nearest = 2;
      for (const p of simulation.front?.points ?? []) {
        if (Math.abs(p.z - z) > 8) continue;
        const d = Math.abs(p.x - x);
        if (d < nearest) { nearest = d; best = p; }
      }
      return best;
    };
    const readRise = (x: number, z: number, before: number, beforeSea: number, alphaBefore: number, who: string) => {
      const now = water.surfaceAt(x, z);
      const got = water.sampleAt(x, now - 0.05, z, riseSample);
      if (!got.wet || got.outsideDomain) return;
      const e = 0.1;
      const slopeX = (water.surfaceAt(x + e, z) - water.surfaceAt(x - e, z)) / (2 * e);
      const slopeZ = (water.surfaceAt(x, z + e) - water.surfaceAt(x, z - e)) / (2 * e);
      const rate = (now - before) / dt;
      const need = rate + got.flowX * slopeX + got.flowZ * slopeZ;
      const tau = tauAt(x, z);
      let bin = riseLabels.length - 1;
      if (tau === tau) {
        bin = 0;
        while (bin + 1 < riseBins.length - 1 && tau >= riseBins[bin + 1]) bin += 1;
      }
      const into = (now - water.plainSurfaceAt(x, z) > 0.02 ? rise.inCase : rise.sea)[bin];
      into.rise.push(rate);
      into.need.push(need);
      into.up.push(got.flowY);
      into.miss.push(Math.abs(need - got.flowY));
      // The same, split in the frame that travels with the wave (the nearest front point's wave speed c along its ray):
      // the surface's own rise there (0 on a wave of steady shape), the solver's sea's, and how far the felt water is
      // from running along the surface in that frame ((u − c)·∇η − v; 0 on a streamline). The miss is their sum.
      const point = pointAt(x, z);
      if (!point || point.wallSpeed === undefined || point.anchorRayX === undefined || point.anchorRayZ === undefined) return;
      const cx = point.wallSpeed * point.anchorRayX;
      const cz = point.wallSpeed * point.anchorRayZ;
      into.own.push((water.surfaceAt(x + cx * dt, z + cz * dt) - before) / dt);
      into.ownSea.push((water.plainSurfaceAt(x + cx * dt, z + cz * dt) - beforeSea) / dt);
      into.slip.push((got.flowX - cx) * slopeX + (got.flowZ - cz) * slopeZ - got.flowY);
      // RULING 7: the own rise by its parts.
      {
        const c = point.wallSpeed;
        const rx = point.anchorRayX;
        const rz = point.anchorRayZ;
        const va = point.anchorRate ?? c;
        const x1 = x + cx * dt;
        const z1 = z + cz * dt;
        const xa = x + va * rx * dt;
        const za = z + va * rz * dt;
        const y1 = water.surfaceAt(x1, z1);
        const s1 = water.plainSurfaceAt(x1, z1);
        const a1 = alphaAt(x1, z1, y1);
        const ya = water.surfaceAt(xa, za);
        const sa = water.plainSurfaceAt(xa, za);
        const aa = alphaAt(xa, za, ya);
        const a0 = alphaBefore;
        const inC = now - water.plainSurfaceAt(x, z) > 0.02;
        const R = (y1 - before) / dt;
        const Rsea = (s1 - beforeSea) / dt;
        const ok = a0 > 0.02 && a1 > 0.02 && aa > 0.02;
        const d0 = ok ? (before - beforeSea) / a0 : Number.NaN;
        const d1 = ok ? (y1 - s1) / a1 : Number.NaN;
        const da = ok ? (ya - sa) / aa : Number.NaN;
        const band = seamBand(face?.seam?.band ?? 0.25, point.footHeight);
        const h0 = seamHeightWeight(d0, band);
        const h1 = seamHeightWeight(d1, band);
        const t0a = a0 / h0;
        const t1a = a1 / h1;
        const dm = (d0 + d1) / 2;
        const Atau = ((t1a - t0a) * ((h0 + h1) / 2) * dm) / dt;
        const Ah = (((t0a + t1a) / 2) * (h1 - h0) * dm) / dt;
        const am = (a0 + a1) / 2;
        const caseWave = (s1 + d1 - (beforeSea + d0)) / dt;
        const caseAnchor = (sa + da - (beforeSea + d0)) / dt;
        const shape = am * caseAnchor;
        const slip = am * (caseWave - caseAnchor);
        const seaPart = (1 - am) * Rsea;
        const resid = R - (seaPart + Atau + Ah + shape + slip);
        const slope = (water.surfaceAt(x + rx * e, z + rz * e) - water.surfaceAt(x - rx * e, z - rz * e)) / (2 * e);
        const step = lastRate.get(point.id) ?? Number.NaN;
        const f3 = (v: number) => (v === v ? v.toFixed(3) : 'nan');
        if (inC || (tau > -0.6 && tau < 0.3)) r7rows.push([solver.time.toFixed(3), who, inC ? 1 : 0, f3(tau), f3(step), f3(point.tauRate ?? Number.NaN), f3(c), f3(va), point.anchorLast ?? '?', f3(before - beforeSea), f3(a0), f3(d0), f3(a1), f3(d1), f3(R), f3(seaPart), f3(Atau), f3(Ah), f3(shape), f3(slip), f3(resid), f3(slope), f3((r7hit.wallTop ?? Number.NaN) - now), f3(point.footHeight), f3(rx), f3(rz), f3(x), f3(z)].join('\t'));
        if (inC && tau === tau && tau >= -1 && tau < 0.5) {
          const set = tau < 0 ? r7 : r7late;
          if (tau < 0 && ok) {
            carried.steps += 1;
            if (a0 - a1 > 0.005) carried.drops += 1;
            const rate = (clockOf(t1a) - clockOf(t0a)) / dt;
            if (rate === rate && step === step) {
              carried.implied.push(rate);
              carried.own.push(step);
              if (Math.abs(rate - step) > 0.2 * Math.abs(step)) carried.off += 1;
            }
          }
          set.va.push(va - c);
          set.tauStep.push(step);
          set.slope.push(slope);
          set.last.set(point.anchorLast ?? '?', (set.last.get(point.anchorLast ?? '?') ?? 0) + 1);
          set.R.push(R);
          set.sea.push(ok ? seaPart : Number.NaN);
          set.Atau.push(Atau);
          set.Ah.push(Ah);
          set.shape.push(shape);
          set.slip.push(slip);
          set.resid.push(resid);
        }
      }
    };
    /** The slice clock at (x, z): the nearest front point along the crest (x) within 8 m along the ray (z); NaN: none. */
    const tauAt = (x: number, z: number) => {
      let best = Number.NaN;
      let nearest = 2;
      for (const p of simulation.front?.points ?? []) {
        if (Math.abs(p.z - z) > 8) continue;
        const d = Math.abs(p.x - x);
        if (d < nearest) { nearest = d; best = p.tau; }
      }
      return best;
    };
    const seamBins = [-Infinity, -1, -0.5, 0, 0.5, Infinity];
    const seamScan = seamBins.slice(0, -1).map(() => ({ step: [] as number[], turn: [] as number[], flow: [] as number[] }));
    const SCAN = { step: 0.05, behind: 8, ahead: 6, edge: 0.001, across: 0.25 } as const;
    const scanN = Math.round((SCAN.behind + SCAN.ahead) / SCAN.step) + 1;
    const scanY = new Float64Array(scanN);
    const scanPlain = new Float64Array(scanN);
    const scanSample = createWaterSample();
    const flowAt = (x: number, z: number): [number, number, number] | null => {
      const y = water.surfaceAt(x, z);
      const got = water.sampleAt(x, y - 0.05, z, scanSample);
      return got.wet && !got.outsideDomain ? [got.flowX, got.flowY, got.flowZ] : null;
    };
    const scanSeam = (x: number, z: number, tau: number) => {
      let bin = 0;
      while (bin + 1 < seamBins.length - 1 && tau >= seamBins[bin + 1]) bin += 1;
      for (let i = 0; i < scanN; i += 1) {
        const at = z - SCAN.behind + i * SCAN.step;
        scanY[i] = water.surfaceAt(x, at);
        scanPlain[i] = water.plainSurfaceAt(x, at);
      }
      for (let i = 2; i + 1 < scanN; i += 1) {
        const before = scanY[i - 1] - scanPlain[i - 1];
        const after = scanY[i] - scanPlain[i];
        if ((before > SCAN.edge) === (after > SCAN.edge)) continue;
        seamScan[bin].step.push(Math.abs(after - before));
        const angle = (a: number, b: number) => (Math.atan((b - a) / SCAN.step) * 180) / Math.PI;
        const turn = angle(scanY[i], scanY[i + 1]) - angle(scanY[i - 2], scanY[i - 1]);
        const own = angle(scanPlain[i], scanPlain[i + 1]) - angle(scanPlain[i - 2], scanPlain[i - 1]);
        seamScan[bin].turn.push(Math.abs(turn - own));
        const at = z - SCAN.behind + (i - 0.5) * SCAN.step;
        const a = flowAt(x, at - SCAN.across / 2);
        const b = flowAt(x, at + SCAN.across / 2);
        if (a && b) seamScan[bin].flow.push(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
      }
    };
    const scanColumns = [45, 60].map((s) => lineAt(s).x);
    const place = (wave: number) => {
      const add = (kind: Rider['kind'], label: string, x: number, z: number, steer: number) => {
        const session = new RideSession();
        session.reset(new Vector3(x, 0, z), 0, quiet);
        riders.push({ kind, label, wave, session, steer, active: true, placed: solver.time, fast: 0, pressed: null, taken: null, stood: null, fell: null, flow: null, source: null, farthest: z, eta: null, vel: null });
      };
      for (const [s, outs] of [[40, [3, 12]], [55, [0, 6, 12, 18]], [70, [3, 12]]] as const) {
        const at = lineAt(s);
        for (const out of outs) add('passive', `s ${s} ${out} m out`, at.x, at.z - out, 0);
      }
      const startX = focus.x + rideLineupAlong(config);
      for (const out of [rideLineupOffset(config), 15, 12]) {
        for (const steer of [0, -0.5]) add('ride', `${out.toFixed(1)} m out steer ${steer}`, startX, focus.z - out, steer);
      }
    };

    // The clock's readings.
    const lastTau = new Map<number, number>();
    const lastRate = new Map<number, number>();
    const lastWater = new Map<number, number>();
    const preRates: number[] = [];
    let onLow = 0;
    let onHigh = 0;
    const bins = [-Infinity, -1.5, -1, -0.5, -0.25, 0];
    const binSteps = bins.map(() => 0);
    const binBound = bins.map(() => 0);
    const dRatePre: number[] = [];
    const dRateAll: number[] = [];
    const dWater: number[] = [];
    const waterAgainst: number[] = [];
    const firstOffset: number[] = [];
    const throwD: number[] = [];
    let throwUnbroken = 0;
    const throwN = new Map<number, number[]>();
    let T0 = Number.NaN;
    let placedWaves = 0;
    let measuredFrom = Number.NaN;
    const input: RideInput = { paddle: false, popUp: false, steer: 0, trim: 0, crouch: 0 };

    while (solver.time < settle) simulation.step(1 / 30);
    measuredFrom = solver.time;
    /** Wall time of each part of a measured step, ms. */
    const cost = { sea: [] as number[], contact: [] as number[], rider: [] as number[], riderInCase: [] as number[], riderStanding: [] as number[] };
    const fallback = Number(process.env.T0 ?? Number.NaN);
    const most = Math.ceil(((waves + 3) * period) / dt);
    let guard = 0;
    while (guard++ < most) {
      const c0 = performance.now();
      simulation.step(dt);
      const c1 = performance.now();
      const count = simulation.writeTubeRecords(records);
      cost.sea.push(c1 - c0);
      if (process.env.DUMPX && solver.time > Number(process.env.DUMPT0) && solver.time < Number(process.env.DUMPT1)) {
        const dx0 = Number(process.env.DUMPX);
        const col = Math.round((dx0 - solver.xCenters[0]) / solver.dx);
        const r0 = solver.rowBelow(Number(process.env.DUMPZ0));
        const r1 = solver.rowBelow(Number(process.env.DUMPZ1));
        const cells: string[] = [];
        for (let r = r0; r <= r1; r += 1) cells.push(`${solver.zCenters[r].toFixed(2)}:${(solver.h[r * solver.nx + col] + solver.bed[r * solver.nx + col] - solver.restLevel).toFixed(3)}`);
        appendFileSync(log.replace(/\.txt$/, '') + '.dump.txt', `${solver.time.toFixed(3)} ${cells.join(' ')}\n`);
      }
      const c2 = performance.now();
      water.withSurfaceNodeCache(() => contact.update(records, count, solver.restLevel, (x, z) => water.plainSurfaceAt(x, z)));
      cost.contact.push(performance.now() - c2);
      for (let k = 0; k < count; k += 1) {
        const o = k * FRONT_STRIDE;
        if (records[o + 4] > -1.2 && records[o + 4] < 0.3) frontRows.push([solver.time.toFixed(3), k, records[o].toFixed(2), records[o + 1].toFixed(2), records[o + 2], records[o + 3].toFixed(2), records[o + 4].toFixed(3), records[o + 12].toFixed(3), records[o + 5].toFixed(3)].join('\t'));
      }
      for (const p of simulation.front?.points ?? []) {
        const previous = lastTau.get(p.id);
        if (previous === undefined) {
          const times = library.profileTimes({ slope, footHeight: p.footHeight, footDepth: p.footDepth });
          firstOffset.push(p.tau - times.startSeconds);
        } else {
          const rate = (p.tau - previous) / dt;
          const before = lastRate.get(p.id);
          const pre = previous < 0 && p.tau < 0;
          if (pre) {
            preRates.push(rate);
            let bin = 0;
            while (bin + 1 < bins.length - 1 && p.tau >= bins[bin + 1]) bin += 1;
            binSteps[bin] += 1;
            if (Math.abs(rate - FORMATION.rate[0]) < 1e-6 || Math.abs(rate - FORMATION.rate[1]) < 1e-6) binBound[bin] += 1;
            if (Math.abs(rate - FORMATION.rate[0]) < 1e-6) onLow += 1;
            if (Math.abs(rate - FORMATION.rate[1]) < 1e-6) onHigh += 1;
          }
          if (before !== undefined) {
            dRateAll.push(Math.abs(rate - before));
            if (pre) dRatePre.push(Math.abs(rate - before));
          }
          // The wall water's rate as read a step ago, against the step the clock then took.
          const wasWater = lastWater.get(p.id);
          if (wasWater !== undefined) waterAgainst.push(Math.abs(wasWater - rate));
          lastRate.set(p.id, rate);
          if (previous < 0 && p.tau >= 0) {
            const d = throwDistance(p.x, p.z + subOf(p.x, p.z), 0, 1, p.throwDepth);
            if (d === d && d !== Infinity) throwD.push(d);
            if (p.unbroken) throwUnbroken += 1;
            const frame = poolStraightFrame(p.x, p.z);
            const key = Math.round(frame.s / 15) * 15;
            if (!throwN.has(key)) throwN.set(key, []);
            throwN.get(key)!.push(frame.n);
            if (!(T0 === T0) && Math.abs(p.x - focus.x) < 2) T0 = solver.time;
          }
        }
        if (p.tauRate !== undefined) {
          const wasWater = lastWater.get(p.id);
          if (wasWater !== undefined) dWater.push(Math.abs(p.tauRate - wasWater));
          lastWater.set(p.id, p.tauRate);
        }
        lastTau.set(p.id, p.tau);
      }
      // The seam's scan (ruling 4's, ruling 5's bars): every 0.1 s, the front points on the scan's columns.
      if (guard % 6 === 0 && T0 === T0) {
        water.withSurfaceNodeCache(() => {
          for (const x of scanColumns) {
            const seen = new Set<number>();
            for (const p of simulation.front?.points ?? []) {
              if (Math.abs(p.x - x) > 0.51 || seen.has(p.front)) continue;
              seen.add(p.front);
              footHeights.push(p.footHeight);
              scanSeam(x, p.z, p.tau);
            }
          }
        });
      }
      // A build whose points never cross 0 (the pre-tube's): the phase handed in (T0, another build's reading).
      if (!(T0 === T0) && fallback === fallback && solver.time >= fallback) T0 = fallback;
      // The riders: placed `lead` s before the take-off's next throw, each wave.
      if (T0 === T0 && placedWaves < waves && solver.time >= T0 + (placedWaves + 1) * period - lead) {
        for (const r of riders) r.active = false;
        place(placedWaves);
        placedWaves += 1;
      }
      for (const r of riders) {
        if (!r.active) continue;
        const { session } = r;
        const { board, rider } = session;
        const since = solver.time - r.placed;
        if (since > period - 0.5) { r.active = false; continue; }
        input.paddle = false;
        input.popUp = false;
        input.steer = 0;
        if (r.kind === 'ride') {
          if (r.taken === null) {
            input.paddle = true;
            r.fast = board.velocity.z > 3.5 ? r.fast + dt : 0;
            if (r.pressed === null && (rider.popUpCue || r.fast >= 0.2)) r.pressed = since;
            if (r.pressed !== null && session.phase === 'prone') input.popUp = true;
          } else input.steer = r.steer;
        }
        if (r.eta) readRise(r.eta[0], r.eta[1], r.eta[2], r.eta[3], r.eta[4], `${r.kind[0]}${r.wave}:${r.label}`);
        const phaseBefore = session.phase;
        const c3 = performance.now();
        water.withSurfaceNodeCache(() => session.step(dt, quiet, input));
        const riderMs = performance.now() - c3;
        cost.rider.push(riderMs);
        if (session.phase !== 'prone' && session.phase !== 'fallen') cost.riderStanding.push(riderMs);
        if (r.kind === 'ride' && r.taken === null && session.phase !== 'prone' && session.phase !== 'fallen') r.taken = since;
        if (r.stood === null && rider.popUpReport.outcome === 'stood') r.stood = since;
        if (board.position.z > r.farthest) r.farthest = board.position.z;
        const surface = water.surfaceAt(board.position.x, board.position.z);
        const etaBefore = r.eta;
        r.eta = [board.position.x, board.position.z, surface, water.plainSurfaceAt(board.position.x, board.position.z), alphaAt(board.position.x, board.position.z, surface)];
        {
          const tauHere = tauAt(board.position.x, board.position.z);
          const inC = surface - r.eta[3] > 0.02;
          if (inC || (tauHere > -0.8 && tauHere < 0.6)) {
            const rr = rider as unknown as { limit: string; flightTime: number; postureError: number };
            const acc = r.vel ? Math.hypot(board.velocity.x - r.vel[0], board.velocity.y - r.vel[1], board.velocity.z - r.vel[2]) / dt : Number.NaN;
            const fs = water.sampleAt(board.position.x, surface - 0.05, board.position.z, sample);
            const F = board.forces;
            const n = new Vector3(0, 1, 0).applyQuaternion(board.orientation);
            const f2 = (v: number) => (v === v ? v.toFixed(2) : 'nan');
            riderRows.push([solver.time.toFixed(3), `${r.kind[0]}${r.wave}:${r.label}:${session.phase}`, f2(tauHere), inC ? 1 : 0, f2(surface - board.position.y), f2(board.velocity.y), f2(acc), rr.limit, f2(rr.flightTime), f2(rr.postureError), F.pressure.y.toFixed(0), F.buoyancy.y.toFixed(0), F.addedMass.y.toFixed(0), F.radiation.y.toFixed(0), (board.submergedVolume * 1000).toFixed(1), f2(fs.flowY), f2(etaBefore ? (water.surfaceAt(etaBefore[0], etaBefore[1]) - etaBefore[2]) / dt : Number.NaN), F.pressure.dot(n).toFixed(0), F.addedMass.dot(n).toFixed(0), f2(n.y)].join('\t'));
          }
          r.vel = [board.velocity.x, board.velocity.y, board.velocity.z];
        }
        const inCase = surface - water.plainSurfaceAt(board.position.x, board.position.z) > 0.02;
        if (inCase) cost.riderInCase.push(riderMs);
        const tau = tauAt(board.position.x, board.position.z);
        if (!rider.attached) {
          r.fell = { at: since, cause: session.separation ?? '?', phase: phaseBefore, n: poolStraightFrame(board.position.x, board.position.z).n - poolStraightFrame(focus.x, focus.z).n, inCase, tau };
          r.active = false;
          continue;
        }
        const s = water.sampleAt(board.position.x, surface - 0.05, board.position.z, sample);
        if (s.wet && !s.outsideDomain) {
          if (r.flow) {
            const change = Math.hypot(s.flowX - r.flow[0], s.flowY - r.flow[1], s.flowZ - r.flow[2]);
            felt.all.push(change);
            if (inCase) felt.inCase.push(change);
            if (tau < -0.5) felt.early.push(change);
            seam5.steps += 1;
            if (change > 0.2) {
              seam5.jumps += 1;
              if (!inCase) seam5.jumpsLow += 1;
            }
            if (r.source !== null && r.source !== (s.wallWater === true) && !inCase) {
              seam5.switches += 1;
              seam5.switchSizes.push(change);
              if (change > 0.2) seam5.switchJumps += 1;
            }
          }
          if (s.wallWater === true) seam5.wallSteps += 1;
          r.flow = [s.flowX, s.flowY, s.flowZ];
          r.source = s.wallWater === true;
        } else {
          r.flow = null;
          r.source = null;
        }
      }
      if (placedWaves >= waves && !riders.some((r) => r.active)) break;
    }

    const quantile = (values: number[], q: number) => {
      if (values.length === 0) return Number.NaN;
      const sorted = Float64Array.from(values).sort();
      return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
    };
    const f = (v: number, digits = 3) => (v === v ? v.toFixed(digits) : 'none');
    const pct = (n: number, of: number) => (of > 0 ? `${((100 * n) / of).toFixed(2)} %` : 'none');
    const q = (values: number[], digits = 3) => `p50 ${f(quantile(values, 0.5), digits)}, p95 ${f(quantile(values, 0.95), digits)}, p99 ${f(quantile(values, 0.99), digits)}, max ${f(values.reduce((a, b) => Math.max(a, b), -Infinity), digits)} (n ${values.length})`;
    const lines: string[] = [];
    const ms = (v: number[]) => { const o = [...v].sort((x, y) => x - y); const at = (q: number) => (o.length ? o[Math.min(o.length - 1, Math.floor(q * o.length))].toFixed(2) : '—'); return `p50 ${at(0.5)}, p90 ${at(0.9)}, p99 ${at(0.99)} ms`; };
    lines.push(`cost a 60 Hz step on this machine's CPU (compare builds on an idle machine only): the sea's step with its front ${ms(cost.sea)}; the contact's loft ${ms(cost.contact)}; one rider's step ${ms(cost.rider)} (n ${cost.rider.length}), in the case's water ${ms(cost.riderInCase)} (n ${cost.riderInCase.length}), up on the board ${ms(cost.riderStanding)} (n ${cost.riderStanding.length})`);
    const measured = solver.time - measuredFrom;
    lines.push(`# prone riders through the forming tube: pool straight Barrel, H ${height} m at the feed, cases ${caseName}, switches ${JSON.stringify(switches)}`);
    lines.push(`tubeFace ${JSON.stringify(face ?? 'none')}`);
    lines.push(`${waves} waves of riders after ${settle} s; measured ${measured.toFixed(1)} s; CPU 1/60 s; ${((Date.now() - t0) / 1000).toFixed(0)} s of wall time; take-off (${focus.x.toFixed(1)}, ${focus.z.toFixed(1)}), s ${focusS.toFixed(1)}; first throw there at ${f(T0, 2)} s; game start ${rideLineupOffset(config).toFixed(1)} m out`);
    lines.push('');
    lines.push('## The clock (every front point, every step)');
    lines.push(`before the throw: rate ${q(preRates)}; on a rate bound ${pct(onLow + onHigh, preRates.length)} of steps (0.5×: ${pct(onLow, preRates.length)}, 1.5×: ${pct(onHigh, preRates.length)}) [bar: ≤ 1 %]`);
    lines.push(`on a bound by the clock's reading: ${bins.slice(0, -1).map((from, k) => `τ ${from === -Infinity ? '' : `${from} `}to ${bins[k + 1]} s: ${pct(binBound[k], binSteps[k])} of ${binSteps[k]}`).join('; ')}`);
    lines.push(`|Δτ̇| a step, before the throw: ${q(dRatePre, 4)} [bar: p99 ≤ 0.02]`);
    lines.push(`|Δτ̇| a step, every step (the throw and after it too): ${q(dRateAll, 4)}`);
    lines.push(`the wall water's rate (tauRate), its change a step: ${q(dWater, 4)}; against the step the clock then took: ${q(waterAgainst, 4)}`);
    lines.push(`formation bar 7: each point's first clock less its case's τ_e: p5 ${f(quantile(firstOffset, 0.05))}, ${q(firstOffset)} s; within 0.1 s on ${pct(firstOffset.filter((v) => Math.abs(v) <= 0.1).length, firstOffset.length)} of ${firstOffset.length}`);
    lines.push(`the contour throw: the crest's own distance to its contour as its clock crosses 0: p5 ${f(quantile(throwD, 0.05), 2)}, p50 ${f(quantile(throwD, 0.5), 2)}, p95 ${f(quantile(throwD, 0.95), 2)} m, within 1 m on ${pct(throwD.filter((v) => Math.abs(v) <= 1).length, throwD.length)} of ${throwD.length}; thrown before the solver broke it ${pct(throwUnbroken, throwD.length)}`);
    lines.push(`throws by reef column (n seaward of the reef line, less the take-off's ${poolStraightFrame(focus.x, focus.z).n.toFixed(2)} m): ${[...throwN.entries()].sort((a, b) => a[0] - b[0]).map(([s, ns]) => `s ${s}: ${f(quantile(ns, 0.5) - poolStraightFrame(focus.x, focus.z).n, 2)} (n ${ns.length})`).join('; ')}`);
    const reading = simulation.surf.reading(solver.time, measured);
    lines.push(`the surf meter over the measured time: ${JSON.stringify(reading)}`);
    lines.push('');
    lines.push('## The felt water at the board (attached riders, its change a step, m/s)');
    lines.push(`every step: ${q(felt.all)}`);
    lines.push(`in the case's water: ${q(felt.inCase)} [bar: p99 ≤ 0.2]`);
    lines.push(`for τ < −0.5 s (the nearest front point's clock): ${q(felt.early)} [ruling 5's bar: p99 ≤ 0.1]`);
    lines.push(`jumps over 0.2 m/s a step: ${seam5.jumps} of ${seam5.steps} steps (${pct(seam5.jumps, seam5.steps)}) [ruling 5's bar: ≤ 0.6 %]; where the case is not above the solver (hc ≤ 0.02 m): ${seam5.jumpsLow} (${pct(seam5.jumpsLow, seam5.jumps)} of the jumps)`);
    lines.push(`the answering source (the case's wall water or the solver's): in the wall water on ${seam5.wallSteps} steps; switches where hc ≤ 0.02 m: ${seam5.switches}, with a jump over 0.2 m/s: ${seam5.switchJumps} [ruling 5's bar: 0]; the felt water's change at those switches: ${q(seam5.switchSizes)}`);
    lines.push('');
    lines.push('## The surface\'s rise against the water\'s (at the board\'s place a step ago; m/s; a free surface needs ∂η/∂t + u·∇η = v)');
    const signed = (values: number[]) => `p5 ${f(quantile(values, 0.05), 2)}, p50 ${f(quantile(values, 0.5), 2)}, p95 ${f(quantile(values, 0.95), 2)}`;
    for (const [name, set] of [['in the case\'s water', rise.inCase], ['on the solver\'s sea', rise.sea]] as const) {
      riseLabels.forEach((label, i) => {
        const b = set[i];
        if (b.miss.length === 0) return;
        lines.push(`${name}, ${label}: the surface's rise ${signed(b.rise)}; the up-flow it needs ${signed(b.need)}; the up-flow felt ${signed(b.up)}; the miss ${q(b.miss, 2)}`);
        if (b.own.length > 0) lines.push(`  in the wave's frame: the surface's own rise ${signed(b.own)}, size ${q(b.own.map(Math.abs), 2)}; the solver's sea's own rise ${signed(b.ownSea)}; the felt water off the surface's line ${signed(b.slip)}, size ${q(b.slip.map(Math.abs), 2)}`);
      });
    }
    lines.push('');
    lines.push('## RULING 7: the surface\'s own rise by its parts (in the case, wave frame; R = sea + Atau + Ah + shape + slip + resid)');
    for (const [name, set] of [['tau -1 to 0 s', r7], ['tau 0 to 0.5 s', r7late]] as const) {
      const ok = set.R.map((_, i) => i).filter((i) => set.resid[i] === set.resid[i]);
      lines.push(`${name}: n ${set.R.length}, with shares readable ${ok.length}; anchor outcomes ${[...set.last.entries()].map(([k, v]) => `${k} ${v}`).join(', ')}`);
      const pick = (values: number[]) => ok.map((i) => values[i]);
      lines.push(`  R ${signed(pick(set.R))}; size ${q(pick(set.R).map(Math.abs), 2)}`);
      for (const key of ['sea', 'Atau', 'Ah', 'shape', 'slip', 'resid'] as const) lines.push(`  ${key}: ${signed(pick(set[key]))}; size ${q(pick(set[key]).map(Math.abs), 2)}`);
      lines.push(`  anchor rate less c: ${signed(set.va)}; clock step rate: ${signed(set.tauStep)}; slope along the ray: ${signed(set.slope)}`);
      const tail = ok.filter((i) => Math.abs(set.R[i]) > 2);
      const lead = new Map<string, number>();
      for (const i of tail) {
        let best = 'sea';
        for (const key of ['Atau', 'Ah', 'shape', 'slip', 'resid'] as const) if (Math.abs(set[key][i]) > Math.abs(set[best as 'sea'][i])) best = key;
        lead.set(best, (lead.get(best) ?? 0) + 1);
      }
      lines.push(`  the tail (|R| > 2 m/s): ${tail.length}; largest part: ${[...lead.entries()].map(([k, v]) => `${k} ${v}`).join(', ')}`);
      const mean = (values: number[], idx: number[]) => (idx.length ? idx.reduce((a, i) => a + values[i], 0) / idx.length : Number.NaN);
      lines.push(`  the tail's mean signed parts as R's sign: ${(['sea', 'Atau', 'Ah', 'shape', 'slip', 'resid'] as const).map((key) => `${key} ${f(mean(set[key].map((v, i) => v * Math.sign(set.R[i])), tail), 2)}`).join(', ')}; mean |R| ${f(mean(set.R.map(Math.abs), tail), 2)}`);
    }
    lines.push(`bar A, the share at a point carried with the wave, τ −1 to 0 s: fell by over 0.005 on ${carried.drops} of ${carried.steps} steps [bar: 0]`);
    lines.push(`bar B, the clock rate that share stands for: ${signed(carried.implied)}; the front point's own: ${signed(carried.own)}; over 20 % off it on ${carried.off} of ${carried.implied.length} steps [bar: 0]`);
    writeFileSync(log.replace(/\.txt$/, '') + '.fronts.tsv', frontRows.join('\n') + '\n');
    writeFileSync(log.replace(/\.txt$/, '') + '.rise.tsv', r7rows.join('\n') + '\n');
    writeFileSync(log.replace(/\.txt$/, '') + '.riders.tsv', riderRows.join('\n') + '\n');
    lines.push('');
    lines.push('## The seam (columns s 45 and s 60, every 0.1 s, the surface every 0.05 m along the ray; where the case leaves the solver\'s surface, hc crossing 1 mm)');
    lines.push(`the front points' foot height there: ${q(footHeights)} m`);
    seamScan.forEach((bin, k) => {
      const most = (values: number[]) => values.reduce((a, b) => Math.max(a, b), -Infinity);
      const three = (values: number[], digits: number) => `p50 ${f(quantile(values, 0.5), digits)}, p90 ${f(quantile(values, 0.9), digits)}, max ${f(most(values), digits)}`;
      lines.push(`τ ${seamBins[k] === -Infinity ? 'under' : `${seamBins[k]} to`} ${seamBins[k + 1] === Infinity ? 'on' : `${seamBins[k + 1]} s`}: height step ${three(bin.step, 3)} m [bar: ≤ 0.01]; slope's turn less the solver's ${three(bin.turn, 1)}° [bar: ≤ 3]; flow across 0.25 m ${three(bin.flow, 2)} m/s [bar: ≤ 0.2] (n ${bin.step.length})`);
    });
    lines.push('');
    const passive = riders.filter((r) => r.kind === 'passive');
    const passiveFell = passive.filter((r) => r.fell);
    const causes = (list: Rider[]) => {
      const by = new Map<string, number>();
      for (const r of list) by.set(r.fell!.cause, (by.get(r.fell!.cause) ?? 0) + 1);
      return [...by.entries()].map(([cause, n]) => `${cause} ${n}`).join(', ') || 'none';
    };
    lines.push(`## Passive prone: fell ${passiveFell.length} of ${passive.length} [bar: ≤ 3 of 32] (${causes(passiveFell)}); in the case's water as they fell ${passiveFell.filter((r) => r.fell!.inCase).length}; before the throw (τ < 0) ${passiveFell.filter((r) => r.fell!.tau < 0).length} [ruling 5's bar: ≤ 3], after it (τ ≥ 0) ${passiveFell.filter((r) => r.fell!.tau >= 0).length}, no slice by them ${passiveFell.filter((r) => !(r.fell!.tau === r.fell!.tau)).length}`);
    for (const r of passive) lines.push(`  wave ${r.wave} ${r.label}: ${r.fell ? `fell at ${r.fell.at.toFixed(2)} s (${r.fell.cause}; ${r.fell.n.toFixed(1)} m seaward of the take-off's line${r.fell.inCase ? '; in the case\'s water' : ''}; τ ${f(r.fell.tau, 2)} s)` : 'held'}`);
    lines.push('');
    const rides = riders.filter((r) => r.kind === 'ride');
    const took = rides.filter((r) => r.taken !== null);
    const failed = took.filter((r) => r.fell && r.stood === null);
    const later = took.filter((r) => r.fell && r.stood !== null);
    const proneFell = rides.filter((r) => r.taken === null && r.fell);
    lines.push(`## Scripted rides: ${rides.length}; popped up ${took.length}; stood ${took.filter((r) => r.stood !== null).length}; failed pop-ups ${failed.length} of ${took.length} [ruling 4's bar: ≤ 2 of 16; ruling 5's: ≤ 8 of 22 and stood ≥ 14] (${causes(failed)}); fell after standing ${later.length} (${causes(later)}); fell paddling, before any pop-up ${proneFell.length} (${causes(proneFell)}); never popped up and held ${rides.filter((r) => r.taken === null && !r.fell).length}`);
    for (const r of rides) {
      lines.push(`  wave ${r.wave} ${r.label}: ${r.pressed === null ? 'no cue' : `cue ${r.pressed.toFixed(2)} s`}${r.taken === null ? '' : `, up from ${r.taken.toFixed(2)} s`}${r.stood === null ? '' : `, stood ${r.stood.toFixed(2)} s`}; ${r.fell ? `fell at ${r.fell.at.toFixed(2)} s (${r.fell.cause}, ${r.fell.phase}${r.fell.inCase ? ', in the case\'s water' : ''})` : 'on the board to the end'}; carried ${(r.farthest - (focus.z)).toFixed(1)} m past the take-off`);
    }
    appendFileSync(log, lines.join('\n') + '\n');
  }, 3_600_000);
});
