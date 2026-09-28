/**
 * Tube report (plan P7): runs each spot's physical surf zone and reports how
 * its breaks go (plunging jets, spilling rollers), the tubes the jets draw
 * (each landed lip parcel measured in the frame of the crest it left, against
 * the measured width-to-length range 0.25-1), the peel, and the step time.
 * Writes docs/research/tube-report.md.
 *
 *   npm run report:tubes -- --seeds 2 --periods 12
 *   npm run report:tubes -- --practice --spots point,reef
 */
import { writeFileSync } from 'node:fs';
import { DEFAULT_PHYSICAL_SETTINGS, swellFor } from '../src/game/PhysicalMode';
import type { SpotName } from '../src/wave/Bathymetry';
import { applyReefShape } from './reefShape';
import { rideability, type PeelSample } from '../src/wave/Rideability';
import { SurfZoneSimulation } from '../src/wave/SurfZoneSimulation';
import { measureTube } from '../src/wave/TubeShape';
import { REEF_OVERTURN, vortexRatio } from '../src/wave/Overturn';

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const argument = (name: string, fallback: number): number => Number(option(name) ?? fallback);
const seedCount = argument('seeds', 2);
const periods = argument('periods', 12);
const practice = process.argv.includes('--practice');
// Reshape the Reef for this run: `--reef angle=50,crestZ=-125` (the design sweep).
applyReefShape(option('reef'));
const spots = (option('spots')?.split(',') ?? ['beach', 'point', 'reef', 'canyon']) as SpotName[];
const output = option('out') ?? 'docs/research/tube-report.md';
const settings = practice ? { ...DEFAULT_PHYSICAL_SETTINGS, source: 'practice' as const } : DEFAULT_PHYSICAL_SETTINGS;
/** Each spot's swell: its own Practice when practising (the Reef has one). */
const swellAt = (spot: SpotName) => swellFor({ ...settings, spot });
const STEP = 1 / 30;
/** A lip landing less than this far ahead of the crest draws no tube, m. */
const MIN_TUBE_LENGTH = 0.1;

const fixed = (value: number, digits = 2) => (Number.isFinite(value) ? value.toFixed(digits) : '—');
const quantile = (values: number[], q: number) => {
  if (!values.length) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
};

const rows: string[] = [];
const partB: string[] = [];
const started = Date.now();
for (const spot of spots) {
  const swell = swellAt(spot);
  let jets = 0;
  let rollers = 0;
  let stepMs = 0;
  let steps = 0;
  const lengths: number[] = [];
  const ratios: number[] = [];
  /** Each step's tallest gap between a flying lip parcel and the water beneath it, m. */
  const openings: number[] = [];
  const samples: (PeelSample | undefined)[] = [];
  /** Per throw (Part B): the water the crest gave over what the overturn asked, the jet's area over H², its sheet's thickness over H, its speed over the crest's. */
  const given: number[] = [];
  const jetAreas: number[] = [];
  const sheets: number[] = [];
  const speeds: number[] = [];
  /** Per reef break: Mead & Black's fit for the gradient it climbed, and the tube's length over width as thrown. */
  const fits: number[] = [];
  const thrownRatios: number[] = [];
  for (let seed = 1; seed <= seedCount; seed += 1) {
    const simulation = new SurfZoneSimulation({
      spot, seed, significantHeight: swell.significantHeight, heightAt: (settings.source === 'practice' ? 'edge' : 'deep') as 'edge' | 'deep', peakPeriod: swell.peakPeriod,
      directionDegrees: swell.directionDegrees ?? settings.directionDegrees, spreading: swell.spreading, bandwidth: swell.bandwidth,
      tide: settings.tide, windSpeed: settings.windSpeed,
    });
    simulation.onThrow = (event) => {
      if (!(event.thrown > 0) || !(event.height > 0)) return;
      const width = simulation.tubeColumnWidth;
      given.push(event.thrown / event.asked);
      jetAreas.push(event.thrown / width / event.height ** 2);
      sheets.push(event.thrown / width / event.tube.length / event.height);
      speeds.push(event.speedOverCrest);
      if (event.orthogonalGradient !== undefined) {
        fits.push(vortexRatio(event.orthogonalGradient));
        thrownRatios.push(event.tube.length / event.tube.width);
      }
    };
    simulation.lip.onLand = (x, z, _volume, _vx, _vy, _vz, flight) => {
      // A splash-up's landing (G9) draws no tube.
      if (!flight || flight.kind !== 0) return;
      const tube = measureTube(flight.launch, { x, z }, flight.y, flight.crestSpeed * flight.age);
      lengths.push(tube.length);
      if (tube.length >= MIN_TUBE_LENGTH) ratios.push(tube.widthRatio);
    };
    const perPeriod = Math.round(swell.peakPeriod / STEP);
    for (let period = 0; period < periods; period += 1) {
      for (let index = 0; index < perPeriod; index += 1) {
        simulation.step(STEP);
        let opening = 0;
        simulation.lip.forEachActiveParcel((parcel) => {
          if (parcel.kind !== 0) return;
          opening = Math.max(opening, parcel.y - simulation.heightAt(parcel.x, parcel.z));
        });
        if (opening > 0) openings.push(opening);
        stepMs += simulation.lastStepMs;
        steps += 1;
      }
      const estimate = simulation.peelEstimate();
      samples.push(estimate && { angleDegrees: estimate.angleDegrees, fit: estimate.fit, peelSpeed: estimate.peelSpeed });
    }
    jets += simulation.lipJets;
    rollers += simulation.lipRollers;
    console.error(`${spot} seed ${seed}: ${simulation.lipJets} jets, ${simulation.lipRollers} rollers, ${((Date.now() - started) / 1000).toFixed(0)} s elapsed`);
  }
  const stats = rideability(samples);
  const inRange = ratios.filter((ratio) => ratio >= 0.25 && ratio <= 1).length;
  rows.push(`| ${spot} | ${jets} | ${rollers} | ${lengths.length} | ${lengths.length ? Math.round((100 * ratios.length) / lengths.length) : 0} % | ${fixed(quantile(lengths, 0.5))} | ${fixed(quantile(lengths, 0.9))} | ${fixed(quantile(ratios, 0.5))} | ${ratios.length ? Math.round((100 * inRange) / ratios.length) : 0} % | ${fixed(quantile(openings, 0.9))} | ${fixed(openings.length ? Math.max(...openings) : Number.NaN)} | ${Math.round(stats.closeout * 100)} % | ${Math.round(stats.mixed * 100)} % | ${Number.isFinite(stats.medianAngle) ? Math.round(stats.medianAngle) + '°' : '—'} | ${fixed(stepMs / Math.max(1, steps), 1)} |`);
  partB.push(`| ${spot} | ${given.length} | ${fixed(quantile(given, 0.5))} | ${fixed(quantile(jetAreas, 0.5))} | ${fixed(quantile(sheets, 0.5))} | ${fixed(quantile(speeds, 0.5))} | ${fits.length} | ${fixed(quantile(fits, 0.5))} | ${fits.length ? Math.round((100 * fits.filter((fit) => fit < REEF_OVERTURN.roundestRatio).length) / fits.length) : 0} % | ${fixed(quantile(thrownRatios, 0.5))} |`);
}

const report = `# Tube report · physical surf zone

Generated by \`npm run report:tubes -- ${process.argv.slice(2).join(' ')}\` on ${new Date().toISOString().slice(0, 10)} (plan P7; reported, not asserted).

**Conditions.** ${practice ? 'Practice groundswell' : 'The Wave Lab defaults'}: ${spots.map((spot) => `${spot} Hs ${swellAt(spot).significantHeight} m, Tp ${swellAt(spot).peakPeriod} s, spreading s ${Math.round(swellAt(spot).spreading)}`).join('; ')}. Stage 2 (Boussinesq) on the CPU. ${seedCount === 1 ? 'Seed 1' : `Seeds 1–${seedCount}`}, ${periods} peak periods each.

**How tubes are measured.** A break is a plunging jet where the local Iribarren number under its crest is 0.4–2, and a spilling roller below 0.4. A break over a submerged crest (a reef break, the Teahupo'o Reef's Part B) plunges from ξ 0.4 up, and its overturn follows Mead & Black (2001) by the gradient it climbs: its tube's length over width is their vortex ratio, held within the 1.42–3.43 they measured. A jet leaves the way its crest travels (measured from the surface's motion on its front face), outrunning it by the speed that flies it from the crest top to its overturn's front end: the overturn Pick & Feddersen (2026) fit for the local bed slope and the sea, sized by the wave's height, which puts the jet at 1.2–1.6 times the crest speed, as measured jets leave (1.15–1.73). It pours from its crest for its whole flight, as measured jets do (Erinin et al. 2023). Each landed lip parcel is measured in the frame of the crest it left: its tube length is how far ahead of the advancing crest it landed, its height the drop to the surface it landed on. A lip landing less than ${MIN_TUBE_LENGTH} m ahead of the crest, or overrun by it, draws no tube. The opening is the tallest gap between a flying lip parcel and the water beneath it, over each step: room under the lip. Step times are wall-clock on a shared machine. The measured range is width-to-length 0.25–1 (Feddersen et al. 2023 at Surf Ranch; passyworld up to round).

| Spot | Jets | Rollers | Landed parcels | With a tube ≥ ${MIN_TUBE_LENGTH} m | Median tube length, m | 90th percentile, m | Median width / length | Within 0.25–1 | Opening, 90th percentile, m | Largest opening, m | Close-out | Mixed | Median peel | Step, ms |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
${rows.join('\n')}

**The jets against the sources (Part B).** Per throw: the water the crest gave over what the overturn asked (each source cell gives at most 20 % of its water); the jet's area over H² (Pick & Feddersen's fits span about 0.13–0.27 H²); the sheet's thickness over H, its water over the void's length (the Reef's provisional 0.5 H beyond the fits; measured tips 0.07–0.08 H, roots 0.10–0.21 H); and the jet's speed over its crest's (lab jet tips land at 1.25–1.32 in total, Erinin et al. 2023). Per reef break: Mead & Black's fit for the gradient it climbed, the share steeper than the roundest they measured (held at 1.42), and the tube's length over width as thrown.

| Spot | Throws | Given / asked | Jet area / H² | Sheet / H | Jet / crest speed | Reef breaks | Median fit Y | Held at 1.42 | Tube L / W |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
${partB.join('\n')}

**Reading it.** The depth-averaged solver cannot overturn: its face slopes where a real face has gone vertical. Each jet therefore carries its overturn's void, the lower half of Longuet-Higgins's curve sized from the wave the solver has, and the water the rider feels and the renderer draws meets the void's floor under the flying lip; the solver's own water is untouched. A tube is only as tall as that: whether a rider fits depends on the wave and the bed.`;

writeFileSync(output, report);
console.error(`wrote ${output}`);
