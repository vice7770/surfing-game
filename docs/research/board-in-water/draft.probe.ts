// Probe 1 and 2 (board-in-water, 2026-11-12): how deep the board sits, and what holds it across a face.
// Analytic water only. Prints one line per state.
import { it } from 'vitest';
import { Vector3 } from 'three';
import { DEG, Slope, Tilting, emit, mean, place, r, run, type Rig, type State } from './lab';

const flat = new Slope(0);

function row(name: string, s: State | undefined, extra: Record<string, unknown> = {}): void {
  if (!s) {
    emit({ name, missing: true, ...extra });
    return;
  }
  emit({
    name, t: r(s.t), v: r(s.speed), draft: r(s.draft * 100, 1), meanDepth: r(s.meanDepth * 100, 1), wetL: r(s.wetLength), wetA: r(s.wetArea, 3),
    pitch: r(s.pitch, 1), roll: r(s.roll, 1), attack: r(s.attack, 1), slip: r(s.slip, 1), railBot: r(s.railBottom * 100, 1), railDeck: r(s.railDeck * 100, 1),
    fin: r(s.finSide, 3), rail: r(s.railSide, 3), press: r(s.pressureN, 2), buoy: r(s.buoyancyN, 2), load: r(s.load, 2), bank: r(s.bank, 1), phase: s.phase, fell: s.fell, ...extra,
  });
}

const heading = (rig: Rig) => {
  const f = new Vector3(0, 0, 1).applyQuaternion(rig.board.orientation);
  return Math.atan2(f.x, f.z) * DEG;
};

/** Frames within `band` of speed `v` after `after` s, averaged. */
function atSpeed(frames: State[], v: number, band = 0.15, after = 0.25): State | undefined {
  const near = frames.filter((f) => f.t >= after && Math.abs(f.speed - v) <= band);
  return near.length ? mean(near) : undefined;
}

it('flat water: lying, paddling, pop-up, standing, gliding, carving', () => {
  // The board alone.
  {
    const rig = place(flat, 0, 0, 0, 'none');
    const f = run(rig, flat, 3);
    row('board alone, still', mean(f.slice(-30)));
  }
  // Lying still, and paddling.
  {
    const rig = place(flat, 0, 0, 0, 'prone');
    const f = run(rig, flat, 4);
    row('prone, still', mean(f.slice(-30)));
  }
  let paddled: Rig;
  {
    const rig = place(flat, 0, 0, 0, 'prone');
    rig.rider!.paddle = true;
    const f = run(rig, flat, 8);
    row('prone, paddling (steady)', mean(f.slice(-60)));
    paddled = rig;
  }
  // Pop-up from the paddle's speed: the deepest point while rising, the first standing step, and 0.5 s on.
  for (const [label, rig, lead] of [['paddle speed', paddled!, 0], ['from 5 m/s prone', place(flat, 0, 0, 5.3, 'prone'), 0.3]] as const) {
    if (lead > 0) run(rig, flat, lead);
    rig.rider!.paddle = false;
    rig.rider!.popUp();
    const f = run(rig, flat, 2.5);
    const rising = f.filter((s) => s.phase === 'push' || s.phase === 'landing');
    const deepest = rising.reduce((a, b) => (b.draft > a.draft ? b : a), rising[0]);
    const firstStand = f.findIndex((s) => s.phase === 'standing');
    row(`pop-up (${label}): deepest while rising`, deepest, { pushToStand: r(firstStand * (1 / 60)) });
    row(`pop-up (${label}): first standing step`, f[firstStand]);
    row(`pop-up (${label}): 0.5 s after standing`, f[firstStand + 30] ?? f[f.length - 1]);
  }
  // Standing at rest.
  {
    const rig = place(flat, 0, 0, 0, 'standing');
    const f = run(rig, flat, 2);
    row('standing, at rest: 0.5 s', f[29]);
    row('standing, at rest: 2 s (or fall)', f[f.length - 1]);
  }
  // Gliding, standing, straight.
  for (const v of [5, 7, 9, 12]) {
    const rig = place(flat, 0, 0, v + 0.8, 'standing');
    const f = run(rig, flat, 3);
    row(`standing glide ${v} m/s`, atSpeed(f, v), { decel: r((f[10].speed - f[40].speed) / 0.5 / 9.81, 3) });
  }
});

it('carve frames 45–90 degrees into the turn', () => {
  for (const compress of [0, 1]) {
    const rig = place(flat, 0, 0, 7.7, 'standing');
    const start = heading(rig);
    const frames: State[] = [];
    run(rig, flat, 3, (s) => {
      const turned = Math.abs(((heading(rig) - start + 540) % 360) - 180);
      if (turned >= 45 && turned <= 90) frames.push(s);
    }, (t) => {
      if (t > 0.2) {
        rig.rider!.steer = 1;
        rig.rider!.compress = compress;
        rig.rider!.crouch = compress ? 0.6 : 0;
      }
    });
    row(`held carve${compress ? ' (Compress)' : ' (standing)'}, 45–90°`, frames.length ? mean(frames) : undefined, { frames: frames.length });
    if (frames.length) {
      const deepest = frames.reduce((a, b) => (b.railDeck > a.railDeck ? b : a));
      row(`held carve${compress ? ' (Compress)' : ' (standing)'}, deepest rail`, deepest);
    }
  }
});

it('planar faces: across at 90 and 45 degrees off the fall line, and straight down', () => {
  for (const angle of [20, 35, 50]) {
    const face = new Slope(angle);
    for (const off of [90, 45]) {
      const rig = place(face, 0, off, 7, "standing");
      const f = run(rig, face, 1.5);
      const window = f.filter((s) => s.t >= 0.3 && s.t <= 0.6);
      row(`${angle}° face, ${off}° off the fall line, 7 m/s, 0.3–0.6 s`, window.length ? mean(window) : f[f.length - 1]);
      row(`${angle}° face, ${off}° off the fall line: end`, f[f.length - 1], { heading: r(heading(rig), 0) });
    }
    // Across at 90°, the slope tilting in under the rider over 1.5 s (the start is then not a jolt), held 1.5 s more.
    {
      const tilt = new Tilting(angle, 1.5);
      const rig = place(tilt, 0, 90, 7.5, 'standing');
      const f = run(rig, tilt, 3);
      const window = f.filter((s) => s.t >= 2 && s.t <= 2.5);
      row(`${angle}° face tilted in, 90° off, 2–2.5 s`, window.length >= 25 ? mean(window) : undefined);
      row(`${angle}° face tilted in, 90° off: end`, f[f.length - 1], { heading: r(heading(rig), 0) });
    }
    const rig = place(face, 0, 0, 4, "standing");
    const f = run(rig, face, 2.5);
    for (const v of [5, 7, 9, 12]) row(`${angle}° face, straight down, ${v} m/s`, atSpeed(f, v, 0.25, 0.15));
    row(`${angle}° face, straight down: end`, f[f.length - 1]);
  }
});
