// Step 3.2L (rulings 29p and 29q): the turn, measured as the owner judges it. The held-carve bar is demoted to a
// report because it rewards leaning slowly (29p); these are the bars, and they are read off the OLD rider first:
//   - the board's peak turn rate, standing and in Compress (what "turns sharply" is);
//   - the time from full stick to a 30° rail (what "too stiff" is);
//   - the turn's radius at riding speed (how tight a line the wave allows);
//   - the speed kept through a 90° direction change (whether a turn costs the ride);
//   - the travel speed on a face, km/h (29q's 27-42 band, the owner's own filmed clip).
// What the owner would feel if each improved: a board that comes round sooner; a stick that bites at once; a tighter
// line off the bottom; still having speed at the top of the turn; and a ride that is neither sluggish nor a rocket.
//
//   OUT=/tmp/t.jsonl RIDER=new PART=turn npx vitest run --config docs/research/new-rider/3.2/vitest.probe.config.ts turn
// PART=turn,travel. BALANCE='{"leanRate":2,"railCap":20}' sweeps the new surfer's lean-in rate and rail cap together,
// which 29p found had never been swept as a grid. SPEEDS, STANCES, SLOPES as below.
import { it } from 'vitest';
import { Vector3 } from 'three';
import type { SurfWater } from '../../../../src/physics/SurfWater';
import { STEP, Slope, emit, place, r, state, type Rig } from '../../board-in-water/lab';

const RIDER = process.env.RIDER === 'new' ? 'new' : 'old';
const PARTS = (process.env.PART ?? 'turn,travel').split(',');
const SETTLE = Number(process.env.SETTLE ?? 2.5);
const DEG = 180 / Math.PI;
type Stance = 'tall' | 'crouch' | 'compress';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const inner = (rig: Rig) => rig.rider as unknown as any;

/** The bars' terminal planes (`bars.probe.ts`). */
const TERMINAL: [number, number][] = [[5, 13.37], [7, 11.01], [9, 10.37], [12, 11.07]];
function terminalAngle(v: number): number {
  if (v <= TERMINAL[0][0]) return TERMINAL[0][1];
  for (let i = 1; i < TERMINAL.length; i += 1) {
    const [v1, a1] = TERMINAL[i];
    const [v0, a0] = TERMINAL[i - 1];
    if (v <= v1) return a0 + ((a1 - a0) * (v - v0)) / (v1 - v0);
  }
  return TERMINAL[TERMINAL.length - 1][1];
}
function hold(rig: Rig, stance: Stance): void {
  rig.rider!.crouch = stance === 'crouch' ? 1 : stance === 'compress' ? 0.6 : 0;
  rig.rider!.compress = stance === 'compress' ? 1 : 0;
}
/** Placed at `speed` down the plane that balances its drag, left SETTLE s: the steady start the other bars use. */
function steady(water: SurfWater, speed: number, stance: Stance) {
  const rig = place(water, 0, 0, speed, 'standing');
  hold(rig, stance);
  let t = 0;
  for (let i = 0; i < Math.round(SETTLE / STEP); i += 1) {
    t = (i + 1) * STEP;
    (water as { advance?: (dt: number) => void }).advance?.(STEP);
    rig.board.step(STEP, water);
    if (state(rig, water, t).fell) return { rig, t, fell: state(rig, water, t).fell };
  }
  return { rig, t, fell: '' };
}
const headingOf = (rig: Rig) => { const f = new Vector3(0, 0, 1).applyQuaternion(rig.board.orientation); return Math.atan2(f.x, f.z); };

it('step 3.2L: the turn', () => {
  if (PARTS.includes('turn')) {
    for (const stance of (process.env.STANCES ?? 'tall,compress').split(',') as Stance[]) {
      for (const v of (process.env.SPEEDS ?? '7.7').split(',').map(Number)) {
        const water = new Slope(terminalAngle(v));
        const st = steady(water, v, stance);
        if (st.fell) { emit({ bar: 'turn', rider: RIDER, stance, v, fell: `settling: ${st.fell}` }); continue; }
        const { rig } = st;
        const startSpeed = state(rig, water, st.t).speed;
        const h0 = headingOf(rig);
        // Full stick, held: the owner's "slam the steer".
        rig.rider!.steer = 1;
        let peakYaw = 0; let peakAt = Number.NaN; let yawAtPeak = 0; let speedAtPeak = 0;
        let rail30 = Number.NaN; let peakRail = 0; let turned90 = Number.NaN; let speed90 = Number.NaN;
        let fell = ''; let fellAt = Number.NaN;
        let turn = 0; let last = h0;
        for (let i = 0; i < Math.round(4 / STEP); i += 1) {
          const t = st.t + (i + 1) * STEP;
          (water as { advance?: (dt: number) => void }).advance?.(STEP);
          rig.board.step(STEP, water);
          const s = state(rig, water, t);
          const q = inner(rig);
          // The board's own turn rate about its normal, rad/s.
          const yaw = Math.abs(rig.board.angularVelocity.dot(q.up));
          const hNow = headingOf(rig);
          let d = hNow - last; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
          turn += Math.abs(d); last = hNow;
          const rail = Math.abs(s.roll);
          peakRail = Math.max(peakRail, rail);
          if (Number.isNaN(rail30) && rail >= 30) rail30 = t - st.t;
          if (yaw > peakYaw) { peakYaw = yaw; peakAt = t - st.t; yawAtPeak = yaw; speedAtPeak = s.speed; }
          if (Number.isNaN(turned90) && turn >= Math.PI / 2) { turned90 = t - st.t; speed90 = s.speed; }
          if (s.fell) { fell = s.fell; fellAt = t - st.t; break; }
        }
        emit({
          bar: 'turn', rider: RIDER, stance, v, startSpeed: r(startSpeed, 2),
          peakYawDegS: r(peakYaw * DEG, 1), peakYawAtS: r(peakAt, 2),
          radiusM: yawAtPeak > 1e-6 ? r(speedAtPeak / yawAtPeak, 1) : null,
          toRail30S: r(rail30, 2), peakRailDeg: r(peakRail, 1),
          turned90S: r(turned90, 2), speedAt90: r(speed90, 2), keptAt90: speed90 > 0 ? r(speed90 / startSpeed, 3) : null,
          fell, fellAtS: r(fellAt, 2),
          lean: r(inner(rig).leanPace ?? 0, 2), railCapDeg: r(((inner(rig).railCap ?? 0) * DEG), 1),
        });
      }
    }
  }
  if (PARTS.includes('travel')) {
    // The travel speed a rider settles at on a face, with no pumping: placed slow and let run. 29q's band is the
    // owner's own clip, 27-42 km/h (7.5-11.7 m/s). What they would feel: a ride that is neither sluggish nor a rocket.
    for (const stance of (process.env.STANCES ?? 'tall,compress').split(',') as Stance[]) {
      for (const slope of (process.env.SLOPES ?? '8,10,12,14').split(',').map(Number)) {
        // From a PLANING start, as every other bar does: placed at the start speed on this slope and settled, then let
        // run. A board placed slow on a face does not plane and the rider falls before it can accelerate (measured).
        const water = new Slope(slope);
        const st = steady(water, Number(process.env.TRAVEL_FROM ?? 7), stance);
        if (st.fell) { emit({ bar: 'travel', rider: RIDER, stance, slopeDeg: slope, fell: `settling: ${st.fell}` }); continue; }
        const { rig } = st;
        let fell = ''; let t = 0; let speed = 0; let peak = 0;
        for (let i = 0; i < Math.round(8 / STEP); i += 1) {
          t = (i + 1) * STEP;
          rig.board.step(STEP, water);
          const s = state(rig, water, t);
          speed = s.speed; peak = Math.max(peak, speed);
          if (s.fell) { fell = s.fell; break; }
        }
        emit({ bar: 'travel', rider: RIDER, stance, slopeDeg: slope, heldS: r(t, 2), endMs: r(speed, 2), endKmh: r(speed * 3.6, 1), peakKmh: r(peak * 3.6, 1), inBand: speed * 3.6 >= 27 && speed * 3.6 <= 42, fell });
      }
    }
  }
});
