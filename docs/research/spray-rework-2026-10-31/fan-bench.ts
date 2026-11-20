/**
 * The fan's page cost (spray-rework, 2026-10-31): `BoardFanMesh.update` each frame at 60 Hz for a board throwing a hard
 * carve's sheet (80 kg/s off its high rail, turning), at each Particles setting: the drops thrown (`throwFan`), the carve
 * line's points and its ribbon laid on the water. The GPU flies the drops, so nothing here walks the live ones.
 *   npx rolldown docs/research/spray-rework-2026-10-31/fan-bench.ts -o dist/scripts/fan-bench.mjs --format esm --platform node
 *   node dist/scripts/fan-bench.mjs
 */
import { createBoardSpraySheet, packBoardSheets, placeTear } from '../../../src/physics/boardSpray';
import { BoardFanMesh } from '../../../src/scene/BoardFanMesh';
import type { ParticleLevel } from '../../../src/wave/particleBudget';

const step = 1 / 60;
const frames = 6000;
const sheet = {
  ...createBoardSpraySheet(), x: 0, y: 0.05, z: 0, alongX: 0, alongZ: 1, length: 0.6, vx: 4, vy: 5, vz: 3, flux: 80, spread: 0.6,
  boardX: 0, boardY: 0, boardZ: 8, onset: 0.03, breakup: 0.04, aftVX: 5, aftVY: 7, aftVZ: 3, foreVX: 3, foreVY: 4, foreVZ: 3, fluxMean: 0.4,
};
const surface = (x: number, z: number) => 0.05 * Math.sin(0.3 * x + 0.2 * z);
for (const level of ['high', 'medium', 'low'] as ParticleLevel[]) {
  const fan = new BoardFanMesh();
  fan.setLevel(level);
  const packed = new Float32Array(packBoardSheets([sheet]).length);
  const run = (from: number, count: number) => {
    for (let n = from; n < from + count; n += 1) {
      const t = n * step;
      const turn = 2 * t;
      sheet.x = 8 * Math.sin(turn) / 2; sheet.z = 8 * (1 - Math.cos(turn)) / 2;
      sheet.alongX = Math.cos(turn); sheet.alongZ = Math.sin(turn);
      sheet.boardX = 8 * Math.cos(turn); sheet.boardZ = 8 * Math.sin(turn);
      placeTear(sheet, sheet.x, sheet.y, sheet.z, sheet.alongX, sheet.alongZ, sheet.length, 3, 5, -4, sheet.vx, sheet.vy, sheet.vz, sheet.breakup);
      packBoardSheets([sheet], packed);
      fan.update(t, packed, 1, undefined, surface, 0);
    }
  };
  run(0, 600);
  const start = performance.now();
  run(600, frames);
  const perFrame = ((performance.now() - start) / frames) * 1000;
  const live = fan.live();
  console.log(`${level}: ${perFrame.toFixed(1)} µs a frame, ${live.streaks} streaks and ${live.mist} puffs live, ${(fan.thrown / (frames + 600) * 60).toFixed(0)} thrown a second`);
}
