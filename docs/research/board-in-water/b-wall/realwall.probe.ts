// Step 2 of the surfer track (2026-11-13): the 2 m pool's real wall water (`?poolSize=ref&wallBody=stream` and the ride
// address's switches, the game's own config and case library). A standing rider at 7 m/s through the water is placed
// 4 m outside either end of the case's wall water, heading into it; two boards share the same sea, one on the path rule,
// one following the water (`WaterSample.wallFollow`). Both read the sea without reacting on it. Run:
//   PROBE=1 OUT=/tmp/out.jsonl npx vitest run --config docs/research/board-in-water/b-wall/vitest.probe.config.ts realwall
import { describe, it } from 'vitest';
import { surfZoneConfigFor } from '../../../../src/game/PhysicalMode';
import { physicalSettingsFor } from '../../../../src/game/SurfConditions';
import type { SurfWater, WaterSample } from '../../../../src/physics/SurfWater';
import { createWaterSample } from '../../../../src/physics/SurfWater';
import { readBarrelCases } from '../../../../src/wave/barrel/nodeBarrelCases';
import { SurfZoneRunner } from '../../../../src/wave/SurfZoneRunner';
import { sweptBarrelOn, type SurfZoneConfig } from '../../../../src/wave/SurfZoneSimulation';
import { STEP, emit, place, r, type Rig } from '../lab';

const SEARCH = '?poolSize=ref&wallBody=stream&tubeForm=early&poolReach=long&loftMesh=arc&wallFoot=dug';
interface Hidden { wallPush: Float64Array; wallSeen: Uint8Array; substepSpan: number }

describe.runIf(process.env.PROBE)('the pool\'s real wall water: path rule against following the water', () => {
  it('crosses into the wall water at 7 m/s', { timeout: 3_600_000 }, () => {
    (globalThis as unknown as { location: { search: string } }).location = { search: SEARCH };
    const settings = physicalSettingsFor('pool', { swell: 'big', tide: 'mid', wind: 'calm', time: 'midday', waves: 'barrel' } as never, { stage: 2, compute: 'cpu' });
    const config = surfZoneConfigFor(settings as never, 1, false) as SurfZoneConfig;
    const cases = sweptBarrelOn(config) ? readBarrelCases(config.spot, undefined, config.poolTubeCase) : undefined;
    const runner = new SurfZoneRunner(config, { contact: true, ...(cases ? { barrelCases: cases } : {}) }, 'spun-up');
    const water = runner.water;
    emit({ config: { poolSize: config.poolSize, wallBody: config.wallBody, follow: runner.simulation.tubeFace?.follow ?? false } });
    const as = (follow: boolean): SurfWater => ({
      sampleAt(x: number, y: number, z: number, out: WaterSample) {
        water.sampleAt(x, y, z, out);
        out.wallFollow = follow && out.wallWater ? true : undefined;
        return out;
      },
      surfaceAt: (x: number, z: number) => water.surfaceAt(x, z),
      addReaction() {},
      setSampleTime: (offset: number) => water.setSampleTime(offset),
    });
    const waters = { path: as(false), follow: as(true) };
    const focus = runner.simulation.breakPoint();
    const probe = createWaterSample();
    const until = Number(process.env.UNTIL ?? 150);
    const settle = Number(process.env.SETTLE ?? 40);
    let lastLaunch = -Infinity;
    interface Run { rule: 'path' | 'follow'; rig: Rig; weight: number; before: number[]; inWall: boolean; peakForce: number; peakPush: number; peakLoad: number; wallFrames: number; fell: string; fellAt: number; t0: number; label: string }
    let runs: Run[] = [];
    const finish = (run: Run) => {
      const base = run.before.length ? run.before.reduce((a, b) => a + b, 0) / run.before.length : Number.NaN;
      emit({ label: run.label, rule: run.rule, wallFrames: run.wallFrames, spike: r(run.peakForce - base, 2), peakWallPush: r(run.peakPush, 2), peakLoad: r(run.peakLoad, 2), fell: run.fell, fellAfter: r(run.fellAt, 2) });
    };
    for (let i = 0; i * STEP < until; i += 1) {
      const t = i * STEP;
      runner.advance(1);
      for (const run of runs) {
        if (run.fell) continue;
        const { board, rider } = run.rig;
        board.step(STEP, waters[run.rule]);
        const hidden = board as unknown as Hidden;
        const f = board.forces;
        const vertical = (f.pressure.y + f.buoyancy.y + f.addedMass.y + f.radiation.y) / run.weight;
        let push = 0;
        let wall = false;
        for (let k = 0; k < hidden.wallPush.length; k += 1) { push += hidden.wallPush[k]; if (hidden.wallSeen[k]) wall = true; }
        if (wall) { run.inWall = true; run.wallFrames += 1; }
        if (!run.inWall) { run.before.push(vertical); if (run.before.length > 15) run.before.shift(); }
        else {
          run.peakForce = Math.max(run.peakForce, vertical);
          run.peakPush = Math.max(run.peakPush, Math.abs(push / hidden.substepSpan) / run.weight);
          run.peakLoad = Math.max(run.peakLoad, rider!.contact.load);
        }
        if (!rider!.attached) { run.fell = String(rider!.separation); run.fellAt = t - run.t0; }
      }
      if (runs.length && t - runs[0].t0 > 1.5) { runs.forEach(finish); runs = []; }
      if (runs.length || t < settle || t - lastLaunch < 4 || i % 15 !== 0) continue;
      // Scan for the case's wall water near the break: just under the surface, 1 m cells.
      let xMin = Infinity; let xMax = -Infinity; const zs = new Map<number, number[]>();
      for (let x = Math.round(focus.x - 60); x <= focus.x + 60; x += 1) {
        for (let z = Math.round(focus.z - 30); z <= focus.z + 15; z += 1) {
          const y = water.surfaceAt(x, z) - 0.15;
          water.sampleAt(x, y, z, probe);
          if (!probe.wallWater) continue;
          xMin = Math.min(xMin, x); xMax = Math.max(xMax, x);
          zs.set(x, [...(zs.get(x) ?? []), z]);
        }
      }
      if (!(xMax - xMin >= 6)) continue;
      lastLaunch = t;
      const meanZ = (x: number) => { const list = zs.get(x)!; return list.reduce((a, b) => a + b, 0) / list.length; };
      for (const [end, dir] of [[xMin, 1], [xMax, -1]] as const) {
        const start = { x: end - 4 * dir, z: meanZ(end) };
        for (const rule of ['path', 'follow'] as const) {
          const rig = place(waters[rule], start.z, dir * 90, 7, 'standing', {}, start.x);
          const { board } = rig;
          runs.push({ rule, rig, weight: (board.mass + rig.rider!.mass) * 9.81, before: [], inWall: false, peakForce: -Infinity, peakPush: 0, peakLoad: 0, wallFrames: 0, fell: '', fellAt: Number.NaN, t0: t, label: `t ${t.toFixed(1)} s, from x ${start.x} z ${r(start.z, 1)} heading ${dir > 0 ? '+x' : '-x'}` });
        }
      }
    }
  });
});
