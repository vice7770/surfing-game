// Pure postprocessing of the retained quality capture; never launches a browser.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const input = process.argv[2] ?? fileURLToPath(new URL('report.json.gz', import.meta.url));
const file = readFileSync(input);
const bytes = input.endsWith('.gz') ? gunzipSync(file) : file;
const r = JSON.parse(bytes);
if (r.runs.length !== 2 || r.runs[0].label !== 'dx2' || r.runs[1].label !== 'dx4') throw Error('Expected dx2/dx4 capture');
const roiColumns = run => {
  const dx = run.initial.config.dx, nx = run.initial.config.alongShore / dx;
  const xMin = run.initial.windowXMin, focus = r.commonProbe.focus.x, x = [];
  for (let i = 0; i < nx; i++) {
    const center = xMin + (i + .5) * dx;
    if (Math.abs(center - focus) <= 40) x.push(center);
  }
  return { count: x.length, firstCenter: x[0], lastCenter: x.at(-1),
    fullCellSupport: [x[0] - dx / 2, x.at(-1) + dx / 2], widthM: x.length * dx };
};
const summary = {
  schema: 1,
  rawSha256: createHash('sha256').update(bytes).digest('hex'),
  rawValid: r.valid,
  limitations: [
    'Finite/clocks/source guards passing is not physics-quality acceptance or FPS evidence.',
    'NearBreak sums use all of each cell whose center is inside the inclusive ROI. The grids cover different actual ROI support.',
    'Peak matching uses sampled local maxima at 0.5 m z intervals; unmatched peaks remain visible.',
    'cuts includes all unjoined adjacent slices, not only overlap removal. overlapsOpen is distinct from overlaps.',
    'endWeightMax is the helper endpoint indicator, not an independently measured seam gap.',
  ],
  runs: r.runs.map(run => ({ label: run.label, cells: run.start.status.cells,
    completedSteps: run.checkpoints.at(-1).fixedSteps, initialClock: run.start.physical.clock,
    finalClock: run.checkpoints.at(-1).physical.clock, advancingWallSeconds: run.elapsedWallSeconds,
    events: run.events, observed: run.initial.observed, contactProof: run.contactProof,
    bundle: run.bundle, roiColumns: roiColumns(run),
    domainWet: [run.start, ...run.checkpoints].map(c => ({ at: c.at, areaM2: c.physical.domain.wetAreaM2 })),
  })),
  comparisons: r.comparisons.map(c => ({ at: c.at,
    clocks: [c.sameSeaTime, c.sameSolverTime, c.sameSeaTimeOffset],
    breakBandHeightM: c.breakBandHeightM, breakBandSlope: c.breakBandSlope,
    crestNeighborhoodHeightM: c.fineCrestNeighborhoodHeightM,
    matchedPeaks: c.crestPeaks.matched, unmatchedPeaks: c.crestPeaks.unmatched,
    matchedPeakHeightM: c.crestPeaks.heightDifferenceM, matchedPeakPhaseM: c.crestPeaks.positionDifferenceM,
    nearBreak: c.nearBreakPhysical, domain: c.domainPhysical, launches: c.launches,
    onset: c.onset, front: c.front, geometry: c.tubeGeometry,
  })),
};
const output = JSON.stringify(summary, null, 2) + '\n';
if (process.argv[3]) writeFileSync(process.argv[3], output); else process.stdout.write(output);
