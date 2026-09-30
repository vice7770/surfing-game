/**
 * Whitewater report (G9 Part B): runs each spot's physical surf zone and
 * reports what its breaking whitewater does: splash-up heights, the tubes'
 * collapse times, spit speeds and eruptions, the air driven into the water
 * (peak void fraction, plume depth), the foam-ball sprites, the spray pool,
 * and the step time. Each is set beside the sourced range it answers to
 * (docs/research/whitewater-sources.md). Reported, not asserted. Writes
 * docs/research/whitewater-report.md.
 *
 *   npm run report:whitewater -- --seeds 2 --periods 12
 *   npm run report:whitewater -- --spots reef,beach --periods 4
 */
import { writeFileSync } from 'node:fs';
import { DEFAULT_PHYSICAL_SETTINGS, swellFor } from '../src/game/PhysicalMode';
import type { SpotName } from '../src/wave/Bathymetry';
import { ROLLER_AREA, SPLASH_UP, TUBE_AIR } from '../src/wave/PlungingLip';
import { SPRAY_CAPACITY, SPRAY_PER_AIR, SPRAY_STRIDE, SprayCloud, WHITEWATER_CAPACITY } from '../src/wave/SprayCloud';
import { SurfZoneSimulation } from '../src/wave/SurfZoneSimulation';
import { AERATION } from '../src/wave/AerationField';

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const argument = (name: string, fallback: number): number => Number(option(name) ?? fallback);
const seedCount = argument('seeds', 2);
const periods = argument('periods', 12);
const spots = (option('spots')?.split(',') ?? ['beach', 'point', 'reef', 'canyon', 'padang']) as SpotName[];
const output = option('out') ?? 'docs/research/whitewater-report.md';
const settings = DEFAULT_PHYSICAL_SETTINGS;
const swell = swellFor(settings);
/** The worker's step, s: the splash-up, spray and air all move per step. */
const STEP = 1 / 60;
/** How often the aeration field is surveyed, s. */
const SURVEY = 0.5;
/** Water this aerated counts as part of a plume. */
const PLUME_AIR = 0.01;

const fixed = (value: number, digits = 2) => (Number.isFinite(value) ? value.toFixed(digits) : '—');
const quantile = (values: number[], q: number) => {
  if (!values.length) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
};
const largest = (values: number[]) => (values.length ? values.reduce((most, value) => Math.max(most, value), -Infinity) : Number.NaN);

const rows: string[] = [];
const airRows: string[] = [];
const started = Date.now();
for (const spot of spots) {
  let jets = 0;
  let stepMs = 0;
  let sprayMs = 0;
  let steps = 0;
  /** Each step's highest splash-up parcel above the water under it, m. */
  const splashHeights: number[] = [];
  const spitSpeeds: number[] = [];
  let spitAir = 0;
  let eruptedAir = 0;
  let eruptionSteps = 0;
  let bubbleAir = 0;
  /** Air the tubes trapped as they closed, and what they still held when the run ended, m³. */
  let trappedAir = 0;
  let heldAir = 0;
  /** Per roller (a closing tube): the steps it was seen. */
  const collapseSteps: number[] = [];
  /** Each survey's highest void fraction, and deepest plume, m. */
  const peakAir: number[] = [];
  const plumeDepths: number[] = [];
  const foamBalls: number[] = [];
  let sprayPeak = 0;
  let sprayFull = 0;
  /** What the pools held at their fullest: spray, mist, and the tube's foam balls, spray and mist. */
  let peakKinds = [0, 0, 0, 0, 0];
  for (let seed = 1; seed <= seedCount; seed += 1) {
    const simulation = new SurfZoneSimulation({
      spot, seed, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod,
      directionDegrees: swell.directionDegrees ?? settings.directionDegrees, spreading: swell.spreading, bandwidth: swell.bandwidth,
      tide: settings.tide, windSpeed: settings.windSpeed,
    });
    const spray = new SprayCloud(seed, SPRAY_CAPACITY, WHITEWATER_CAPACITY);
    const { lip, aeration, solver } = simulation;
    const toBubbles = lip.onAir;
    lip.onAir = (x, z, volume, penetration) => {
      bubbleAir += volume;
      toBubbles?.(x, z, volume, penetration);
    };
    const seen = new Map<number, number>();
    const perPeriod = Math.round(swell.peakPeriod / STEP);
    const surveyEvery = Math.round(SURVEY / STEP);
    for (let step = 0; step < periods * perPeriod; step += 1) {
      simulation.step(STEP);
      stepMs += simulation.lastStepMs;
      let splash = 0;
      lip.forEachActiveParcel((parcel) => {
        if (parcel.kind === 1) splash = Math.max(splash, parcel.y - simulation.heightAt(parcel.x, parcel.z));
      });
      if (splash > 0) splashHeights.push(splash);
      for (const spit of lip.spits) {
        spitSpeeds.push(spit.speed);
        spitAir += spit.airRate * STEP;
      }
      if (lip.eruptions.length > 0) eruptionSteps += 1;
      for (const eruption of lip.eruptions) eruptedAir += eruption.airRate * STEP;
      const live = new Set<number>();
      for (const roller of lip.rollers) {
        live.add(roller.id);
        seen.set(roller.id, (seen.get(roller.id) ?? 0) + 1);
      }
      for (const [id, count] of seen) {
        if (live.has(id)) continue;
        collapseSteps.push(count);
        seen.delete(id);
      }
      const start = performance.now();
      spray.update({
        solver, foam: simulation.foam, lipImpacts: simulation.lipImpacts, windSpeed: settings.windSpeed ?? 0,
        spits: lip.spits, eruptions: lip.eruptions, rollers: lip.rollers,
      }, STEP);
      sprayMs += performance.now() - start;
      let balls = 0;
      for (let k = 0; k < spray.count; k += 1) if (spray.particles[k * SPRAY_STRIDE + 5] === 2) balls += 1;
      if (balls > 0) foamBalls.push(balls);
      if (spray.count > sprayPeak) {
        sprayPeak = spray.count;
        peakKinds = [0, 0, 0, 0, 0];
        for (let k = 0; k < spray.count; k += 1) peakKinds[spray.particles[k * SPRAY_STRIDE + 5]] += 1;
      }
      if (spray.count - spray.whitewaterCount >= SPRAY_CAPACITY) sprayFull += 1;
      if (step % surveyEvery === 0) {
        let peak = 0;
        let plume = 0;
        for (let cell = 0; cell < solver.h.length; cell += 1) {
          const fraction = aeration.voidFraction(cell);
          if (!(fraction > 0)) continue;
          peak = Math.max(peak, fraction);
          if (fraction >= PLUME_AIR) plume = Math.max(plume, aeration.depth[cell]);
        }
        if (peak > 0) peakAir.push(peak);
        if (plume > 0) plumeDepths.push(plume);
      }
      steps += 1;
    }
    jets += simulation.lipJets;
    trappedAir += lip.trappedAir;
    heldAir += lip.heldAir;
    console.error(`${spot} seed ${seed}: ${simulation.lipJets} jets, ${((Date.now() - started) / 1000).toFixed(0)} s elapsed`);
  }
  const collapseTimes = collapseSteps.map((count) => count * STEP);
  rows.push(`| ${spot} | ${jets} | ${fixed(quantile(splashHeights, 0.5))} | ${fixed(quantile(splashHeights, 0.9))} | ${collapseTimes.length} | ${fixed(quantile(collapseTimes, 0.5))} | ${fixed(largest(collapseTimes))} | ${spitSpeeds.length} | ${fixed(quantile(spitSpeeds, 0.5))} | ${fixed(quantile(spitSpeeds, 0.9))} | ${fixed(largest(spitSpeeds))} | ${eruptionSteps} | ${fixed(largest(peakAir), 3)} | ${fixed(quantile(peakAir, 0.5), 3)} | ${Math.round((100 * peakAir.filter((peak) => peak >= 0.99 * AERATION.peak).length) / Math.max(1, peakAir.length))} % | ${fixed(quantile(plumeDepths, 0.5))} | ${fixed(largest(plumeDepths))} | ${fixed(quantile(foamBalls, 0.5), 0)} | ${fixed(largest(foamBalls), 0)} | ${sprayPeak} (${peakKinds.join(' / ')}) | ${Math.round((100 * sprayFull) / Math.max(1, steps))} % | ${fixed(stepMs / Math.max(1, steps), 1)} | ${fixed(sprayMs / Math.max(1, steps), 2)} |`);
  airRows.push(`| ${spot} | ${fixed(trappedAir, 1)} | ${fixed(spitAir, 1)} | ${fixed(eruptedAir, 1)} | ${fixed(bubbleAir, 1)} | ${fixed(heldAir, 2)} | ${fixed(trappedAir > 0 ? Math.abs(spitAir + eruptedAir + bubbleAir + heldAir - trappedAir) : Number.NaN, 6)} | ${trappedAir > 0 ? Math.round((100 * (spitAir + eruptedAir)) / (trappedAir - heldAir)) : 0} % |`);
}

const report = `# Whitewater report · physical surf zone

Generated by \`npm run report:whitewater -- ${process.argv.slice(2).join(' ')}\` on ${new Date().toISOString().slice(0, 10)} (G9 Part B; reported, not asserted).

**Conditions.** The Wave Lab defaults: Hs ${swell.significantHeight} m, Tp ${swell.peakPeriod} s, spreading s ${Math.round(swell.spreading)}, wind ${settings.windSpeed ?? 0} m/s. Stage 2 (Boussinesq) on the CPU, stepped at the worker's 1/60 s with its ${SPRAY_CAPACITY}-particle spray pool and ${WHITEWATER_CAPACITY} places beside it for the tube's whitewater. ${seedCount === 1 ? 'Seed 1' : `Seeds 1–${seedCount}`}, ${periods} peak periods each. The same values run every spot: any difference between them comes from the bed and the waves.

**How it is measured.**
- **Splash-up:** each step's highest splash-up parcel above the water under it. It leaves at ζ_v = ${SPLASH_UP.vertical} of the jet's downward impact speed.
- **Collapse:** how long each closing tube rolled a foam ball, from its jet's last water landing until its void was gone, t_c = √(2W/g) by construction.
- **Spit:** each step's spit, the air a closing peel squeezes out of its open end over the mouth's cross-section. Eruptions are the steps where a section closed with no open end.
- **Air in the water:** the aeration field surveyed every ${SURVEY} s, its highest depth-averaged void fraction and the deepest plume with at least ${PLUME_AIR} void fraction. A plume holds at most α_max = ${AERATION.peak} and vents the rest at once; the share of surveys that reach it shows how often breaking drives in more air than the plume holds.
- **Foam ball:** its sprites alive in each step that has any (${ROLLER_AREA}·H² of roller per column).
- **Spray pool:** the most particles alive at once, and the share of steps the spray's own pool was full (the tube's whitewater has its own).

Step times are wall-clock on a shared machine: the surf-zone step and the spray's own update.

| Spot | Jets | Splash-up, median, m | 90th percentile, m | Tubes closed | Collapse, median, s | Longest, s | Spits | Spit speed, median, m/s | 90th percentile, m/s | Fastest, m/s | Eruption steps | Peak void fraction | Median survey peak | Surveys at α_max | Plume depth, median, m | Deepest, m | Foam-ball sprites, median | Most | Spray peak (spray / mist / foam ball / tube spray / tube mist) | Spray pool full | Step, ms | Spray, ms |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
${rows.join('\n')}

**The tubes' air.** Every closing tube's trapped air, where it went, what the tubes still held when the run ended, and the error in the balance, m³. The share that escaped as spit and eruption should be ε = ${Math.round(TUBE_AIR.escape * 100)} %.

| Spot | Trapped | Spit | Erupted | Bubbles | Still held | |Spit + erupted + bubbles + held − trapped| | Escaped |
|---|---:|---:|---:|---:|---:|---:|---:|
${airRows.join('\n')}

**Against the sourced ranges** (docs/research/whitewater-sources.md):
- **Peak void fraction:** about 0.2 under surf-zone plunging breakers, lower under spilling ones (Blenkinsopp & Chaplin 2007). It is the plume's cap, so the check is how often breaking reaches it.
- **Plume depth:** deeper under plunging breaks (κ_p ≈ 0.8 H) than under spilling bores (κ_s ≈ 0.3 H). Both are provisional.
- **Splash-up:** up to about the original wave's height (Peregrine 1983).
- **Spit speed:** mass conservation, no measurement. Its spray is drawn at ${SPRAY_PER_AIR} particles per m³ of air (provisional).
- **Air:** conserved; the last column of the second table is its error.`;

writeFileSync(output, report);
console.error(`wrote ${output}`);
