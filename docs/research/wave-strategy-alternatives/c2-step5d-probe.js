// C2 step 5d, the frustum probe (ruling 39 §"Next, in order" item 1). Evaluated in the water sheet dev view by
// `headless-shot.mjs sheet --probe=<this file>`, in the same held sea the stills come from.
//
// It dumps, from the page in the very frame a still would be shot:
//  - every shot camera's eye and target (`waterSheetShots`), so the frustum test uses the real cameras;
//  - the render grid, and the (height, foam) field the material is drawn from, as it reaches the page;
//  - the aeration field (air fraction, plume depth) beside it.
//
// The bore foam's own nodes are the difference between two legs of this probe — the branch as it stands, and the same
// with the bore's foam switched off — so nothing here has to reach into the worker's zone. Both fields come back as
// base64 Float32 so the diff is exact to the bit.
const w = window;
const water = w.waterSheetWater;
const grid = water.grid;

/** A Float32Array as base64, in chunks so the spread never overflows the stack. */
const pack = (array) => {
  const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
  let s = '';
  for (let k = 0; k < bytes.length; k += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(k, k + 0x8000));
  return btoa(s);
};

const shots = w.waterSheetShots.map((s) => ({
  name: s.name,
  eye: [+s.eye.x.toFixed(4), +s.eye.y.toFixed(4), +s.eye.z.toFixed(4)],
  target: [+s.target.x.toFixed(4), +s.target.y.toFixed(4), +s.target.z.toFixed(4)],
}));

// The held curl's own slices, so the cameras can be read against the wave they were placed on.
const curl = w.waterSheetCurl ? w.waterSheetCurl() : undefined;

// The drawn loft's landed slices: where the bore foam is written, and how old each one's white is. The bore cameras
// are placed from these, so a still that misses can be read against the numbers without another run.
const loft = w.waterSheetMode ? w.waterSheetMode.barrelLoft : undefined;
const landed = [];
if (loft) {
  for (let s = 0; s < loft.sliceCount; s += 1) {
    if (loft.slicePhase[s] !== 2) continue;
    // `landmark()`'s arithmetic: LOFT_SAMPLES = PROFILE_POINTS + 2 × extensionSamples, then the crest landmark.
    const v = 3 * (s * (128 + 2 * 3) + 3 + 32);
    landed.push({
      slice: s, front: loft.sliceFront[s], sigma: +loft.sliceSigma[s].toFixed(2), after: +loft.sliceAfter[s].toFixed(3),
      weight: +loft.sliceWeight[s].toFixed(3),
      crest: [+loft.positions[v].toFixed(2), +loft.positions[v + 1].toFixed(2), +loft.positions[v + 2].toFixed(2)],
    });
  }
}

const out = {
  search: w.location.search,
  seconds: w.waterSheetSeconds,
  compute: w.waterSheetCompute,
  grid: { xMin: grid.xMin, zMin: grid.zMin, spacing: grid.spacing, nx: grid.nx, nz: grid.nz },
  camera: { fov: 55, width: 1280, height: 720, near: 0.1, far: 3000 },
  shots,
  curl: curl ? { length: curl.length, first: curl.first, last: curl.last, middle: curl.middle } : null,
  landed: { count: landed.length, slices: landed },
  surface: pack(water.surfaceData),
  aeration: water.aerationData ? pack(water.aerationData) : null,
  bed: water.bedData ? pack(water.bedData) : null,
  // The swept barrel's seam: where this mask covers the water, the water's own fragments are DISCARDED
  // (`WATER_BARREL_DISCARD`) and the loft draws in their place. A node's foam cannot reach the screen through it.
  mask: { active: !!water.barrelMaskActive, grid: water.barrelMaskGrid, data: null, set: 0 },
};
if (water.barrelMaskData) {
  const bytes = water.barrelMaskData;
  let s = '';
  for (let k = 0; k < bytes.length; k += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(k, k + 0x8000));
  out.mask.data = btoa(s);
  let set = 0;
  let full = 0;
  for (let k = 0; k < bytes.length; k += 1) { if (bytes[k] > 0) set += 1; if (bytes[k] >= 250) full += 1; }
  out.mask.set = set;
  out.mask.full = full;
  out.mask.nodes = bytes.length;
}
return out;
