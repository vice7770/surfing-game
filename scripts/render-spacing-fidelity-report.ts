/**
 * Compare render spacing on an identical frozen physical state, without advancing a solver or launching a browser.
 *
 * ./node_modules/.bin/rolldown scripts/render-spacing-fidelity-report.ts -o /private/tmp/render-spacing-fidelity.mjs --format esm --platform node
 * node /private/tmp/render-spacing-fidelity.mjs --input /private/tmp/tube-live-original --out docs/research/performance-2026-10-03/render-spacing-fidelity.json
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { WaterSurface } from '../src/scene/WaterSurface';
import { rasterizeBarrelMask } from '../src/scene/barrel/barrelMask';
import { sampleCubicSurface } from '../src/scene/water/cubicSurface';

const option = (name: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
};
const input = option('input') ?? '/private/tmp/tube-live-original';
const frames = (option('frames') ?? '10,15,20').split(',').map(Number);

type Point = { x: number; z: number };
const summary = (values: number[]) => {
  const ordered = [...values].sort((a, b) => a - b);
  return { count: values.length, rms: Math.sqrt(values.reduce((s, x) => s + x*x, 0) / values.length),
    p95: ordered[Math.floor((ordered.length - 1) * .95)], max: ordered.at(-1) };
};
const runs = [];
for (const at of frames) {
  const name = `at-${at}.json`;
  const bytes = readFileSync(join(input, name));
  const d = JSON.parse(bytes.toString('utf8'));
  const fineGrid = d.waterGrid;
  const fine = Float32Array.from(d.surfaceData);
  if (fineGrid.spacing !== 1 || fineGrid.nx % 2 !== 1 || fineGrid.nz % 2 !== 1) throw new Error('Capture grid does not nest at 2 m');
  const coarseGrid = { ...fineGrid, spacing: 2, nx: (fineGrid.nx + 1) / 2, nz: (fineGrid.nz + 1) / 2 };
  const coarse = new Float32Array(2 * coarseGrid.nx * coarseGrid.nz);
  for (let k = 0; k < coarseGrid.nz; k++) for (let i = 0; i < coarseGrid.nx; i++) {
    const a = 2 * ((2*k) * fineGrid.nx + 2*i); const b = 2 * (k * coarseGrid.nx + i);
    coarse[b] = fine[a]; coarse[b+1] = fine[a+1];
  }
  const water = new WaterSurface({
    grid: coarseGrid, time:d.status.seaTime, bedRevision:0,
    write:(data) => data.fill(0), writeBed:(data) => data.fill(-7),
  });
  const maskGrid = water.barrelMaskGrid;
  for (const key of ['xMin','zMin','spacing','nx','nz'] as const) {
    if (maskGrid[key] !== fineGrid[key]) throw new Error(`Changed mask ${key}`);
  }
  const originalMask = new Uint8Array(fineGrid.nx * fineGrid.nz);
  const variantMask = new Uint8Array(maskGrid.nx * maskGrid.nz);
  const maskedNodes = d.loft ? rasterizeBarrelMask(d.loft, fineGrid, originalMask) : 0;
  if (d.loft) rasterizeBarrelMask(d.loft, maskGrid, variantMask);
  const maskDifferences = originalMask.reduce((count,value,node) => count + Number(value !== variantMask[node]), 0);
  water.setBarrelMask(variantMask);
  const texture = water.materialUniforms.waterBarrelMask.value as { image:{ data:Uint8Array } };
  const uploadedDifferences = originalMask.reduce((count,value,node) => count + Number(value !== texture.image.data[node]), 0);
  const mask = { originalWaterNodes:fineGrid.nx * fineGrid.nz, coarseWaterNodes:coarseGrid.nx * coarseGrid.nz,
    grid:maskGrid, nodes:variantMask.length, maskedNodes, maskDifferences, uploadedDifferences };
  water.dispose();
  const f = (x: number, z: number) => sampleCubicSurface(fine, fineGrid, x, z);
  const c = (x: number, z: number) => sampleCubicSurface(coarse, coarseGrid, x, z);
  const focus = d.status.breakPoint;
  const band: Point[] = [];
  for (let x = focus.x - 50 + .37; x <= focus.x + 50; x += 1)
    for (let z = focus.z - 100 + .61; z <= focus.z + 100; z += 1) band.push({ x, z });
  const crestNeighborhoods: Point[] = [];
  const crests = [];
  for (let x = focus.x - 40; x <= focus.x + 40; x += 4) {
    const candidates = [];
    for (let z = focus.z - 90; z <= focus.z + 90; z += .5) {
      const height = f(x, z).height;
      if (height > .2 && height >= f(x, z - .5).height && height > f(x, z + .5).height)
        candidates.push({ x, z, height });
    }
    candidates.sort((a, b) => b.height - a.height);
    const selected: typeof candidates = [];
    for (const p of candidates) if (selected.every((old) => Math.abs(old.z - p.z) >= 20)) {
      selected.push(p); if (selected.length === 2) break;
    }
    for (const p of selected) {
      let peakFine = { z: p.z, height: -Infinity };
      let peakCoarse = { z: p.z, height: -Infinity };
      for (let z = p.z - 3; z <= p.z + 3; z += .125) {
        const fineHeight = f(x, z).height; const coarseHeight = c(x, z).height;
        if (fineHeight > peakFine.height) peakFine = { z, height: fineHeight };
        if (coarseHeight > peakCoarse.height) peakCoarse = { z, height: coarseHeight };
      }
      crests.push({ x, ...peakFine, coarseHeight: peakCoarse.height, heightError: peakCoarse.height - peakFine.height,
        positionError: peakCoarse.z - peakFine.z });
      for (let z = p.z - 8 + .23; z <= p.z + 8; z += .5) crestNeighborhoods.push({ x: x+.37, z });
    }
  }
  const measure = (points: Point[]) => {
    const height = [], slope = [], normalAngleDegrees = [];
    let worstHeight: Record<string, unknown> = {}; let largest = 0;
    for (const p of points) {
      const a=f(p.x,p.z), b=c(p.x,p.z); const dh=Math.abs(a.height-b.height);
      height.push(dh); slope.push(Math.hypot(a.slopeX-b.slopeX,a.slopeZ-b.slopeZ));
      const dot=(1+a.slopeX*b.slopeX+a.slopeZ*b.slopeZ) /
        (Math.hypot(a.slopeX,1,a.slopeZ)*Math.hypot(b.slopeX,1,b.slopeZ));
      normalAngleDegrees.push(Math.acos(Math.max(-1, Math.min(1,dot)))*180/Math.PI);
      if (dh>largest) {largest=dh; worstHeight={...p,fine:a,coarse:b};}
    }
    return { heightMeters:summary(height), slope:summary(slope), normalAngleDegrees:summary(normalAngleDegrees), worstHeight };
  };
  runs.push({ at, fixture:{ name, sha256:createHash('sha256').update(bytes).digest('hex'), capturedAt:d.capturedAt },
    seaTime:d.status.seaTime, config:d.config, focus, fineGrid, coarseGrid, mask,
    breakBand:measure(band), crestNeighborhoods:measure(crestNeighborhoods),
    crestPeaks:{ count:crests.length, fineHeightRange:[Math.min(...crests.map(p=>p.height)),Math.max(...crests.map(p=>p.height))],
      heightMeters:summary(crests.map(p=>Math.abs(p.heightError))), positionMeters:summary(crests.map(p=>Math.abs(p.positionError))),
      worst:crests.toSorted((a,b)=>Math.abs(b.heightError)-Math.abs(a.heightError)).slice(0,3) } });
}
const result = { method:'Frozen original physical snapshot; 2 m nodes are exact nested samples of the 1 m snapshot. CPU mirror of Rich Catmull-Rom height/slope, no simulation advance. Break band ±50 m alongshore and ±100 m crossshore; crest neighborhoods ±8 m about the two tallest crests per 4 m transect.',
  limitation:'Hs4m/T10s/64component mixed sea captures at three instants. Render interpolation only; excludes swept-loft reshaping on changed heightAt, FFT chop, light/shader slope interpolation, foam aliasing, and live rider dynamics.',runs };
const out = option('out');
if (out) writeFileSync(out, `${JSON.stringify(result,null,2)}\n`);
console.log(JSON.stringify(result,null,2));
