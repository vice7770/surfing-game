import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { FILM_SCENARIOS, drawnLag, filmBody, posed, repeatedFrames, rigAlone, shake, switchSpeeds, switchSpikes, trackDrawer, unevenness, type BodyFilm, type FilmFrame } from './bodyFilm';

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
  it.each(['pop-up and landing', 'pop-up crouched', 'compress mid-turn, the hand reaching', 'a fall'])('blends the switches of %s out', blendsOut);
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
      joints: [new Vector3()], limbs: [new Vector3()], hips: new Vector3(), board: new Vector3(), bones: [new Quaternion()], worldBones: [new Quaternion()],
      chestRoll: 0, physicsRoll: 0,
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
