// snap-upturn probe (not part of the suite). OPTS='{...}', MOVE=snap|steer|compress, START (face fraction ahead of crest × front), OUT=<file.json>.
import { writeFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { it } from 'vitest';
import { AttachedRider } from './AttachedRider';
import type { BoardBody } from './BoardBody';
import { PlaneWater } from './PlaneWater';
import type { SurfWater } from './SurfWater';
import { FaceWater } from './testing/FaceWater';
import { DEG, STEP, diff, frameOf, onWater, r, type Rig } from './zz-r2Lab';

const OUT = process.env.OUT ?? '/dev/null';
const OPTS = JSON.parse(process.env.OPTS ?? '{}');
const MOVE = process.env.MOVE ?? 'snap';
const START = Number(process.env.START ?? 0.85);
const HOLD = Number(process.env.HOLD ?? 0.8);
const TRACE = process.env.TRACE ?? '';
const FALL = new Vector3(0, 0, 1);
type Water = SurfWater & { advance?: (dt: number) => void; faceFraction?: (z: number) => number };
const P = (x: unknown) => x as Record<string, number & boolean & Vector3>;

function rigOn(water: SurfWater, x: number, z: number, heading: number, speed: number, stance: 'regular' | 'goofy'): Rig {
  const base = onWater(water, x, z, heading, speed, stance);
  const board = base.board as BoardBody;
  board.attach(new AttachedRider(board.shape, { phase: 'standing', stance, ...OPTS }));
  return { board, get rider() { return board.rider as AttachedRider; }, get heading() { const f = new Vector3(0, 0, 1).applyQuaternion(board.orientation); return Math.atan2(f.x, f.z) * DEG; } } as Rig;
}

it('probe', () => {
  const out: unknown[] = [];
  const traces: string[] = [];
  for (const kind of ['face', 'plane']) for (const speed of [7, 8, 9]) for (const dir of [-1, 1]) for (const stance of ['regular', 'goofy'] as const) {
    // dir −1: heading −x (board's left downhill); the steer toward the wave is −1. Regular faces its right: −x frontside.
    const water: Water = kind === 'face' ? (new FaceWater({ depth: 2, height: 1.2, slope: 20 }) as unknown as Water) : (new PlaneWater({ slopeZ: -Math.tan(15 / DEG) }) as unknown as Water);
    const z = kind === 'face' ? (water as unknown as FaceWater).crestZ() + START * (water as unknown as FaceWater).front : 0;
    const back = (dir === -1) === (stance === 'goofy');
    const rig = rigOn(water, 0, z, dir * Number(process.env.HD ?? 70), speed, stance);
    const up = dir; // steer toward the wave
    let fell = Number.NaN; let cause = ''; let turned = 0; let last = rig.heading;
    let twistWrong = 0; let twistRight = 0; let twistMin = 0; let twistMax = 0; let bankAt = 0; let stampAt = Number.NaN; let minSpeed = Infinity; let fromFallEnd = 0; let maxFromFall = 0;
    const tag = `${kind} ${speed} ${dir < 0 ? '-x' : '+x'} ${stance} ${back ? 'BS' : 'FS'}`;
    for (let n = 0; n < Math.round(Number(process.env.T ?? 2.0) / STEP); n += 1) {
      const t = n * STEP;
      const on = t >= 0.2 && t < 0.2 + HOLD;
      const rider = rig.board.rider as AttachedRider;
      rider.steer = on && MOVE !== "idle" ? up * Number(process.env.AMT ?? 1) : 0; rider.trim = 0; rider.crouch = MOVE === 'compress' && on ? 0.6 : 0; rider.compress = MOVE === 'compress' && on ? 1 : 0; rider.snap = MOVE === 'snap' && on ? 1 : 0;
      water.advance?.(STEP);
      rig.board.step(STEP, water);
      if (!rider.attached) { fell = t + STEP; cause = String(rider.separation); break; }
      const f = frameOf(rig, water, t + STEP, on ? 'on' : 'off', FALL, last);
      const d = diff(rig.heading, last); last = rig.heading;
      if (on) {
        turned += d;
        // the turn's way: up = dir means heading goes away from +z toward -z; positive twist turns from +z toward +x
        // turning up, the heading moves the steer's way (dir); a twist the same sign winds toward the turn
        if (Math.abs(f.twist) > 3) { if (Math.sign(f.twist) === dir) twistRight += STEP; else twistWrong += STEP; }
        twistMin = Math.min(twistMin, f.twist); twistMax = Math.max(twistMax, f.twist);
        if (Number.isNaN(stampAt) && P(rider).stampTime >= 0) stampAt = t + STEP - 0.2;
        bankAt = f.bank; minSpeed = Math.min(minSpeed, f.speed); fromFallEnd = f.fromFall; maxFromFall = Math.max(maxFromFall, f.fromFall);
      }
      if (TRACE && tag.includes(TRACE) && n % 3 === 0) traces.push(`${tag} t ${r(t + STEP, 2)} hd ${r(f.heading)} ff ${r(f.fromFall)} tw ${r(f.twist)} sw ${r(f.swing)} bk ${r(f.bank)} br ${r(f.bankRef)} roll ${r(f.roll)} v ${r(f.speed, 1)} fin ${r(f.fin)} ld ${r(f.load)} fr ${r(f.front, 2)} side ${P(rider).snapSide} tgt ${r(P(rider).snapTarget.x, 2)},${r(P(rider).snapTarget.z, 2)} st ${r(P(rider).stampTime, 2)}`);
    }
    out.push({ case: tag, turned: r(turned), fell: r(fell - 0.2, 2), cause, twist: [r(twistMin), r(twistMax)], twistRight: r(twistRight, 2), twistWrong: r(twistWrong, 2), stampAt: r(stampAt, 2), bank: r(bankAt), minV: r(minSpeed, 1), fromFall: r(fromFallEnd), maxFF: r(maxFromFall) });
  }
  writeFileSync(OUT, JSON.stringify(out, null, 1));
  if (TRACE) writeFileSync(`${OUT}.trace`, traces.join('\n'));
});
