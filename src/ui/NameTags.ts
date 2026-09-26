import { Vector3, type Camera } from 'three';
import { el } from './dom';

/** Name tags further than this from the camera are hidden, m (spec N1). */
export const TAG_DISTANCE = 150;

export interface TagEntry {
  id: number;
  name: string;
  /** Where the tag floats, in the world. */
  world: Vector3;
  /** A surf call being shouted ("Party wave!"), shown as a bubble. */
  call?: string;
}

export interface TagPlacement {
  id: number;
  name: string;
  call?: string;
  /** Screen position, px from the top left. */
  x: number;
  y: number;
  visible: boolean;
  showName: boolean;
}

const projected = new Vector3();
const toCamera = new Vector3();

/**
 * Where each tag goes on screen: hidden behind the camera and beyond
 * TAG_DISTANCE; with name tags off, only a surfer's call still shows.
 */
export function tagLayout(entries: readonly TagEntry[], camera: Camera, width: number, height: number, showNames: boolean): TagPlacement[] {
  const origin = camera.getWorldPosition(toCamera);
  return entries.map((entry) => {
    projected.copy(entry.world).project(camera);
    const inView = projected.z > -1 && projected.z < 1 && Math.abs(projected.x) <= 1.2 && Math.abs(projected.y) <= 1.2;
    const near = entry.world.distanceTo(origin) <= TAG_DISTANCE;
    const showName = showNames;
    return {
      id: entry.id, name: entry.name, call: entry.call,
      x: (projected.x * 0.5 + 0.5) * width,
      y: (-projected.y * 0.5 + 0.5) * height,
      visible: inView && near && (showName || entry.call !== undefined),
      showName,
    };
  });
}

interface TagElement {
  root: HTMLElement;
  name: HTMLElement;
  call: HTMLElement;
}

/**
 * The other surfers' name tags and call bubbles (spec N1): a pool of elements
 * over the canvas, moved each frame. Names come from other players, so they
 * are only ever set as text.
 */
export class NameTags {
  readonly root = el('div', { class: 'name-tags', attrs: { 'aria-hidden': 'true' } });
  private readonly pool: TagElement[] = [];

  constructor(container: HTMLElement) {
    container.append(this.root);
  }

  update(entries: readonly TagEntry[], camera: Camera, width: number, height: number, showNames: boolean): void {
    const placements = tagLayout(entries, camera, width, height, showNames);
    while (this.pool.length < placements.length) {
      const name = el('span', { class: 'name-tag__name' });
      const call = el('span', { class: 'name-tag__call' });
      const root = el('div', { class: 'name-tag' }, call, name);
      this.root.append(root);
      this.pool.push({ root, name, call });
    }
    this.pool.forEach((tag, i) => {
      const placement = placements[i];
      if (!placement?.visible) {
        tag.root.hidden = true;
        return;
      }
      tag.root.hidden = false;
      tag.root.style.transform = `translate(${placement.x.toFixed(1)}px, ${placement.y.toFixed(1)}px) translate(-50%, -100%)`;
      if (tag.name.textContent !== placement.name) tag.name.textContent = placement.name;
      tag.name.hidden = !placement.showName;
      tag.call.hidden = placement.call === undefined;
      if (placement.call !== undefined && tag.call.textContent !== placement.call) tag.call.textContent = placement.call;
    });
  }

  dispose(): void {
    this.root.remove();
  }
}
