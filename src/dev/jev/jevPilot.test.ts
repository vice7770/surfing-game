import { describe, expect, it } from 'vitest';
import type { WaveFrame } from '../../physics/waveFrame';
import type { Decider, Questions, Verdict } from './answers';
import { IDLE_PLAN, LINE_ANGLES, Motor, steerOnto, type Live } from './motor';
import { approachWord, headingWord, Observer, sizeWord, type Senses } from './observe';
import { JevPilot } from './pilot';
import { questionsFor } from './questions';

const wave = (over: Partial<WaveFrame> = {}): WaveFrame => ({
  valid: true, directionX: 0, directionZ: 1, aheadOfCrest: 10, crestSpeed: 6, faceHeight: 1.2, faceFraction: 0.1,
  crestBreaking: 0, curlDistance: Infinity, curlSide: 0, speedOverGround: 1, speedShoreward: 1, speedAlongCrest: 0, requiredSpeed: Infinity,
  ...over,
});

const senses = (over: Partial<Senses> = {}): Senses => ({
  phase: 'prone', cue: false, speed: 1, balance: 1, wave: wave(), heading: 0, peelDirection: 1, outside: 6, boardInReach: false, rising: false,
  ...over,
});

const choice = (picked: string, confidence = 0.9) => ({ type: 'choice' as const, choice: picked, confidence, probabilities: { [picked]: confidence } });
const verdict = (answers: Verdict['answers'], latencyMs = 250): Verdict => ({ answers, latencyMs, inputTokens: 400, costUsd: 0 });
const live = (over: Partial<Live> = {}): Live => ({ phase: 'prone', heading: 0, wave: wave(), boardInReach: false, ...over });

describe('the observation', () => {
  it('names wave sizes and how near the wave is in words, not metres', () => {
    expect(sizeWord(0.4)).toBe('knee-high');
    expect(sizeWord(1.1)).toBe('chest-high');
    expect(sizeWord(3)).toBe('double overhead');
    expect(approachWord(wave({ aheadOfCrest: 30 }))).toBe('far behind');
    expect(approachWord(wave({ aheadOfCrest: 4, faceFraction: 0.5 }))).toBe('lifting your board');
    expect(approachWord(wave({ aheadOfCrest: -2 }))).toBe('passed under you');
    // Water standing high behind the board is a wave coming, whichever crest the gauge follows.
    expect(approachWord(wave({ aheadOfCrest: -2 }), true)).toBe('coming, a few seconds away');
    expect(approachWord(wave({ valid: false }))).toBe('none close');
  });

  it('reads the board\'s +x as its left', () => {
    expect(headingWord(0, 0, 1)).toBe('straight at the beach');
    expect(headingWord((50 * Math.PI) / 180, 0, 1)).toBe('angled along the open face');
    expect(headingWord((-50 * Math.PI) / 180, 0, 1)).toBe('angled toward the curl');
    expect(headingWord((50 * Math.PI) / 180, 0, 0)).toBe('angled left');
  });

  it('shows the prompt only while the game does, and the open face away from the curl', () => {
    const observer = new Observer();
    const quiet = observer.observe(senses(), 0);
    expect(quiet.state.prompt).toBeUndefined();
    const cue = observer.observe(senses({ cue: true, wave: wave({ aheadOfCrest: 3, curlSide: 1, curlDistance: 5 }) }), 0.1);
    expect(cue.state.prompt).toBe('POP UP NOW');
    expect(cue.open).toBe(-1);
    expect(cue.openSide).toBe('right');
  });
});

describe('the questions', () => {
  const observer = new Observer();

  it('ask about the pop-up only while the prompt shows, and offer a fresh start only inside with nothing coming', () => {
    expect(questionsFor(observer.observe(senses(), 0)).pop).toBeUndefined();
    expect(questionsFor(observer.observe(senses({ cue: true }), 0.1)).pop).toBeDefined();
    const outside = questionsFor(observer.observe(senses({ wave: wave({ aheadOfCrest: -3 }) }), 0.2));
    expect(outside.paddle.type === 'choice' && 'reset' in outside.paddle.criteria).toBe(false);
    const inside = questionsFor(observer.observe(senses({ outside: -10, wave: wave({ aheadOfCrest: -3 }) }), 0.3));
    expect(inside.paddle.type === 'choice' && 'reset' in inside.paddle.criteria).toBe(true);
  });

  it('ask a standing rider for a line, the weight and a stance', () => {
    const q = questionsFor(observer.observe(senses({ phase: 'standing', wave: wave({ aheadOfCrest: 3, faceFraction: 0.5 }) }), 0.4));
    expect(Object.keys(q).sort()).toEqual(['line', 'stance', 'weight']);
  });
});

describe('the motor', () => {
  const observer = new Observer();

  it('presses the pop-up once for an answer that says stand', () => {
    const motor = new Motor();
    const obs = observer.observe(senses({ cue: true }), 0);
    const plan = motor.plan(verdict({ paddle: choice('go'), pop: choice('stand') }), obs, IDLE_PLAN, ['paddle', 'pop']);
    expect(plan.pop).toBe(true);
    expect(motor.act(plan, live(), 1 / 60).popUp).toBe(true);
    expect(motor.act(plan, live(), 1 / 60).popUp).toBe(false);
    expect(motor.pops).toBe(1);
  });

  it('keeps the last plan for an unanswered question, and counts it', () => {
    const motor = new Motor();
    const obs = observer.observe(senses(), 0);
    const going = motor.plan(verdict({ paddle: choice('go') }), obs, IDLE_PLAN, ['paddle']);
    const after = motor.plan(verdict({}), obs, going, ['paddle', 'aim']);
    expect(after.paddle).toBe(true);
    expect(motor.missing).toBe(2);
  });

  it('steers a standing rider onto the line toward the open face, and keeps its hands off while popping up', () => {
    const motor = new Motor({ pocketReflex: true });
    const obs = observer.observe(senses({ phase: 'standing', peelDirection: 1 }), 0);
    const plan = motor.plan(verdict({ line: choice('along'), weight: choice('forward'), stance: choice('low') }), obs, IDLE_PLAN, ['line', 'weight', 'stance']);
    let riding = motor.act(plan, live({ phase: 'standing' }), 1 / 60);
    // The thumb eases onto the line: a lean toward the open face (+x, the board's left) that grows to the full one.
    expect(riding.steer).toBeGreaterThan(0);
    for (let i = 0; i < 60; i += 1) riding = motor.act(plan, live({ phase: 'standing' }), 1 / 60);
    expect(riding.steer).toBeCloseTo(steerOnto(LINE_ANGLES.along, 0, 0, 0.6), 1);
    expect(riding.trim).toBeGreaterThan(0);
    expect(riding.pocketReflex).toBe(true);
    expect(riding.crouch).toBeGreaterThan(0);
    const popping = motor.act(plan, live({ phase: 'landing' }), 1 / 60);
    expect(popping.steer).toBe(0);
    // Just up, on a plan from a look taken while popping up: the rider holds its own line until a standing look lands.
    const landingPlan = motor.plan(verdict({ line: choice('along') }), observer.observe(senses({ phase: 'landing' }), 1), IDLE_PLAN, ['line']);
    expect(motor.act(landingPlan, live({ phase: 'standing' }), 1 / 60).steer).toBe(0);
  });
});

describe('the pilot', () => {
  /** A stand-in for Jev that answers after `latency` ms of a clock the test turns. */
  function fakeJev(latency: number, clock: { now: number }) {
    const calls: { questions: Questions; resolve: () => void }[] = [];
    const decider: Decider = {
      decide: (_state, questions) => new Promise<Verdict>((resolve) => {
        calls.push({ questions, resolve: () => resolve(verdict({ paddle: choice('go') }, latency)) });
      }),
    };
    return { decider, calls, clock };
  }

  it('lands an answer at its look plus its own latency, the sea held only when it could fall due', async () => {
    const clock = { now: 0 };
    const jev = fakeJev(250, clock);
    // The sea may not run ahead of the wall clock while a call is out: a wait moves the test's clock.
    let waited = 0;
    const sleep = async (ms: number) => { clock.now += ms; waited += ms; };
    const pilot = new JevPilot(jev.decider, { reaction: 'real', hz: 10, now: () => clock.now, sleep });
    const dt = 1 / 60;
    let t = 0;
    for (; t < 0.2; t += dt) await pilot.step(t, dt, () => senses(), () => live());
    expect(pilot.landed).toBe(0);
    // Held to the wall clock, never further: the sea's 0.2 s took about 0.2 s of waiting.
    expect(waited).toBeGreaterThan(150);
    expect(waited).toBeLessThan(260);
    jev.calls.forEach((call) => call.resolve());
    await Promise.resolve();
    for (; t < 0.27; t += dt) await pilot.step(t, dt, () => senses(), () => live());
    expect(pilot.landed).toBeGreaterThan(0);
    expect(pilot.last!.lag).toBeGreaterThanOrEqual(0.25 - 1e-9);
    expect(pilot.plan.paddle).toBe(true);
  });

  it('in lockstep waits for every answer and looks once at a time', async () => {
    let calls = 0;
    const decider: Decider = { decide: async () => { calls += 1; return verdict({ paddle: choice('go') }, 300); } };
    const pilot = new JevPilot(decider, { reaction: 0, hz: 10 });
    const dt = 1 / 60;
    for (let t = 0; t < 1; t += dt) await pilot.step(t, dt, () => senses(), () => live());
    expect(calls).toBe(10);
    expect(pilot.landed).toBe(10);
    expect(pilot.inFlight).toBe(0);
  });
});
