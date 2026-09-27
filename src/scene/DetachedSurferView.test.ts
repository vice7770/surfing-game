import { Group, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { DetachedSurfer } from '../physics/DetachedSurfer';
import { Surfer } from './Surfer';

describe('detached surfer view adapters', () => {
  it('keeps the physical head in world position while the board has its own pose', () => {
    const body = new DetachedSurfer();
    body.start({
      center: new Vector3(3, 1, -4),
      orientation: new Quaternion(),
      velocity: new Vector3(),
      angularVelocity: new Vector3(),
    });
    const surfer = new Surfer();
    const boardPosition = new Vector3(-2, 0.5, 5);
    const boardOrientation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 0.8);
    surfer.updateDetached(body, boardPosition, boardOrientation);
    surfer.group.updateMatrixWorld(true);

    const riderGroup = surfer.group.children[1] as Group;
    const head = riderGroup.children.find((child): child is Group => child instanceof Group);
    expect(head).toBeDefined();
    expect(head!.getWorldPosition(new Vector3()).distanceTo(
      body.getPartPosition('head', new Vector3()),
    )).toBeLessThan(1e-10);
    expect(surfer.group.position.distanceTo(boardPosition)).toBe(0);
  });
});
