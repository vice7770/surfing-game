/**
 * The curtains' page cost (spray-sheet, 2026-10-30): `SpraySheetMesh.update` for the board's two sides each frame, and the
 * curtain's points alone.
 *   npx rolldown docs/research/spray-sheet-2026-10-30/curtain-bench.ts -o dist/scripts/curtain-bench.mjs --format esm --platform node
 *   node dist/scripts/curtain-bench.mjs
 */
import { Vector3 } from 'three';
import { BOARD_SHEET_STRIDE, createBoardSpraySheet, packBoardSheets } from '../../../src/physics/boardSpray';
import { SpraySheetMesh } from '../../../src/scene/SpraySheetMesh';

const sheet = { ...createBoardSpraySheet(), x: 1, y: 0.1, z: 2, alongX: 0, alongZ: 1, length: 0.6, vx: 2, vy: 3, vz: 4, flux: 90, spread: 1,
  boardX: 0, boardY: 0, boardZ: 9, thickness: 0.02, fan: 0.3, breakup: 0.12 };
const packed = packBoardSheets([sheet, { ...sheet, x: -1, vx: -2 }]);
const mesh = new SpraySheetMesh();
const offset = new Vector3(0.05, 0, 0.1);
const frames = 20_000;
for (let n = 0; n < 500; n += 1) mesh.update(packed, 2, offset);
const start = performance.now();
for (let n = 0; n < frames; n += 1) mesh.update(packed, 2, offset);
console.log(`SpraySheetMesh.update, two curtains: ${(((performance.now() - start) / frames) * 1000).toFixed(1)} µs a frame (${packed.length / BOARD_SHEET_STRIDE} sheets)`);
