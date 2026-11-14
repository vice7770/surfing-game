// C2 step 5g, the spray probe. Evaluated in the water sheet dev view by `headless-shot.mjs sheet --probe=<this file>`,
// in the same held sea a still would be shot from. It answers, in one run, the question step 5g opens with: does the
// spray we already have fire on this wave, and if it does, where are its particles against the cameras and against the
// wave the library draws?
//
// What it dumps:
//  - every shot camera's eye and target (`waterSheetShots`), so a frustum test uses the real cameras;
//  - every live spray particle the page is given (`host.snapshot.spray`, `SPRAY_STRIDE` 6: x, y, z, size, opacity,
//    kind — 0 spray, 1 mist, 2 foam ball, 3 tube spray, 4 tube mist);
//  - every lip landing the SEA's own `PlungingLip` reported since the last snapshot (`snapshot.lipHits`,
//    `LIP_HIT_STRIDE` 5: x, z, volume, speed, the lip's own water). This is the spray's main source, so a zero here and
//    a zero in the spray are the same finding, and a non-zero here with a zero there is a different one;
//  - the library's landed slices (the drawn loft's `phase === 2`) with their crest points, so the spray's places can be
//    read against where the library says the wave has broken, with no second run;
//  - the drawn tube's own blow-out tables if the page carries them (spits, eruptions, rollers are `kind` 3/4/2 above).
const w = window;
const mode = w.waterSheetMode;
const host = mode && mode.host;
const snapshot = host && host.snapshot;
const water = w.waterSheetWater;

const round = (v, n = 2) => +v.toFixed(n);

const shots = w.waterSheetShots.map((s) => ({
  name: s.name,
  eye: [round(s.eye.x, 4), round(s.eye.y, 4), round(s.eye.z, 4)],
  target: [round(s.target.x, 4), round(s.target.y, 4), round(s.target.z, 4)],
}));

// Every live particle, by kind. 4096 + 1024 + 512 at most, so the whole set is cheap to carry out.
const SPRAY_STRIDE = 6;
const particles = [];
const kinds = [0, 0, 0, 0, 0];
if (snapshot) {
  for (let k = 0; k < snapshot.sprayCount; k += 1) {
    const o = k * SPRAY_STRIDE;
    const kind = snapshot.spray[o + 5];
    kinds[kind] = (kinds[kind] ?? 0) + 1;
    particles.push([
      round(snapshot.spray[o]), round(snapshot.spray[o + 1]), round(snapshot.spray[o + 2]),
      round(snapshot.spray[o + 3], 3), round(snapshot.spray[o + 4], 3), kind,
    ]);
  }
}

// The sea's own lip landings since the last snapshot: the spray's biggest source, straight from the simulation.
const LIP_HIT_STRIDE = 5;
const lipHits = [];
if (snapshot) {
  for (let k = 0; k < (snapshot.lipHitCount ?? 0); k += 1) {
    const o = k * LIP_HIT_STRIDE;
    lipHits.push([
      round(snapshot.lipHits[o]), round(snapshot.lipHits[o + 1]), round(snapshot.lipHits[o + 2], 4),
      round(snapshot.lipHits[o + 3]), round(snapshot.lipHits[o + 4], 4),
    ]);
  }
}

// The library's landed slices: where the library says the wave has broken (the bore foam's own nodes, step 5d).
const loft = mode ? mode.barrelLoft : undefined;
const landed = [];
if (loft) {
  for (let s = 0; s < loft.sliceCount; s += 1) {
    // `landmark()`'s arithmetic: LOFT_SAMPLES = PROFILE_POINTS + 2 x extensionSamples, then the crest landmark.
    const v = 3 * (s * (128 + 2 * 3) + 3 + 32);
    const lip = 3 * (s * (128 + 2 * 3) + 3 + 64);
    landed.push({
      slice: s, phase: loft.slicePhase[s], front: loft.sliceFront[s], after: round(loft.sliceAfter[s], 3),
      weight: round(loft.sliceWeight[s], 3),
      crest: [round(loft.positions[v]), round(loft.positions[v + 1]), round(loft.positions[v + 2])],
      lipPoint: [round(loft.positions[lip]), round(loft.positions[lip + 1]), round(loft.positions[lip + 2])],
    });
  }
}

// The tube's own blow-out, if the page carries a count of it.
const tubes = snapshot ? { tubeCount: snapshot.tubeCount, bubbleCount: snapshot.bubbleCount, frontCount: snapshot.frontCount } : null;

// The Particles setting the owner's machine picks (`PARTICLE_BUDGETS.medium`: half the spawn, half the pool, mist
// drawn at 0.8 its width). The veil's drops live longer than the drops they replace, so the standing population is
// what has to fit, not the spawn rate — and that can only be read by setting the level and letting it settle.
// Each sample is [all live, spray + mist alone (the pool that can saturate), the highest spray or mist, and the
// height below which 95 % of the spray's and mist's drawn optical area sits — the honest analogue of a photograph's
// visible top, since one highest particle out of two thousand is an extreme and not a veil.
const levels = {};
const sampleOnce = () => {
  const s = host.snapshot;
  let top = -Infinity;
  const column = [];
  let area = 0;
  for (let k = 0; k < s.sprayCount; k += 1) {
    const o = k * SPRAY_STRIDE;
    const kind = s.spray[o + 5];
    if (kind !== 0 && kind !== 1) continue;
    const y = s.spray[o + 1];
    if (y > top) top = y;
    const a = s.spray[o + 3] * s.spray[o + 3] * s.spray[o + 4];
    area += a;
    column.push([y, a]);
  }
  column.sort((a, b) => a[0] - b[0]);
  let run = 0;
  let q95 = null;
  for (const [y, a] of column) {
    run += a;
    if (run >= 0.95 * area) { q95 = round(y); break; }
  }
  return [s.sprayCount, column.length, top === -Infinity ? null : round(top), q95, round(area, 3)];
};
for (const level of ['high', 'medium', 'low']) {
  mode.setParticleLevel(level);
  // Well past `MIST_LIFE` (4 s), so nothing of the level before is still in the air.
  for (let n = 0; n < 240; n += 1) await w.waterSheetStep(1 / 30);
  const sample = [];
  for (let n = 0; n < 60; n += 1) {
    await w.waterSheetStep(1 / 30);
    sample.push(sampleOnce());
  }
  levels[level] = sample;
}
mode.setParticleLevel('high');

return {
  search: w.location.search,
  seconds: w.waterSheetSeconds,
  compute: w.waterSheetCompute,
  grid: water ? { xMin: water.grid.xMin, zMin: water.grid.zMin, spacing: water.grid.spacing, nx: water.grid.nx, nz: water.grid.nz } : null,
  camera: { fov: 55, width: 1280, height: 720, near: 0.1, far: 3000 },
  shots,
  spray: { count: snapshot ? snapshot.sprayCount : -1, kinds, particles },
  lip: { count: snapshot ? (snapshot.lipHitCount ?? -1) : -1, hits: lipHits },
  landed: { count: landed.length, slices: landed },
  tubes,
  levels,
};
