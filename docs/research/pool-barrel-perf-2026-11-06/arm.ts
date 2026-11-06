/**
 * One arm of the Barrel's frame-rate bench (pool-barrel-perf, 2026-11-06): the Wave Pool's straight Barrel as the game
 * runs it, from one tree's src (this file's imports; `bench.ts` makes a copy that imports the pre-tube tree's), in Node.
 *
 * - The worker: `SurfZoneRunner.forWorker` with the contact and a riderless board in the lineup (no rider session), the
 *   water on the CPU solver (left out of the worker's CPU stages: on the device it is the GPU's), one 1/60 s step and one
 *   snapshot fill at a time, as the worker publishes them. Each stage from the runner's own `pipelineMs`, and inside them,
 *   by instance wrappers: the front's line update, the crash and its anchors, the contact's loft build.
 * - The page: the snapshot handed to the page's own `WaterSurface` (Rich, the cubic surface) and `SweptBarrel` as
 *   `main.ts` draws them each frame with a new snapshot (`water.update`, then `drawBarrel`), with the drawing's loft build,
 *   the foam's crests, the mesh's fill and the camera's water timed inside it; the mask's raster is the rest.
 * - Sizes: the snapshot's bytes (transferred, and the counts' filled share), the tube mesh's vertices, triangles and the
 *   bytes its attributes upload a new snapshot (`SweptBarrelMesh.update`'s ranges, Rich).
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { surfZoneConfigFor } from '../../../src/game/PhysicalMode';
import { physicalSettingsFor } from '../../../src/game/SurfConditions';
import { SnapshotSurfZone, type SurfZoneSnapshot } from '../../../src/game/SurfZoneHost';
import { libraryFromBytes } from '../../../src/wave/barrel/barrelLibrary';
import { SweptBarrel } from '../../../src/scene/barrel/SweptBarrel';
import { createContactHit } from '../../../src/wave/barrel/sweptContact';
import { createWaterSample } from '../../../src/physics/SurfWater';
import { PhysicalSurfaceSource } from '../../../src/scene/PhysicalSurfaceSource';
import { WaterSurface } from '../../../src/scene/WaterSurface';
import { SurfZoneRunner } from '../../../src/wave/SurfZoneRunner';
import type { SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';
import { decodeSurfZoneState, encodeSurfZoneState } from '../../../src/wave/surfZoneState';

export interface ArmOptions {
  label: string;
  swell: 'medium' | 'big';
  /** Config overrides (the case, the tube switches), spread over the game's own config. */
  overrides: Record<string, unknown>;
  /** The case files, as the page and the worker get them. */
  barrelCases: Uint8Array[];
  /** The drawing's `TubeFace` (`tubeFaceOf` on this config), or none. */
  face?: unknown;
  statePath: string;
  /** Solver time to reach before measuring (a fresh sea only). */
  settle: number;
  /** Hash every snapshot's bytes and the drawn mesh's (identity runs). */
  hash: boolean;
  /** The page's own switches (`barrelHeight`: 'old'), where its tree has them. */
  page?: Record<string, string>;
}

export interface StepSample {
  [key: string]: number;
}

/** The Rich mesh's floats a vertex (`SweptBarrelMesh.update`): positions, normals, wall, wall normal (3 each), lift, mask,
 * sheet, sheet weight, sheet back (1 each), throat, tube, ray (4 each), exit normal (3). Classic: 16 (no throat to exit). */
export const RICH_FLOATS_PER_VERTEX = 3 + 3 + 3 + 3 + 1 + 1 + 1 + 1 + 1 + 4 + 4 + 4 + 3;
export const CLASSIC_FLOATS_PER_VERTEX = 3 + 3 + 3 + 3 + 1 + 1 + 1 + 1 + 1;

type Timed = { ms: number; calls: number };
function wrap(target: Record<string, unknown> | undefined, name: string, into: Timed): void {
  if (!target || typeof target[name] !== 'function') return;
  const original = (target[name] as (...args: unknown[]) => unknown).bind(target);
  target[name] = (...args: unknown[]) => {
    const t = performance.now();
    try {
      return original(...args);
    } finally {
      into.ms += performance.now() - t;
      into.calls += 1;
    }
  };
}


/**
 * An estimate of the GPU's fragments a frame (pool-barrel-perf; not a GPU measure): the camera 3 m seaward of the rider's
 * start and 1.8 m up, looking at the break point 0.8 m up, 55° tall, 1280 × 720 (Medium; High draws 1.75² as many). The
 * tube mesh rasterized at a quarter of each side (every triangle, both faces, as `DoubleSide` draws them; triangles with a
 * vertex behind the camera left out), its fragments the covered quarter-pixels' layers × 16; the spray as `SprayPoints`
 * sizes its points (Rich: mist × 1.6), each a disc of its size, clamped to 511 px (Metal's point size limit).
 */
const VIEW = { width: 1280, height: 720, fov: 55, scale: 4, maxPoint: 511 } as const;
const layers = new Uint16Array((VIEW.width / VIEW.scale) * (VIEW.height / VIEW.scale));
function cameraOf(eye: number[], target: number[]) {
  const f = [target[0] - eye[0], target[1] - eye[1], target[2] - eye[2]];
  const fl = Math.hypot(f[0], f[1], f[2]);
  f[0] /= fl; f[1] /= fl; f[2] /= fl;
  const r = [f[2], 0, -f[0]];
  const rl = Math.hypot(r[0], r[2]);
  r[0] /= -rl; r[2] /= -rl;
  const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  const focal = VIEW.height / (2 * Math.tan((VIEW.fov * Math.PI) / 360));
  return { eye, f, r, u, focal };
}
function project(c: ReturnType<typeof cameraOf>, x: number, y: number, z: number, out: number[]): boolean {
  const dx = x - c.eye[0], dy = y - c.eye[1], dz = z - c.eye[2];
  const depth = dx * c.f[0] + dy * c.f[1] + dz * c.f[2];
  if (!(depth > 0.1)) return false;
  out[0] = VIEW.width / 2 + (c.focal * (dx * c.r[0] + dy * c.r[1] + dz * c.r[2])) / depth;
  out[1] = VIEW.height / 2 - (c.focal * (dx * c.u[0] + dy * c.u[1] + dz * c.u[2])) / depth;
  out[2] = depth;
  return true;
}
export function screenFragments(camera: ReturnType<typeof cameraOf>, loft: { positions: Float32Array; indices: Uint32Array; indexCount: number } | undefined,
  spray: Float32Array, sprayCount: number, rich: boolean): { tube: number; tubeCovered: number; spray: number } {
  layers.fill(0);
  const w = VIEW.width / VIEW.scale, h = VIEW.height / VIEW.scale;
  const a = [0, 0, 0], b = [0, 0, 0], cc = [0, 0, 0];
  if (loft) {
    const p = loft.positions;
    for (let t = 0; t < loft.indexCount; t += 3) {
      const i = loft.indices[t], j = loft.indices[t + 1], k = loft.indices[t + 2];
      if (!project(camera, p[3 * i], p[3 * i + 1], p[3 * i + 2], a) || !project(camera, p[3 * j], p[3 * j + 1], p[3 * j + 2], b)
        || !project(camera, p[3 * k], p[3 * k + 1], p[3 * k + 2], cc)) continue;
      const ax = a[0] / VIEW.scale, ay = a[1] / VIEW.scale, bx = b[0] / VIEW.scale, by = b[1] / VIEW.scale, cx = cc[0] / VIEW.scale, cy = cc[1] / VIEW.scale;
      const area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
      if (area === 0) continue;
      const x0 = Math.max(0, Math.ceil(Math.min(ax, bx, cx) - 0.5)), x1 = Math.min(w - 1, Math.floor(Math.max(ax, bx, cx) - 0.5));
      const y0 = Math.max(0, Math.ceil(Math.min(ay, by, cy) - 0.5)), y1 = Math.min(h - 1, Math.floor(Math.max(ay, by, cy) - 0.5));
      for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) {
        const px = x + 0.5, py = y + 0.5;
        const u = ((px - ax) * (cy - ay) - (cx - ax) * (py - ay)) / area;
        const v = ((bx - ax) * (py - ay) - (px - ax) * (by - ay)) / area;
        if (u >= 0 && v >= 0 && u + v <= 1) layers[y * w + x] += 1;
      }
    }
  }
  let tube = 0, covered = 0;
  for (let q = 0; q < layers.length; q += 1) { tube += layers[q]; if (layers[q] > 0) covered += 1; }
  let sprayFragments = 0;
  for (let k = 0; k < sprayCount; k += 1) {
    const o = 6 * k;
    const kind = spray[o + 5];
    if ((kind >= 2 && !rich) || kind === 2) continue;
    if (!project(camera, spray[o], spray[o + 1], spray[o + 2], a)) continue;
    const mist = rich && (Math.abs(kind - 1) < 0.5 || Math.abs(kind - 4) < 0.5) ? 1.6 : 1;
    const size = Math.min(VIEW.maxPoint, Math.max(1, (spray[o + 3] * mist * camera.focal) / Math.max(0.1, a[2])));
    if (a[0] + size / 2 < 0 || a[0] - size / 2 > VIEW.width || a[1] + size / 2 < 0 || a[1] - size / 2 > VIEW.height) continue;
    sprayFragments += (Math.PI / 4) * size * size;
  }
  return { tube: tube * VIEW.scale * VIEW.scale, tubeCovered: covered * VIEW.scale * VIEW.scale, spray: sprayFragments };
}

/**
 * The estimate's second camera, a rider's in the open tube: the drawn loft's open slice (phase 1, weight ≥ 0.5) nearest
 * life 0.5, at the middle of its lip's tip and its toe (profile points 64 and 112), looking at the same place 8 slices on
 * toward the younger end (the shoulder); undefined where no slice is open.
 */
function tubeCamera(loft: { sliceCount: number; slicePhase: Uint8Array; sliceWeight: Float32Array; sliceLife: Float32Array; sliceTau: Float32Array;
  sliceJoined: Uint8Array; positions: Float32Array } | undefined) {
  if (!loft) return undefined;
  let best = -1;
  for (let s = 0; s < loft.sliceCount; s += 1) {
    if (loft.slicePhase[s] !== 1 || !(loft.sliceWeight[s] >= 0.5)) continue;
    if (best < 0 || Math.abs(loft.sliceLife[s] - 0.5) < Math.abs(loft.sliceLife[best] - 0.5)) best = s;
  }
  if (best < 0) return undefined;
  const inside = (s: number) => {
    const o = 3 * (s * 134 + 3);
    const p = loft.positions;
    return [0.5 * (p[o + 3 * 64] + p[o + 3 * 112]), 0.5 * (p[o + 3 * 64 + 1] + p[o + 3 * 112 + 1]), 0.5 * (p[o + 3 * 64 + 2] + p[o + 3 * 112 + 2])];
  };
  const ahead = Math.min(loft.sliceCount - 1, best + 8);
  const behind = Math.max(0, best - 8);
  const target = loft.sliceTau[ahead] < loft.sliceTau[behind] ? ahead : behind;
  if (target === best) return undefined;
  return cameraOf(inside(best), inside(target));
}

export async function createArm(o: ArmOptions) {
  const settings = physicalSettingsFor('pool', { swell: o.swell, tide: 'mid', wind: 'calm', time: 'midday', waves: 'barrel' } as never, { stage: 2, compute: 'auto' });
  const config = { ...surfZoneConfigFor(settings as never, 8761, true), ...o.overrides } as SurfZoneConfig;
  const runner = SurfZoneRunner.forWorker(config, { board: true, contact: true, barrelCases: o.barrelCases } as never, 'warm');
  const sim = runner.simulation as unknown as Record<string, any>;
  if (existsSync(o.statePath)) {
    sim.importState(decodeSurfZoneState(new Uint8Array(readFileSync(o.statePath))));
    await runner.spinUp();
  } else {
    await runner.spinUp();
    while (sim.solver.time < o.settle) runner.advance(1);
    writeFileSync(o.statePath, encodeSurfZoneState(sim.exportState()));
    sim.importState(decodeSurfZoneState(new Uint8Array(readFileSync(o.statePath))));
  }
  // The inner stages' timers.
  const t = {
    frontLine: { ms: 0, calls: 0 }, crash: { ms: 0, calls: 0 }, anchors: { ms: 0, calls: 0 }, shifts: { ms: 0, calls: 0 },
    contactLoft: { ms: 0, calls: 0 }, sample: { ms: 0, calls: 0 },
    drawLoft: { ms: 0, calls: 0 }, broken: { ms: 0, calls: 0 }, mesh: { ms: 0, calls: 0 }, cameraWater: { ms: 0, calls: 0 },
  };
  wrap(sim.front, 'update', t.frontLine);
  wrap(sim.crash, 'update', t.crash);
  wrap(sim.crash?.geometry, 'prepareAnchors', t.anchors);
  wrap(sim.crash?.geometry, 'prepareShifts', t.shifts);
  const contact = (runner as unknown as Record<string, any>).contact;
  wrap(contact?.loft, 'build', t.contactLoft);
  // The water the device would get before the next step (canyon-perf's `markWater`): the CPU solver's step marks all of it,
  // so here each step's water is taken as held once stepped, as the device's unpack does; what the rest of the step (a
  // lip's launch or landing, a board's push) marks after it is what the next device step would upload.
  const solverStep = sim.solver.step.bind(sim.solver);
  sim.solver.step = (dt: number) => { solverStep(dt); sim.solver.waterHeld(); };
  // The bodies' water samples: counted (the board in the lineup), not timed one by one (the timer would cost more).
  let samples = 0;
  const water = (runner as unknown as Record<string, any>).water;
  const sampleAt = water.sampleAt.bind(water);
  water.sampleAt = (...args: unknown[]) => { samples += 1; return sampleAt(...args); };

  // The estimate's camera (`screenFragments`).
  const lineup = (runner as unknown as Record<string, any>).rideLineup as { x: number; z: number };
  const camera = cameraOf([lineup.x, 1.8, lineup.z - 3], [runner.focus.x, 0.8, runner.focus.z]);
  let stepIndex = 0;
  // The page.
  const buffers = runner.createBuffers();
  runner.fill(buffers);
  const host = {
    config,
    init: { grid: { ...runner.grid }, bed: runner.bed, focus: runner.focus, windowXMin: runner.windowXMin, dx: sim.solver.dx },
    snapshot: { ...buffers, status: runner.status() } as SurfZoneSnapshot,
  };
  const surface = new WaterSurface(new PhysicalSurfaceSource(new SnapshotSurfZone(host as never, { sweptBarrel: true }), host.init.grid.spacing));
  surface.setLook('rich');
  const bytes = o.barrelCases;
  const barrel = new (SweptBarrel as unknown as new (...args: unknown[]) => SweptBarrel)(surface, async () => libraryFromBytes(bytes, config.tubeShape, 'pool'),
    undefined, o.page?.cameraWater === 'old' ? 'old' : 'fast');
  (barrel.setSpot as (...a: unknown[]) => void)('pool', true, o.face);
  await barrel.ready;
  const b = barrel as unknown as Record<string, any>;
  if (o.page?.barrelHeight === 'old') b.heights = 'old';
  if (o.page?.barrelMesh === 'old') b.mesh.faces = 'old';
  if (o.page?.particles) runner.setParticleLevel(o.page.particles as never);
  wrap(b.loft, 'build', t.drawLoft);
  wrap(b.broken, 'update', t.broken);
  wrap(b.mesh, 'update', t.mesh);
  wrap(b.cameraWater, 'prepare', t.cameraWater);

  const snapshotHash = createHash('sha256');
  const meshHash = createHash('sha256');
  const geometry = barrel.mesh.mesh.geometry;
  const transferBytes = () => {
    let n = 0;
    for (const [, value] of Object.entries(buffers)) if (ArrayBuffer.isView(value)) n += value.byteLength;
    return n;
  };

  function step(): StepSample {
    for (const timer of Object.values(t)) { timer.ms = 0; timer.calls = 0; }
    samples = 0;
    const w0 = performance.now();
    runner.advance(1);
    runner.fill(buffers);
    const status = runner.status();
    const workerWall = performance.now() - w0;
    const solver = sim.solver;
    const cells = solver.nx * solver.nz;
    const deviceUpload = solver.waterChangedAll ? 3 * 4 * cells
      : solver.waterChangedFrom <= solver.waterChangedTo ? 3 * 4 * (solver.waterChangedTo - solver.waterChangedFrom + 1) : 0;
    const uploadAll = solver.waterChangedAll ? 1 : 0;
    host.snapshot = { ...buffers, status };
    const p = status.pipelineMs!;
    // The page's frame with a new snapshot: the water's upload, then the barrel's draw.
    let c = performance.now();
    surface.update();
    const waterMs = performance.now() - c;
    c = performance.now();
    barrel.draw(host.snapshot.front, host.snapshot.frontCount, config.tide ?? 0, status);
    const drawMs = performance.now() - c;
    const loft = barrel.lastLoft;
    const vertices = loft?.vertexCount ?? 0;
    const indices = loft?.indexCount ?? 0;
    const contactLast = contact?.last;
    if (o.hash) {
      for (const array of [buffers.surface, buffers.flow, buffers.aeration, buffers.lip, buffers.tubes, buffers.bubbles, buffers.spray,
        buffers.board, buffers.rider, buffers.lipHits, buffers.strokeHits, buffers.roar, buffers.reaction, buffers.front, buffers.roller, buffers.curl]) {
        snapshotHash.update(new Uint8Array(array.buffer, array.byteOffset, array.byteLength));
      }
      snapshotHash.update(JSON.stringify([buffers.lipCount, buffers.tubeCount, buffers.bubbleCount, buffers.sprayCount, buffers.lipHitCount,
        buffers.strokeHitCount, buffers.frontCount, buffers.rollerCount, buffers.curlCount, status.breakingFraction, status.lipLaunches, status.spray]));
      for (const name of Object.keys(geometry.attributes).sort()) {
        const attribute = geometry.getAttribute(name) as { array: Float32Array; itemSize: number };
        meshHash.update(name);
        meshHash.update(new Uint8Array(attribute.array.buffer, 0, Math.min(attribute.array.byteLength, 4 * attribute.itemSize * vertices)));
      }
      const index = geometry.getIndex()!.array as Uint32Array;
      meshHash.update(new Uint8Array(index.buffer, 0, 4 * indices));
      meshHash.update(JSON.stringify([geometry.drawRange.start, geometry.drawRange.count, barrel.mesh.mesh.visible]));
      // The worker's answers through the tube (identity of the contact's lazy rows): at every 5th drawn slice, 12 points along
      // its profile 5 cm either side of it, the contact's query and floor, and the water's full sample there.
      if (loft && contact) {
        const P = loft.positions;
        const hit = createContactHit() as unknown as Record<string, unknown>;
        const sample = createWaterSample() as unknown as Record<string, unknown>;
        const answers: number[] = [];
        for (let sl = 0; sl < loft.sliceCount; sl += 5) {
          for (let k = 0; k < 128; k += 11) {
            const o = 3 * (sl * 134 + 3 + k);
            for (const dy of [-0.05, 0.05]) {
              const x = P[o], y = P[o + 1] + dy, z = P[o + 2];
              const found = contact.query(x, y, z, hit as never);
              answers.push(found ? 1 : 0, contact.floorAt(x, z));
              if (found) for (const key of Object.keys(hit).sort()) { const v = hit[key]; answers.push(typeof v === 'number' ? v : v ? 1 : 0); }
              water.sampleAt(x, y, z, sample as never);
              for (const key of Object.keys(sample).sort()) { const v = sample[key]; if (typeof v === 'number') answers.push(v); else if (typeof v === 'boolean') answers.push(v ? 1 : 0); }
            }
          }
        }
        snapshotHash.update(new Uint8Array(Float64Array.from(answers).buffer));
      }
      const mask = b.mask as Uint8Array;
      meshHash.update(mask);
      // The camera's water/air answers (`BarrelWater`) at points through the tube: every 7th slice's lip-to-toe middle, its
      // crest 0.4 m up, and the points between them, with two margins.
      if (loft) {
        const answers: number[] = [];
        const P = loft.positions;
        for (let sl = 0; sl < loft.sliceCount; sl += 7) {
          const o = 3 * (sl * 134 + 3);
          const mx = 0.5 * (P[o + 192] + P[o + 336]), my = 0.5 * (P[o + 193] + P[o + 337]), mz = 0.5 * (P[o + 194] + P[o + 338]);
          for (let k = 0; k <= 8; k += 1) {
            const t = k / 8;
            const x = mx + t * (P[o + 96] - mx), y = my + t * (P[o + 97] + 0.4 - my), z = mz + t * (P[o + 98] - mz);
            for (const margin of [0, 0.1]) {
              const a = barrel.waterAt(x, y, z, margin);
              answers.push(a === undefined ? 2 : a ? 1 : 0);
            }
          }
        }
        meshHash.update(Uint8Array.from(answers));
      }
    }
    const cpuStages = p.step - p.water + p.snapshot + p.summary;
    stepIndex += 1;
    const frags = stepIndex % 4 === 0 ? screenFragments(camera, barrel.mesh.mesh.visible ? loft : undefined, buffers.spray, buffers.sprayCount, true) : undefined;
    const inTube = stepIndex % 4 === 0 && barrel.mesh.mesh.visible ? tubeCamera(loft as never) : undefined;
    const tubeFrags = inTube ? screenFragments(inTube, loft, buffers.spray, buffers.sprayCount, true) : undefined;
    return {
      workerWall, cpuStages, water: p.water, breaking: p.breaking, roller: (p as unknown as StepSample).roller ?? 0, front: p.front,
      frontLine: t.frontLine.ms, crash: t.crash.ms, anchors: t.anchors.ms, shifts: t.shifts.ms, lip: p.lip, foam: p.foam,
      airSources: p.airSources, aeration: p.aeration, contact: p.contact, contactLoft: t.contactLoft.ms, board: p.board,
      bubbles: p.bubbles, spray: p.spray, sounds: p.sounds, snapshotFields: p.snapshotFields, snapshot: p.snapshot, summary: p.summary,
      samples,
      pageWater: waterMs, pageDraw: drawMs, drawLoft: t.drawLoft.ms, broken: t.broken.ms, mesh: t.mesh.ms, cameraWater: t.cameraWater.ms,
      mask: drawMs - t.drawLoft.ms - t.broken.ms - t.mesh.ms - t.cameraWater.ms,
      builds: t.drawLoft.calls,
      frontCount: buffers.frontCount, slices: loft?.sliceCount ?? 0, vertices, triangles: indices / 3,
      contactSlices: contactLast?.sliceCount ?? 0, contactVertices: contactLast?.vertexCount ?? 0,
      uploadRich: barrel.mesh.mesh.visible ? 4 * RICH_FLOATS_PER_VERTEX * vertices + 4 * indices : 0,
      transfer: transferBytes(),
      deviceUpload, uploadAll, tubeFragments: frags ? frags.tube : Number.NaN, tubeCovered: frags ? frags.tubeCovered : Number.NaN, sprayFragments: frags ? frags.spray : Number.NaN, inTubeMesh: tubeFrags ? tubeFrags.tube : Number.NaN, inTubeSpray: tubeFrags ? tubeFrags.spray : Number.NaN, sprayCount: buffers.sprayCount, bubbleCount: buffers.bubbleCount, lipCount: buffers.lipCount, lipLaunches: status.lipLaunches,
      maskBytes: (b.mask as Uint8Array).length,
    };
  }

  return {
    label: o.label, config, runner, step,
    hashes: () => ({ snapshots: snapshotHash.digest('hex').slice(0, 16), mesh: meshHash.digest('hex').slice(0, 16) }),
    grid: () => `${sim.solver.nx} × ${sim.solver.nz} cells, render ${runner.grid.nx} × ${runner.grid.nz}, t ${sim.solver.time.toFixed(2)}`,
  };
}
