import { describe, expect, it } from 'vitest';
import type { Action } from '../game/Bindings';
import { LessonFlow } from '../game/school/lessonFlow';
import { LESSONS, lessonById } from '../game/school/lessons';
import { SchoolProgress } from '../game/school/schoolProgress';
import { lessonCardModel, lessonHud, lessonKeys, schoolListModel } from './schoolModel';

const keyboard: Record<string, string> = { steerLeft: '←', steerRight: '→', trimForward: 'W', trimBack: 'S', crouch: 'Shift', hand: 'E', paddle: 'Space', popUp: 'Enter' };
const label = (action: Action) => keyboard[action] ?? action;

describe('school models', () => {
  it('lists the lessons in order, marking the passed ones', () => {
    const progress = new SchoolProgress();
    progress.pass('trim');
    const list = schoolListModel(progress, LESSONS);
    expect(list.rows.map((row) => row.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(list.rows[0]).toMatchObject({ id: 'lean', title: 'Lean', passed: false });
    expect(list.rows[1].passed).toBe(true);
    expect(list.progress).toBe('1 of 10 passed');
  });

  it('names the lesson’s keys for the device in use', () => {
    expect(lessonKeys(lessonById('lean'), label)).toBe('← →');
    expect(lessonKeys(lessonById('trim'), label)).toBe('W S');
    expect(lessonKeys(lessonById('catch'), label)).toBe('Space · Enter');
    expect(lessonKeys(lessonById('trim'), () => 'Right stick')).toBe('Right stick');
  });

  it('puts the explanation, the diagram and the keys on the card', () => {
    const card = lessonCardModel(lessonById('crouch'), label);
    expect(card).toMatchObject({ number: 3, title: 'Crouch and extend', keys: 'Shift', diagram: 'crouch' });
    expect(card.explain).toContain('Bend your knees');
  });

  it('prompts during an attempt with the goal’s count', () => {
    const flow = new LessonFlow(lessonById('lean'));
    flow.start();
    flow.goal = { progress: 0.5, passed: false, count: { done: 1, of: 2 } };
    expect(lessonHud(flow, label, 'R')).toEqual({ prompt: 'Lean with ← →, one way and then the other', coach: '1 of 2' });
    const pocket = new LessonFlow(lessonById('pocket'));
    pocket.start();
    pocket.goal = { progress: 0.4, passed: false, count: { done: 2, of: 5, seconds: true } };
    expect(lessonHud(pocket, label, 'R').coach).toBe('2 of 5 s');
  });

  it('after a miss, says why and what to try, and that the wave comes round again', () => {
    const flow = new LessonFlow(lessonById('lean'));
    flow.start();
    flow.frame({ dt: 0.1, phase: 'fallen', separation: 'foot slip', speed: 0, heading: 0, input: { steer: 0, trim: 0, crouch: 0, hand: false, paddle: false }, wave: { valid: false, faceFraction: 0, crestBreaking: 0, aheadOfCrest: 0 } });
    expect(lessonHud(flow, label, 'R')).toEqual({
      prompt: 'Feet slipped — Hold the lean a little longer; the board needs a moment to bite.',
      coach: 'Same wave again in a moment · R now',
    });
  });

  it('in Free Practice, leaves the ride its own prompts', () => {
    const flow = new LessonFlow(undefined, { start: 'waiting' });
    flow.start();
    expect(lessonHud(flow, label, 'R')).toEqual({ prompt: undefined, coach: 'Free Practice · R to start again' });
  });
});
