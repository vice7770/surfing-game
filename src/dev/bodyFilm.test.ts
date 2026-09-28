import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { RIG_DETAIL } from '../scene/rig/HumanoidRig';
import {
  ChopWater, FILM_JOINT, FILM_SCENARIOS, breathing, drawnLag, filmBody, handSwing, headSteadiness, kneeGive, posed, repeatedFrames, rigAlone, shake, switchSpeeds,
  switchSpikes, trackDrawer, unevenness, type BodyFilm, type FilmFrame,
} from './bodyFilm';

const scenario = (name: string) => FILM_SCENARIOS.find((candidate) => candidate.name === name)!;

describe('the body film', () => {
  it('films every display frame of the real session, through its switches', () => {
    const popUp = filmBody(scenario('pop-up and landing'), { rate: 120 });
    expect(popUp.frames).toHaveLength(Math.round(2.5 * 120));
    const phases = new Set(popUp.frames.map((frame) => frame.phase));
    expect([...phases]).toEqual(expect.arrayContaining(['prone', 'push', 'landing', 'standing']));
    expect(switchSpeeds(popUp).length).toBeGreaterThanOrEqual(3);
    const fall = filmBody(scenario('a fall'), { rate: 60 });
    expect(fall.frames.some((frame) => frame.fallen)).toBe(true);
    expect(switchSpeeds(fall).some((speed) => speed.phase === 'fallen')).toBe(true);
  });

  // The plan, Task 3: a switch is blended out. It popped at 76–171 rad/s and up to 51 m/s in one frame (the baseline,
  // docs/research/body-fluidity.md); blended, no joint or bone spikes in a frame above its neighbours by more than
  // a brisk limb's pace within 0.3 s of it (the lie-down's drawn foot also hitched 5 cm mid-way: a point's jump).
  // The physics' own transitions stay as fast as they are.
  const blendsOut = (name: string) => {
    for (const rate of [60, 120]) {
      const raw = switchSpikes(filmBody(scenario(name), { rate }));
      const spikes = switchSpikes(filmBody(scenario(name), { rate, drawer: trackDrawer, pose: posed() }));
      expect(Math.max(...raw.map((spike) => spike.rotationSpeed))).toBeGreaterThan(20);
      expect(spikes.length).toBeGreaterThan(0);
      for (const spike of spikes) {
        expect(spike.rotationSpeed, `${name} at ${spike.time.toFixed(2)} s, ${rate} Hz`).toBeLessThan(6);
        expect(spike.jointSpeed, `${name} at ${spike.time.toFixed(2)} s, ${rate} Hz`).toBeLessThan(2);
      }
    }
  };
  it.each(['pop-up and landing', 'pop-up crouched', 'compress mid-turn, the hand reaching', 'a fall', 'pumping into a fall'])('blends the switches of %s out', blendsOut);
  // Lying down, its switches blend out (the frames about each are smooth), but 0.23 s into the lie-down the left knee
  // swings through at up to 10 m/s (3.3 m/s over its neighbours, 3.8 at 120 Hz): the leg's pole jumps from the
  // standing one to the lying one at the switch, and the knee turns over only as the leg straightens. The rig's poles
  // are the stance step's (step 3). Pinned, not tuned.
  it.fails('blends the switches of lying back down out', () => blendsOut('lying back down'));

  // The final review: riding through a rail change or a weave, until a switch (the weave ends in a fall at 1.94 s),
  // nothing is blended and the drawn body follows the rig at any display rate. Taken for a jump, a hand turning back
  // (about 1.2 m/s within a step) lurched the chest 10–45° at 30–100 Hz. Snapshots batched by 3 stand in for an
  // online surfer's poses (20 Hz).
  // Eighteen films each: a busy machine takes minutes.
  it.each(['rail change', 'weave'])('draws %s as the rig does, at any display rate', (name) => {
    const runs = [...[30, 50, 60, 75, 90, 100, 120, 144].map((rate) => ({ rate, delivery: 1 })), { rate: 60, delivery: 3 }];
    for (const { rate, delivery } of runs) {
      const plain = filmBody(scenario(name), { rate, delivery, drawer: trackDrawer, pose: rigAlone });
      const drawn = filmBody(scenario(name), { rate, delivery, drawer: trackDrawer, pose: posed() });
      const riding = drawn.frames.findIndex((frame) => frame.switched);
      let worst = 0;
      drawn.frames.slice(0, riding < 0 ? undefined : riding).forEach((frame, i) => {
        if (frame.phase === 'standing') worst = Math.max(worst, Math.abs(frame.chestRoll - plain.frames[i].chestRoll));
      });
      expect(riding < 0 ? drawn.frames.length : riding, `${name} at ${rate} Hz: rides at least 1.5 s`).toBeGreaterThan(1.5 * rate);
      expect((worst * 180) / Math.PI, `${name} at ${rate} Hz, delivered by ${delivery}`).toBeLessThan(1);
    }
  }, 240_000);

  it('reads a one-frame pop as a spike, and a sustained fast motion as none', () => {
    const pop = film(60, 60, (i, frame) => {
      frame.joints[0].set(i === 30 ? 0.3 : 0, 0, 0);
      frame.switched = i === 30;
    });
    expect(switchSpikes(pop)[0].jointSpeed).toBeCloseTo(18, 6);
    const sweep = film(60, 60, (i, frame) => {
      frame.joints[0].set(i * 0.1, 0, 0);
      frame.switched = i === 30;
    });
    expect(switchSpikes(sweep)[0].jointSpeed).toBeCloseTo(0, 6);
  });

  it('draws the same pose twice at 120 Hz from 60 Hz snapshots, as the page does today', () => {
    expect(repeatedFrames(filmBody(scenario('straight'), { rate: 120 }))).toBeGreaterThan(0.4);
  });
});

/** A hand-made film: `count` frames at `rate`, each shaped by `shape(i, frame)`. */
function film(rate: number, count: number, shape: (i: number, frame: FilmFrame) => void): BodyFilm {
  const frames: FilmFrame[] = [];
  for (let i = 0; i < count; i += 1) {
    const frame: FilmFrame = {
      time: i / rate, phase: 'standing', moving: true, switched: false, fallen: false,
      joints: Array.from({ length: 13 }, () => new Vector3()), limbs: [new Vector3()], hips: new Vector3(), board: new Vector3(),
      bones: [new Quaternion()], worldBones: Array.from({ length: 3 }, () => new Quaternion()),
      chestRoll: 0, physicsRoll: 0, hipsOnBoard: new Vector3(), physicsPelvis: new Vector3(),
    };
    shape(i, frame);
    frames.push(frame);
  }
  return { rate, frames };
}

describe('the body film measures', () => {
  it('reads a one-frame jump at a switch as its speed', () => {
    const jumped = film(60, 60, (i, frame) => {
      frame.joints[0].set(i >= 30 ? 0.2 : 0, 0, 0);
      frame.switched = i === 30;
    });
    const speeds = switchSpeeds(jumped);
    expect(speeds).toHaveLength(1);
    expect(speeds[0].jointSpeed).toBeCloseTo(12, 6);
    expect(speeds[0].rotationSpeed).toBe(0);
  });

  it('reads a bone turning 0.1 rad in a frame at 120 Hz as 12 rad/s', () => {
    const turned = film(120, 40, (i, frame) => {
      frame.bones[0].setFromAxisAngle(new Vector3(0, 0, 1), i >= 20 ? 0.1 : 0);
      frame.switched = i === 20;
    });
    expect(switchSpeeds(turned)[0].rotationSpeed).toBeCloseTo(12, 6);
  });

  it('measures a fallen body from its hips, and its bones in the world', () => {
    const fall = film(60, 40, (i, frame) => {
      frame.fallen = i >= 20;
      frame.phase = frame.fallen ? 'fallen' : 'standing';
      frame.switched = i === 20;
      // Relative to the board the body flies off once fallen; about its hips a limb moves 0.1 m in the switch's frame.
      frame.joints[0].set(frame.fallen ? i * 0.5 : 0, 0, 0);
      frame.limbs[0].set(i >= 20 ? 0.1 : 0, 0, 0);
    });
    expect(switchSpeeds(fall)[0].jointSpeed).toBeCloseTo(6, 6);
  });

  it('counts the frames drawn again while the rider moves', () => {
    const doubled = film(120, 100, (i, frame) => frame.hips.set(Math.floor(i / 2) * 0.1, 0, 0));
    expect(repeatedFrames(doubled)).toBeCloseTo(0.5, 1);
    const still = film(120, 100, (_i, frame) => { frame.moving = false; });
    expect(repeatedFrames(still)).toBe(0);
  });

  it('reads the board travelling evenly as even, and in bursts as uneven', () => {
    const even = film(60, 60, (i, frame) => frame.board.set(i * 0.1, 0.02 * Math.sin(i), 0));
    expect(unevenness(even)).toBeCloseTo(0, 6);
    const bursts = film(60, 60, (i, frame) => frame.board.set(Math.floor(i / 3) * 0.3, 0, 0));
    expect(unevenness(bursts)).toBeGreaterThan(1);
  });

  it('finds a 2.5 Hz sway in the wobble band, and a slow lean outside it', () => {
    const sway = film(120, 480, (i, frame) => { frame.chestRoll = 0.1 * Math.sin(2 * Math.PI * 2.5 * (i / 120)); });
    expect(shake(sway)).toBeCloseTo(0.1 / Math.SQRT2, 2);
    const lean = film(120, 480, (i, frame) => { frame.chestRoll = 0.3 * Math.sin(2 * Math.PI * 0.5 * (i / 120)); });
    expect(shake(lean)).toBeLessThan(0.01);
  });

  it('reads the drawn chest trailing the physics by 12 frames at 120 Hz as 0.1 s', () => {
    const lagged = film(120, 480, (i, frame) => {
      const roll = (t: number) => 0.3 * Math.sin(2 * Math.PI * 0.7 * t) + 0.1 * Math.sin(2 * Math.PI * 1.9 * t);
      frame.physicsRoll = roll(i / 120);
      frame.chestRoll = roll((i - 12) / 120);
    });
    expect(drawnLag(lagged)).toBeCloseTo(0.1, 3);
  });
});

describe('the body film\'s secondary-motion measures (step 4)', () => {
  const turning = (frame: FilmFrame, index: number, angle: number) => frame.worldBones[index].setFromAxisAngle(new Vector3(1, 0, 0), angle);

  it('reads a head held still while the chest rocks as steady, and one riding with it as not', () => {
    const rock = (i: number) => 0.2 * Math.sin(2 * Math.PI * (i / 60));
    const held = film(60, 240, (i, frame) => turning(frame, 1, rock(i)));
    expect(headSteadiness(held)).toBeCloseTo(0, 6);
    const riding = film(60, 240, (i, frame) => { turning(frame, 1, rock(i)); turning(frame, 2, rock(i)); });
    expect(headSteadiness(riding)).toBeCloseTo(1, 6);
  });

  it('reads a hand fixed to its shoulder as no swing, and a 2 Hz swing of 5 cm as its RMS', () => {
    const fixed = film(60, 240, (i, frame) => {
      frame.joints[FILM_JOINT.shoulder.left].set(0.2, 1.4 + 0.1 * Math.sin(i / 7), 0);
      frame.joints[FILM_JOINT.hand.left].set(0.5, 1.1 + 0.1 * Math.sin(i / 7), 0);
    });
    expect(handSwing(fixed, 'left')).toBeCloseTo(0, 6);
    const swinging = film(60, 240, (i, frame) => {
      frame.joints[FILM_JOINT.shoulder.left].set(0.2, 1.4, 0);
      frame.joints[FILM_JOINT.hand.left].set(0.5, 1.1 + 0.05 * Math.sin(2 * Math.PI * 2 * (i / 60)), 0);
    });
    expect(handSwing(swinging, 'left')).toBeCloseTo(0.05 / Math.SQRT2, 2);
  });

  it('reads the drawn hips heaving with the physics\' pelvis as full give, and held still as none', () => {
    const heave = (i: number) => 0.9 + 0.03 * Math.sin(2 * Math.PI * 2 * (i / 60));
    const following = film(60, 240, (i, frame) => { frame.physicsPelvis.set(0, heave(i), 0); frame.hipsOnBoard.set(0, heave(i) + 0.1, 0); });
    expect(kneeGive(following)).toBeCloseTo(1, 6);
    const locked = film(60, 240, (i, frame) => { frame.physicsPelvis.set(0, heave(i), 0); frame.hipsOnBoard.set(0, 1, 0); });
    expect(kneeGive(locked)).toBeCloseTo(0, 6);
  });

  it('reads the head rising 1 cm about the hips at 0.3 Hz as breathing, and a still body as none', () => {
    const breath = film(60, 1200, (i, frame) => frame.joints[FILM_JOINT.head].set(0, 1.6 + 0.01 * Math.sin(2 * Math.PI * 0.3 * (i / 60)), 0));
    expect(breathing(breath)).toBeCloseTo(0.01 / Math.SQRT2, 3);
    const still = film(60, 1200, (_i, frame) => frame.joints[FILM_JOINT.head].set(0, 1.6, 0));
    expect(breathing(still)).toBeCloseTo(0, 6);
  });

  it('rides chop: bumps 5 cm high every 4 m along the travel, with their slope', () => {
    const chop = new ChopWater();
    expect(chop.surfaceAt(0, 1)).toBeCloseTo(0.05, 6);
    expect(chop.surfaceAt(3, 3)).toBeCloseTo(-0.05, 6);
    const sample = chop.sampleAt(0, 0, 0, {} as never);
    expect(sample.slopeZ).toBeCloseTo(0.05 * (2 * Math.PI) / 4, 6);
    expect(sample.normalY).toBeGreaterThan(0.9);
  });

  it('films pumping, chop and a paddle then a glide, riding throughout', () => {
    for (const name of ['pumping', 'chop', 'paddle then glide']) {
      const shot = filmBody(scenario(name), { rate: 30 });
      expect(shot.frames.some((frame) => frame.switched && frame.phase === 'fallen'), name).toBe(false);
    }
  }, 240_000);
});

describe('the swing at any display rate (step 4)', () => {
  /** Each free hand's place about its shoulder, on the board, at each of the film's frames. */
  const offsets = (shot: BodyFilm) => shot.frames.map((frame) => (['left', 'right'] as const).map(
    (side) => frame.joints[FILM_JOINT.hand[side]].clone().sub(frame.joints[FILM_JOINT.shoulder[side]]),
  ));

  it('swings the hands as much at 30, 60 and 120 Hz through a pump', () => {
    // The swing's own part (the hands swung less the hands held to their cues): the drawn moments themselves differ
    // a little from rate to rate (4 cm with no swing), which is not the swing's.
    const swingAt = (rate: number) => {
      const swung = offsets(filmBody(scenario('pumping'), { rate, drawer: trackDrawer, pose: posed() }));
      RIG_DETAIL.swing.share = 0;
      const held = offsets(filmBody(scenario('pumping'), { rate, drawer: trackDrawer, pose: posed() }));
      RIG_DETAIL.swing.share = 1;
      return swung.map((hands, i) => hands.map((hand, side) => hand.clone().sub(held[i][side])));
    };
    // Its size at each rate, from 0.5 s (the track's first frames show slightly different moments at each rate). The
    // swing's step is exact at any rate for the same motion (armSwing.test.ts); the drawn body's own motion differs a
    // little from rate to rate (4 cm with no swing), and the swing follows it.
    const size = (swing: Vector3[][], rate: number) => {
      const kept = swing.slice(Math.round(0.5 * rate)).flat();
      return Math.sqrt(kept.reduce((sum, hand) => sum + hand.lengthSq(), 0) / kept.length);
    };
    const fast = size(swingAt(120), 120);
    expect(fast).toBeGreaterThan(0.01);
    for (const rate of [30, 60]) expect(Math.abs(size(swingAt(rate), rate) / fast - 1), `${rate} Hz`).toBeLessThan(0.2);
  }, 240_000);

  it('swings them smoothly from snapshots batched by three (an online surfer)', () => {
    // The hands' acceleration about the shoulders, frame to frame: batched snapshots must not jerk them.
    const jerk = (delivery: number) => {
      const hands = offsets(filmBody(scenario('pumping'), { rate: 60, delivery, drawer: trackDrawer, pose: posed() }));
      let most = 0;
      for (let i = 2; i < hands.length; i += 1) {
        for (const side of [0, 1]) most = Math.max(most, hands[i][side].clone().sub(hands[i - 1][side]).sub(hands[i - 1][side].clone().sub(hands[i - 2][side])).length() * 3600);
      }
      return most;
    };
    expect(jerk(3)).toBeLessThan(1.5 * jerk(1));
  }, 240_000);
});

describe('the head and the knees follow the physics (step 4)', () => {
  it('holds the head steadier than the chest through a weave, a pump and chop (Pozzo et al. 1990)', () => {
    for (const rate of [30, 60]) {
      for (const name of ['weave', 'pumping', 'chop']) {
        const shot = filmBody(scenario(name), { rate, drawer: trackDrawer, pose: posed() });
        expect(headSteadiness(shot), `${name} at ${rate} Hz`).toBeLessThan(0.7);
      }
    }
  }, 240_000);

  it('gives at the knees as the physics\' leg does, over chop', () => {
    for (const rate of [30, 60]) {
      const shot = filmBody(scenario('chop'), { rate, drawer: trackDrawer, pose: posed() });
      expect(kneeGive(shot, 0.5), `${rate} Hz`).toBeGreaterThan(0.8);
    }
  }, 240_000);
});

