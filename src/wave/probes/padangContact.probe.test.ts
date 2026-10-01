import { appendFileSync, writeFileSync } from 'node:fs';
import { loadavg } from 'node:os';
import { Quaternion, Vector3 } from 'three';
import { describe, it } from 'vitest';
import { PADANG_SPREADING } from '../../game/PhysicalMode';
import { PADANG_SWELLS } from '../../game/SurfConditions';
import { AttachedRider } from '../../physics/AttachedRider';
import { BoardBody } from '../../physics/BoardBody';
import { PlaneWater } from '../../physics/PlaneWater';
import type { SurfWater, WaterSample } from '../../physics/SurfWater';
import { PADANG } from '../Bathymetry';
import { FRONT_FIELD, FRONT_STRIDE } from '../barrel/frontRecords';
import { readBarrelCases } from '../barrel/nodeBarrelCases';
import { ProfileLibrary } from '../barrel/ProfileLibrary';
import { createContactHit, SweptContact } from '../barrel/sweptContact';
import { LOFT, LOFT_SAMPLES } from '../barrel/sweptLoft';
import { tubeCase } from '../barrel/toyCase';
import { SURF_ZONE_STEP, SurfZoneRunner } from '../SurfZoneRunner';

const quantile = (values: number[], q: number) => {
  if (!values.length) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
};

const quantiles = (values: number[], digits = 2) => {
  if (!values.length) return '—';
  const sorted = [...values].sort((a, b) => a - b);
  return [0.5, 0.9].map((q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))].toFixed(digits)).join(' / ') + ` (max ${sorted.at(-1)!.toFixed(digits)})`;
};

/** How many water samples one step of a standing rider takes (every substep's hull points, foils and body parts). */
function samplesPerStandingStep(): number {
  const board = new BoardBody();
  board.place(new Vector3(0, board.shape.centerOfMass.y, 0), new Quaternion(), new Vector3(0, 0, 8));
  board.attach(new AttachedRider(board.shape, { phase: 'standing' }));
  const plane = new PlaneWater();
  for (let i = 0; i < 18; i += 1) board.step(SURF_ZONE_STEP, plane);
  let count = 0;
  const counting: SurfWater = {
    surfaceAt: (x, z) => plane.surfaceAt(x, z),
    addReaction: () => {},
    sampleAt(x: number, y: number, z: number, out: WaterSample) {
      count += 1;
      return plane.sampleAt(x, y, z, out);
    },
  };
  board.step(SURF_ZONE_STEP, counting);
  return count;
}

/**
 * The swept contact on Padang Padang's Small swell (Part B, PR 4; the advisor's ruling 3: "Measure the cost: 32
 * substeps × every hull point and body part"). Each step at the game's 1/60 s: the contact's update (the loft and its
 * index) in the runner, and a query's own cost on points drawn through the open tubes; then a standing rider's samples
 * per step at that cost. Opt-in (PROBE=1); SECONDS, SWELL, LOG.
 */
describe.runIf(process.env.PROBE)('Padang Padang contact probe', () => {
  it('measures the contact every step and logs it', () => {
    const log = process.env.LOG ?? 'padang-contact.txt';
    writeFileSync(log, '');
    const name = (process.env.SWELL ?? 'small') as keyof typeof PADANG_SWELLS;
    const swell = PADANG_SWELLS[name];
    const runner = new SurfZoneRunner({
      spot: 'padang', seed: 3, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod,
      directionDegrees: 0, spreading: PADANG_SPREADING, tide: 0, componentCount: 24,
      alongShore: PADANG.alongShore, dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1,
    }, { rider: true, barrelCases: readBarrelCases() });
    const contact = runner.contact!;
    const samples = samplesPerStandingStep();
    appendFileSync(log, `Padang Padang ${name} (Hs ${swell.significantHeight} m, ${swell.peakPeriod} s), 1 m cells, 1/60 s steps; a standing rider samples the water ${samples} times a step\n`);
    const updates: number[] = [];
    const steps: number[] = [];
    /** The step's and the queries' CPU time, ms: on a loaded machine wall time counts the waits for a core too. */
    const stepCpu: number[] = [];
    let queryCpuMs = 0;
    /** Overturned slices under partial weight (a front's ends, a collapse): lerped toward the water as drawn. */
    const partial: number[] = [];
    const vertices: number[] = [];
    let queried = 0;
    let hits = 0;
    let inAir = 0;
    let covered = 0;
    let queryMs = 0;
    let anomalies = 0;
    let quads = 0;
    let backstop = 0;
    // Overlapping fronts (the advisor: strips dropped per 1000, and whether one held an open tube), and the contact's
    // held tip's distance from the drawn one.
    let strips = 0;
    let dropped = 0;
    let droppedOpen = 0;
    let droppedOpenWeight = 0;
    let tipGap = 0;
    /** The height field's slopes on the breaking faces, from 2 m behind the solver's crest to 3 m ahead (the clamp's yardstick). */
    const faceSlopes: number[] = [];
    // A fixed sequence of points (a linear congruential generator), so reruns draw the same.
    let seed = 12345;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const hit = createContactHit();
    const seconds = Number(process.env.SECONDS ?? 60);
    for (let step = 0; step < seconds / SURF_ZONE_STEP; step += 1) {
      const start = performance.now();
      const cpu = process.cpuUsage();
      runner.advance(1);
      steps.push(performance.now() - start);
      const used = process.cpuUsage(cpu);
      stepCpu.push((used.user + used.system) / 1000);
      updates.push(runner.contactMs);
      const loft = contact.last;
      if (!loft) continue;
      let lerped = 0;
      for (let s = 0; s < loft.sliceCount; s += 1) if (loft.sliceOverturned[s] && loft.sliceWeight[s] > 0 && loft.sliceWeight[s] < 1) lerped += 1;
      partial.push(lerped);
      vertices.push(loft.vertexCount);
      for (let s = 0; s + 1 < loft.sliceCount; s += 1) strips += loft.sliceJoined[s];
      strips += loft.overlaps;
      dropped += loft.overlaps;
      droppedOpen += loft.overlapsOpen;
      droppedOpenWeight = Math.max(droppedOpenWeight, loft.overlapOpenWeight);
      tipGap = Math.max(tipGap, loft.tipGap);
      // Every half second, the plain height field's slope across the breaking faces, by central differences over 0.5 m.
      const front = runner.simulation.front;
      if (front && step % 30 === 0) {
        for (const point of front.points) {
          for (let d = -2; d <= 3; d += 1) {
            const x = point.x;
            const z = point.z + d;
            const sx = (runner.water.plainSurfaceAt(x + 0.25, z) - runner.water.plainSurfaceAt(x - 0.25, z)) / 0.5;
            const sz = (runner.water.plainSurfaceAt(x, z + 0.25) - runner.water.plainSurfaceAt(x, z - 0.25)) / 0.5;
            faceSlopes.push(Math.sqrt(sx * sx + sz * sz));
          }
        }
      }
      // Points through the open, overturned strips: between the two slices, from the face under the throat to the
      // lip's tip, from the face to a metre over the curl's top.
      const open: number[] = [];
      for (let s = 0; s + 1 < loft.sliceCount; s += 1) if (loft.sliceJoined[s] && loft.slicePhase[s] === 1 && loft.sliceOverturned[s]) open.push(s);
      if (open.length === 0) continue;
      const before = contact.stats.anomalies;
      const quadsBefore = contact.stats.quads;
      const backstopBefore = contact.stats.overlaps;
      const p = loft.positions;
      const t0 = performance.now();
      const c0 = process.cpuUsage();
      for (let k = 0; k < 2000; k += 1) {
        const s = open[Math.floor(random() * open.length)];
        const j = LOFT.extensionSamples + 64 + Math.floor(random() * 48);
        const f = random();
        const a = 3 * (s * LOFT_SAMPLES + j);
        const b = a + 3 * LOFT_SAMPLES;
        const x = p[a] + f * (p[b] - p[a]);
        const z = p[a + 2] + f * (p[b + 2] - p[a + 2]);
        const top = p[3 * (s * LOFT_SAMPLES + LOFT.extensionSamples + 32) + 1];
        const y = -0.5 + random() * (top + 1.5);
        if (contact.query(x, y, z, hit)) {
          hits += 1;
          if (!hit.inWater) inAir += 1;
          if (!hit.inWater && hit.ceilingY === hit.ceilingY && !(hit.life >= 1)) covered += 1;
        }
        queried += 1;
      }
      queryMs += performance.now() - t0;
      const queryCpu = process.cpuUsage(c0);
      queryCpuMs += (queryCpu.user + queryCpu.system) / 1000;
      anomalies += contact.stats.anomalies - before;
      quads += contact.stats.quads - quadsBefore;
      backstop += contact.stats.overlaps - backstopBefore;
      if (step % 300 === 299) {
        appendFileSync(log, `t ${runner.simulation.solver.time.toFixed(0)} s | contact update ${quantiles(updates)} ms against the step's ${quantiles(steps, 1)} ms (CPU ${quantiles(stepCpu, 1)}) | vertices ${quantiles(vertices, 0)} | lerped lips ${quantiles(partial, 0)} | strips dropped ${dropped} of ${strips} | load ${loadavg()[0].toFixed(1)}\n`);
      }
    }
    const perQuery = queried ? (1000 * queryMs) / queried : Number.NaN;
    const perQueryCpu = queried ? (1000 * queryCpuMs) / queried : Number.NaN;
    const update = updates.reduce((sum, ms) => sum + ms, 0) / Math.max(1, updates.length);
    const step = steps.reduce((sum, ms) => sum + ms, 0) / Math.max(1, steps.length);
    const cpuStep = stepCpu.reduce((sum, ms) => sum + ms, 0) / Math.max(1, stepCpu.length);
    appendFileSync(log, `the contact's update ${update.toFixed(2)} ms a step against the step's ${step.toFixed(1)} ms (${((100 * update) / step).toFixed(1)} %); the step's CPU ${cpuStep.toFixed(1)} ms; load ${loadavg().map((l) => l.toFixed(1)).join(' ')}\n`);
    appendFileSync(log, `queries in the open tubes: ${queried}, ${hits} answered by the loft (${inAir} in air, ${covered} covered), ${anomalies} unclosed columns; ${perQuery.toFixed(2)} µs a query (CPU ${perQueryCpu.toFixed(2)} µs), ${(quads / Math.max(1, queried)).toFixed(1)} quads tested a query\n`);
    appendFileSync(log, `a standing rider in a tube, every sample in the loft: ${samples} × ${perQuery.toFixed(2)} µs = ${((samples * perQuery) / 1000).toFixed(2)} ms a step (CPU ${((samples * perQueryCpu) / 1000).toFixed(2)} ms), on top of the update\n`);
    appendFileSync(log, `overlapping fronts: ${dropped} strips dropped of ${strips} (${((1000 * dropped) / Math.max(1, strips)).toFixed(2)} per 1000), ${droppedOpen} with an open tube (most weight ${droppedOpenWeight.toFixed(2)}); the contact's backstop counted ${backstop} queries\n`);
    appendFileSync(log, `the contact's held tip from the drawn one: at most ${tipGap.toFixed(3)} m\n`);
    appendFileSync(log, `the height field's slope on the breaking faces (${faceSlopes.length} samples, 2 m behind the crest to 3 m ahead): |s| ${quantiles(faceSlopes)}; p99 ${quantile(faceSlopes, 0.99).toFixed(2)}, p99.9 ${quantile(faceSlopes, 0.999).toFixed(2)}\n`);
  }, 14_400_000);

  it('times a query through a toy tube (the strips’ quads are as many as the sea’s)', () => {
    const log = process.env.LOG ?? 'padang-contact.txt';
    const records = new Float32Array(41 * FRONT_STRIDE);
    for (let k = 0; k < 41; k += 1) {
      const o = k * FRONT_STRIDE;
      records[o + FRONT_FIELD.x] = k; records[o + FRONT_FIELD.z] = -100; records[o + FRONT_FIELD.front] = 1; records[o + FRONT_FIELD.sigma] = k;
      records[o + FRONT_FIELD.tau] = 0.1; records[o + FRONT_FIELD.footHeight] = 2.1; records[o + FRONT_FIELD.footDepth] = 7; records[o + FRONT_FIELD.throwZ] = -100;
    }
    const contact = new SweptContact(new ProfileLibrary([tubeCase(0.3)]), 0.05);
    const start = performance.now();
    for (let k = 0; k < 100; k += 1) contact.update(records, 41, 0.5, () => 0.5);
    const update = (performance.now() - start) / 100;
    const hit = createContactHit();
    let seed = 777;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const n = 200_000;
    const points = new Float64Array(3 * n);
    for (let k = 0; k < n; k += 1) {
      points[3 * k] = 5 + 30 * random();
      points[3 * k + 1] = -0.5 + 7 * random();
      points[3 * k + 2] = -100 + 4 + 6 * random();
    }
    let hits = 0;
    // Warmed first, as a long ride would be; then wall and CPU time.
    for (let k = 0; k < n; k += 1) contact.query(points[3 * k], points[3 * k + 1], points[3 * k + 2], hit);
    const quads = contact.stats.quads;
    const t0 = performance.now();
    const c0 = process.cpuUsage();
    for (let k = 0; k < n; k += 1) if (contact.query(points[3 * k], points[3 * k + 1], points[3 * k + 2], hit)) hits += 1;
    const cpu = process.cpuUsage(c0);
    const perQuery = (1000 * (performance.now() - t0)) / n;
    const perQueryCpu = (cpu.user + cpu.system) / n;
    appendFileSync(log, `toy tube, a 40 m front (${contact.last!.vertexCount} vertices): update ${update.toFixed(2)} ms; ${perQuery.toFixed(2)} µs a query through its tube (CPU ${perQueryCpu.toFixed(2)} µs; ${((contact.stats.quads - quads) / n).toFixed(1)} quads tested; ${hits} of ${n} answered); load ${loadavg().map((l) => l.toFixed(1)).join(' ')}\n`);
  }, 600_000);
});
