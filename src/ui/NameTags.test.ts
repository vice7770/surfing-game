import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { TAG_DISTANCE, tagLayout } from './NameTags';

function camera() {
  const view = new PerspectiveCamera(60, 2, 0.1, 1000);
  view.position.set(0, 2, 0);
  view.lookAt(0, 2, -10);
  view.updateMatrixWorld();
  return view;
}

describe('tagLayout', () => {
  it('puts a tag over a surfer in view, where it projects on screen', () => {
    const [tag] = tagLayout([{ id: 1, name: 'Ana', world: new Vector3(0, 2, -10) }], camera(), 800, 400, true);
    expect(tag.visible).toBe(true);
    expect(tag.x).toBeCloseTo(400, 3);
    expect(tag.y).toBeCloseTo(200, 3);
    expect(tag.name).toBe('Ana');
  });

  it('hides tags behind the camera, too far away, or switched off', () => {
    const view = camera();
    const tags = tagLayout([
      { id: 1, name: 'Behind', world: new Vector3(0, 2, 10) },
      { id: 2, name: 'Far', world: new Vector3(0, 2, -(TAG_DISTANCE + 5)) },
    ], view, 800, 400, true);
    expect(tags.map((tag) => tag.visible)).toEqual([false, false]);
    expect(tagLayout([{ id: 3, name: 'Near', world: new Vector3(0, 2, -10) }], view, 800, 400, false)[0].visible).toBe(false);
  });

  it('shows only the call for an unnamed entry (the player\'s own)', () => {
    const [own, silent] = tagLayout([
      { id: 1, name: '', world: new Vector3(0, 2, -10), call: 'Left!' },
      { id: 2, name: '', world: new Vector3(0, 2, -10) },
    ], camera(), 800, 400, true);
    expect(own).toMatchObject({ visible: true, showName: false, call: 'Left!' });
    expect(silent.visible).toBe(false);
  });

  it('shows a call even with name tags off', () => {
    const [tag] = tagLayout([{ id: 1, name: 'Ana', world: new Vector3(0, 2, -10), call: 'Party wave!' }], camera(), 800, 400, false);
    expect(tag.visible).toBe(true);
    expect(tag.showName).toBe(false);
    expect(tag.call).toBe('Party wave!');
  });
});
