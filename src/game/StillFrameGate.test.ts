import { PerspectiveCamera } from 'three';
import { describe, expect, it } from 'vitest';
import { STILL_REFRESH_MS, StillFrameGate } from './StillFrameGate';

describe('StillFrameGate', () => {
  const view = () => {
    const camera = new PerspectiveCamera();
    camera.position.set(2, 3, 9);
    camera.lookAt(0, 0, 0);
    return camera;
  };

  it('draws the first frame, then holds while nothing changes', () => {
    const gate = new StillFrameGate();
    const camera = view();
    expect(gate.needsDraw(camera, 0, false)).toBe(true);
    gate.drawn(camera, 0);
    expect(gate.needsDraw(camera, 16, false)).toBe(false);
    expect(gate.needsDraw(camera, 400, false)).toBe(false);
  });

  it('draws again when the view moves or turns by more than a sliver of a pixel', () => {
    const gate = new StillFrameGate();
    const camera = view();
    gate.drawn(camera, 0);
    camera.position.x += 1e-5;
    expect(gate.needsDraw(camera, 16, false)).toBe(false);
    camera.position.x += 1e-3;
    expect(gate.needsDraw(camera, 16, false)).toBe(true);
    gate.drawn(camera, 16);
    camera.rotateY(1e-3);
    expect(gate.needsDraw(camera, 32, false)).toBe(true);
  });

  it('draws when asked, and at the refresh to catch what loads meanwhile', () => {
    const gate = new StillFrameGate();
    const camera = view();
    gate.drawn(camera, 0);
    expect(gate.needsDraw(camera, 16, true)).toBe(true);
    expect(gate.needsDraw(camera, STILL_REFRESH_MS, false)).toBe(true);
  });

  it('draws the next frame after a reset', () => {
    const gate = new StillFrameGate();
    const camera = view();
    gate.drawn(camera, 0);
    gate.reset();
    expect(gate.needsDraw(camera, 16, false)).toBe(true);
  });
});
