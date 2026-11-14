// C2 step 5g, the series probe. Run by `headless-shot.mjs sheet --probe=<this file>`: one frame is not a population,
// so this steps the held sea on and samples every step, instead of reading the one frame a still came from.
//
// Per sample: the live spray by kind, the SEA's own lip landings in that step (`snapshot.lipHits`), and the highest
// particle. The question it settles is whether the step-5g frame's `0 sea lip landings` is the rule or a fluke, and
// what height the spray actually reaches over a run of waves rather than in one frame.
const w = window;
const mode = w.waterSheetMode;
const host = mode && mode.host;
const SPRAY_STRIDE = 6;
const LIP_HIT_STRIDE = 5;
const SAMPLES = Number(w.__g5Samples ?? 600);
const DT = Number(w.__g5Dt ?? 1 / 30);

const samples = [];
let lipTotal = 0;
let lipVolume = 0;
const lipPlaces = [];
for (let n = 0; n < SAMPLES; n += 1) {
  const seconds = await w.waterSheetStep(DT);
  const snapshot = host.snapshot;
  const kinds = [0, 0, 0, 0, 0];
  let top = -Infinity;
  let topSpray = -Infinity;
  for (let k = 0; k < snapshot.sprayCount; k += 1) {
    const o = k * SPRAY_STRIDE;
    const kind = snapshot.spray[o + 5];
    kinds[kind] += 1;
    const y = snapshot.spray[o + 1];
    if (y > top) top = y;
    if (kind === 0 || kind === 1) { if (y > topSpray) topSpray = y; }
  }
  const hits = snapshot.lipHitCount ?? 0;
  lipTotal += hits;
  for (let k = 0; k < hits; k += 1) {
    const o = k * LIP_HIT_STRIDE;
    lipVolume += snapshot.lipHits[o + 2];
    if (lipPlaces.length < 400) {
      lipPlaces.push([+snapshot.lipHits[o].toFixed(1), +snapshot.lipHits[o + 1].toFixed(1), +snapshot.lipHits[o + 2].toFixed(4), +snapshot.lipHits[o + 3].toFixed(2)]);
    }
  }
  samples.push({
    t: +seconds.toFixed(3), spray: snapshot.sprayCount, kinds, hits,
    top: top === -Infinity ? null : +top.toFixed(2), topSpray: topSpray === -Infinity ? null : +topSpray.toFixed(2),
    bubbles: snapshot.bubbleCount,
  });
}

return {
  search: w.location.search,
  compute: w.waterSheetCompute,
  dt: DT, samples: SAMPLES,
  lipTotal, lipVolume: +lipVolume.toFixed(4),
  lipPlaces,
  series: samples,
};
