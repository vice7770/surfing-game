/**
 * The beach peaks' readout with the beach look on or off (canyon-beach-look, 2026-10-28; wave only, no riders): the look
 * counts the beach peaks' onsets in sequence on their bars (the reef's bore hold and on-bar wait), and those onsets are
 * also what each arm's peel tracker fits. Every second after a warm-up, the readout the game gives at each peak's tip
 * (`peelEstimate(bar.x)`, the A-frame's two arms): its words' shares (both arms clean, one arm, mixed peaks, closes out,
 * none) and the clean arms' median angles.
 *   rolldown docs/research/canyon-beach-look-2026-10-28/readout-probe.ts -o dist/scripts/readout-probe.mjs --format esm --platform node \
 *     && node dist/scripts/readout-probe.mjs --size medium --seed 1 --periods 12 [--beach-look off]
 */
import { SWELLS } from '../../../src/game/SurfConditions';
import { canyonBars, canyonShape } from '../../../src/wave/Bathymetry';
import { skillForPeel } from '../../../src/wave/Breaking';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';

const option = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const size = (option('size') ?? 'medium') as keyof typeof SWELLS;
const swell = SWELLS[size];
const sim = new SurfZoneSimulation({
  spot: 'canyon', seed: Number(option('seed') ?? 1), significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod, directionDegrees: 0,
  spreading: swell.spreading ?? 150, tide: 0, windSpeed: 0, stage: 2, compute: 'cpu', ...(option('beach-look') === 'off' ? { canyonBeachLook: false } : {}),
} as unknown as SurfZoneConfig);
const periods = Number(option('periods') ?? 12);
const dt = 1 / 30;
const warm = 3 * swell.peakPeriod;
const end = warm + periods * swell.peakPeriod;
const bars = canyonBars(canyonShape());
const tally = bars.map(() => ({ samples: 0, both: 0, one: 0, mixed: 0, closes: 0, none: 0, left: [] as number[], right: [] as number[] }));
const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : Number.NaN; };
let next = warm;
while (sim.solver.time < end) {
  sim.step(dt);
  if (sim.solver.time < next) continue;
  next += 1;
  bars.forEach((bar, k) => {
    const t = tally[k];
    t.samples += 1;
    const e = sim.peelEstimate(bar.x);
    if (!e) { t.none += 1; return; }
    if (e.peak) { t.both += 1; t.left.push(e.peak.left); t.right.push(e.peak.right); return; }
    if (e.fit < 0.3) { t.mixed += 1; return; }
    if (skillForPeel(e.angleDegrees) === 'closeout') { t.closes += 1; return; }
    t.one += 1;
    (e.direction > 0 ? t.left : t.right).push(e.angleDegrees);
  });
}
const pct = (n: number, of: number) => `${Math.round((100 * n) / Math.max(1, of))} %`;
console.log(`canyon ${size} seed ${option('seed') ?? 1}, ${periods} periods, beach look ${option('beach-look') === 'off' ? 'off' : 'on'}: the readout at each beach peak's tip, every 1 s`);
bars.forEach((bar, k) => {
  const t = tally[k];
  console.log(`peak x ${bar.x}: ${t.samples} samples; both arms ${pct(t.both, t.samples)}, one arm ${pct(t.one, t.samples)}, mixed peaks ${pct(t.mixed, t.samples)}, `
    + `closes out ${pct(t.closes, t.samples)}, none ${pct(t.none, t.samples)}; left (+x) median ${median(t.left).toFixed(0)}° (${t.left.length}), right (−x) ${median(t.right).toFixed(0)}° (${t.right.length})`);
});
