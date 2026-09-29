/**
 * The body film's report (the riding-body plan, step 1): every scenario filmed
 * through each drawing pipeline, and how fluid the drawn body is. Writes
 * docs/research/body-fluidity.md.
 *
 *   npm run report:body
 *   npm run report:body -- --out /tmp/body.md
 */
import { writeFileSync } from 'node:fs';
import {
  FILM_SCENARIOS, balanceCue, boardMotion, breathing, crawlRate, drawnLag, filmBody, handSwing, headSteadiness, kneeGive, latestDrawer, paddleStroke, posed,
  repeatedFrames, rigAlone, shake, swimRoll, switchSpeeds, switchSpikes, trackDrawer, unevenness, type BodyFilm, type FilmOptions,
} from '../src/dev/bodyFilm';

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const output = option('out') ?? 'docs/research/body-fluidity.md';
const started = Date.now();

/** The drawing pipelines compared: today's page, and each step's layers as they land. */
const PIPELINES: { name: string; options: Omit<FilmOptions, 'rate' | 'delivery'> }[] = [
  { name: 'today (the newest snapshot, the rig alone)', options: { drawer: latestDrawer, pose: rigAlone } },
  { name: 'blended between physics steps', options: { drawer: trackDrawer, pose: rigAlone } },
  { name: 'and the switches blended out (the points, then the bones)', options: { drawer: trackDrawer, pose: posed() } },
];

const scenario = (name: string) => FILM_SCENARIOS.find((candidate) => candidate.name === name)!;
const after = (film: BodyFilm, from: number): BodyFilm => ({ rate: film.rate, frames: film.frames.filter((frame) => frame.time >= from) });
const fixed = (value: number, digits = 1) => (Number.isFinite(value) ? value.toFixed(digits) : '—');
const degrees = (radians: number) => (radians * 180) / Math.PI;

// The drawing's lag is read against the rig's own chest on the newest snapshot: since step 3 the drawn chest hinges and
// turns off the physics' torso roll, which no shift can match (the fit sat at its 0.3 s cap for every pipeline).
const reference = filmBody(scenario('weave'), { drawer: latestDrawer, pose: rigAlone, rate: 120 }).frames.map((frame) => frame.chestRoll);

const sections: string[] = [];
for (const { name, options } of PIPELINES) {
  const pops: string[] = [];
  for (const scene of ['pop-up and landing', 'compress mid-turn, the hand reaching', 'rail change', 'lying back down', 'a fall']) {
    const film = filmBody(scenario(scene), { ...options, rate: 60 });
    const spikes = switchSpikes(film);
    switchSpeeds(film).forEach((speed, i) => {
      pops.push(`| ${scene} | ${fixed(speed.time, 2)} s | ${speed.phase} | ${fixed(spikes[i].jointSpeed, 1)} | ${fixed(spikes[i].rotationSpeed, 1)} | ${fixed(speed.jointSpeed, 1)} | ${fixed(speed.rotationSpeed, 1)} |`);
    });
  }
  const repeated = repeatedFrames(filmBody(scenario('straight'), { ...options, rate: 120 }));
  const uneven = unevenness(filmBody(scenario('straight'), { ...options, rate: 60, delivery: 3 }));
  const evenly = unevenness(filmBody(scenario('straight'), { ...options, rate: 60 }));
  const compressed = filmBody(scenario('compress mid-turn, the hand reaching'), { ...options, rate: 120 });
  const carve = shake({ rate: compressed.rate, frames: compressed.frames.filter((frame) => frame.time >= 1.3 && frame.time < 1.9) });
  const jitter = shake({ rate: compressed.rate, frames: compressed.frames.filter((frame) => frame.time >= 1.3 && frame.time < 1.9) }, 4, 30);
  const straight = shake(after(filmBody(scenario('straight'), { ...options, rate: 120 }), 0.5));
  const weave = filmBody(scenario('weave'), { ...options, rate: 120 });
  const lag = drawnLag({ rate: weave.rate, frames: weave.frames.map((frame, i) => ({ ...frame, physicsRoll: reference[i] })) });
  // Step 4's secondary motion.
  const pumping = filmBody(scenario('pumping'), { ...options, rate: 60 });
  const chop = filmBody(scenario('chop'), { ...options, rate: 60 });
  const glide = after(filmBody(scenario('paddle then glide'), { ...options, rate: 60 }), 21);
  // Step 5's balance cue.
  const balance = balanceCue(filmBody(scenario('weave'), { ...options, rate: 60 }));
  // Step 8's paddle (steady, 5–18 s) at each display rate, and the swim once stroking.
  const paddles = [30, 60, 120].map((rate) => {
    const film = filmBody(scenario('paddle then glide'), { ...options, rate });
    return { rate, frames: film.frames.filter((frame) => frame.time >= 5 && frame.time < 18) };
  });
  const strokes = paddles.map((film) => paddleStroke(film, 'left'));
  const board = boardMotion(paddles[1], 1);
  const swim = after(filmBody(scenario('swimming'), { ...options, rate: 60 }), 4);
  const roll = swimRoll(swim);
  sections.push(`## ${name}

| Measure | Value |
|---|---:|
| Frames drawn again at 120 Hz, riding straight | ${fixed(100 * repeated, 0)} % |
| The board's travel unevenness, snapshots every step (60 Hz) | ${fixed(evenly, 2)} |
| The same, snapshots batched by 3 (a late worker) | ${fixed(uneven, 2)} |
| Chest roll in the wobble band (1.5–4 Hz), compressed mid-turn at 10 m/s (steady, 1.3–1.9 s) | ${fixed(degrees(carve), 2)}° RMS |
| Chest roll above it (4–30 Hz): jitter | ${fixed(degrees(jitter), 2)}° RMS |
| The same, riding straight at 7 m/s | ${fixed(degrees(straight), 2)}° RMS |
| The drawn chest's lag behind the rig's chest on the newest snapshot (weaving at 8 m/s) | ${fixed(1000 * lag, 0)} ms |
| The head's tilting over the chest's: weaving, pumping, on chop (1: none held back) | ${fixed(headSteadiness(weave), 2)}, ${fixed(headSteadiness(pumping), 2)}, ${fixed(headSteadiness(chop), 2)} |
| The free hands' swing about their shoulders, pumping (left, right) | ${fixed(100 * handSwing(pumping, 'left'), 1)}, ${fixed(100 * handSwing(pumping, 'right'), 1)} cm RMS |
| The drawn hips following the physics' leg on chop (correlation) | ${fixed(kneeGive(chop, 0.5), 2)} |
| Breathing: the head about the hips at 0.15–1 Hz, gliding after 20 s of paddling | ${fixed(1000 * breathing(glide), 1)} mm RMS |
| The balance cue: the hands' height about the shoulders per full alarm, weaving (correlation) | ${fixed(100 * balance.slope, 1)} cm (${fixed(balance.correlation, 2)}) |
| The paddle's left hand on the board at 30, 60 and 120 Hz: along, across, up and down (Nessler et al. 2015: 97, 17, 42–47 cm) | ${strokes.map((stroke) => `${fixed(100 * stroke.along, 0)}, ${fixed(100 * stroke.across, 0)}, ${fixed(100 * stroke.vertical, 0)}`).join('; ')} cm |
| Its strokes a minute, and the board's pitch and roll through a stroke (Nessler et al. 2019: about 50 a side at 1.7 m/s, 12°, 27–45°) | ${fixed(strokes[1].perMinute, 0)}, ${fixed(board.pitch, 1)}°, ${fixed(board.roll, 1)}° |
| The swimmer's roll each way and its mean, and its arm cycles a second (Payton et al. 1999: 57°, 66°; Kjendlie et al. 2004: 0.38) | ${fixed(roll.left, 0)}°, ${fixed(roll.right, 0)}°, ${fixed(roll.mean, 0)}°; ${fixed(crawlRate(swim, 'left'), 2)} |

At each switch (60 Hz), within 0.3 s: the largest one-frame spike of a joint (against the board, about the hips when fallen) and of a bone over the median of the three frames either side (a pop), and the fastest joint and bone (the physics' own transitions included):

| Scenario | At | Phase | Joint spike m/s | Bone spike rad/s | Fastest joint m/s | Fastest bone rad/s |
|---|---:|---|---:|---:|---:|---:|
${pops.join('\n')}
`);
}

const report = `# The body film: how fluid the drawn body is

Generated by \`npm run report:body${process.argv.slice(2).length ? ` -- ${process.argv.slice(2).join(' ')}` : ''}\` on ${new Date().toISOString().slice(0, 10)} (${((Date.now() - started) / 1000).toFixed(0)} s). The riding-body plan, step 1 (\`docs/superpowers/plans/2026-09-28-body-smoothing.md\`).

The real ride session is stepped at the game's 60 Hz, and its snapshots are drawn through the page's pipeline at a display rate: every frame's joints are recorded (\`src/dev/bodyFilm.ts\`, on the test humanoid). A switch is a phase change or a drawn point jumping more than 0.1 m against the board in one step. For scale: fast human limbs reach about 10–15 rad/s; a pop is far beyond that.

${sections.join('\n')}`;
writeFileSync(output, report);
console.log(report);
