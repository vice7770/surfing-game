import { DEG, Flat, Lab, STEP, euler } from '/Users/vicentealmeida/Documents/Codex/surfing-game/.claude/worktrees/rail-hold/docs/research/new-rider/roll-plant/plant';
const water = new Flat();
const v = Number(process.env.V ?? 7); const rail = Number(process.env.RAIL ?? 45);
const lab = new Lab(water, 'point');
lab.place(v);
lab.hold = { speed: v, roll: 0, yawRate: 0, slip: 0 };
for (let i = 0; i < 150; i += 1) lab.frame();
lab.hold = { speed: v, roll: rail / DEG };
for (let i = 0; i < 480; i += 1) {
  lab.frame();
  if (i % 30 === 29) {
    const rd = lab.read();
    const d = euler(lab.board.orientation).heading - Math.atan2(lab.board.velocity.x, lab.board.velocity.z);
    const s = (d - 2 * Math.PI * Math.round(d / (2 * Math.PI))) * DEG;
    console.log(((i + 1) / 60).toFixed(1), 'yaw', rd.yawRate.toFixed(3), 'slip', s.toFixed(2), 'pitch', rd.pitch.toFixed(2), 'draft', rd.draft.toFixed(3), 'vy', lab.board.velocity.y.toFixed(3));
  }
}
