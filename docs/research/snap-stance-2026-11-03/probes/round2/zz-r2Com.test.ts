import { Quaternion, Vector3 } from 'three';
import { it } from 'vitest';
import { AttachedRider } from './AttachedRider';
import { BoardBody } from './BoardBody';
import { PlaneWater } from './PlaneWater';
import { stanceFeet } from './riderPosture';
it('com', () => {
  const board = new BoardBody();
  board.place(new Vector3(0, board.shape.centerOfMass.y, 0), new Quaternion(), new Vector3(0, 0, 7));
  const rider = new AttachedRider(board.shape, { phase: 'standing' });
  board.attach(rider);
  const water = new PlaneWater();
  const rear = stanceFeet(board.shape).rear;
  const out: string[] = [];
  for (let n = 0; n < 60; n += 1) {
    rider.snap = 1; board.step(1 / 60, water);
    const foot = board.toWorld(new Vector3(0, 0, rear), new Vector3());
    const level = new Vector3(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
    const com = rider.position.clone().sub(foot).dot(level);
    const pelvis = rider.renderPoint(0, board, new Vector3()).sub(foot).dot(level);
    if (n % 6 === 5) out.push(`${((n + 1) / 60).toFixed(2)} com-over-rear ${com.toFixed(3)} pelvis-over-rear ${pelvis.toFixed(3)}`);
  }
  require('node:fs').writeFileSync(process.env.OUT ?? '/dev/null', out.join('\n'));
});
