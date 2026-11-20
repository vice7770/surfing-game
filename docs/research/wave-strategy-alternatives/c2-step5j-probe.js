// C2 step 5j, the bubble-layer probe. Evaluated in the water sheet dev view by
// `headless-shot.mjs sheet --probe=<this file>`, in the SAME held sea the stills are shot from, so the field it reads
// is the field those pixels were drawn with and not a second run's.
//
// Why it exists: step 5i §10 item 2 says the foam's reflectance should come from the number of bubble layers along
// the view path, N = alpha*h/d_bubble, through R(N) = 0.55*(1 - exp(-0.2 N)), because `AerationField` "already
// carries the void fraction AND the plume depth, so N is arithmetic on fields that exist". That is a claim about the
// VALUES in those two channels, and it has never been read. This reads them.
//
// What it dumps, per render node (the nodes the Rich vertex shader samples, `waterAerationAt`), over the nodes where
// the drawn foam cover is above 0.01:
//   - alpha, the drawn void fraction (`aerationData[2i]`) -- what `vWaterAir` interpolates;
//   - plume, the drawn plume depth, m (`aerationData[2i+1]`) -- what `vWaterPlumeDepth` interpolates;
//   - h, that depth clamped at the water's own (`plumeReach`), which is what the fragment uses;
//   - foam, the drawn cover (`surfaceData[2i+1]`) -- what `vWaterFoam` interpolates, and it can exceed 1;
//   - N = alpha*h/d_bubble + min(foam,1), and R(N);
//   - step 5i's own aged value at the same node, for the comparison, from the same brackets its GLSL uses.
// Populations and percentiles, never a single node.
const w = window;
const water = w.waterSheetWater;
const grid = water.grid;
const nx = grid.nx;
const nz = grid.nz;
const air = water.aerationData;
const surf = water.surfaceData;
const bed = water.bedData;

// Deane & Stokes 2002, through docs/research/whitewater-sources.md: the bubbles that carry most of the void fraction
// have radii above about 0.5 mm, so a layer is about 1 mm thick.
const D_BUBBLE = 0.001;
const CEILING = 0.55;
const K = 0.2;
const R = (N) => CEILING * (1 - Math.exp(-K * N));

// Step 5i's two sourced ends and the youth brackets its GLSL writes out (foamFreshness.ts YOUTH_AIR / YOUTH_COVER).
const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const youthOf = (a, f) => Math.max(smoothstep(0.004, 0.05, a), smoothstep(0.7, 0.98, f));
const r5i = (a, f) => 0.18 + (0.50 - 0.18) * youthOf(a, f);

const rows = [];
for (let i = 0; i < nx * nz; i += 1) {
  const foam = surf[2 * i + 1];
  if (!(foam > 0.01)) continue;
  const depth = Math.max(0, surf[2 * i] - bed[i]);
  const alpha = air[2 * i];
  const plume = air[2 * i + 1];
  const h = Math.max(0, Math.min(plume, depth));
  const nPlume = (alpha * h) / D_BUBBLE;
  const nFilm = Math.min(1, Math.max(0, foam));
  const N = nPlume + nFilm;
  rows.push({ i, alpha, plume, depth, h, foam, nPlume, N, r: R(N), r5i: r5i(alpha, foam) });
}

const pct = (v, p) => (v.length ? v[Math.min(v.length - 1, Math.max(0, Math.round((p / 100) * (v.length - 1))))] : NaN);
const round = (x, n = 4) => (Number.isFinite(x) ? +x.toFixed(n) : null);
function stats(name, pick) {
  const v = rows.map(pick).sort((a, b) => a - b);
  const mean = v.reduce((s, a) => s + a, 0) / (v.length || 1);
  return {
    field: name, n: v.length, mean: round(mean),
    p5: round(pct(v, 5)), p25: round(pct(v, 25)), median: round(pct(v, 50)), p75: round(pct(v, 75)), p95: round(pct(v, 95)),
    min: round(v[0]), max: round(v[v.length - 1]),
  };
}

// Where N is: saturated (above 25 layers, the sourced ">25 layers = 0.55"), graded, or a film of about one layer.
const bucket = (lo, hi) => rows.filter((r) => r.N >= lo && r.N < hi).length;
const buckets = {
  'N < 1 (less than one layer)': bucket(0, 1),
  'N 1-2 (a film, R about 0.10-0.18)': bucket(1, 2),
  'N 2-5': bucket(2, 5),
  'N 5-12 (0.18 to 0.50, step 5i\'s whole range)': bucket(5, 12),
  'N 12-25': bucket(12, 25),
  'N >= 25 (saturated, R >= 0.546)': rows.filter((r) => r.N >= 25).length,
};

// Cover-weighted means, because a node with a cover of 0.1 paints a tenth as much white as one with a cover of 1.
const coverSum = rows.reduce((s, r) => s + Math.min(1, r.foam), 0) || 1;
const weighted = (pick) => rows.reduce((s, r) => s + Math.min(1, r.foam) * pick(r), 0) / coverSum;

return {
  what: 'C2 step 5j: the drawn bubble-layer count over the render nodes carrying foam, in the held frame the stills come from',
  search: String(w.location.search),
  seconds: w.waterSheetSeconds ?? null,
  grid: { nx, nz, xMin: round(grid.xMin, 2), zMin: round(grid.zMin, 2), spacing: round(grid.spacing, 3) },
  nodes: { total: nx * nz, withFoam: rows.length },
  d_bubble_m: D_BUBBLE,
  stats: [
    stats('alpha (void fraction, drawn)', (r) => r.alpha),
    stats('plume depth, m (drawn channel)', (r) => r.plume),
    stats('water depth, m', (r) => r.depth),
    stats('h = min(plume, depth), m', (r) => r.h),
    stats('foam cover (drawn)', (r) => r.foam),
    stats('N_plume = alpha*h/d', (r) => r.nPlume),
    stats('N total', (r) => r.N),
    stats('R(N)', (r) => r.r),
    stats('step 5i aged value at the same node', (r) => r.r5i),
  ],
  buckets,
  coverWeightedMean: { 'R(N)': round(weighted((r) => r.r)), 'step 5i': round(weighted((r) => r.r5i)) },
  // A handful of nodes, the brightest and the dimmest by R, so the numbers above can be read against real nodes.
  sample: {
    brightest: rows.slice().sort((a, b) => b.r - a.r).slice(0, 5)
      .map((r) => ({ alpha: round(r.alpha), plume: round(r.plume, 3), h: round(r.h, 3), foam: round(r.foam, 3), N: round(r.N, 1), R: round(r.r), r5i: round(r.r5i) })),
    dimmest: rows.slice().sort((a, b) => a.r - b.r).slice(0, 5)
      .map((r) => ({ alpha: round(r.alpha), plume: round(r.plume, 3), h: round(r.h, 3), foam: round(r.foam, 3), N: round(r.N, 1), R: round(r.r), r5i: round(r.r5i) })),
  },
};
