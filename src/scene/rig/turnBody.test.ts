import { afterEach, describe, expect, it } from 'vitest';
import { TURN_FILMS } from '../../dev/ridingPoses';
import type { StanceName } from '../../physics/riderPosture';
import { RIG_SWITCHES, turnBodySwitches, type RigSwitches } from './stanceBlend';
import { turnFilm, type TurnFrame } from './turnBodyFilm';

// The turning body (2026-11-10; `docs/research/turn-body-2026-11-10/drawn-fixes.md`): three drawn-only switches, each
// read through a whole turn as the page draws it (`TURN_FILMS`: flat water at 8 m/s, the stick at 0.3 s), at 60 Hz and
// drawn every other step (a 30 Hz page), Regular and Goofy. The owner's references: the body leans into the turn in one
// line with the board on its rail; the head, then the shoulders, then the hips turn before the board; in a cutback the
// back hand drops toward the water.
const SWITCHES = {
  off: {},
  trunk: { turnTrunk: 'lean' },
  lead: { turnLead: 'on' },
  hand: { cutbackHand: 'back' },
  all: { turnTrunk: 'lean', turnLead: 'on', cutbackHand: 'back' },
} as const satisfies Record<string, RigSwitches>;
type Mode = keyof typeof SWITCHES;
const STANCES: readonly StanceName[] = ['regular', 'goofy'];
/** Every step, and every other one. */
const RATES = [1, 2] as const;
const STICK_AT = 0.3;

const films = new Map<string, TurnFrame[]>();
function film(id: string, stance: StanceName, mode: Mode, every = 1, remote = false): TurnFrame[] {
  const key = `${id} ${stance} ${mode} ${every} ${remote}`;
  let frames = films.get(key);
  if (!frames) films.set(key, (frames = turnFilm(TURN_FILMS[id], stance, SWITCHES[mode], every, remote)));
  return frames;
}
const between = (frames: TurnFrame[], from: number, to: number) => frames.filter((frame) => frame.t >= from - 1e-6 && frame.t <= to + 1e-6);
const most = (values: number[]) => Math.max(...values);
const least = (values: number[]) => Math.min(...values);
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
/** The drawn trunk's line off the physics' lean line, across the board, °. */
const offLine = (frames: TurnFrame[]) => frames.map((frame) => Math.abs(frame.drawnLine - frame.physicsLine));
/**
 * How long after the stick a part is first `by`° further into the first turn than it was (`board`: the board's own
 * heading), s; ∞ if never while the stick is held that way.
 */
function onset(frames: TurnFrame[], part: 'head' | 'chest' | 'hips' | 'heading', by: number): number {
  const first = frames.findIndex((frame) => frame.steer !== 0);
  const way = Math.sign(frames[first].steer);
  const from = frames[first - 1];
  const hit = frames.slice(first).find((frame) => frame.steer === frames[first].steer && way * (frame[part] - from[part]) > by);
  return hit ? hit.t - STICK_AT : Number.POSITIVE_INFINITY;
}

afterEach(() => {
  expect(RIG_SWITCHES).toEqual({});
});

describe('the turning body\'s switches (`turnBodySwitches`)', () => {
  it('reads each switch from the address, `turnBody=on` for all three, and none by default or off the dev tools', () => {
    expect(turnBodySwitches('')).toEqual({});
    expect(turnBodySwitches('?turnTrunk=lean')).toEqual({ turnTrunk: 'lean' });
    expect(turnBodySwitches('?motion=turn-toe&turnLead=on')).toEqual({ turnLead: 'on' });
    expect(turnBodySwitches('?cutbackHand=back')).toEqual({ cutbackHand: 'back' });
    expect(turnBodySwitches('?turnBody=on')).toEqual(SWITCHES.all);
    expect(turnBodySwitches('?turnTrunk=fold&turnLead=off&cutbackHand=front&turnBody=off')).toEqual({});
    expect(turnBodySwitches('?turnBody=on', false)).toEqual({});
  });

  it('off, the stick draws nothing: the body is the same with it and without (as another player\'s rider)', () => {
    expect(film('turn-toe', 'regular', 'off')).toEqual(film('turn-toe', 'regular', 'off', 1, true).map((frame, i) => ({ ...frame, steer: film('turn-toe', 'regular', 'off')[i].steer })));
  });
});

describe('`turnTrunk=lean`: the trunk leans into the turn in the body\'s line', () => {
  it.each(STANCES)('%s: through a Compress carve the drawn trunk stays by the physics\' lean line, toe side and heel side', (stance) => {
    for (const every of RATES) {
      for (const [id, bound] of [['turn-toe', 10], ['turn-heel', 14]] as const) {
        // From 0.5 s after the stick (the turn's weight in) to its release.
        const carve = between(film(id, stance, 'trunk', every), 0.8, 1.8);
        const before = between(film(id, stance, 'off'), 0.8, 1.8);
        // Measured: toe side 6.8° on average and 8.1° at most (25° and 30° before); heel side 7.7° and 13.3° (14° and
        // 28°), the most in the turn's first half second, the lean coming in with the turn's weight.
        expect(mean(offLine(carve)), `${id} ${every}`).toBeLessThan(9);
        expect(most(offLine(carve)), `${id} ${every}`).toBeLessThan(bound);
        expect(most(offLine(before)), id).toBeGreaterThan(25);
        // The trunk no further from upright than the lean asks: 43° toe side (66° folded before), 48° heel side (58°).
        expect(most(carve.map((frame) => frame.tilt)), `${id} ${every}`).toBeLessThan(50);
        expect(most(carve.map((frame) => frame.tilt)), `${id} ${every}`).toBeLessThan(most(before.map((frame) => frame.tilt)) - 8);
      }
    }
  });

  it('the stick alone (standing) and the cutback\'s rail change keep the line too', () => {
    // Standing, toe side: 8.7° at most (16° before). The cutback's Snap, through the rail change: 19° at most as the
    // physics' line swings 80° across in half a second (57° before), 10° on average (40°).
    expect(most(offLine(between(film('turn-stand-toe', 'regular', 'trunk'), 0.8, 1.8)))).toBeLessThan(10);
    const snap = between(film('turn-cutback', 'regular', 'trunk'), 1.8, 2.5);
    expect(most(offLine(snap))).toBeLessThan(22);
    expect(mean(offLine(snap))).toBeLessThan(12);
    expect(most(offLine(between(film('turn-cutback', 'regular', 'off'), 1.8, 2.5)))).toBeGreaterThan(50);
  });
});

describe('`turnLead=on`: the head, then the shoulders, then the hips turn with the stick, before the board', () => {
  it.each(STANCES)('%s: head first, the chest about 0.1 s later, the hips after, all before the board has turned 10°', (stance) => {
    for (const every of RATES) {
      for (const id of ['turn-toe', 'turn-heel']) {
        const frames = film(id, stance, 'lead', every);
        const board = onset(frames, 'heading', 10);
        const head = onset(frames, 'head', 10);
        const chest = onset(frames, 'chest', 10);
        // Measured (60 Hz / 30 Hz): the head 10° into the turn 0.07 / 0.10 s after the stick, the chest 0.18 / 0.20 s,
        // the hips 5° at 0.28–0.30 s; the board's heading 10° at 0.47 s.
        expect(head, `${id} ${every}`).toBeLessThan(0.13);
        expect(chest, `${id} ${every}`).toBeGreaterThan(head + 0.06);
        expect(chest, `${id} ${every}`).toBeLessThan(0.25);
        expect(onset(frames, 'hips', 5), `${id} ${every}`).toBeGreaterThan(onset(frames, 'chest', 5) + 0.06);
        expect(onset(frames, 'hips', 5), `${id} ${every}`).toBeLessThan(0.36);
        expect(board, `${id} ${every}`).toBeGreaterThan(0.4);
        // Before: the head 0.63 s after the stick, after the board; the chest 1.2 s (toe side) or never.
        const before = film(id, stance, 'off', every);
        expect(onset(before, 'head', 10), `${id} ${every}`).toBeGreaterThan(board);
        expect(onset(before, 'chest', 10), `${id} ${every}`).toBeGreaterThan(1);
      }
    }
  });

  it('leads the turn the board gives, not on top of it: held through the carve, the head and the chest end where they did', () => {
    for (const id of ['turn-toe', 'turn-heel']) {
      const held = between(film(id, 'regular', 'lead'), 1.5, 1.8);
      const before = between(film(id, 'regular', 'off'), 1.5, 1.8);
      for (const part of ['head', 'chest'] as const) expect(Math.abs(mean(held.map((frame) => frame[part])) - mean(before.map((frame) => frame[part]))), `${id} ${part}`).toBeLessThan(12);
    }
  });

  it('with no stick (another player\'s rider) the body is drawn as before', () => {
    const remote = film('turn-toe', 'regular', 'lead', 1, true);
    const before = film('turn-toe', 'regular', 'off');
    expect(remote.map((frame) => [frame.head, frame.chest, frame.hips, frame.drawnLine, frame.frontHand, frame.backHand])).toEqual(before.map((frame) => [frame.head, frame.chest, frame.hips, frame.drawnLine, frame.frontHand, frame.backHand]));
  });
});

describe('`cutbackHand=back`: in a frontside cutback the back hand goes to the water', () => {
  it.each(STANCES)('%s: the back hand low off the rail, the front arm up and toward where the board goes', (stance) => {
    for (const every of RATES) {
      // The Snap's last 0.4 s, the board on its heels' rail and coming round.
      const late = between(film('turn-cutback', stance, 'hand', every), 2.1, 2.5);
      const before = between(film('turn-cutback', stance, 'off', every), 2.1, 2.5);
      // Measured: the back hand down to 0.10 m over the water (0.67 m at its lowest before, held out), never under it;
      // the front hand 0.45–0.64 m up (0.11–0.32 m before: it was the one reaching down).
      expect(least(late.map((frame) => frame.backHand)), `${every}`).toBeLessThan(0.25);
      expect(least(late.map((frame) => frame.backHand)), `${every}`).toBeGreaterThan(0);
      expect(least(before.map((frame) => frame.backHand)), `${every}`).toBeGreaterThan(0.5);
      expect(least(late.map((frame) => frame.frontHand)), `${every}`).toBeGreaterThan(0.4);
      expect(most(before.map((frame) => frame.frontHand)), `${every}`).toBeLessThan(0.36);
      // The front arm toward the turn: its hand's heading off the nose the way the board is turning (the cutback's
      // stick, against the first turn's), 50–60° at most.
      const way = Math.sign(late[0].steer);
      expect(most(late.map((frame) => way * frame.frontHandOff)), `${every}`).toBeGreaterThan(20);
    }
  });

  it.each(STANCES)('%s: the hands hand over through the rail change, neither faster than before', (stance) => {
    for (const every of RATES) {
      const held = between(film('turn-cutback', stance, 'hand', every), STICK_AT, 2.5);
      const before = between(film('turn-cutback', stance, 'off', every), STICK_AT, 2.5);
      const fastest = (frames: TurnFrame[]) => most(frames.flatMap((frame) => [frame.frontHandSpeed, frame.backHandSpeed]));
      // Measured: the fastest wrist against the board 13 m/s at 60 Hz in both (Snap's trailing arm swinging back as Snap
      // comes in, as before), 5.1 m/s against 6.1 at 30 Hz.
      expect(fastest(held), `${every}`).toBeLessThan(fastest(before) + 1);
      // The back hand comes down over a quarter second of the Snap, not at once (0.92 m over the water to 0.33 m between
      // 2.0 and 2.2 s): 0.18 m lower from one 1/30 s to the next at most, 6 m/s, half the old swing's speed.
      const drops = held.slice(2).map((frame, i) => held[i + 2 - 2 / every].backHand - frame.backHand);
      expect(most(drops), `${every}`).toBeLessThan(0.22);
    }
  });

  it('backside, and in every turn without Snap, the hands are as before', () => {
    for (const id of ['turn-cutback-backside', 'turn-toe']) {
      const hands = (mode: Mode) => film(id, 'regular', mode).map((frame) => [frame.frontHand, frame.backHand]);
      expect(hands('hand'), id).toEqual(hands('off'));
    }
  });
});

describe('all three on (`turnBody=on`): the body still stands on the board', () => {
  it.each([['regular', 2], ['goofy', 1]] as const)('%s, every %i step: soft knees, planted feet, quiet arms, the hips between the feet', (stance, every) => {
    for (const id of Object.keys(TURN_FILMS)) {
      const until = id.includes('cutback') ? 2.5 : 1.8;
      const held = between(film(id, stance, 'all', every), STICK_AT, until);
      const before = between(film(id, stance, 'off', every), STICK_AT, until);
      const knees = held.flatMap((frame) => [frame.kneeFront, frame.kneeRear]);
      // No locked knee (the heel-side standing turn's front leg 163° at its straightest; 171° before) and none folded shut.
      expect(most(knees), id).toBeLessThan(170);
      expect(least(knees), id).toBeGreaterThan(40);
      // The ankles over the deck from one frame to the next, and the wrists' speed against the board: as before.
      expect(most(held.map((frame) => frame.footSlide)), id).toBeLessThan(most(before.map((frame) => frame.footSlide)) + 0.002);
      expect(most(held.flatMap((frame) => [frame.frontHandSpeed, frame.backHandSpeed])), id).toBeLessThan(most(before.flatMap((frame) => [frame.frontHandSpeed, frame.backHandSpeed])) + 1);
      // The mass over the feet: the hips between them along the board, as before, and across it within 0.12 m of before
      // (the cutback's Snap: 0.07 m off the board's middle, 0.15 m before; the lean no longer folds them out).
      expect(least(held.map((frame) => frame.hipsOver)), id).toBeGreaterThan(least(before.map((frame) => frame.hipsOver)) - 0.06);
      expect(most(held.map((frame) => frame.hipsOver)), id).toBeLessThan(most(before.map((frame) => frame.hipsOver)) + 0.06);
      held.forEach((frame, i) => expect(Math.abs(frame.hipsAcross - before[i].hipsAcross), `${id} ${frame.t}`).toBeLessThan(0.12));
    }
  });

  it.each(STANCES)('%s: in the backside cutback no hand goes under the water while Snap is held', (stance) => {
    for (const every of RATES) {
      const snap = between(film('turn-cutback-backside', stance, 'all', every), 1.3, 2.5);
      // Measured: the lowest hand 0.13 m over the water (the trunk leaning with the body: `turnTrunk`); before, folded
      // toward the water, the front hand 0.05–0.13 m under it.
      expect(least(snap.flatMap((frame) => [frame.frontHand, frame.backHand])), `${every}`).toBeGreaterThan(0.08);
    }
    expect(least(between(film('turn-cutback-backside', stance, 'off'), 1.3, 2.5).map((frame) => frame.frontHand))).toBeLessThan(0);
  });

  it('a 30 Hz page draws the same turn: the trunk\'s line within 3° of the 60 Hz page\'s at the same moments', () => {
    for (const id of ['turn-toe', 'turn-heel', 'turn-cutback']) {
      const full = film(id, 'regular', 'all');
      const half = film(id, 'regular', 'all', 2);
      for (const frame of between(half, STICK_AT, id.includes('cutback') ? 2.5 : 1.8)) {
        const same = full.find((other) => Math.abs(other.t - frame.t) < 1e-6)!;
        expect(Math.abs(same.drawnLine - frame.drawnLine), `${id} ${frame.t}`).toBeLessThan(3);
      }
    }
  });
});
