// The reference board's across-shape and the size of its rail faces (read-only, no simulation).
import { appendFileSync } from 'node:fs';
import { it } from 'vitest';
import { buildBoardShape } from '../../../../src/physics/boardShape';
import { REFERENCE_BOARD } from '../../../../src/physics/boardReference';
import { THRUSTER } from '../../../../src/physics/finForces';

it('the reference board: its bottom normals across, and the rail faces the solver gives it', () => {
  const s = buildBoardShape();
  const stations = [...new Set(s.patches.map((p) => p.position.z))].sort((a, b) => a - b);
  const stationLength = s.length / 12;
  let area = 0;
  const heights: number[] = [];
  for (const z of stations) {
    const u = Math.min(1, Math.max(0, z / s.length + 0.5));
    const h = s.curves.thickness(u) * (1 - s.taper);
    heights.push(+h.toFixed(4));
    area += stationLength * h;
  }
  const line = {
    part: 'shape', ref: REFERENCE_BOARD, taper: +s.taper.toFixed(4), planformArea: +s.planformArea.toFixed(4), volume: +s.volume.toFixed(5),
    stationLength: +stationLength.toFixed(4), railFaceHeights: heights, railFaceAreaPerSide: +area.toFixed(5),
    finAreaTotal: +THRUSTER.reduce((a, f) => a + f.area, 0).toFixed(5), finDepth: THRUSTER[0].depth,
    // Every bottom patch's normal x: the across-slope of the hull (deadrise). All zero means a flat plate across.
    normalXacross: [...new Set(s.patches.map((p) => +p.normal.x.toFixed(6)))],
    halfWidths: stations.map((z) => +(s.curves.width(Math.min(1, Math.max(0, z / s.length + 0.5))) / 2).toFixed(4)),
  };
  const out = process.env.OUT;
  if (out) appendFileSync(out, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line, null, 1)}\n`);
});
