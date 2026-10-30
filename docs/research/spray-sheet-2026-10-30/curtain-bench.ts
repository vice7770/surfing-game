/**
 * The curtains' cost (spray-sheet, 2026-10-30): the worker's side (the two sheets' clock and tear, `hullSpraySheets`'
 * new part: the history ring's push and `tearOf`) and the page's (`SpraySheetMesh.update`: the history fed each frame and
 * the two curtains built from its rows), each a frame at 60 Hz with a sheet a side that moves and turns.
 *   npx rolldown docs/research/spray-sheet-2026-10-30/curtain-bench.ts -o dist/scripts/curtain-bench.mjs --format esm --platform node
 *   node dist/scripts/curtain-bench.mjs
 */
import { Vector3 } from 'three';
import {
  BOARD_SHEET_STRIDE, SheetHistory, createBoardSpraySheet, packBoardSheets, placeTear, sprayCurtain,
} from '../../../src/physics/boardSpray';
import { SpraySheetMesh } from '../../../src/scene/SpraySheetMesh';
import { BOARD_SPRAY_CAPACITY, SPRAY_CAPACITY, SprayCloud, WHITEWATER_CAPACITY } from '../../../src/wave/SprayCloud';
import { busyWhitewater } from '../../../src/wave/particleTestSupport';

const step = 1 / 60;
const sheets = [-1, 1].map((side) => ({
  ...createBoardSpraySheet(), side, x: side * 0.25, y: 0.1, z: 2, alongX: 0, alongZ: 1, length: 0.6, vx: side * 3, vy: 3, vz: 4,
  flux: 90, spread: 1, boardX: 0, boardY: 0, boardZ: 7, thickness: 0.02, onset: 0.03, breakup: 0.12,
}));
function move(n: number): void {
  const t = n * step;
  const turn = 0.2 * Math.sin(t * 2);
  for (const sheet of sheets) {
    sheet.x = sheet.side * 0.25 + 7 * Math.sin(turn) * t;
    sheet.z = 2 + 7 * Math.cos(turn) * t;
    sheet.alongX = Math.sin(turn);
    sheet.alongZ = Math.cos(turn);
  }
}

// The worker: the clock, the rigid tear, the history's push, the tear from where the water went.
const history = new SheetHistory();
const frames = 20_000;
function workerFrame(n: number): void {
  move(n);
  const now = n * step;
  for (const sheet of sheets) {
    const curtain = sprayCurtain(sheet.flux, sheet.length, 3.4, 4, 7, 0.2, 1);
    sheet.thickness = curtain.thickness; sheet.onset = curtain.onset; sheet.breakup = curtain.breakup;
    placeTear(sheet, sheet.x, sheet.y, sheet.z, sheet.alongX, sheet.alongZ, sheet.length, 3, 3, -3, sheet.vx, sheet.vy, sheet.vz, sheet.breakup);
    const key = `0:${sheet.side}`;
    history.push(key, now, sheet);
    history.tearOf(key, now, sheet);
  }
  history.prune(now, 0.1);
}
for (let n = 0; n < 500; n += 1) workerFrame(n);
let start = performance.now();
for (let n = 500; n < 500 + frames; n += 1) workerFrame(n);
console.log(`worker, two sheets' clock, history and tear: ${(((performance.now() - start) / frames) * 1000).toFixed(2)} µs a step`);

// The page: the snapshot's packed sheets into the curtains.
const mesh = new SpraySheetMesh();
const offset = new Vector3(0.05, 0, 0.1);
const packed = new Float32Array(sheets.length * BOARD_SHEET_STRIDE);
function pageFrame(n: number): void {
  workerFrame(n);
  packBoardSheets(sheets, packed);
  mesh.update(n * step, packed, sheets.length, offset);
}
for (let n = 0; n < 500; n += 1) pageFrame(n);
start = performance.now();
for (let n = 500; n < 500 + frames; n += 1) pageFrame(n);
const both = ((performance.now() - start) / frames) * 1000;
console.log(`page, SpraySheetMesh.update with two curtains (worker's share included): ${both.toFixed(1)} µs a frame`);

// The spray's step with a compressed turn's sheet thrown at once (no curtain: #170) against torn from its curtain (its
// drops shed on the way and thrown from the tear), on the same busy sea.
{
  const at = { ...createBoardSpraySheet(), x: 12, y: 0.1, z: 12, alongX: 0, alongZ: 1, length: 0.6, vx: 6, vy: 5, vz: 6, flux: 90, spread: 1.4,
    fall: 7, mist: 0.12, boardX: 0, boardY: 0, boardZ: 9 };
  const torn = { ...at, thickness: 0.04, onset: 0.13, breakup: 0.13 };
  placeTear(torn, torn.x, torn.y, torn.z, torn.alongX, torn.alongZ, torn.length, 6, 5, -3, 6, 5, 6, torn.breakup);
  const run = (sheet: typeof at, frames = 1200) => {
    const spray = new SprayCloud(3, SPRAY_CAPACITY, WHITEWATER_CAPACITY, BOARD_SPRAY_CAPACITY);
    spray.setLevel('high');
    let total = 0;
    for (let frame = 0; frame < frames; frame += 1) {
      const scene = busyWhitewater(frame);
      const t = performance.now();
      spray.update({ ...scene, boardSheets: [sheet] }, 1 / 60);
      total += performance.now() - t;
    }
    return total / frames;
  };
  run(at); run(torn);
  const plain = run(at);
  const curtain = run(torn);
  console.log(`spray step (high): ${plain.toFixed(4)} ms the sheet thrown at once, ${curtain.toFixed(4)} ms torn from its curtain (${(curtain - plain >= 0 ? '+' : '') + (curtain - plain).toFixed(4)} ms)`);
}
