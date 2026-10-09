import { sideMargin } from '../physics/riderBounds';
import { OPEN_EDGE_RAMP } from '../wave/ShallowWaterSolver';

/** A spawn keeps at least this far from other surfers when the lineup allows, m (spec N1). */
export const SPAWN_CLEARANCE = 3;
/** Spawns lie this far seaward of the break line, m: from where catches happen out to where a paddler waits for sets. */
const OUT = { near: 6, far: 30 };
/** Along shore, within this of the take-off, m. */
const ALONG = 30;
/**
 * And this far inside the window's open edges, m: inside the rider's bounds (`tankRiderBounds`) at any spot's cells, so a
 * spawn never starts past them (the edge ramp and one 2 m cell, Padang Padang's).
 */
export const EDGE_MARGIN = sideMargin(OPEN_EDGE_RAMP, 2);
/** Spacing of the spots tried, m. */
const GRID = { along: 3, out: 4 };
/** Spawns choose among this many clear spots nearest the take-off. */
const CHOICES = 5;
/** Clearance beyond this counts the same, m. */
const CLEARANCE_CAP = 12;

export interface SpawnArea {
  focusX: number;
  focusZ: number;
  /** The window's along-shore extent, m. */
  xMin: number;
  xMax: number;
}

/**
 * Where a surfer joins or respawns (spec N1): a spot outside the break line and
 * across the take-off, at least SPAWN_CLEARANCE from everyone when one exists,
 * one of the few nearest the take-off; in a packed lineup, the most open one.
 */
export function chooseSpawn(area: SpawnArea, others: readonly { x: number; z: number }[], random: () => number = Math.random): { x: number; z: number } {
  const xs = new Set<number>();
  for (let x = area.focusX - ALONG; x <= area.focusX + ALONG + 1e-9; x += GRID.along) {
    xs.add(Math.max(area.xMin + EDGE_MARGIN, Math.min(area.xMax - EDGE_MARGIN, x)));
  }
  const candidates: { x: number; z: number; clearance: number; distance: number }[] = [];
  for (const x of xs) {
    for (let out = OUT.near; out <= OUT.far + 1e-9; out += GRID.out) {
      const z = area.focusZ - out;
      let clearance = CLEARANCE_CAP;
      for (const other of others) clearance = Math.min(clearance, Math.hypot(x - other.x, z - other.z));
      candidates.push({ x, z, clearance, distance: Math.hypot(x - area.focusX, out - OUT.near) });
    }
  }
  const clear = candidates.filter((candidate) => candidate.clearance >= SPAWN_CLEARANCE).sort((a, b) => a.distance - b.distance);
  if (clear.length) {
    const pick = clear[Math.min(clear.length - 1, Math.floor(random() * Math.min(CHOICES, clear.length)))];
    return { x: pick.x, z: pick.z };
  }
  const open = candidates.reduce((best, candidate) => (candidate.clearance > best.clearance ? candidate : best));
  return { x: open.x, z: open.z };
}
