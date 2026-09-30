import { appendFileSync, writeFileSync } from 'node:fs';
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
    const cuts: number[] = [];
    const vertices: number[] = [];
    let queried = 0;
    let hits = 0;
    let inAir = 0;
    let covered = 0;
    let queryMs = 0;
    let anomalies = 0;
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
      runner.advance(1);
      steps.push(performance.now() - start);
      updates.push(runner.contactMs);
      const loft = contact.last;
      if (!loft) continue;
      cuts.push(loft.cuts);
      vertices.push(loft.vertexCount);
      // Points through the open, overturned strips: between the two slices, from the face under the throat to the
      // lip's tip, from the face to a metre over the curl's top.
      const open: number[] = [];
      for (let s = 0; s + 1 < loft.sliceCount; s += 1) if (loft.sliceJoined[s] && loft.slicePhase[s] === 1 && loft.sliceOverturned[s]) open.push(s);
      if (open.length === 0) continue;
      const before = contact.stats.anomalies;
      const p = loft.positions;
      const t0 = performance.now();
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
      anomalies += contact.stats.anomalies - before;
      if (step % 300 === 299) {
        appendFileSync(log, `t ${runner.simulation.solver.time.toFixed(0)} s | contact update ${quantiles(updates)} ms against the step's ${quantiles(steps, 1)} ms | vertices ${quantiles(vertices, 0)} | cuts ${quantiles(cuts, 0)}\n`);
      }
    }
    const perQuery = queried ? (1000 * queryMs) / queried : Number.NaN;
    const update = updates.reduce((sum, ms) => sum + ms, 0) / Math.max(1, updates.length);
    const step = steps.reduce((sum, ms) => sum + ms, 0) / Math.max(1, steps.length);
    appendFileSync(log, `the contact's update ${update.toFixed(2)} ms a step against the step's ${step.toFixed(1)} ms (${((100 * update) / step).toFixed(1)} %)\n`);
    appendFileSync(log, `queries in the open tubes: ${queried}, ${hits} answered by the loft (${inAir} in air, ${covered} covered), ${anomalies} unclosed columns; ${perQuery.toFixed(2)} µs a query\n`);
    appendFileSync(log, `a standing rider in a tube, every sample in the loft: ${samples} × ${perQuery.toFixed(2)} µs = ${((samples * perQuery) / 1000).toFixed(2)} ms a step, on top of the update\n`);
  }, 7_200_000);

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
    const t0 = performance.now();
    for (let k = 0; k < n; k += 1) if (contact.query(points[3 * k], points[3 * k + 1], points[3 * k + 2], hit)) hits += 1;
    const perQuery = (1000 * (performance.now() - t0)) / n;
    appendFileSync(log, `toy tube, a 40 m front (${contact.last!.vertexCount} vertices): update ${update.toFixed(2)} ms; ${perQuery.toFixed(2)} µs a query through its tube (${hits} of ${n} answered)\n`);
  }, 600_000);
});
