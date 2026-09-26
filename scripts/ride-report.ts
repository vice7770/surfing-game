/**
 * Ride report (P9 phase 0): an autopilot rides each spot's physical surf zone
 * as a player would (the runner's own rider, feeding back on the water), and
 * every ride is measured against the wave under it: speed over ground against
 * the crest's speed and the peel's required speed c / sin α, and where on the
 * face it rode. Writes docs/research/ride-report.md.
 *
 *   npm run report:ride -- --practice --seeds 2 --minutes 3
 *   npm run report:ride -- --practice --ghosts --minutes 5
 *   npm run report:ride -- --spots point --minutes 5 --out /tmp/point.md
 */
import { writeFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { Autopilot } from '../src/dev/Autopilot';
import { DEFAULT_PHYSICAL_SETTINGS, swellFor } from '../src/game/PhysicalMode';
import type { LipParcelSource } from '../src/physics/DetachedSurfer';
import { RideSession } from '../src/physics/RideSession';
import type { SurfWater } from '../src/physics/SurfWater';
import { WaveFrameGauge } from '../src/physics/waveFrame';
import type { SpotName } from '../src/wave/Bathymetry';
import { SURF_ZONE_STEP, SurfZoneRunner } from '../src/wave/SurfZoneRunner';

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const argument = (name: string, fallback: number): number => Number(option(name) ?? fallback);
const flag = (name: string): boolean => process.argv.includes(`--${name}`);
const seedCount = argument('seeds', 2);
const minutes = argument('minutes', 3);
const spots = (option('spots')?.split(',') ?? ['point', 'reef']) as SpotName[];
const output = option('out') ?? 'docs/research/ride-report.md';
const practice = flag('practice');
/** Ghost riders beside the runner's own: metres along shore from the break point (`--ghosts`, as in the catch report). */
const ghostAlongs = flag('ghosts') ? [-45, -25, -12, 12, 25, 45] : [];
const settings = practice ? { ...DEFAULT_PHYSICAL_SETTINGS, source: 'practice' as const } : DEFAULT_PHYSICAL_SETTINGS;
const swell = swellFor(settings);
const direction = swell.directionDegrees ?? settings.directionDegrees;
/** A crest this far above still water within LOOK m behind the board starts a paddle. */
const RISE = 0.25 * swell.significantHeight;
const LOOK = 14;
/** Rides shorter than this, s, are not reported. */
const MIN_RIDE = 3;

interface Ride {
  seconds: number;
  distance: number;
  meanSpeed: number;
  topSpeed: number;
  /** The old label, |board velocity|, including vertical motion. */
  meanLabel: number;
  topLabel: number;
  crestSpeed: number;
  required: number;
  /** Speed over ground over the required speed, where finite. */
  ratio: number;
  /** Share of the ride faster than 1.3 × the required speed. */
  fastShare: number;
  faceFraction: number;
  ahead: number;
  aheadP90: number;
  outcome: string;
}

const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : NaN);
const quantile = (values: number[], q: number) => {
  if (!values.length) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
};
const fixed = (value: number, digits = 1) => (Number.isFinite(value) ? value.toFixed(digits) : '—');

/** One rider: the runner's own (which pushes back on the water) or a ghost (which feels it and pushes back on nothing). */
interface Bot {
  session: RideSession;
  own: boolean;
  home: Vector3;
  autopilot: Autopilot;
  gauge: WaveFrameGauge;
  trace: { speed: number; label: number; crest: number; required: number; face: number; ahead: number; x: number; z: number }[];
  request: { paddle: boolean; popUp: boolean; steer: number };
  retry: boolean;
}

function runSpot(spot: SpotName, seed: number): { rides: Ride[]; attempts: number; stands: number; outcomes: Map<string, number> } {
  const runner = new SurfZoneRunner({
    spot, seed,
    significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod, directionDegrees: direction,
    spreading: swell.spreading, bandwidth: swell.bandwidth, tide: settings.tide, windSpeed: settings.windSpeed,
  }, { rider: true });
  // Ghosts: the water's reactions and the lip's recoil are dropped, as in the catch report.
  const ghostWater: SurfWater = {
    sampleAt: (x, y, z, out) => runner.water.sampleAt(x, y, z, out),
    surfaceAt: (x, z) => runner.water.surfaceAt(x, z),
    addReaction() {},
  };
  const recoil = new Vector3();
  const lip: LipParcelSource = {
    forEachContact: (visit) => runner.simulation.lip.forEachContact((parcel) => {
      recoil.copy(parcel.velocity);
      visit(parcel);
      parcel.velocity.copy(recoil);
    }),
  };
  const radians = (direction * Math.PI) / 180;
  const bot = (session: RideSession, own: boolean, along: number): Bot => ({
    session, own, home: new Vector3(runner.focus.x + along, 0, runner.focus.z - 6),
    autopilot: new Autopilot({ rise: RISE }), gauge: new WaveFrameGauge({ directionX: Math.sin(radians), directionZ: Math.cos(radians) }),
    trace: [], request: { paddle: false, popUp: false, steer: 0 }, retry: false,
  });
  const bots: Bot[] = [bot(runner.session!, true, 0)];
  for (const along of ghostAlongs) {
    const session = new RideSession();
    const ghost = bot(session, false, along);
    session.reset(ghost.home, 0, ghostWater);
    bots.push(ghost);
  }
  const rides: Ride[] = [];
  let stands = 0;
  const outcomes = new Map<string, number>();
  let peelDirection = 0;
  let peelAngle = 0;
  let peelAge = Infinity;
  const steps = Math.round((minutes * 60) / SURF_ZONE_STEP);
  const own = bots[0];
  for (let step = 0; step < steps; step += 1) {
    runner.advance(1, { ...own.request, retry: own.retry });
    own.retry = false;
    peelAge += SURF_ZONE_STEP;
    if (peelAge >= 1) {
      peelAge = 0;
      const peel = runner.simulation.peelEstimate();
      peelDirection = peel?.direction ?? 0;
      peelAngle = peel?.angleDegrees ?? 0;
    }
    for (const b of bots) {
      const { session, autopilot } = b;
      if (!b.own) {
        session.step(SURF_ZONE_STEP, ghostWater, b.request);
        session.strike(lip);
        if (session.board.outsideDomain || !Number.isFinite(session.board.position.x + session.board.position.z)) session.reset(b.home, 0, ghostWater);
      }
      const { board } = session;
      const body = session.rider.attached ? board.centerOfMass : session.surfer.centerOfMass();
      const velocity = session.rider.attached ? board.velocity : session.surfer.linearMomentum().divideScalar(session.surfer.mass);
      const wave = b.gauge.update(b.own ? runner.water : ghostWater, body, velocity, SURF_ZONE_STEP, peelAngle);
      const ride = {
        phase: session.phase, speed: Math.hypot(board.velocity.x, board.velocity.z), boardSpeed: board.velocity.length(),
        cue: session.rider.popUpCue, popUp: { ...session.rider.popUpReport }, separation: session.separation, resets: 0, wave: { ...wave },
      };
      let crest = -Infinity;
      for (let back = 2; back <= LOOK; back += 2) crest = Math.max(crest, runner.water.surfaceAt(board.position.x, board.position.z - back));
      const before = autopilot.state;
      const input = autopilot.next({
        ride, peelDirection, board: { x: board.position.x, z: board.position.z, heading: session.heading },
        focusZ: runner.focus.z, crestBehind: crest - settings.tide,
      }, SURF_ZONE_STEP);
      if (autopilot.state === 'ride') {
        if (before !== 'ride') stands += 1;
        b.trace.push({
          speed: ride.speed, label: ride.boardSpeed, crest: wave.valid ? wave.crestSpeed : NaN, required: wave.valid ? wave.requiredSpeed : NaN,
          face: wave.valid ? wave.faceFraction : NaN, ahead: wave.valid ? wave.aheadOfCrest : NaN, x: board.position.x, z: board.position.z,
        });
      }
      b.request = input;
      if (autopilot.state === 'done') {
        const outcome = autopilot.outcome ?? '';
        outcomes.set(outcome, (outcomes.get(outcome) ?? 0) + 1);
        const { trace } = b;
        if (trace.length * SURF_ZONE_STEP >= MIN_RIDE) {
          let distance = 0;
          for (let i = 1; i < trace.length; i += 1) distance += Math.hypot(trace[i].x - trace[i - 1].x, trace[i].z - trace[i - 1].z);
          const finite = (key: 'crest' | 'required' | 'face' | 'ahead') => trace.map((s) => s[key]).filter(Number.isFinite);
          const ratios = trace.filter((s) => Number.isFinite(s.required) && s.required > 0).map((s) => s.speed / s.required);
          rides.push({
            seconds: trace.length * SURF_ZONE_STEP, distance,
            meanSpeed: mean(trace.map((s) => s.speed)), topSpeed: Math.max(...trace.map((s) => s.speed)),
            meanLabel: mean(trace.map((s) => s.label)), topLabel: Math.max(...trace.map((s) => s.label)),
            crestSpeed: mean(finite('crest')), required: mean(finite('required')), ratio: mean(ratios),
            fastShare: ratios.length ? ratios.filter((r) => r > 1.3).length / ratios.length : NaN,
            faceFraction: mean(finite('face')), ahead: mean(finite('ahead')), aheadP90: quantile(finite('ahead'), 0.9),
            outcome,
          });
        }
        b.trace = [];
        autopilot.reset();
        b.gauge.reset();
        b.request = { paddle: false, popUp: false, steer: 0 };
        if (b.own) b.retry = true;
        else session.reset(b.home, 0, ghostWater);
      }
    }
  }
  return { rides, attempts: bots.reduce((sum, b) => sum + b.autopilot.attempts, 0), stands, outcomes };
}

const started = Date.now();
const sections: string[] = [];
const summary: string[] = [];
for (const spot of spots) {
  const all: Ride[] = [];
  let attempts = 0;
  let stands = 0;
  const outcomes = new Map<string, number>();
  for (let seed = 1; seed <= seedCount; seed += 1) {
    const run = runSpot(spot, seed);
    all.push(...run.rides);
    attempts += run.attempts;
    stands += run.stands;
    for (const [outcome, count] of run.outcomes) outcomes.set(outcome, (outcomes.get(outcome) ?? 0) + count);
    console.log(`${spot} seed ${seed}: ${run.attempts} attempts, ${run.stands} stands, ${run.rides.length} rides ≥ ${MIN_RIDE} s; ${[...run.outcomes].map(([o, c]) => `${o} ×${c}`).join(', ')}`);
  }
  summary.push(`| ${spot} | ${attempts} | ${stands} | ${all.length} | ${fixed(mean(all.map((r) => r.seconds)))} | ${fixed(mean(all.map((r) => r.meanSpeed)))} | ${fixed(all.length ? Math.max(...all.map((r) => r.topSpeed)) : NaN)} | ${fixed(mean(all.map((r) => r.meanLabel)))} | ${fixed(mean(all.map((r) => r.crestSpeed)))} | ${fixed(mean(all.map((r) => r.required)))} | ${fixed(mean(all.map((r) => r.ratio)), 2)} | ${fixed(mean(all.map((r) => r.faceFraction)), 2)} | ${fixed(mean(all.map((r) => r.ahead)))} |`);
  sections.push(`### ${spot}\n\nAttempt outcomes: ${[...outcomes].map(([o, c]) => `${o} ×${c}`).join(', ') || 'none'}.\n\n| Ride s | Distance m | Mean / top over ground m/s | Mean / top old label m/s | Crest c m/s | Required m/s | Over ground ÷ required | > 1.3 × required | Face fraction | Ahead of crest m (mean / p90) | Outcome |\n|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|\n${all.map((r) => `| ${fixed(r.seconds)} | ${fixed(r.distance, 0)} | ${fixed(r.meanSpeed)} / ${fixed(r.topSpeed)} | ${fixed(r.meanLabel)} / ${fixed(r.topLabel)} | ${fixed(r.crestSpeed)} | ${fixed(r.required)} | ${fixed(r.ratio, 2)} | ${fixed(r.fastShare * 100, 0)} % | ${fixed(r.faceFraction, 2)} | ${fixed(r.ahead)} / ${fixed(r.aheadP90)} | ${r.outcome} |`).join('\n') || '| — | | | | | | | | | | no ride |'}`);
}

const report = `# Ride report

Generated by \`npm run report:ride${process.argv.slice(2).length ? ` -- ${process.argv.slice(2).join(' ')}` : ''}\` (${new Date().toISOString().slice(0, 10)}, ${((Date.now() - started) / 60000).toFixed(1)} min). ${practice ? 'Practice groundswell' : 'Natural sea (Wave Lab defaults)'}, ${seedCount} seed(s) × ${minutes} min per spot, stage 2 on the CPU.

The runner's own rider rides, pushing back on the water${ghostAlongs.length ? `, with ${ghostAlongs.length} ghost riders along the break (they feel the water and the lip and push back on neither)` : ''}. An autopilot waits ${5} m outside the break line, paddles when a crest rises ${fixed(RISE, 2)} m behind it, pops up on the cue and holds a line 60° from the wave's travel toward the peel, turning up the face below 35 % of its height and down above 75 %. Rides of ${MIN_RIDE} s or more are measured every step against the wave under them (the wave-frame gauge).

**Research ranges** (the [surf-science survey](surf-gameplay-research.md) §1): accomplished surfers average 6.4 m/s and top out at 9.7 m/s (Forsyth et al. 2024); competitors peak at 9–12.5 m/s (Farley et al. 2012); the required speed is c / sin α (Walker 1974; Hutt et al. 2001); trim sits on the lower-to-mid face (Sugimoto 1998).

| Spot | Attempts | Stands | Rides ≥ ${MIN_RIDE} s | Mean ride s | Mean speed over ground m/s | Top m/s | Mean old label m/s | Crest c m/s | Required m/s | Over ground ÷ required | Face fraction | Ahead of crest m |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
${summary.join('\n')}

"Old label" is |board velocity|, which the HUD showed before P9: it includes vertical motion down the face. Speed over ground is horizontal.

${sections.join('\n\n')}
`;
writeFileSync(output, report);
console.log(`wrote ${output}`);
