import { describe, expect, it } from 'vitest';
import { LESSONS, lessonById, type LessonFrame, type LessonGoal } from './lessons';

const STEP = 1 / 30;
const standing = (patch: Partial<LessonFrame> = {}): LessonFrame => ({
  dt: STEP, phase: 'standing', speed: 6, heading: 0,
  input: { steer: 0, trim: 0, crouch: 0, compress: 0, hand: false, paddle: false },
  wave: { valid: true, faceFraction: 0.5, crestBreaking: 0.2, aheadOfCrest: 5 },
  ...patch,
});
const input = (patch: Partial<LessonFrame['input']>): LessonFrame['input'] => ({ steer: 0, trim: 0, crouch: 0, compress: 0, hand: false, paddle: false, ...patch });
/** Feed frames for `seconds`, each built from the elapsed time; the goal's last state. */
const run = (goal: LessonGoal, seconds: number, frame: (t: number) => Partial<LessonFrame>) => {
  let state = goal.update(standing(frame(0)));
  for (let t = STEP; t <= seconds + 1e-9; t += STEP) state = goal.update(standing(frame(t)));
  return state;
};
const goal = (id: Parameters<typeof lessonById>[0]) => lessonById(id).goal();

describe('lesson goals', () => {
  it('passes lean after a swing each way with the lean held', () => {
    const lean = goal('lean');
    const first = run(lean, 1, (t) => ({ heading: 0.4 * t, input: input({ steer: 1 }) }));
    expect(first.passed).toBe(false);
    expect(first.count).toEqual({ done: 1, of: 2 });
    const second = run(lean, 1, (t) => ({ heading: 0.4 - 0.4 * t, input: input({ steer: -1 }) }));
    expect(second.passed).toBe(true);
  });

  it('does not count a swing the player did not lean for', () => {
    const lean = goal('lean');
    expect(run(lean, 2, (t) => ({ heading: Math.sin(t * 3) }))).toMatchObject({ passed: false, count: { done: 0, of: 2 } });
  });

  it('passes trim when weight forward speeds the board up and weight back slows it', () => {
    const trim = goal('trim');
    expect(run(trim, 1.2, (t) => ({ speed: 6 + t, input: input({ trim: 1 }) })).count).toEqual({ done: 1, of: 2 });
    expect(run(trim, 1.2, (t) => ({ speed: 7 - t, input: input({ trim: -1 }) })).passed).toBe(true);
  });

  it('passes crouch after three pumps that keep the speed', () => {
    const crouch = goal('crouch');
    const pump = (t: number) => ({ speed: 6 + 0.1 * t, input: input({ crouch: (t % 1) < 0.5 ? 1 : 0 }) });
    expect(run(crouch, 1.9, pump).passed).toBe(false);
    expect(run(crouch, 1.2, (t) => pump(t + 2)).passed).toBe(true);
  });

  it('does not pass crouch when the pumps bleed speed', () => {
    const crouch = goal('crouch');
    expect(run(crouch, 3.2, (t) => ({ speed: 6 - t, input: input({ crouch: (t % 1) < 0.5 ? 1 : 0 }) })).passed).toBe(false);
  });

  it('passes the top turn on the ride analysis’ own manoeuvres', () => {
    expect(goal('topTurn').update(standing({ live: { kind: 'snap', start: 2 } })).passed).toBe(true);
    expect(goal('topTurn').update(standing({ live: { kind: 'bottom turn', start: 1 } })).passed).toBe(false);
  });

  // The stances spec: the bottom turn is taught as its sequence, in order in one ride (de Sousa 2022's phases):
  // crouch on the drop, compress with a lean at the bottom, release it climbing the face, and the ride analysis
  // names a bottom turn.
  describe('the bottom turn’s sequence', () => {
    const wave = (faceFraction: number) => ({ valid: true, faceFraction, crestBreaking: 0.2, aheadOfCrest: 5 });
    const named = { live: { kind: 'bottom turn' as const, start: 1 } };
    const drop = (patch: Partial<LessonFrame['input']> = { crouch: 0.6 }) => (t: number) => ({ wave: wave(0.8 - 0.5 * t), input: input(patch) });
    const bottom = (patch: Partial<LessonFrame['input']> = { crouch: 0.6, compress: 1, steer: 1 }) => (t: number) => ({ wave: wave(0.3 - 0.1 * t), input: input(patch) });
    const climb = (patch: Partial<LessonFrame['input']> = { steer: 1 }) => (t: number) => ({ wave: wave(0.25 + 0.4 * t), input: input(patch), ...named });

    it('passes crouching on the drop, compressing with a lean at the bottom and releasing up the face', () => {
      const turn = goal('bottomTurn');
      expect(run(turn, 1, drop())).toMatchObject({ passed: false, count: { done: 1, of: 3 } });
      expect(run(turn, 0.5, bottom())).toMatchObject({ passed: false, count: { done: 2, of: 3 } });
      expect(run(turn, 1, climb()).passed).toBe(true);
    });

    // Review Focus 5.
    it('does not pass compressing before crouching', () => {
      const turn = goal('bottomTurn');
      run(turn, 1, drop({}));
      run(turn, 0.5, bottom({ compress: 1, steer: 1 }));
      expect(run(turn, 1, climb({ crouch: 0.6, steer: 1 })).passed).toBe(false);
    });

    it('does not pass without releasing Compress up the face', () => {
      const turn = goal('bottomTurn');
      run(turn, 1, drop());
      run(turn, 0.5, bottom());
      expect(run(turn, 1, climb({ compress: 1, steer: 1 })).passed).toBe(false);
    });

    it('does not pass on a compress without a lean, or the sequence without the ride analysis’ bottom turn', () => {
      const straight = goal('bottomTurn');
      run(straight, 1, drop());
      run(straight, 0.5, bottom({ crouch: 0.6, compress: 1 }));
      expect(run(straight, 1, climb()).passed).toBe(false);
      const unnamed = goal('bottomTurn');
      run(unnamed, 1, drop());
      run(unnamed, 0.5, bottom());
      expect(run(unnamed, 1, (t) => ({ wave: wave(0.25 + 0.4 * t), input: input({ steer: 1 }) })).passed).toBe(false);
    });

    it('starts over after a fall', () => {
      const turn = goal('bottomTurn');
      run(turn, 1, drop());
      run(turn, 0.5, bottom());
      turn.update(standing({ phase: 'fallen' }));
      expect(run(turn, 1, climb()).passed).toBe(false);
    });
  });

  it('passes the hand when it slows the board and lets the curl catch up', () => {
    const hand = goal('hand');
    expect(run(hand, 1.1, (t) => ({ speed: 6 - 1.2 * t, wave: { valid: true, faceFraction: 0.5, crestBreaking: 0.4, aheadOfCrest: 5 - 2.5 * t }, input: input({ hand: true }) })).passed).toBe(true);
    const idle = goal('hand');
    expect(run(idle, 1.1, (t) => ({ speed: 6 - 1.2 * t, wave: { valid: true, faceFraction: 0.5, crestBreaking: 0.4, aheadOfCrest: 5 - 2.5 * t } })).passed).toBe(false);
  });

  it('adds up the pocket, and passes at five seconds', () => {
    const pocket = goal('pocket');
    const inPocket = { wave: { valid: true, faceFraction: 0.6, crestBreaking: 0.5, aheadOfCrest: 2 } };
    expect(run(pocket, 3, () => inPocket).passed).toBe(false);
    run(pocket, 1, () => ({ wave: { valid: true, faceFraction: 0.2, crestBreaking: 0, aheadOfCrest: 12 } }));
    expect(run(pocket, 1.8, () => inPocket).passed).toBe(false);
    expect(run(pocket, 0.3, () => inPocket).passed).toBe(true);
  });

  it('passes the pop-up and the catch after two seconds on the feet', () => {
    for (const id of ['popUp', 'catch'] as const) {
      const g = goal(id);
      g.update(standing({ phase: 'prone' }));
      expect(run(g, 1.9, () => ({})).passed).toBe(false);
      g.update(standing({ phase: 'fallen' }));
      expect(run(g, 1.9, () => ({})).passed).toBe(false);
      expect(run(g, 0.2, () => ({})).passed).toBe(true);
    }
  });

  it('has nine lessons, the riding ones starting in the pocket', () => {
    expect(LESSONS.map((lesson) => lesson.id)).toEqual(['lean', 'trim', 'crouch', 'bottomTurn', 'topTurn', 'hand', 'pocket', 'popUp', 'catch']);
    expect(LESSONS.filter((lesson) => lesson.start === 'pocket')).toHaveLength(7);
    expect(lessonById('popUp').start).toBe('caught');
    expect(lessonById('catch').start).toBe('waiting');
    expect(LESSONS.filter((lesson) => lesson.hint).map((lesson) => lesson.hint)).toEqual(['lean', 'trim', 'crouch', 'hand']);
  });
});
