import { Vector3 } from 'three';
import { buildBoardShape } from '../../physics/boardShape';
import { deckHeight } from '../../physics/riderPosture';

/**
 * The board's deck and rails, as the drawn rider and the stance gauge read
 * them: the game's board shape, in its own frame about its centre of mass (a
 * board pose's position is there): x across, y up, z toward the nose.
 */
const BOARD = buildBoardShape();

/** The board's centre of mass in its own frame. */
export const BOARD_CENTRE = new Vector3(BOARD.centerOfMass.x, BOARD.centerOfMass.y, BOARD.centerOfMass.z);

/** The board's length, m. */
export const BOARD_LENGTH = BOARD.length;

/** Half the board's width `z` m along it from mid-length (the shape's frame). */
export function railHalfWidth(z: number): number {
  return BOARD.curves.width(Math.min(1, Math.max(0, z / BOARD.length + 0.5))) / 2;
}

/** The deck's height `z` m along the board (the shape's frame). */
export function deckAt(z: number): number {
  return deckHeight(BOARD, z);
}
