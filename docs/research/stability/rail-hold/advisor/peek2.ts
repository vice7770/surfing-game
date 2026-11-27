import { DEG, Flat, Lab, STEP, euler } from '/Users/vicentealmeida/Documents/Codex/surfing-game/.claude/worktrees/rail-hold/docs/research/new-rider/roll-plant/plant';
const water = new Flat();
const v = Number(process.env.V ?? 6); const rail = Number(process.env.RAIL ?? 40); const RAMP = Number(process.env.RAMP ?? 80);
const lab = new Lab(water, 'point');
lab.place(v);
lab.hold = { speed: v, roll: 0, yawRate: 0, slip: 0 };
for (let i = 0; i < 150; i += 1) lab.frame();
let t = 0; let bad = false;
for (let i = 0; i < 480 && !bad; i += 1) {
  t = (i + 1) * STEP;
  lab.hold = { speed: v, roll: Math.min(rail, RAMP * t) / DEG, ...(process.env.HP ? { pitch: Number(process.env.HP) / DEG } : {}) };
  lab.frame();
  const rd = lab.read();
  const d = euler(lab.board.orientation).heading - Math.atan2(lab.board.velocity.x, lab.board.velocity.z);
  const s = (d - 2 * Math.PI * Math.round(d / (2 * Math.PI))) * DEG;
  if (!Number.isFinite(rd.yawRate)) { console.log(t.toFixed(3), 'NaN'); bad = true; break; }
  if (i % Number(process.env.EVERY ?? 6) === 5 || i > 470) console.log(t.toFixed(2), 'roll', rd.roll.toFixed(1), 'yaw', rd.yawRate.toFixed(3), 'slip', s.toFixed(2), 'pitch', rd.pitch.toFixed(2), 'draft', rd.draft.toFixed(3), 'vy', lab.board.velocity.y.toFixed(3), 'wet', ((lab.board as any).wettedArea).toFixed(3));
}
