import { describe, expect, it } from 'vitest';
import { RideSession } from '../physics/RideSession';
import { createWaterSample } from '../physics/SurfWater';
import { FaceWater, type FaceOptions } from '../physics/testing/FaceWater';
import { Autopilot, type AutopilotOptions, type AutopilotView } from './Autopilot';

const STEP = 1 / 60;
const DEG = Math.PI / 180;

/**
 * The flow's trim on an endless steady face (`FaceWater`, 0.85 m running at 4.7 m/s unless `face` says otherwise):
 * the autopilot placed standing on the face's steep band, halfway down it, heading 45° from the wave's travel at 6 m/s
 * over the water with the board moving along the surface, and starting in the trim, holding it. The view is the
 * face's own: its travel +z, the open face toward +x, no curl. Returns when it first dropped off the plane (Infinity
 * when it never did), whether it stayed on, its mean speed through the water and the gameplay rules' work.
 */
function trimOnFace(face: Partial<FaceOptions>, options: AutopilotOptions, seconds: number) {
  const water = new FaceWater({ depth: 2, height: 0.85, slope: 14, speed: 4.7, ...face });
  const session = new RideSession();
  session.place({ x: 0, z: water.crestZ() + water.front / 2, heading: 45 * DEG, speed: 6, phase: 'standing', followSurface: true }, water);
  const { rider, board } = session;
  const pilot = new Autopilot({ style: 'flow', flowFrom: 'trim', trimOnly: true, ...options });
  pilot.go();
  const sample = createWaterSample();
  let offAt = Infinity;
  let sum = 0;
  let steps = 0;
  for (let time = 0; time < seconds && rider.attached; time += STEP) {
    water.sampleAt(board.position.x, water.surfaceAt(board.position.x, board.position.z) - 0.05, board.position.z, sample);
    const speed = Math.hypot(board.velocity.x - sample.flowX, board.velocity.z - sample.flowZ);
    const planing = (rider as unknown as { planing: boolean }).planing;
    if (!planing && time > 0.1 && offAt === Infinity) offAt = time;
    sum += speed;
    steps += 1;
    const fraction = water.faceFraction(board.position.z);
    const view: AutopilotView = {
      ride: {
        phase: session.phase, speed: Math.hypot(board.velocity.x, board.velocity.z), boardSpeed: board.velocity.length(), cue: false,
        popUp: { outcome: 'stood', duration: 0, landingPeak: 0, frontShare: 0 }, resets: 0, balance: 1, bank: rider.bank.angle,
        wave: {
          valid: true, directionX: 0, directionZ: 1, aheadOfCrest: board.position.z - water.crestZ(), crestSpeed: water.speed,
          faceHeight: water.options.height, faceFraction: fraction, crestBreaking: 0, curlDistance: Infinity, curlSide: 0,
          speedOverGround: Math.hypot(board.velocity.x, board.velocity.z), speedShoreward: board.velocity.z, speedAlongCrest: board.velocity.x, requiredSpeed: Infinity,
        },
        leash: { snapped: false, tension: 0, distance: 0, reeling: false }, duck: 0, boardInReach: false, knock: 0, breath: 1, rescues: 0,
      },
      peelDirection: 1, board: { x: board.position.x, z: board.position.z, heading: session.heading }, focusZ: 0, crestBehind: 0,
    };
    session.step(STEP, water, pilot.next(view, STEP));
    water.advance(STEP);
  }
  return { offAt, attached: rider.attached, meanSpeed: sum / steps, rules: rider.work.assist + rider.work.carry + rider.work.leanOut, phase: pilot.phase };
}

// On a wave the speed comes from the face: the water rises past a board held on it, and where that lift pays the
// hull's drag the board planes on. The trim holds the face's steep band (`Autopilot`'s BAND_*). On a steady 0.85 m
// face running at 4.7 m/s (the Wave Pool's riders ride 0.6–0.9 m faces, crests at about 4–5 m/s) that keeps a board
// planing at 12–16° for 12 s or more; at 11.5° it drops off the plane at 14.1 s, at 11° at 9.8 s, at 10° at 6.0 s, at
// 9° at 4.5 s. Pumping about the band keeps it planing on the 13–15° faces too, with no gameplay rule acting, and
// drops off sooner on every other face (12°: 8.0 s; 10°: 4.6 s; 16–24°: within 9 s). The Wave Pool's riders, placed
// on its face, planed until the face under them had fallen to 9–12°.
describe('the flow\'s trim on a steady wave face (the movement-flow spec)', () => {
  it('holds a 14° and a 12° face on the plane for 10 s, and drops off a 10° face within 8 s', () => {
    const steep = trimOnFace({ slope: 14 }, {}, 10);
    expect(steep.attached).toBe(true);
    expect(steep.offAt).toBe(Infinity);
    expect(steep.meanSpeed).toBeGreaterThan(6);
    expect(trimOnFace({ slope: 12 }, {}, 10).offAt).toBe(Infinity);
    expect(trimOnFace({ slope: 10 }, {}, 8).offAt).toBeLessThan(8);
    expect(steep.phase).toBe('FLOW · TRIM');
  });

  it('keeps a pumping rider planing on the 14° face for 10 s, from its own legs and the face, no gameplay rule acting', () => {
    const pumping = trimOnFace({ slope: 14 }, { pump: true }, 10);
    expect(pumping.attached).toBe(true);
    expect(pumping.offAt).toBe(Infinity);
    expect(pumping.meanSpeed).toBeGreaterThan(5.5);
    expect(pumping.rules).toBe(0);
    expect(pumping.phase).toMatch(/^FLOW · PUMP/);
  });

  // The Wave Pool's water rises past a board at ∂η/∂t, the surface's rise at a point (`PhysicalSurfWater`); the
  // water's own particles rise at ∂η/∂t + u ∂η/∂z, less on a face whose water runs forward. Rising that way, the 14°
  // face drops the board off the plane at 3.2 s, and the band holds only from about 20°.
  it('drops off the 14° face within 5 s when the water rises at its particles\' speed', () => {
    expect(trimOnFace({ slope: 14, vertical: 'particle' }, {}, 6).offAt).toBeLessThan(5);
  });
});
