import { Color } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SkinnedSurfer } from './SkinnedSurfer';
import { SurferView } from './SurferView';
import { fakeGltfScene } from './testSurferScene';

describe('SurferView', () => {
  afterEach(() => vi.restoreAllMocks());

  it('ends on the latest body when an earlier choice finishes loading last', async () => {
    const pending = new Map<string, (surfer: SkinnedSurfer) => void>();
    vi.spyOn(SkinnedSurfer, 'load').mockImplementation((url) => new Promise((resolve) => pending.set(url, resolve)));
    const view = new SurferView();
    const first = view.load('surfer1');
    const second = view.load('surfer3');
    pending.get('assets/surfers/surfer3.glb')!(SkinnedSurfer.fromScene(fakeGltfScene()));
    await second;
    const chosen = view.skinned!;
    pending.get('assets/surfers/surfer1.glb')!(SkinnedSurfer.fromScene(fakeGltfScene()));
    await first;
    expect(view.skinned).toBe(chosen);
    expect(view.group.children.filter((child) => child !== chosen.group && child.visible && child.type === 'Group').length).toBeLessThanOrEqual(1);
    expect(view.group.children).toContain(chosen.group);
  });

  it("loads at the preset's texture size, reloads when it changes, and hands on the detail distance", async () => {
    const load = vi.spyOn(SkinnedSurfer, 'load').mockImplementation(async () => SkinnedSurfer.fromScene(fakeGltfScene()));
    const view = new SurferView();
    view.setDetail(8, 1024);
    await view.load('surfer4');
    expect(load).toHaveBeenLastCalledWith('assets/surfers/surfer4.glb', 1024);
    view.setDetail(20, 1024);
    expect(view.skinned!.lodDistance).toBe(20);
    expect(load).toHaveBeenCalledTimes(1);
    view.setDetail(20, 512);
    await vi.waitFor(() => expect(load).toHaveBeenLastCalledWith('assets/surfers/surfer4.glb', 512));
    await vi.waitFor(() => expect(view.skinned!.lodDistance).toBe(20));
  });

  it('dresses the surfer it loads, and the one it has, in the chosen outfit and colour', async () => {
    const surfer = SkinnedSurfer.fromScene(fakeGltfScene());
    const setOutfit = vi.spyOn(surfer, 'setOutfit');
    vi.spyOn(SkinnedSurfer, 'load').mockResolvedValue(surfer);
    const view = new SurferView();
    const coral = new Color('#de7860');
    view.dress('springsuit', { accent: coral });
    await view.load('surfer2');
    expect(setOutfit).toHaveBeenLastCalledWith('springsuit', { accent: coral });
    view.dress('vestBikini', { accent: coral });
    expect(setOutfit).toHaveBeenLastCalledWith('vestBikini', { accent: coral });
  });
});
