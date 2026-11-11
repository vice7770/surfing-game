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
import { SweptContact } from '../barrel/sweptContact';
import { FORMATION } from '../barrel/sliceClock';
import { BARREL_SLOPE } from '../barrel/sweptLoft';
import { POOL, poolStraightAt, poolStraightFrame, regularSignificantHeight } from '../pool';
import { rideLineupAlong, rideLineupOffset, SurfZoneSimulation, type SurfZoneConfig } from '../SurfZoneSimulation';

/**
 * Prone riders through the forming tube at the Wave Pool's straight Barrel: the probe for ruling 4's rank 1, the C1
 * formation clock (the water-physics advisor's advisor-ruling-4.md, docs/research/pool-tube-track-2026-11-05; notes in
 * docs/research/form-clock-2026-11-11/README.md). Opt-in (PROBE=1); a probe only. Rebuilt after the ruling's own
 * `proneSeam` probe (not kept), so its numbers are this probe's, not the ruling's.
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
 * - the surf meter over the measured time.
 *
 * H (1.05: "1.5 m" | 1.32: "1.8 m"), CASE (pool | a38), SWITCHES (comma-separated config switches, as
 * `poolTubeFace.probe.test.ts`: `formClock=old`, `formClock=c1`, `tubeForm=old`, `tubeFace=old,tubeFrom=piece`, …), WAVES
 * (4), SETTLE (50 s), LEAD (6 s), T0 (s: the take-off's first throw, for a build whose clocks never cross 0, the
 * pre-tube's; read it from the default's run), LOG.
 */
describe.runIf(process.env.PROBE)('the Wave Pool straight Barrel: prone riders through the forming tube', () => {
  it('measures the formation clock, the felt water and the scripted riders', () => {
    const height = Number(process.env.H ?? 1.05);
    const caseName = process.env.CASE === 'a38' ? 'a38' : 'pool';
    const waves = Number(process.env.WAVES ?? 4);
    const settle = Number(process.env.SETTLE ?? 50);
    const lead = Number(process.env.LEAD ?? 6);
    const switches: Record<string, unknown> = {};
    for (const item of (process.env.SWITCHES ?? '').split(',').filter(Boolean)) {
      const [key, value] = item.split('=');
      switches[key] = value === '0' ? 0 : value;
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
      fell: { at: number; cause: string; phase: string; n: number; inCase: boolean } | null;
      flow: [number, number, number] | null;
      farthest: number;
    }
    const riders: Rider[] = [];
    const sample = createWaterSample();
    const felt = { all: [] as number[], inCase: [] as number[] };
    const place = (wave: number) => {
      const add = (kind: Rider['kind'], label: string, x: number, z: number, steer: number) => {
        const session = new RideSession();
        session.reset(new Vector3(x, 0, z), 0, quiet);
        riders.push({ kind, label, wave, session, steer, active: true, placed: solver.time, fast: 0, pressed: null, taken: null, stood: null, fell: null, flow: null, farthest: z });
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
    const fallback = Number(process.env.T0 ?? Number.NaN);
    const most = Math.ceil(((waves + 3) * period) / dt);
    let guard = 0;
    while (guard++ < most) {
      simulation.step(dt);
      const count = simulation.writeTubeRecords(records);
      water.withSurfaceNodeCache(() => contact.update(records, count, solver.restLevel, (x, z) => water.plainSurfaceAt(x, z)));
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
        const phaseBefore = session.phase;
        water.withSurfaceNodeCache(() => session.step(dt, quiet, input));
        if (r.kind === 'ride' && r.taken === null && session.phase !== 'prone' && session.phase !== 'fallen') r.taken = since;
        if (r.stood === null && rider.popUpReport.outcome === 'stood') r.stood = since;
        if (board.position.z > r.farthest) r.farthest = board.position.z;
        const surface = water.surfaceAt(board.position.x, board.position.z);
        const inCase = surface - water.plainSurfaceAt(board.position.x, board.position.z) > 0.02;
        if (!rider.attached) {
          r.fell = { at: since, cause: session.separation ?? '?', phase: phaseBefore, n: poolStraightFrame(board.position.x, board.position.z).n - poolStraightFrame(focus.x, focus.z).n, inCase };
          r.active = false;
          continue;
        }
        const s = water.sampleAt(board.position.x, surface - 0.05, board.position.z, sample);
        if (s.wet && !s.outsideDomain) {
          if (r.flow) {
            const change = Math.hypot(s.flowX - r.flow[0], s.flowY - r.flow[1], s.flowZ - r.flow[2]);
            felt.all.push(change);
            if (inCase) felt.inCase.push(change);
          }
          r.flow = [s.flowX, s.flowY, s.flowZ];
        } else r.flow = null;
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
    lines.push('');
    const passive = riders.filter((r) => r.kind === 'passive');
    const passiveFell = passive.filter((r) => r.fell);
    const causes = (list: Rider[]) => {
      const by = new Map<string, number>();
      for (const r of list) by.set(r.fell!.cause, (by.get(r.fell!.cause) ?? 0) + 1);
      return [...by.entries()].map(([cause, n]) => `${cause} ${n}`).join(', ') || 'none';
    };
    lines.push(`## Passive prone: fell ${passiveFell.length} of ${passive.length} [bar: ≤ 3 of 32] (${causes(passiveFell)}); in the case's water as they fell ${passiveFell.filter((r) => r.fell!.inCase).length}`);
    for (const r of passive) lines.push(`  wave ${r.wave} ${r.label}: ${r.fell ? `fell at ${r.fell.at.toFixed(2)} s (${r.fell.cause}; ${r.fell.n.toFixed(1)} m seaward of the take-off's line${r.fell.inCase ? '; in the case\'s water' : ''})` : 'held'}`);
    lines.push('');
    const rides = riders.filter((r) => r.kind === 'ride');
    const took = rides.filter((r) => r.taken !== null);
    const failed = took.filter((r) => r.fell && r.stood === null);
    const later = took.filter((r) => r.fell && r.stood !== null);
    const proneFell = rides.filter((r) => r.taken === null && r.fell);
    lines.push(`## Scripted rides: ${rides.length}; popped up ${took.length}; stood ${took.filter((r) => r.stood !== null).length}; failed pop-ups ${failed.length} of ${took.length} [bar: ≤ 2 of 16] (${causes(failed)}); fell after standing ${later.length} (${causes(later)}); fell paddling, before any pop-up ${proneFell.length} (${causes(proneFell)}); never popped up and held ${rides.filter((r) => r.taken === null && !r.fell).length}`);
    for (const r of rides) {
      lines.push(`  wave ${r.wave} ${r.label}: ${r.pressed === null ? 'no cue' : `cue ${r.pressed.toFixed(2)} s`}${r.taken === null ? '' : `, up from ${r.taken.toFixed(2)} s`}${r.stood === null ? '' : `, stood ${r.stood.toFixed(2)} s`}; ${r.fell ? `fell at ${r.fell.at.toFixed(2)} s (${r.fell.cause}, ${r.fell.phase}${r.fell.inCase ? ', in the case\'s water' : ''})` : 'on the board to the end'}; carried ${(r.farthest - (focus.z)).toFixed(1)} m past the take-off`);
    }
    appendFileSync(log, lines.join('\n') + '\n');
  }, 3_600_000);
});
