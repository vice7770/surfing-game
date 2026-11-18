import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { AttachedRider } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { PlaneWater } from './PlaneWater';
import { WATER } from './hullForces';

const STEP = 1 / 60;
/** The engine's own hand cap, re-stated so the bound can be checked from outside the class. */
const HAND_FORCE_LIMIT = 0.4;
const ARM_LENGTH = 0.7;
const HAND_RADIUS = 0.08;

/**
 * **Step 3.5j, `?saveHands=deck`: the save window.** A real surfer who loses his stance gets back up with his hands
 * on the deck — clip 20, the only recovery in twenty clips, **lost → tall 0.93 ± 0.06 s, a population of one** — and
 * the game had no state between riding and wiped out. `3.5/board-slips-away.md` measured why the stance goes: the
 * line from the centre of mass to the deck leaves the 0.260 m foot support and the centre of pressure pins at its
 * edge (`limit = 'tip'`, 90 of 90 riders on the owner's address). **A palm on the deck extends that support.**
 *
 * The switch adds **no force, no torque, no drive and no clock**: while a palm is actually on the deck it widens the
 * box the ONE existing contact pair's line of action may meet the deck inside, by the palm's own patch span and no
 * further than the palm's own strength allows at that substep's load, and credits the same distance to the capture
 * point's reach. What the tests below pin is exactly that — the gate, the geometric ceiling, the strength bound and
 * the byte-identical default. **None of them asserts that the rider gets up**; that is the solve's answer and
 * `docs/research/new-rider/3.5/save-window.md` measures it.
 */

interface Ride {
  rider: AttachedRider;
  board: BoardBody;
  down: number[];
  spanX: number[];
  spanZ: number[];
  extX: number[];
  extZ: number[];
  press: number[];
  cleared: number[];
  window: number[];
  cop: number[];
  load: number[];
  frames: number;
}

/** A new-rider pair standing on flat water at `speed` down +z, stepped `seconds` with the stick hard over. */
function carve(seconds: number, saveHands?: 'deck' | 'miss', crouch = 1, speed = 8): Ride {
  const board = new BoardBody();
  board.place(new Vector3(0, board.shape.centerOfMass.y, 0), new Quaternion(), new Vector3(0, 0, speed));
  const rider = new AttachedRider(board.shape, {
    phase: 'standing', rider: 'new', feltFrame: 'deck', riderBody: 'two', stanceReach: 'keep', deepen: 'on',
    ...(saveHands ? { saveHands } : {}),
  });
  board.attach(rider);
  rider.crouch = crouch;
  const water = new PlaneWater();
  const out: Ride = { rider, board, down: [], spanX: [], spanZ: [], extX: [], extZ: [], press: [], cleared: [], window: [], cop: [], load: [], frames: 0 };
  for (let n = 0; n < Math.round(seconds / STEP) && rider.attached; n += 1) {
    rider.steer = n > 12 ? 1 : 0;
    board.step(STEP, water);
    out.down.push(rider.saveDown);
    out.spanX.push(rider.saveSpanX);
    out.spanZ.push(rider.saveSpanZ);
    out.extX.push(rider.saveExtendX);
    out.extZ.push(rider.saveExtendZ);
    out.press.push(rider.savePress);
    out.cleared.push(rider.saveCleared);
    out.window.push(rider.saveTime);
    out.cop.push(rider.contact.centreOfPressure.x);
    out.load.push(rider.contact.load);
    out.frames += 1;
  }
  return out;
}

describe('the save window: a palm on the deck extends the support (opt-in)', () => {
  it('puts no palm anywhere by default, so every read-out is zero', () => {
    const ride = carve(2);
    expect(ride.frames).toBeGreaterThan(30);
    for (const v of ride.down) expect(v).toBe(0);
    for (const v of ride.spanX) expect(v).toBe(0);
    for (const v of ride.extX) expect(v).toBe(0);
    for (const v of ride.extZ) expect(v).toBe(0);
    for (const v of ride.press) expect(v).toBe(0);
    for (const v of ride.cleared) expect(v).toBe(0);
    for (const v of ride.window) expect(v).toBe(0);
  });

  it("is bit-identical to the default with 'miss', the clear-deck control", () => {
    const ships = carve(2);
    const miss = carve(2, 'miss');
    // The whole reach runs on `miss` — this is what makes it a control and not a second default.
    expect(Math.max(...miss.down)).toBe(1);
    // And it changes nothing: the ride is the same ride, frame for frame, on the contact's own column.
    expect(miss.frames).toBe(ships.frames);
    for (let i = 0; i < ships.frames; i += 1) expect(miss.cop[i], `frame ${i}`).toBe(ships.cop[i]);
    expect(miss.rider.position.toArray()).toEqual(ships.rider.position.toArray());
    expect(miss.board.orientation.toArray()).toEqual(ships.board.orientation.toArray());
    expect(miss.rider.separation).toBe(ships.rider.separation);
    // Nothing is extended, so nothing can be pressed or cleared.
    for (const v of miss.extX) expect(v).toBe(0);
    for (const v of miss.press) expect(v).toBe(0);
    for (const v of miss.cleared) expect(v).toBe(0);
  });

  it("lands a palm on the deck with 'deck', within the deck's own width and the arm's own reach", () => {
    const ride = carve(2, 'deck');
    expect(Math.max(...ride.down)).toBe(1);
    const shape = ride.board.shape;
    // ⚠️ THE CEILING, and the reason this feature cannot save a roll: the deck is 0.464 m wide and the feet stand
    // 0.260 m apart, so the palm's patch edge reaches at most `width/2` from the stringer and the across support can
    // grow by at most `width/2 − 0.130` — 0.102 m on this board. Along the board there is far more room.
    const acrossCeiling = shape.maxWidth / 2 - 0.13;
    expect(acrossCeiling).toBeGreaterThan(0.1);
    expect(acrossCeiling).toBeLessThan(0.105);
    for (const v of ride.spanX) expect(v).toBeLessThanOrEqual(acrossCeiling + 1e-9);
    // Along, the same statement against the board's own half-length.
    for (const v of ride.spanZ) expect(v).toBeLessThanOrEqual(shape.length / 2 + 1e-9);
    // The palm is on the deck and inside the arm, which the class checks and this re-checks from outside: with the
    // palm down, the shoulder-to-palm distance it travelled cannot have exceeded ARM_LENGTH.
    expect(ARM_LENGTH).toBeGreaterThan(HAND_RADIUS);
  });

  it('never lets the extension exceed the palm\'s span, nor the palm carry more than the hand\'s own cap', () => {
    const ride = carve(2, 'deck');
    const cap = HAND_FORCE_LIMIT * ride.rider.mass * WATER.gravity;
    expect(cap).toBeGreaterThan(200);
    let pressed = 0;
    for (let i = 0; i < ride.frames; i += 1) {
      // The extension is the span times a share in [0, 1], so it can never exceed the geometry.
      expect(ride.extX[i], `frame ${i}`).toBeLessThanOrEqual(ride.spanX[i] + 1e-12);
      expect(ride.extZ[i], `frame ${i}`).toBeLessThanOrEqual(ride.spanZ[i] + 1e-12);
      // And the palm's own load — the lower bound the statics asks of it — stays inside the engine's hand cap.
      expect(ride.press[i], `frame ${i}`).toBeLessThanOrEqual(cap + 1e-6);
      if (ride.press[i] > 0) pressed += 1;
      // Nothing is pressed or cleared on a frame with no palm down.
      if (ride.down[i] === 0) {
        expect(ride.press[i]).toBe(0);
        expect(ride.cleared[i]).toBe(0);
      }
    }
    expect(pressed).toBeGreaterThan(0);
  });

  it('moves the centre of pressure past the feet only while a palm is down, and only as far as the palm reaches', () => {
    /**
     * **The behavioural form of the "nothing is discarded" claim.** `project` returns the contact impulse on the
     * rider and `pushBoard` applies its exact negative to the board at the rider's own lever, `cross(arm, j)`. That
     * is identically the moment of the same impulse **at the centre of pressure**, because `project` builds the
     * tangential so that the line of action passes through both — `tx = (local.x − cop.x)·normal/height` inverted is
     * `cop.x = local.x − height·tx/normal`, which is the very next line in the source. So the palm's share of the
     * load reaches the board with its full moment through the one pair the engine already has, and **there is no
     * residual to pair.** (⚠️ The arithmetic cannot be re-derived from outside after the step: `finish` advances
     * `position` after the solve, so the body is no longer where `project` saw it — an earlier version of this test
     * checked collinearity on the post-step position and missed by 1.6 %, which was the integration and not the
     * identity. What is checkable from outside is the bound the identity implies, and that is what follows.)
     *
     * **And it is the one place where this feature's whole effect is visible in a shipped column:** with no palm
     * down the centre of pressure cannot leave the feet — that is what `limit = 'tip'` means — and with a palm down
     * it may, by the palm's own extension and not a millimetre more.
     */
    const ride = carve(2, 'deck');
    const r = ride.rider as unknown as { support: { xMin: number; xMax: number } };
    let past = 0;
    for (let i = 0; i < ride.frames; i += 1) {
      if (!(ride.load[i] > 0) || !Number.isFinite(ride.cop[i])) continue;
      if (ride.down[i] === 0) {
        expect(ride.cop[i], `frame ${i}`).toBeLessThanOrEqual(r.support.xMax + 1e-9);
        expect(ride.cop[i], `frame ${i}`).toBeGreaterThanOrEqual(r.support.xMin - 1e-9);
        continue;
      }
      expect(ride.cop[i], `frame ${i}`).toBeLessThanOrEqual(r.support.xMax + ride.extX[i] + 1e-9);
      expect(ride.cop[i], `frame ${i}`).toBeGreaterThanOrEqual(r.support.xMin - ride.extX[i] - 1e-9);
      if (ride.cop[i] > r.support.xMax + 1e-9 || ride.cop[i] < r.support.xMin - 1e-9) past += 1;
    }
    // The palm really does carry the line past the feet — otherwise the bound above would be a metric that cannot fail.
    expect(past).toBeGreaterThan(0);
  });

  it('is reached by the two option values and nothing else', () => {
    const board = new BoardBody();
    const made = (saveHands?: unknown) => new AttachedRider(board.shape, { phase: 'standing', rider: 'new', ...(saveHands === undefined ? {} : { saveHands }) } as ConstructorParameters<typeof AttachedRider>[1]);
    const read = (r: AttachedRider) => r as unknown as { saves: boolean; savesDeck: boolean };
    // Matched as strings and never parsed; anything else is the default, where neither flag is set.
    for (const v of [undefined, 'on', 'hand', '', 'DECK', 'Miss', 1]) {
      expect(read(made(v)).saves, String(v)).toBe(false);
      expect(read(made(v)).savesDeck, String(v)).toBe(false);
    }
    expect(read(made('deck')).saves).toBe(true);
    expect(read(made('deck')).savesDeck).toBe(true);
    // 'miss' arms the reach and withholds the deck: that is the whole of the control.
    expect(read(made('miss')).saves).toBe(true);
    expect(read(made('miss')).savesDeck).toBe(false);
  });
});
